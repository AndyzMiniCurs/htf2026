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

export const reportEcho = createServerFn({ method: 'POST' })
  .validator(parseReportEchoForm)
  .handler(
    async ({ data }): Promise<ReportEchoResult> => ({
      echo: {
        echoId: 200,
        glitchId: 'GL-0200',
        description: data.description,
        timestamp: new Date().toISOString(),
        reporter: fixtureMe,
        location: data.location,
        groupedByAi: false,
        imageUrl: null,
      },
      glitchId: 'GL-0200',
      outcome: 'created',
    }),
  )

export const addGlitchUpdate = createServerFn({ method: 'POST' })
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
  .validator(validate(moveEchoInput))
  .handler(
    async ({ data }): Promise<{ glitchId: string }> => ({
      glitchId: data.toGlitchId ?? fixtureEchoes[0]?.glitchId ?? 'GL-0201',
    }),
  )
