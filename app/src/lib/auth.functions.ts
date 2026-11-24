import { createServerFn } from '@tanstack/react-start'
import { loginInput, type Guardian } from '#/lib/guardian.ts'
import { validate } from '#/lib/validate.ts'
import * as auth from '#/server/auth/auth.service.ts'

export const login = createServerFn({ method: 'POST' })
  .validator(validate(loginInput))
  .handler(async ({ data }): Promise<Guardian> => auth.login(data))

export const logout = createServerFn({ method: 'POST' }).handler(async (): Promise<void> => auth.logout())

export const getMe = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Guardian | null> => auth.getMe(),
)
