import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { DISTRICTS } from '../world.ts'
import { House, LIGHT, Prop } from './kit.tsx'
import type * as THREE from 'three'
import type { District } from '../world.ts'

type Spot = [number, number, number]
const at = (d: District, dx: number, dz: number): Spot => [
  d.position[0] + dx,
  d.position[1],
  d.position[2] + dz,
]

/** Settlements on the district islands, lit by lanterns and fireflies. */
export function Villages({ reducedMotion }: { reducedMotion: boolean }) {
  const [, clock, archive, market, mill, ember] = DISTRICTS as [
    District,
    District,
    District,
    District,
    District,
    District,
  ]
  const lanterns: Array<Spot> = [
    at(market, 0.4, 2),
    at(archive, -1, -1.2),
    at(clock, 1.4, 1),
    at(mill, -1.2, 0.6),
    at(ember, 0.6, -0.4),
  ]
  return (
    <group>
      {/* Clocktower Reach */}
      <House
        position={at(clock, 0, -0.6)}
        floors={5}
        wall="wall-window-round"
        roof="roof-high-point"
        scale={1.1}
      />
      <House position={at(clock, -2.2, 1.2)} wall="wall-wood-window-glass" door="wall-wood-door" />
      <House
        position={at(clock, 2.2, -1.8)}
        floors={2}
        wall="wall-window-shutters"
        roof="roof-high-gable"
      />
      <Prop name="tree-high" position={at(clock, 2.6, 1.8)} />
      <Prop name="tree-crooked" position={at(clock, -2.8, -1.6)} />
      {/* Archive Vaults */}
      <House
        position={at(archive, 0.4, 0.2)}
        floors={3}
        wall="wall"
        roof="roof-high-gable"
        scale={1.1}
      />
      <House
        position={at(archive, 1.6, 0.2)}
        floors={3}
        wall="wall-window-round"
        roof="roof-high-gable"
        scale={1.1}
      />
      <House
        position={at(archive, -1.4, 1.8)}
        floors={2}
        wall="wall-window-shutters"
        roof="roof-point"
      />
      <Prop name="tree-crooked" position={at(archive, -2.6, -1.4)} />
      {/* Ley Market */}
      <Prop name="fountain-round-detail" position={at(market, 0, 0)} scale={1.1} />
      <Prop name="stall-red" position={at(market, -2, -1.2)} rotation={[0, 0.6, 0]} />
      <Prop name="stall-green" position={at(market, 2, -1.2)} rotation={[0, -0.6, 0]} />
      <Prop name="stall-red" position={at(market, 2.2, 1.4)} rotation={[0, -2.4, 0]} />
      <Prop name="cart" position={at(market, -2.2, 1.6)} rotation={[0, 1.2, 0]} />
      <House
        position={at(market, -0.4, -3)}
        floors={2}
        wall="wall-wood-window-glass"
        door="wall-wood-door"
        roof="roof-high-gable"
      />
      <House
        position={at(market, 3.2, -0.2)}
        wall="wall-wood-window-glass"
        door="wall-wood-door"
        roof="roof-gable"
        rotation={-Math.PI / 2}
      />
      {/* Mill Hollow */}
      <MillTower position={at(mill, 0, 0)} reducedMotion={reducedMotion} />
      <House position={at(mill, 1.8, 2)} wall="wall-wood" door="wall-wood-door" />
      <House
        position={at(mill, -1.6, -2.2)}
        wall="wall-wood-window-glass"
        door="wall-wood-door"
        roof="roof-point"
      />
      <Prop name="tree" position={at(mill, -1.6, 2.8)} />
      {/* Ember Ramp */}
      <House
        position={at(ember, -1, -1.4)}
        wall="wall-wood-window-glass"
        door="wall-wood-door"
        roof="roof-point"
      />
      <House position={at(ember, 1.2, 1.8)} floors={2} wall="wall" roof="roof-high-point" />
      <Prop name="rock-large" position={at(ember, 1.6, -1)} scale={0.8} />
      <Prop name="tree-high-round" position={at(ember, -1.8, 1.6)} />

      {lanterns.map((p) => (
        <group key={p.join()} position={p}>
          <Prop name="lantern" />
          <pointLight
            position={[0, 1.6, 0]}
            color={LIGHT.lantern}
            intensity={6}
            distance={5}
            decay={2}
          />
        </group>
      ))}
      {/* Fireflies drifting over the settlements. */}
      {[market, clock, archive].map((d) => (
        <Sparkles
          key={d.id}
          count={26}
          scale={[7, 3, 7]}
          position={[d.position[0], d.position[1] + 1.8, d.position[2]]}
          size={2.2}
          speed={reducedMotion ? 0 : 0.4}
          color={LIGHT.lantern}
        />
      ))}
    </group>
  )
}

function MillTower({ position, reducedMotion }: { position: Spot; reducedMotion: boolean }) {
  const sails = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (sails.current && !reducedMotion) sails.current.rotation.x += delta * 0.6
  })
  return (
    <group position={position}>
      <House position={[0, 0, 0]} floors={4} wall="wall" roof="roof-high-point" />
      <group ref={sails} position={[0.62, 3.2, 0]} scale={1.3}>
        <Prop name="windmill" />
      </group>
    </group>
  )
}
