import { GLITCH_TYPES } from '#/lib/glitch.ts'
import type { GlitchType } from '#/lib/glitch.ts'
import type { PressureMode, TypeSkill } from '#/lib/forecast.ts'

export type Fix = { guardianId: number; type: GlitchType; minutes: number }

/** Fixes it takes before speed counts fully; fewer fixes lean on the prior. */
const CONFIDENCE_AT = 6
/** What a defender with no record at a type is assumed to be. */
const PRIOR = 0.3

const median = (values: Array<number>): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/**
 * How good each defender is at each type, from the fixes on record: speed against the median of
 * everyone who fixed that type, trusted more the more fixes it rests on (0..1).
 */
export function skillProfiles(
  guardianIds: Array<number>,
  fixes: Array<Fix>,
): Map<number, Record<GlitchType, TypeSkill>> {
  const typeMedian = Object.fromEntries(
    GLITCH_TYPES.map((t) => [t, median(fixes.filter((f) => f.type === t).map((f) => f.minutes))]),
  ) as Record<GlitchType, number>
  return new Map(
    guardianIds.map((id) => {
      const profile = Object.fromEntries(
        GLITCH_TYPES.map((type) => {
          const own = fixes.filter((f) => f.guardianId === id && f.type === type)
          const minutes = median(own.map((f) => f.minutes))
          // Twice the usual speed scores 1, the usual speed 0.5, half as fast 0.25.
          const speed = own.length && minutes > 0 ? Math.min(1, typeMedian[type] / minutes / 2) : 0
          const trust = own.length / (own.length + CONFIDENCE_AT)
          return [
            type,
            {
              skill: Math.round((trust * speed + (1 - trust) * PRIOR) * 100) / 100,
              fixes: own.length,
              medianMinutes: Math.round(minutes),
            },
          ]
        }),
      ) as Record<GlitchType, TypeSkill>
      return [id, profile]
    }),
  )
}

/**
 * How hard the next hours will hit, from forecast drain against a typical stretch of the same
 * length: a storm (half again the usual, or magic heading under the lockdown line) or a lull.
 */
export function pressureMode(forecast: number, typical: number, lowestMagic: number): PressureMode {
  if (lowestMagic < 20 || forecast >= typical * 1.5) return 'storm'
  if (forecast <= typical * 0.7) return 'calm'
  return 'steady'
}

export type Candidate = {
  guardianId: number
  codename: string
  /** This defender's skill at the glitch's type, 0..1. */
  skill: number
  openCount: number
  /** The AI's 0..1 opinion of the fit, when it has one. */
  ai: number | null
}

export type Pick = {
  guardianId: number
  codename: string
  skill: number
  /** Why this defender: shown with the assignment. */
  reason: 'best-for-storm' | 'training-quest' | 'best-available'
}

/**
 * Who takes a new glitch. In a storm or steady hours, the strongest defender for the type,
 * weighed down by what they already carry. In a lull, a training quest: the least practised
 * defender who is free, so the experts stay rested for the next storm.
 */
export function chooseDefender(mode: PressureMode, candidates: Array<Candidate>): Pick | null {
  if (candidates.length === 0) return null
  const fit = (c: Candidate) => (c.ai === null ? c.skill : 0.7 * c.skill + 0.3 * c.ai)
  if (mode === 'calm') {
    // Free: carrying no more than one quest above the least loaded defender.
    const lightest = Math.min(...candidates.map((c) => c.openCount))
    const free = candidates.filter((c) => c.openCount <= lightest + 1)
    const learner = [...free].sort((a, b) => fit(a) - fit(b) || a.openCount - b.openCount).at(0)
    const expert = Math.max(...candidates.map(fit))
    // Only a real learner trains; the best at the kind simply takes it.
    if (learner)
      return {
        ...pickOf(learner),
        reason: fit(learner) < expert ? 'training-quest' : 'best-available',
      }
  }
  const best = [...candidates]
    .sort(
      (a, b) =>
        fit(b) / (1 + b.openCount) - fit(a) / (1 + a.openCount) || a.openCount - b.openCount,
    )
    .at(0)
  if (!best) return null
  return { ...pickOf(best), reason: mode === 'storm' ? 'best-for-storm' : 'best-available' }
}

const pickOf = (c: Candidate) => ({
  guardianId: c.guardianId,
  codename: c.codename,
  skill: c.skill,
})
