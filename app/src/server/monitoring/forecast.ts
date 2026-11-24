import {
  DEVIATION_WINDOW_MS,
  DROP_RATIO,
  DROP_WINDOW_MS,
  MIN_ABSOLUTE_DEVIATION,
  MIN_POINTS,
  SIGMAS,
} from './anomaly.ts'
import type { Reading } from './anomaly.ts'

export type Forecast =
  | { status: 'steady'; value: number }
  | {
      status: 'heading'
      value: number
      /** Units per minute; negative when falling. */
      ratePerMin: number
      etaSeconds: number
      rule: 'drop' | 'deviation'
    }

const TREND_WINDOW_MS = 45_000
/** Tuned by simulation (D1): about 0.7% false warnings on quiet sensors, ~95% warned 30 s into an incident. */
const MIN_RATE_PER_MIN = 3
const HORIZON_SECONDS = 10 * 60
const MIN_TREND_POINTS = 5
const MIN_MOVE = 2

const round = (n: number) => Math.round(n * 10) / 10

/** Least-squares slope in units per millisecond. */
function slope(points: Array<{ t: number; v: number }>): number {
  const n = points.length
  const tMean = points.reduce((s, p) => s + p.t, 0) / n
  const vMean = points.reduce((s, p) => s + p.v, 0) / n
  const num = points.reduce((s, p) => s + (p.t - tMean) * (p.v - vMean), 0)
  const den = points.reduce((s, p) => s + (p.t - tMean) ** 2, 0)
  return den === 0 ? 0 : num / den
}

/**
 * Projects one sensor's recent trend onto the lines the anomaly detector trips on (a 40% drop
 * from the 5-minute peak, or max(8, 3σ) from the 15-minute mean), design D1.
 * `readings` are oldest first and end with the newest reading, as for `detectAnomaly`.
 */
export function forecastSensor(readings: Array<Reading>): Forecast | null {
  const latest = readings.at(-1)
  if (!latest) return null
  const now = Date.parse(latest.timestamp)
  const value = round(latest.value)
  const within = (ms: number) => readings.filter((r) => now - Date.parse(r.timestamp) <= ms)
  const steady = { status: 'steady' as const, value }

  const trend = within(TREND_WINDOW_MS).map((r) => ({ t: Date.parse(r.timestamp), v: r.value }))
  if (trend.length < MIN_TREND_POINTS) return steady
  const perMs = slope(trend)
  const ratePerMin = perMs * 60_000
  if (Math.abs(ratePerMin) < MIN_RATE_PER_MIN) return steady

  const lines: Array<{ at: number; rule: 'drop' | 'deviation' }> = []
  const peak = Math.max(...within(DROP_WINDOW_MS).map((r) => r.value))
  if (ratePerMin < 0) lines.push({ at: peak * (1 - DROP_RATIO), rule: 'drop' })
  const history = within(DEVIATION_WINDOW_MS).slice(0, -1)
  if (history.length >= MIN_POINTS) {
    const mean = history.reduce((s, r) => s + r.value, 0) / history.length
    const std = Math.sqrt(history.reduce((s, r) => s + (r.value - mean) ** 2, 0) / history.length)
    // A real slide has already left the mean; a quiet sensor's wobble has not (see D1).
    if ((latest.value - mean) * Math.sign(ratePerMin) < MIN_MOVE) return steady
    const band = Math.max(MIN_ABSOLUTE_DEVIATION, SIGMAS * std)
    lines.push({ at: ratePerMin < 0 ? mean - band : mean + band, rule: 'deviation' })
  }

  // The first line the value meets in the direction it is moving.
  const ahead = lines
    .map((line) => ({ ...line, distance: (line.at - latest.value) / Math.sign(ratePerMin) }))
    .filter((line) => line.distance > 0)
    .sort((a, b) => a.distance - b.distance)
    .at(0)
  if (!ahead) return steady
  const etaSeconds = Math.round(ahead.distance / Math.abs(perMs) / 1000)
  if (etaSeconds > HORIZON_SECONDS) return steady
  return { status: 'heading', value, ratePerMin: round(ratePerMin), etaSeconds, rule: ahead.rule }
}
