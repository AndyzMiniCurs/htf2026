import { z } from 'zod'
import { GLITCH_TYPES } from './glitch.ts'

export const PRESSURE_MODES = ['storm', 'steady', 'calm'] as const
export const pressureModeSchema = z.enum(PRESSURE_MODES)
export type PressureMode = z.infer<typeof pressureModeSchema>

export const typeSkillSchema = z.object({
  /** 0..1: speed against everyone else at this type, trusted more with more fixes. */
  skill: z.number(),
  fixes: z.number().int(),
  medianMinutes: z.number(),
})
export type TypeSkill = z.infer<typeof typeSkillSchema>

const glitchTypeSchema = z.enum(GLITCH_TYPES)

export const forecastSchema = z.object({
  /** ISO 8601. */
  generatedAt: z.string(),
  /** One entry per hour ahead, starting with the next full hour. */
  hours: z.array(
    z.object({
      at: z.string(),
      /** Expected new glitches, with an 80% range. */
      glitches: z.number(),
      low: z.number(),
      high: z.number(),
      /** What the naive weekday-and-hour average expects, for comparison. */
      baseline: z.number(),
      /** Magic at the usual fixing pace, 0..100. */
      magic: z.number(),
    }),
  ),
  magicNow: z.number(),
  mode: pressureModeSchema,
  /** Next hours' forecast drain over a typical stretch of the same length. */
  pressureRatio: z.number(),
  peak: z.object({ at: z.string(), glitches: z.number() }),
  /** First hour magic is expected under the 20% lockdown line, if any. */
  lockdownAt: z.string().nullable(),
  model: z.object({
    kind: z.string(),
    trainedHours: z.number().int(),
    incidents: z.number().int(),
    /** Mean absolute error on the held-out last week: model vs. weekday-and-hour average. */
    modelError: z.number(),
    baselineError: z.number(),
    synthetic: z.boolean(),
  }),
  /** Average incidents per weekday (0 = Sunday) and hour, from the history. */
  heatmap: z.array(z.array(z.number())),
  defenders: z.array(
    z.object({
      guardianId: z.number().int(),
      codename: z.string(),
      openCount: z.number().int(),
      skills: z.record(glitchTypeSchema, typeSkillSchema),
    }),
  ),
  /** Who the next glitch of each type would go to right now, and why. */
  nextAssignee: z.record(
    glitchTypeSchema,
    z
      .object({
        guardianId: z.number().int(),
        codename: z.string(),
        skill: z.number(),
        reason: z.enum(['best-for-storm', 'training-quest', 'best-available']),
      })
      .nullable(),
  ),
})
export type Forecast = z.infer<typeof forecastSchema>
