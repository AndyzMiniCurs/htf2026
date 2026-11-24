import { z } from 'zod'
import type { Classifier } from './classifier.ts'

// Checked with curl: POST + Bearer auth (401 JSON on a bad key). Body/answer shape from TypeSafe's
// published examples; any mismatch is parsed as "no opinion", never thrown.
const JEV_URL = 'https://api.typesafe.ai/v1/systemone'
const JEV_MODEL = 'jev-1.13.0' // pinned: thresholds (0.8 etc.) are tuned against one version

type JevQuestion =
  | { type: 'noul'; instructions: string }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }

const noulAnswer = z.object({ noul: z.number().min(0).max(1) })
const choiceAnswer = z.object({ probabilities: z.record(z.string(), z.number()) })
const jevResponse = z.object({ answers: z.record(z.string(), z.unknown()) })

export type JevOptions = {
  apiKey: string
  fetch?: typeof fetch
  timeoutMs?: number
}

export function createJevClassifier({ apiKey, fetch: doFetch = fetch, timeoutMs = 3000 }: JevOptions): Classifier {
  async function ask(state: Record<string, string>, questions: Record<string, JevQuestion>) {
    try {
      const res = await doFetch(JEV_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: JEV_MODEL, state, questions }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) {
        // Error bodies can echo the submitted state, so only the status is logged.
        console.warn(`Jev call failed with HTTP ${res.status}`)
        return null
      }
      const parsed = jevResponse.safeParse(await res.json())
      return parsed.success ? parsed.data.answers : null
    } catch (error) {
      console.warn(`Jev call failed: ${error instanceof Error ? error.name : 'unknown error'}`)
      return null
    }
  }

  return {
    async yesNo(question) {
      const answers = await ask({ question }, { q: { type: 'noul', instructions: 'Answer `question`.' } })
      const answer = noulAnswer.safeParse(answers?.q)
      return answer.success ? answer.data.noul : null
    },

    async choose(question, options) {
      if (options.length === 0) return []
      // Option keys are positional so free text (glitch summaries) never has to be a valid key.
      const criteria = Object.fromEntries(options.map((option, i) => [`o${i}`, option]))
      const answers = await ask(
        { question },
        { q: { type: 'choice', instructions: 'Pick the option that answers `question`.', criteria } },
      )
      const answer = choiceAnswer.safeParse(answers?.q)
      if (!answer.success) return null
      return options
        .map((option, i) => ({ option, probability: answer.data.probabilities[`o${i}`] ?? 0 }))
        .sort((a, b) => b.probability - a.probability)
    },

    async score(question, items) {
      if (items.length === 0) return []
      // One yes/no per item in a single request: P(yes) is the item's 0..1 score.
      const state = Object.fromEntries(items.map((item, i) => [`item${i}`, item]))
      const questions = Object.fromEntries(
        items.map((_, i) => [`i${i}`, { type: 'noul' as const, instructions: `${question} Judge \`item${i}\`.` }]),
      )
      const answers = await ask({ question, ...state }, questions)
      if (!answers) return null
      const scores = items.map((_, i) => noulAnswer.safeParse(answers[`i${i}`]))
      return scores.every((s) => s.success) ? scores.map((s) => s.data?.noul ?? 0) : null
    },
  }
}
