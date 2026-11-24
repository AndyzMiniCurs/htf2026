import { createServerFn } from '@tanstack/react-start'
import {
  addGlitchUpdateInput,
  moveEchoInput,
  parseReportEchoForm,
  type AddGlitchUpdateResult,
  type ReportEchoResult,
} from '#/lib/echo.ts'
import { fixtureEchoes, fixtureMe } from '#/lib/fixtures.ts'
import { validate } from '#/lib/validate.ts'
import { requireCommander, requireGuardian } from '#/server/auth/middleware.ts'
import * as echoes from '#/server/echoes/echoes.service.ts'

export const reportEcho = createServerFn({ method: 'POST' })
  .middleware([requireGuardian])
  .validator(parseReportEchoForm)
  .handler(async ({ data, context }): Promise<ReportEchoResult> => echoes.reportEcho(context.guardian, data))

export const addGlitchUpdate = createServerFn({ method: 'POST' })
  .middleware([requireGuardian])
  .validator(validate(addGlitchUpdateInput))
  .handler(
    async ({ data }): Promise<AddGlitchUpdateResult> => ({
      echo: {
        echoId: 201,
        glitchId: data.glitchId,
        description: data.description,
        timestamp: new Date().toISOString(),
        reporter: fixtureMe,
        location: null,
        groupedByAi: false,
        imageUrl: null,
      },
      autoClosed: false,
    }),
  )

export const moveEcho = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(moveEchoInput))
  .handler(
    async ({ data }): Promise<{ glitchId: string }> => ({
      glitchId: data.toGlitchId ?? fixtureEchoes[0]?.glitchId ?? 'GL-0201',
    }),
  )
