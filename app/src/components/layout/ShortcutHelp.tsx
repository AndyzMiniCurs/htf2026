import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Dialog } from '#/components/ui/Dialog.tsx'
import { useShortcuts } from '#/hooks/useShortcuts.ts'

const SHORTCUTS: Array<[keys: Array<string>, what: string]> = [
  [['j'], 'Next glitch'],
  [['k'], 'Previous glitch'],
  [['Enter'], 'Open the selected glitch'],
  [['n'], 'Report a new echo'],
  [['?'], 'Show these shortcuts'],
]

/** App-wide keys (`n`, `?`) and the help dialog that lists every shortcut. */
export function GlobalShortcuts() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  useShortcuts({
    n: () => void navigate({ to: '/echoes/new' }),
    '?': () => setOpen(true),
  })
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Shortcuts">
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={what} className="contents">
            <dt className="flex gap-1.5">
              {keys.map((key) => (
                <kbd
                  key={key}
                  className="min-w-9 rounded-md border border-line-strong border-b-[3px] bg-field px-2 py-1 text-center font-sans text-sm font-bold text-gold-hi"
                >
                  {key}
                </kbd>
              ))}
            </dt>
            <dd className="text-fg">{what}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-sm text-fg-muted">Shortcuts pause while you type in a field.</p>
    </Dialog>
  )
}
