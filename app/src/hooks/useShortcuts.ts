import { useEffect, useRef } from 'react'

type ShortcutMap = Partial<Record<string, (event: KeyboardEvent) => void>>

/** True when a key press belongs to whatever the user is typing in, not to the app. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false
  const el = target as { tagName?: string; isContentEditable?: boolean; type?: string }
  if (el.isContentEditable) return true
  const tag = el.tagName?.toUpperCase()
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  // Buttons-like inputs do not take text, so shortcuts stay live on them.
  return (
    tag === 'INPUT' &&
    !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(el.type ?? 'text')
  )
}

/**
 * Single-key shortcuts (`j`, `k`, `n`, `?`, `Enter`), ignored while typing in a field or
 * when a modifier is held, so browser and screen-reader shortcuts keep working.
 */
export function useShortcuts(map: ShortcutMap) {
  // Latest handlers without re-subscribing on every render.
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      // Enter on a focused link or button must keep activating it.
      if (
        event.key === 'Enter' &&
        event.target instanceof Element &&
        event.target.closest('a, button')
      )
        return
      const handler = ref.current[event.key]
      if (!handler) return
      event.preventDefault()
      handler(event)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
