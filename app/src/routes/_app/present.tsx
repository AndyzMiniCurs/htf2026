import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { Keyboard, LifeBuoy, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { STAGE_META } from '#/components/demo/stages.ts'
import { Button } from '#/components/ui/Button.tsx'
import { Dialog } from '#/components/ui/Dialog.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { useToast } from '#/components/ui/Toast.tsx'
import { resetDemo, stageDemo } from '#/lib/demo.functions.ts'
import type { DemoStage } from '#/lib/demo.ts'

export const Route = createFileRoute('/_app/present')({
  beforeLoad: ({ context }) => {
    if (context.me.role !== 'commander') throw redirect({ to: '/' })
  },
  head: () => ({ meta: [{ title: 'Presenter · Guardians of the Grid' }] }),
  component: PresenterPage,
})

const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

/**
 * Before the pitch: reset the realm to the demo state. During it: the safety net, fired from any
 * page with Alt+Shift+1..4 so the jury only sees the real effect.
 */
function PresenterPage() {
  const router = useRouter()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [readyAt, setReadyAt] = useState<string | null>(null)
  const [running, setRunning] = useState<DemoStage | null>(null)

  async function reset() {
    setResetting(true)
    try {
      const { glitches } = await resetDemo()
      await router.invalidate()
      setReadyAt(time.format(Date.now()))
      setConfirming(false)
      toast.show({
        tone: 'success',
        title: 'Realm reset',
        body: `${glitches} glitches, magic restored.`,
      })
    } catch {
      toast.show({ tone: 'error', title: 'Reset failed', body: 'Mission control did not answer.' })
    } finally {
      setResetting(false)
    }
  }

  async function stage(next: DemoStage) {
    setRunning(next)
    try {
      await stageDemo({ data: { stage: next } })
    } catch {
      toast.show({ tone: 'error', title: 'Safety net failed', body: 'Try the shortcut again.' })
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="title-gothic text-4xl sm:text-5xl">Presenter</h1>
        <p className="text-fg-muted">
          Open this before the pitch, not on the projector. Only commanders can see it.
        </p>
      </div>

      <Panel heading="Before you start">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-fg">
            Puts every glitch, echo, sensor and the forecast history back to the demo state, with
            times relative to now, and lifts any lockdown. Accounts and sessions stay, so both
            browsers remain signed in.
          </p>
          <Button
            size="lg"
            icon={<RotateCcw aria-hidden className="size-5" />}
            onClick={() => setConfirming(true)}
          >
            Reset the realm
          </Button>
        </div>
        {readyAt && (
          <p role="status" className="mt-4 text-sm font-medium text-verdant">
            Ready since {readyAt}. Open the overview and start the pitch.
          </p>
        )}
      </Panel>

      <Panel heading="Safety net">
        <p className="mb-4 flex items-start gap-2 text-fg-muted">
          <Keyboard aria-hidden className="mt-0.5 size-5 shrink-0 text-gold" />
          During the pitch, use the shortcut from any page: nothing shows on screen except what
          happens in Achrona.
        </p>
        <ul className="flex flex-col gap-3">
          {STAGE_META.map((m) => (
            <li
              key={m.stage}
              className="flex flex-col gap-3 rounded-xl border border-line bg-ground-2/60 p-4 sm:flex-row sm:items-center"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-fg">{m.title}</span>
                <span className="text-sm text-fg-muted">{m.body}</span>
              </span>
              <kbd className="label-caps shrink-0 rounded-md border border-line-strong bg-field px-2 py-1 text-[0.7rem] text-fg-muted">
                Alt + Shift + {m.key}
              </kbd>
              <Button
                variant="ghost"
                size="sm"
                icon={<LifeBuoy aria-hidden className="size-4" />}
                loading={running === m.stage}
                onClick={() => void stage(m.stage)}
              >
                Run now
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Reset the realm?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button loading={resetting} onClick={() => void reset()}>
              Reset
            </Button>
          </>
        }
      >
        <p className="text-fg">
          Everything reported since the last reset is wiped and replaced by the demo realm. This
          cannot be undone.
        </p>
      </Dialog>
    </div>
  )
}
