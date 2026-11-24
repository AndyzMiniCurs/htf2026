import { and, eq, gt, lte } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardians, sessions } from '#/db/schema.ts'
import type { Guardian } from '#/lib/guardian.ts'

export async function insertSession(values: {
  tokenHash: string
  guardianId: number
  expiresAt: string
}) {
  await db.insert(sessions).values(values)
}

export async function findGuardianBySession(
  tokenHash: string,
  now: string,
): Promise<Guardian | null> {
  const rows = await db
    .select({
      guardianId: guardians.guardianId,
      codename: guardians.codename,
      role: guardians.role,
    })
    .from(sessions)
    .innerJoin(guardians, eq(sessions.guardianId, guardians.guardianId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
  return rows.at(0) ?? null
}

export async function deleteSession(tokenHash: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
}

export async function deleteExpiredSessions(now: string) {
  await db.delete(sessions).where(lte(sessions.expiresAt, now))
}
