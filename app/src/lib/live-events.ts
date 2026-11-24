import { z } from 'zod'
import { sensorIdSchema } from './monitoring.ts'

export const notificationSchema = z.object({
  kind: z.enum(['assigned', 'status', 'lockdown']),
  text: z.string(),
  glitchId: z.string().optional(),
})
export type Notification = z.infer<typeof notificationSchema>

/** Everything `GET /api/events` streams, one JSON object per SSE `data:` line. */
export const liveEventSchema = z.union([
  z.object({ type: z.enum(['glitch.created', 'glitch.updated']), glitchId: z.string() }),
  z.object({ type: z.literal('echo.created'), echoId: z.number().int(), glitchId: z.string() }),
  z.object({
    type: z.literal('sensor.reading'),
    sensorId: sensorIdSchema,
    timestamp: z.string(),
    value: z.number(),
  }),
  z.object({ type: z.literal('lockdown'), on: z.boolean() }),
  z.object({ type: z.literal('notification'), notification: notificationSchema }),
])
export type LiveEvent = z.infer<typeof liveEventSchema>

/** Events that change loader data, so the client refetches. */
export const DATA_EVENT_TYPES = ['glitch.created', 'glitch.updated', 'echo.created'] as const
