import { AppError } from '#/lib/errors.ts'
import type { Guardian, LoginInput } from '#/lib/guardian.ts'
import { findCredentials } from '../guardians/guardians.repository.ts'
import { hashPassword, verifyPassword } from './password.ts'
import { currentGuardian, endSession, startSession } from './session.ts'

// Verified against when the codename is unknown, so both failures take the same time.
const dummyHash = hashPassword('not-a-real-password')

export async function login({ codename, password }: LoginInput): Promise<Guardian> {
  const credentials = await findCredentials(codename)
  const valid = await verifyPassword(password, credentials?.passwordHash ?? (await dummyHash))
  if (!credentials || !valid) throw new AppError('UNAUTHORIZED', 'Invalid codename or password')
  await startSession(credentials.guardianId)
  const { passwordHash: _, ...guardian } = credentials
  return guardian
}

export async function logout(): Promise<void> {
  await endSession()
}

export async function getMe(): Promise<Guardian | null> {
  return currentGuardian()
}
