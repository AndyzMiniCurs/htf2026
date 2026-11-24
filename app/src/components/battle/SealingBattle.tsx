import { ClientOnly, useRouter } from '@tanstack/react-router'
import { useReducedMotion } from 'motion/react'
import { ShieldCheck, X } from 'lucide-react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { SceneBoundary, useIsPhone } from '#/components/achrona/AchronaDiorama.tsx'
import { TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { Button } from '#/components/ui/Button.tsx'
import { cx } from '#/components/ui/cx.ts'
import { IconButton } from '#/components/ui/IconButton.tsx'
import { useToast } from '#/components/ui/Toast.tsx'
import { getErrorCode } from '#/lib/errors.ts'
import { advanceStatus } from '#/lib/glitches.functions.ts'
import {
  BATTLE,
  SHARD_COUNT,
  canSummon,
  elapsedSeconds,
  hit,
  miss,
  startBattle,
  summon,
} from './battle.ts'
import { FAMILIAR } from './familiar.ts'
import { VICTORY_CARD_DELAY, finisherTimeline, terminalScript } from './finisher.ts'
import type { KeyboardEvent } from 'react'
import type { BattleState } from './battle.ts'
import type { GlitchListItem, GlitchType } from '#/lib/glitch.ts'

const BattleScene = lazy(() => import('./BattleScene.tsx'))

/** three.js needs real colours; TYPE_META uses theme tokens. Unknown glitches burn corrupt red. */
const KIND_COLOR: Record<GlitchType, string> = {
  'time-anomaly': '#6fa8ff',
  'magic-drain': '#c75cf2',
  portal: '#3fd6c8',
  'sensor-fault': '#f48d30',
  creature: '#f0603f',
  unknown: '#ff4d6d',
}

const INTRO_SECONDS = 2.4
const nowSeconds = () => performance.now() / 1000

type Seal = 'idle' | 'sealing' | 'sealed' | 'failed'

/** Full-screen sealing battle (spec: sealing-battle). Only a won battle or the skip seals. */
export function SealingBattle({
  glitch,
  open,
  onClose,
}: {
  glitch: GlitchListItem
  open: boolean
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={`Sealing battle for ${glitch.glitchId}`}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-[#05030b] p-0 text-fg backdrop:bg-black"
    >
      {open && <Battle glitch={glitch} onClose={onClose} />}
    </dialog>
  )
}

function Battle({ glitch, onClose }: { glitch: GlitchListItem; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const reducedMotion = useReducedMotion() ?? false
  const lowPower = useIsPhone()
  const timeline = finisherTimeline(reducedMotion)
  const [openedAt] = useState(nowSeconds)
  const [state, setState] = useState<BattleState>(() => startBattle(performance.now()))
  const [target, setTarget] = useState(0)
  const [cast, setCast] = useState<{ nonce: number } | null>(null)
  const [summonedAt, setSummonedAt] = useState<number | null>(null)
  const [wonAt, setWonAt] = useState<number | null>(null)
  const [intro, setIntro] = useState(!reducedMotion)
  const [card, setCard] = useState(false)
  const [seal, setSeal] = useState<Seal>('idle')
  const sealing = useRef(false)
  const arena = useRef<HTMLDivElement>(null)
  const kind = TYPE_META[glitch.type]
  const color = KIND_COLOR[glitch.type]
  const fighting = state.phase === 'fighting' && summonedAt === null

  useEffect(() => arena.current?.focus(), [])
  useEffect(() => {
    const id = window.setTimeout(() => setIntro(false), INTRO_SECONDS * 1000)
    return () => window.clearTimeout(id)
  }, [])

  async function sealRift() {
    if (sealing.current) return
    sealing.current = true
    setSeal('sealing')
    try {
      await advanceStatus({ data: { glitchId: glitch.glitchId } })
      setSeal('sealed')
    } catch (err) {
      sealing.current = false
      setSeal('failed')
      toast.show({
        tone: 'error',
        title: 'The rift did not seal',
        body:
          getErrorCode(err) && err instanceof Error
            ? err.message
            : 'Mission control did not answer. Check your connection and try again.',
      })
    }
  }

  // Victory: seal once (the ref guards a double call), let the rift collapse, then show the card.
  useEffect(() => {
    if (state.phase !== 'won') return
    setWonAt(nowSeconds())
    void sealRift()
    const delay = reducedMotion ? VICTORY_CARD_DELAY.reduced : VICTORY_CARD_DELAY.full
    const id = window.setTimeout(() => setCard(true), delay * 1000)
    return () => window.clearTimeout(id)
  }, [state.phase])

  async function finish() {
    onClose()
    await router.invalidate()
  }

  async function skip() {
    await sealRift()
    if (sealing.current) {
      toast.show({ tone: 'success', title: `${glitch.glitchId} is now fixed` })
      await finish()
    }
  }

  function callClaude() {
    if (!canSummon(state) || summonedAt !== null) return
    setSummonedAt(nowSeconds())
    // The rules follow the film: the glitch falls when the beam lands.
    window.setTimeout(() => setState((s) => summon(s, performance.now())), timeline.strike * 1000)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!fighting) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      setTarget((t) => (t + 1) % SHARD_COUNT)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      setTarget((t) => (t + SHARD_COUNT - 1) % SHARD_COUNT)
    } else if (event.key === ' ' || event.key === 'Enter') {
      setCast((c) => ({ nonce: (c?.nonce ?? 0) + 1 }))
    } else if (event.key.toLowerCase() === 's') {
      callClaude()
    } else return
    event.preventDefault()
  }

  const health = state.health / BATTLE.maxHealth
  const ready = canSummon(state) && summonedAt === null
  const cinematic = intro || (summonedAt !== null && !card)

  return (
    <div className="relative h-full w-full select-none">
      <div
        ref={arena}
        tabIndex={0}
        role="application"
        aria-label="Arena. Arrow keys aim at a shard, Space casts a spell, S summons Claude."
        onKeyDown={onKeyDown}
        className="absolute inset-0 outline-none"
      >
        <ClientOnly fallback={null}>
          <SceneBoundary fallback={null}>
            <Suspense fallback={null}>
              <BattleScene
                color={color}
                health={health}
                charge={state.charge / BATTLE.fullCharge}
                targetIndex={target}
                keyboardCast={cast}
                openedAt={openedAt}
                summonedAt={summonedAt}
                wonAt={wonAt}
                reducedMotion={reducedMotion}
                lowPower={lowPower}
                onHit={() => setState((s) => hit(s, performance.now()))}
                onMiss={() => fighting && setState((s) => miss(s))}
              />
            </Suspense>
          </SceneBoundary>
        </ClientOnly>
      </div>

      <Letterbox on={cinematic} />

      {intro && <IntroCard glitchId={glitch.glitchId} kind={kind.label} color={color} />}

      {/* HUD: the glitch's name, health and the combo. */}
      <header
        className={cx(
          'pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 transition-opacity duration-500 lg:p-8',
          intro && 'opacity-0',
        )}
      >
        <div className="flex w-full max-w-md flex-col gap-2">
          <p className="label-caps text-gold">Sealing battle</p>
          <h2 className="title-gothic text-3xl lg:text-5xl">
            {glitch.glitchId} <span style={{ color }}>· {kind.label}</span>
          </h2>
          <HealthBar health={state.health} color={color} />
          <div className="flex h-7 items-center gap-3 text-sm text-fg-muted">
            {state.combo >= 2 && fighting && (
              <span
                key={state.combo}
                className="font-bold text-gold tabular-nums motion-safe:animate-[dialog-in_260ms_var(--ease-out-expo)]"
              >
                Combo ×{state.combo}
              </span>
            )}
            {fighting && (
              <span className="hidden sm:inline">
                Tap the glowing shards. Arrows aim, Space casts.
              </span>
            )}
          </div>
        </div>
        <IconButton
          aria-label="Leave the battle"
          onClick={onClose}
          className="pointer-events-auto bg-black/40 backdrop-blur-sm"
        >
          <X className="size-5" />
        </IconButton>
      </header>

      {fighting && !intro && (
        <footer className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 lg:p-8">
          <SummonButton charge={state.charge} ready={ready} onSummon={callClaude} />
          <Button variant="ghost" size="sm" loading={seal === 'sealing'} onClick={skip}>
            Seal without the battle
          </Button>
        </footer>
      )}

      {summonedAt !== null && !card && (
        <ClaudeTerminal
          glitchId={glitch.glitchId}
          summonedAt={summonedAt}
          reducedMotion={reducedMotion}
        />
      )}

      {card && (
        <div className="absolute inset-0 grid place-items-center bg-black/30 p-4">
          <section
            aria-live="polite"
            className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-line-strong bg-panel/90 p-6 text-center shadow-(--shadow) backdrop-blur-md motion-safe:animate-[dialog-in_520ms_var(--ease-out-expo)]"
          >
            <ShieldCheck aria-hidden className="size-12 text-verdant" />
            <h3 className="title-gothic text-4xl">
              {seal === 'failed' ? 'The rift resists' : 'Rift sealed'}
            </h3>
            {state.summoned && (
              <p className="rounded-full border border-[#d97757]/50 bg-[#d97757]/15 px-3 py-1 text-sm text-[#ffb48a]">
                ✻ Finished by {FAMILIAR.name}
              </p>
            )}
            <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-left text-fg-muted">Time</dt>
              <dd className="text-right tabular-nums">
                {elapsedSeconds(state, performance.now())} s
              </dd>
              <dt className="text-left text-fg-muted">Spells landed</dt>
              <dd className="text-right tabular-nums">{state.hits}</dd>
              <dt className="text-left text-fg-muted">Missed</dt>
              <dd className="text-right tabular-nums">{state.misses}</dd>
              <dt className="text-left text-fg-muted">Best combo</dt>
              <dd className="text-right tabular-nums">×{state.bestCombo}</dd>
            </dl>
            {seal === 'failed' ? (
              <Button size="lg" onClick={() => void sealRift()}>
                Try sealing again
              </Button>
            ) : (
              <Button size="lg" loading={seal !== 'sealed'} onClick={() => void finish()}>
                Back to the glitch
              </Button>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

/** Film bars that close in for the establishing shot and Claude's finisher. */
function Letterbox({ on }: { on: boolean }) {
  const bar =
    'pointer-events-none absolute inset-x-0 h-[9vh] bg-black transition-transform duration-700 ease-(--ease-out-expo)'
  return (
    <>
      <div aria-hidden className={cx(bar, 'top-0', on ? 'translate-y-0' : '-translate-y-full')} />
      <div aria-hidden className={cx(bar, 'bottom-0', on ? 'translate-y-0' : 'translate-y-full')} />
    </>
  )
}

function IntroCard({ glitchId, kind, color }: { glitchId: string; kind: string; color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center gap-3 motion-safe:animate-[intro-card_2.4s_var(--ease-out-expo)_both]">
        <p className="label-caps text-sm tracking-[0.4em] text-gold lg:text-base">A rift awakens</p>
        <p
          className="title-gothic glitch-text text-6xl lg:text-8xl"
          style={{ ['--glitch' as string]: color }}
        >
          {glitchId}
        </p>
        <p className="font-serif text-2xl italic lg:text-3xl" style={{ color }}>
          {kind}
        </p>
      </div>
    </div>
  )
}

function HealthBar({ health, color }: { health: number; color: string }) {
  const pct = (health / BATTLE.maxHealth) * 100
  return (
    <div
      role="meter"
      aria-label="Glitch health"
      aria-valuemin={0}
      aria-valuemax={BATTLE.maxHealth}
      aria-valuenow={health}
      className="relative h-4 overflow-hidden rounded-full border border-white/15 bg-black/60 shadow-[inset_0_2px_6px_rgb(0_0_0/0.6)]"
    >
      {/* The pale trail shows the damage just dealt before it drains. */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white/70 transition-[width] delay-300 duration-700"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, #ffffff)`,
          boxShadow: `0 0 16px ${color}`,
        }}
      />
    </div>
  )
}

const PIPS = BATTLE.fullCharge / BATTLE.chargePerHit

/** Claude-orange call to action, with five pips that fill as spells land. */
function SummonButton({
  charge,
  ready,
  onSummon,
}: {
  charge: number
  ready: boolean
  onSummon: () => void
}) {
  const filled = Math.round(charge / BATTLE.chargePerHit)
  const left = PIPS - filled
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: PIPS }, (_, i) => (
          <span
            key={i}
            className={cx(
              'h-2 w-8 rounded-full transition-colors duration-300',
              i < filled ? 'bg-[#d97757] shadow-[0_0_10px_#d97757]' : 'bg-white/15',
            )}
          />
        ))}
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={onSummon}
        className={cx(
          'flex min-h-14 w-full items-center justify-center gap-3 rounded-full px-6 font-bold tracking-wide uppercase transition-all duration-300',
          ready
            ? 'bg-[linear-gradient(135deg,#f0a27a,#d97757_45%,#b5563a)] text-[#1a0c06] shadow-[0_0_32px_#d97757aa] motion-safe:animate-pulse hover:scale-[1.03]'
            : 'cursor-not-allowed border border-white/15 bg-black/50 text-fg-muted backdrop-blur-sm',
        )}
      >
        <span aria-hidden className="text-xl">
          ✻
        </span>
        {ready
          ? `Summon ${FAMILIAR.name}`
          : `Summon ${FAMILIAR.name} · ${left} more ${left === 1 ? 'hit' : 'hits'}`}
      </button>
    </div>
  )
}

/** A Claude Code session typing out the fix while the finisher plays. */
function ClaudeTerminal({
  glitchId,
  summonedAt,
  reducedMotion,
}: {
  glitchId: string
  summonedAt: number
  reducedMotion: boolean
}) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    let frame = 0
    const tick = () => {
      setElapsed(nowSeconds() - summonedAt)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [summonedAt])
  const lines = terminalScript(glitchId, finisherTimeline(reducedMotion)).filter(
    (l) => l.at <= elapsed,
  )
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute right-4 bottom-[10vh] w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#d97757]/40 bg-[#0d0b0a]/90 font-mono text-xs shadow-[0_0_40px_#d9775733] backdrop-blur-md lg:right-8 lg:text-sm"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-[#d97757]">✻</span>
        <span className="font-semibold text-[#f3e9e2]">Claude Code</span>
        <span className="ml-auto text-white/40">~/achrona</span>
      </div>
      <ol className="flex flex-col gap-1.5 px-3 py-3">
        {lines.map((line, i) => {
          const typed = reducedMotion
            ? line.text
            : line.text.slice(0, Math.max(1, Math.floor((elapsed - line.at) * 70)))
          return (
            <li key={i} className="flex gap-2">
              {line.tone === 'prompt' && <span className="text-[#d97757]">&gt;</span>}
              {line.tone === 'tool' && <span className="text-[#d97757]">●</span>}
              {line.tone === 'done' && <span className="text-[#3fd18f]">✓</span>}
              <span
                className={cx(
                  line.tone === 'prompt' && 'text-[#f3e9e2]',
                  line.tone === 'tool' && 'text-white/80',
                  line.tone === 'done' && 'font-semibold text-[#3fd18f]',
                )}
              >
                {line.tone === 'prompt' ? typed.replace(/^> /, '') : typed}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
