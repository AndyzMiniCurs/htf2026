import { AppError } from '#/lib/errors.ts'
import { LYRA, NOVA, ORION, demoRealm } from '#/db/demo-data.ts'
import { reportEcho } from '../echoes/echoes.service.ts'
import { publish } from '../events/bus.ts'
import { resetForecast } from '../forecast/forecast.service.ts'
import { findGuardianById } from '../guardians/guardians.repository.ts'
import { triggerIncident } from '../monitoring/monitoring.service.ts'
import { resetSensorSimulator } from '../monitoring/sensor-simulator.ts'
import * as repo from './demo.repository.ts'
import type { DemoStage } from '#/lib/demo.ts'
import type { Location } from '#/lib/glitch.ts'

/**
 * Commander only (middleware): the realm back to the demo state, timestamps relative to now.
 * Live screens drop the lockdown and reload their data at once.
 */
export async function resetDemo(): Promise<{ glitches: number }> {
  const realm = demoRealm()
  await repo.restoreRealm(realm)
  resetSensorSimulator()
  resetForecast()
  publish({ type: 'lockdown', on: false })
  publish({ type: 'glitch.updated', glitchId: realm.glitches[0]?.glitchId ?? 'GL-0000' })
  return { glitches: realm.glitches.length }
}

type Script = { by: number; description: string; location: Location }

/** Each echo is a real report through the normal intake: moderated, typed, matched, assigned. */
const SCRIPTS: Record<Exclude<DemoStage, 'incident'>, Array<Script>> = {
  echo: [
    {
      by: NOVA,
      description: 'A portal is tearing open above the Ley Market stalls',
      location: { x: 86, y: 80 },
    },
  ],
  // Matches the seeded time loop at the clock tower, so the AI groups it.
  duplicate: [
    {
      by: ORION,
      description: 'The eastern clock tower is stuck on the same minute again',
      location: { x: 89, y: 25 },
    },
  ],
  // Five drains in different districts: enough to pull magic under 20% and lock the city down.
  storm: [
    {
      by: LYRA,
      description: 'The mana wells in Mill Hollow are running dry',
      location: { x: 12, y: 19 },
    },
    {
      by: NOVA,
      description: 'The archive vault wards are failing and magic is leaking out',
      location: { x: 8, y: 71 },
    },
    {
      by: ORION,
      description: 'Every lantern on Ember Ramp lost its magic at once',
      location: { x: 52, y: 95 },
    },
    {
      by: LYRA,
      description: 'A second rift is ripping open over the citadel gates',
      location: { x: 46, y: 45 },
    },
    {
      by: NOVA,
      description: 'The Ley Market crystals went dark, their mana is gone',
      location: { x: 84, y: 86 },
    },
  ],
}

/** Commander only (middleware): fires one scripted moment of the demo. */
export async function stageDemo(stage: DemoStage): Promise<{ glitchIds: Array<string> }> {
  if (stage === 'incident') {
    triggerIncident('magic-reserve')
    return { glitchIds: [] }
  }
  const results = await Promise.all(
    SCRIPTS[stage].map(async ({ by, description, location }) => {
      const reporter = await findGuardianById(by)
      if (!reporter)
        throw new AppError('NOT_FOUND', 'A demo guardian is missing; reseed the database')
      return reportEcho(reporter, { description, location, image: null })
    }),
  )
  return { glitchIds: results.map((r) => r.glitchId) }
}
