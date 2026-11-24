import { AppError } from '#/lib/errors.ts'
import type { CreateGuardianInput, Guardian, SetGuardianRoleInput } from '#/lib/guardian.ts'
import { hashPassword } from '../auth/password.ts'
import * as repo from './guardians.repository.ts'
import { wouldRemoveLastCommander } from './roles.ts'

const UNIQUE_VIOLATION = '23505'

export async function listGuardians(): Promise<Guardian[]> {
  return repo.listGuardians()
}

export async function createGuardian({ codename, password, role }: CreateGuardianInput): Promise<Guardian> {
  try {
    return await repo.insertGuardian({ codename, role, passwordHash: await hashPassword(password) })
  } catch (error) {
    // Drizzle wraps the pg error, so check the cause too.
    const pgCode = (e: unknown) => (e as { code?: unknown } | null)?.code
    if (pgCode(error) === UNIQUE_VIOLATION || pgCode((error as { cause?: unknown }).cause) === UNIQUE_VIOLATION) {
      throw new AppError('CONFLICT', 'Codename taken')
    }
    throw error
  }
}

export async function setGuardianRole({ guardianId, role }: SetGuardianRoleInput): Promise<Guardian> {
  const guardian = await repo.findGuardianById(guardianId)
  if (!guardian) throw new AppError('NOT_FOUND', 'Guardian not found')
  // shortcut: check-then-update is not atomic; two commanders demoting each other at the same instant could both pass. Fine for a demo roster.
  if (wouldRemoveLastCommander(guardian.role, role, await repo.countCommanders())) {
    throw new AppError('CONFLICT', 'Mission control needs at least one commander')
  }
  const updated = await repo.updateGuardianRole(guardianId, role)
  if (!updated) throw new AppError('NOT_FOUND', 'Guardian not found')
  return updated
}
