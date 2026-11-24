import { SENSORS, SENSOR_IDS } from '#/lib/monitoring.ts'
import { reportPrediction } from '../echoes/echoes.service.ts'
import { publish } from '../events/bus.ts'
import { detectAnomaly } from './anomaly.ts'
import * as repo from './sensors.repository.ts'
import type { GlitchType, Location } from '#/lib/glitch.ts'
import type { SensorId } from '#/lib/monitoring.ts'
import type { Anomaly, Reading } from './anomaly.ts'

/** Where each simulated IoT sensor sits in Achrona and what a problem with it is. */
export const SENSOR_CONFIG: Record<
  SensorId,
  { baseline: number; location: Location; glitchType: GlitchType }
> = {
  'magic-reserve': { baseline: 82, location: { x: 50, y: 48 }, glitchType: 'magic-drain' },
  'ley-flux': { baseline: 64, location: { x: 72, y: 70 }, glitchType: 'magic-drain' },
  'portal-stability': { baseline: 91, location: { x: 26, y: 32 }, glitchType: 'portal' },
}

const TICK_MS = 3000
const WINDOW_MS = 15 * 60_000
const RETENTION_MS = 60 * 60_000
/** During an incident the sensor heads for this share of its baseline. */
const INCIDENT_LEVEL = 0.45
const PULL = { normal: 0.15, incident: 0.25 }
const NOISE = 1.2

/** One random-walk step: pulled toward `target`, plus bounded noise, kept within 0..100. */
export function nextValue(current: number, target: number, pull: number, random: number): number {
  const value = current + (target - current) * pull + (random * 2 - 1) * NOISE
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10
}

/** Glitch description written by the system, naming the sensor and what it saw. */
export function describeAnomaly(sensorId: SensorId, anomaly: Anomaly): string {
  const { label, unit } = SENSORS[sensorId]
  if (anomaly.kind === 'drop') {
    return `${label} fell ${anomaly.percent}% within 5 minutes (${anomaly.from} → ${anomaly.to} ${unit})`
  }
  const sigmas = Number.isFinite(anomaly.sigmas) ? `${anomaly.sigmas}σ` : 'far'
  return `${label} reads ${anomaly.value} ${unit}, ${sigmas} off its 15-minute average of ${anomaly.mean} ${unit}`
}

/**
 * The anomaly worth a new predicted glitch, if any. Quiet while the sensor's last prediction is
 * open, and only judges readings taken after it, so a drop that was already handled (and still
 * sits in the 5-minute window) is never reported twice.
 */
export function newAnomaly(
  readings: Array<Reading>,
  latestPrediction: { open: boolean; timestamp: string } | null,
): Anomaly | null {
  if (latestPrediction?.open) return null
  const since = latestPrediction?.timestamp ?? ''
  return detectAnomaly(readings.filter((r) => r.timestamp > since))
}

type SimulatorState = {
  values: Record<SensorId, number>
  /** Sensors pushed down by `triggerIncident`, with the predicted glitch once it exists. */
  incidents: Map<SensorId, string | null>
  busy: boolean
  ticks: number
}

// shortcut: one simulator per Node process (kept on globalThis so dev hot-reloads don't start a
// second one); fine for the demo's single instance, move to a worker if the app is scaled out.
const KEY = Symbol.for('htf.sensorSimulator')
type WithSimulator = typeof globalThis & { [KEY]?: SimulatorState }

function simulator(): SimulatorState | undefined {
  return (globalThis as WithSimulator)[KEY]
}

/** Starts the 3 s sensor loop once per process; safe to call on every request. */
export function ensureSensorSimulator(): void {
  if (simulator()) return
  const state: SimulatorState = {
    values: Object.fromEntries(SENSOR_IDS.map((id) => [id, SENSOR_CONFIG[id].baseline])) as Record<
      SensorId,
      number
    >,
    incidents: new Map(),
    busy: false,
    ticks: 0,
  }
  ;(globalThis as WithSimulator)[KEY] = state
  setInterval(() => void tick(state), TICK_MS).unref()
}

/** Scripted demo incident: the sensor slides toward 45% of normal until its glitch is fixed. */
export function triggerIncident(sensorId: SensorId): void {
  ensureSensorSimulator()
  const state = simulator()
  if (state && !state.incidents.has(sensorId)) state.incidents.set(sensorId, null)
}

async function tick(state: SimulatorState): Promise<void> {
  if (state.busy) return
  state.busy = true
  try {
    const now = Date.now()
    const timestamp = new Date(now).toISOString()
    const readings = SENSOR_IDS.map((sensorId) => {
      const incident = state.incidents.has(sensorId)
      const { baseline } = SENSOR_CONFIG[sensorId]
      state.values[sensorId] = nextValue(
        state.values[sensorId],
        incident ? baseline * INCIDENT_LEVEL : baseline,
        incident ? PULL.incident : PULL.normal,
        Math.random(),
      )
      return { sensorId, value: state.values[sensorId], timestamp }
    })
    await repo.insertReadings(readings)
    for (const reading of readings) publish({ type: 'sensor.reading', ...reading })

    const recent = await repo.readingsSince(new Date(now - WINDOW_MS).toISOString())
    for (const sensorId of SENSOR_IDS) {
      await checkSensor(
        state,
        sensorId,
        recent.filter((r) => r.sensorId === sensorId),
      )
    }
    if (++state.ticks % 100 === 0) {
      await repo.deleteReadingsBefore(new Date(now - RETENTION_MS).toISOString())
    }
  } catch (error) {
    console.warn('Sensor tick failed', error)
  } finally {
    state.busy = false
  }
}

async function checkSensor(
  state: SimulatorState,
  sensorId: SensorId,
  readings: Array<repo.SensorReading>,
): Promise<void> {
  const latest = await repo.findLatestPrediction(sensorId)
  // The incident's glitch was resolved: the sensor heals and drifts back to normal.
  const incidentGlitch = state.incidents.get(sensorId)
  if (incidentGlitch && !latest?.open) state.incidents.delete(sensorId)
  const anomaly = newAnomaly(readings, latest)
  if (!anomaly) return
  const { glitchId } = await reportPrediction({
    description: describeAnomaly(sensorId, anomaly),
    location: SENSOR_CONFIG[sensorId].location,
    type: SENSOR_CONFIG[sensorId].glitchType,
    sensorId,
  })
  if (state.incidents.has(sensorId)) state.incidents.set(sensorId, glitchId)
}
