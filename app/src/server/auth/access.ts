import { AppError } from '#/lib/errors.ts'
import type { Guardian } from '#/lib/guardian.ts'

export function assertGuardian(guardian: Guardian | null): Guardian {
  if (!guardian) throw new AppError('UNAUTHORIZED', 'Please sign in')
  return guardian
}

export function assertCommander(guardian: Guardian | null): Guardian {
  const signedIn = assertGuardian(guardian)
  if (signedIn.role !== 'commander') throw new AppError('FORBIDDEN', 'Only commanders can do this')
  return signedIn
}
