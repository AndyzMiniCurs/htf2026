import { createServerFn } from '@tanstack/react-start'
import { notificationPrefsSchema } from '#/lib/monitoring.ts'
import { validate } from '#/lib/validate.ts'
import { requireGuardian } from '#/server/auth/middleware.ts'
import * as notifications from '#/server/notifications/notifications.service.ts'
import type { NotificationPrefs } from '#/lib/monitoring.ts'

export const getNotificationPrefs = createServerFn({ method: 'GET' })
  .middleware([requireGuardian])
  .handler(async ({ context }): Promise<NotificationPrefs> =>
    notifications.getPrefs(context.guardian.guardianId),
  )

export const setNotificationPrefs = createServerFn({ method: 'POST' })
  .middleware([requireGuardian])
  .validator(validate(notificationPrefsSchema))
  .handler(async ({ data, context }): Promise<NotificationPrefs> =>
    notifications.setPrefs(context.guardian.guardianId, data),
  )
