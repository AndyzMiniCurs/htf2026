import { AppError } from '#/lib/errors.ts'
import { getClassifier } from '../ai/classifier.ts'
import { classifyType, findMatchingGlitch, moderate } from '../ai/triage.ts'
import { publish } from '../events/bus.ts'
import { listMatchCandidates, updateGlitchStatus } from '../glitches/glitches.repository.ts'
import { autoAssign, requireActiveGlitch } from '../glitches/glitches.service.ts'
import { notifyStatus } from '../notifications/notifications.service.ts'
import { assertAssigneeOrCommander } from '../glitches/status.ts'
import * as repo from './echoes.repository.ts'
import { readEchoImage } from './image.ts'
import type {
  AddGlitchUpdateInput,
  AddGlitchUpdateResult,
  ReportEchoInput,
  ReportEchoResult,
} from '#/lib/echo.ts'
import type { GlitchType, Location } from '#/lib/glitch.ts'
import type { Guardian } from '#/lib/guardian.ts'
import type { SensorId } from '#/lib/monitoring.ts'

const REOPEN_WINDOW_MS = 24 * 60 * 60 * 1000
// shortcut: only the newest candidates go to the AI, raise or pre-filter by location if the realm grows.
const MATCH_CANDIDATES = 30

/**
 * Echo intake (design D7). The AI moderates, matches the echo to an open or recently fixed
 * glitch, and types it, all at once before anything is stored. Without AI every echo creates
 * a new `unknown` glitch.
 */
export async function reportEcho(
  reporter: Guardian,
  input: ReportEchoInput,
): Promise<ReportEchoResult> {
  const image = input.image ? await readEchoImage(input.image) : null
  const ai = getClassifier()
  const fixedSince = new Date(Date.now() - REOPEN_WINDOW_MS).toISOString()
  const candidates = await listMatchCandidates(fixedSince, MATCH_CANDIDATES)
  const [, matchId, type] = await Promise.all([
    moderate(ai, input.description),
    findMatchingGlitch(ai, input.description, candidates),
    classifyType(ai, input.description),
  ])

  const timestamp = new Date().toISOString()
  const echo = {
    description: input.description,
    timestamp,
    reportingGuardianId: reporter.guardianId,
    location: input.location,
    image,
  }
  const result = (
    glitchId: string,
    echoId: number,
    outcome: ReportEchoResult['outcome'],
  ): ReportEchoResult => {
    publish({ type: 'echo.created', echoId, glitchId })
    return {
      echo: {
        echoId,
        glitchId,
        description: input.description,
        timestamp,
        reporter,
        location: input.location,
        groupedByAi: outcome !== 'created',
        imageUrl: image ? `/api/images/${echoId}` : null,
      },
      glitchId,
      outcome,
    }
  }

  const match = candidates.find((c) => c.glitchId === matchId)
  if (!match) {
    const created = await repo.insertEchoWithNewGlitch(echo, { type })
    publish({ type: 'glitch.created', glitchId: created.glitchId })
    const response = result(created.glitchId, created.echoId, 'created')
    await autoAssign(created.glitchId, type)
    return response
  }

  const { glitchId } = match
  // The echo is stored first, so losing a race with a manual reopen never loses it.
  const echoId = await repo.insertEcho(glitchId, { ...echo, groupedByAi: true })
  const reopened =
    match.status === 'FIXED' && (await updateGlitchStatus(glitchId, 'FIXED', 'LEAKED', null))
  publish({ type: 'glitch.updated', glitchId })
  if (reopened) await notifyStatus(glitchId, 'LEAKED', reporter.guardianId)
  return result(glitchId, echoId, reopened ? 'reopened' : 'grouped')
}

/** A glitch the system raises itself (sensor anomaly), with a system echo explaining why. */
export async function reportPrediction(prediction: {
  description: string
  location: Location
  type: GlitchType
  sensorId: SensorId
}): Promise<{ glitchId: string; echoId: number }> {
  const created = await repo.insertEchoWithNewGlitch(
    {
      description: prediction.description,
      timestamp: new Date().toISOString(),
      reportingGuardianId: null,
      location: prediction.location,
      image: null,
    },
    { type: prediction.type, source: 'prediction', sensorId: prediction.sensorId },
  )
  publish({ type: 'glitch.created', glitchId: created.glitchId })
  publish({ type: 'echo.created', ...created })
  await autoAssign(created.glitchId, prediction.type)
  return created
}

export async function getEchoImage(echoId: number) {
  return repo.findEchoImage(echoId)
}

/** A progress echo on an existing glitch: its assignee or a commander, no duplicate detection. */
export async function addGlitchUpdate(
  author: Guardian,
  { glitchId, description }: AddGlitchUpdateInput,
): Promise<AddGlitchUpdateResult> {
  const state = await requireActiveGlitch(glitchId)
  assertAssigneeOrCommander(author, state.assignedGuardianId)
  const timestamp = new Date().toISOString()
  const echoId = await repo.insertEcho(glitchId, {
    description,
    timestamp,
    reportingGuardianId: author.guardianId,
    location: null,
  })
  publish({ type: 'echo.created', echoId, glitchId })
  return {
    echo: {
      echoId,
      glitchId,
      description,
      timestamp,
      reporter: author,
      location: null,
      groupedByAi: false,
      imageUrl: null,
    },
    autoClosed: false,
  }
}

/**
 * Commander only (middleware): re-files an echo under another glitch, or with `toGlitchId`
 * null splits it out into a new `LEAKED` glitch (overriding a wrong AI grouping).
 */
export async function moveEcho(
  echoId: number,
  toGlitchId: string | null,
): Promise<{ glitchId: string }> {
  const echo = await repo.findEcho(echoId)
  if (!echo) throw new AppError('NOT_FOUND', 'Echo not found')
  if (toGlitchId === echo.glitchId) {
    throw new AppError('CONFLICT', `The echo is already in ${toGlitchId}`)
  }
  if (toGlitchId === null) {
    const glitchId = await repo.moveEchoToNewGlitch(echo)
    publish({ type: 'glitch.created', glitchId })
    publish({ type: 'glitch.updated', glitchId: echo.glitchId })
    return { glitchId }
  }
  await requireActiveGlitch(toGlitchId)
  await repo.moveEcho(echoId, toGlitchId)
  publish({ type: 'glitch.updated', glitchId: toGlitchId })
  publish({ type: 'glitch.updated', glitchId: echo.glitchId })
  return { glitchId: toGlitchId }
}
