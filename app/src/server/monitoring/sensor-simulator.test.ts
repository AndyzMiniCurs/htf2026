import { describe, expect, it } from 'vitest'
import { describeAnomaly, newAnomaly, nextValue } from './sensor-simulator.ts'

describe('nextValue', () => {
  it('moves toward the target by the pull, with no noise at random = 0.5', () => {
    expect(nextValue(82, 37, 0.25, 0.5)).toBe(70.8)
    expect(nextValue(37, 82, 0.15, 0.5)).toBe(43.8)
  })

  it('adds at most ±1.2 noise around a steady value', () => {
    expect(nextValue(80, 80, 0.15, 0)).toBe(78.8)
    expect(nextValue(80, 80, 0.15, 1)).toBe(81.2)
  })

  it('stays within 0..100', () => {
    expect(nextValue(0.5, 0, 0.25, 0)).toBe(0)
    expect(nextValue(99.8, 100, 0.25, 1)).toBe(100)
  })

  it('reaches the 40% drop rule within seconds of an incident', () => {
    let value = 82
    let ticks = 0
    while (value > 82 * 0.6) {
      value = nextValue(value, 82 * 0.45, 0.25, 0.5)
      ticks++
    }
    // 3 s per tick: the drop shows up live on the chart and fires well inside 5 minutes.
    expect(ticks).toBeLessThanOrEqual(6)
  })
})

describe('describeAnomaly', () => {
  it('names the sensor and the drop', () => {
    expect(describeAnomaly('magic-reserve', { kind: 'drop', from: 80, to: 44, percent: 45 })).toBe(
      'Magic reserve fell 45% within 5 minutes (80 → 44 %)',
    )
  })

  it('names the sensor and the deviation', () => {
    expect(
      describeAnomaly('ley-flux', { kind: 'deviation', value: 76, mean: 64, sigmas: 9.2 }),
    ).toBe('Ley-line flux reads 76 Thm, 9.2σ off its 15-minute average of 64 Thm')
  })
})

describe('newAnomaly', () => {
  const at = (second: number, value: number) => ({
    timestamp: new Date(Date.parse('2026-11-24T12:00:00Z') + second * 1000).toISOString(),
    value,
  })
  const dropped = [at(0, 82), at(3, 70), at(6, 58), at(9, 46)]

  it('reports a fresh drop', () => {
    expect(newAnomaly(dropped, null)?.kind).toBe('drop')
  })

  it('stays quiet while the sensor already has an open prediction', () => {
    expect(newAnomaly(dropped, { open: true, timestamp: at(9, 0).timestamp })).toBeNull()
  })

  it('does not re-report a drop that was already predicted and fixed', () => {
    const recovering = [...dropped, at(12, 44), at(15, 48), at(18, 53)]
    expect(newAnomaly(recovering, { open: false, timestamp: at(9, 0).timestamp })).toBeNull()
  })

  it('reports a new drop that happens after the last prediction', () => {
    const again = [...dropped, at(30, 80), at(33, 66), at(36, 47)]
    expect(newAnomaly(again, { open: false, timestamp: at(9, 0).timestamp })?.kind).toBe('drop')
  })
})
