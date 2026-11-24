import { sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, echoImages, glitches, glitchSeq } from '#/db/schema.ts'
import type { EchoImageMime } from '#/lib/echo.ts'
import type { Location } from '#/lib/glitch.ts'

export type NewEcho = {
  description: string
  timestamp: string
  reportingGuardianId: number | null
  location: Location | null
  image: { mime: EchoImageMime; bytes: Buffer } | null
}

/** Next id from `glitch_seq`, formatted `GL-0200`. */
async function nextGlitchId(tx: Pick<typeof db, 'execute'>): Promise<string> {
  const result = await tx.execute<{ n: string }>(sql`select nextval(${glitchSeq.seqName}) as n`)
  return `GL-${String(result.rows[0]?.n).padStart(4, '0')}`
}

/** Creates a `LEAKED` glitch from the echo, the echo and its image, all in one transaction. */
export async function insertEchoWithNewGlitch(echo: NewEcho): Promise<{ glitchId: string; echoId: number }> {
  return db.transaction(async (tx) => {
    const glitchId = await nextGlitchId(tx)
    await tx.insert(glitches).values({
      glitchId,
      status: 'LEAKED',
      description: echo.description,
      timestamp: echo.timestamp,
      locationX: echo.location?.x ?? null,
      locationY: echo.location?.y ?? null,
      source: 'echo',
    })
    const [row] = await tx
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
    if (!row) throw new Error('Insert returned no echo')
    if (echo.image) await tx.insert(echoImages).values({ echoId: row.echoId, ...echo.image })
    return { glitchId, echoId: row.echoId }
  })
}
