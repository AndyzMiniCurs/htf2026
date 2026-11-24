import { Sparkles, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DISTRICTS } from '../world.ts'
import { ISLANDS, LIGHT, UV_VERTEX, useNightMaterial, useShader } from './kit.tsx'
import type { District } from '../world.ts'

/** Approximate top-surface radius of each island mesh before scaling. */
const ISLAND_RADIUS: Record<District['node'], number> = {
  Round: 15.5,
  X: 13,
  L: 11,
  Flat: 9.6,
  Long: 7.5,
  Ramp: 7.5,
}

/** Where each island's falls pour over the rim, as world angles around the island centre. */
const FALLS: Record<string, Array<number>> = {
  citadel: [0.55, 3.4],
  clocktower: [1.2],
  archive: [0.9],
  market: [0.3, 1.9],
  mill: [1.6],
  ember: [0.4],
}

/** Every district island, with its waterfalls and curse crystals hanging from its underside. */
export function Districts({ corrupted }: { corrupted: Set<string> }) {
  return (
    <>
      {DISTRICTS.map((district) => (
        <Island key={district.id} district={district} corrupted={corrupted.has(district.id)} />
      ))}
    </>
  )
}

// Districts hold still: their villages and rifts stand on them. Only the far islands drift.
function Island({ district, corrupted }: { district: District; corrupted: boolean }) {
  const { nodes } = useGLTF(ISLANDS)
  const mesh = nodes[district.node] as THREE.Mesh
  const material = useNightMaterial(mesh.material as THREE.Material)
  const radius = ISLAND_RADIUS[district.node] * district.scale
  return (
    <group position={district.position}>
      <mesh
        geometry={mesh.geometry}
        material={material}
        scale={district.scale}
        rotation={[0, district.rotation, 0]}
        castShadow
        receiveShadow
      />
      <HangingCrystals
        radius={radius}
        depth={district.scale * 13}
        color={corrupted ? LIGHT.ember : LIGHT.curse}
        seed={district.position[0]}
      />
      {(FALLS[district.id] ?? []).map((angle) => (
        <Waterfall
          key={angle}
          geometry={mesh.geometry}
          scale={district.scale}
          rotation={district.rotation}
          angle={angle}
          height={10 + district.scale * 30}
        />
      ))}
    </group>
  )
}

/**
 * The outermost point of an island's top surface in a world direction, so a fall starts
 * exactly on the lip of the rock instead of floating beside it.
 */
function rimPoint(geometry: THREE.BufferGeometry, scale: number, rotation: number, angle: number) {
  const position = geometry.getAttribute('position')
  let maxY = -Infinity
  for (let i = 0; i < position.count; i++) maxY = Math.max(maxY, position.getY(i))
  // Undo the island's own rotation so the search happens in mesh space.
  const local = angle + rotation
  const dir = new THREE.Vector2(Math.cos(local), Math.sin(local))
  let best = new THREE.Vector3()
  let bestReach = -Infinity
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    if (y < maxY - 1.2) continue
    const x = position.getX(i)
    const z = position.getZ(i)
    const reach = x * dir.x + z * dir.y
    // Stay on the ray: discard points far off to the side of the chosen direction.
    const side = Math.abs(x * dir.y - z * dir.x)
    if (reach > bestReach && side < 1.5) {
      bestReach = reach
      best = new THREE.Vector3(x, y, z)
    }
  }
  return best.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation).multiplyScalar(scale)
}

const FALL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  void main() {
    // Many thin lanes of water at their own speeds; uv.y = 1 at the lip, 0 at the bottom.
    float lane = floor(vUv.x * 36.0);
    float speed = 0.9 + hash(lane) * 0.9;
    float streak = fract(vUv.y * 3.0 + uTime * speed + hash(lane + 7.0));
    float body = smoothstep(0.0, 0.35, streak) * smoothstep(1.0, 0.55, streak);
    float width = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
    float lip = smoothstep(1.0, 0.94, vUv.y);
    float fade = smoothstep(0.0, 0.75, vUv.y);
    vec3 water = mix(vec3(0.28, 0.45, 1.0), vec3(0.8, 0.88, 1.0), body);
    // Magic in the water: a violet sheen near the bottom where it dissolves into mist.
    water = mix(vec3(0.75, 0.45, 1.0), water, fade);
    gl_FragColor = vec4(water * 1.1, width * lip * fade * (0.12 + 0.45 * body));
  }
`

const MIST_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    gl_FragColor = vec4(vec3(0.7, 0.72, 1.0), pow(max(1.0 - d, 0.0), 2.2) * 0.32);
  }
`

/** A ribbon of water pouring off the island's lip, ending in a glowing mist cloud. */
function Waterfall({
  geometry,
  scale,
  rotation,
  angle,
  height,
}: {
  geometry: THREE.BufferGeometry
  scale: number
  rotation: number
  angle: number
  height: number
}) {
  const lip = useMemo(
    () => rimPoint(geometry, scale, rotation, angle),
    [geometry, scale, rotation, angle],
  )
  const water = useShader(
    UV_VERTEX,
    FALL_FRAGMENT,
    { uTime: { value: 0 } },
    { side: THREE.DoubleSide, blending: THREE.AdditiveBlending },
  )
  const mist = useShader(UV_VERTEX, MIST_FRAGMENT, {}, { blending: THREE.AdditiveBlending })
  useFrame((_, delta) => {
    water.uniforms.uTime.value += delta
  })
  // Face outward from the island so the fall is seen from outside the rock.
  const facing = Math.atan2(lip.x, lip.z)
  const width = 0.55 + scale * 1.3
  return (
    <group position={[lip.x, lip.y, lip.z]} rotation={[0, facing, 0]}>
      <mesh position={[0, -height / 2, 0.25]}>
        <planeGeometry args={[width, height]} />
        <primitive object={water} attach="material" />
      </mesh>
      <mesh position={[0, -height + 0.5, 0.6]} scale={width * 3}>
        <planeGeometry />
        <primitive object={mist} attach="material" />
      </mesh>
      <Sparkles
        count={18}
        scale={[width * 1.6, 2, 1.5]}
        position={[0, -height + 1, 0.6]}
        size={3}
        speed={0.7}
        color="#d8d4ff"
        opacity={0.8}
      />
    </group>
  )
}

/**
 * Shards of the Desync growing out of the rock underneath an island, kept inside the
 * rock's footprint so they read as part of it. Ember while a glitch is open on the island.
 */
function HangingCrystals({
  radius,
  depth,
  color,
  seed,
}: {
  radius: number
  depth: number
  color: string
  seed: number
}) {
  const shards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + seed
        const r = radius * (0.12 + ((i * 37) % 10) / 34)
        const s = (0.14 + ((i * 13) % 7) / 26) * (radius / 4.5)
        return {
          position: [Math.cos(a) * r, -depth * (0.45 + ((i * 7) % 5) / 12), Math.sin(a) * r] as [
            number,
            number,
            number,
          ],
          scale: s,
          tilt: ((i % 3) - 1) * 0.2,
        }
      }),
    [radius, depth, seed],
  )
  return (
    <group>
      {shards.map((s, i) => (
        <mesh
          key={i}
          position={s.position}
          rotation={[Math.PI + s.tilt, i, s.tilt]}
          scale={[s.scale, s.scale * 3.2, s.scale]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.6}
            flatShading
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

const FAR_ISLANDS: Array<{
  node: string
  position: [number, number, number]
  scale: number
  rotation: number
}> = [
  { node: 'Island1', position: [-58, -6, -52], scale: 0.32, rotation: 0.4 },
  { node: 'Island2Hole', position: [64, -3, -46], scale: 0.22, rotation: -0.8 },
  { node: 'Round', position: [-70, -1, 14], scale: 0.28, rotation: 1.2 },
  { node: 'X', position: [62, -8, 30], scale: 0.26, rotation: 2.1 },
  { node: 'Flat', position: [4, -4, -76], scale: 0.36, rotation: 0.3 },
  // The 'Small' mesh is authored three times larger than the rest of the pack.
  { node: 'Small', position: [-34, 6, -36], scale: 0.16, rotation: 0 },
  { node: 'Small', position: [38, 3, -24], scale: 0.13, rotation: 1 },
]

/** Far islands half lost in the haze, so the world reads as larger than the frame. */
export function DistantIslands({ reducedMotion }: { reducedMotion: boolean }) {
  const { nodes } = useGLTF(ISLANDS)
  const material = useNightMaterial(
    (nodes.Round as THREE.Mesh).material as THREE.Material,
    '#2a1c52',
  )
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    // One child per FAR_ISLANDS entry, in the same order.
    group.current.children.forEach((child, i) => {
      child.position.y =
        FAR_ISLANDS[i].position[1] + Math.sin(clock.getElapsedTime() * 0.3 + i) * 0.6
    })
  })
  return (
    <group ref={group}>
      {FAR_ISLANDS.map((island, i) => (
        <mesh
          key={i}
          geometry={(nodes[island.node] as THREE.Mesh).geometry}
          material={material}
          position={island.position}
          scale={island.scale}
          rotation={[0, island.rotation, 0]}
        />
      ))}
    </group>
  )
}
