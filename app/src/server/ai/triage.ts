import { AppError } from '#/lib/errors.ts'
import { GLITCH_TYPES } from '#/lib/glitch.ts'
import type { Classifier } from './classifier.ts'
import type { GlitchType } from '#/lib/glitch.ts'

/** Below this an AI match is not trusted: the echo becomes a new glitch (spec). */
export const MATCH_THRESHOLD = 0.8
export const NOT_USEFUL_MESSAGE = 'This echo was flagged as not useful'
export const ILLEGAL_MESSAGE = 'This echo was flagged as illegal or abusive'

// Without this a general model judges portals and time loops as "not a real city problem".
const REALM =
  'Achrona is a magical city where time anomalies, magic drains, portals, sensor faults and creatures are real problems.'

const quote = (text: string) => JSON.stringify(text)

/** Throws VALIDATION with the reason; no opinion (null) lets the echo through. */
export async function moderate(classifier: Classifier, description: string): Promise<void> {
  const [useful, abusive] = await Promise.all([
    classifier.yesNo(
      `${REALM} Is this a useful report about a problem in the city? ${quote(description)}`,
    ),
    classifier.yesNo(`Is this illegal or abusive content? ${quote(description)}`),
  ])
  if (abusive !== null && abusive > 0.7) throw new AppError('VALIDATION', ILLEGAL_MESSAGE)
  if (useful !== null && useful < 0.3) throw new AppError('VALIDATION', NOT_USEFUL_MESSAGE)
}

const TYPE_HINTS: Record<GlitchType, string> = {
  'time-anomaly': 'time loops, frozen, repeating or skipping time',
  'magic-drain': 'magic or mana levels dropping, spells failing',
  portal: 'rifts, tears or portals opening or flickering',
  'sensor-fault': 'a sensor, gauge or device giving wrong or no readings',
  creature: 'creatures or beings causing trouble',
  unknown: 'none of the above',
}

/** The most likely type; `unknown` without an AI opinion. */
export async function classifyType(
  classifier: Classifier,
  description: string,
): Promise<GlitchType> {
  const options = GLITCH_TYPES.map((type) => `${type}: ${TYPE_HINTS[type]}`)
  const ranked = await classifier.choose(
    `${REALM} Which kind of glitch is this echo about? ${quote(description)}`,
    options,
  )
  const top = ranked?.at(0)
  return (top && GLITCH_TYPES[options.indexOf(top.option)]) ?? 'unknown'
}

/** The glitch this echo describes, if the AI is at least MATCH_THRESHOLD sure; else null. */
export async function findMatchingGlitch(
  classifier: Classifier,
  description: string,
  candidates: Array<{ glitchId: string; description: string }>,
): Promise<string | null> {
  if (candidates.length === 0) return null
  const options = [...candidates.map((g) => `${g.glitchId}: ${g.description}`), 'none of these']
  const top = (
    await classifier.choose(
      `${REALM} Which glitch does this new echo describe? ${quote(description)}`,
      options,
    )
  )?.at(0)
  if (!top || top.probability < MATCH_THRESHOLD) return null
  return candidates[options.indexOf(top.option)]?.glitchId ?? null
}

/** True only when the AI is at least MATCH_THRESHOLD sure the update reports a fix. */
export async function saysSolved(classifier: Classifier, description: string): Promise<boolean> {
  const p = await classifier.yesNo(
    `Does this update say the problem is solved? ${quote(description)}`,
  )
  return p !== null && p >= MATCH_THRESHOLD
}

export type DefenderLoad = {
  guardianId: number
  codename: string
  /** How many glitches of each type they fixed before. */
  fixedByType: Partial<Record<GlitchType, number>>
  openCount: number
}

const profile = (d: DefenderLoad) => {
  const fixed = Object.entries(d.fixedByType)
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${n} ${type}`)
  return `${d.codename} fixed ${fixed.length ? fixed.join(', ') : 'no glitches yet'}`
}

/**
 * AI suitability × 1/(1 + open load); without AI the least-loaded defender (design D6).
 * Ties go to the lower load, then the first defender. Null when there are no defenders.
 */
export async function pickAssignee(
  classifier: Classifier,
  type: GlitchType,
  defenders: Array<DefenderLoad>,
): Promise<number | null> {
  if (defenders.length === 0) return null
  const scores = await classifier.score(
    `How suited is this defender for a ${type} glitch, judging by the glitch types they fixed before?`,
    defenders.map(profile),
  )
  const ranked = defenders
    .map((d, i) => ({ d, value: scores ? (scores[i] ?? 0) / (1 + d.openCount) : 0 }))
    .sort((a, b) => b.value - a.value || a.d.openCount - b.d.openCount)
  return ranked[0]?.d.guardianId ?? null
}
