import { GLITCH_TYPES } from '#/lib/glitch.ts'
import { SENSORS, SENSOR_IDS } from '#/lib/monitoring.ts'
import { AppError } from '#/lib/errors.ts'
import { publish, subscribe } from '../events/bus.ts'
import * as glitchRepo from '../glitches/glitches.repository.ts'
import { listGuardians } from '../guardians/guardians.repository.ts'
import { notifyLockdown } from '../notifications/notifications.service.ts'
import { badgesFor } from './badges.ts'
import { AUTO_LOCKDOWN_BELOW, canLift, nextLockdown } from './lockdown.ts'
import { magicLevel } from './magic.ts'
import * as repo from './monitoring.repository.ts'
import { forecastSensor } from './forecast.ts'
import {
  SENSOR_CONFIG,
  ensureSensorSimulator,
  triggerIncident as startIncident,
} from './sensor-simulator.ts'
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
import type { LockdownState } from './lockdown.ts'
import type { Forecast } from './forecast.ts'

export type SensorForesight = {
  sensorId: SensorId
  label: string
  unit: string
  /** The kind of glitch this sensor's alarm raises. */
  glitchType: GlitchType
  /** The sensor's predictive glitch that is still open; the detector stays quiet meanwhile. */
  openPrediction: string | null
  forecast: Forecast | null
}

const RECENTLY_FIXED = 5

export async function getDashboard(): Promise<Dashboard> {
  ensureSensorSimulator()
  ensureAutoLockdown()
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

/** Where each sensor is heading (design D3), judged on the same readings the detector sees. */
export async function getForesight(): Promise<Array<SensorForesight>> {
  ensureSensorSimulator()
  const readings = await sensorRepo.readingsSince(new Date(Date.now() - 15 * 60_000).toISOString())
  return Promise.all(
    SENSOR_IDS.map(async (sensorId) => {
      const latest = await sensorRepo.findLatestPrediction(sensorId)
      const since = latest?.timestamp ?? ''
      return {
        sensorId,
        ...SENSORS[sensorId],
        glitchType: SENSOR_CONFIG[sensorId].glitchType,
        openPrediction: latest?.open ? latest.glitchId : null,
        forecast: forecastSensor(
          readings.filter((r) => r.sensorId === sensorId && r.timestamp > since),
        ),
      }
    }),
  )
}

/** Commander-only demo button (enforced by the server function's middleware). */
export function triggerIncident(sensorId: SensorId): void {
  startIncident(sensorId)
}

/** Commander-only (middleware): stores the flag and switches every open screen live. */
export async function setLockdown(on: boolean): Promise<{ on: boolean }> {
  if (!on && !canLift(await currentMagic())) {
    throw new AppError(
      'CONFLICT',
      `Magic is under ${AUTO_LOCKDOWN_BELOW}%: the lockdown holds until it recovers.`,
    )
  }
  await applyLockdown({ on, auto: false })
  return { on }
}

async function applyLockdown(state: LockdownState): Promise<void> {
  await repo.setLockdownState(state)
  publish({ type: 'lockdown', on: state.on })
  await notifyLockdown(state.on)
}

async function currentMagic(): Promise<number> {
  return magicLevel(
    await glitchRepo.listGlitches({ status: ['LEAKED', 'ASSESSING', 'CONTAINING'] }),
  )
}

/** Applies the automatic lockdown rule to the magic level as it is now. */
async function syncLockdown(): Promise<void> {
  const current = await repo.getLockdownState()
  const next = nextLockdown(await currentMagic(), current)
  if (next.on !== current.on) await applyLockdown(next)
}

const AUTO_LOCKDOWN_KEY = Symbol.for('achrona.autoLockdown')
type WithAutoLockdown = typeof globalThis & { [AUTO_LOCKDOWN_KEY]?: true }

/**
 * Re-checks the lockdown after every glitch change, wherever it came from (echo, status, merge).
 * Checks run one after another so two quick changes cannot both declare it. Once per process.
 */
export function ensureAutoLockdown(): void {
  const host = globalThis as WithAutoLockdown
  if (host[AUTO_LOCKDOWN_KEY]) return
  host[AUTO_LOCKDOWN_KEY] = true
  let queue = Promise.resolve()
  const check = () => {
    queue = queue
      .then(syncLockdown)
      .catch((error: unknown) => console.warn('Automatic lockdown check failed', error))
  }
  subscribe(({ event }) => {
    if (event.type === 'glitch.created' || event.type === 'glitch.updated') check()
  })
  check()
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
