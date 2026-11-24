import { createServerFn } from '@tanstack/react-start'
import { stageDemoInput } from '#/lib/demo.ts'
import { validate } from '#/lib/validate.ts'
import { requireCommander } from '#/server/auth/middleware.ts'
import * as demo from '#/server/demo/demo.service.ts'

export const resetDemo = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .handler(async (): Promise<{ glitches: number }> => demo.resetDemo())

export const stageDemo = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(stageDemoInput))
  .handler(async ({ data }): Promise<{ glitchIds: Array<string> }> => demo.stageDemo(data.stage))
