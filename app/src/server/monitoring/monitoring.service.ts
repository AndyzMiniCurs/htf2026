import { GLITCH_TYPES } from '#/lib/glitch.ts'
import { SENSORS, SENSOR_IDS } from '#/lib/monitoring.ts'
import { publish } from '../events/bus.ts'
import * as glitchRepo from '../glitches/glitches.repository.ts'
import { listGuardians } from '../guardians/guardians.repository.ts'
import { notifyLockdown } from '../notifications/notifications.service.ts'
import { badgesFor } from './badges.ts'
import { magicLevel } from './magic.ts'
import * as repo from './monitoring.repository.ts'
import { ensureSensorSimulator, triggerIncident as startIncident } from './sensor-simulator.ts'
import * as sensorRepo from './sensors.repository.ts'
import type { GlitchType } from '#/lib/glitch.ts'
import type {
  Dashboard,
  LeaderboardEntry,
  Report,
  SensorId,
  SensorSeries,
} from '#/lib/monitoring.ts'
import type { Fix } from './badges.ts'

const RECENTLY_FIXED = 5

export async function getDashboard(): Promise<Dashboard> {
  ensureSensorSimulator()
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

/** Each sensor's readings of the last `minutes`, oldest first. */
export async function getSensorSeries(minutes: number): Promise<Array<SensorSeries>> {
  ensureSensorSimulator()
  const readings = await sensorRepo.readingsSince(
    new Date(Date.now() - minutes * 60_000).toISOString(),
  )
  return SENSOR_IDS.map((sensorId) => ({
    sensorId,
    ...SENSORS[sensorId],
    points: readings
      .filter((r) => r.sensorId === sensorId)
      .map(({ timestamp, value }) => ({ timestamp, value })),
  }))
}

/** Commander-only demo button (enforced by the server function's middleware). */
export function triggerIncident(sensorId: SensorId): void {
  startIncident(sensorId)
}

/** Commander-only (middleware): stores the flag and switches every open screen live. */
export async function setLockdown(on: boolean): Promise<{ on: boolean }> {
  await repo.setLockdown(on)
  publish({ type: 'lockdown', on })
  await notifyLockdown(on)
  return { on }
}

const REPORT_TOP = 5

/** Every defender, ranked by the fixes credited to them (ties by codename), with badges. */
export async function getLeaderboard(): Promise<Array<LeaderboardEntry>> {
  const [roster, credited] = await Promise.all([listGuardians(), glitchRepo.listCreditedFixes()])
  const fixesBy = new Map<number, Array<Fix>>()
  for (const row of credited) {
    if (row.guardianId === null || row.fixedAt === null) continue
    const list = fixesBy.get(row.guardianId) ?? []
    list.push({ type: row.type, createdAt: row.createdAt, fixedAt: row.fixedAt })
    fixesBy.set(row.guardianId, list)
  }
  return roster
    .filter((guardian) => guardian.role === 'defender')
    .map((guardian) => {
      const fixes = fixesBy.get(guardian.guardianId) ?? []
      return { guardian, fixes: fixes.length, badges: badgesFor(fixes) }
    })
    .sort((a, b) => b.fixes - a.fixes || a.guardian.codename.localeCompare(b.guardian.codename))
}

/** Commander only (middleware): the High Council report, printed to PDF by the browser. */
export async function getReport(): Promise<Report> {
  const [dashboard, leaderboard] = await Promise.all([getDashboard(), getLeaderboard()])
  return {
    generatedAt: new Date().toISOString(),
    dashboard,
    open: dashboard.recent.filter((g) => g.status !== 'FIXED'),
    leaderboard: leaderboard.slice(0, REPORT_TOP),
  }
}
