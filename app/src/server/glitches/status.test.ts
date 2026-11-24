import { describe, expect, it } from 'vitest'
import { assertAssigneeOrCommander, canReopen, nextStatus } from './status.ts'
import type { Guardian } from '#/lib/guardian.ts'

const nova: Guardian = { guardianId: 2, codename: 'Nova', role: 'defender' }
const orion: Guardian = { guardianId: 3, codename: 'Orion', role: 'defender' }
const aegis: Guardian = { guardianId: 1, codename: 'Aegis', role: 'commander' }

describe('nextStatus', () => {
  it('moves forward exactly one step', () => {
    expect(nextStatus('LEAKED')).toBe('ASSESSING')
    expect(nextStatus('ASSESSING')).toBe('CONTAINING')
    expect(nextStatus('CONTAINING')).toBe('FIXED')
  })

  it('has no step after FIXED', () => {
    expect(nextStatus('FIXED')).toBeNull()
  })

  it('never skips a step, so LEAKED cannot jump to FIXED', () => {
    expect(nextStatus('LEAKED')).not.toBe('FIXED')
  })
})

describe('canReopen', () => {
  it('allows reopening only from FIXED', () => {
    expect(canReopen('FIXED')).toBe(true)
    expect(canReopen('LEAKED')).toBe(false)
    expect(canReopen('ASSESSING')).toBe(false)
    expect(canReopen('CONTAINING')).toBe(false)
  })
})

describe('assertAssigneeOrCommander', () => {
  it('lets the assigned defender and any commander through', () => {
    expect(() => assertAssigneeOrCommander(nova, nova.guardianId)).not.toThrow()
    expect(() => assertAssigneeOrCommander(aegis, nova.guardianId)).not.toThrow()
    expect(() => assertAssigneeOrCommander(aegis, null)).not.toThrow()
  })

  it('rejects a defender who is not assigned with FORBIDDEN', () => {
    expect(() => assertAssigneeOrCommander(orion, nova.guardianId)).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    )
    expect(() => assertAssigneeOrCommander(orion, null)).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    )
  })
})
