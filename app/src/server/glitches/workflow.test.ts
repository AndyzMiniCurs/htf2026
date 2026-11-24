import { eq, inArray, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians } from '#/db/schema.ts'
import { addGlitchUpdate, moveEcho, reportEcho } from '../echoes/echoes.service.ts'
import { assignGlitch, getGlitch, getGlitches, mergeGlitch } from './glitches.service.ts'
import type { Guardian } from '#/lib/guardian.ts'

// Integration test of the glitch workflow against the compose Postgres; skipped when it is down.
const reachable = await db.execute(sql`select 1`).then(
  () => true,
  () => false,
)

describe.skipIf(!reachable)('glitch workflow (Postgres)', () => {
  const token = `wf${Date.now().toString(36)}`
  const created: Array<string> = []
  let defender: Guardian
  let otherDefender: Guardian
  let commander: Guardian

  const addGuardian = async (suffix: string, role: Guardian['role']) => {
    const rows = await db
      .insert(guardians)
      .values({ codename: `${token}-${suffix}`, role, passwordHash: 'x' })
      .returning({
        guardianId: guardians.guardianId,
        codename: guardians.codename,
        role: guardians.role,
      })
    const row = rows.at(0)
    if (!row) throw new Error('no guardian')
    return row
  }

  const report = async (description: string) => {
    const result = await reportEcho(defender, { description, location: null, image: null })
    created.push(result.glitchId)
    return result
  }

  beforeAll(async () => {
    defender = await addGuardian('nova', 'defender')
    otherDefender = await addGuardian('orion', 'defender')
    commander = await addGuardian('aegis', 'commander')
  })

  afterAll(async () => {
    if (created.length) await db.delete(glitches).where(inArray(glitches.glitchId, created))
    await db
      .delete(guardians)
      .where(
        inArray(guardians.guardianId, [
          defender.guardianId,
          otherDefender.guardianId,
          commander.guardianId,
        ]),
      )
    await db.$client.end()
  })

  it('assigns a glitch to a defender and refuses commanders as assignees', async () => {
    const { glitchId } = await report(`${token} assign me`)

    expect((await assignGlitch(glitchId, defender.guardianId)).assignee?.guardianId).toBe(
      defender.guardianId,
    )
    await expect(assignGlitch(glitchId, commander.guardianId)).rejects.toMatchObject({
      code: 'VALIDATION',
    })
    expect((await assignGlitch(glitchId, null)).assignee).toBeNull()
  })

  it('lets the assignee or a commander post updates, nobody else', async () => {
    const { glitchId } = await report(`${token} needs updates`)
    await assignGlitch(glitchId, defender.guardianId)

    const update = await addGlitchUpdate(defender, { glitchId, description: 'Wards are holding' })
    expect(update).toMatchObject({ autoClosed: false, echo: { glitchId, reporter: defender } })
    await addGlitchUpdate(commander, { glitchId, description: 'Reinforcements sent' })
    await expect(
      addGlitchUpdate(otherDefender, { glitchId, description: 'Not my glitch' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    expect((await getGlitch(glitchId)).echoes.map((e) => e.description)).toEqual([
      `${token} needs updates`,
      'Wards are holding',
      'Reinforcements sent',
    ])
  })

  it('moving an echo out creates a new LEAKED glitch from it', async () => {
    const { glitchId } = await report(`${token} grouped wrongly`)
    const extra = await addGlitchUpdate(commander, { glitchId, description: `${token} unrelated` })

    const moved = await moveEcho(extra.echo.echoId, null)
    created.push(moved.glitchId)

    expect(moved.glitchId).not.toBe(glitchId)
    const split = await getGlitch(moved.glitchId)
    expect(split).toMatchObject({ status: 'LEAKED', description: `${token} unrelated` })
    expect(split.echoes.map((e) => e.echoId)).toEqual([extra.echo.echoId])
    expect((await getGlitch(glitchId)).echoes).toHaveLength(1)
  })

  it('merging moves every echo and hides the source glitch from the list', async () => {
    const source = await report(`${token} merge source`)
    await addGlitchUpdate(commander, { glitchId: source.glitchId, description: 'second echo' })
    const target = await report(`${token} merge target`)

    await mergeGlitch(source.glitchId, target.glitchId)

    const merged = await getGlitch(target.glitchId)
    expect(merged.echoes).toHaveLength(3)
    expect(merged.echoCount).toBe(3)
    expect((await getGlitch(source.glitchId)).mergedInto).toBe(target.glitchId)
    const listed = (await getGlitches({ q: token })).map((g) => g.glitchId)
    expect(listed).toContain(target.glitchId)
    expect(listed).not.toContain(source.glitchId)
    const left = await db.$count(echoes, eq(echoes.glitchId, source.glitchId))
    expect(left).toBe(0)
  })

  it('refuses to merge into or out of an already merged glitch', async () => {
    const a = await report(`${token} merged a`)
    const b = await report(`${token} merged b`)
    const c = await report(`${token} merged c`)
    await mergeGlitch(a.glitchId, b.glitchId)

    await expect(mergeGlitch(a.glitchId, c.glitchId)).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(mergeGlitch(c.glitchId, a.glitchId)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})
