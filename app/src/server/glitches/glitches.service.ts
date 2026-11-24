import { AppError } from '#/lib/errors.ts'
import { publish } from '../events/bus.ts'
import { findGuardianById } from '../guardians/guardians.repository.ts'
import * as repo from './glitches.repository.ts'
import { assertAssigneeOrCommander, canReopen, nextStatus } from './status.ts'
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

/** The glitch's state; NOT_FOUND if missing, CONFLICT if it was merged away. */
export async function requireActiveGlitch(glitchId: string) {
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
  const state = await requireActiveGlitch(glitchId)
  assertAssigneeOrCommander(actor, state.assignedGuardianId)
  const to = nextStatus(state.status)
  if (!to) throw new AppError('CONFLICT', `${glitchId} is already FIXED`)
  // Leaderboard credit goes to the assignee at the moment of the fix (spec); unassigned = nobody.
  const fixed =
    to === 'FIXED' ? { fixedAt: new Date().toISOString(), fixedBy: state.assignedGuardianId } : null
  if (!(await repo.updateGlitchStatus(glitchId, state.status, to, fixed))) {
    throw new AppError('CONFLICT', `${glitchId} changed in the meantime, reload and try again`)
  }
  publish({ type: 'glitch.updated', glitchId })
  return listItem(glitchId)
}

/** FIXED → LEAKED; commander only (enforced by the server function's middleware). */
export async function reopenGlitch(glitchId: string): Promise<GlitchListItem> {
  const state = await requireActiveGlitch(glitchId)
  if (!canReopen(state.status)) {
    throw new AppError(
      'CONFLICT',
      `Only FIXED glitches can be reopened, ${glitchId} is ${state.status}`,
    )
  }
  if (!(await repo.updateGlitchStatus(glitchId, 'FIXED', 'LEAKED', null))) {
    throw new AppError('CONFLICT', `${glitchId} changed in the meantime, reload and try again`)
  }
  publish({ type: 'glitch.updated', glitchId })
  return listItem(glitchId)
}

/** Commander only (middleware). Glitches go to defenders; null clears the assignment. */
export async function assignGlitch(
  glitchId: string,
  guardianId: number | null,
): Promise<GlitchListItem> {
  await requireActiveGlitch(glitchId)
  if (guardianId !== null) {
    const guardian = await findGuardianById(guardianId)
    if (!guardian) throw new AppError('NOT_FOUND', 'Guardian not found')
    if (guardian.role !== 'defender') {
      throw new AppError('VALIDATION', 'Glitches can only be assigned to defenders')
    }
  }
  await repo.setAssignee(glitchId, guardianId)
  publish({ type: 'glitch.updated', glitchId })
  return listItem(glitchId)
}

/** Commander only (middleware). Every echo moves over; the merged glitch leaves the list. */
export async function mergeGlitch(glitchId: string, intoGlitchId: string): Promise<void> {
  await requireActiveGlitch(glitchId)
  await requireActiveGlitch(intoGlitchId)
  await repo.mergeInto(glitchId, intoGlitchId)
  publish({ type: 'glitch.updated', glitchId })
  publish({ type: 'glitch.updated', glitchId: intoGlitchId })
}
