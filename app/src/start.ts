import { createSerializationAdapter } from '@tanstack/react-router'
import { createStart } from '@tanstack/react-start'
import { AppError, type ErrorCode } from '#/lib/errors.ts'

// Without this, errors thrown by server functions reach the client as plain Errors without `code`.
const appErrorAdapter = createSerializationAdapter({
  key: 'app-error',
  test: (value): value is AppError => value instanceof AppError,
  toSerializable: (error) => ({ code: error.code, message: error.message }),
  fromSerializable: (value: { code: ErrorCode; message: string }) =>
    new AppError(value.code, value.message),
})

export const startInstance = createStart(() => ({
  serializationAdapters: [appErrorAdapter],
}))
