export const ERROR_CODES = ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION', 'CONFLICT'] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

/** The only error services throw on purpose. Its message is safe to show to users. */
export class AppError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

/** Errors lose their class crossing the server boundary, so read the code structurally. */
export function getErrorCode(error: unknown): ErrorCode | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null
  const code = (error as { code: unknown }).code
  return ERROR_CODES.includes(code as ErrorCode) ? (code as ErrorCode) : null
}
