import { createSerializationAdapter } from '@tanstack/react-router'
import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { AppError } from '#/lib/errors.ts'
import { rejectOversizedBody } from '#/server/http/body-limit.ts'
import type { ErrorCode } from '#/lib/errors.ts'

// Without this, errors thrown by server functions reach the client as plain Errors without `code`.
const appErrorAdapter = createSerializationAdapter({
  key: 'app-error',
  test: (value): value is AppError => value instanceof AppError,
  toSerializable: (error) => ({ code: error.code, message: error.message }),
  fromSerializable: (value: { code: ErrorCode; message: string }) =>
    new AppError(value.code, value.message),
})

/** Refuses oversized uploads from the headers, before Start buffers the body in memory. */
const bodyLimitMiddleware = createMiddleware().server(
  async ({ request, next }) => rejectOversizedBody(request) ?? next(),
)

// Declaring requestMiddleware replaces Start's default, so the CSRF check must be listed here.
const csrfMiddleware = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })

export const startInstance = createStart(() => ({
  serializationAdapters: [appErrorAdapter],
  requestMiddleware: [bodyLimitMiddleware, csrfMiddleware],
}))
