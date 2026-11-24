import type { GlitchListItem } from '#/lib/glitch.ts'

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
