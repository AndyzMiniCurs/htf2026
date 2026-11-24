import { createJevClassifier } from './jev.classifier.ts'
import { nullClassifier } from './null.classifier.ts'

/**
 * The AI port (design D6). Every method resolves to `null` when the AI has no opinion
 * (not configured, timeout, error); callers then take the non-AI path.
 */
export interface Classifier {
  /** Options ranked by probability, highest first. */
  choose(question: string, options: string[]): Promise<{ option: string; probability: number }[] | null>
  /** A 0..1 score per item, in the same order as `items`. */
  score(question: string, items: string[]): Promise<number[] | null>
  /** P(yes), 0..1. */
  yesNo(question: string): Promise<number | null>
}

export function createClassifier(apiKey = process.env.TYPESAFE_API_KEY): Classifier {
  return apiKey ? createJevClassifier({ apiKey }) : nullClassifier
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
