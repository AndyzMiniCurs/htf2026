import { AppError } from '#/lib/errors.ts'
import { SENSORS, sensorIdSchema } from '#/lib/monitoring.ts'
import { getClassifier } from '../ai/classifier.ts'
import { buildRunbook } from '../ai/runbook.ts'
import { pickAssignee } from '../ai/triage.ts'
import { publish } from '../events/bus.ts'
import { findGuardianById } from '../guardians/guardians.repository.ts'
import { notifyAssigned, notifyStatus } from '../notifications/notifications.service.ts'
import * as repo from './glitches.repository.ts'
import { assertAssigneeOrCommander, canReopen, nextStatus } from './status.ts'
import type {
  GlitchDetail,
  GlitchListItem,
  GlitchQuery,
  GlitchType,
  RunbookStep,
} from '#/lib/glitch.ts'
import type { SensorId } from '#/lib/monitoring.ts'
import type { Guardian } from '#/lib/guardian.ts'

export async function getGlitches(query: GlitchQuery): Promise<Array<GlitchListItem>> {
  return repo.listGlitches(query)
}

export async function getGlitch(glitchId: string): Promise<GlitchDetail> {
  const glitch = await repo.findGlitchDetail(glitchId)
  if (!glitch) throw new AppError('NOT_FOUND', `Glitch ${glitchId} not found`)
  // Built on first view, after the type is known; stored runbooks are never empty.
  if (glitch.runbook.length === 0) glitch.runbook = await createRunbook(glitchId)
  return glitch
}

async function createRunbook(glitchId: string): Promise<Array<RunbookStep>> {
  const source = await repo.findRunbookSource(glitchId)
  if (!source) return []
  const steps = await buildRunbook(
    {
      glitchId,
      type: source.type,
      description: source.description,
      location:
        source.locationX !== null && source.locationY !== null
          ? { x: source.locationX, y: source.locationY }
          : null,
      sensorLabel: isSensorId(source.sensorId) ? SENSORS[source.sensorId].label : null,
    },
    getClassifier(),
  )
  return repo.storeRunbookOnce(glitchId, steps)
}

/** Any signed-in guardian may tick a step (spec); the change shows live for everyone. */
export async function setRunbookStep(
  glitchId: string,
  index: number,
  done: boolean,
): Promise<Array<RunbookStep>> {
  await requireActiveGlitch(glitchId)
  const steps = await repo.setRunbookStepDone(glitchId, index, done)
  if (!steps) throw new AppError('VALIDATION', `${glitchId} has no runbook step ${index + 1}`)
  publish({ type: 'glitch.updated', glitchId })
  return steps
}

const isSensorId = (value: string | null): value is SensorId =>
  sensorIdSchema.safeParse(value).success

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
  await notifyStatus(glitchId, to, actor.guardianId)
  return listItem(glitchId)
}

/** FIXED → LEAKED; commander only (enforced by the server function's middleware). */
export async function reopenGlitch(actor: Guardian, glitchId: string): Promise<GlitchListItem> {
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
  await notifyStatus(glitchId, 'LEAKED', actor.guardianId)
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
  if (guardianId !== null) await notifyAssigned(glitchId, guardianId)
  return listItem(glitchId)
}

/** Gives a new glitch to the best-suited defender (AI) or the least-loaded one (no AI). */
export async function autoAssign(glitchId: string, type: GlitchType): Promise<void> {
  const guardianId = await pickAssignee(getClassifier(), type, await repo.listDefenderLoads())
  if (guardianId !== null) await assignGlitch(glitchId, guardianId)
}

/** Commander only (middleware). Every echo moves over; the merged glitch leaves the list. */
export async function mergeGlitch(glitchId: string, intoGlitchId: string): Promise<void> {
  await requireActiveGlitch(glitchId)
  await requireActiveGlitch(intoGlitchId)
  await repo.mergeInto(glitchId, intoGlitchId)
  publish({ type: 'glitch.updated', glitchId })
  publish({ type: 'glitch.updated', glitchId: intoGlitchId })
}
