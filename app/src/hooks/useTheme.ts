import { useCallback, useSyncExternalStore } from 'react'

export type ThemeChoice = 'dark' | 'light' | 'system'
const KEY = 'theme'
const listeners = new Set<() => void>()

function read(): ThemeChoice {
  const stored = localStorage.getItem(KEY)
  return stored === 'light' || stored === 'system' ? stored : 'dark'
}

/** Applies a choice to <html>; the same rule as the pre-paint script in __root.tsx. */
function apply(choice: ThemeChoice) {
  const light =
    choice === 'light' ||
    (choice === 'system' && matchMedia('(prefers-color-scheme: light)').matches)
  document.documentElement.dataset.theme = light ? 'light' : 'dark'
}

/** The guardian's theme choice, persisted on this device. Night is the default. */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const choice = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    read,
    () => 'dark' as const,
  )
  const set = useCallback((next: ThemeChoice) => {
    localStorage.setItem(KEY, next)
    apply(next)
    listeners.forEach((notify) => notify())
  }, [])
  return [choice, set]
}
