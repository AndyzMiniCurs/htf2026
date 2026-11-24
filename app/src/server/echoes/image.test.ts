import { describe, expect, it } from 'vitest'
import { detectImageMime, readEchoImage } from './image.ts'

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d])
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])
const webp = new TextEncoder().encode('RIFF\x24\x00\x00\x00WEBPVP8 ')
const pdf = new TextEncoder().encode('%PDF-1.7\n')

describe('detectImageMime', () => {
  it('recognises JPEG, PNG and WebP by their magic bytes', () => {
    expect(detectImageMime(jpeg)).toBe('image/jpeg')
    expect(detectImageMime(png)).toBe('image/png')
    expect(detectImageMime(webp)).toBe('image/webp')
  })

  it('rejects anything else, whatever its name or claimed type', () => {
    expect(detectImageMime(pdf)).toBeNull()
    expect(detectImageMime(new Uint8Array())).toBeNull()
  })
})

describe('readEchoImage', () => {
  it('returns the detected mime, not the claimed one', async () => {
    const file = new File([png], 'photo.jpg', { type: 'image/jpeg' })
    expect((await readEchoImage(file)).mime).toBe('image/png')
  })

  it('rejects a PDF disguised as an image', async () => {
    const file = new File([pdf], 'photo.png', { type: 'image/png' })
    await expect(readEchoImage(file)).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  it('rejects files over 5 MB', async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1)
    big.set(png)
    await expect(readEchoImage(new File([big], 'big.png'))).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'image: Images can be at most 5 MB',
    })
  })
})
