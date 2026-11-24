import { describe, expect, it } from 'vitest'
import { detectAnomaly } from './anomaly.ts'
import type { Reading } from './anomaly.ts'

const START = Date.parse('2026-11-24T12:00:00Z')

/** One reading every 3 s, oldest first. */
const series = (values: Array<number>): Array<Reading> =>
  values.map((value, i) => ({ timestamp: new Date(START + i * 3000).toISOString(), value }))

const calm = (n: number, around = 80) =>
  Array.from({ length: n }, (_, i) => around + (i % 2 === 0 ? 0.5 : -0.5))

describe('detectAnomaly', () => {
  it('says nothing about a calm sensor', () => {
    expect(detectAnomaly(series(calm(300)))).toBeNull()
    expect(detectAnomaly([])).toBeNull()
  })

  it('flags the spec example: magic reserve 80 → 44 within 5 minutes', () => {
    expect(detectAnomaly(series([...calm(50), 70, 60, 50, 44]))).toEqual({
      kind: 'drop',
      from: 80.5,
      to: 44,
      percent: 45,
    })
  })

  it('ignores a 40% drop spread over more than 5 minutes', () => {
    // 150 readings × 3 s = 7.5 min from 80 down to 47: never 40% inside one 5-minute window.
    const slow = Array.from({ length: 150 }, (_, i) => 80 - (33 * i) / 149)
    expect(detectAnomaly(series(slow))?.kind).not.toBe('drop')
  })

  it('flags a value more than 3σ and 8 units away from the last 15 minutes', () => {
    const result = detectAnomaly(series([...calm(100), 92]))
    expect(result).toMatchObject({ kind: 'deviation', value: 92, mean: 80 })
  })

  it('does not page on a 3σ wiggle of a very quiet sensor', () => {
    // σ = 0.5, so 2 units is 4σ, but far below the 8-unit floor.
    expect(detectAnomaly(series([...calm(100), 82]))).toBeNull()
  })

  it('needs enough history before judging deviations', () => {
    expect(detectAnomaly(series([...calm(5), 95]))).toBeNull()
  })
})
