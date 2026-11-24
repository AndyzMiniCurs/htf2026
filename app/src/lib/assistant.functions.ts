import { createServerFn } from '@tanstack/react-start'
import { askAssistantInput } from '#/lib/assistant.ts'
import { fixtureAssistantAnswer } from '#/lib/fixtures.ts'
import { validate } from '#/lib/validate.ts'
import { requireGuardian } from '#/server/auth/middleware.ts'
import type { AssistantAnswer } from '#/lib/assistant.ts'

export const askAssistant = createServerFn({ method: 'POST' })
  .middleware([requireGuardian])
  .validator(validate(askAssistantInput))
  .handler(async (): Promise<AssistantAnswer> => fixtureAssistantAnswer)
