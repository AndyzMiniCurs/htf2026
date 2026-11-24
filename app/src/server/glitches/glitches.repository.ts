import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians } from '#/db/schema.ts'
import { GLITCH_STATUSES } from '#/lib/glitch.ts'
import type { SQL } from 'drizzle-orm'
import type {
  Echo,
  GlitchDetail,
  GlitchListItem,
  GlitchQuery,
  GlitchStatus,
  Location,
  RunbookStep,
} from '#/lib/glitch.ts'

const assignee = alias(guardians, 'assignee')
const reporter = alias(guardians, 'reporter')

const toLocation = (x: number | null, y: number | null): Location | null =>
  x === null || y === null ? null : { x, y }

const listColumns = {
  glitchId: glitches.glitchId,
  status: glitches.status,
  type: glitches.type,
  description: glitches.description,
  timestamp: glitches.timestamp,
  locationX: glitches.locationX,
  locationY: glitches.locationY,
  source: glitches.source,
  runbook: glitches.runbook,
  mergedInto: glitches.mergedInto,
  assigneeId: assignee.guardianId,
  assigneeCodename: assignee.codename,
  assigneeRole: assignee.role,
  echoCount: sql<number>`(select count(*)::int from ${echoes} where ${echoes.glitchId} = ${glitches.glitchId})`,
}

function selectGlitches() {
  return db
    .select(listColumns)
    .from(glitches)
    .leftJoin(assignee, eq(glitches.assignedGuardianId, assignee.guardianId))
}

type ListRow = Awaited<ReturnType<typeof selectGlitches>>[number]

function toListItem(row: ListRow): GlitchListItem {
  return {
    glitchId: row.glitchId,
    status: row.status,
    type: row.type,
    description: row.description,
    timestamp: row.timestamp,
    location: toLocation(row.locationX, row.locationY),
    assignee:
      row.assigneeId !== null && row.assigneeCodename !== null && row.assigneeRole !== null
        ? { guardianId: row.assigneeId, codename: row.assigneeCodename, role: row.assigneeRole }
        : null,
    echoCount: row.echoCount,
    source: row.source,
  }
}

/** `%` and `_` in a search are literal characters, not wildcards. */
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

/** A bare date as upper bound covers that whole day. */
const upperBound = (to: string) => (/^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999Z` : to)

const statusOrder = sql`array_position(array[${sql.join(
  GLITCH_STATUSES.map((s) => sql`${s}`),
  sql`, `,
)}]::text[], ${glitches.status})`

export async function listGlitches(query: GlitchQuery): Promise<Array<GlitchListItem>> {
  const conditions: Array<SQL | undefined> = [isNull(glitches.mergedInto)]
  if (query.q) {
    const pattern = likePattern(query.q)
    conditions.push(or(ilike(glitches.glitchId, pattern), ilike(glitches.description, pattern)))
  }
  if (query.status?.length) conditions.push(inArray(glitches.status, query.status))
  if (query.type?.length) conditions.push(inArray(glitches.type, query.type))
  if (query.from) conditions.push(gte(glitches.timestamp, query.from))
  if (query.to) conditions.push(lte(glitches.timestamp, upperBound(query.to)))

  const order =
    query.sort === 'oldest'
      ? [asc(glitches.timestamp)]
      : query.sort === 'status'
        ? [asc(statusOrder), desc(glitches.timestamp)]
        : [desc(glitches.timestamp)]

  const rows = await selectGlitches()
    .where(and(...conditions))
    .orderBy(...order)
  return rows.map(toListItem)
}

export async function findGlitchListItem(glitchId: string): Promise<GlitchListItem | null> {
  const row = (await selectGlitches().where(eq(glitches.glitchId, glitchId))).at(0)
  return row ? toListItem(row) : null
}

export async function findGlitchDetail(glitchId: string): Promise<GlitchDetail | null> {
  const row = (await selectGlitches().where(eq(glitches.glitchId, glitchId))).at(0)
  if (!row) return null
  const echoRows = await db
    .select({
      echoId: echoes.echoId,
      glitchId: echoes.glitchId,
      description: echoes.description,
      timestamp: echoes.timestamp,
      locationX: echoes.locationX,
      locationY: echoes.locationY,
      groupedByAi: echoes.groupedByAi,
      hasImage: echoes.hasImage,
      reporterId: reporter.guardianId,
      reporterCodename: reporter.codename,
      reporterRole: reporter.role,
    })
    .from(echoes)
    .leftJoin(reporter, eq(echoes.reportingGuardianId, reporter.guardianId))
    .where(eq(echoes.glitchId, glitchId))
    .orderBy(asc(echoes.timestamp), asc(echoes.echoId))

  return {
    ...toListItem(row),
    echoes: echoRows.map((e): Echo => ({
      echoId: e.echoId,
      glitchId: e.glitchId,
      description: e.description,
      timestamp: e.timestamp,
      reporter:
        e.reporterId !== null && e.reporterCodename !== null && e.reporterRole !== null
          ? { guardianId: e.reporterId, codename: e.reporterCodename, role: e.reporterRole }
          : null,
      location: toLocation(e.locationX, e.locationY),
      groupedByAi: e.groupedByAi,
      imageUrl: e.hasImage ? `/api/images/${e.echoId}` : null,
    })),
    runbook: row.runbook?.steps ?? [],
    mergedInto: row.mergedInto,
  }
}

/** What the status rules need to know about a glitch. */
export async function findGlitchState(glitchId: string) {
  const rows = await db
    .select({
      status: glitches.status,
      assignedGuardianId: glitches.assignedGuardianId,
      mergedInto: glitches.mergedInto,
    })
    .from(glitches)
    .where(eq(glitches.glitchId, glitchId))
  return rows.at(0) ?? null
}

/**
 * Moves the glitch from `from` to `to`. Returns false when its status changed in the meantime,
 * so two guardians advancing at once cannot skip a step.
 */
export async function updateGlitchStatus(
  glitchId: string,
  from: GlitchStatus,
  to: GlitchStatus,
  fixed: { fixedAt: string; fixedBy: number | null } | null,
): Promise<boolean> {
  const rows = await db
    .update(glitches)
    .set({ status: to, fixedAt: fixed?.fixedAt ?? null, fixedBy: fixed?.fixedBy ?? null })
    .where(and(eq(glitches.glitchId, glitchId), eq(glitches.status, from)))
    .returning({ glitchId: glitches.glitchId })
  return rows.length > 0
}

/** The most recently fixed glitches, latest fix first. */
export async function listRecentlyFixed(limit: number): Promise<Array<GlitchListItem>> {
  const rows = await selectGlitches()
    .where(and(isNull(glitches.mergedInto), eq(glitches.status, 'FIXED')))
    .orderBy(sql`${glitches.fixedAt} desc nulls last`, desc(glitches.timestamp))
    .limit(limit)
  return rows.map(toListItem)
}

/** Glitches a new echo may belong to: open ones and ones fixed since `fixedSince`, newest first. */
export async function listMatchCandidates(fixedSince: string, limit: number) {
  return db
    .select({
      glitchId: glitches.glitchId,
      description: glitches.description,
      status: glitches.status,
    })
    .from(glitches)
    .where(
      and(
        isNull(glitches.mergedInto),
        or(sql`${glitches.status} <> 'FIXED'`, gte(glitches.fixedAt, fixedSince)),
      ),
    )
    .orderBy(desc(glitches.timestamp))
    .limit(limit)
}

/** Every defender with the types they fixed before and how many open glitches they hold. */
export async function listDefenderLoads() {
  const [defenders, fixes, open] = await Promise.all([
    db
      .select({ guardianId: guardians.guardianId, codename: guardians.codename })
      .from(guardians)
      .where(eq(guardians.role, 'defender'))
      .orderBy(asc(guardians.guardianId)),
    db
      .select({ guardianId: glitches.fixedBy, type: glitches.type, n: sql<number>`count(*)::int` })
      .from(glitches)
      .where(
        and(eq(glitches.status, 'FIXED'), isNull(glitches.mergedInto), isNotNull(glitches.fixedBy)),
      )
      .groupBy(glitches.fixedBy, glitches.type),
    db
      .select({ guardianId: glitches.assignedGuardianId, n: sql<number>`count(*)::int` })
      .from(glitches)
      .where(and(sql`${glitches.status} <> 'FIXED'`, isNull(glitches.mergedInto)))
      .groupBy(glitches.assignedGuardianId),
  ])
  return defenders.map((d) => ({
    ...d,
    fixedByType: Object.fromEntries(
      fixes.filter((f) => f.guardianId === d.guardianId).map((f) => [f.type, f.n]),
    ),
    openCount: open.find((o) => o.guardianId === d.guardianId)?.n ?? 0,
  }))
}

/** Number of non-merged glitches per status. */
export async function countByStatus(): Promise<Record<GlitchStatus, number>> {
  const rows = await db
    .select({ status: glitches.status, count: sql<number>`count(*)::int` })
    .from(glitches)
    .where(isNull(glitches.mergedInto))
    .groupBy(glitches.status)
  const counts = Object.fromEntries(GLITCH_STATUSES.map((s) => [s, 0])) as Record<
    GlitchStatus,
    number
  >
  for (const row of rows) counts[row.status] = row.count
  return counts
}

export async function setAssignee(glitchId: string, guardianId: number | null): Promise<void> {
  await db
    .update(glitches)
    .set({ assignedGuardianId: guardianId })
    .where(eq(glitches.glitchId, glitchId))
}

/** Moves every echo of `glitchId` to `intoGlitchId` and marks it merged, in one transaction. */
export async function mergeInto(glitchId: string, intoGlitchId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(echoes).set({ glitchId: intoGlitchId }).where(eq(echoes.glitchId, glitchId))
    await tx
      .update(glitches)
      .set({ mergedInto: intoGlitchId })
      .where(eq(glitches.glitchId, glitchId))
  })
}

/** What a runbook is built from. */
export async function findRunbookSource(glitchId: string) {
  const rows = await db
    .select({
      type: glitches.type,
      description: glitches.description,
      locationX: glitches.locationX,
      locationY: glitches.locationY,
      sensorId: glitches.sensorId,
    })
    .from(glitches)
    .where(eq(glitches.glitchId, glitchId))
  return rows.at(0) ?? null
}

/** Stores a runbook only if the glitch has none yet, so concurrent first views keep one. */
export async function storeRunbookOnce(
  glitchId: string,
  steps: Array<RunbookStep>,
): Promise<Array<RunbookStep>> {
  await db
    .update(glitches)
    .set({ runbook: { steps } })
    .where(and(eq(glitches.glitchId, glitchId), isNull(glitches.runbook)))
  const rows = await db
    .select({ runbook: glitches.runbook })
    .from(glitches)
    .where(eq(glitches.glitchId, glitchId))
  return rows.at(0)?.runbook?.steps ?? steps
}

/**
 * Ticks one step in a single statement (no read-modify-write race between two guardians).
 * Returns the updated steps, or null when the glitch has no step at that index.
 */
export async function setRunbookStepDone(
  glitchId: string,
  index: number,
  done: boolean,
): Promise<Array<RunbookStep> | null> {
  const rows = await db
    .update(glitches)
    .set({
      runbook: sql`jsonb_set(${glitches.runbook}, ${`{steps,${index},done}`}::text[], to_jsonb(${done}::boolean))`,
    })
    .where(
      and(
        eq(glitches.glitchId, glitchId),
        sql`jsonb_array_length(${glitches.runbook} -> 'steps') > ${index}`,
      ),
    )
    .returning({ runbook: glitches.runbook })
  return rows.at(0)?.runbook?.steps ?? null
}

/** Every fixed, non-merged glitch with the guardian it is credited to (leaderboard). */
export async function listCreditedFixes() {
  return db
    .select({
      guardianId: glitches.fixedBy,
      type: glitches.type,
      createdAt: glitches.timestamp,
      fixedAt: glitches.fixedAt,
    })
    .from(glitches)
    .where(
      and(
        eq(glitches.status, 'FIXED'),
        isNull(glitches.mergedInto),
        isNotNull(glitches.fixedBy),
        isNotNull(glitches.fixedAt),
      ),
    )
}
