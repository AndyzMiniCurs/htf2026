import { Trail } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { BATTLE, SHARD_COUNT } from '../battle.ts'
import {
  BEAST,
  CASTER,
  clamp01,
  easeInCubic,
  easeOutCubic,
  glowTexture,
  nowSeconds,
  textTexture,
} from './shared.ts'
import type { BattleFx } from './shared.ts'

const FLIGHT = 0.3
const REFORM = 1.3

type Orbit = { radius: number; speed: number; phase: number; height: number }
type Bolt = { id: number; shard: number; born: number }
type Impact = { id: number; at: THREE.Vector3; born: number }

type SpellsProps = {
  color: string
  targetIndex: number
  keyboardCast: { nonce: number } | null
  /** No casting during Claude's finisher or after victory. */
  locked: boolean
  fx: BattleFx
  reducedMotion: boolean
  onHit: (shard: number) => void
  onMiss: () => void
}

/**
 * The weak points and the spells that break them. A cast reserves its shard, flies for a
 * moment, and only on impact does the hit count, so the health bar drops with the blast.
 */
export function Spells({
  color,
  targetIndex,
  keyboardCast,
  locked,
  fx,
  reducedMotion,
  onHit,
  onMiss,
}: SpellsProps) {
  const [bolts, setBolts] = useState<Array<Bolt>>([])
  const [impacts, setImpacts] = useState<Array<Impact>>([])
  const shards = useRef<Array<THREE.Group | null>>([])
  // Per shard: when it shatters (bolt arrival) and when it has re-formed.
  const shatterAt = useRef<Array<number>>(Array<number>(SHARD_COUNT).fill(0))
  const reformAt = useRef<Array<number>>(Array<number>(SHARD_COUNT).fill(0))
  const nextId = useRef(0)

  const orbits = useMemo<Array<Orbit>>(
    () =>
      Array.from({ length: SHARD_COUNT }, (_, i) => ({
        radius: 3.6 + (i % 3) * 0.8,
        speed: (0.4 + (i % 2) * 0.22) * (i % 2 ? -1 : 1),
        phase: (i / SHARD_COUNT) * Math.PI * 2,
        height: BEAST.y - 1.6 + ((i * 7) % 5) * 0.75,
      })),
    [],
  )

  function cast(index: number) {
    const now = nowSeconds()
    if (locked || now < reformAt.current[index]) {
      onMiss()
      return
    }
    shatterAt.current[index] = now + FLIGHT
    reformAt.current[index] = now + FLIGHT + REFORM
    setBolts((all) => [...all, { id: nextId.current++, shard: index, born: now }])
  }

  function land(bolt: Bolt) {
    const shard = shards.current[bolt.shard]
    const at = shard ? shard.getWorldPosition(new THREE.Vector3()) : BEAST.clone()
    setBolts((all) => all.filter((b) => b.id !== bolt.id))
    setImpacts((all) => [
      ...all.filter((e) => nowSeconds() - e.born < 1.2),
      { id: nextId.current++, at, born: nowSeconds() },
    ])
    fx.pulse = 1
    if (!reducedMotion) fx.shake = Math.min(1, fx.shake + 0.35)
    onHit(bolt.shard)
  }

  // Keyboard casts go to the aimed shard, once per cast.
  useEffect(() => {
    if (keyboardCast) cast(targetIndex)
  }, [keyboardCast?.nonce])

  return (
    <group>
      {orbits.map((orbit, i) => (
        <Shard
          key={i}
          ref={(g) => {
            shards.current[i] = g
          }}
          orbit={orbit}
          color={color}
          aimed={i === targetIndex && !locked}
          gone={locked}
          shatterAt={shatterAt}
          reformAt={reformAt}
          index={i}
          reducedMotion={reducedMotion}
          onStrike={() => cast(i)}
        />
      ))}
      {bolts.map((bolt) => (
        <Projectile
          key={bolt.id}
          born={bolt.born}
          target={() => shards.current[bolt.shard] ?? null}
          color={color}
          onLand={() => land(bolt)}
        />
      ))}
      {impacts.map((impact) => (
        <Blast
          key={impact.id}
          at={impact.at}
          born={impact.born}
          color={color}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  )
}

function Shard({
  ref,
  orbit,
  color,
  aimed,
  gone,
  shatterAt,
  reformAt,
  index,
  reducedMotion,
  onStrike,
}: {
  ref: (g: THREE.Group | null) => void
  orbit: Orbit
  color: string
  aimed: boolean
  /** Shards dissolve once the fight is over. */
  gone: boolean
  shatterAt: { current: Array<number> }
  reformAt: { current: Array<number> }
  index: number
  reducedMotion: boolean
  onStrike: () => void
}) {
  const group = useRef<THREE.Group | null>(null)
  const crystal = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const t = nowSeconds()
    const a = orbit.phase + t * orbit.speed * (reducedMotion ? 0.35 : 1)
    group.current?.position.set(
      BEAST.x + Math.cos(a) * orbit.radius,
      orbit.height + Math.sin(t * 1.3 + orbit.phase) * 0.35,
      BEAST.z + Math.sin(a) * orbit.radius,
    )
    if (crystal.current) {
      const shattered = t >= shatterAt.current[index] && t < reformAt.current[index]
      const grow = clamp01((t - reformAt.current[index]) / 0.3)
      crystal.current.visible = !shattered && !gone
      crystal.current.scale.setScalar(
        easeOutCubic(grow || 1) * (1 + Math.sin(t * 5 + index) * 0.06),
      )
      crystal.current.rotation.y = t * 1.8
    }
    if (ring.current) {
      ring.current.visible = aimed
      ring.current.rotation.z = t * 2
    }
  })
  return (
    <group
      ref={(g) => {
        group.current = g
        ref(g)
      }}
    >
      <group ref={crystal}>
        <mesh scale={[0.32, 0.62, 0.32]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={color}
            emissiveIntensity={3.2}
            flatShading
            toneMapped={false}
          />
        </mesh>
        <sprite scale={1.7}>
          <spriteMaterial
            map={glowTexture()}
            color={color}
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      </group>
      {/* The gold reticle of the keyboard aim. */}
      <mesh ref={ring}>
        <torusGeometry args={[0.95, 0.045, 8, 6]} />
        <meshBasicMaterial color="#ffd98a" toneMapped={false} />
      </mesh>
      {/* A generous invisible target: fingers are bigger than shards. */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onStrike()
        }}
        onPointerOver={() => (document.body.style.cursor = 'crosshair')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <sphereGeometry args={[1.05, 12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** A bolt of light homing on its shard along a short arc, with a trail. */
function Projectile({
  born,
  target,
  color,
  onLand,
}: {
  born: number
  target: () => THREE.Group | null
  color: string
  onLand: () => void
}) {
  const head = useRef<THREE.Group>(null)
  const landed = useRef(false)
  const to = useMemo(() => new THREE.Vector3(), [])
  const trailColor = useMemo(() => new THREE.Color(color).multiplyScalar(2), [color])
  useFrame(() => {
    const t = clamp01((nowSeconds() - born) / FLIGHT)
    target()?.getWorldPosition(to)
    if (head.current) {
      head.current.position.lerpVectors(CASTER, to, easeInCubic(t) * 0.6 + t * 0.4)
      head.current.position.y += Math.sin(t * Math.PI) * 1.4
    }
    if (t >= 1 && !landed.current) {
      landed.current = true
      onLand()
    }
  })
  return (
    <Trail width={1.6} length={5} color={trailColor} attenuation={(w) => w * w}>
      <group ref={head} position={CASTER}>
        <mesh>
          <sphereGeometry args={[0.16, 12, 8]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <sprite scale={1.3}>
          <spriteMaterial
            map={glowTexture()}
            color={color}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      </group>
    </Trail>
  )
}

const FRAGMENTS = 9

/** Where a spell lands: a flash, a ring, flying crystal fragments and the damage number. */
function Blast({
  at,
  born,
  color,
  reducedMotion,
}: {
  at: THREE.Vector3
  born: number
  color: string
  reducedMotion: boolean
}) {
  const flash = useRef<THREE.Sprite>(null)
  const ring = useRef<THREE.Mesh>(null)
  const pieces = useRef<THREE.Group>(null)
  const number = useRef<THREE.Sprite>(null)
  const label = useMemo(() => textTexture(`-${BATTLE.spellDamage}`, '#ffb347', 800), [])
  const velocities = useMemo(
    () =>
      Array.from({ length: FRAGMENTS }, () =>
        new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(4 + Math.random() * 4),
      ),
    [],
  )
  useFrame(({ camera }) => {
    const age = nowSeconds() - born
    const life = clamp01(age / 0.9)
    if (flash.current) {
      flash.current.scale.setScalar(0.5 + easeOutCubic(clamp01(age / 0.2)) * 3)
      flash.current.material.opacity = 1 - clamp01(age / 0.3)
    }
    if (ring.current) {
      ring.current.lookAt(camera.position)
      ring.current.scale.setScalar(
        0.3 + easeOutCubic(clamp01(age / 0.45)) * (reducedMotion ? 1 : 2.2),
      )
      const m = ring.current.material
      if (m instanceof THREE.MeshBasicMaterial) m.opacity = 1 - clamp01(age / 0.45)
    }
    if (pieces.current) {
      pieces.current.visible = !reducedMotion && life < 1
      pieces.current.children.forEach((piece, i) => {
        const v = velocities[i]
        piece.position.set(v.x * age, v.y * age - 9 * age * age, v.z * age)
        piece.rotation.set(age * 9 + i, age * 7, 0)
        piece.scale.setScalar(0.14 * (1 - life))
      })
    }
    if (number.current) {
      number.current.position.y = 0.6 + easeOutCubic(life) * 1.4
      number.current.material.opacity = 1 - clamp01((age - 0.5) / 0.4)
      const pop = 1 + Math.max(0, 0.6 - age * 4)
      number.current.scale.set(0.9 * label.aspect * pop, 0.9 * pop, 1)
    }
  })
  return (
    <group position={at}>
      <sprite ref={flash}>
        <spriteMaterial
          map={glowTexture()}
          color={color}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <mesh ref={ring}>
        <ringGeometry args={[0.6, 0.7, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={pieces}>
        {velocities.map((_, i) => (
          <mesh key={i}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={i % 3 ? color : '#ffffff'} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <sprite ref={number}>
        <spriteMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  )
}
