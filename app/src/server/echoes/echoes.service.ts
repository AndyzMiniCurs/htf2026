import { AppError } from '#/lib/errors.ts'
import { publish } from '../events/bus.ts'
import { requireActiveGlitch } from '../glitches/glitches.service.ts'
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

/** Echo intake (design D7). Without AI every echo creates a new `LEAKED` glitch. */
export async function reportEcho(
  reporter: Guardian,
  input: ReportEchoInput,
): Promise<ReportEchoResult> {
  const image = input.image ? await readEchoImage(input.image) : null
  const timestamp = new Date().toISOString()
  const { glitchId, echoId } = await repo.insertEchoWithNewGlitch({
    description: input.description,
    timestamp,
    reportingGuardianId: reporter.guardianId,
    location: input.location,
    image,
  })
  publish({ type: 'glitch.created', glitchId })
  publish({ type: 'echo.created', echoId, glitchId })
  return {
    echo: {
      echoId,
      glitchId,
      description: input.description,
      timestamp,
      reporter,
      location: input.location,
      groupedByAi: false,
      imageUrl: image ? `/api/images/${echoId}` : null,
    },
    glitchId,
    outcome: 'created',
  }
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
