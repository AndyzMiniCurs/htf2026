import { z } from 'zod'
import { guardianSchema } from './guardian.ts'

/** Lifecycle of a glitch, in order. */
export const GLITCH_STATUSES = ['LEAKED', 'ASSESSING', 'CONTAINING', 'FIXED'] as const
export const glitchStatusSchema = z.enum(GLITCH_STATUSES)
export type GlitchStatus = z.infer<typeof glitchStatusSchema>

export const GLITCH_TYPES = [
  'time-anomaly',
  'magic-drain',
  'portal',
  'sensor-fault',
  'creature',
  'unknown',
] as const
export const glitchTypeSchema = z.enum(GLITCH_TYPES)
export type GlitchType = z.infer<typeof glitchTypeSchema>

/** Who created the glitch: a guardian's echo or the sensor anomaly detector. */
export const GLITCH_SOURCES = ['echo', 'prediction'] as const
export const glitchSourceSchema = z.enum(GLITCH_SOURCES)
export type GlitchSource = z.infer<typeof glitchSourceSchema>

export const glitchIdSchema = z.string().regex(/^GL-\d{4,}$/, 'Glitch id looks like GL-0142')

/** Position on the Achrona map, in percent of its width and height. */
export const locationSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
})
export type Location = z.infer<typeof locationSchema>

export const runbookStepSchema = z.object({ text: z.string(), done: z.boolean() })
export type RunbookStep = z.infer<typeof runbookStepSchema>

export const glitchSchema = z.object({
  glitchId: z.string(),
  status: glitchStatusSchema,
  description: z.string(),
  /** ISO 8601 */
  timestamp: z.string(),
})
export type Glitch = z.infer<typeof glitchSchema>

export const glitchListItemSchema = glitchSchema.extend({
  type: glitchTypeSchema,
  location: locationSchema.nullable(),
  assignee: guardianSchema.nullable(),
  echoCount: z.number().int(),
  source: glitchSourceSchema,
})
export type GlitchListItem = z.infer<typeof glitchListItemSchema>

export const echoSchema = z.object({
  echoId: z.number().int(),
  glitchId: z.string(),
  description: z.string(),
  /** ISO 8601, set by the server. */
  timestamp: z.string(),
  /** null = reported by the system. */
  reporter: guardianSchema.nullable(),
  location: locationSchema.nullable(),
  groupedByAi: z.boolean(),
  /** `/api/images/<echoId>` when the echo has an image. */
  imageUrl: z.string().nullable(),
})
export type Echo = z.infer<typeof echoSchema>

export const glitchDetailSchema = glitchListItemSchema.extend({
  /** Oldest first. */
  echoes: z.array(echoSchema),
  runbook: z.array(runbookStepSchema),
  mergedInto: z.string().nullable(),
})
export type GlitchDetail = z.infer<typeof glitchDetailSchema>

export const GLITCH_SORTS = ['newest', 'oldest', 'status'] as const

/** Also the `/glitches` route search params, so every field is optional. */
export const glitchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.array(glitchStatusSchema).optional(),
  type: z.array(glitchTypeSchema).optional(),
  /**
   * Inclusive lower bound. Send a full ISO instant (`new Date(y, m, d).toISOString()`) so a day
   * means the guardian's local day; a bare `YYYY-MM-DD` is read as a UTC day.
   */
  from: z.string().max(40).optional(),
  /** Inclusive upper bound, same rules as `from` (a bare date covers that whole UTC day). */
  to: z.string().max(40).optional(),
  sort: z.enum(GLITCH_SORTS).optional(),
})
export type GlitchQuery = z.infer<typeof glitchQuerySchema>

export const glitchIdInput = z.object({ glitchId: glitchIdSchema })
export type GlitchIdInput = z.infer<typeof glitchIdInput>

export const assignGlitchInput = z.object({
  glitchId: glitchIdSchema,
  /** null clears the assignment. */
  guardianId: z.number().int().positive().nullable(),
})
export type AssignGlitchInput = z.infer<typeof assignGlitchInput>

export const mergeGlitchInput = z
  .object({ glitchId: glitchIdSchema, intoGlitchId: glitchIdSchema })
  .refine((v) => v.glitchId !== v.intoGlitchId, {
    message: 'A glitch cannot be merged into itself',
    path: ['intoGlitchId'],
  })
export type MergeGlitchInput = z.infer<typeof mergeGlitchInput>

export const setRunbookStepInput = z.object({
  glitchId: glitchIdSchema,
  index: z.number().int().min(0),
  done: z.boolean(),
})
export type SetRunbookStepInput = z.infer<typeof setRunbookStepInput>
