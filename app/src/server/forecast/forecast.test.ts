import { describe, expect, it } from 'vitest'
import { generateHistory } from '#/db/history.ts'
import {
  HORIZON,
  HOUR_MS,
  dataset,
  featuresAt,
  hourlySeries,
  meanAbsoluteError,
  projectMagic,
  seasonalAverage,
  survival,
} from './features.ts'
import { chooseDefender, pressureMode, skillProfiles } from './staffing.ts'
import type { Candidate } from './staffing.ts'

const start = Date.parse('2026-11-02T00:00:00')
const at = (hours: number) => new Date(start + hours * HOUR_MS + 60_000).toISOString()

describe('hourlySeries', () => {
  it('counts incidents and their drain per hour', () => {
    const series = hourlySeries(
      [
        { openedAt: at(0), type: 'portal', fixedAt: null },
        { openedAt: at(0), type: 'sensor-fault', fixedAt: null },
        { openedAt: at(2), type: 'magic-drain', fixedAt: null },
        { openedAt: at(9), type: 'portal', fixedAt: null },
      ],
      start,
      3,
    )
    expect(series.counts).toEqual([2, 0, 1])
    expect(series.pressure).toEqual([13 + 5, 0, 15])
  })
})

describe('dataset', () => {
  it('pairs each hour with the next HORIZON hours and equal-length features', () => {
    const series = hourlySeries([], start, 60)
    const { inputs, targets } = dataset(series)
    expect(inputs.length).toBe(targets.length)
    expect(targets.every((row) => row.length === HORIZON)).toBe(true)
    expect(new Set(inputs.map((row) => row.length)).size).toBe(1)
    expect(featuresAt(series, 30)).toHaveLength(inputs[0]?.length ?? 0)
  })
})

describe('seasonalAverage', () => {
  it('averages the same weekday and hour across weeks', () => {
    const series = hourlySeries(
      [
        { openedAt: at(20), type: 'portal', fixedAt: null },
        { openedAt: at(20 + 168), type: 'portal', fixedAt: null },
        { openedAt: at(20 + 168), type: 'portal', fixedAt: null },
      ],
      start,
      336,
    )
    const average = seasonalAverage(series, 336)
    expect(average(start + 20 * HOUR_MS)).toBeCloseTo(1.5)
    expect(average(start + 21 * HOUR_MS)).toBe(0)
  })
})

describe('meanAbsoluteError', () => {
  it('averages the absolute gaps', () => {
    expect(meanAbsoluteError([[1, 2]], [[2, 0]])).toBe(1.5)
  })
})

describe('survival and projectMagic', () => {
  it('drains with new glitches and recovers as they get sealed', () => {
    const stillOpen = survival([
      { openedAt: at(0), type: 'portal', fixedAt: at(1.5) },
      { openedAt: at(0), type: 'portal', fixedAt: at(0.5) },
    ])
    expect(stillOpen.slice(0, 3)).toEqual([1, 0.5, 0])
    // One portal glitch arrives in hour 0 and nothing is open now.
    expect(projectMagic(0, [1, 0, 0], [13, 13, 13], stillOpen)).toEqual([87, 94, 100])
  })
})

describe('pressureMode', () => {
  it('calls a storm, a lull, or steady hours', () => {
    expect(pressureMode(30, 20, 60)).toBe('storm')
    expect(pressureMode(10, 20, 60)).toBe('calm')
    expect(pressureMode(20, 20, 60)).toBe('steady')
    expect(pressureMode(20, 20, 15)).toBe('storm')
  })
})

describe('skillProfiles', () => {
  it('rates the faster, more practised defender higher at a type', () => {
    const fixes = [
      ...Array.from({ length: 12 }, () => ({
        guardianId: 1,
        type: 'portal' as const,
        minutes: 30,
      })),
      ...Array.from({ length: 12 }, () => ({
        guardianId: 2,
        type: 'portal' as const,
        minutes: 90,
      })),
    ]
    const skills = skillProfiles([1, 2, 3], fixes)
    const portal = (id: number) => skills.get(id)?.portal.skill ?? 0
    expect(portal(1)).toBeGreaterThan(portal(2))
    expect(portal(3)).toBe(0.3)
    expect(skills.get(1)?.portal.fixes).toBe(12)
  })
})

describe('chooseDefender', () => {
  const expert: Candidate = { guardianId: 1, codename: 'Orion', skill: 0.9, openCount: 0, ai: null }
  const learner: Candidate = { guardianId: 2, codename: 'Lyra', skill: 0.3, openCount: 0, ai: null }

  it('sends the expert into a storm', () => {
    expect(chooseDefender('storm', [learner, expert])).toMatchObject({
      guardianId: 1,
      reason: 'best-for-storm',
    })
  })

  it('gives a lull to the least practised free defender as a training quest', () => {
    expect(chooseDefender('calm', [expert, learner])).toMatchObject({
      guardianId: 2,
      reason: 'training-quest',
    })
  })

  it('counts a defender as free with at most one quest more than the lightest load', () => {
    const busyLearner = { ...learner, openCount: 2 }
    const lightExpert = { ...expert, openCount: 1 }
    expect(chooseDefender('calm', [lightExpert, busyLearner])).toMatchObject({
      guardianId: 2,
      reason: 'training-quest',
    })
  })

  it('does not call it training when the only free defender is the expert', () => {
    const swamped = { ...learner, openCount: 5 }
    expect(chooseDefender('calm', [expert, swamped])).toMatchObject({
      guardianId: 1,
      reason: 'best-available',
    })
  })

  it('spreads load: a busy expert loses to a free one in steady hours', () => {
    const busy = { ...expert, openCount: 4 }
    const second = { ...learner, skill: 0.6 }
    expect(chooseDefender('steady', [busy, second])?.guardianId).toBe(2)
  })

  it('has no one to pick without defenders', () => {
    expect(chooseDefender('storm', [])).toBeNull()
  })
})

describe('generateHistory', () => {
  it('writes the same weeks every run, with evenings busier than nights', () => {
    const now = Date.parse('2026-11-24T12:00:00')
    const rows = generateHistory(now, 2)
    expect(generateHistory(now, 2)).toEqual(rows)
    const hourOf = (iso: string) => new Date(iso).getHours()
    const evening = rows.filter((r) => hourOf(r.openedAt) >= 19 && hourOf(r.openedAt) <= 21)
    const night = rows.filter((r) => hourOf(r.openedAt) >= 2 && hourOf(r.openedAt) <= 4)
    expect(evening.length).toBeGreaterThan(night.length * 3)
    expect(rows.every((r) => r.fixedAt > r.openedAt)).toBe(true)
  })
})
