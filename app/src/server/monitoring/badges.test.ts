import { describe, expect, it } from 'vitest'
import { badgesFor } from './badges.ts'
import type { Fix } from './badges.ts'

const fix = (type: Fix['type'], minutesToFix = 120): Fix => ({
  type,
  createdAt: '2026-11-24T10:00:00Z',
  fixedAt: new Date(Date.parse('2026-11-24T10:00:00Z') + minutesToFix * 60_000).toISOString(),
})

describe('badgesFor', () => {
  it('gives nothing without fixes', () => {
    expect(badgesFor([])).toEqual([])
  })

  it('awards First Fix for the first fix', () => {
    expect(badgesFor([fix('portal')])).toEqual(['first-fix'])
  })

  it('awards Stabilizer at 10 fixes', () => {
    const nine = Array.from({ length: 9 }, (_, i) => fix(i % 2 ? 'portal' : 'creature'))
    expect(badgesFor(nine)).not.toContain('stabilizer')
    expect(badgesFor([...nine, fix('unknown')])).toContain('stabilizer')
  })

  it('awards Specialist for 5 fixes of one type', () => {
    expect(badgesFor(Array.from({ length: 4 }, () => fix('portal')))).not.toContain('specialist')
    expect(badgesFor(Array.from({ length: 5 }, () => fix('portal')))).toContain('specialist')
  })

  it('awards Rapid Response for a fix within 15 minutes of the glitch appearing', () => {
    expect(badgesFor([fix('creature', 16)])).not.toContain('rapid-response')
    expect(badgesFor([fix('creature', 15)])).toContain('rapid-response')
  })
})
