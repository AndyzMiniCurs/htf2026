import { useEffect, useRef, useState } from 'react'
import { liveEventSchema } from '#/lib/live-events.ts'
import type { LiveEvent } from '#/lib/live-events.ts'

export type LiveStatus = 'connecting' | 'live' | 'reconnecting'

const MAX_BACKOFF_MS = 30_000

/** Delay before reconnect attempt `n` (0-based): 1 s, 2 s, 4 s … capped at 30 s. */
export function backoffDelay(attempt: number): number {
  return Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt)
}

/**
 * Subscribes to `GET /api/events` (SSE) and hands every valid event to `onEvent`.
 * Reconnects with backoff; `onReconnect` fires after a connection is restored so callers can
 * refetch whatever they missed while offline.
 */
export function useLiveEvents(onEvent: (event: LiveEvent) => void, onReconnect: () => void) {
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const handlers = useRef({ onEvent, onReconnect })
  handlers.current = { onEvent, onReconnect }

  useEffect(() => {
    let source: EventSource | null = null
    let timer: number | undefined
    let attempt = 0
    let everOpened = false
    let closed = false

    function connect() {
      source = new EventSource('/api/events')
      source.onopen = () => {
        if (everOpened) handlers.current.onReconnect()
        everOpened = true
        attempt = 0
        setStatus('live')
      }
      source.onmessage = (message) => {
        let data: unknown
        try {
          data = JSON.parse(message.data as string)
        } catch {
          return
        }
        const parsed = liveEventSchema.safeParse(data)
        if (parsed.success) handlers.current.onEvent(parsed.data)
      }
      source.onerror = () => {
        source?.close()
        if (closed) return
        setStatus('reconnecting')
        timer = window.setTimeout(connect, backoffDelay(attempt++))
      }
    }

    connect()
    return () => {
      closed = true
      window.clearTimeout(timer)
      source?.close()
    }
  }, [])

  return status
}
