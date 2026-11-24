import { STATUS_DRAIN, TYPE_SEVERITY } from '../monitoring/magic.ts'
import type { GlitchType } from '#/lib/glitch.ts'

/** Hours the forecast looks ahead. */
export const HORIZON = 12
/** Hours of the past each prediction is allowed to see. */
const LOOKBACK = 24
export const HOUR_MS = 3_600_000

/** Magic a new glitch of this type drains while it is still leaking. */
export const pressureOf = (type: GlitchType): number => STATUS_DRAIN.LEAKED * TYPE_SEVERITY[type]

export type Incident = { openedAt: string; type: GlitchType; fixedAt: string | null }

/** Incidents per hour, and the magic they drain on arrival, for hours [start, start + n). */
export type HourlySeries = { start: number; counts: Array<number>; pressure: Array<number> }

export function hourlySeries(incidents: Array<Incident>, start: number, n: number): HourlySeries {
  const counts = Array.from({ length: n }, () => 0)
  const pressure = Array.from({ length: n }, () => 0)
  for (const incident of incidents) {
    const i = Math.floor((Date.parse(incident.openedAt) - start) / HOUR_MS)
    if (i < 0 || i >= n) continue
    counts[i] = (counts[i] ?? 0) + 1
    pressure[i] = (pressure[i] ?? 0) + pressureOf(incident.type)
  }
  return { start, counts, pressure }
}

/**
 * What the model sees to forecast the hours after hour `i`: the time of day and week (as
 * cycles), and the last day of activity, scaled to roughly 0..1.
 */
export function featuresAt(series: HourlySeries, i: number): Array<number> {
  const at = new Date(series.start + i * HOUR_MS)
  const hour = at.getHours()
  const day = at.getDay()
  const c = (k: number) => (series.counts[i - k] ?? 0) / 4
  const window = (from: number, to: number) => {
    let sum = 0
    for (let k = from; k <= to; k++) sum += series.counts[i - k] ?? 0
    return sum / 4 / (to - from + 1)
  }
  return [
    Math.sin((2 * Math.PI * hour) / 24),
    Math.cos((2 * Math.PI * hour) / 24),
    ...Array.from({ length: 7 }, (_, d) => (d === day ? 1 : 0)),
    c(0),
    c(1),
    c(2),
    window(0, 5),
    window(0, LOOKBACK - 1),
    c(LOOKBACK - 1),
    // How busy today has been so far: storm days show early.
    hour === 0 ? 0 : window(0, hour - 1),
  ]
}

/** Training pairs: features at hour i, and the counts of the HORIZON hours after it. */
export function dataset(series: HourlySeries): {
  inputs: Array<Array<number>>
  targets: Array<Array<number>>
  hours: Array<number>
} {
  const inputs: Array<Array<number>> = []
  const targets: Array<Array<number>> = []
  const hours: Array<number> = []
  for (let i = LOOKBACK; i + HORIZON < series.counts.length; i++) {
    inputs.push(featuresAt(series, i))
    targets.push(series.counts.slice(i + 1, i + 1 + HORIZON))
    hours.push(i)
  }
  return { inputs, targets, hours }
}

/** The naive forecast to beat: the average count of each weekday-and-hour slot. */
export function seasonalAverage(series: HourlySeries, until: number): (at: number) => number {
  const sums = new Map<number, { total: number; n: number }>()
  const slot = (at: number) => {
    const d = new Date(at)
    return d.getDay() * 24 + d.getHours()
  }
  for (let i = 0; i < Math.min(until, series.counts.length); i++) {
    const key = slot(series.start + i * HOUR_MS)
    const entry = sums.get(key) ?? { total: 0, n: 0 }
    entry.total += series.counts[i] ?? 0
    entry.n += 1
    sums.set(key, entry)
  }
  return (at) => {
    const entry = sums.get(slot(at))
    return entry ? entry.total / entry.n : 0
  }
}

/** Mean absolute error between two equally long lists of rows. */
export function meanAbsoluteError(
  actual: Array<Array<number>>,
  predicted: Array<Array<number>>,
): number {
  let sum = 0
  let n = 0
  actual.forEach((row, r) =>
    row.forEach((value, c) => {
      sum += Math.abs(value - (predicted[r]?.[c] ?? 0))
      n++
    }),
  )
  return n === 0 ? 0 : sum / n
}

/** Share of glitches still open `h` hours after they appeared, for h = 0..HORIZON. */
export function survival(incidents: Array<Incident>): Array<number> {
  const durations = incidents
    .filter((i) => i.fixedAt)
    .map((i) => (Date.parse(i.fixedAt ?? '') - Date.parse(i.openedAt)) / HOUR_MS)
  if (durations.length === 0) return Array.from({ length: HORIZON + 1 }, () => 1)
  return Array.from(
    { length: HORIZON + 1 },
    (_, h) => durations.filter((d) => d > h).length / durations.length,
  )
}

/**
 * Magic over the next hours at the usual fixing pace: what is open now keeps draining until it
 * is sealed, and each forecast glitch drains from its hour until it, too, is sealed.
 */
export function projectMagic(
  openDrainNow: number,
  arrivals: Array<number>,
  pressurePerGlitch: Array<number>,
  stillOpen: Array<number>,
): Array<number> {
  return arrivals.map((_, h) => {
    let drain = openDrainNow * (stillOpen[h + 1] ?? 0)
    for (let a = 0; a <= h; a++) {
      drain += (arrivals[a] ?? 0) * (pressurePerGlitch[a] ?? 0) * (stillOpen[h - a] ?? 0)
    }
    return Math.max(0, Math.min(100, Math.round(100 - drain)))
  })
}
