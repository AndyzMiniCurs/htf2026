import { describe, expect, it } from 'vitest'
import { backoffDelay } from './useLiveEvents.ts'

describe('backoffDelay', () => {
  it('doubles from one second', () => {
    expect([0, 1, 2, 3].map(backoffDelay)).toEqual([1000, 2000, 4000, 8000])
  })

  it('never waits longer than thirty seconds', () => {
    expect(backoffDelay(10)).toBe(30_000)
  })
})
