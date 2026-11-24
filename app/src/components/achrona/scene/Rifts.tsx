import { Html, Line, Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { STATUS_META } from '#/components/glitches/glitch-meta.ts'
import { placeGlitch } from '../world.ts'
import { LIGHT, UV_VERTEX, useShader } from './kit.tsx'
import type { GlitchListItem, GlitchStatus } from '#/lib/glitch.ts'

const RIFT_COLOR: Record<Exclude<GlitchStatus, 'FIXED'>, string> = {
  LEAKED: LIGHT.ember,
  ASSESSING: LIGHT.amber,
  CONTAINING: LIGHT.royal,
}

const PORTAL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = atan(p.y, p.x);
    float spiral = sin(a * 3.0 + r * 12.0 - uTime * 5.0) * 0.5 + 0.5;
    float disc = smoothstep(1.0, 0.75, r);
    float core = pow(max(1.0 - r, 0.0), 5.0);
    vec3 c = uColor * (0.6 + spiral * 2.6) + vec3(1.0, 0.9, 0.95) * core * 2.5;
    gl_FragColor = vec4(c, disc * (0.25 + spiral * 0.75));
  }
`

export type RiftsProps = {
  glitches: Array<GlitchListItem>
  highlightedId: string | null
  onHighlight: (glitchId: string | null) => void
  onSelect: (glitchId: string) => void
  reducedMotion: boolean
}

/** Every open glitch tears the sky over its district: lightning, a crystal, a spiralling portal, rising embers. */
export function Rifts({
  glitches,
  highlightedId,
  onHighlight,
  onSelect,
  reducedMotion,
}: RiftsProps) {
  return (
    <group>
      {glitches
        .filter((g) => g.status !== 'FIXED')
        .map((glitch) => (
          <Rift
            key={glitch.glitchId}
            glitch={glitch}
            highlighted={highlightedId === glitch.glitchId}
            onHighlight={onHighlight}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
          />
        ))}
    </group>
  )
}

const HEIGHT = 6

/** A jagged bolt from the sky to the rift, with one branch. Regenerated every few frames. */
function bolt(seed: number): { main: Array<THREE.Vector3>; branch: Array<THREE.Vector3> } {
  const rand = (n: number) => {
    const x = Math.sin(seed * 9301 + n * 49297) * 233280
    return x - Math.floor(x) - 0.5
  }
  const main: Array<THREE.Vector3> = []
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const spread = Math.sin(t * Math.PI) * 0.9
    main.push(
      new THREE.Vector3(rand(i) * spread, HEIGHT + 6 - t * (HEIGHT + 6), rand(i + 50) * spread),
    )
  }
  const from = main[4] ?? new THREE.Vector3()
  const branch = [
    from,
    from.clone().add(new THREE.Vector3(rand(90) * 2.2, -1.4, rand(91) * 2.2)),
    from.clone().add(new THREE.Vector3(rand(92) * 3, -3, rand(93) * 3)),
  ]
  return { main, branch }
}

function Rift({
  glitch,
  highlighted,
  onHighlight,
  onSelect,
  reducedMotion,
}: {
  glitch: GlitchListItem
  highlighted: boolean
  onHighlight: (id: string | null) => void
  onSelect: (id: string) => void
  reducedMotion: boolean
}) {
  const color = RIFT_COLOR[glitch.status as keyof typeof RIFT_COLOR]
  const leaking = glitch.status === 'LEAKED'
  const { position } = useMemo(() => placeGlitch(glitch), [glitch])
  const crystal = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const [strike, setStrike] = useState(() => ({ seed: 1, visible: true }))
  const nextStrike = useRef(0)
  const portal = useShader(
    UV_VERTEX,
    PORTAL_FRAGMENT,
    { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    { side: THREE.DoubleSide, blending: THREE.AdditiveBlending },
  )
  const shards = useMemo(() => Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2 + 0.3), [])
  const lines = useMemo(() => bolt(strike.seed), [strike.seed])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    portal.uniforms.uTime.value = t
    if (crystal.current) {
      crystal.current.rotation.y = reducedMotion ? 0.6 : t * 1.2
      crystal.current.position.y = HEIGHT + (reducedMotion ? 0 : Math.sin(t * 1.7) * 0.25)
    }
    if (ring.current && !reducedMotion) {
      const pulse = (t * 0.55) % 1
      ring.current.scale.setScalar(0.6 + pulse * 3)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - pulse)
    }
    // Lightning only on leaking rifts, flickering on an irregular rhythm.
    if (leaking && !reducedMotion && t > nextStrike.current) {
      nextStrike.current = t + 0.06 + Math.random() * (Math.random() < 0.2 ? 0.9 : 0.12)
      setStrike({ seed: Math.random() * 1000, visible: Math.random() > 0.25 })
    }
    if (light.current)
      light.current.intensity =
        (highlighted ? 60 : 34) * (leaking && strike.visible ? 1.4 : 1) + Math.sin(t * 9) * 4
  })

  return (
    <group position={position}>
      {leaking && strike.visible && (
        <>
          <Line
            points={lines.main}
            color="#ffd2c8"
            lineWidth={2.4}
            toneMapped={false}
            transparent
            opacity={0.95}
          />
          <Line
            points={lines.main}
            color={color}
            lineWidth={7}
            toneMapped={false}
            transparent
            opacity={0.35}
          />
          <Line
            points={lines.branch}
            color={color}
            lineWidth={1.6}
            toneMapped={false}
            transparent
            opacity={0.8}
          />
        </>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} scale={2.6}>
        <circleGeometry args={[1, 48]} />
        <primitive object={portal} attach="material" />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[0.7, 0.82, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Corrupted crystals breaking through the ground around the tear. */}
      {shards.map((a, i) => (
        <mesh
          key={a}
          position={[Math.cos(a) * 1.9, 0.4, Math.sin(a) * 1.9]}
          rotation={[Math.cos(a) * 0.5, a, Math.sin(a) * 0.5]}
          scale={[0.25, 0.7 + (i % 3) * 0.3, 0.25]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2.4}
            flatShading
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh
        ref={crystal}
        position={[0, HEIGHT, 0]}
        scale={highlighted ? [0.75, 1.4, 0.75] : [0.55, 1.05, 0.55]}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHighlight(glitch.glitchId)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onHighlight(null)
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(glitch.glitchId)
        }}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={highlighted ? 3 : 1.8}
          flatShading
          toneMapped={false}
        />
      </mesh>
      <Sparkles
        count={22}
        scale={[2.6, HEIGHT, 2.6]}
        position={[0, HEIGHT / 2, 0]}
        size={2.4}
        speed={reducedMotion ? 0 : 1.1}
        color={color}
      />
      <pointLight
        ref={light}
        position={[0, 1.5, 0]}
        color={color}
        intensity={34}
        distance={9}
        decay={2}
      />
      <Html
        position={[0, HEIGHT + 1.8, 0]}
        center
        distanceFactor={30}
        zIndexRange={[20, 0]}
        pointerEvents="none"
      >
        <div
          className="title-gothic whitespace-nowrap rounded-md border px-2.5 py-0.5 text-xl shadow-[0_6px_16px_rgb(0_0_0/0.5)]"
          style={{
            borderColor: color,
            background: 'rgb(12 15 26 / 0.85)',
            opacity: highlighted ? 1 : 0.9,
          }}
        >
          {glitch.glitchId}
          <span className="label-caps ml-2 align-middle text-[0.62rem]" style={{ color }}>
            {STATUS_META[glitch.status].label}
          </span>
        </div>
      </Html>
    </group>
  )
}
