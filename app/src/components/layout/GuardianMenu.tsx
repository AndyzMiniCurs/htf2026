import { useRouter } from '@tanstack/react-router'
import { LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cx } from '#/components/ui/cx.ts'
import { useToast } from '#/components/ui/Toast.tsx'
import { useTheme } from '#/hooks/useTheme.ts'
import { logout } from '#/lib/auth.functions.ts'
import type { ThemeChoice } from '#/hooks/useTheme.ts'
import type { Guardian } from '#/lib/guardian.ts'

const THEMES: Array<{ value: ThemeChoice; label: string; icon: typeof Moon }> = [
  { value: 'dark', label: 'Night', icon: Moon },
  { value: 'light', label: 'Day', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
]

/** The guardian's portrait in the HUD; opens their menu: theme and sign out. */
export function GuardianMenu({ me }: { me: Guardian }) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  const router = useRouter()
  const toast = useToast()
  const root = useRef<HTMLDivElement>(null)
  const commander = me.role === 'commander'

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !root.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  async function signOut() {
    try {
      await logout()
      await router.invalidate()
      await router.navigate({ to: '/login' })
    } catch {
      toast.show({
        tone: 'error',
        title: 'Could not sign out',
        body: 'Check your connection and try again.',
      })
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl"
      >
        <span className="hidden text-right leading-tight xl:block">
          <span className="block font-bold text-fg">{me.codename}</span>
          <span
            className={cx('label-caps text-[0.65rem]', commander ? 'text-gold' : 'text-fg-faint')}
          >
            {me.role}
          </span>
        </span>
        <span
          className={cx(
            'title-gothic grid size-11 place-items-center rounded-xl border-2 text-2xl',
            commander
              ? 'border-gold bg-[linear-gradient(160deg,var(--gold-deep),var(--royal-deep))]'
              : 'border-royal-hi bg-[linear-gradient(160deg,var(--royal),var(--royal-deep))]',
          )}
        >
          <span className="sr-only">{`${me.codename}, ${me.role}. Open menu`}</span>
          <span aria-hidden>{me.codename.charAt(0)}</span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-2 w-64 origin-top-right animate-[dialog-in_220ms_var(--ease-out-expo)] rounded-xl border border-line-strong bg-panel-hi p-2 shadow-(--shadow)"
        >
          <p className="px-3 pt-2 pb-1 font-bold">{me.codename}</p>
          <p
            className={cx(
              'label-caps px-3 pb-3 text-[0.65rem]',
              commander ? 'text-gold' : 'text-fg-faint',
            )}
          >
            {me.role}
          </p>
          <div
            role="group"
            aria-label="Theme"
            className="grid grid-cols-3 gap-1 rounded-lg bg-field p-1"
          >
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={cx(
                  'flex h-11 flex-col items-center justify-center gap-0.5 rounded-md text-xs transition-colors',
                  theme === value
                    ? 'bg-royal text-on-accent'
                    : 'text-fg-muted hover:bg-panel-hi hover:text-fg',
                )}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="mt-2 flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-fg-muted transition-colors hover:bg-panel hover:text-fg"
          >
            <LogOut aria-hidden className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
