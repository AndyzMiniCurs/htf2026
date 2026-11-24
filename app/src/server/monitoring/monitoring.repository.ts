import { eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { appState } from '#/db/schema.ts'

const LOCKDOWN = 'lockdown'

export async function getLockdown(): Promise<boolean> {
  const rows = await db
    .select({ value: appState.value })
    .from(appState)
    .where(eq(appState.key, LOCKDOWN))
  return rows.at(0)?.value === true
}

export async function setLockdown(on: boolean): Promise<void> {
  await db
    .insert(appState)
    .values({ key: LOCKDOWN, value: on })
    .onConflictDoUpdate({ target: appState.key, set: { value: on } })
}
