import { like, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians } from '#/db/schema.ts'
import { findGlitchDetail, listGlitches } from './glitches.repository.ts'

// Integration test against the compose Postgres (`docker compose up -d db`); skipped when it is down.
const reachable = await db.execute(sql`select 1`).then(
  () => true,
  () => false,
)

const token = `zq${Date.now().toString(36)}`
const ids = (items: Array<{ glitchId: string }>) => items.map((g) => g.glitchId)

describe.skipIf(!reachable)('glitch repository (Postgres)', () => {
  let guardianId = 0

  async function cleanup() {
    await db.delete(glitches).where(like(glitches.glitchId, 'GL-97%'))
    await db.delete(guardians).where(like(guardians.codename, 'test-%'))
  }

  beforeAll(async () => {
    await cleanup()
    const inserted = await db
      .insert(guardians)
      .values({ codename: `test-${token}`, role: 'defender', passwordHash: 'x' })
      .returning()
    guardianId = inserted.at(0)?.guardianId ?? 0
    await db.insert(glitches).values([
      {
        glitchId: 'GL-9701',
        status: 'LEAKED',
        type: 'time-anomaly',
        description: `${token} time loop`,
        timestamp: '2026-01-01T10:00:00Z',
        assignedGuardianId: guardianId,
        locationX: 40,
        locationY: 60,
      },
      {
        glitchId: 'GL-9702',
        status: 'FIXED',
        type: 'portal',
        description: `${token}-portal flicker`,
        timestamp: '2026-01-02T10:00:00Z',
      },
      {
        glitchId: 'GL-9703',
        status: 'ASSESSING',
        type: 'portal',
        description: `${token}-portal storm`,
        timestamp: '2026-01-03T23:30:00Z',
      },
    ])
    await db.insert(glitches).values({
      glitchId: 'GL-9704',
      status: 'LEAKED',
      type: 'creature',
      description: `${token} merged away`,
      timestamp: '2026-01-04T10:00:00Z',
      mergedInto: 'GL-9701',
    })
    await db.insert(echoes).values([
      {
        glitchId: 'GL-9701',
        description: 'second report',
        timestamp: '2026-01-01T10:05:00Z',
        reportingGuardianId: guardianId,
        hasImage: true,
        groupedByAi: true,
      },
      {
        glitchId: 'GL-9701',
        description: 'first report',
        timestamp: '2026-01-01T10:00:00Z',
        reportingGuardianId: guardianId,
        locationX: 40,
        locationY: 60,
      },
      { glitchId: 'GL-9701', description: 'system report', timestamp: '2026-01-01T10:10:00Z' },
    ])
  })

  afterAll(async () => {
    await cleanup()
    await db.$client.end()
  })

  it('lists non-merged glitches newest first', async () => {
    expect(ids(await listGlitches({ q: token }))).toEqual(['GL-9703', 'GL-9702', 'GL-9701'])
  })

  it('searches id and description case-insensitively', async () => {
    expect(ids(await listGlitches({ q: `${token.toUpperCase()}-PORTAL` }))).toEqual([
      'GL-9703',
      'GL-9702',
    ])
    expect(ids(await listGlitches({ q: 'gl-9702' }))).toEqual(['GL-9702'])
  })

  it('treats % and _ in a search as literal characters', async () => {
    expect(await listGlitches({ q: `${token}%` })).toEqual([])
  })

  it('filters on status and type', async () => {
    expect(ids(await listGlitches({ q: token, status: ['LEAKED'] }))).toEqual(['GL-9701'])
    expect(ids(await listGlitches({ q: token, status: ['LEAKED', 'FIXED'] }))).toEqual([
      'GL-9702',
      'GL-9701',
    ])
    expect(ids(await listGlitches({ q: token, type: ['portal'] }))).toEqual(['GL-9703', 'GL-9702'])
  })

  it('filters on a date range where a bare end date covers the whole day', async () => {
    expect(ids(await listGlitches({ q: token, from: '2026-01-02', to: '2026-01-03' }))).toEqual([
      'GL-9703',
      'GL-9702',
    ])
    expect(ids(await listGlitches({ q: token, status: ['LEAKED'], to: '2026-01-01' }))).toEqual([
      'GL-9701',
    ])
  })

  it('sorts oldest first or by lifecycle status', async () => {
    expect(ids(await listGlitches({ q: token, sort: 'oldest' }))).toEqual([
      'GL-9701',
      'GL-9702',
      'GL-9703',
    ])
    expect(ids(await listGlitches({ q: token, sort: 'status' }))).toEqual([
      'GL-9701',
      'GL-9703',
      'GL-9702',
    ])
  })

  it('maps assignee, location and echo count onto list items', async () => {
    const [item] = await listGlitches({ q: 'GL-9701' })
    expect(item).toMatchObject({
      assignee: { guardianId, codename: `test-${token}`, role: 'defender' },
      location: { x: 40, y: 60 },
      echoCount: 3,
      source: 'echo',
    })
  })

  it('returns the detail with echoes oldest first, reporter and image url', async () => {
    const detail = await findGlitchDetail('GL-9701')
    expect(detail?.echoes.map((e) => e.description)).toEqual([
      'first report',
      'second report',
      'system report',
    ])
    expect(detail?.echoes[0]?.reporter?.codename).toBe(`test-${token}`)
    expect(detail?.echoes[1]).toMatchObject({
      groupedByAi: true,
      imageUrl: `/api/images/${detail?.echoes[1]?.echoId}`,
    })
    expect(detail?.echoes[2]?.reporter).toBeNull()
    expect(detail?.runbook).toEqual([])
    expect(detail?.mergedInto).toBeNull()
  })

  it('still finds a merged glitch by id, pointing at its target', async () => {
    expect((await findGlitchDetail('GL-9704'))?.mergedInto).toBe('GL-9701')
  })

  it('returns null for an unknown id', async () => {
    expect(await findGlitchDetail('GL-9799')).toBeNull()
  })
})
