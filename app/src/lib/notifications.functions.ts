import { createServerFn } from '@tanstack/react-start'
import { fixtureNotificationPrefs } from '#/lib/fixtures.ts'
import { notificationPrefsSchema } from '#/lib/monitoring.ts'
import { validate } from '#/lib/validate.ts'
import { requireGuardian } from '#/server/auth/middleware.ts'
import type { NotificationPrefs } from '#/lib/monitoring.ts'

export const getNotificationPrefs = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .handler(async (): Promise<NotificationPrefs> => fixtureNotificationPrefs)

export const setNotificationPrefs = createServerFn({ method: 'POST' })
  .middleware([requireGuardian])
  .validator(validate(notificationPrefsSchema))
  .handler(async ({ data }): Promise<NotificationPrefs> => data)
