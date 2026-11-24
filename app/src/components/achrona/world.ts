import type { GlitchListItem, GlitchStatus } from '#/lib/glitch.ts'

/** One floating island of Achrona. `node` is the mesh name inside FloatingIsland.glb. */
export type District = {
  id: string
  name: string
  node: 'Round' | 'X' | 'L' | 'Flat' | 'Long' | 'Ramp'
  position: [number, number, number]
  scale: number
  rotation: number
}

export const CITADEL: District = {
  id: 'citadel',
  name: 'The Citadel',
  node: 'Round',
  position: [0, 2, 0],
  scale: 0.5,
  rotation: 0,
}

export const DISTRICTS: Array<District> = [
  CITADEL,
  {
    id: 'clocktower',
    name: 'Clocktower Reach',
    node: 'X',
    position: [17, 0.2, -11],
    scale: 0.36,
    rotation: 0.4,
  },
  {
    id: 'archive',
    name: 'Archive Vaults',
    node: 'L',
    position: [-18, 0.8, 9],
    scale: 0.36,
    rotation: -0.6,
  },
  {
    id: 'market',
    name: 'Ley Market',
    node: 'Flat',
    position: [16, 1.2, 13],
    scale: 0.44,
    rotation: 0.2,
  },
  {
    id: 'mill',
    name: 'Mill Hollow',
    node: 'Long',
    position: [-16, -0.6, -13],
    scale: 0.4,
    rotation: 0.7,
  },
  {
    id: 'ember',
    name: 'Ember Ramp',
    node: 'Ramp',
    position: [1, -1.2, 20],
    scale: 0.4,
    rotation: 1.57,
  },
]

/** Half the width of the world plane that glitch map coordinates (0..100) cover. */
const WORLD_HALF = 21

/** A district's centre in map coordinates (0..100), the inverse of the mapping in placeGlitch. */
export function districtMapPoint(district: District): { x: number; y: number } {
  return {
    x: 50 + (district.position[0] / WORLD_HALF) * 50,
    y: 50 + (district.position[2] / WORLD_HALF) * 50,
  }
}

/** Deterministic 0..1 from a string, so a glitch keeps its spot across renders and visitors. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

/** The district nearest to a glitch's map location, and where on that island its rift stands. */
export function placeGlitch(glitch: Pick<GlitchListItem, 'glitchId' | 'location'>): {
  district: District
  position: [number, number, number]
} {
  const loc = glitch.location ?? { x: 50, y: 50 }
  const wx = ((loc.x - 50) / 50) * WORLD_HALF
  const wz = ((loc.y - 50) / 50) * WORLD_HALF
  let district = CITADEL
  let best = Infinity
  for (const d of DISTRICTS) {
    const dist = Math.hypot(d.position[0] - wx, d.position[2] - wz)
    if (dist < best) {
      best = dist
      district = d
    }
  }
  // Spread rifts on the same island around its centre instead of stacking them.
  const angle = hash(glitch.glitchId) * Math.PI * 2
  const radius = district.id === 'citadel' ? 5.2 : 1.6 + hash(`${glitch.glitchId}r`) * 1.2
  return {
    district,
    position: [
      district.position[0] + Math.cos(angle) * radius,
      district.position[1],
      district.position[2] + Math.sin(angle) * radius,
    ],
  }
}

/** Lower is more urgent: a leak outranks an assessment, which outranks containment. */
const URGENCY: Record<GlitchStatus, number> = { LEAKED: 0, ASSESSING: 1, CONTAINING: 2, FIXED: 3 }

export type PlacedRift<TGlitch> = {
  glitch: TGlitch
  position: [number, number, number]
  scale: number
}
export type RiftStorm<TGlitch> = { district: District; rifts: Array<PlacedRift<TGlitch>> }

/**
 * Open glitches gathered per island, so a crowded island reads as one storm instead of a pile of
 * overlapping rifts: the most urgent rift leads, the others stand evenly on a ring sized to the
 * crowd, and they shrink as the island fills.
 */
export function gatherRifts<
  TGlitch extends Pick<GlitchListItem, 'glitchId' | 'location' | 'status'>,
>(glitches: Array<TGlitch>): Array<RiftStorm<TGlitch>> {
  const byDistrict = new Map<string, { district: District; glitches: Array<TGlitch> }>()
  for (const glitch of glitches) {
    if (glitch.status === 'FIXED') continue
    const { district } = placeGlitch(glitch)
    const entry = byDistrict.get(district.id) ?? { district, glitches: [] }
    entry.glitches.push(glitch)
    byDistrict.set(district.id, entry)
  }
  return [...byDistrict.values()].map(({ district, glitches: group }) => {
    group.sort(
      (a, b) => URGENCY[a.status] - URGENCY[b.status] || b.glitchId.localeCompare(a.glitchId),
    )
    const n = group.length
    if (n === 1) {
      const [only] = group
      return { district, rifts: [{ glitch: only, position: placeGlitch(only).position, scale: 1 }] }
    }
    const citadel = district.id === CITADEL.id
    const radius = Math.min(citadel ? 7 : 3.2, (citadel ? 5.2 : 1.8) + 0.25 * (n - 2))
    const scale = n <= 3 ? 1 : Math.max(0.5, 1.6 / Math.sqrt(n))
    const phase = hash(district.id) * Math.PI * 2
    return {
      district,
      rifts: group.map((glitch, i) => {
        const angle = phase + (i / n) * Math.PI * 2
        return {
          glitch,
          scale,
          position: [
            district.position[0] + Math.cos(angle) * radius,
            district.position[1],
            district.position[2] + Math.sin(angle) * radius,
          ] as [number, number, number],
        }
      }),
    }
  })
}
