import { asc, isNull } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { glitchHistory, glitches } from '#/db/schema.ts'
import type { GlitchType } from '#/lib/glitch.ts'

export type IncidentRecord = {
  openedAt: string
  type: GlitchType
  fixedAt: string | null
  fixedBy: number | null
}

/** The synthetic history, oldest first. */
export async function listHistory(): Promise<Array<IncidentRecord>> {
  return db
    .select({
      openedAt: glitchHistory.openedAt,
      type: glitchHistory.type,
      fixedAt: glitchHistory.fixedAt,
      fixedBy: glitchHistory.fixedBy,
    })
    .from(glitchHistory)
    .orderBy(asc(glitchHistory.openedAt))
}

/** Every live glitch that is not merged away: open ones and sealed ones. */
export async function listLiveGlitches(): Promise<Array<IncidentRecord>> {
  return db
    .select({
      openedAt: glitches.timestamp,
      type: glitches.type,
      fixedAt: glitches.fixedAt,
      fixedBy: glitches.fixedBy,
    })
    .from(glitches)
    .where(isNull(glitches.mergedInto))
    .orderBy(asc(glitches.timestamp))
}
