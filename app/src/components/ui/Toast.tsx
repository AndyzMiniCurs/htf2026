import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, Sparkles, X } from 'lucide-react'
import { createContext, use, useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'error'
type Toast = { id: number; tone: Tone; title: string; body?: string }
type ToastApi = { show: (toast: Omit<Toast, 'id'>) => void }

const ToastContext = createContext<ToastApi | null>(null)
const TOAST_MS = 5000

const toneStyle: Record<Tone, { icon: ReactNode; color: string }> = {
  info: { icon: <Sparkles className="size-5" />, color: 'var(--curse-hi)' },
  success: { icon: <CircleCheck className="size-5" />, color: 'var(--verdant)' },
  error: { icon: <CircleAlert className="size-5" />, color: 'var(--ember)' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<Toast>>([])

  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  )
  const show = useCallback<ToastApi['show']>(
    (toast) => {
      const id = Date.now() + Math.random()
      setToasts((all) => [...all.slice(-3), { ...toast, id }])
      window.setTimeout(() => dismiss(id), TOAST_MS)
    },
    [dismiss],
  )
  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-24 z-50 flex flex-col items-end gap-2 lg:right-6 lg:bottom-6 lg:left-auto lg:w-96"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 40, filter: 'blur(6px)' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              role="status"
              className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line-strong bg-panel-hi p-4 shadow-(--shadow)"
            >
              <span style={{ color: toneStyle[toast.tone].color }} className="mt-0.5">
                {toneStyle[toast.tone].icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-fg">{toast.title}</p>
                {toast.body && <p className="text-sm text-fg-muted">{toast.body}</p>}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(toast.id)}
                className="-m-1 rounded-full p-1 text-fg-faint hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  )
}

export function useToast(): ToastApi {
  const api = use(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
