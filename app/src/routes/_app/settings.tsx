import { createFileRoute } from '@tanstack/react-router'
import { BellRing, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '#/components/ui/Button.tsx'
import { CursorPicker } from '#/components/layout/MagicCursor.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { Switch } from '#/components/ui/Switch.tsx'
import { useToast } from '#/components/ui/Toast.tsx'
import { cx } from '#/components/ui/cx.ts'
import { useTheme } from '#/hooks/useTheme.ts'
import { getNotificationPrefs, setNotificationPrefs } from '#/lib/notifications.functions.ts'
import type { ThemeChoice } from '#/hooks/useTheme.ts'
import type { NotificationPrefs } from '#/lib/monitoring.ts'

export const Route = createFileRoute('/_app/settings')({
  loader: () => getNotificationPrefs(),
  head: () => ({ meta: [{ title: 'Settings · Guardians of the Grid' }] }),
  component: SettingsPage,
})

const PREFS: Array<{ key: keyof NotificationPrefs; label: string; description: string }> = [
  {
    key: 'onAssigned',
    label: 'A glitch is assigned to me',
    description: 'When a commander or the AI gives you a glitch.',
  },
  {
    key: 'onStatus',
    label: 'My echoes move on',
    description: 'When a glitch you reported changes stage.',
  },
  {
    key: 'onLockdown',
    label: 'Lockdown',
    description: 'When a commander puts Achrona in lockdown.',
  },
]

function SettingsPage() {
  const saved = Route.useLoaderData()
  const toast = useToast()
  const [prefs, setPrefs] = useState(saved)
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null)

  async function change(key: keyof NotificationPrefs, value: boolean) {
    const before = prefs
    setPrefs({ ...prefs, [key]: value })
    setSaving(key)
    try {
      setPrefs(await setNotificationPrefs({ data: { ...prefs, [key]: value } }))
    } catch {
      setPrefs(before)
      toast.show({
        tone: 'error',
        title: 'Not saved',
        body: 'Mission control did not answer. Try again.',
      })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="title-gothic text-4xl sm:text-5xl">Settings</h1>
      <Panel heading="Notify me when">
        <div className="divide-y divide-line/70">
          {PREFS.map(({ key, label, description }) => (
            <Switch
              key={key}
              label={label}
              description={description}
              checked={prefs[key]}
              disabled={saving === key}
              onChange={(value) => void change(key, value)}
            />
          ))}
        </div>
        <BrowserNotifications />
      </Panel>
      <Panel heading="Appearance">
        <ThemePicker />
      </Panel>
      <Panel heading="Cursor">
        <CursorPicker />
      </Panel>
    </div>
  )
}

/** Asks for system notifications, which only show while the app is in the background. */
function BrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | null>(null)
  useEffect(
    () => setPermission('Notification' in window ? Notification.permission : 'unsupported'),
    [],
  )
  if (permission === null || permission === 'unsupported') return null
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-field/60 px-4 py-3">
      <span className="flex items-center gap-2.5 text-fg">
        <BellRing aria-hidden className="size-5 text-gold" />
        {permission === 'granted'
          ? 'System notifications are on while the app is in the background.'
          : permission === 'denied'
            ? 'System notifications are blocked in this browser’s site settings.'
            : 'Get system notifications when the app is in the background.'}
      </span>
      {permission === 'default' && (
        <Button size="sm" onClick={() => void Notification.requestPermission().then(setPermission)}>
          Allow
        </Button>
      )}
    </div>
  )
}

const THEMES: Array<{ value: ThemeChoice; label: string; icon: typeof Moon }> = [
  { value: 'dark', label: 'Night', icon: Moon },
  { value: 'light', label: 'Day', icon: Sun },
  { value: 'system', label: 'Follow device', icon: Monitor },
]

function ThemePicker() {
  const [theme, setTheme] = useTheme()
  return (
    <fieldset>
      <legend className="mb-3 text-fg-muted">
        Night is Achrona’s own world; Day suits bright rooms.
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cx(
              'flex h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-royal-hi',
              theme === value
                ? 'border-gold bg-panel-hi text-fg'
                : 'border-line text-fg-muted hover:border-line-strong',
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            <Icon aria-hidden className="size-5" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
