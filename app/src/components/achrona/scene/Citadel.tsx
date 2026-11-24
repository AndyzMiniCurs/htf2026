import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CITADEL } from '../world.ts'
import { House, LIGHT, Prop, UV_VERTEX, useShader } from './kit.tsx'

const FRESNEL_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const FRESNEL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
    float pulse = 0.85 + 0.15 * sin(uTime * 2.0);
    gl_FragColor = vec4(uColor * (0.6 + f * 3.2) * pulse, 0.4 + f * 0.6);
  }
`
const BEAM_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float flow = 0.6 + 0.4 * sin(vUv.y * 30.0 - uTime * 6.0);
    float fade = pow(1.0 - vUv.y, 1.4);
    gl_FragColor = vec4(uColor * 2.0 * flow, fade * 0.55);
  }
`
const RUNES_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    // Ring uvs are planar, so measure the angle around the centre and carve it into rune segments.
    float a = atan(vUv.y - 0.5, vUv.x - 0.5) / 6.28318 + 0.5;
    float seg = fract(a * 36.0);
    float rune = step(0.15, seg) * step(seg, 0.65) * step(0.3, fract(a * 7.0 + 0.2));
    gl_FragColor = vec4(uColor * 2.4, rune * 0.9);
  }
`

type CitadelProps = { reducedMotion: boolean; onCore: (core: THREE.Mesh | null) => void }

/** The citadel: a ring of towers around a keep, crowned by the great crystal, its rune halos and a beam to the sky. */
export function Citadel({ reducedMotion, onCore }: CitadelProps) {
  const crystal = useRef<THREE.Group>(null)
  const haloA = useRef<THREE.Mesh>(null)
  const haloB = useRef<THREE.Mesh>(null)
  const shards = useRef<THREE.Group>(null)
  const shell = useShader(
    FRESNEL_VERTEX,
    FRESNEL_FRAGMENT,
    { uColor: { value: new THREE.Color(LIGHT.curseHi) }, uTime: { value: 0 } },
    { side: THREE.DoubleSide, blending: THREE.AdditiveBlending },
  )
  const beam = useShader(
    UV_VERTEX,
    BEAM_FRAGMENT,
    { uColor: { value: new THREE.Color(LIGHT.pink) }, uTime: { value: 0 } },
    { side: THREE.DoubleSide, blending: THREE.AdditiveBlending },
  )
  const runes = useShader(
    UV_VERTEX,
    RUNES_FRAGMENT,
    { uColor: { value: new THREE.Color(LIGHT.pink) } },
    { side: THREE.DoubleSide, blending: THREE.AdditiveBlending },
  )

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    shell.uniforms.uTime.value = t
    beam.uniforms.uTime.value = t
    if (reducedMotion) return
    if (crystal.current) {
      crystal.current.rotation.y += delta * 0.3
      crystal.current.position.y = 15 + Math.sin(t * 0.8) * 0.35
    }
    if (haloA.current) haloA.current.rotation.z += delta * 0.25
    if (haloB.current) haloB.current.rotation.z -= delta * 0.18
    if (shards.current) shards.current.rotation.y -= delta * 0.6
  })

  const towers: Array<[number, number, number]> = [
    [-3.4, -3.4, 4],
    [3.4, -3.4, 4],
    [-3.4, 3.4, 4],
    [3.4, 3.4, 4],
    [0, -4.6, 3],
    [0, 4.6, 3],
    [-4.6, 0, 3],
    [4.6, 0, 3],
  ]
  const orbiting = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), [])

  return (
    <group position={CITADEL.position}>
      {towers.map(([x, z, floors]) => (
        <House
          key={`${x}${z}`}
          position={[x, 0, z]}
          floors={floors}
          wall="wall-window-round"
          door="wall"
          roof="roof-high-point"
        />
      ))}
      <House
        position={[0, 0, 0]}
        floors={6}
        wall="wall-window-shutters"
        roof="roof-high-point"
        scale={1.5}
      />
      <House
        position={[-1.5, 0, 0]}
        floors={4}
        wall="wall"
        roof="roof-high-gable"
        rotation={Math.PI / 2}
        scale={1.2}
      />
      <House
        position={[1.5, 0, 0]}
        floors={4}
        wall="wall"
        roof="roof-high-gable"
        rotation={Math.PI / 2}
        scale={1.2}
      />
      <House
        position={[0, 0, 1.6]}
        floors={3}
        wall="wall-window-shutters"
        roof="roof-high-gable"
        scale={1.2}
      />
      <House
        position={[0, 0, -1.6]}
        floors={3}
        wall="wall-window-shutters"
        roof="roof-high-gable"
        scale={1.2}
      />
      <Prop name="banner-red" position={[3.4, 1.4, -3.4]} />
      <Prop name="banner-green" position={[-3.4, 1.4, 3.4]} rotation={[0, Math.PI, 0]} />
      <Prop name="fountain-round-detail" position={[0, 0, 6]} scale={1.2} />

      <group ref={crystal} position={[0, 15, 0]}>
        {/* The bright core is also the god-ray source. */}
        <mesh ref={onCore} scale={[0.9, 2, 0.9]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffd6ff" toneMapped={false} />
        </mesh>
        <mesh scale={[1.7, 3.6, 1.7]}>
          <octahedronGeometry args={[1, 0]} />
          <primitive object={shell} attach="material" />
        </mesh>
        <group ref={shards}>
          {orbiting.map((a) => (
            <mesh
              key={a}
              position={[Math.cos(a) * 3.2, Math.sin(a * 2) * 0.8, Math.sin(a) * 3.2]}
              scale={[0.22, 0.55, 0.22]}
            >
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                color={LIGHT.curseHi}
                emissive={LIGHT.curse}
                emissiveIntensity={3}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      </group>
      <mesh ref={haloA} position={[0, 15, 0]} rotation={[Math.PI / 2 - 0.35, 0, 0]}>
        <ringGeometry args={[4.6, 5.1, 128, 1]} />
        <primitive object={runes} attach="material" />
      </mesh>
      <mesh ref={haloB} position={[0, 15, 0]} rotation={[Math.PI / 2 + 0.5, 0.3, 0]}>
        <torusGeometry args={[6.2, 0.06, 8, 160]} />
        <meshBasicMaterial color={LIGHT.pink} toneMapped={false} />
      </mesh>
      {/* Beam from the crystal down to the keep, and up into the sky. */}
      <mesh position={[0, 11, 0]}>
        <cylinderGeometry args={[0.12, 0.9, 6, 16, 1, true]} />
        <primitive object={beam} attach="material" />
      </mesh>
      <mesh position={[0, 45, 0]}>
        <cylinderGeometry args={[0.5, 0.15, 60, 16, 1, true]} />
        <primitive object={beam} attach="material" />
      </mesh>
      <pointLight
        position={[0, 14, 0]}
        color={LIGHT.curseHi}
        intensity={140}
        distance={40}
        decay={2}
      />
    </group>
  )
}
