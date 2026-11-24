import { useRouter } from '@tanstack/react-router'
import { GitMerge, RotateCcw, Send } from 'lucide-react'
import { useState } from 'react'
import { SealingBattle } from '#/components/battle/SealingBattle.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { Select, Textarea } from '#/components/ui/Field.tsx'
import { useToast } from '#/components/ui/Toast.tsx'
import { ECHO_DESCRIPTION_MAX, ECHO_DESCRIPTION_MIN } from '#/lib/echo.ts'
import { addGlitchUpdate, moveEcho } from '#/lib/echoes.functions.ts'
import { getErrorCode } from '#/lib/errors.ts'
import { GLITCH_STATUSES } from '#/lib/glitch.ts'
import { advanceStatus, assignGlitch, mergeGlitch, reopenGlitch } from '#/lib/glitches.functions.ts'
import { STATUS_META } from './glitch-meta.ts'
import type { GlitchDetail, GlitchListItem, GlitchStatus } from '#/lib/glitch.ts'
import type { Guardian } from '#/lib/guardian.ts'

/** What the next step is called from each stage: the button names the action, not the state. */
const ADVANCE_LABEL: Record<Exclude<GlitchStatus, 'FIXED'>, string> = {
  LEAKED: 'Start assessing',
  ASSESSING: 'Begin containment',
  CONTAINING: 'Seal the rift',
}

export type GlitchPermissions = {
  /** Assignee or commander: may advance the stage and post updates. */
  canWork: boolean
  /** Commander: reopen, assign, merge, move echoes. */
  canCommand: boolean
}

export function permissionsFor(me: Guardian, glitch: GlitchListItem): GlitchPermissions {
  const canCommand = me.role === 'commander'
  return { canCommand, canWork: canCommand || glitch.assignee?.guardianId === me.guardianId }
}

/** Runs a server action with toasts and a reload; returns whether it succeeded. */
function useAction() {
  const router = useRouter()
  const toast = useToast()
  const [pending, setPending] = useState<string | null>(null)
  /** Resolves to the action's result, or null when it failed (the toast already said why). */
  async function run<TResult>(
    key: string,
    action: () => Promise<TResult>,
    success: string,
  ): Promise<TResult | null> {
    setPending(key)
    try {
      const result = await action()
      toast.show({ tone: 'success', title: success })
      await router.invalidate()
      return result
    } catch (err) {
      const code = getErrorCode(err)
      toast.show({
        tone: 'error',
        title: code === 'FORBIDDEN' ? 'Not allowed' : 'That did not work',
        body:
          code && err instanceof Error
            ? err.message
            : 'Mission control did not answer. Check your connection and try again.',
      })
      return null
    } finally {
      setPending(null)
    }
  }
  return { run, pending }
}

/** The stage controls: advance one step, or (commanders) reopen a fixed glitch. */
export function StageActions(props: { glitch: GlitchDetail; permissions: GlitchPermissions }) {
  const [battle, setBattle] = useState(false)
  // The battle outlives the stage change it causes, so its victory card stays on screen.
  return (
    <>
      <StageControls {...props} onSeal={() => setBattle(true)} />
      {battle && <SealingBattle glitch={props.glitch} open onClose={() => setBattle(false)} />}
    </>
  )
}

function StageControls({
  glitch,
  permissions,
  onSeal,
}: {
  glitch: GlitchDetail
  permissions: GlitchPermissions
  onSeal: () => void
}) {
  const { run, pending } = useAction()
  if (glitch.mergedInto) return null
  if (glitch.status === 'FIXED') {
    return permissions.canCommand ? (
      <Button
        variant="ghost"
        loading={pending === 'reopen'}
        icon={<RotateCcw aria-hidden className="size-4" />}
        onClick={() =>
          run(
            'reopen',
            () => reopenGlitch({ data: { glitchId: glitch.glitchId } }),
            `${glitch.glitchId} reopened`,
          )
        }
      >
        Reopen
      </Button>
    ) : null
  }
  if (!permissions.canWork) {
    return (
      <p className="text-sm text-fg-muted">
        Only the assigned guardian or a commander can move this glitch on.
      </p>
    )
  }
  const next = GLITCH_STATUSES[GLITCH_STATUSES.indexOf(glitch.status) + 1]
  const NextIcon = STATUS_META[next].icon
  // Sealing is fought, not clicked (spec: sealing-battle); the battle offers a plain seal too.
  if (glitch.status === 'CONTAINING') {
    return (
      <Button size="lg" icon={<NextIcon aria-hidden className="size-5" />} onClick={onSeal}>
        {ADVANCE_LABEL.CONTAINING}
      </Button>
    )
  }
  return (
    <Button
      size="lg"
      loading={pending === 'advance'}
      icon={<NextIcon aria-hidden className="size-5" />}
      onClick={() =>
        run(
          'advance',
          () => advanceStatus({ data: { glitchId: glitch.glitchId } }),
          `${glitch.glitchId} is now ${STATUS_META[next].label.toLowerCase()}`,
        )
      }
    >
      {ADVANCE_LABEL[glitch.status]}
    </Button>
  )
}

/** Commander panel: assign a guardian and merge into another glitch. */
export function CommandPanel({
  glitch,
  guardians,
  openGlitches,
}: {
  glitch: GlitchDetail
  guardians: Array<Guardian>
  openGlitches: Array<GlitchListItem>
}) {
  const { run, pending } = useAction()
  const [mergeTarget, setMergeTarget] = useState('')
  const targets = openGlitches.filter((g) => g.glitchId !== glitch.glitchId)
  return (
    <div className="flex flex-col gap-5">
      <Select
        label="Assigned guardian"
        value={glitch.assignee?.guardianId ?? ''}
        disabled={pending === 'assign'}
        onChange={(e) => {
          const guardianId = e.target.value ? Number(e.target.value) : null
          const who = guardians.find((g) => g.guardianId === guardianId)
          void run(
            'assign',
            () => assignGlitch({ data: { glitchId: glitch.glitchId, guardianId } }),
            who
              ? `${glitch.glitchId} assigned to ${who.codename}`
              : `${glitch.glitchId} unassigned`,
          )
        }}
      >
        <option value="">Unassigned</option>
        {guardians.map((g) => (
          <option key={g.guardianId} value={g.guardianId}>
            {g.codename} · {g.role}
          </option>
        ))}
      </Select>

      {!glitch.mergedInto && targets.length > 0 && (
        <div className="flex flex-col gap-2">
          <Select
            label="Merge into"
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
          >
            <option value="">Choose a glitch…</option>
            {targets.map((g) => (
              <option key={g.glitchId} value={g.glitchId}>
                {g.glitchId} · {g.description.slice(0, 48)}
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            disabled={!mergeTarget}
            loading={pending === 'merge'}
            icon={<GitMerge aria-hidden className="size-4" />}
            onClick={() =>
              run(
                'merge',
                () =>
                  mergeGlitch({ data: { glitchId: glitch.glitchId, intoGlitchId: mergeTarget } }),
                `${glitch.glitchId} merged into ${mergeTarget}`,
              )
            }
          >
            Merge glitches
          </Button>
        </div>
      )}
    </div>
  )
}

/** Post a progress update on the glitch (assignee or commander). */
export function UpdateForm({ glitchId }: { glitchId: string }) {
  const router = useRouter()
  const toast = useToast()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (text.trim().length < ECHO_DESCRIPTION_MIN) {
      setError(`Write at least ${ECHO_DESCRIPTION_MIN} characters.`)
      return
    }
    setPending(true)
    setError(null)
    try {
      const result = await addGlitchUpdate({ data: { glitchId, description: text.trim() } })
      setText('')
      toast.show(
        result.autoClosed
          ? {
              tone: 'success',
              title: 'Rift sealed',
              body: 'Your update says it is solved, so the glitch is now fixed.',
            }
          : { tone: 'success', title: 'Update posted' },
      )
      await router.invalidate()
    } catch (err) {
      setError(
        getErrorCode(err) === 'FORBIDDEN'
          ? 'Only the assigned guardian or a commander can post updates.'
          : 'The update did not reach mission control. Try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Textarea
        label="Progress update"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={ECHO_DESCRIPTION_MAX}
        rows={3}
        placeholder="What changed? Write “all clear” when it is solved."
        error={error ?? undefined}
      />
      <Button
        type="submit"
        loading={pending}
        icon={<Send aria-hidden className="size-4" />}
        className="self-end"
      >
        Post update
      </Button>
    </form>
  )
}

/** Commander control on one echo: move it to another glitch or out to a new one. */
export function MoveEcho({
  echoId,
  currentGlitchId,
  openGlitches,
}: {
  echoId: number
  currentGlitchId: string
  openGlitches: Array<GlitchListItem>
}) {
  const { run, pending } = useAction()
  const router = useRouter()
  return (
    <label className="inline-flex items-center gap-2 text-sm text-fg-muted">
      <span className="sr-only">Move echo {echoId}</span>
      <select
        value=""
        disabled={pending === 'move'}
        onChange={async (e) => {
          const target = e.target.value
          if (!target) return
          const moved = await run(
            'move',
            () => moveEcho({ data: { echoId, toGlitchId: target === 'new' ? null : target } }),
            target === 'new' ? 'Echo moved out to a new glitch' : `Echo moved to ${target}`,
          )
          if (moved && target === 'new') {
            await router.navigate({
              to: '/glitches/$glitchId',
              params: { glitchId: moved.glitchId },
            })
          }
        }}
        className="h-9 rounded-lg border border-line bg-field px-2 text-sm text-fg-muted hover:border-line-strong focus:border-royal-hi focus:outline-none"
      >
        <option value="">Move…</option>
        <option value="new">To a new glitch</option>
        {openGlitches
          .filter((g) => g.glitchId !== currentGlitchId)
          .map((g) => (
            <option key={g.glitchId} value={g.glitchId}>
              To {g.glitchId}
            </option>
          ))}
      </select>
    </label>
  )
}
