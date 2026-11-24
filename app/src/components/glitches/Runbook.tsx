import { Check, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '#/components/ui/Toast.tsx'
import { cx } from '#/components/ui/cx.ts'
import { setRunbookStep } from '#/lib/glitches.functions.ts'
import type { RunbookStep } from '#/lib/glitch.ts'

/**
 * The glitch's runbook as a checklist. Guardians who work the glitch tick steps; the tick
 * shows at once and the server's answer becomes the truth.
 */
export function Runbook({
  glitchId,
  steps,
  editable,
}: {
  glitchId: string
  steps: Array<RunbookStep>
  editable: boolean
}) {
  const toast = useToast()
  const [local, setLocal] = useState(steps)
  const [busy, setBusy] = useState<number | null>(null)
  useEffect(() => setLocal(steps), [steps])

  if (local.length === 0) {
    return (
      <p className="flex items-start gap-2 text-fg-muted">
        <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
        The runbook is being written. Steps appear once the glitch type is known.
      </p>
    )
  }

  async function toggle(index: number, done: boolean) {
    const before = local
    setLocal(local.map((step, i) => (i === index ? { ...step, done } : step)))
    setBusy(index)
    try {
      setLocal(await setRunbookStep({ data: { glitchId, index, done } }))
    } catch {
      setLocal(before)
      toast.show({
        tone: 'error',
        title: 'Step not saved',
        body: 'Mission control did not answer. Try again.',
      })
    } finally {
      setBusy(null)
    }
  }

  const doneCount = local.filter((s) => s.done).length
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">
        {doneCount} of {local.length} steps done
      </p>
      <ol className="flex flex-col gap-2">
        {local.map((step, i) => {
          const id = `${glitchId}-step-${i}`
          return (
            <li key={i}>
              <label
                htmlFor={id}
                className={cx(
                  'flex items-start gap-3 rounded-lg p-1.5',
                  editable ? 'cursor-pointer hover:bg-panel-hi' : 'cursor-default',
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={step.done}
                  disabled={!editable || busy === i}
                  onChange={(e) => void toggle(i, e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cx(
                    'grid size-7 shrink-0 place-items-center rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-royal-hi',
                    step.done
                      ? 'border-verdant bg-verdant/15 text-verdant'
                      : 'border-line-strong text-fg-muted',
                  )}
                >
                  {step.done ? (
                    <Check className="size-4" />
                  ) : (
                    <span className="title-gothic text-base">{i + 1}</span>
                  )}
                </span>
                <span
                  className={cx('pt-0.5', step.done ? 'text-fg-faint line-through' : 'text-fg')}
                >
                  {step.text}
                </span>
              </label>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
