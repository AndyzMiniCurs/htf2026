import { createServerFn } from '@tanstack/react-start'
import { askAssistantInput, type AssistantAnswer } from '#/lib/assistant.ts'
import { fixtureAssistantAnswer } from '#/lib/fixtures.ts'
import { validate } from '#/lib/validate.ts'

export const askAssistant = createServerFn({ method: 'POST' })
  .validator(validate(askAssistantInput))
  .handler(async (): Promise<AssistantAnswer> => fixtureAssistantAnswer)
