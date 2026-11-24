import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { FAMILIAR } from './familiar.ts'
import type * as THREE from 'three'
import type { ComponentProps } from 'react'

/** One voxel of the familiar. Units are voxels; the group scales them. */
function Voxel({
  position,
  size,
  color = FAMILIAR.color,
  glow = 0.25,
}: {
  position: [number, number, number]
  size: [number, number, number]
  color?: string
  glow?: number
}) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glow}
        roughness={0.55}
        flatShading
      />
    </mesh>
  )
}

const LEGS: Array<number> = [-3, -1.15, 1.15, 3]

/**
 * Claude, the voxel familiar: a blocky orange body with two dark eye slits, stubby arms
 * and four little legs. Idles with a bob, a leg shuffle and a blink.
 */
export function ClaudeFamiliar({
  animate = true,
  ...props
}: { animate?: boolean } & ComponentProps<'group'>) {
  const body = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const legs = useRef<Array<THREE.Mesh | null>>([])

  useFrame(({ clock }) => {
    if (!animate) return
    const t = clock.getElapsedTime()
    if (body.current) body.current.position.y = Math.abs(Math.sin(t * 3.2)) * 0.35
    // A quick blink every few seconds.
    if (eyes.current) eyes.current.scale.y = t % 3.4 < 0.12 ? 0.15 : 1
    legs.current.forEach((leg, i) => {
      if (leg) leg.position.y = -0.55 + Math.max(0, Math.sin(t * 6.4 + i * Math.PI * 0.5)) * 0.25
    })
  })

  return (
    <group {...props}>
      <group ref={body}>
        {/* Body: a wide block, slightly deeper at the base. */}
        <Voxel position={[0, 2.5, 0]} size={[8, 4, 3.4]} />
        <Voxel position={[0, 0.75, 0]} size={[8, 1.5, 3]} glow={0.18} />
        {/* Stubby arms on both sides at mid height. */}
        <Voxel position={[-4.6, 2.2, 0]} size={[1.2, 1.1, 1.6]} />
        <Voxel position={[4.6, 2.2, 0]} size={[1.2, 1.1, 1.6]} />
        {/* Two tall dark eye slits on the front face. */}
        <group ref={eyes} position={[0, 2.9, 1.72]}>
          <Voxel position={[-1.6, 0, 0]} size={[0.7, 1.6, 0.12]} color="#1a1410" glow={0} />
          <Voxel position={[1.6, 0, 0]} size={[0.7, 1.6, 0.12]} color="#1a1410" glow={0} />
        </group>
      </group>
      {/* Four little legs. */}
      {LEGS.map((x, i) => (
        <mesh
          key={x}
          ref={(m) => {
            legs.current[i] = m
          }}
          position={[x, -0.55, 0]}
          castShadow
        >
          <boxGeometry args={[0.9, 1.1, 1.4]} />
          <meshStandardMaterial
            color={FAMILIAR.color}
            emissive={FAMILIAR.color}
            emissiveIntensity={0.18}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}
