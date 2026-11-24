import { createServerFn } from '@tanstack/react-start'
import { fixtureNotificationPrefs } from '#/lib/fixtures.ts'
import { notificationPrefsSchema, type NotificationPrefs } from '#/lib/monitoring.ts'
import { validate } from '#/lib/validate.ts'

export const getNotificationPrefs = createServerFn({ method: 'GET' }).handler(
  async (): Promise<NotificationPrefs> => fixtureNotificationPrefs,
)

export const setNotificationPrefs = createServerFn({ method: 'POST' })
  .validator(validate(notificationPrefsSchema))
  .handler(async ({ data }): Promise<NotificationPrefs> => data)
