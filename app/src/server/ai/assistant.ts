import { INTENTS } from '#/lib/assistant.ts'
import type { Classifier } from './classifier.ts'
import type { AssistantAnswer, Intent } from '#/lib/assistant.ts'
import type { GlitchDetail, GlitchListItem } from '#/lib/glitch.ts'
import type { Dashboard } from '#/lib/monitoring.ts'
import type { SensorForesight } from '../monitoring/monitoring.service.ts'

const INTENT_HINTS: Record<Intent, string> = {
  'active-summary': 'an overview of what is happening right now, the active incidents',
  'glitch-status': 'the status or details of one specific glitch',
  'glitch-assignee': 'who is assigned to or working on a glitch',
  'magic-level': 'how much magic is left, the magic level or reserve',
  'glitch-runbook': 'what to do about a glitch, the steps to fix it',
  foresight: 'what is coming, what will break soon, predictions about the sensors',
  'assign-glitch': 'a request to assign or give a glitch to a defender',
  'advance-glitch': 'a request to move a glitch to its next status, or mark it fixed',
  'report-echo': 'a request to report a new problem or echo',
  'set-lockdown': 'a request to turn the city lockdown on or off',
  unknown: 'anything else',
}

const GLITCH_ID = /\bGL-\d{4,}\b/i
/** Without AI these still reach the foresight answer (spec: Low-cost AI fails open). */
const FORESIGHT_WORDS = /\b(coming|foresee|predict\w*|future|soon|next)\b/i

export function findGlitchId(question: string): string | null {
  return question.match(GLITCH_ID)?.[0].toUpperCase() ?? null
}

/** The AI only picks the intent. Without AI a glitch id still gets its status, anything else is unknown. */
export async function pickIntent(classifier: Classifier, question: string): Promise<Intent> {
  const options = INTENTS.map((intent) => `${intent}: ${INTENT_HINTS[intent]}`)
  const top = (
    await classifier.choose(
      `What is the operator of a city mission control asking? ${JSON.stringify(question)}`,
      options,
    )
  )?.at(0)
  if (top) return INTENTS[options.indexOf(top.option)] ?? 'unknown'
  if (FORESIGHT_WORDS.test(question)) return 'foresight'
  return findGlitchId(question) ? 'glitch-status' : 'unknown'
}

export type AssistantData = {
  dashboard: Dashboard
  /** The id named in the question, and the glitch if it exists. */
  glitchId: string | null
  glitch: GlitchDetail | null
  /** Filled for the foresight intent. */
  foresight?: Array<SensorForesight>
}

// shortcut: intents still being built answer as unknown, removed once each has its template.
const ANSWERED = new Set<Intent>([
  'active-summary',
  'glitch-status',
  'glitch-assignee',
  'magic-level',
  'glitch-runbook',
  'foresight',
])

const isOpen = (g: GlitchListItem) => g.status !== 'FIXED'
const label = (g: GlitchListItem) => `${g.glitchId} (${g.type}, ${g.status})`

function suggestionsFor(dashboard: Dashboard): Array<string> {
  const id = dashboard.recent.find(isOpen)?.glitchId ?? dashboard.recent.at(0)?.glitchId
  return [
    'What is going on right now?',
    'How much magic is left?',
    ...(id ? [`Who is working on ${id}?`, `What should I do about ${id}?`] : []),
  ]
}

/** Builds the answer from live data only, so it can never invent a glitch or a number. */
export function composeAnswer(intent: Intent, data: AssistantData): AssistantAnswer {
  const { dashboard, glitch, glitchId } = data
  const suggestions = suggestionsFor(dashboard)
  const answer = (text: string, glitchIds: Array<string> = [], asked: Intent = intent) => ({
    intent: asked,
    text,
    glitchIds,
    suggestions: asked === 'unknown' ? suggestions : [],
    action: null,
  })

  if (intent === 'unknown' || !ANSWERED.has(intent)) {
    return answer(
      "I can't answer that yet. I know about active glitches, their status, who handles them, their runbooks and the magic level. Try one of these:",
    )
  }

  if (intent === 'active-summary') {
    const open = dashboard.recent.filter(isOpen)
    if (open.length === 0) {
      return answer(`No open glitches: Achrona is calm. Magic is at ${dashboard.magicLevel}%.`)
    }
    const { LEAKED, ASSESSING, CONTAINING } = dashboard.byStatus
    const newest = open.slice(0, 3)
    const lockdown = dashboard.lockdown ? ' The city is in lockdown.' : ''
    return answer(
      `${open.length} open glitch${open.length === 1 ? '' : 'es'}: ${LEAKED} leaked, ${ASSESSING} assessing, ${CONTAINING} containing. ` +
        `Newest: ${newest.map(label).join(', ')}. Magic is at ${dashboard.magicLevel}%.${lockdown}`,
      newest.map((g) => g.glitchId),
    )
  }

  if (intent === 'foresight') return answer(...foresightText(data.foresight ?? []))

  if (intent === 'magic-level') {
    const [worstType, worstCount] =
      Object.entries(dashboard.byType).sort(([, a], [, b]) => b - a)[0] ?? []
    const cause =
      worstType && worstCount
        ? ` The biggest drain is ${worstCount} open ${worstType} glitch${worstCount === 1 ? '' : 'es'}.`
        : ''
    return answer(`Magic is at ${dashboard.magicLevel}%.${cause}`)
  }

  // The remaining intents are about one glitch.
  if (!glitchId) {
    return answer('Which glitch do you mean? Name its id, like GL-0142.', [], 'unknown')
  }
  if (!glitch) return answer(`I can't find ${glitchId}.`, [], 'unknown')
  if (glitch.mergedInto) {
    return answer(`${glitchId} was merged into ${glitch.mergedInto}.`, [
      glitchId,
      glitch.mergedInto,
    ])
  }
  const assignee = glitch.assignee ? `assigned to ${glitch.assignee.codename}` : 'not assigned yet'

  if (intent === 'glitch-assignee') {
    return answer(`${glitchId} is ${assignee}.`, [glitchId])
  }
  if (intent === 'glitch-runbook') {
    const steps = glitch.runbook.map((s, i) => `${i + 1}. ${s.text}${s.done ? ' (done)' : ''}`)
    return answer(
      steps.length
        ? `Runbook for ${glitchId} (${glitch.type}): ${steps.join(' ')}`
        : `${glitchId} has no runbook yet.`,
      [glitchId],
    )
  }
  const last = glitch.echoes.at(-1)
  return answer(
    `${glitchId} is ${glitch.status} (${glitch.type}), ${assignee}.` +
      (last ? ` Last echo: ${JSON.stringify(last.description)}.` : ''),
    [glitchId],
  )
}

const fmt = (n: number) => String(Math.round(n * 10) / 10)
const inTime = (s: number) => (s < 90 ? `about ${s} s` : `about ${Math.round(s / 60)} min`)

/** The foresight answer: what is heading for an alarm, soonest first, then what is already raised. */
function foresightText(sensors: Array<SensorForesight>): [string, Array<string>] {
  const heading = sensors
    .flatMap((s) =>
      s.forecast?.status === 'heading' && !s.openPrediction ? [{ ...s, f: s.forecast }] : [],
    )
    .sort((a, b) => a.f.etaSeconds - b.f.etaSeconds)
  const raised = sensors.flatMap((s) => (s.openPrediction ? [s.openPrediction] : []))
  const warnings = heading.map(
    (s) =>
      `${s.label} is ${s.f.ratePerMin < 0 ? 'falling' : 'rising'} ${fmt(Math.abs(s.f.ratePerMin))} ${s.unit}/min. ` +
      `At this rate it trips the ${s.f.rule === 'drop' ? '40% drop' : '3σ'} alarm in ${inTime(s.f.etaSeconds)} and I will raise a ${s.glitchType} glitch.`,
  )
  const already = raised.length ? ` Already raised from sensor data: ${raised.join(', ')}.` : ''
  if (warnings.length) return [`I foresee trouble. ${warnings.join(' ')}${already}`, raised]
  const readings = sensors
    .flatMap((s) => (s.forecast ? [`${s.label} ${fmt(s.forecast.value)} ${s.unit}`] : []))
    .join(', ')
  return [
    `The sensors look steady${readings ? `: ${readings}` : ''}. No new glitch in sight.${already}`,
    raised,
  ]
}
