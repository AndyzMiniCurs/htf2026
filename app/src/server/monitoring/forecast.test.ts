import { describe, expect, it } from 'vitest'
import { detectAnomaly } from './anomaly.ts'
import { forecastSensor } from './forecast.ts'
import type { Reading } from './anomaly.ts'

const TICK_MS = 3000
const START = Date.parse('2026-11-24T12:00:00.000Z')

/** Readings every 3 s from START, one per value. */
const series = (values: Array<number>): Array<Reading> =>
  values.map((value, i) => ({ timestamp: new Date(START + i * TICK_MS).toISOString(), value }))

/** 15 minutes of a flat signal with a small alternating wobble. */
const flat = (level: number, ticks = 300) =>
  Array.from({ length: ticks }, (_, i) => level + (i % 2 ? 0.5 : -0.5))

const slide = (from: number, perTick: number, ticks: number) =>
  Array.from({ length: ticks }, (_, i) => from + perTick * (i + 1))

/** Seconds from the last reading until detectAnomaly first fires, continuing the slide. */
function actualCrossing(values: Array<number>, perTick: number): number {
  const extended = [...values]
  for (let tick = 1; tick <= 400; tick++) {
    extended.push((extended.at(-1) ?? 0) + perTick)
    if (detectAnomaly(series(extended))) return (tick * TICK_MS) / 1000
  }
  throw new Error('never crossed')
}

describe('forecastSensor', () => {
  it('calls a noisy flat signal steady', () => {
    expect(forecastSensor(series(flat(80)))).toEqual({ status: 'steady', value: 80.5 })
  })

  it('projects a slide onto the alarm the detector will raise, with a close ETA', () => {
    const values = [...flat(80), ...slide(80, -0.3, 20)]
    const forecast = forecastSensor(series(values))

    expect(forecast).toMatchObject({ status: 'heading', ratePerMin: -6, rule: 'deviation' })
    const actual = actualCrossing(values, -0.3)
    const eta = forecast?.status === 'heading' ? forecast.etaSeconds : NaN
    expect(Math.abs(eta - actual)).toBeLessThanOrEqual(Math.max(actual * 0.1, TICK_MS / 1000))
  })

  it('heads a rising signal toward the upper deviation line', () => {
    const forecast = forecastSensor(series([...flat(60), ...slide(60, 0.4, 15)]))
    expect(forecast).toMatchObject({ status: 'heading', rule: 'deviation' })
    expect(forecast?.status === 'heading' && forecast.ratePerMin).toBeGreaterThan(0)
  })

  it('stays steady when the nearest alarm is more than 10 minutes away', () => {
    // A wide band (large σ from an old noisy stretch) and a gentle slide.
    const noisy = Array.from({ length: 200 }, (_, i) => 200 + (i % 2 ? 40 : -40))
    const values = [...noisy, ...flat(200, 100), ...slide(200, -0.16, 15)]
    expect(forecastSensor(series(values))).toMatchObject({ status: 'steady' })
  })

  it('needs a few readings before it judges a trend', () => {
    expect(forecastSensor(series([80, 70]))).toEqual({ status: 'steady', value: 70 })
    expect(forecastSensor([])).toBeNull()
  })
})
