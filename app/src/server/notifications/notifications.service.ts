import { publish } from '../events/bus.ts'
import * as repo from './notifications.repository.ts'
import type { GlitchStatus } from '#/lib/glitch.ts'
import type { Notification } from '#/lib/live-events.ts'
import type { NotificationPrefs } from '#/lib/monitoring.ts'

export async function getPrefs(guardianId: number): Promise<NotificationPrefs> {
  return repo.findPrefs(guardianId)
}

export async function setPrefs(
  guardianId: number,
  prefs: NotificationPrefs,
): Promise<NotificationPrefs> {
  await repo.savePrefs(guardianId, prefs)
  return prefs
}

const send = (guardianId: number, notification: Notification) =>
  publish({ type: 'notification', notification }, guardianId)

// Notifications are a side effect of a write that already succeeded: a failure here is logged,
// never turned into an error for the guardian who made the change.
async function safely(task: () => Promise<void>): Promise<void> {
  try {
    await task()
  } catch (error) {
    console.warn('Sending notifications failed', error)
  }
}

/** The new assignee hears about it, if they want assignment notifications. */
export async function notifyAssigned(glitchId: string, assigneeId: number): Promise<void> {
  await safely(async () => {
    if ((await repo.findPrefs(assigneeId)).onAssigned) {
      send(assigneeId, {
        kind: 'assigned',
        text: `${glitchId} has been assigned to you`,
        glitchId,
      })
    }
  })
}

/** Everyone who reported on the glitch hears about its new status, except whoever changed it. */
export async function notifyStatus(
  glitchId: string,
  status: GlitchStatus,
  changedBy: number,
): Promise<void> {
  await safely(async () => {
    const reporters = await repo.findReporters(glitchId, changedBy)
    const prefs = await repo.findPrefsFor(reporters)
    for (const guardianId of reporters) {
      if (prefs.get(guardianId)?.onStatus) {
        send(guardianId, {
          kind: 'status',
          text: `${glitchId} you reported is now ${status}`,
          glitchId,
        })
      }
    }
  })
}

/** Every guardian who wants it hears that lockdown started or ended. */
export async function notifyLockdown(on: boolean): Promise<void> {
  await safely(async () => {
    for (const { guardianId, onLockdown } of await repo.listAllPrefs()) {
      if (onLockdown) {
        send(guardianId, {
          kind: 'lockdown',
          text: on
            ? 'Lockdown: The Desync is attacking Achrona'
            : 'Lockdown lifted, Achrona is calm again',
        })
      }
    }
  })
}
