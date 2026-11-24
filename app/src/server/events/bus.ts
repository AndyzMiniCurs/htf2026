import type { LiveEvent } from '#/lib/live-events.ts'

/** An event on the bus; `to` limits delivery to one guardian (notifications), null = everyone. */
export type Envelope = { event: LiveEvent; to: number | null }
type Listener = (envelope: Envelope) => void

// shortcut: in-process bus, so live events only reach clients of this one Node process; switch to
// Postgres LISTEN/NOTIFY if the app ever runs as more than one instance (design D5).
const listeners = new Set<Listener>()

/** Publishes after a successful write. Listener failures never break the write that published. */
export function publish(event: LiveEvent, to: number | null = null): void {
  for (const listener of listeners) {
    try {
      listener({ event, to })
    } catch (error) {
      console.warn('Live event listener failed', error)
    }
  }
}

/** Subscribes to every event; returns the unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Whether a guardian's stream should receive this envelope. */
export function isFor(envelope: Envelope, guardianId: number): boolean {
  return envelope.to === null || envelope.to === guardianId
}

/** One Server-Sent Events message carrying the event as JSON. */
export function toSse(event: LiveEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}
