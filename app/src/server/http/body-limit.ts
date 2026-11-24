import { ECHO_IMAGE_MAX_BYTES } from '#/lib/echo.ts'

/** The largest body we accept: one echo image plus room for the other form fields. */
export const MAX_REQUEST_BYTES = ECHO_IMAGE_MAX_BYTES + 1024 * 1024

/**
 * Start reads a whole request body into memory before any server function code runs, so the
 * size must be refused from the headers. Returns the error response, or null to let it through.
 */
export function rejectOversizedBody(request: Request): Response | null {
  if (request.method === 'GET' || request.method === 'HEAD' || request.body === null) return null
  const length = request.headers.get('content-length')
  // Browsers always send a length for fetch/FormData bodies; without one the size is unbounded.
  if (length === null) return new Response('Length required', { status: 411 })
  const bytes = Number(length)
  if (Number.isSafeInteger(bytes) && bytes >= 0 && bytes <= MAX_REQUEST_BYTES) return null
  return new Response('Payload too large', { status: 413 })
}
