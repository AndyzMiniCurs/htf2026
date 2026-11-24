import { describe, expect, it } from 'vitest'
import { parseReportEchoForm } from './echo.ts'

const form = (fields: Record<string, string | File>) => {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

describe('parseReportEchoForm', () => {
  it('trims the description and builds the location from x and y', () => {
    expect(parseReportEchoForm(form({ description: '  Time loop  ', x: '40', y: '60' }))).toEqual({
      description: 'Time loop',
      location: { x: 40, y: 60 },
      image: null,
    })
  })

  it('treats empty x/y and an empty file input as absent', () => {
    const result = parseReportEchoForm(
      form({ description: 'Portal flicker', x: '', y: '', image: new File([], '') }),
    )
    expect(result).toMatchObject({ location: null, image: null })
  })

  it('passes a real file through for the image checks', () => {
    const photo = new File([new Uint8Array([1, 2, 3])], 'photo.png')
    expect(parseReportEchoForm(form({ description: 'Photo', image: photo })).image).toBe(photo)
  })

  it('names the field when the description is too short', () => {
    expect(() => parseReportEchoForm(form({ description: 'ab' }))).toThrow(
      expect.objectContaining({
        code: 'VALIDATION',
        message: expect.stringMatching(/^description: /),
      }),
    )
  })

  it('rejects a location outside the map or with only one coordinate', () => {
    expect(() => parseReportEchoForm(form({ description: 'Far away', x: '120', y: '5' }))).toThrow(
      expect.objectContaining({ code: 'VALIDATION', message: expect.stringMatching(/^x: /) }),
    )
    expect(() => parseReportEchoForm(form({ description: 'Half', x: '12' }))).toThrow(
      expect.objectContaining({ message: 'x: Location needs both x and y' }),
    )
  })
})
