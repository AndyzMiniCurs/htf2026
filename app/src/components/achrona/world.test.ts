import { describe, expect, it } from 'vitest'
import { CITADEL, DISTRICTS, districtMapPoint, placeGlitch } from './world.ts'

describe('placeGlitch', () => {
  it('puts a glitch on the district nearest to its map location', () => {
    expect(placeGlitch({ glitchId: 'GL-0142', location: { x: 72, y: 28 } }).district.id).toBe(
      'clocktower',
    )
    expect(placeGlitch({ glitchId: 'GL-0139', location: { x: 20, y: 70 } }).district.id).toBe(
      'archive',
    )
  })

  it('falls back to the citadel when a glitch has no location', () => {
    expect(placeGlitch({ glitchId: 'GL-0001', location: null }).district).toBe(CITADEL)
  })

  it('gives the same glitch the same spot every time', () => {
    const glitch = { glitchId: 'GL-0200', location: { x: 10, y: 10 } }
    expect(placeGlitch(glitch).position).toEqual(placeGlitch(glitch).position)
  })

  it('places a glitch at a district map point on that district', () => {
    for (const district of DISTRICTS) {
      const location = districtMapPoint(district)
      expect(placeGlitch({ glitchId: 'GL-0300', location }).district.id).toBe(district.id)
    }
  })
})
