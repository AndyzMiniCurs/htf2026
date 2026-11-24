import { z } from 'zod'
import { echoDescriptionSchema } from './echo.ts'
import { glitchIdSchema, glitchStatusSchema } from './glitch.ts'

export const INTENTS = [
  'active-summary',
  'glitch-status',
  'glitch-assignee',
  'magic-level',
  'glitch-runbook',
  'foresight',
  'assign-glitch',
  'advance-glitch',
  'report-echo',
  'set-lockdown',
  'unknown',
] as const
export const intentSchema = z.enum(INTENTS)
export type Intent = z.infer<typeof intentSchema>

/**
 * What the Oracle proposes; nothing happens until the guardian confirms and the UI calls the
 * matching server function (assignGlitch, advanceStatus, reportEcho, setLockdown).
 */
export const oracleActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('assign'),
    glitchId: glitchIdSchema,
    guardianId: z.number().int().positive(),
    codename: z.string(),
  }),
  z.object({
    kind: z.literal('advance'),
    glitchId: glitchIdSchema,
    from: glitchStatusSchema,
    to: glitchStatusSchema,
  }),
  z.object({ kind: z.literal('report'), description: echoDescriptionSchema }),
  z.object({ kind: z.literal('lockdown'), on: z.boolean() }),
])
export type OracleAction = z.infer<typeof oracleActionSchema>

export const assistantAnswerSchema = z.object({
  intent: intentSchema,
  text: z.string(),
  /** Glitch ids mentioned in the answer, so the UI can link them. */
  glitchIds: z.array(z.string()),
  /** Example questions, mainly for the `unknown` intent. */
  suggestions: z.array(z.string()),
  /** A proposed action for the guardian to confirm, or null. */
  action: oracleActionSchema.nullable(),
})
export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>

export const askAssistantInput = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Ask a question')
    .max(500, 'Questions can have at most 500 characters'),
  /** The conversation's last exchanges, oldest first: each question and the glitch ids its answer named. */
  history: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(500),
        glitchIds: z.array(glitchIdSchema).max(10),
      }),
    )
    .max(6)
    .optional(),
})
export type AskAssistantInput = z.infer<typeof askAssistantInput>
