import { RUNBOOK_LIBRARY } from './runbook-library.ts'
import type { Classifier } from './classifier.ts'
import type { GlitchType, Location, RunbookStep } from '#/lib/glitch.ts'

/** Without AI the runbook is the first steps of the type's library (spec: 3 to 6 steps). */
const DEFAULT_STEPS = 4
const MIN_STEPS = 3
const MAX_STEPS = 6
/** A step at least this relevant is kept, up to MAX_STEPS. */
const RELEVANT = 0.5

export type RunbookContext = {
  glitchId: string
  type: GlitchType
  description: string
  location: Location | null
  /** The sensor's display name for predicted glitches. */
  sensorLabel: string | null
}

/** Fills {glitchId}, {location} and {sensor} with the glitch's own data. */
export function fillStep(step: string, context: RunbookContext): string {
  const location = context.location
    ? `map point ${Math.round(context.location.x)}·${Math.round(context.location.y)}`
    : 'the reported area'
  return step
    .replaceAll('{glitchId}', context.glitchId)
    .replaceAll('{location}', location)
    .replaceAll('{sensor}', context.sensorLabel ?? 'the nearest sensor')
}

/**
 * Picks 3 to 6 library steps: with AI scores, every step scoring at least 0.5 (topped up with the
 * best-scoring ones to reach 3), always kept in library order; without scores the first 4.
 */
export function selectSteps(library: Array<string>, scores: Array<number> | null): Array<string> {
  if (scores?.length !== library.length) return library.slice(0, DEFAULT_STEPS)
  const ranked = library.map((_, index) => ({ index, score: scores[index] ?? 0 }))
  ranked.sort((a, b) => b.score - a.score)
  const relevant = ranked.filter((s) => s.score >= RELEVANT).length
  const keep = ranked.slice(0, Math.min(MAX_STEPS, Math.max(MIN_STEPS, relevant)))
  return keep
    .map((s) => s.index)
    .sort((a, b) => a - b)
    .map((index) => library[index] ?? '')
}

/** The glitch's runbook: library steps for its type, ranked by the AI when available, filled in. */
export async function buildRunbook(
  context: RunbookContext,
  classifier: Classifier,
): Promise<Array<RunbookStep>> {
  const library = RUNBOOK_LIBRARY[context.type]
  const scores = await classifier.score(
    `How relevant is this step for this glitch: "${context.description}"?`,
    library,
  )
  return selectSteps(library, scores).map((step) => ({
    text: fillStep(step, context),
    done: false,
  }))
}
