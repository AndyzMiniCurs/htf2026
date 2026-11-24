import { describe, expect, it } from 'vitest'
import { magicLevel } from './magic.ts'

describe('magicLevel', () => {
  it('is 100 when every glitch is fixed or there are none', () => {
    expect(magicLevel([])).toBe(100)
    expect(magicLevel([{ status: 'FIXED', type: 'magic-drain' }])).toBe(100)
  })

  it('drops to 90 for one LEAKED glitch of normal severity', () => {
    expect(magicLevel([{ status: 'LEAKED', type: 'unknown' }])).toBe(90)
  })

  it('weighs by stage and type', () => {
    expect(magicLevel([{ status: 'CONTAINING', type: 'creature' }])).toBe(96)
    expect(magicLevel([{ status: 'LEAKED', type: 'magic-drain' }])).toBe(85)
    expect(magicLevel([{ status: 'ASSESSING', type: 'sensor-fault' }])).toBe(97)
  })

  it('never goes below 0', () => {
    expect(
      magicLevel(Array.from({ length: 20 }, () => ({ status: 'LEAKED', type: 'portal' }))),
    ).toBe(0)
  })
})
