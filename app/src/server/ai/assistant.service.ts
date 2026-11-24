import { AppError } from '#/lib/errors.ts'
import { getGlitch } from '../glitches/glitches.service.ts'
import { getDashboard, getForesight } from '../monitoring/monitoring.service.ts'
import { composeAnswer, findGlitchId, pickIntent } from './assistant.ts'
import { getClassifier } from './classifier.ts'
import type { AssistantAnswer } from '#/lib/assistant.ts'

/** The Oracle (design D6): AI picks the intent, templates answer from live data. */
export async function askAssistant(question: string): Promise<AssistantAnswer> {
  const glitchId = findGlitchId(question)
  const [intent, dashboard, glitch] = await Promise.all([
    pickIntent(getClassifier(), question),
    getDashboard(),
    glitchId
      ? getGlitch(glitchId).catch((error: unknown) => {
          if (error instanceof AppError && error.code === 'NOT_FOUND') return null
          throw error
        })
      : null,
  ])
  const foresight = intent === 'foresight' ? await getForesight() : undefined
  return composeAnswer(intent, { dashboard, glitchId, glitch, foresight })
}
