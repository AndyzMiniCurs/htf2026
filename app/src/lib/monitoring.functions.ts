import { createServerFn } from '@tanstack/react-start'
import {
  fixtureDashboard,
  fixtureLeaderboard,
  fixtureReport,
  fixtureSensorSeries,
} from '#/lib/fixtures.ts'
import { sensorSeriesInput, setLockdownInput, triggerIncidentInput } from '#/lib/monitoring.ts'
import { validate } from '#/lib/validate.ts'
import { requireCommander, requireGuardian } from '#/server/auth/middleware.ts'
import type { Dashboard, LeaderboardEntry, Report, SensorSeries } from '#/lib/monitoring.ts'

export const getDashboard = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .handler(async (): Promise<Dashboard> => fixtureDashboard)

export const getSensorSeries = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .validator(validate(sensorSeriesInput))
  .handler(async ({ data }): Promise<Array<SensorSeries>> => fixtureSensorSeries(data.minutes))

export const setLockdown = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(setLockdownInput))
  .handler(async ({ data }): Promise<{ on: boolean }> => ({ on: data.on }))

export const triggerIncident = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(triggerIncidentInput))
  .handler(async (): Promise<void> => {})

export const getLeaderboard = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .handler(async (): Promise<Array<LeaderboardEntry>> => fixtureLeaderboard)

export const getReport = createServerFn({ method: 'GET' })
  .middleware([requireCommander])
  .handler(async (): Promise<Report> => fixtureReport())
