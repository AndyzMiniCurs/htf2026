import { useRouter } from '@tanstack/react-router'
import { createContext, use, useEffect, useState } from 'react'
import { useToast } from '#/components/ui/Toast.tsx'
import { useLiveEvents } from '#/hooks/useLiveEvents.ts'
import { DATA_EVENT_TYPES } from '#/lib/live-events.ts'
import type { LiveStatus } from '#/hooks/useLiveEvents.ts'
import type { LiveEvent, Notification } from '#/lib/live-events.ts'
import type { ReactNode } from 'react'

type LiveRealm = { status: LiveStatus; lockdown: boolean }
const LiveRealmContext = createContext<LiveRealm>({ status: 'connecting', lockdown: false })

const NOTIFICATION_TITLE: Record<Notification['kind'], string> = {
  assigned: 'A glitch is yours',
  status: 'Your echo moved on',
  lockdown: 'Lockdown',
}

/**
 * Keeps every open screen in step with Achrona: refetches on data events, raises
 * notifications, and switches the whole app into the lockdown theme.
 */
export function LiveRealmProvider({
  initialLockdown,
  children,
}: {
  initialLockdown: boolean
  children: ReactNode
}) {
  const router = useRouter()
  const toast = useToast()
  const [lockdown, setLockdown] = useState(initialLockdown)

  useEffect(() => setLockdown(initialLockdown), [initialLockdown])
  useEffect(() => {
    if (lockdown) document.documentElement.dataset.lockdown = ''
    else delete document.documentElement.dataset.lockdown
  }, [lockdown])

  function onEvent(event: LiveEvent) {
    if ((DATA_EVENT_TYPES as ReadonlyArray<string>).includes(event.type)) {
      void router.invalidate()
    } else if (event.type === 'lockdown') {
      setLockdown(event.on)
    } else if (event.type === 'notification') {
      notify(event.notification)
    }
  }

  function notify(notification: Notification) {
    const title = NOTIFICATION_TITLE[notification.kind]
    toast.show({
      tone: notification.kind === 'lockdown' ? 'error' : 'info',
      title,
      body: notification.text,
    })
    // A system notification only when the tab is in the background and the guardian allowed it.
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: notification.text,
        icon: '/icons/realm/overview.webp',
        tag: notification.glitchId,
      })
    }
  }

  const status = useLiveEvents(onEvent, () => void router.invalidate())
  return <LiveRealmContext value={{ status, lockdown }}>{children}</LiveRealmContext>
}

export function useLiveRealm(): LiveRealm {
  return use(LiveRealmContext)
}
