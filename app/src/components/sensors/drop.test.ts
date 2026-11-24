import { describe, expect, it } from 'vitest'
import { steepestDrop } from './drop.ts'

const at = (minute: number, value: number) => ({
  timestamp: new Date(Date.UTC(2026, 10, 24, 12, minute)).toISOString(),
  value,
})

describe('steepestDrop', () => {
  it('finds a 40% fall inside five minutes', () => {
    const drop = steepestDrop([at(0, 80), at(1, 79), at(3, 60), at(4, 44), at(6, 45)])
    expect(drop).toMatchObject({ percent: 45, minutes: 4 })
  })

  it('ignores the same fall when it took longer than the window', () => {
    expect(steepestDrop([at(0, 80), at(4, 70), at(8, 60), at(12, 44)])).toBeNull()
  })

  it('ignores small dips', () => {
    expect(steepestDrop([at(0, 80), at(1, 70), at(2, 75)])).toBeNull()
  })
})
