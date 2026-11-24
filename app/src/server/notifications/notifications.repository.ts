import { and, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, guardians, notificationPrefs } from '#/db/schema.ts'
import type { NotificationPrefs } from '#/lib/monitoring.ts'

/** Spec: every kind is on until the guardian turns it off. */
export const DEFAULT_PREFS: NotificationPrefs = {
  onAssigned: true,
  onStatus: true,
  onLockdown: true,
}

const prefColumns = {
  guardianId: notificationPrefs.guardianId,
  onAssigned: notificationPrefs.onAssigned,
  onStatus: notificationPrefs.onStatus,
  onLockdown: notificationPrefs.onLockdown,
}

export async function findPrefs(guardianId: number): Promise<NotificationPrefs> {
  const rows = await db
    .select(prefColumns)
    .from(notificationPrefs)
    .where(eq(notificationPrefs.guardianId, guardianId))
  const row = rows.at(0)
  return row
    ? { onAssigned: row.onAssigned, onStatus: row.onStatus, onLockdown: row.onLockdown }
    : DEFAULT_PREFS
}

export async function savePrefs(guardianId: number, prefs: NotificationPrefs): Promise<void> {
  await db
    .insert(notificationPrefs)
    .values({ guardianId, ...prefs })
    .onConflictDoUpdate({ target: notificationPrefs.guardianId, set: prefs })
}

/** Every guardian with their prefs (defaults for those who never saved any). */
export async function listAllPrefs(): Promise<Array<NotificationPrefs & { guardianId: number }>> {
  const rows = await db
    .select({
      guardianId: guardians.guardianId,
      prefId: notificationPrefs.guardianId,
      onAssigned: notificationPrefs.onAssigned,
      onStatus: notificationPrefs.onStatus,
      onLockdown: notificationPrefs.onLockdown,
    })
    .from(guardians)
    .leftJoin(notificationPrefs, eq(notificationPrefs.guardianId, guardians.guardianId))
  return rows.map((row) =>
    row.prefId === null
      ? { guardianId: row.guardianId, ...DEFAULT_PREFS }
      : {
          guardianId: row.guardianId,
          onAssigned: row.onAssigned ?? true,
          onStatus: row.onStatus ?? true,
          onLockdown: row.onLockdown ?? true,
        },
  )
}

/** Guardians who reported an echo on the glitch, except `exceptGuardianId`. */
export async function findReporters(
  glitchId: string,
  exceptGuardianId: number,
): Promise<Array<number>> {
  const rows = await db
    .selectDistinct({ guardianId: echoes.reportingGuardianId })
    .from(echoes)
    .where(
      and(
        eq(echoes.glitchId, glitchId),
        isNotNull(echoes.reportingGuardianId),
        ne(echoes.reportingGuardianId, exceptGuardianId),
      ),
    )
  return rows.flatMap((row) => (row.guardianId === null ? [] : [row.guardianId]))
}

/** Prefs for a set of guardians, defaults filled in. */
export async function findPrefsFor(
  guardianIds: Array<number>,
): Promise<Map<number, NotificationPrefs>> {
  const result = new Map(guardianIds.map((id) => [id, DEFAULT_PREFS]))
  if (guardianIds.length === 0) return result
  const rows = await db
    .select(prefColumns)
    .from(notificationPrefs)
    .where(inArray(notificationPrefs.guardianId, guardianIds))
  for (const row of rows) {
    result.set(row.guardianId, {
      onAssigned: row.onAssigned,
      onStatus: row.onStatus,
      onLockdown: row.onLockdown,
    })
  }
  return result
}
