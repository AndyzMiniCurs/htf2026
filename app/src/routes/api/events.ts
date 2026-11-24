import { createFileRoute } from '@tanstack/react-router'
import { currentGuardian } from '#/server/auth/session.ts'
import { isFor, subscribe, toSse } from '#/server/events/bus.ts'

const HEARTBEAT_MS = 15_000

/** Server-Sent Events stream of LiveEvents for the signed-in guardian (design D5). */
export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const guardian = await currentGuardian()
        if (!guardian) return new Response('Unauthorized', { status: 401 })

        const encoder = new TextEncoder()
        let cleanup = () => {}
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (text: string) => controller.enqueue(encoder.encode(text))
            // Comment lines keep proxies and idle phones from dropping the connection.
            send(': connected\n\n')
            const heartbeat = setInterval(() => send(': heartbeat\n\n'), HEARTBEAT_MS)
            const unsubscribe = subscribe((envelope) => {
              if (isFor(envelope, guardian.guardianId)) send(toSse(envelope.event))
            })
            cleanup = () => {
              clearInterval(heartbeat)
              unsubscribe()
            }
            request.signal.addEventListener('abort', () => {
              cleanup()
              try {
                controller.close()
              } catch {
                // Already closed by cancel(); nothing left to release.
              }
            })
          },
          cancel: () => cleanup(),
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
