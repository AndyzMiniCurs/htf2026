// Relative imports only: the seed runs under plain node, which doesn't resolve the `#/` alias.
import type { GlitchType } from '../lib/glitch.ts'

/**
 * Synthetic incident history for the forecast model and the defenders' skill profiles.
 * Every rule below is deliberate, so the patterns the model learns are the ones written here:
 * - a daily rhythm: quiet nights, a small morning bump, a big evening storm around 20:00;
 * - a weekly rhythm: busy Mondays (portals) and Friday evenings, quiet weekends;
 * - storm days (about one in seven) that announce themselves with a busy morning and then
 *   double the afternoon and evening, and bursts: a busy hour makes the next one busier. Only a
 *   model that watches the last hours catches those;
 * - the Desync slowly spreading: a few percent more incidents every week;
 * - each type has its hours (creatures at night, sensor faults in the morning, ...);
 * - three defenders with different strengths, and Lyra, who joined two weeks ago.
 */

export type HistoryRow = {
  openedAt: string
  type: GlitchType
  fixedAt: string
  fixedBy: number
}

type Defender = {
  id: number
  /** First day (days ago) they took quests. */
  joinedDaysAgo: number
  /** Median minutes to seal one glitch of each type; missing types use `slow`. */
  median: Partial<Record<GlitchType, number>>
  slow: number
}

const HOUR_MS = 3_600_000

/** Mulberry32: a small seeded PRNG, so every seed run writes the same history. */
function random(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Expected incidents in one hour of a normal day. */
function dailyRate(hour: number): number {
  if (hour >= 1 && hour <= 5) return 0.12
  const morning = Math.exp(-((hour - 9) ** 2) / 2) * 0.55
  const evening = Math.exp(-((hour - 20) ** 2) / 4) * 1.9
  return 0.3 + morning + evening
}

/** Monday 1.25, Friday evening busy, weekends quiet. `day` is 0 = Sunday. */
function weekdayFactor(day: number, hour: number): number {
  if (day === 1) return 1.25
  if (day === 5) return hour >= 17 ? 1.5 : 1.05
  if (day === 0) return 0.7
  if (day === 6) return 0.8
  return 1
}

/** Relative weight of each type at an hour and weekday. */
function typeWeights(day: number, hour: number): Record<GlitchType, number> {
  const night = hour < 6 || hour >= 23
  return {
    creature: night ? 3 : 0.8,
    'sensor-fault': hour >= 6 && hour <= 11 ? 2.6 : 0.7,
    portal: (hour >= 17 && hour <= 22 ? 2.2 : 0.9) * (day === 1 ? 2.2 : 1),
    'magic-drain': hour >= 17 && hour <= 22 ? 1.8 : 0.8,
    'time-anomaly': hour === 0 || hour === 12 || hour === 11 || hour === 13 ? 2.4 : 0.6,
    unknown: 0.25,
  }
}

const DEFENDERS: Array<Defender> = [
  // Orion: the veteran, fast at portals and creatures, solid elsewhere.
  { id: 3, joinedDaysAgo: 999, median: { portal: 34, creature: 40, 'magic-drain': 70 }, slow: 85 },
  // Nova: the time-anomaly specialist.
  { id: 2, joinedDaysAgo: 999, median: { 'time-anomaly': 30, 'magic-drain': 60 }, slow: 110 },
  // Lyra: new, quick on sensor faults, still slow at the rest.
  { id: 4, joinedDaysAgo: 14, median: { 'sensor-fault': 38 }, slow: 150 },
]

function poisson(rand: () => number, lambda: number): number {
  const limit = Math.exp(-lambda)
  let k = 0
  let p = rand()
  while (p > limit) {
    k++
    p *= rand()
  }
  return k
}

function pick<TKey extends string>(rand: () => number, weights: Record<TKey, number>): TKey {
  const entries = Object.entries(weights) as Array<[TKey, number]>
  let roll = rand() * entries.reduce((sum, [, w]) => sum + w, 0)
  for (const [key, w] of entries) {
    roll -= w
    if (roll <= 0) return key
  }
  return (entries.at(-1) as [TKey, number])[0]
}

/** `weeks` of history ending at the start of `now`'s hour, oldest first. */
export function generateHistory(now: number, weeks: number, seed = 2026): Array<HistoryRow> {
  const rand = random(seed)
  const end = Math.floor(now / HOUR_MS) * HOUR_MS
  const hours = weeks * 7 * 24
  const rows: Array<HistoryRow> = []
  let stormDay = false
  let previous = 0
  for (let i = hours; i > 0; i--) {
    const start = end - i * HOUR_MS
    const date = new Date(start)
    const hour = date.getHours()
    const day = date.getDay()
    if (hour === 0) stormDay = rand() < 0.15
    const spread = 1 + 0.04 * ((hours - i) / (7 * 24))
    const storm = !stormDay || hour < 6 ? 1 : hour < 12 ? 1.7 : 2.3
    const burst = 1 + Math.min(previous, 4) * 0.3
    const count = poisson(rand, dailyRate(hour) * weekdayFactor(day, hour) * spread * storm * burst)
    previous = count
    for (let n = 0; n < count; n++) {
      const openedAt = start + rand() * HOUR_MS
      const type = pick(rand, typeWeights(day, hour))
      const daysAgo = (now - openedAt) / (24 * HOUR_MS)
      const available = DEFENDERS.filter((d) => d.joinedDaysAgo >= daysAgo)
      // Quests went mostly to whoever was fastest at the type, not always.
      const fixer = pick(
        rand,
        Object.fromEntries(available.map((d) => [d.id, 1 / (d.median[type] ?? d.slow)])) as Record<
          string,
          number
        >,
      )
      const defender = available.find((d) => String(d.id) === fixer) ?? DEFENDERS[0]
      const median = defender.median[type] ?? defender.slow
      // Log-normal spread around the defender's median.
      const minutes = median * Math.exp((rand() + rand() + rand() - 1.5) * 0.7)
      rows.push({
        openedAt: new Date(openedAt).toISOString(),
        type,
        fixedAt: new Date(openedAt + minutes * 60_000).toISOString(),
        fixedBy: defender.id,
      })
    }
  }
  return rows
}
