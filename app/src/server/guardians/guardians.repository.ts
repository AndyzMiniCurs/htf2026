import { asc, eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardians } from '#/db/schema.ts'
import type { Guardian, Role } from '#/lib/guardian.ts'

/** Public columns only; the password hash never leaves this module except via `findCredentials`. */
const publicColumns = {
  guardianId: guardians.guardianId,
  codename: guardians.codename,
  role: guardians.role,
}

export async function findCredentials(codename: string) {
  const rows = await db
    .select({ ...publicColumns, passwordHash: guardians.passwordHash })
    .from(guardians)
    .where(eq(guardians.codename, codename))
  return rows.at(0) ?? null
}

export async function findGuardianById(guardianId: number): Promise<Guardian | null> {
  const rows = await db
    .select(publicColumns)
    .from(guardians)
    .where(eq(guardians.guardianId, guardianId))
  return rows.at(0) ?? null
}

export async function listGuardians(): Promise<Array<Guardian>> {
  return db.select(publicColumns).from(guardians).orderBy(asc(guardians.codename))
}

export async function insertGuardian(values: {
  codename: string
  role: Role
  passwordHash: string
}) {
  const rows = await db.insert(guardians).values(values).returning(publicColumns)
  const row = rows.at(0)
  if (!row) throw new Error('Insert returned no guardian')
  return row
}

export async function countCommanders(): Promise<number> {
  return db.$count(guardians, eq(guardians.role, 'commander'))
}

export async function updateGuardianRole(guardianId: number, role: Role): Promise<Guardian | null> {
  const rows = await db
    .update(guardians)
    .set({ role })
    .where(eq(guardians.guardianId, guardianId))
    .returning(publicColumns)
  return rows.at(0) ?? null
}
