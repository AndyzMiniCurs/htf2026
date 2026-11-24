import { z } from 'zod'
import { GLITCH_STATUSES, GLITCH_TYPES, glitchListItemSchema } from './glitch.ts'
import { guardianSchema } from './guardian.ts'

export const SENSOR_IDS = ['magic-reserve', 'ley-flux', 'portal-stability'] as const
export const sensorIdSchema = z.enum(SENSOR_IDS)
export type SensorId = z.infer<typeof sensorIdSchema>

export const SENSORS: Record<SensorId, { label: string; unit: string }> = {
  'magic-reserve': { label: 'Magic reserve', unit: '%' },
  'ley-flux': { label: 'Ley-line flux', unit: 'Thm' },
  'portal-stability': { label: 'Portal stability', unit: '%' },
}

export const dashboardSchema = z.object({
  /** 0..100 */
  magicLevel: z.number(),
  byStatus: z.record(z.enum(GLITCH_STATUSES), z.number().int()),
  byType: z.record(z.enum(GLITCH_TYPES), z.number().int()),
  /**
   * Every open (non-FIXED, non-merged) glitch plus the 5 most recently fixed ones, newest first.
   * The home page builds its quest log, chronicle and 3D rifts from this, so it must not be cut.
   */
  recent: z.array(glitchListItemSchema),
  lockdown: z.boolean(),
})
export type Dashboard = z.infer<typeof dashboardSchema>

export const sensorPointSchema = z.object({ timestamp: z.string(), value: z.number() })
export type SensorPoint = z.infer<typeof sensorPointSchema>

export const sensorSeriesSchema = z.object({
  sensorId: sensorIdSchema,
  label: z.string(),
  unit: z.string(),
  points: z.array(sensorPointSchema),
})
export type SensorSeries = z.infer<typeof sensorSeriesSchema>

export const BADGES = ['first-fix', 'stabilizer', 'specialist', 'rapid-response'] as const
export const badgeSchema = z.enum(BADGES)
export type Badge = z.infer<typeof badgeSchema>

export const leaderboardEntrySchema = z.object({
  guardian: guardianSchema,
  fixes: z.number().int(),
  badges: z.array(badgeSchema),
})
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>

export const reportSchema = z.object({
  generatedAt: z.string(),
  dashboard: dashboardSchema,
  open: z.array(glitchListItemSchema),
  leaderboard: z.array(leaderboardEntrySchema),
})
export type Report = z.infer<typeof reportSchema>

export const notificationPrefsSchema = z.object({
  onAssigned: z.boolean(),
  onStatus: z.boolean(),
  onLockdown: z.boolean(),
})
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>

export const sensorSeriesInput = z
  .object({ minutes: z.number().int().min(1).max(60).optional() })
  .optional()
  .transform((v) => ({ minutes: v?.minutes ?? 15 }))
export type SensorSeriesInput = z.input<typeof sensorSeriesInput>

export const setLockdownInput = z.object({ on: z.boolean() })
export type SetLockdownInput = z.infer<typeof setLockdownInput>

export const triggerIncidentInput = z.object({ sensorId: sensorIdSchema })
export type TriggerIncidentInput = z.infer<typeof triggerIncidentInput>
