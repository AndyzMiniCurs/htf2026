import { eq, inArray, like, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '#/db/index.ts'
import { echoImages, echoes, glitches, guardians } from '#/db/schema.ts'
import { reportEcho } from './echoes.service.ts'
import type { Guardian } from '#/lib/guardian.ts'

// Integration test of the echo pipeline against the compose Postgres; skipped when it is down.
const reachable = await db.execute(sql`select 1`).then(
  () => true,
  () => false,
)

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])

describe.skipIf(!reachable)('reportEcho (Postgres)', () => {
  let reporter: Guardian
  const created: Array<string> = []

  beforeAll(async () => {
    await db.delete(guardians).where(like(guardians.codename, 'echotest-%'))
    const rows = await db
      .insert(guardians)
      .values({
        codename: `echotest-${Date.now().toString(36)}`,
        role: 'defender',
        passwordHash: 'x',
      })
      .returning({
        guardianId: guardians.guardianId,
        codename: guardians.codename,
        role: guardians.role,
      })
    const row = rows.at(0)
    if (!row) throw new Error('no guardian')
    reporter = row
  })

  afterAll(async () => {
    if (created.length) await db.delete(glitches).where(inArray(glitches.glitchId, created))
    await db.delete(guardians).where(eq(guardians.guardianId, reporter.guardianId))
    await db.$client.end()
  })

  it('creates a LEAKED glitch with a GL- id and links the echo, with server time and reporter', async () => {
    const before = new Date().toISOString()
    const result = await reportEcho(reporter, {
      description: 'Time loop near the clock tower',
      location: { x: 40, y: 60 },
      image: null,
    })
    created.push(result.glitchId)

    expect(result.outcome).toBe('created')
    expect(result.glitchId).toMatch(/^GL-\d{4,}$/)
    expect(result.echo).toMatchObject({
      glitchId: result.glitchId,
      reporter,
      imageUrl: null,
      groupedByAi: false,
    })
    expect(result.echo.timestamp >= before).toBe(true)

    const [glitch] = await db.select().from(glitches).where(eq(glitches.glitchId, result.glitchId))
    expect(glitch).toMatchObject({
      status: 'LEAKED',
      type: 'unknown',
      description: 'Time loop near the clock tower',
      timestamp: result.echo.timestamp,
      locationX: 40,
      locationY: 60,
      source: 'echo',
    })
    const [echo] = await db.select().from(echoes).where(eq(echoes.glitchId, result.glitchId))
    expect(echo).toMatchObject({
      reportingGuardianId: reporter.guardianId,
      locationX: 40,
      hasImage: false,
    })
  })

  it('gives every new glitch its own id', async () => {
    const a = await reportEcho(reporter, { description: 'first', location: null, image: null })
    const b = await reportEcho(reporter, { description: 'second', location: null, image: null })
    created.push(a.glitchId, b.glitchId)
    expect(a.glitchId).not.toBe(b.glitchId)
  })

  it('stores a valid image with its detected mime type', async () => {
    const result = await reportEcho(reporter, {
      description: 'Portal flicker, photo attached',
      location: null,
      image: new File([png], 'portal.webp', { type: 'image/webp' }),
    })
    created.push(result.glitchId)

    expect(result.echo.imageUrl).toBe(`/api/images/${result.echo.echoId}`)
    const image = (
      await db.select().from(echoImages).where(eq(echoImages.echoId, result.echo.echoId))
    ).at(0)
    expect(image?.mime).toBe('image/png')
    expect(Uint8Array.from(image?.bytes ?? [])).toEqual(png)
  })

  it('stores nothing when the image is rejected', async () => {
    const count = () => db.$count(glitches)
    const before = await count()
    await expect(
      reportEcho(reporter, {
        description: 'Report with a PDF',
        location: null,
        image: new File([new TextEncoder().encode('%PDF-1.7')], 'report.png', {
          type: 'image/png',
        }),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
    expect(await count()).toBe(before)
  })
})
