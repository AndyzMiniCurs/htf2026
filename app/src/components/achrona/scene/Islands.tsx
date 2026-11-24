import { Html, Sparkles, useGLTF } from '@react-three/drei'
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

/** Every district island, bobbing on its own phase, with curse crystals hanging from its underside. */
export function Districts({ corrupted }: { corrupted: Set<string> }) {
  return (
    <>
      {DISTRICTS.map((district) => (
        <Island key={district.id} district={district} corrupted={corrupted.has(district.id)} />
      ))}
    </>
  )
}

function Island({ district, corrupted }: { district: District; corrupted: boolean }) {
  const { nodes } = useGLTF(ISLANDS)
  const mesh = nodes[district.node] as THREE.Mesh
  const material = useNightMaterial(mesh.material as THREE.Material)
  // Districts hold still: their villages and rifts stand on them. Only the far islands drift.
  const phase = district.position[0] * 0.37 + district.position[2] * 0.21
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
        depth={district.scale * 14}
        color={corrupted ? LIGHT.ember : LIGHT.curse}
        seed={district.position[0]}
      />
      {district.id !== 'ember' && <Waterfall radius={radius * 0.92} angle={phase} height={18} />}
      <Html
        position={[0, -district.scale * 17, 0]}
        center
        distanceFactor={34}
        zIndexRange={[10, 0]}
        pointerEvents="none"
        className="select-none"
      >
        <span className="title-gothic block whitespace-nowrap text-[1.7rem] opacity-90">
          {district.name}
        </span>
      </Html>
    </group>
  )
}

/** Shards of the Desync growing from the rock underneath an island; ember while a glitch is open there. */
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
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + seed
        const r = radius * (0.25 + ((i * 37) % 10) / 22)
        const s = (0.18 + ((i * 13) % 7) / 18) * (radius / 4.5)
        return {
          position: [Math.cos(a) * r, -depth * (0.35 + ((i * 7) % 5) / 9), Math.sin(a) * r] as [
            number,
            number,
            number,
          ],
          scale: s,
          tilt: (i % 3) * 0.25,
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
          scale={[s.scale, s.scale * 3, s.scale]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2.2}
            flatShading
            toneMapped={false}
          />
        </mesh>
      ))}
      <pointLight
        position={[0, -depth * 0.6, 0]}
        color={color}
        intensity={30}
        distance={radius * 2.2}
        decay={2}
      />
    </group>
  )
}

const FALL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  void main() {
    float lane = floor(vUv.x * 28.0);
    float speed = 0.5 + hash(lane) * 0.7;
    float streak = fract(vUv.y * 2.5 + uTime * speed + hash(lane + 3.0));
    float s = smoothstep(0.0, 0.25, streak) * smoothstep(1.0, 0.6, streak);
    float edges = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    float fade = smoothstep(0.0, 0.55, vUv.y);
    vec3 col = mix(vec3(0.45, 0.55, 1.0), vec3(0.95, 0.9, 1.0), s);
    gl_FragColor = vec4(col * 1.4, edges * fade * (0.25 + 0.6 * s));
  }
`

/** A ribbon of falling water and mist pouring off the island's rim into the cloud sea. */
function Waterfall({ radius, angle, height }: { radius: number; angle: number; height: number }) {
  const material = useShader(
    UV_VERTEX,
    FALL_FRAGMENT,
    { uTime: { value: 0 } },
    { side: THREE.DoubleSide, blending: THREE.AdditiveBlending },
  )
  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
  })
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  return (
    <group position={[x, 0, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <mesh position={[0, -height / 2 + 0.1, 0.35]}>
        <planeGeometry args={[1.8, height, 1, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
      <Sparkles
        count={24}
        scale={[3, 2, 3]}
        position={[0, -height + 1, 0.4]}
        size={5}
        speed={0.6}
        color="#cfd8ff"
        opacity={0.7}
      />
    </group>
  )
}

/** Far islands half lost in the fog, so the world reads as larger than the screen. */
export function DistantIslands({ reducedMotion }: { reducedMotion: boolean }) {
  const { nodes } = useGLTF(ISLANDS)
  const far = useMemo(
    () => [
      { node: 'Island1', position: [-52, -9, -46], scale: 0.3, rotation: 0.4 },
      { node: 'Island2Hole', position: [58, -6, -40], scale: 0.2, rotation: -0.8 },
      { node: 'Round', position: [-62, -4, 18], scale: 0.26, rotation: 1.2 },
      { node: 'X', position: [50, -10, 40], scale: 0.26, rotation: 2.1 },
      { node: 'Flat', position: [6, -7, -64], scale: 0.34, rotation: 0.3 },
      // The 'Small' mesh is authored three times larger than the rest of the pack.
      { node: 'Small', position: [-30, 4, -30], scale: 0.18, rotation: 0 },
      { node: 'Small', position: [-34, -5, 30], scale: 0.22, rotation: 2 },
      { node: 'Small', position: [34, 1, -18], scale: 0.14, rotation: 1 },
    ],
    [],
  )
  const material = useNightMaterial(
    (nodes.Round as THREE.Mesh).material as THREE.Material,
    '#3c2a6e',
  )
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.children.forEach((child, i) => {
      child.position.y = far[i].position[1] + Math.sin(clock.getElapsedTime() * 0.3 + i) * 0.6
    })
  })
  return (
    <group ref={group}>
      {far.map((island, i) => (
        <mesh
          key={i}
          geometry={(nodes[island.node] as THREE.Mesh).geometry}
          material={material}
          position={island.position as [number, number, number]}
          scale={island.scale}
          rotation={[0, island.rotation, 0]}
        />
      ))}
    </group>
  )
}
