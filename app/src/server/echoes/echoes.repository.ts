import { eq, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoImages, echoes, glitchSeq, glitches } from '#/db/schema.ts'
import type { EchoImageMime } from '#/lib/echo.ts'
import type { GlitchSource, GlitchType, Location } from '#/lib/glitch.ts'

export type NewEcho = {
  description: string
  timestamp: string
  reportingGuardianId: number | null
  location: Location | null
  image: { mime: EchoImageMime; bytes: Buffer } | null
}

/** How the new glitch is classified; defaults to an `unknown` glitch from a guardian's echo. */
export type NewGlitchMeta = { type?: GlitchType; source?: GlitchSource; sensorId?: string | null }

/** Next id from `glitch_seq`, formatted `GL-0200`. */
async function nextGlitchId(tx: Pick<typeof db, 'execute'>): Promise<string> {
  const result = await tx.execute<{ n: string }>(sql`select nextval(${glitchSeq.seqName}) as n`)
  return `GL-${String(result.rows.at(0)?.n).padStart(4, '0')}`
}

/** Creates a `LEAKED` glitch from the echo, the echo and its image, all in one transaction. */
export async function insertEchoWithNewGlitch(
  echo: NewEcho,
  meta: NewGlitchMeta = {},
): Promise<{ glitchId: string; echoId: number }> {
  return db.transaction(async (tx) => {
    const glitchId = await nextGlitchId(tx)
    await tx.insert(glitches).values({
      glitchId,
      status: 'LEAKED',
      description: echo.description,
      timestamp: echo.timestamp,
      locationX: echo.location?.x ?? null,
      locationY: echo.location?.y ?? null,
      type: meta.type ?? 'unknown',
      source: meta.source ?? 'echo',
      sensorId: meta.sensorId ?? null,
    })
    const rows = await tx
      .insert(echoes)
      .values({
        glitchId,
        description: echo.description,
        timestamp: echo.timestamp,
        reportingGuardianId: echo.reportingGuardianId,
        locationX: echo.location?.x ?? null,
        locationY: echo.location?.y ?? null,
        hasImage: echo.image !== null,
      })
      .returning({ echoId: echoes.echoId })
    const row = rows.at(0)
    if (!row) throw new Error('Insert returned no echo')
    if (echo.image) await tx.insert(echoImages).values({ echoId: row.echoId, ...echo.image })
    return { glitchId, echoId: row.echoId }
  })
}

export async function findEchoImage(
  echoId: number,
): Promise<{ mime: string; bytes: Buffer } | null> {
  const rows = await db
    .select({ mime: echoImages.mime, bytes: echoImages.bytes })
    .from(echoImages)
    .where(eq(echoImages.echoId, echoId))
  return rows.at(0) ?? null
}

/** Adds an echo (and its image) to an existing glitch in one transaction; returns its id. */
export async function insertEcho(
  glitchId: string,
  echo: Omit<NewEcho, 'image'> & { image?: NewEcho['image']; groupedByAi?: boolean },
): Promise<number> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(echoes)
      .values({
        glitchId,
        description: echo.description,
        timestamp: echo.timestamp,
        reportingGuardianId: echo.reportingGuardianId,
        locationX: echo.location?.x ?? null,
        locationY: echo.location?.y ?? null,
        groupedByAi: echo.groupedByAi ?? false,
        hasImage: Boolean(echo.image),
      })
      .returning({ echoId: echoes.echoId })
    const row = rows.at(0)
    if (!row) throw new Error('Insert returned no echo')
    if (echo.image) await tx.insert(echoImages).values({ echoId: row.echoId, ...echo.image })
    return row.echoId
  })
}

export async function findEcho(echoId: number) {
  const rows = await db
    .select({
      echoId: echoes.echoId,
      glitchId: echoes.glitchId,
      description: echoes.description,
      timestamp: echoes.timestamp,
      locationX: echoes.locationX,
      locationY: echoes.locationY,
    })
    .from(echoes)
    .where(eq(echoes.echoId, echoId))
  return rows.at(0) ?? null
}

/** Re-files an echo under another glitch; a manual move is never "grouped by AI". */
export async function moveEcho(echoId: number, glitchId: string): Promise<void> {
  await db.update(echoes).set({ glitchId, groupedByAi: false }).where(eq(echoes.echoId, echoId))
}

/** Splits an echo out into a new `LEAKED` glitch built from it, in one transaction. */
export async function moveEchoToNewGlitch(echo: {
  echoId: number
  description: string
  timestamp: string
  locationX: number | null
  locationY: number | null
}): Promise<string> {
  return db.transaction(async (tx) => {
    const glitchId = await nextGlitchId(tx)
    await tx.insert(glitches).values({
      glitchId,
      status: 'LEAKED',
      description: echo.description,
      timestamp: echo.timestamp,
      locationX: echo.locationX,
      locationY: echo.locationY,
      source: 'echo',
    })
    await tx
      .update(echoes)
      .set({ glitchId, groupedByAi: false })
      .where(eq(echoes.echoId, echo.echoId))
    return glitchId
  })
}
