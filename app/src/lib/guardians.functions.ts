import { createServerFn } from '@tanstack/react-start'
import { createGuardianInput, setGuardianRoleInput, type Guardian } from '#/lib/guardian.ts'
import { validate } from '#/lib/validate.ts'
import { requireCommander } from '#/server/auth/middleware.ts'
import * as guardians from '#/server/guardians/guardians.service.ts'

export const listGuardians = createServerFn({ method: 'GET' })
  .middleware([requireCommander])
  .handler(async (): Promise<Guardian[]> => guardians.listGuardians())

export const createGuardian = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(createGuardianInput))
  .handler(async ({ data }): Promise<Guardian> => guardians.createGuardian(data))

export const setGuardianRole = createServerFn({ method: 'POST' })
  .middleware([requireCommander])
  .validator(validate(setGuardianRoleInput))
  .handler(async ({ data }): Promise<Guardian> => guardians.setGuardianRole(data))
