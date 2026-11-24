import { createServerFn } from '@tanstack/react-start'
import {
  fixtureDashboard,
  fixtureLeaderboard,
  fixtureReport,
  fixtureSensorSeries,
} from '#/lib/fixtures.ts'
import {
  sensorSeriesInput,
  setLockdownInput,
  triggerIncidentInput,
  type Dashboard,
  type LeaderboardEntry,
  type Report,
  type SensorSeries,
} from '#/lib/monitoring.ts'
import { validate } from '#/lib/validate.ts'

export const getDashboard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Dashboard> => fixtureDashboard,
)

export const getSensorSeries = createServerFn({ method: 'GET' })
  .validator(validate(sensorSeriesInput))
  .handler(async ({ data }): Promise<SensorSeries[]> => fixtureSensorSeries(data.minutes))

export const setLockdown = createServerFn({ method: 'POST' })
  .validator(validate(setLockdownInput))
  .handler(async ({ data }): Promise<{ on: boolean }> => ({ on: data.on }))

export const triggerIncident = createServerFn({ method: 'POST' })
  .validator(validate(triggerIncidentInput))
  .handler(async (): Promise<void> => {})

export const getLeaderboard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<LeaderboardEntry[]> => fixtureLeaderboard,
)

export const getReport = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Report> => fixtureReport(),
)
