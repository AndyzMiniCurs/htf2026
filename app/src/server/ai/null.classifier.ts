import type { Classifier } from './classifier.ts'

/** Used when no API key is set: never has an opinion. */
export const nullClassifier: Classifier = {
  choose: async () => null,
  score: async () => null,
  yesNo: async () => null,
}
