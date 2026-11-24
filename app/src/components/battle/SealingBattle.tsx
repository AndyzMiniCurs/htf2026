import { ClientOnly, useRouter } from '@tanstack/react-router'
import { useReducedMotion } from 'motion/react'
import { ShieldCheck, Sparkles, X } from 'lucide-react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { SceneBoundary, useIsPhone } from '#/components/achrona/AchronaDiorama.tsx'
import { TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { Button } from '#/components/ui/Button.tsx'
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
import type { KeyboardEvent } from 'react'
import type { BattleState } from './battle.ts'
import type { GlitchListItem, GlitchType } from '#/lib/glitch.ts'

const BattleScene = lazy(() => import('./BattleScene.tsx'))

/** three.js needs real colours; TYPE_META uses theme tokens, these are their night values. */
const KIND_COLOR: Record<GlitchType, string> = {
  'time-anomaly': '#6fa8ff',
  'magic-drain': '#c75cf2',
  portal: '#3fd6c8',
  'sensor-fault': '#f48d30',
  creature: '#f0603f',
  unknown: '#8b93ad',
}

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
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none bg-[#070912] p-0 text-fg backdrop:bg-black"
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
  const [state, setState] = useState<BattleState>(() => startBattle(performance.now()))
  const [target, setTarget] = useState(0)
  const [cast, setCast] = useState<{ nonce: number } | null>(null)
  const [summonedAt, setSummonedAt] = useState<number | null>(null)
  const [seal, setSeal] = useState<Seal>('idle')
  const sealing = useRef(false)
  const arena = useRef<HTMLDivElement>(null)
  const kind = TYPE_META[glitch.type]
  const color = KIND_COLOR[glitch.type]

  useEffect(() => arena.current?.focus(), [])

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

  // Victory seals the glitch once; the ref guards against a double call.
  useEffect(() => {
    if (state.phase === 'won') void sealRift()
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
    if (!canSummon(state)) return
    setSummonedAt(performance.now())
    // Claude's strike lands when the familiar arrives.
    window.setTimeout(
      () => setState((s) => summon(s, performance.now())),
      reducedMotion ? 400 : 1100,
    )
  }

  function onKeyDown(event: KeyboardEvent) {
    if (state.phase === 'won') return
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
  const ready = canSummon(state)
  const hitsToCharge = Math.ceil((BATTLE.fullCharge - state.charge) / BATTLE.chargePerHit)

  return (
    <div className="relative h-full w-full">
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
                targetIndex={target}
                keyboardCast={cast}
                summonedAt={summonedAt}
                won={state.phase === 'won'}
                reducedMotion={reducedMotion}
                lowPower={lowPower}
                onHit={() => setState((s) => hit(s, performance.now()))}
                onMiss={() => setState((s) => miss(s))}
              />
            </Suspense>
          </SceneBoundary>
        </ClientOnly>
      </div>

      {/* Header: who we fight and how much is left. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 lg:p-6">
        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2">
          <p className="label-caps text-gold">Sealing battle</p>
          <h2 className="title-gothic text-3xl lg:text-4xl">
            {glitch.glitchId} · {kind.label}
          </h2>
          <div
            role="meter"
            aria-label="Glitch health"
            aria-valuemin={0}
            aria-valuemax={BATTLE.maxHealth}
            aria-valuenow={state.health}
            className="h-3 overflow-hidden rounded-full border border-line-strong bg-ground"
          >
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${health * 100}%`, background: color }}
            />
          </div>
          <p className="text-sm text-fg-muted">
            Tap the glowing shards to cast. Arrow keys aim, Space casts, S summons {FAMILIAR.name}.
          </p>
        </div>
        <IconButton aria-label="Leave the battle" onClick={onClose} className="pointer-events-auto">
          <X className="size-5" />
        </IconButton>
      </header>

      {/* Footer: the summon and the accessible way out. */}
      {state.phase === 'fighting' && (
        <footer className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 lg:p-6">
          <div className="flex w-full max-w-md flex-col gap-2">
            <div
              role="meter"
              aria-label={`${FAMILIAR.name} summon charge`}
              aria-valuemin={0}
              aria-valuemax={BATTLE.fullCharge}
              aria-valuenow={state.charge}
              className="h-2 overflow-hidden rounded-full bg-ground"
            >
              <div
                className="h-full rounded-full bg-[#d97757] transition-[width] duration-300"
                style={{ width: `${state.charge}%` }}
              />
            </div>
            <Button
              size="lg"
              disabled={!ready}
              onClick={callClaude}
              icon={<Sparkles aria-hidden className="size-5" />}
              className={ready ? 'motion-safe:animate-pulse' : undefined}
            >
              {state.summoned
                ? `${FAMILIAR.name} has struck`
                : ready
                  ? `Summon ${FAMILIAR.name}`
                  : `Summon ${FAMILIAR.name} · ${hitsToCharge} more ${hitsToCharge === 1 ? 'hit' : 'hits'}`}
            </Button>
          </div>
          <Button variant="ghost" size="sm" loading={seal === 'sealing'} onClick={skip}>
            Seal without the battle
          </Button>
        </footer>
      )}

      {state.phase === 'won' && (
        <div className="absolute inset-0 grid place-items-center p-4">
          <section
            aria-live="polite"
            className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-line-strong bg-panel/90 p-6 text-center backdrop-blur-sm motion-safe:animate-[dialog-in_420ms_var(--ease-out-expo)]"
          >
            <ShieldCheck aria-hidden className="size-10 text-verdant" />
            <h3 className="title-gothic text-3xl">
              {seal === 'failed' ? 'The rift resists' : 'Rift sealed'}
            </h3>
            <dl className="grid w-full grid-cols-2 gap-2 text-sm">
              <dt className="text-fg-muted">Time</dt>
              <dd className="tabular-nums">{elapsedSeconds(state, performance.now())} s</dd>
              <dt className="text-fg-muted">Hits</dt>
              <dd className="tabular-nums">{state.hits}</dd>
              <dt className="text-fg-muted">Misses</dt>
              <dd className="tabular-nums">{state.misses}</dd>
              <dt className="text-fg-muted">{FAMILIAR.name}</dt>
              <dd>{state.summoned ? 'Summoned' : 'Not needed'}</dd>
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
