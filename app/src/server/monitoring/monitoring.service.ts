import { GLITCH_TYPES } from '#/lib/glitch.ts'
import * as glitchRepo from '../glitches/glitches.repository.ts'
import { magicLevel } from './magic.ts'
import * as repo from './monitoring.repository.ts'
import type { GlitchType } from '#/lib/glitch.ts'
import type { Dashboard } from '#/lib/monitoring.ts'

const RECENTLY_FIXED = 5

export async function getDashboard(): Promise<Dashboard> {
  const [open, fixed, byStatus, lockdown] = await Promise.all([
    glitchRepo.listGlitches({ status: ['LEAKED', 'ASSESSING', 'CONTAINING'] }),
    glitchRepo.listRecentlyFixed(RECENTLY_FIXED),
    glitchRepo.countByStatus(),
    repo.getLockdown(),
  ])
  // byType counts what is open now: it explains where the magic is going.
  const byType = Object.fromEntries(GLITCH_TYPES.map((t) => [t, 0])) as Record<GlitchType, number>
  for (const glitch of open) byType[glitch.type] += 1
  return {
    magicLevel: magicLevel(open),
    byStatus,
    byType,
    recent: [...open, ...fixed].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    lockdown,
  }
}
