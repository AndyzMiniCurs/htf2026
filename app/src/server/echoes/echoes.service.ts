import * as repo from './echoes.repository.ts'
import { readEchoImage } from './image.ts'
import type { ReportEchoInput, ReportEchoResult } from '#/lib/echo.ts'
import type { Guardian } from '#/lib/guardian.ts'

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

export async function getEchoImage(echoId: number) {
  return repo.findEchoImage(echoId)
}
