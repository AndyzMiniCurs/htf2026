import { GLITCH_TYPES } from '#/lib/glitch.ts'
import * as glitchRepo from '../glitches/glitches.repository.ts'
import { magicLevel } from '../monitoring/magic.ts'
import {
  HOUR_MS,
  featuresAt,
  hourlySeries,
  pressureOf,
  projectMagic,
  seasonalAverage,
  survival,
} from './features.ts'
import * as repo from './forecast.repository.ts'
import { trainModel } from './model.ts'
import { chooseDefender, pressureMode, skillProfiles } from './staffing.ts'
import type { HourlySeries, Incident } from './features.ts'
import type { TrainedModel } from './model.ts'
import type { Candidate, Fix, Pick } from './staffing.ts'
import type { Forecast, PressureMode } from '#/lib/forecast.ts'
import type { GlitchType } from '#/lib/glitch.ts'

/** Weeks of history the forecast reads (the seed writes eight). */
const WEEKS = 8
/** Hours the storm-or-lull call looks ahead. */
const NEAR = 3
/** z for an 80% range around a Poisson count. */
const Z80 = 1.28
const OPEN = ['LEAKED', 'ASSESSING', 'CONTAINING'] as const

/** How old the model may get before it is retrained on the incidents since. */
const RETRAIN_MS = 60 * 60_000

type ModelSlot = {
  /** The latest finished model, or the first training still running. */
  current: Promise<TrainedModel>
  ready: TrainedModel | null
  trainedAt: number
  retraining: boolean
}
const MODEL_KEY = Symbol.for('achrona.forecastModel.v2')
type WithModel = typeof globalThis & { [MODEL_KEY]?: ModelSlot }

/**
 * The trained model, kept in memory per process. The first call trains it (a few seconds);
 * after RETRAIN_MS a fresh one trains in the background while the old one keeps answering.
 */
function model(series: HourlySeries): ModelSlot {
  const host = globalThis as WithModel
  const existing = host[MODEL_KEY]
  if (!existing) {
    const slot: ModelSlot = {
      current: trainModel(series),
      ready: null,
      trainedAt: Date.now(),
      retraining: false,
    }
    slot.current
      .then((m) => (slot.ready = m))
      .catch((error: unknown) => {
        console.warn('Forecast model training failed', error)
        delete host[MODEL_KEY]
      })
    host[MODEL_KEY] = slot
    return slot
  }
  if (existing.ready && !existing.retraining && Date.now() - existing.trainedAt > RETRAIN_MS) {
    existing.retraining = true
    trainModel(series)
      .then((m) => {
        existing.current = Promise.resolve(m)
        existing.ready = m
        existing.trainedAt = Date.now()
      })
      .catch((error: unknown) => console.warn('Forecast model retraining failed', error))
      .finally(() => (existing.retraining = false))
  }
  return existing
}

type Inputs = {
  series: HourlySeries
  now: number
  /** Index of the current hour in the series. */
  current: number
  incidents: Array<Incident>
  fixes: Array<Fix>
  openDrain: number
  magicNow: number
}

async function gather(): Promise<Inputs> {
  const [history, live, open] = await Promise.all([
    repo.listHistory(),
    repo.listLiveGlitches(),
    glitchRepo.listGlitches({ status: [...OPEN] }),
  ])
  const now = Date.now()
  const current = WEEKS * 7 * 24
  const start = Math.floor(now / HOUR_MS) * HOUR_MS - current * HOUR_MS
  const incidents: Array<Incident> = [...history, ...live]
  const fixes = [...history, ...live].flatMap((r) =>
    r.fixedAt && r.fixedBy !== null
      ? [
          {
            guardianId: r.fixedBy,
            type: r.type,
            minutes: (Date.parse(r.fixedAt) - Date.parse(r.openedAt)) / 60_000,
          },
        ]
      : [],
  )
  const magicNow = magicLevel(open)
  return {
    series: hourlySeries(incidents, start, current + 1),
    now,
    current,
    incidents,
    fixes,
    openDrain: 100 - magicNow,
    magicNow,
  }
}

/** Average drain a new glitch brings at each hour of the day, from the history. */
function pressureByHour(incidents: Array<Incident>): Array<number> {
  const sums = Array.from({ length: 24 }, () => ({ total: 0, n: 0 }))
  for (const i of incidents) {
    const slot = sums[new Date(i.openedAt).getHours()]
    slot.total += pressureOf(i.type)
    slot.n += 1
  }
  return sums.map((s) => (s.n ? s.total / s.n : 10))
}

function outlook(inputs: Inputs, trained: TrainedModel) {
  const { series, current } = inputs
  const arrivals = trained.predict(featuresAt(series, current))
  const times = arrivals.map((_, h) => series.start + (current + 1 + h) * HOUR_MS)
  const perGlitch = pressureByHour(inputs.incidents)
  const pressure = times.map((t) => perGlitch[new Date(t).getHours()] ?? 10)
  const magic = projectMagic(inputs.openDrain, arrivals, pressure, survival(inputs.incidents))
  const near = arrivals.slice(0, NEAR).reduce((sum, a, h) => sum + a * (pressure[h] ?? 0), 0)
  const hourlyDrain = series.pressure.slice(0, current)
  const typical = (hourlyDrain.reduce((a, b) => a + b, 0) / Math.max(1, hourlyDrain.length)) * NEAR
  return {
    arrivals,
    times,
    magic,
    near,
    typical,
    mode: pressureMode(near, typical, Math.min(inputs.magicNow, ...magic)),
  }
}

/** The defenders with their load and skills; `forType` lists them as candidates for a type. */
async function roster(fixes: Array<Fix>, ai: Map<number, number> | null) {
  const defenders = await glitchRepo.listDefenderLoads()
  const skills = skillProfiles(
    defenders.map((d) => d.guardianId),
    fixes,
  )
  const forType = (type: GlitchType) =>
    defenders.map((d): Candidate => ({
      guardianId: d.guardianId,
      codename: d.codename,
      skill: skills.get(d.guardianId)?.[type].skill ?? 0,
      openCount: d.openCount,
      ai: ai?.get(d.guardianId) ?? null,
    }))
  return { defenders, skills, forType }
}

/** The forecast page: the next hours, the model's track record, and who would take what. */
export async function getForecast(): Promise<Forecast> {
  const inputs = await gather()
  const trained = await model(inputs.series).current
  const { arrivals, times, magic, near, typical, mode } = outlook(inputs, trained)
  const average = seasonalAverage(inputs.series, inputs.current)
  const { defenders, skills, forType } = await roster(inputs.fixes, null)
  const nextAssignee = Object.fromEntries(
    GLITCH_TYPES.map((type) => [type, chooseDefender(mode, forType(type))]),
  ) as Forecast['nextAssignee']

  const peakIndex = arrivals.reduce((best, a, i) => (a > (arrivals[best] ?? 0) ? i : best), 0)
  const lockdownIndex = magic.findIndex((m) => m < 20)

  return {
    generatedAt: new Date(inputs.now).toISOString(),
    hours: arrivals.map((lambda, h) => ({
      at: new Date(times[h] ?? 0).toISOString(),
      glitches: round(lambda),
      low: round(Math.max(0, lambda - Z80 * Math.sqrt(lambda))),
      high: round(lambda + Z80 * Math.sqrt(lambda)),
      baseline: round(average(times[h] ?? 0)),
      magic: magic[h] ?? 0,
    })),
    magicNow: inputs.magicNow,
    mode,
    pressureRatio: round(typical > 0 ? near / typical : 1),
    peak: {
      at: new Date(times[peakIndex] ?? 0).toISOString(),
      glitches: round(arrivals[peakIndex] ?? 0),
    },
    lockdownAt: lockdownIndex >= 0 ? new Date(times[lockdownIndex] ?? 0).toISOString() : null,
    model: {
      kind: trained.kind,
      trainedHours: trained.trainedHours,
      incidents: inputs.incidents.length,
      modelError: trained.modelError,
      baselineError: trained.baselineError,
      synthetic: true,
    },
    heatmap: heatmap(inputs.series, inputs.current),
    defenders: defenders.flatMap((d) => {
      const profile = skills.get(d.guardianId)
      return profile
        ? [
            {
              guardianId: d.guardianId,
              codename: d.codename,
              openCount: d.openCount,
              skills: profile,
            },
          ]
        : []
    }),
    nextAssignee,
  }
}

/**
 * Who takes a new glitch of `type`, given the forecast pressure. Never waits for the model:
 * until it has trained, the hours count as steady. `ai` is the classifier's fit per defender.
 */
export async function chooseAssignee(
  type: GlitchType,
  ai: Map<number, number> | null,
): Promise<Pick | null> {
  const inputs = await gather()
  // Never waits for training: until the first model is ready, the hours count as steady.
  const trained = model(inputs.series).ready
  const mode: PressureMode = trained ? outlook(inputs, trained).mode : 'steady'
  const { forType } = await roster(inputs.fixes, ai)
  return chooseDefender(mode, forType(type))
}

/** Starts training early, so the first visit to the forecast does not wait for it. */
export function warmForecast(): void {
  if ((globalThis as WithModel)[MODEL_KEY]) return
  void gather()
    .then((inputs) => model(inputs.series))
    .catch((error: unknown) => console.warn('Forecast warm-up failed', error))
}

/** Average incidents per weekday (0 = Sunday) and hour over the history. */
function heatmap(series: HourlySeries, until: number): Array<Array<number>> {
  const sums = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ t: 0, n: 0 })))
  for (let i = 0; i < until; i++) {
    const at = new Date(series.start + i * HOUR_MS)
    const cell = sums[at.getDay()][at.getHours()]
    cell.t += series.counts[i] ?? 0
    cell.n += 1
  }
  return sums.map((row) => row.map((c) => round(c.n ? c.t / c.n : 0)))
}

const round = (v: number) => Math.round(v * 100) / 100
