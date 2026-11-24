import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribe } from '../events/bus.ts'
import * as repo from './notifications.repository.ts'
import { notifyAssigned, notifyLockdown, notifyStatus } from './notifications.service.ts'
import type { Envelope } from '../events/bus.ts'

vi.mock('./notifications.repository.ts', () => ({
  DEFAULT_PREFS: { onAssigned: true, onStatus: true, onLockdown: true },
  findPrefs: vi.fn(),
  savePrefs: vi.fn(),
  listAllPrefs: vi.fn(),
  findReporters: vi.fn(),
  findPrefsFor: vi.fn(),
}))

const on = { onAssigned: true, onStatus: true, onLockdown: true }
const off = { onAssigned: false, onStatus: false, onLockdown: false }

let sent: Array<Envelope> = []
beforeEach(() => {
  vi.resetAllMocks()
  sent = []
})
subscribe((envelope) => sent.push(envelope))

describe('notifications', () => {
  it('notifies the assignee only, when assignment notifications are on', async () => {
    vi.mocked(repo.findPrefs).mockResolvedValue(on)
    await notifyAssigned('GL-0142', 2)

    expect(sent).toEqual([
      {
        to: 2,
        event: {
          type: 'notification',
          notification: {
            kind: 'assigned',
            text: 'GL-0142 has been assigned to you',
            glitchId: 'GL-0142',
          },
        },
      },
    ])
  })

  it('stays silent when the assignee turned assignment notifications off', async () => {
    vi.mocked(repo.findPrefs).mockResolvedValue(off)
    await notifyAssigned('GL-0142', 2)
    expect(sent).toEqual([])
  })

  it('tells each reporter about a status change, respecting their own preference', async () => {
    vi.mocked(repo.findReporters).mockResolvedValue([3, 4])
    vi.mocked(repo.findPrefsFor).mockResolvedValue(
      new Map([
        [3, on],
        [4, off],
      ]),
    )
    await notifyStatus('GL-0139', 'CONTAINING', 2)

    expect(repo.findReporters).toHaveBeenCalledWith('GL-0139', 2)
    expect(sent.map((e) => e.to)).toEqual([3])
    expect(sent[0]?.event).toMatchObject({ notification: { kind: 'status' } })
  })

  it('broadcasts lockdown to everyone who wants it', async () => {
    vi.mocked(repo.listAllPrefs).mockResolvedValue([
      { guardianId: 1, ...on },
      { guardianId: 2, ...off },
      { guardianId: 3, ...on },
    ])
    await notifyLockdown(true)
    expect(sent.map((e) => e.to)).toEqual([1, 3])
  })

  it('never fails the write that triggered it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(repo.findPrefs).mockRejectedValue(new Error('db down'))
    await expect(notifyAssigned('GL-0142', 2)).resolves.toBeUndefined()
    warn.mockRestore()
  })
})
