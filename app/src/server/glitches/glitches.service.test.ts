import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as repo from './glitches.repository.ts'
import { advanceStatus, reopenGlitch } from './glitches.service.ts'
import type { GlitchListItem } from '#/lib/glitch.ts'
import type { Guardian } from '#/lib/guardian.ts'

vi.mock('./glitches.repository.ts', () => ({
  findGlitchState: vi.fn(),
  updateGlitchStatus: vi.fn(),
  findGlitchListItem: vi.fn(),
}))

const aegis: Guardian = { guardianId: 1, codename: 'Aegis', role: 'commander' }
const nova: Guardian = { guardianId: 2, codename: 'Nova', role: 'defender' }
const item = { glitchId: 'GL-0200' } as GlitchListItem

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(repo.updateGlitchStatus).mockResolvedValue(true)
  vi.mocked(repo.findGlitchListItem).mockResolvedValue(item)
})

const state = (overrides: Partial<Awaited<ReturnType<typeof repo.findGlitchState>>>) => ({
  status: 'CONTAINING' as const,
  assignedGuardianId: null,
  mergedInto: null,
  ...overrides,
})

describe('advanceStatus', () => {
  it('credits the fix to the assignee, even when a commander closes it', async () => {
    vi.mocked(repo.findGlitchState).mockResolvedValue(
      state({ assignedGuardianId: nova.guardianId }),
    )

    await advanceStatus(aegis, 'GL-0200')

    expect(repo.updateGlitchStatus).toHaveBeenCalledWith(
      'GL-0200',
      'CONTAINING',
      'FIXED',
      expect.objectContaining({ fixedBy: nova.guardianId }),
    )
  })

  it('credits nobody when an unassigned glitch is fixed', async () => {
    vi.mocked(repo.findGlitchState).mockResolvedValue(state({}))

    await advanceStatus(aegis, 'GL-0200')

    expect(repo.updateGlitchStatus).toHaveBeenCalledWith(
      'GL-0200',
      'CONTAINING',
      'FIXED',
      expect.objectContaining({ fixedBy: null }),
    )
  })

  it('records no fix data for steps before FIXED', async () => {
    vi.mocked(repo.findGlitchState).mockResolvedValue(state({ status: 'LEAKED' }))

    await advanceStatus(aegis, 'GL-0200')

    expect(repo.updateGlitchStatus).toHaveBeenCalledWith('GL-0200', 'LEAKED', 'ASSESSING', null)
  })

  it('reports a concurrent change as CONFLICT', async () => {
    vi.mocked(repo.findGlitchState).mockResolvedValue(state({ status: 'LEAKED' }))
    vi.mocked(repo.updateGlitchStatus).mockResolvedValue(false)

    await expect(advanceStatus(aegis, 'GL-0200')).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('refuses to move a merged glitch', async () => {
    vi.mocked(repo.findGlitchState).mockResolvedValue(state({ mergedInto: 'GL-0139' }))

    await expect(advanceStatus(aegis, 'GL-0200')).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(repo.updateGlitchStatus).not.toHaveBeenCalled()
  })
})

describe('reopenGlitch', () => {
  it('clears the fix data when going back to LEAKED', async () => {
    vi.mocked(repo.findGlitchState).mockResolvedValue(state({ status: 'FIXED' }))

    await reopenGlitch('GL-0200')

    expect(repo.updateGlitchStatus).toHaveBeenCalledWith('GL-0200', 'FIXED', 'LEAKED', null)
  })
})
