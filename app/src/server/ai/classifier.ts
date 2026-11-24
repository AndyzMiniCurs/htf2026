import { createJevClassifier } from './jev.classifier.ts'
import { nullClassifier } from './null.classifier.ts'
import { createOpenRouterClassifier } from './openrouter.classifier.ts'

/**
 * The AI port (design D6). Every method resolves to `null` when the AI has no opinion
 * (not configured, timeout, error); callers then take the non-AI path.
 */
export interface Classifier {
  /** Options ranked by probability, highest first. */
  choose: (
    question: string,
    options: Array<string>,
  ) => Promise<Array<{ option: string; probability: number }> | null>
  /** A 0..1 score per item, in the same order as `items`. */
  score: (question: string, items: Array<string>) => Promise<Array<number> | null>
  /** P(yes), 0..1. */
  yesNo: (question: string) => Promise<number | null>
}

type AiKeys = { TYPESAFE_API_KEY?: string; OPENROUTER_API_KEY?: string }

/** Jev first (the team's choice), OpenRouter as the fallback, otherwise no AI. */
export function createClassifier(keys: AiKeys = process.env): Classifier {
  if (keys.TYPESAFE_API_KEY) return createJevClassifier({ apiKey: keys.TYPESAFE_API_KEY })
  if (keys.OPENROUTER_API_KEY)
    return createOpenRouterClassifier({ apiKey: keys.OPENROUTER_API_KEY })
  return nullClassifier
}

let instance: Classifier | undefined

export function getClassifier(): Classifier {
  instance ??= createClassifier()
  return instance
}

/** Lets the UI hide AI-only controls. */
export function isAiEnabled(): boolean {
  return getClassifier() !== nullClassifier
}
