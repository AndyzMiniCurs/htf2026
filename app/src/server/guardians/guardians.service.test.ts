import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Guardian } from '#/lib/guardian.ts'
import * as repo from './guardians.repository.ts'
import { createGuardian, setGuardianRole } from './guardians.service.ts'
import { wouldRemoveLastCommander } from './roles.ts'

vi.mock('./guardians.repository.ts', () => ({
  listGuardians: vi.fn(),
  insertGuardian: vi.fn(),
  findGuardianById: vi.fn(),
  countCommanders: vi.fn(),
  updateGuardianRole: vi.fn(),
}))

const aegis: Guardian = { guardianId: 1, codename: 'Aegis', role: 'commander' }
const nova: Guardian = { guardianId: 2, codename: 'Nova', role: 'defender' }

beforeEach(() => vi.resetAllMocks())

describe('wouldRemoveLastCommander', () => {
  it('blocks demoting the only commander', () => {
    expect(wouldRemoveLastCommander('commander', 'defender', 1)).toBe(true)
  })
  it('allows demoting a commander when another one remains', () => {
    expect(wouldRemoveLastCommander('commander', 'defender', 2)).toBe(false)
  })
  it('allows promotions and no-op changes', () => {
    expect(wouldRemoveLastCommander('defender', 'commander', 1)).toBe(false)
    expect(wouldRemoveLastCommander('commander', 'commander', 1)).toBe(false)
  })
})

describe('createGuardian', () => {
  it('stores a hash, never the password, and returns the public guardian', async () => {
    vi.mocked(repo.insertGuardian).mockResolvedValue({
      guardianId: 5,
      codename: 'Vega',
      role: 'defender',
    })

    const created = await createGuardian({
      codename: 'Vega',
      password: 'vega-2026!',
      role: 'defender',
    })

    expect(created).toEqual({ guardianId: 5, codename: 'Vega', role: 'defender' })
    const stored = vi.mocked(repo.insertGuardian).mock.calls[0]?.[0]
    expect(stored?.passwordHash).toMatch(/^scrypt\$/)
    expect(JSON.stringify(stored)).not.toContain('vega-2026!')
  })

  it('rejects a duplicate codename with "Codename taken"', async () => {
    vi.mocked(repo.insertGuardian).mockRejectedValue(
      Object.assign(new Error('Failed query'), { cause: { code: '23505' } }),
    )

    await expect(
      createGuardian({ codename: 'Nova', password: 'whatever-1', role: 'defender' }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'Codename taken',
    })
  })
})

describe('setGuardianRole', () => {
  it('rejects demoting the last commander and changes nothing', async () => {
    vi.mocked(repo.findGuardianById).mockResolvedValue(aegis)
    vi.mocked(repo.countCommanders).mockResolvedValue(1)

    await expect(setGuardianRole({ guardianId: 1, role: 'defender' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    expect(repo.updateGuardianRole).not.toHaveBeenCalled()
  })

  it('promotes a defender', async () => {
    vi.mocked(repo.findGuardianById).mockResolvedValue(nova)
    vi.mocked(repo.countCommanders).mockResolvedValue(1)
    vi.mocked(repo.updateGuardianRole).mockResolvedValue({ ...nova, role: 'commander' })

    expect(await setGuardianRole({ guardianId: 2, role: 'commander' })).toEqual({
      ...nova,
      role: 'commander',
    })
  })

  it('reports an unknown guardian as NOT_FOUND', async () => {
    vi.mocked(repo.findGuardianById).mockResolvedValue(null)
    await expect(setGuardianRole({ guardianId: 9, role: 'commander' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
