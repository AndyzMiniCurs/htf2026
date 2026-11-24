import { createServerFn } from '@tanstack/react-start'
import { askAssistantInput } from '#/lib/assistant.ts'
import { validate } from '#/lib/validate.ts'
import * as assistant from '#/server/ai/assistant.service.ts'
import { requireGuardian } from '#/server/auth/middleware.ts'

export const askAssistant = createServerFn({ method: 'POST' })
  .middleware([requireGuardian])
  .validator(validate(askAssistantInput))
  .handler(({ data, context }) => assistant.askAssistant(context.guardian, data))
