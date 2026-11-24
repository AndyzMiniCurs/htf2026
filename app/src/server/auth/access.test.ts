import { describe, expect, it } from 'vitest'
import type { Guardian } from '#/lib/guardian.ts'
import { assertCommander, assertGuardian } from './access.ts'

const defender: Guardian = { guardianId: 2, codename: 'Nova', role: 'defender' }
const commander: Guardian = { guardianId: 1, codename: 'Aegis', role: 'commander' }

describe('access rules', () => {
  it('rejects an anonymous call with UNAUTHORIZED', () => {
    expect(() => assertGuardian(null)).toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' }))
    expect(() => assertCommander(null)).toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' }))
  })

  it('rejects a defender on a commander-only function with FORBIDDEN', () => {
    expect(() => assertCommander(defender)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))
  })

  it('lets every signed-in guardian through requireGuardian and commanders through both', () => {
    expect(assertGuardian(defender)).toBe(defender)
    expect(assertGuardian(commander)).toBe(commander)
    expect(assertCommander(commander)).toBe(commander)
  })
})
