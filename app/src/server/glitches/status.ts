import { AppError } from '#/lib/errors.ts'
import { GLITCH_STATUSES } from '#/lib/glitch.ts'
import type { GlitchStatus } from '#/lib/glitch.ts'
import type { Guardian } from '#/lib/guardian.ts'

/** The only forward move: one step along LEAKED → ASSESSING → CONTAINING → FIXED. */
export function nextStatus(current: GlitchStatus): GlitchStatus | null {
  return GLITCH_STATUSES[GLITCH_STATUSES.indexOf(current) + 1] ?? null
}

/** Only a FIXED glitch can go back, and only to LEAKED. */
export function canReopen(current: GlitchStatus): boolean {
  return current === 'FIXED'
}

/** Advancing the status and posting updates belong to the assigned defender or any commander. */
export function assertAssigneeOrCommander(
  guardian: Guardian,
  assignedGuardianId: number | null,
): void {
  if (guardian.role === 'commander' || guardian.guardianId === assignedGuardianId) return
  throw new AppError('FORBIDDEN', 'Only the assigned defender or a commander can do this')
}
