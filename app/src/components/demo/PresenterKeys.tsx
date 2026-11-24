import { useEffect, useRef } from 'react'
import { useToast } from '#/components/ui/Toast.tsx'
import { stageDemo } from '#/lib/demo.functions.ts'
import { STAGE_META } from './stages.ts'

/**
 * Commander only: Alt+Shift+1..4 fire the presenter's safety net from any page, with nothing on
 * screen but the real effect, because the jury watches this screen. Errors still show.
 */
export function PresenterKeys() {
  const toast = useToast()
  const running = useRef(false)
  useEffect(() => {
    async function onKey(event: KeyboardEvent) {
      if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return
      const meta = STAGE_META.find((m) => m.code === event.code)
      if (!meta || running.current) return
      event.preventDefault()
      running.current = true
      try {
        await stageDemo({ data: { stage: meta.stage } })
      } catch {
        toast.show({ tone: 'error', title: 'Safety net failed', body: meta.title })
      } finally {
        running.current = false
      }
    }
    const listener = (event: KeyboardEvent) => void onKey(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [toast])
  return null
}
