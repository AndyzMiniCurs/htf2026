import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { IconButton } from './IconButton.tsx'
import type { ReactNode } from 'react'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Buttons row at the bottom. */
  footer?: ReactNode
}

/** Native <dialog>: focus trap, Esc and inert background come from the platform. */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
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
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-panel p-0 text-fg shadow-(--shadow) backdrop:bg-[rgb(8_4_14/0.7)] backdrop:backdrop-blur-sm open:animate-[dialog-in_320ms_var(--ease-out-expo)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line py-3 pr-2 pl-6">
        <h2 className="title-gothic text-2xl">{title}</h2>
        <IconButton aria-label="Close" onClick={onClose}>
          <X className="size-5" />
        </IconButton>
      </header>
      <div className="px-6 py-5">{children}</div>
      {footer && (
        <footer className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer>
      )}
    </dialog>
  )
}
