import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useShader } from '#/components/achrona/scene/kit.tsx'
import { BEAST, SIMPLEX_3D, clamp01, nowSeconds } from './shared.ts'
import { VoxelDragon, useDragonMaterials } from './VoxelDragon.tsx'
import type { BattleFx } from './shared.ts'

const CORE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uCorruption;
  uniform float uPulse;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  varying float vNoise;
  ${SIMPLEX_3D}
  void main() {
    vec3 p = position;
    float n = snoise(p * 1.3 + vec3(0.0, uTime * 0.55, 0.0));
    float fine = snoise(p * 3.6 - uTime * 1.2);
    p += normal * (n * (0.22 + uCorruption * 0.32 + uPulse * 0.35) + fine * 0.07 * uCorruption);
    // Digital tearing: whole horizontal slices of the body jump sideways for a frame.
    float band = floor((p.y + 3.0) * 5.0);
    float tear = fract(sin(band * 91.7 + floor(uTime * 11.0) * 13.1) * 43758.5453);
    if (tear > 1.0 - 0.22 * uCorruption) p.x += (tear - 0.88) * 3.0 * uCorruption;
    vNoise = n;
    vPos = p;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = normalize(-mv.xyz);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`

const CORE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uCorruption;
  uniform float uCleanse;
  uniform float uPulse;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  varying float vNoise;
  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);
    float veins = smoothstep(0.32, 0.0, abs(vNoise));
    float scan = step(0.55, fract(vPos.y * 9.0 - uTime * 2.5)) * 0.25;
    vec3 col = vec3(0.015, 0.008, 0.03);
    col += uColor * (fres * 2.6 + veins * (0.8 + uCorruption * 1.6) + scan * uCorruption);
    // RGB fringing on the rim: the creature does not quite exist in one place.
    col.r += fres * 0.9 * uCorruption * step(0.6, fract(uTime * 6.0 + vPos.x * 2.0));
    col.b += fres * 0.7 * uCorruption * step(0.5, fract(uTime * 4.0 - vPos.y * 1.5));
    col += vec3(1.0) * uPulse * (0.6 + fres);
    // Claude's fix: the corruption bleaches into clean light.
    col = mix(col, vec3(1.0, 0.96, 0.88) * (1.2 + fres * 2.5), uCleanse);
    gl_FragColor = vec4(col, 1.0);
  }
`

const GLITCH_RGB = ['#ff2bd6', '#22e6ff']
const hash = (x: number) => {
  const s = Math.sin(x) * 43758.5453
  return s - Math.floor(s)
}

type GlitchBeastProps = {
  color: string
  /** 0..1 */
  health: number
  fx: BattleFx
  /** Claude is mid-finisher: the creature panics. */
  agitated: boolean
  /** Page-clock seconds of victory, or null. */
  wonAt: number | null
  reducedMotion: boolean
  lowPower: boolean
}

/**
 * The glitch made flesh: a voxel wyrm with a writhing, tearing heart, shedding corrupted
 * data blocks. Weaker means wilder; on victory it bleaches and implodes.
 */
export function GlitchBeast({
  color,
  health,
  fx,
  agitated,
  wonAt,
  reducedMotion,
  lowPower,
}: GlitchBeastProps) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const blocks = useRef<THREE.InstancedMesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const blockCount = lowPower ? 24 : 48
  const tint = useMemo(() => new THREE.Color(color), [color])
  const dragon = useDragonMaterials(color)

  const core = useShader(
    CORE_VERTEX,
    CORE_FRAGMENT,
    {
      uTime: { value: 0 },
      uCorruption: { value: 0.4 },
      uCleanse: { value: 0 },
      uPulse: { value: 0 },
      uColor: { value: tint.clone() },
    },
    { transparent: false, depthWrite: true },
  )

  const orbits = useMemo(
    () =>
      Array.from({ length: blockCount }, (_, i) => ({
        radius: 3.4 + hash(i * 3.1) * 3,
        speed: (0.3 + hash(i * 5.7) * 0.9) * (i % 2 ? 1 : -1),
        phase: hash(i * 9.3) * Math.PI * 2,
        tilt: (hash(i * 1.7) - 0.5) * 2.4,
        size: 0.05 + hash(i * 2.9) * 0.11,
      })),
    [blockCount],
  )
  // Mostly the kind's colour, with magenta and cyan blocks like a broken RGB signal.
  const blockColors = useMemo(() => {
    const colors = new Float32Array(blockCount * 3)
    const c = new THREE.Color()
    for (let i = 0; i < blockCount; i++) {
      c.set(i % 5 === 0 ? GLITCH_RGB[0] : i % 7 === 0 ? GLITCH_RGB[1] : color)
      c.multiplyScalar(2.2).toArray(colors, i * 3)
    }
    return colors
  }, [blockCount, color])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, delta) => {
    const now = nowSeconds()
    fx.pulse = Math.max(0, fx.pulse - delta * 3.5)
    const calm = reducedMotion ? 0 : 1
    const cleanse = wonAt === null ? 0 : clamp01((now - wonAt) / 0.7)
    const implode = wonAt === null ? 0 : clamp01((now - wonAt - 0.7) / 0.45)
    const panic = agitated ? 1 : 0
    const corruption = Math.min(1.4, 0.35 + (1 - health) * 0.65 + panic * 0.5) * (1 - cleanse)

    const u = core.uniforms
    u.uTime.value = now
    u.uCorruption.value = corruption * (agitated ? 0.7 + Math.random() * 0.6 : 1)
    u.uCleanse.value = cleanse
    u.uPulse.value = fx.pulse
    const d = dragon.shared
    d.uTime.value = now
    d.uCorruption.value = u.uCorruption.value
    d.uCleanse.value = cleanse
    d.uPulse.value = fx.pulse

    if (group.current) {
      const s = Math.max(0.001, (1 - implode) * (1 + Math.sin(implode * Math.PI) * 0.7))
      group.current.scale.setScalar(s * (1 + fx.pulse * 0.1))
      const jitter = calm * (panic * 0.12 + (1 - health) * 0.05) * (1 - cleanse)
      group.current.position.set(
        BEAST.x + (Math.random() - 0.5) * jitter,
        BEAST.y + Math.sin(now * 1.2) * 0.3 * calm + (Math.random() - 0.5) * jitter,
        BEAST.z,
      )
    }
    // It faces the guardian, weaving in the air; in a panic it thrashes.
    if (body.current) {
      body.current.rotation.y =
        -0.55 + Math.sin(now * 0.45) * 0.2 * calm + panic * Math.sin(now * 9) * 0.12
      body.current.rotation.z = Math.sin(now * 0.8) * 0.06 * calm
    }
    if (light.current)
      light.current.intensity = (10 + fx.pulse * 50 + cleanse * 120) * (1 - implode)

    const mesh = blocks.current
    if (mesh) {
      const tick = Math.floor(now * 7)
      orbits.forEach((o, i) => {
        const a = o.phase + now * o.speed * calm
        const r = o.radius * (1 - cleanse * 0.9)
        dummy.position.set(Math.cos(a) * r, Math.sin(a * 1.3 + o.tilt) * 1.6, Math.sin(a) * r)
        // Data blocks teleport a little from time to time, like dropped packets.
        if (calm && hash(tick + i * 7.1) > 0.86) {
          dummy.position.x += (hash(tick * 3 + i) - 0.5) * corruption * 1.2
          dummy.position.y += (hash(tick * 5 + i) - 0.5) * corruption * 0.8
        }
        dummy.rotation.set(a * 2, a * 3, 0)
        dummy.scale.setScalar(o.size * (0.6 + corruption * 0.6) * (1 - cleanse))
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group ref={group} position={BEAST}>
      <group ref={body} scale={0.8} position={[0, -0.4, 0]}>
        <VoxelDragon
          materials={dragon}
          color={color}
          pulse={() => fx.pulse}
          agitated={agitated}
          calm={reducedMotion ? 0 : 1}
        >
          {/* The corrupted heart, pulsing through the dragon's chest. */}
          <mesh material={core} position={[0, 0.1, 1.45]} scale={0.5}>
            <icosahedronGeometry args={[1, lowPower ? 10 : 20]} />
          </mesh>
        </VoxelDragon>
      </group>
      <instancedMesh ref={blocks} args={[undefined, undefined, blockCount]}>
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute attach="attributes-color" args={[blockColors, 3]} />
        </boxGeometry>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
      <pointLight ref={light} color={color} intensity={10} distance={9} decay={1.6} />
    </group>
  )
}
