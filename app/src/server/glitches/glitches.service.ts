import { AppError } from '#/lib/errors.ts'
import * as repo from './glitches.repository.ts'
import { assertCanAdvance, canReopen, nextStatus } from './status.ts'
import type { GlitchDetail, GlitchListItem, GlitchQuery } from '#/lib/glitch.ts'
import type { Guardian } from '#/lib/guardian.ts'

export async function getGlitches(query: GlitchQuery): Promise<Array<GlitchListItem>> {
  return repo.listGlitches(query)
}

export async function getGlitch(glitchId: string): Promise<GlitchDetail> {
  const glitch = await repo.findGlitchDetail(glitchId)
  if (!glitch) throw new AppError('NOT_FOUND', `Glitch ${glitchId} not found`)
  return glitch
}

async function loadState(glitchId: string) {
  const state = await repo.findGlitchState(glitchId)
  if (!state) throw new AppError('NOT_FOUND', `Glitch ${glitchId} not found`)
  if (state.mergedInto) {
    throw new AppError('CONFLICT', `${glitchId} was merged into ${state.mergedInto}`)
  }
  return state
}

async function listItem(glitchId: string): Promise<GlitchListItem> {
  const item = await repo.findGlitchListItem(glitchId)
  if (!item) throw new AppError('NOT_FOUND', `Glitch ${glitchId} not found`)
  return item
}

/** One step forward; the assigned defender or any commander. */
export async function advanceStatus(actor: Guardian, glitchId: string): Promise<GlitchListItem> {
  const state = await loadState(glitchId)
  assertCanAdvance(actor, state.assignedGuardianId)
  const to = nextStatus(state.status)
  if (!to) throw new AppError('CONFLICT', `${glitchId} is already FIXED`)
  // The fix is credited to the assignee (leaderboard), or to whoever closed an unassigned glitch.
  const fixed =
    to === 'FIXED'
      ? { fixedAt: new Date().toISOString(), fixedBy: state.assignedGuardianId ?? actor.guardianId }
      : null
  if (!(await repo.updateGlitchStatus(glitchId, state.status, to, fixed))) {
    throw new AppError('CONFLICT', `${glitchId} changed in the meantime, reload and try again`)
  }
  return listItem(glitchId)
}

/** FIXED → LEAKED; commander only (enforced by the server function's middleware). */
export async function reopenGlitch(glitchId: string): Promise<GlitchListItem> {
  const state = await loadState(glitchId)
  if (!canReopen(state.status)) {
    throw new AppError(
      'CONFLICT',
      `Only FIXED glitches can be reopened, ${glitchId} is ${state.status}`,
    )
  }
  if (!(await repo.updateGlitchStatus(glitchId, 'FIXED', 'LEAKED', null))) {
    throw new AppError('CONFLICT', `${glitchId} changed in the meantime, reload and try again`)
  }
  return listItem(glitchId)
}
