import type { Role } from '#/lib/guardian.ts'

/** The roster must always keep at least one commander. */
export function wouldRemoveLastCommander(
  currentRole: Role,
  newRole: Role,
  commanderCount: number,
): boolean {
  return currentRole === 'commander' && newRole !== 'commander' && commanderCount <= 1
}
