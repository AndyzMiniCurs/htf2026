import { createServerFn } from '@tanstack/react-start'
import { fixtureMe } from '#/lib/fixtures.ts'
import { loginInput, type Guardian } from '#/lib/guardian.ts'
import { validate } from '#/lib/validate.ts'

export const login = createServerFn({ method: 'POST' })
  .validator(validate(loginInput))
  .handler(async (): Promise<Guardian> => fixtureMe)

export const logout = createServerFn({ method: 'POST' }).handler(async (): Promise<void> => {})

export const getMe = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Guardian | null> => fixtureMe,
)
