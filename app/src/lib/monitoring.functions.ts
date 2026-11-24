import { createServerFn } from '@tanstack/react-start'
import { sensorSeriesInput, setLockdownInput, triggerIncidentInput } from '#/lib/monitoring.ts'
import { validate } from '#/lib/validate.ts'
import { requireCommander, requireGuardian } from '#/server/auth/middleware.ts'
import * as monitoring from '#/server/monitoring/monitoring.service.ts'
import type { Dashboard, LeaderboardEntry, Report, SensorSeries } from '#/lib/monitoring.ts'

export const getDashboard = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .handler(async (): Promise<Dashboard> => monitoring.getDashboard())

export const getSensorSeries = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .validator(validate(sensorSeriesInput))
  .handler(async ({ data }): Promise<Array<SensorSeries>> =>
    monitoring.getSensorSeries(data.minutes),
  )

export const setLockdown = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(setLockdownInput))
  .handler(async ({ data }): Promise<{ on: boolean }> => monitoring.setLockdown(data.on))

export const triggerIncident = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(triggerIncidentInput))
  .handler(async ({ data }): Promise<void> => monitoring.triggerIncident(data.sensorId))

export const getLeaderboard = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .handler(async (): Promise<Array<LeaderboardEntry>> => monitoring.getLeaderboard())

export const getReport = createServerFn({ method: 'GET' })
  .middleware([requireCommander])
  .handler(async (): Promise<Report> => monitoring.getReport())
