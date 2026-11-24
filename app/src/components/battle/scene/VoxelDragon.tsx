import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { glowTexture, nowSeconds } from './shared.ts'
import type { ReactNode } from 'react'

/**
 * Obsidian voxels that the Desync is eating: a dark body lit by a rim of the glitch's
 * colour, scanlines crawling over it, and whole horizontal slices of the creature tearing
 * sideways in world space, so the tear runs cleanly across every block.
 */
const DRAGON_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uCorruption;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float band = floor(wp.y * 3.2);
    float tear = fract(sin(band * 91.7 + floor(uTime * 10.0) * 13.1) * 43758.5453);
    if (tear > 1.0 - 0.16 * uCorruption) wp.x += (tear - 0.9) * 2.4 * uCorruption;
    vWorld = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const DRAGON_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uCorruption;
  uniform float uCleanse;
  uniform float uPulse;
  uniform float uMembrane;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vNormal);
    float key = max(dot(n, normalize(vec3(-0.35, 0.85, 0.45))), 0.0);
    float fill = max(dot(n, normalize(vec3(0.6, 0.2, 0.8))), 0.0);
    float fres = pow(1.0 - abs(dot(n, normalize(vView))), 2.4);
    vec3 base = vec3(0.022, 0.016, 0.042) * (0.4 + key * 2.2 + fill * 0.5);
    vec3 col = base + uColor * fres * 0.75;
    float scan = step(0.6, fract(vWorld.y * 7.0 - uTime * 2.2));
    col += uColor * scan * 0.07 * uCorruption;
    col.r += fres * 0.6 * uCorruption * step(0.65, fract(uTime * 5.0 + vWorld.x));
    col.b += fres * 0.5 * uCorruption * step(0.55, fract(uTime * 3.0 - vWorld.y));
    // Wing membranes: thin and translucent, with the glitch's light seeping through.
    col = mix(col, vec3(0.06, 0.025, 0.1) + uColor * (0.3 + fres * 0.9), uMembrane);
    col += vec3(1.0) * uPulse * (0.25 + fres);
    col = mix(col, vec3(1.0, 0.96, 0.88) * (1.0 + fres * 2.0), uCleanse);
    gl_FragColor = vec4(col, mix(1.0, 0.93, uMembrane));
  }
`

export type DragonUniforms = {
  uTime: { value: number }
  uCorruption: { value: number }
  uCleanse: { value: number }
  uPulse: { value: number }
}

/** Builds the dragon's three materials; the caller animates the shared uniforms per frame. */
export function useDragonMaterials(color: string) {
  return useMemo(() => {
    const shared: DragonUniforms = {
      uTime: { value: 0 },
      uCorruption: { value: 0.4 },
      uCleanse: { value: 0 },
      uPulse: { value: 0 },
    }
    const make = (membrane: number) =>
      new THREE.ShaderMaterial({
        vertexShader: DRAGON_VERTEX,
        fragmentShader: DRAGON_FRAGMENT,
        uniforms: {
          ...shared,
          uColor: { value: new THREE.Color(color) },
          uMembrane: { value: membrane },
        },
        transparent: membrane > 0,
        depthWrite: membrane === 0,
        side: membrane > 0 ? THREE.DoubleSide : THREE.FrontSide,
      })
    const accent = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(2.4),
      toneMapped: false,
    })
    return { shared, body: make(0), membrane: make(1), accent }
  }, [color])
}

type Materials = ReturnType<typeof useDragonMaterials>

function Block({
  position,
  size,
  rotation,
  material,
}: {
  position: [number, number, number]
  size: [number, number, number]
  rotation?: [number, number, number]
  material: THREE.Material
}) {
  return (
    <mesh position={position} rotation={rotation} material={material}>
      <boxGeometry args={size} />
    </mesh>
  )
}

const TORSO: Array<{ z: number; y: number; w: number; h: number; d: number }> = [
  { z: 0.7, y: 0.05, w: 1.7, h: 1.45, d: 1.5 },
  { z: -0.7, y: 0.1, w: 1.55, h: 1.35, d: 1.4 },
  { z: -1.95, y: 0, w: 1.25, h: 1.1, d: 1.2 },
]
const NECK = Array.from({ length: 4 }, (_, i) => ({
  pos: [0, 0.75 + i * 0.55, 1.45 + i * 0.42] as [number, number, number],
  size: 0.82 - i * 0.08,
}))
const TAIL_SEGMENTS = 10

/** The trailing edge of a wing: bone tips and the scalloped membrane between them. */
const WING_OUTLINE: Array<[number, number]> = [
  [0, 0.3],
  [3.1, 0.55],
  [6.2, -0.2],
  [5.3, -1.5],
  [4.4, -1.1],
  [3.7, -2.7],
  [2.7, -1.9],
  [1.6, -2.9],
  [0.4, -1.9],
  [0, -1.2],
]
const WING_FINGERS: Array<[number, number]> = [
  [6.2, -0.2],
  [3.7, -2.7],
  [1.6, -2.9],
]

/**
 * An original voxel wyrm: the shape the Desync takes when it is strong enough to fight back.
 * Faces +z (the camera); wings beat, the neck and tail sway, the jaw opens when it is hurt.
 */
export function VoxelDragon({
  materials,
  color,
  pulse,
  agitated,
  calm,
  children,
}: {
  materials: Materials
  color: string
  /** 0..1, how hard it was just hit. */
  pulse: () => number
  agitated: boolean
  /** 0 when motion is reduced. */
  calm: number
  /** Things lodged in the dragon's chest, like its corrupted heart. */
  children?: ReactNode
}) {
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const jaw = useRef<THREE.Group>(null)
  const leftWing = useRef<THREE.Group>(null)
  const rightWing = useRef<THREE.Group>(null)
  const tail = useRef<Array<THREE.Group | null>>([])
  const { body, membrane, accent } = materials

  const wingShape = useMemo(() => {
    const shape = new THREE.Shape()
    WING_OUTLINE.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)))
    const geometry = new THREE.ShapeGeometry(shape)
    // The outline is drawn in x/y; lay it flat so y becomes depth (-z, behind the arm).
    geometry.rotateX(Math.PI / 2)
    return geometry
  }, [])
  const fingers = useMemo(
    () =>
      WING_FINGERS.map(([x, z]) => {
        const from = new THREE.Vector3(3.1, 0, 0.55)
        const to = new THREE.Vector3(x, 0, z)
        const mid = from.clone().lerp(to, 0.5)
        const length = from.distanceTo(to)
        const yaw = Math.atan2(to.x - from.x, to.z - from.z)
        return { mid, length, yaw }
      }),
    [],
  )

  useFrame(() => {
    const t = nowSeconds()
    const p = pulse()
    const beat = t * (agitated ? 4.2 : 2.6)
    const flap = Math.sin(beat) * (agitated ? 0.75 : 0.55) * calm
    // The left wing is mirrored by scale, so the same lift is a negative turn.
    if (leftWing.current) leftWing.current.rotation.z = -0.5 - flap
    if (rightWing.current) rightWing.current.rotation.z = 0.5 + flap
    if (root.current) {
      // The body lifts on every downstroke.
      root.current.position.y = -Math.sin(beat) * 0.22 * calm
      root.current.rotation.x = -p * 0.25 * calm
    }
    if (head.current) {
      // The body flies three-quarters on; the head turns to stare at the guardian.
      head.current.rotation.y = 0.5 + Math.sin(t * 0.7) * 0.2 * calm
      head.current.rotation.x = Math.sin(t * 1.1) * 0.08 * calm - p * 0.4
    }
    if (jaw.current) {
      const roar = agitated ? Math.abs(Math.sin(t * 7)) * 0.5 : 0
      jaw.current.rotation.x = 0.12 + Math.sin(t * 1.7) * 0.05 * calm + p * 0.55 + roar
    }
    tail.current.forEach((segment, i) => {
      if (!segment) return
      const k = (i + 1) / TAIL_SEGMENTS
      segment.position.x = Math.sin(t * 1.8 - i * 0.55) * 0.55 * k * calm
      segment.position.y = -0.15 - i * 0.12 + Math.sin(t * 1.3 - i * 0.4) * 0.2 * k * calm
    })
  })

  return (
    <group ref={root}>
      {/* Torso, with a ridge of glowing spine plates. */}
      {TORSO.map((s, i) => (
        <group key={i}>
          <Block position={[0, s.y, s.z]} size={[s.w, s.h, s.d]} material={body} />
          <Block
            position={[0, s.y + s.h / 2 + 0.22, s.z]}
            size={[0.14, 0.55, 0.55]}
            rotation={[Math.PI / 4, 0, 0]}
            material={accent}
          />
        </group>
      ))}
      {/* Belly scales. */}
      <Block position={[0, -0.62, 0.4]} size={[1.1, 0.25, 2.2]} material={body} />
      {children}

      {/* Neck rising to the head. */}
      {NECK.map((n, i) => (
        <group key={i}>
          <Block position={n.pos} size={[n.size, n.size, n.size]} material={body} />
          <Block
            position={[0, n.pos[1] + n.size / 2 + 0.16, n.pos[2] - 0.05]}
            size={[0.12, 0.4, 0.4]}
            rotation={[Math.PI / 4, 0, 0]}
            material={accent}
          />
        </group>
      ))}

      <group ref={head} position={[0, 2.75, 3.15]}>
        {/* Skull, brow and snout. */}
        <Block position={[0, 0, 0.1]} size={[1.05, 0.8, 1.25]} material={body} />
        <Block position={[0, 0.42, 0.35]} size={[1.15, 0.18, 0.7]} material={body} />
        <Block position={[0, -0.08, 1.05]} size={[0.75, 0.5, 0.95]} material={body} />
        {/* Nostrils and eyes burn with the glitch's light. */}
        <Block position={[0.2, 0.08, 1.53]} size={[0.12, 0.08, 0.04]} material={accent} />
        <Block position={[-0.2, 0.08, 1.53]} size={[0.12, 0.08, 0.04]} material={accent} />
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.42, 0.16, 0.62]}>
            <Block position={[0, 0, 0]} size={[0.16, 0.14, 0.34]} material={accent} />
            <sprite scale={1.1}>
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
        ))}
        {/* Horns sweeping back, in two segments each. */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.36, 0.45, -0.3]} rotation={[-0.7, side * 0.25, 0]}>
            <Block position={[0, 0, -0.35]} size={[0.18, 0.18, 0.8]} material={body} />
            <Block
              position={[0, 0.18, -0.85]}
              rotation={[0.5, 0, 0]}
              size={[0.12, 0.12, 0.6]}
              material={accent}
            />
          </group>
        ))}
        {/* The jaw hinges open, lined with teeth. */}
        <group ref={jaw} position={[0, -0.35, 0.45]}>
          <Block position={[0, -0.08, 0.55]} size={[0.68, 0.2, 1.15]} material={body} />
          {[-0.24, -0.08, 0.08, 0.24].map((x) => (
            <Block key={x} position={[x, 0.08, 0.95]} size={[0.08, 0.16, 0.08]} material={accent} />
          ))}
        </group>
      </group>

      {/* Wings: an arm bone, three finger bones, and the membrane between them. */}
      {[1, -1].map((side) => (
        <group
          key={side}
          ref={side === 1 ? rightWing : leftWing}
          position={[side * 0.75, 0.55, 0.3]}
          scale={[side, 1, 1]}
        >
          <Block
            position={[1.55, 0, 0.42]}
            size={[3.1, 0.22, 0.26]}
            rotation={[0, -0.08, 0]}
            material={body}
          />
          {fingers.map((f, i) => (
            <group key={i}>
              <Block
                position={[f.mid.x, 0, f.mid.z]}
                size={[0.12, 0.12, f.length]}
                rotation={[0, f.yaw, 0]}
                material={body}
              />
            </group>
          ))}
          <Block position={[6.2, 0, 0.2]} size={[0.18, 0.18, 0.4]} material={accent} />
          <Block position={[3.1, 0.1, 0.55]} size={[0.25, 0.25, 0.25]} material={accent} />
          <mesh geometry={wingShape} material={membrane} />
        </group>
      ))}

      {/* Hind legs tucked under while it hovers. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.72, -0.7, -1.3]} rotation={[0.5, 0, 0]}>
          <Block position={[0, -0.35, 0]} size={[0.5, 0.9, 0.6]} material={body} />
          <Block position={[0, -0.85, 0.3]} size={[0.42, 0.28, 0.7]} material={body} />
          <Block position={[0, -0.95, 0.72]} size={[0.38, 0.1, 0.16]} material={accent} />
        </group>
      ))}

      {/* A long tail, thinning to a glowing barb. */}
      {Array.from({ length: TAIL_SEGMENTS }, (_, i) => {
        const size = 0.95 * Math.pow(0.86, i)
        return (
          <group
            key={i}
            ref={(g) => {
              tail.current[i] = g
            }}
            position={[0, -0.15 - i * 0.12, 0]}
          >
            <Block position={[0, 0, -2.75 - i * 0.72]} size={[size, size, 0.78]} material={body} />
            {i === TAIL_SEGMENTS - 1 ? (
              <Block
                position={[0, 0, -2.75 - i * 0.72 - 0.6]}
                size={[0.08, 0.5, 0.5]}
                rotation={[Math.PI / 4, 0, 0]}
                material={accent}
              />
            ) : (
              i % 2 === 0 && (
                <Block
                  position={[0, size / 2 + 0.1, -2.75 - i * 0.72]}
                  size={[0.08, 0.3, 0.3]}
                  rotation={[Math.PI / 4, 0, 0]}
                  material={accent}
                />
              )
            )}
          </group>
        )
      })}
    </group>
  )
}
