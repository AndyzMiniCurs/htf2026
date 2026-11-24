import { describe, expect, it } from 'vitest'
import { CITADEL, DISTRICTS, districtMapPoint, gatherRifts, placeGlitch } from './world.ts'

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

describe('gatherRifts', () => {
  const at = (glitchId: string, status: 'LEAKED' | 'ASSESSING' | 'CONTAINING' | 'FIXED') => ({
    glitchId,
    status,
    location: null,
  })

  it('gathers rifts on the same island into one storm led by the most urgent', () => {
    const storms = gatherRifts([
      at('GL-0001', 'CONTAINING'),
      at('GL-0002', 'LEAKED'),
      at('GL-0003', 'ASSESSING'),
      { glitchId: 'GL-0004', status: 'LEAKED' as const, location: { x: 72, y: 28 } },
    ])
    expect(storms).toHaveLength(2)
    const citadel = storms.find((s) => s.district.id === 'citadel')
    expect(citadel?.rifts.map((r) => r.glitch.glitchId)).toEqual(['GL-0002', 'GL-0003', 'GL-0001'])
  })

  it('leaves fixed glitches out', () => {
    expect(gatherRifts([at('GL-0001', 'FIXED')])).toEqual([])
  })

  it('keeps every rift of a crowded island apart, and shrinks them', () => {
    const crowd = Array.from({ length: 12 }, (_, i) => at(`GL-${1000 + i}`, 'LEAKED'))
    const [storm] = gatherRifts(crowd)
    const rifts = storm.rifts
    expect(rifts).toHaveLength(12)
    for (const [i, a] of rifts.entries()) {
      expect(a.scale).toBeLessThan(1)
      for (const b of rifts.slice(i + 1)) {
        const gap = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2])
        expect(gap).toBeGreaterThan(3)
      }
    }
  })
})
