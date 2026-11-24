import { ECHO_IMAGE_MAX_BYTES } from '#/lib/echo.ts'
import { AppError } from '#/lib/errors.ts'
import type { EchoImageMime } from '#/lib/echo.ts'

const startsWith = (bytes: Uint8Array, signature: Array<number>, offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b)

/** The real type from the file's first bytes; the client-sent mime type is not trusted. */
export function detectImageMime(bytes: Uint8Array): EchoImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return 'image/webp'
  return null
}

/** Reads and checks an uploaded image: at most 5 MB, JPEG/PNG/WebP by magic bytes. */
export async function readEchoImage(file: File): Promise<{ mime: EchoImageMime; bytes: Buffer }> {
  if (file.size > ECHO_IMAGE_MAX_BYTES)
    throw new AppError('VALIDATION', 'image: Images can be at most 5 MB')
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.length > ECHO_IMAGE_MAX_BYTES)
    throw new AppError('VALIDATION', 'image: Images can be at most 5 MB')
  const mime = detectImageMime(bytes)
  if (!mime) throw new AppError('VALIDATION', 'image: Only JPEG, PNG or WebP images are allowed')
  return { mime, bytes }
}
