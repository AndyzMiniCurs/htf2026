import { AppError } from '#/lib/errors.ts'
import type { GlitchDetail, GlitchListItem, GlitchQuery } from '#/lib/glitch.ts'
import * as repo from './glitches.repository.ts'

export async function getGlitches(query: GlitchQuery): Promise<GlitchListItem[]> {
  return repo.listGlitches(query)
}

export async function getGlitch(glitchId: string): Promise<GlitchDetail> {
  const glitch = await repo.findGlitchDetail(glitchId)
  if (!glitch) throw new AppError('NOT_FOUND', `Glitch ${glitchId} not found`)
  return glitch
}
