import { createServerFn } from '@tanstack/react-start'
import { requireGuardian } from '#/server/auth/middleware.ts'
import * as forecast from '#/server/forecast/forecast.service.ts'
import type { Forecast } from '#/lib/forecast.ts'

export const getForecast = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .handler(async (): Promise<Forecast> => forecast.getForecast())
