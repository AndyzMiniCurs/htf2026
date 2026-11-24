import { Line, Sparkles, Trail } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { SHARD_COUNT } from './battle.ts'
import { ClaudeFamiliar } from './ClaudeFamiliar.tsx'

const CREATURE = new THREE.Vector3(0, 3.2, 0)
const CASTER = new THREE.Vector3(0, 0.6, 9)

export type BattleSceneProps = {
  /** The glitch kind's colour. */
  color: string
  /** 0..1 */
  health: number
  /** Keyboard aim: which shard a cast from the keyboard goes to. */
  targetIndex: number
  /** A keyboard cast; the nonce changes on every cast. */
  keyboardCast: { nonce: number } | null
  /** Time (ms) Claude was summoned, or null. */
  summonedAt: number | null
  won: boolean
  reducedMotion: boolean
  lowPower: boolean
  onHit: (shard: number) => void
  onMiss: () => void
}

/** The sealing battle arena: the glitch as a crystal creature, its weak-point shards, spells and Claude. */
export default function BattleScene(props: BattleSceneProps) {
  return (
    <Canvas
      dpr={props.lowPower ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [0, 5, 13], fov: 42 }}
      gl={{ antialias: false }}
      onPointerMissed={() => props.onMiss()}
    >
      <color attach="background" args={['#070912']} />
      <fog attach="fog" args={['#070912', 14, 30]} />
      <hemisphereLight args={['#8f9cff', '#160f24', 0.9]} />
      <pointLight position={[0, 6, 6]} intensity={40} color="#ffffff" distance={30} />
      <Arena color={props.color} reducedMotion={props.reducedMotion} />
      <Battlefield {...props} />
      <Sparkles
        count={props.lowPower ? 40 : 90}
        scale={[18, 9, 10]}
        position={[0, 4, 0]}
        size={2.5}
        speed={props.reducedMotion ? 0 : 0.4}
        color={props.color}
      />
      <CameraRig shakeOn={props.keyboardCast?.nonce} reducedMotion={props.reducedMotion} />
      {!props.lowPower && (
        <EffectComposer>
          <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.6} radius={0.7} />
          <Vignette offset={0.2} darkness={0.85} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

function Arena({ color, reducedMotion }: { color: string; reducedMotion: boolean }) {
  const runes = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (runes.current && !reducedMotion) runes.current.rotation.z += delta * 0.15
  })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[11, 72]} />
        <meshStandardMaterial color="#10142a" roughness={0.95} />
      </mesh>
      <mesh ref={runes} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[6.2, 6.45, 120]} />
        <meshBasicMaterial color="#e0b66a" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[3, 3.12, 96]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

type Effect = { id: number; to: THREE.Vector3; born: number; kind: 'bolt' | 'burst' }

function Battlefield({
  color,
  health,
  targetIndex,
  keyboardCast,
  summonedAt,
  won,
  reducedMotion,
  onHit,
  onMiss,
}: BattleSceneProps) {
  const [effects, setEffects] = useState<Array<Effect>>([])
  const [broken, setBroken] = useState<Array<number>>(() => Array<number>(SHARD_COUNT).fill(0))
  const shardRefs = useRef<Array<THREE.Group | null>>([])
  const nextId = useRef(0)
  const clock = useThree((s) => s.clock)

  const orbits = useMemo(
    () =>
      Array.from({ length: SHARD_COUNT }, (_, i) => ({
        radius: 3.2 + (i % 3) * 0.7,
        speed: (0.45 + (i % 2) * 0.25) * (i % 2 ? -1 : 1),
        phase: (i / SHARD_COUNT) * Math.PI * 2,
        height: 1.2 + ((i * 7) % 5) * 0.75,
      })),
    [],
  )

  function strike(index: number) {
    const now = clock.getElapsedTime()
    const shard = shardRefs.current[index]
    if (won || !shard || broken[index] > now) {
      onMiss()
      return
    }
    const at = shard.getWorldPosition(new THREE.Vector3())
    setBroken((all) => all.map((t, i) => (i === index ? now + 1.2 : t)))
    setEffects((all) => [
      ...all.filter((e) => now - e.born < 0.6),
      { id: nextId.current++, to: at, born: now, kind: 'bolt' },
      { id: nextId.current++, to: at, born: now, kind: 'burst' },
    ])
    onHit(index)
  }

  // Keyboard casts go to the aimed shard.
  useEffect(() => {
    if (keyboardCast) strike(targetIndex)
    // Fire once per cast nonce, not on every aim change.
  }, [keyboardCast?.nonce])

  return (
    <group>
      <Creature color={color} health={health} won={won} reducedMotion={reducedMotion} />
      {orbits.map((orbit, i) => (
        <Shard
          key={i}
          ref={(g) => {
            shardRefs.current[i] = g
          }}
          orbit={orbit}
          color={color}
          aimed={i === targetIndex}
          brokenUntil={broken[i]}
          reducedMotion={reducedMotion}
          onStrike={() => strike(i)}
        />
      ))}
      {effects.map((effect) =>
        effect.kind === 'bolt' ? (
          <Bolt key={effect.id} to={effect.to} born={effect.born} color={color} />
        ) : (
          <Burst
            key={effect.id}
            at={effect.to}
            born={effect.born}
            color={color}
            reducedMotion={reducedMotion}
          />
        ),
      )}
      {summonedAt !== null && <FamiliarStrike color={color} reducedMotion={reducedMotion} />}
      {won && <SealBurst reducedMotion={reducedMotion} />}
    </group>
  )
}

/** The glitch: a pulsing core in a shell of corrupted crystals that dims as it weakens. */
function Creature({
  color,
  health,
  won,
  reducedMotion,
}: {
  color: string
  health: number
  won: boolean
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const lastHealth = useRef(health)
  const recoil = useRef(0)
  const crystals = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2
        return {
          position: [Math.cos(a) * 1.5, Math.sin(a * 2) * 0.9, Math.sin(a) * 1.5] as [
            number,
            number,
            number,
          ],
          rotation: [a, a * 0.7, 0] as [number, number, number],
          scale: 0.55 + (i % 3) * 0.2,
        }
      }),
    [],
  )
  useFrame(({ clock }, delta) => {
    if (health < lastHealth.current) recoil.current = 1
    lastHealth.current = health
    recoil.current = Math.max(0, recoil.current - delta * 4)
    if (!group.current || !core.current) return
    const t = clock.getElapsedTime()
    const target = won ? 0.001 : 1 + (reducedMotion ? 0 : recoil.current * 0.18)
    group.current.scale.lerp(new THREE.Vector3(target, target, target), won ? 0.06 : 0.3)
    if (!reducedMotion) group.current.rotation.y += delta * (0.3 + (1 - health) * 0.8)
    core.current.scale.setScalar(0.9 + Math.sin(t * 4) * 0.08 * (reducedMotion ? 0 : 1))
  })
  return (
    <group ref={group} position={CREATURE}>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.4 + health * 1.8}
          flatShading
          toneMapped={false}
        />
      </mesh>
      {crystals.map((c, i) => (
        <mesh
          key={i}
          position={c.position}
          rotation={c.rotation}
          scale={[c.scale * 0.6, c.scale * 1.6, c.scale * 0.6]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#2a1840"
            emissive={color}
            emissiveIntensity={0.4 + health * 1.2}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

type Orbit = { radius: number; speed: number; phase: number; height: number }

/** A weak point orbiting the creature; once struck it shatters and re-forms after a moment. */
function Shard({
  ref,
  orbit,
  color,
  aimed,
  brokenUntil,
  reducedMotion,
  onStrike,
}: {
  ref: (g: THREE.Group | null) => void
  orbit: Orbit
  color: string
  aimed: boolean
  brokenUntil: number
  reducedMotion: boolean
  onStrike: () => void
}) {
  const group = useRef<THREE.Group | null>(null)
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const a = orbit.phase + t * orbit.speed * (reducedMotion ? 0.4 : 1)
    group.current?.position.set(
      Math.cos(a) * orbit.radius,
      orbit.height + Math.sin(t * 1.3 + orbit.phase) * 0.3,
      Math.sin(a) * orbit.radius,
    )
    if (mesh.current) {
      const alive = t > brokenUntil
      mesh.current.visible = alive
      mesh.current.rotation.y = t * 2
    }
  })
  return (
    <group
      ref={(g) => {
        group.current = g
        ref(g)
      }}
    >
      <mesh
        ref={mesh}
        scale={[0.42, 0.75, 0.42]}
        onClick={(e) => {
          e.stopPropagation()
          onStrike()
        }}
        onPointerOver={() => (document.body.style.cursor = 'crosshair')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={color}
          emissiveIntensity={2.6}
          flatShading
          toneMapped={false}
        />
      </mesh>
      {aimed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.85, 0.05, 8, 48]} />
          <meshBasicMaterial color="#f3d39a" toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

/** The spell: a bright bolt from the guardian's side to the struck shard, fading fast. */
function Bolt({ to, born, color }: { to: THREE.Vector3; born: number; color: string }) {
  const [opacity, setOpacity] = useState(1)
  const points = useMemo(() => {
    const mid = CASTER.clone()
      .lerp(to, 0.5)
      .add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.2, 0))
    return new THREE.QuadraticBezierCurve3(CASTER, mid, to).getPoints(24)
  }, [to])
  useFrame(({ clock }) => setOpacity(Math.max(0, 1 - (clock.getElapsedTime() - born) / 0.35)))
  if (opacity <= 0) return null
  return (
    <>
      <Line
        points={points}
        color="#ffffff"
        lineWidth={3}
        transparent
        opacity={opacity}
        toneMapped={false}
      />
      <Line
        points={points}
        color={color}
        lineWidth={9}
        transparent
        opacity={opacity * 0.45}
        toneMapped={false}
      />
    </>
  )
}

/** An expanding ring of light where the spell lands. */
function Burst({
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
  const ring = useRef<THREE.Mesh>(null)
  const [alive, setAlive] = useState(true)
  useFrame(({ clock, camera }) => {
    const age = clock.getElapsedTime() - born
    if (age > 0.5) return setAlive(false)
    if (!ring.current) return
    ring.current.lookAt(camera.position)
    ring.current.scale.setScalar(0.4 + age * (reducedMotion ? 2 : 6))
    ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 1 - age / 0.5
  })
  if (!alive) return null
  return (
    <group position={at}>
      <mesh ref={ring}>
        <ringGeometry args={[0.5, 0.62, 40]} />
        <meshBasicMaterial color={color} transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {!reducedMotion && <Sparkles count={18} scale={1.6} size={6} speed={2.5} color="#ffffff" />}
    </group>
  )
}

/** Claude leaps in on an arc with a trail, hits the core with a beam, then cheers beside the arena. */
function FamiliarStrike({ color, reducedMotion }: { color: string; reducedMotion: boolean }) {
  const body = useRef<THREE.Group>(null)
  const beam = useRef<THREE.Mesh>(null)
  const start = useRef<number | null>(null)
  const from = useMemo(() => new THREE.Vector3(-14, 9, 4), [])
  const rest = useMemo(() => new THREE.Vector3(-3.8, 0.3, 1.6), [])
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime()
    start.current ??= now
    const t = Math.min(1, (now - start.current) / (reducedMotion ? 0.4 : 1.1))
    if (body.current) {
      const p = from.clone().lerp(rest, t)
      p.y += Math.sin(t * Math.PI) * 4
      body.current.position.copy(p)
      body.current.rotation.y = 0.3
    }
    if (beam.current) {
      const age = now - start.current - (reducedMotion ? 0.4 : 1.1)
      beam.current.visible = age > 0 && age < 0.6
      ;(beam.current.material as THREE.MeshBasicMaterial).opacity = 1 - Math.max(0, age) / 0.6
    }
  })
  const beamGeometry = useMemo(() => {
    const dir = CREATURE.clone().sub(rest.clone().add(new THREE.Vector3(0, 1.2, 0)))
    const geometry = new THREE.CylinderGeometry(0.18, 0.35, dir.length(), 12, 1, true)
    geometry.translate(0, dir.length() / 2, 0)
    geometry.lookAt(dir)
    geometry.rotateX(Math.PI / 2)
    return geometry
  }, [rest])
  return (
    <group>
      <Trail width={2.2} length={6} color={new THREE.Color('#ffb48a')} attenuation={(w) => w * w}>
        <group ref={body} scale={0.32}>
          <ClaudeFamiliar />
        </group>
      </Trail>
      <mesh
        ref={beam}
        position={rest.clone().add(new THREE.Vector3(0, 1.2, 0))}
        geometry={beamGeometry}
        visible={false}
      >
        <meshBasicMaterial color={color} transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** The rift seals: a verdant flash and a ring sweeping across the arena. */
function SealBurst({ reducedMotion }: { reducedMotion: boolean }) {
  const ring = useRef<THREE.Mesh>(null)
  const start = useRef<number | null>(null)
  useFrame(({ clock }) => {
    start.current ??= clock.getElapsedTime()
    const age = clock.getElapsedTime() - start.current
    if (!ring.current) return
    ring.current.scale.setScalar(1 + age * (reducedMotion ? 4 : 14))
    ;(ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age / 1.4)
  })
  return (
    <group position={[0, 0.1, 0]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.1, 64]} />
        <meshBasicMaterial color="#3fd18f" transparent toneMapped={false} />
      </mesh>
      <pointLight position={[0, 3, 0]} color="#3fd18f" intensity={120} distance={25} />
      {!reducedMotion && (
        <Sparkles
          count={80}
          scale={[10, 6, 10]}
          position={[0, 3, 0]}
          size={7}
          speed={3}
          color="#9ff5c8"
        />
      )}
    </group>
  )
}

/** A small camera kick on every keyboard cast; still when motion is reduced. */
function CameraRig({
  shakeOn,
  reducedMotion,
}: {
  shakeOn: number | undefined
  reducedMotion: boolean
}) {
  const camera = useThree((s) => s.camera)
  const kick = useRef(0)
  useEffect(() => {
    if (shakeOn !== undefined && !reducedMotion) kick.current = 1
  }, [shakeOn, reducedMotion])
  useFrame(({ size }, delta) => {
    kick.current = Math.max(0, kick.current - delta * 5)
    // Portrait phones see less width: pull back so the whole arena fits.
    const distance = size.width / size.height < 0.8 ? 20 : 13
    camera.position.set(
      (Math.random() - 0.5) * kick.current * 0.25,
      5 + (Math.random() - 0.5) * kick.current * 0.25,
      distance,
    )
    camera.lookAt(0, 2.6, 0)
  })
  return null
}
