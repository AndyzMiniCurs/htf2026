export type Reading = { timestamp: string; value: number }

export type Anomaly =
  | { kind: 'drop'; from: number; to: number; percent: number }
  | { kind: 'deviation'; value: number; mean: number; sigmas: number }

// Exported so the Oracle's forecast projects onto exactly the lines this detector uses.
const MINUTE = 60_000
export const DROP_WINDOW_MS = 5 * MINUTE
export const DROP_RATIO = 0.4
export const DEVIATION_WINDOW_MS = 15 * MINUTE
export const SIGMAS = 3
/** Below this many points a standard deviation says nothing. */
export const MIN_POINTS = 10
/** 3σ of a very calm signal is tiny; also require a real-world jump so sensor noise never pages. */
export const MIN_ABSOLUTE_DEVIATION = 8

const round = (n: number) => Math.round(n * 10) / 10

/**
 * Checks the newest reading of one sensor (spec: ai-assistance, predictive glitches):
 * a drop of 40% or more within 5 minutes, or a value more than 3σ from the last 15 minutes.
 * `readings` are oldest first and end with the newest reading.
 */
export function detectAnomaly(readings: Array<Reading>): Anomaly | null {
  const latest = readings.at(-1)
  if (!latest) return null
  const now = Date.parse(latest.timestamp)
  const within = (ms: number) => readings.filter((r) => now - Date.parse(r.timestamp) <= ms)

  const peak = Math.max(...within(DROP_WINDOW_MS).map((r) => r.value))
  if (peak > 0 && (peak - latest.value) / peak >= DROP_RATIO) {
    return {
      kind: 'drop',
      from: round(peak),
      to: round(latest.value),
      percent: Math.round(((peak - latest.value) / peak) * 100),
    }
  }

  const history = within(DEVIATION_WINDOW_MS).slice(0, -1)
  if (history.length < MIN_POINTS) return null
  const mean = history.reduce((sum, r) => sum + r.value, 0) / history.length
  const std = Math.sqrt(history.reduce((sum, r) => sum + (r.value - mean) ** 2, 0) / history.length)
  const deviation = Math.abs(latest.value - mean)
  if (deviation >= MIN_ABSOLUTE_DEVIATION && deviation > SIGMAS * std) {
    return {
      kind: 'deviation',
      value: round(latest.value),
      mean: round(mean),
      sigmas: std > 0 ? round(deviation / std) : Infinity,
    }
  }
  return null
}
