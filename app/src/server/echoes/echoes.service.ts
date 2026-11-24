import { publish } from '../events/bus.ts'
import * as repo from './echoes.repository.ts'
import { readEchoImage } from './image.ts'
import type { ReportEchoInput, ReportEchoResult } from '#/lib/echo.ts'
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
