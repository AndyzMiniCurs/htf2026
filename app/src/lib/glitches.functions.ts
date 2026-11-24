import { createServerFn } from '@tanstack/react-start'
import {
  assignGlitchInput,
  glitchIdInput,
  glitchQuerySchema,
  mergeGlitchInput,
  setRunbookStepInput,
} from '#/lib/glitch.ts'
import { validate } from '#/lib/validate.ts'
import { requireCommander, requireGuardian } from '#/server/auth/middleware.ts'
import * as glitches from '#/server/glitches/glitches.service.ts'
import type { GlitchDetail, GlitchListItem, RunbookStep } from '#/lib/glitch.ts'

export const getGlitches = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .validator(validate(glitchQuerySchema))
  .handler(async ({ data }): Promise<Array<GlitchListItem>> => glitches.getGlitches(data))

export const getGlitch = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .validator(validate(glitchIdInput))
  .handler(async ({ data }): Promise<GlitchDetail> => glitches.getGlitch(data.glitchId))

export const advanceStatus = createServerFn({ method: 'POST' })
  .middleware([requireGuardian])
  .validator(validate(glitchIdInput))
  .handler(async ({ data, context }): Promise<GlitchListItem> =>
    glitches.advanceStatus(context.guardian, data.glitchId),
  )

export const reopenGlitch = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(glitchIdInput))
  .handler(async ({ data, context }): Promise<GlitchListItem> =>
    glitches.reopenGlitch(context.guardian, data.glitchId),
  )

export const assignGlitch = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(assignGlitchInput))
  .handler(async ({ data }): Promise<GlitchListItem> =>
    glitches.assignGlitch(data.glitchId, data.guardianId),
  )

export const mergeGlitch = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(mergeGlitchInput))
  .handler(async ({ data }): Promise<void> =>
    glitches.mergeGlitch(data.glitchId, data.intoGlitchId),
  )

export const setRunbookStep = createServerFn({ method: 'POST' })
  .middleware([requireGuardian])
  .validator(validate(setRunbookStepInput))
  .handler(async ({ data }): Promise<Array<RunbookStep>> =>
    glitches.setRunbookStep(data.glitchId, data.index, data.done),
  )
