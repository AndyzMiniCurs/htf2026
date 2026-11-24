import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/Button.tsx'
import { Dialog } from '#/components/ui/Dialog.tsx'
import { useToast } from '#/components/ui/Toast.tsx'
import { cx } from '#/components/ui/cx.ts'
import { getErrorCode } from '#/lib/errors.ts'
import { setLockdown } from '#/lib/monitoring.functions.ts'
import { useLiveRealm } from './LiveRealm.tsx'

/**
 * Commander control for lockdown. It changes every guardian's screen at once, so it asks
 * for confirmation; this screen switches immediately, the others through the live event.
 */
export function LockdownControl() {
  const { lockdown, setLockdownState } = useLiveRealm()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const next = !lockdown

  async function apply() {
    setPending(true)
    try {
      const result = await setLockdown({ data: { on: next } })
      setLockdownState(result.on)
      toast.show({
        tone: result.on ? 'error' : 'success',
        title: result.on ? 'Lockdown declared' : 'Lockdown lifted',
        body: result.on
          ? 'Every guardian now sees the city in lockdown.'
          : 'Achrona is back to watch duty.',
      })
      setConfirming(false)
    } catch (err) {
      toast.show({
        tone: 'error',
        title: 'Lockdown unchanged',
        // CONFLICT: magic is still under the automatic threshold, and the server says so.
        body:
          getErrorCode(err) === 'CONFLICT' && err instanceof Error
            ? err.message
            : 'Mission control did not answer. Try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={lockdown}
        onClick={() => setConfirming(true)}
        title={lockdown ? 'Lift the lockdown' : 'Declare a lockdown'}
        className={cx(
          'label-caps hidden h-11 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap transition-colors md:inline-flex',
          lockdown
            ? 'border-ember bg-ember text-on-accent hover:brightness-110'
            : 'border-line-strong text-fg-muted hover:border-ember hover:text-ember',
        )}
      >
        {lockdown ? (
          <ShieldAlert aria-hidden className="size-4" />
        ) : (
          <ShieldCheck aria-hidden className="size-4" />
        )}
        {lockdown ? 'Lockdown on' : 'Lockdown'}
      </button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={next ? 'Declare a lockdown?' : 'Lift the lockdown?'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant={next ? 'danger' : 'primary'}
              loading={pending}
              onClick={() => void apply()}
            >
              {next ? 'Declare lockdown' : 'Lift lockdown'}
            </Button>
          </>
        }
      >
        <p className="text-fg">
          {next
            ? 'Every guardian’s screen turns to lockdown at once and they are told a great attack is under way.'
            : 'Every guardian’s screen returns to normal watch.'}
        </p>
      </Dialog>
    </>
  )
}
