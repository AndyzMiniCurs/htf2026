import { createMiddleware } from '@tanstack/react-start'
import { assertCommander, assertGuardian } from './access.ts'
import { currentGuardian } from './session.ts'

/** Every server function except login/getMe/logout: puts the signed-in guardian on `context.guardian`. */
export const requireGuardian = createMiddleware({ type: 'function' }).server(async ({ next }) =>
  next({ context: { guardian: assertGuardian(await currentGuardian()) } }),
)

/** Commander-only server functions. */
export const requireCommander = createMiddleware({ type: 'function' })
  .middleware([requireGuardian])
  .server(async ({ next, context }) =>
    next({ context: { guardian: assertCommander(context.guardian) } }),
  )
