import { createServerFn } from '@tanstack/react-start'
import { AppError } from '#/lib/errors.ts'
import { fixtureGuardians } from '#/lib/fixtures.ts'
import { createGuardianInput, setGuardianRoleInput, type Guardian } from '#/lib/guardian.ts'
import { validate } from '#/lib/validate.ts'

export const listGuardians = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Guardian[]> => fixtureGuardians,
)

export const createGuardian = createServerFn({ method: 'POST' })
  .validator(validate(createGuardianInput))
  .handler(
    async ({ data }): Promise<Guardian> => ({ guardianId: 99, codename: data.codename, role: data.role }),
  )

export const setGuardianRole = createServerFn({ method: 'POST' })
  .validator(validate(setGuardianRoleInput))
  .handler(async ({ data }): Promise<Guardian> => {
    const guardian = fixtureGuardians.find((g) => g.guardianId === data.guardianId)
    if (!guardian) throw new AppError('NOT_FOUND', 'Guardian not found')
    return { ...guardian, role: data.role }
  })
