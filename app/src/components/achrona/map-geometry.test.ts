import { describe, expect, it } from 'vitest'
import { coastline, fromView, gridRef, spreadMarkers, sweepPhase, toView } from './map-geometry.ts'

describe('chart coordinates', () => {
  it('round-trips map coordinates through the chart', () => {
    for (const v of [0, 13.5, 50, 100]) expect(fromView(toView(v))).toBeCloseTo(v)
  })
})

describe('coastline', () => {
  it('is a closed path that stays the same for the same island', () => {
    const a = coastline('citadel', 50, 50, 10)
    expect(a.startsWith('M')).toBe(true)
    expect(a.endsWith('Z')).toBe(true)
    expect(coastline('citadel', 50, 50, 10)).toBe(a)
    expect(coastline('market', 50, 50, 10)).not.toBe(a)
  })
})

describe('gridRef', () => {
  it('names the A–J / 1–10 square of a map point', () => {
    expect(gridRef(0, 0)).toBe('A1')
    expect(gridRef(45, 67)).toBe('E7')
    expect(gridRef(100, 100)).toBe('J10')
  })
})

describe('sweepPhase', () => {
  it('measures a clockwise turn from north', () => {
    expect(sweepPhase(50, 50, 50, 10)).toBeCloseTo(0)
    expect(sweepPhase(50, 50, 90, 50)).toBeCloseTo(0.25)
    expect(sweepPhase(50, 50, 50, 90)).toBeCloseTo(0.5)
    expect(sweepPhase(50, 50, 10, 50)).toBeCloseTo(0.75)
  })
})

describe('spreadMarkers', () => {
  it('parts markers that sit on top of each other', () => {
    const spread = spreadMarkers(
      [
        { id: 'GL-1', x: 50, y: 50 },
        { id: 'GL-2', x: 50, y: 50 },
        { id: 'GL-3', x: 50.5, y: 50.2 },
      ],
      6,
    )
    for (const [i, a] of spread.entries()) {
      for (const b of spread.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(5.9)
      }
    }
  })

  it('leaves markers that are already apart where they are', () => {
    const markers = [
      { id: 'GL-1', x: 10, y: 10 },
      { id: 'GL-2', x: 80, y: 70 },
    ]
    expect(spreadMarkers(markers, 6)).toEqual(markers)
  })
})
