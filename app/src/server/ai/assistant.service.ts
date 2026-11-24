import { AppError } from '#/lib/errors.ts'
import { getGlitch } from '../glitches/glitches.service.ts'
import { listGuardians } from '../guardians/guardians.repository.ts'
import { getDashboard, getForesight } from '../monitoring/monitoring.service.ts'
import { composeAnswer, findGlitchId, pickIntent } from './assistant.ts'
import { getClassifier } from './classifier.ts'
import type { AskAssistantInput, AssistantAnswer } from '#/lib/assistant.ts'
import type { Guardian } from '#/lib/guardian.ts'

/**
 * The Oracle (design D6, oracle-foresight D4-D5): AI picks the intent, templates answer from
 * live data, and actions are only proposed; the UI's Confirm calls the real server function.
 */
export async function askAssistant(
  asker: Guardian,
  { question, history = [] }: AskAssistantInput,
): Promise<AssistantAnswer> {
  // A follow-up without an id is about the last glitch the conversation named.
  const last = history.at(-1)
  const glitchId =
    findGlitchId(question) ?? last?.glitchIds[0] ?? (last ? findGlitchId(last.question) : null)
  const [intent, dashboard, glitch, guardians] = await Promise.all([
    pickIntent(
      getClassifier(),
      question,
      history.slice(-2).map((h) => h.question),
    ),
    getDashboard(),
    glitchId
      ? getGlitch(glitchId).catch((error: unknown) => {
          if (error instanceof AppError && error.code === 'NOT_FOUND') return null
          throw error
        })
      : null,
    listGuardians(),
  ])
  const foresight = intent === 'foresight' ? await getForesight() : undefined
  return composeAnswer(intent, {
    dashboard,
    glitchId,
    glitch,
    foresight,
    question,
    asker,
    guardians,
  })
}
