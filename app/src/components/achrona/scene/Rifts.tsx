import { Html, Line, Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useCallback, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { STATUS_META } from '#/components/glitches/glitch-meta.ts'
import { gatherRifts } from '../world.ts'
import { LIGHT, UV_VERTEX, useShader } from './kit.tsx'
import type { CSSProperties } from 'react'
import type { RiftStorm } from '../world.ts'
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
  const storms = useMemo(() => gatherRifts(glitches), [glitches])
  const labels = useLabelLayout()
  return (
    <group>
      {storms.map((storm) => (
        <group key={storm.district.id}>
          {storm.rifts.map(({ glitch, position, scale }, i) => (
            <Rift
              key={glitch.glitchId}
              glitch={glitch}
              position={position}
              scale={scale}
              lead={i === 0}
              highlighted={highlightedId === glitch.glitchId}
              onHighlight={onHighlight}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
            />
          ))}
          <StormLabel storm={storm} highlightedId={highlightedId} slots={labels} />
        </group>
      ))}
    </group>
  )
}

type LabelSlot = { el: HTMLDivElement; anchor: THREE.Vector3; lift: number }

const LABEL_GAP = 6

/**
 * Keeps island labels from covering each other on screen, whatever the camera angle: the nearest
 * label stays put, any label it would overlap is lifted just above it (with a leader line down to
 * its island), and lifts ease toward their target so labels glide instead of jumping.
 */
function useLabelLayout(): Map<string, LabelSlot> {
  const slots = useRef(new Map<string, LabelSlot>()).current
  const probe = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    // Read every box first, then write, so the browser lays out once per frame.
    const boxes = [...slots.values()].map((slot) => {
      const rect = slot.el.getBoundingClientRect()
      const scale = rect.height / Math.max(1, slot.el.offsetHeight)
      return {
        slot,
        scale,
        left: rect.left,
        right: rect.right,
        top: rect.top + slot.lift,
        bottom: rect.bottom + slot.lift,
        depth: probe.copy(slot.anchor).project(camera).z,
      }
    })
    boxes.sort((a, b) => a.depth - b.depth)
    const placed: Array<{ left: number; right: number; top: number; bottom: number }> = []
    for (const box of boxes) {
      let { top, bottom } = box
      const overlapped = () =>
        placed.find(
          (p) =>
            box.left < p.right + LABEL_GAP &&
            box.right > p.left - LABEL_GAP &&
            top < p.bottom + LABEL_GAP &&
            bottom > p.top - LABEL_GAP,
        )
      // Each step clears the box it hit and only ever moves up, so this ends within placed.length steps.
      for (let hit = overlapped(); hit; hit = overlapped()) {
        const up = bottom - (hit.top - LABEL_GAP)
        top -= up
        bottom -= up
      }
      placed.push({ left: box.left, right: box.right, top, bottom })
      const target = box.top - top
      const lift = box.slot.lift + (target - box.slot.lift) * 0.25
      box.slot.lift = Math.abs(target - lift) < 0.5 ? target : lift
      // Html scales its content with distance; translate in the label's own pixels.
      const local = box.slot.lift / box.scale
      box.slot.el.style.translate = `0 ${-local}px`
      box.slot.el.style.setProperty('--lift', `${local}px`)
    }
  })
  return slots
}

/**
 * One label per island: the rift a guardian is pointing at, or else the most urgent one, with how
 * many more rage there and a dot per rift in its status colour.
 */
function StormLabel({
  storm,
  highlightedId,
  slots,
}: {
  storm: RiftStorm<GlitchListItem>
  highlightedId: string | null
  slots: Map<string, LabelSlot>
}) {
  const { district, rifts } = storm
  // A storm always holds at least one rift.
  const [lead] = rifts
  const shown = rifts.find((r) => r.glitch.glitchId === highlightedId) ?? lead
  const color = RIFT_COLOR[shown.glitch.status as keyof typeof RIFT_COLOR]
  const crowd = rifts.length > 1
  const base = crowd ? district.position : lead.position
  const anchor: [number, number, number] = [base[0], base[1] + HEIGHT * lead.scale + 1.8, base[2]]
  const [ax, ay, az] = anchor
  // Stable across renders, so hovering a rift does not reset the label's lift.
  const register = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      slots.set(district.id, { el, anchor: new THREE.Vector3(ax, ay, az), lift: 0 })
      return () => {
        slots.delete(district.id)
      }
    },
    [slots, district.id, ax, ay, az],
  )
  return (
    <Html position={anchor} center distanceFactor={30} zIndexRange={[20, 0]} pointerEvents="none">
      <div
        ref={register}
        className="storm-label relative flex flex-col items-center gap-1 rounded-md border px-2.5 py-1 shadow-[0_6px_16px_rgb(0_0_0/0.5)] transition-[border-color] duration-200"
        style={
          {
            borderColor: color,
            background: 'rgb(12 15 26 / 0.85)',
            '--storm-color': color,
          } as CSSProperties
        }
      >
        {crowd && (
          <span className="label-caps whitespace-nowrap text-[0.6rem] text-[#e0b66a]">
            {district.name} · {rifts.length} rifts
          </span>
        )}
        <span className="title-gothic whitespace-nowrap text-xl">
          {shown.glitch.glitchId}
          <span className="label-caps ml-2 align-middle text-[0.62rem]" style={{ color }}>
            {STATUS_META[shown.glitch.status].label}
          </span>
        </span>
        {crowd && (
          <span className="flex gap-1">
            {rifts.slice(0, 10).map((r) => (
              <span
                key={r.glitch.glitchId}
                className="size-1.5 rounded-full"
                style={{
                  background: RIFT_COLOR[r.glitch.status as keyof typeof RIFT_COLOR],
                  outline: r === shown ? '1px solid #fff' : undefined,
                }}
              />
            ))}
          </span>
        )}
      </div>
    </Html>
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
  position,
  scale,
  lead,
  highlighted,
  onHighlight,
  onSelect,
  reducedMotion,
}: {
  glitch: GlitchListItem
  position: [number, number, number]
  scale: number
  /** The storm's leading rift carries its light and sparks; the rest stay cheap. */
  lead: boolean
  highlighted: boolean
  onHighlight: (id: string | null) => void
  onSelect: (id: string) => void
  reducedMotion: boolean
}) {
  const color = RIFT_COLOR[glitch.status as keyof typeof RIFT_COLOR]
  const leaking = glitch.status === 'LEAKED'
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
    <group position={position} scale={scale}>
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
      {lead && (
        <Sparkles
          count={22}
          scale={[2.6, HEIGHT, 2.6]}
          position={[0, HEIGHT / 2, 0]}
          size={2.4}
          speed={reducedMotion ? 0 : 1.1}
          color={color}
        />
      )}
      {lead && (
        <pointLight
          ref={light}
          position={[0, 1.5, 0]}
          color={color}
          intensity={34}
          distance={9}
          decay={2}
        />
      )}
    </group>
  )
}
