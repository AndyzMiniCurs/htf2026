import { describe, expect, it } from 'vitest'
import { canLift, nextLockdown } from './lockdown.ts'

const off = { on: false, auto: false }
const manual = { on: true, auto: false }
const auto = { on: true, auto: true }

describe('nextLockdown', () => {
  it('locks the city down when magic falls under 20%', () => {
    expect(nextLockdown(19, off)).toEqual(auto)
  })

  it('keeps a commander lockdown manual when magic falls', () => {
    expect(nextLockdown(5, manual)).toEqual(manual)
  })

  it('lifts its own lockdown once magic is back at 20%', () => {
    expect(nextLockdown(20, auto)).toEqual(off)
  })

  it('never lifts a lockdown a commander declared', () => {
    expect(nextLockdown(80, manual)).toEqual(manual)
  })

  it('changes nothing while magic stays healthy', () => {
    expect(nextLockdown(64, off)).toEqual(off)
  })
})

describe('canLift', () => {
  it('refuses to lift under 20% and allows it from 20%', () => {
    expect(canLift(19)).toBe(false)
    expect(canLift(20)).toBe(true)
  })
})
