import { createServerFn } from '@tanstack/react-start'
import { AppError } from '#/lib/errors.ts'
import { fixtureGlitchDetail, fixtureGlitches, fixtureGuardians } from '#/lib/fixtures.ts'
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

function fixtureItem(glitchId: string): GlitchListItem {
  const item = fixtureGlitches.find((g) => g.glitchId === glitchId)
  if (!item) throw new AppError('NOT_FOUND', `Glitch ${glitchId} not found`)
  return item
}

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
  .handler(async ({ data }): Promise<GlitchListItem> => glitches.reopenGlitch(data.glitchId))

export const assignGlitch = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(assignGlitchInput))
  .handler(async ({ data }): Promise<GlitchListItem> => ({
    ...fixtureItem(data.glitchId),
    assignee: fixtureGuardians.find((g) => g.guardianId === data.guardianId) ?? null,
  }))

export const mergeGlitch = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(mergeGlitchInput))
  .handler(async (): Promise<void> => {})

export const setRunbookStep = createServerFn({ method: 'POST' })
  .middleware([requireGuardian])
  .validator(validate(setRunbookStepInput))
  .handler(async ({ data }): Promise<Array<RunbookStep>> => {
    const runbook = fixtureGlitchDetail(data.glitchId)?.runbook ?? []
    return runbook.map((step, i) => (i === data.index ? { ...step, done: data.done } : step))
  })
