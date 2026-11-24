import { inArray } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { appState } from '#/db/schema.ts'
import type { LockdownState } from './lockdown.ts'

const LOCKDOWN = 'lockdown'
const LOCKDOWN_AUTO = 'lockdown-auto'

export async function getLockdown(): Promise<boolean> {
  return (await getLockdownState()).on
}

export async function getLockdownState(): Promise<LockdownState> {
  const rows = await db
    .select({ key: appState.key, value: appState.value })
    .from(appState)
    .where(inArray(appState.key, [LOCKDOWN, LOCKDOWN_AUTO]))
  const flag = (key: string) => rows.find((row) => row.key === key)?.value === true
  return { on: flag(LOCKDOWN), auto: flag(LOCKDOWN_AUTO) }
}

export async function setLockdownState({ on, auto }: LockdownState): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [key, value] of [
      [LOCKDOWN, on],
      [LOCKDOWN_AUTO, auto],
    ] as const) {
      await tx
        .insert(appState)
        .values({ key, value })
        .onConflictDoUpdate({ target: appState.key, set: { value } })
    }
  })
}
