import { eq, inArray, sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { db } from '#/db/index.ts'
import { echoImages, echoes, glitches, guardians } from '#/db/schema.ts'
import { nullClassifier } from '../ai/null.classifier.ts'
import { NOT_USEFUL_MESSAGE } from '../ai/triage.ts'
import { addGlitchUpdate, reportEcho } from './echoes.service.ts'
import type * as ClassifierModule from '../ai/classifier.ts'
import type { Classifier } from '../ai/classifier.ts'
import type { Guardian } from '#/lib/guardian.ts'

// The pipeline reads the classifier through getClassifier(); tests swap in fakes per case.
const ai = vi.hoisted(() => ({ current: undefined as Classifier | undefined }))
vi.mock('../ai/classifier.ts', async (original) => ({
  ...(await original<typeof ClassifierModule>()),
  getClassifier: () => ai.current ?? nullClassifier,
}))

/** `choose` that gives 0.85 to the option starting with `prefix` and spreads the rest. */
const picking =
  (prefix: string): Classifier['choose'] =>
  async (_q, options) =>
    options
      .map((option) => ({
        option,
        probability: option.startsWith(prefix) ? 0.85 : 0.15 / (options.length - 1),
      }))
      .sort((a, b) => b.probability - a.probability)

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

  afterEach(() => {
    ai.current = undefined
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
    // Count only this test's reporter: other writers (dev server, sensor simulator) may run in parallel.
    const count = () => db.$count(echoes, eq(echoes.reportingGuardianId, reporter.guardianId))
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

  it('rejects spam with the spec message when the AI is on, storing nothing', async () => {
    ai.current = {
      ...nullClassifier,
      yesNo: async (q) =>
        q.startsWith('Is this illegal') ? 0 : q.includes('junk rather') ? 0.95 : 0.05,
    }
    const count = () => db.$count(echoes, eq(echoes.reportingGuardianId, reporter.guardianId))
    const before = await count()
    await expect(
      reportEcho(reporter, {
        description: 'asdfasdf buy cheap potions',
        location: null,
        image: null,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION', message: NOT_USEFUL_MESSAGE })
    expect(await count()).toBe(before)
  })

  it('types a new glitch with the AI', async () => {
    ai.current = { ...nullClassifier, choose: picking('time-anomaly') }
    const result = await reportEcho(reporter, {
      description: 'Time loop detected near the clock tower',
      location: null,
      image: null,
    })
    created.push(result.glitchId)
    const [glitch] = await db.select().from(glitches).where(eq(glitches.glitchId, result.glitchId))
    expect(glitch).toMatchObject({ type: 'time-anomaly' })
  })

  it('assigns a new glitch to a defender, the least-loaded one without AI', async () => {
    const result = await reportEcho(reporter, {
      description: 'Unassigned so far',
      location: null,
      image: null,
    })
    created.push(result.glitchId)
    const [glitch] = await db.select().from(glitches).where(eq(glitches.glitchId, result.glitchId))
    expect(glitch).toMatchObject({ assignedGuardianId: expect.any(Number) })
  })

  it('groups a duplicate under the open glitch, marked grouped by AI', async () => {
    const first = await reportEcho(reporter, {
      description: 'Clock tower time loop',
      location: null,
      image: null,
    })
    created.push(first.glitchId)
    ai.current = { ...nullClassifier, choose: picking(`${first.glitchId}:`) }

    const second = await reportEcho(reporter, {
      description: 'the clock tower keeps repeating the same minute',
      location: null,
      image: null,
    })

    expect(second).toMatchObject({ glitchId: first.glitchId, outcome: 'grouped' })
    expect(second.echo.groupedByAi).toBe(true)
    const [echo] = await db.select().from(echoes).where(eq(echoes.echoId, second.echo.echoId))
    expect(echo).toMatchObject({ glitchId: first.glitchId, groupedByAi: true })
  })

  it('reopens a recently fixed glitch as LEAKED when a new echo matches it', async () => {
    const first = await reportEcho(reporter, {
      description: 'Portal tear at the market',
      location: null,
      image: null,
    })
    created.push(first.glitchId)
    await db
      .update(glitches)
      .set({ status: 'FIXED', fixedAt: new Date().toISOString() })
      .where(eq(glitches.glitchId, first.glitchId))
    ai.current = { ...nullClassifier, choose: picking(`${first.glitchId}:`) }

    const again = await reportEcho(reporter, {
      description: 'The market portal is back',
      location: null,
      image: null,
    })

    expect(again).toMatchObject({ glitchId: first.glitchId, outcome: 'reopened' })
    const [glitch] = await db.select().from(glitches).where(eq(glitches.glitchId, first.glitchId))
    expect(glitch).toMatchObject({ status: 'LEAKED', fixedAt: null })
  })

  it('auto-closes a glitch when an update says it is solved, crediting the assignee', async () => {
    const { glitchId } = await reportEcho(reporter, {
      description: 'Portal flicker',
      location: null,
      image: null,
    })
    created.push(glitchId)
    await db
      .update(glitches)
      .set({ status: 'CONTAINING', assignedGuardianId: reporter.guardianId })
      .where(eq(glitches.glitchId, glitchId))
    ai.current = { ...nullClassifier, yesNo: async (q) => (q.includes('all clear') ? 0.9 : 0.4) }

    const stillOpen = await addGlitchUpdate(reporter, { glitchId, description: 'still unstable' })
    expect(stillOpen.autoClosed).toBe(false)
    const closed = await addGlitchUpdate(reporter, {
      glitchId,
      description: 'all clear, the portal is stable again',
    })

    expect(closed.autoClosed).toBe(true)
    const [glitch] = await db.select().from(glitches).where(eq(glitches.glitchId, glitchId))
    expect(glitch).toMatchObject({ status: 'FIXED', fixedBy: reporter.guardianId })
  })
})
