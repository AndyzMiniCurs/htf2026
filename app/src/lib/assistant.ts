import { z } from 'zod'

export const INTENTS = [
  'active-summary',
  'glitch-status',
  'glitch-assignee',
  'magic-level',
  'glitch-runbook',
  'unknown',
] as const
export const intentSchema = z.enum(INTENTS)
export type Intent = z.infer<typeof intentSchema>

export const assistantAnswerSchema = z.object({
  intent: intentSchema,
  text: z.string(),
  /** Glitch ids mentioned in the answer, so the UI can link them. */
  glitchIds: z.array(z.string()),
  /** Example questions, mainly for the `unknown` intent. */
  suggestions: z.array(z.string()),
})
export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>

export const askAssistantInput = z.object({
  question: z.string().trim().min(1, 'Ask a question').max(500, 'Questions can have at most 500 characters'),
})
export type AskAssistantInput = z.infer<typeof askAssistantInput>
