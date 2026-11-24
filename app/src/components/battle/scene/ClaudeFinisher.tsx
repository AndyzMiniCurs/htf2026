import { Trail } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ClaudeFamiliar } from '../ClaudeFamiliar.tsx'
import { FAMILIAR } from '../familiar.ts'
import {
  BEAST,
  CLAUDE_SPOT,
  clamp01,
  easeInCubic,
  easeOutCubic,
  glowTexture,
  nowSeconds,
  textTexture,
} from './shared.ts'
import type { FinisherTimeline } from '../finisher.ts'
import type { BattleFx } from './shared.ts'

/** What pours out of Claude while it fixes the glitch. */
const CODE_TOKENS = [
  'fix()',
  'seal(rift)',
  '{ }',
  '</>',
  '=>',
  'await',
  'git commit',
  'npm test',
  '✓',
  'if (glitch)',
  'return true',
  'patch',
  'const',
  'resolve()',
  '&&',
  '[ ]',
  'λ',
  'desync = 0',
]
const CODE_COLORS = [FAMILIAR.color, '#ffffff', '#ffb48a']

/** Code and the beam pour from the top of Claude's head. */
const MOUTH = CLAUDE_SPOT.clone().add(new THREE.Vector3(0, 2.1, 0))
const SCALE = 0.42
const BEAM_DURATION = 1.1

type Props = {
  /** Page-clock seconds of the summon. */
  summonedAt: number
  timeline: FinisherTimeline
  color: string
  fx: BattleFx
  reducedMotion: boolean
  lowPower: boolean
}

/**
 * Claude's entrance and finisher: drops from the sky onto the arena, turns to the glitch,
 * pours a spiral of code into it, then ends it with one beam.
 */
export function ClaudeFinisher({
  summonedAt,
  timeline,
  color,
  fx,
  reducedMotion,
  lowPower,
}: Props) {
  const body = useRef<THREE.Group>(null)
  const dust = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const landed = useRef(false)
  const struck = useRef(false)
  const facing = useRef(0)

  useFrame(({ camera }, delta) => {
    const s = nowSeconds() - summonedAt
    const fall = clamp01(s / timeline.land)
    const sinceLand = Math.max(0, s - timeline.land)
    if (!landed.current && fall >= 1) {
      landed.current = true
      if (!reducedMotion) fx.shake = Math.min(1, fx.shake + 0.7)
    }
    if (!struck.current && s >= timeline.strike) {
      struck.current = true
      fx.pulse = 1
      if (!reducedMotion) fx.shake = 1
    }
    const g = body.current
    if (g) {
      let y = (1 - easeInCubic(fall)) * 16
      // Typing: quick little bobs while the code pours out; a victory hop after the strike.
      if (s > timeline.code && s < timeline.strike) y += Math.abs(Math.sin(s * 16)) * 0.12
      if (s > timeline.strike + 0.3) y += Math.abs(Math.sin((s - timeline.strike) * 5)) * 0.7
      g.position.set(CLAUDE_SPOT.x, CLAUDE_SPOT.y + y, CLAUDE_SPOT.z)
      // Landing squash, springing back.
      const squash = reducedMotion ? 0 : Math.exp(-sinceLand * 7) * Math.sin(sinceLand * 22) * 0.3
      g.scale.set(SCALE * (1 + squash * 0.6), SCALE * (1 - squash), SCALE * (1 + squash * 0.6))
      // Claude reads best face-on: it faces the camera, leaning a little toward the glitch.
      const toCamera = Math.atan2(
        camera.position.x - CLAUDE_SPOT.x,
        camera.position.z - CLAUDE_SPOT.z,
      )
      const target = toCamera + (s < timeline.turn ? 0 : 0.15)
      facing.current = THREE.MathUtils.damp(facing.current, target, reducedMotion ? 30 : 6, delta)
      g.rotation.y = facing.current
    }
    if (dust.current) {
      const t = clamp01(sinceLand / 0.6)
      dust.current.visible = landed.current && t < 1
      dust.current.scale.setScalar(0.5 + easeOutCubic(t) * 4)
      const m = dust.current.material
      if (m instanceof THREE.MeshBasicMaterial) m.opacity = (1 - t) * 0.8
    }
    if (light.current) {
      const working = s > timeline.code && s < timeline.strike + 0.4 ? 1 : 0.4
      light.current.intensity = 18 * working * (landed.current ? 1 : 0.4)
    }
  })

  return (
    <group>
      <Trail
        width={3}
        length={7}
        color={new THREE.Color(FAMILIAR.color).multiplyScalar(1.6)}
        attenuation={(w) => w * w}
      >
        <group
          ref={body}
          position={[CLAUDE_SPOT.x, CLAUDE_SPOT.y + 16, CLAUDE_SPOT.z]}
          scale={SCALE}
        >
          <ClaudeFamiliar animate={!reducedMotion} />
        </group>
      </Trail>
      <pointLight
        ref={light}
        position={[CLAUDE_SPOT.x, 2.2, CLAUDE_SPOT.z + 1]}
        color={FAMILIAR.color}
        distance={12}
        intensity={0}
      />
      <mesh
        ref={dust}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[CLAUDE_SPOT.x, 0.08, CLAUDE_SPOT.z]}
      >
        <ringGeometry args={[0.8, 0.9, 48]} />
        <meshBasicMaterial
          color="#ffd2b8"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <CodeStream
        summonedAt={summonedAt}
        start={timeline.code}
        end={timeline.strike + 0.15}
        count={reducedMotion ? 24 : lowPower ? 70 : 150}
        reducedMotion={reducedMotion}
      />
      <Beam summonedAt={summonedAt} at={timeline.strike} color={color} />
    </group>
  )
}

/** Tokens of code spiralling from Claude into the glitch, like a fix being written into it. */
function CodeStream({
  summonedAt,
  start,
  end,
  count,
  reducedMotion,
}: {
  summonedAt: number
  start: number
  end: number
  count: number
  reducedMotion: boolean
}) {
  const sprites = useRef<Array<THREE.Sprite | null>>([])
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const token = CODE_TOKENS[i % CODE_TOKENS.length]
        const tex = textTexture(token, CODE_COLORS[i % CODE_COLORS.length])
        return {
          tex,
          delay: (i / count) * 0.9,
          travel: 0.75 + Math.random() * 0.55,
          radius: 0.4 + Math.random() * 1.3,
          phase: Math.random() * Math.PI * 2,
          turns: 2 + Math.random() * 3,
          size: 0.28 + Math.random() * 0.22,
        }
      }),
    [count],
  )
  const ctrl = useMemo(
    () =>
      MOUTH.clone()
        .lerp(BEAST, 0.5)
        .add(new THREE.Vector3(0, 3.2, 1.5)),
    [],
  )
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(MOUTH, ctrl, BEAST), [ctrl])
  const point = useMemo(() => new THREE.Vector3(), [])
  const side = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const s = nowSeconds() - summonedAt
    particles.forEach((p, i) => {
      const sprite = sprites.current[i]
      if (!sprite) return
      const local = s - start - p.delay
      const active = local > 0 && s < end
      sprite.visible = active
      if (!active) return
      const t = (local / p.travel) % 1
      curve.getPoint(t, point)
      curve
        .getTangent(t, side)
        .cross(new THREE.Vector3(0, 1, 0))
        .normalize()
      up.crossVectors(side, curve.getTangent(t)).normalize()
      const swirl = reducedMotion ? 0 : p.radius * Math.sin(t * Math.PI)
      const a = p.phase + t * p.turns * Math.PI * 2
      point.addScaledVector(side, Math.cos(a) * swirl).addScaledVector(up, Math.sin(a) * swirl)
      sprite.position.copy(point)
      const grow = Math.sin(t * Math.PI)
      sprite.scale.set(p.size * p.tex.aspect * grow, p.size * grow, 1)
    })
  })
  return (
    <group>
      {particles.map((p, i) => (
        <sprite
          key={i}
          ref={(s) => {
            sprites.current[i] = s
          }}
          visible={false}
        >
          <spriteMaterial
            map={p.tex.texture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}

const BEAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`
const BEAM_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uAlpha;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float facing = pow(abs(dot(vNormal, vView)), 1.6);
    float bands = 0.65 + 0.35 * sin(vUv.y * 60.0 - uTime * 40.0);
    vec3 col = mix(uColor * 2.5, vec3(1.0, 0.95, 0.85) * 3.0, facing * facing);
    gl_FragColor = vec4(col * bands, facing * uAlpha);
  }
`

/** The finishing beam from Claude to the glitch: Claude-orange around a white-hot core. */
function Beam({ summonedAt, at, color }: { summonedAt: number; at: number; color: string }) {
  const group = useRef<THREE.Group>(null)
  const flare = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  const { length, quaternion } = useMemo(() => {
    const dir = BEAST.clone().sub(MOUTH)
    return {
      length: dir.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.normalize(),
      ),
    }
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BEAM_VERTEX,
        fragmentShader: BEAM_FRAGMENT,
        uniforms: {
          uColor: { value: new THREE.Color(FAMILIAR.color) },
          uTime: { value: 0 },
          uAlpha: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  )
  useFrame(() => {
    const t = (nowSeconds() - summonedAt - at) / BEAM_DURATION
    const on = t > 0 && t < 1
    // Snaps open, holds, then thins away.
    const width = on ? Math.min(1, t * 10) * (1 - easeInCubic(clamp01((t - 0.55) / 0.45))) : 0
    if (group.current) {
      group.current.visible = on
      group.current.scale.set(width, 1, width)
    }
    material.uniforms.uTime.value = nowSeconds()
    material.uniforms.uAlpha.value = width
    if (flare.current) {
      flare.current.visible = on
      flare.current.scale.setScalar(2 + width * 7)
    }
    if (light.current) light.current.intensity = width * 220
  })
  return (
    <>
      <group ref={group} position={MOUTH} quaternion={quaternion} visible={false}>
        <mesh position={[0, length / 2, 0]} material={material}>
          <cylinderGeometry args={[0.55, 0.38, length, 24, 1, true]} />
        </mesh>
        <mesh position={[0, length / 2, 0]}>
          <cylinderGeometry args={[0.12, 0.1, length, 12, 1, true]} />
          <meshBasicMaterial color="#fffaf0" toneMapped={false} />
        </mesh>
      </group>
      <sprite ref={flare} position={BEAST} visible={false}>
        <spriteMaterial
          map={glowTexture()}
          color={color}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <pointLight ref={light} position={BEAST} color={FAMILIAR.color} distance={30} intensity={0} />
    </>
  )
}
