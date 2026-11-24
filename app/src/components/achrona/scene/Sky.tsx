import { Billboard, Cloud, Clouds, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LIGHT, UV_VERTEX, useShader } from './kit.tsx'

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(h, 0.55)) : mix(uHorizon, uBottom, pow(-h, 0.45));
    // A violet band where the curse glows on the horizon.
    c += vec3(0.35, 0.08, 0.5) * exp(-abs(h) * 9.0) * 0.6;
    gl_FragColor = vec4(c, 1.0);
  }
`

/** Night dome: black zenith, violet horizon glow, a dark abyss below the cloud sea. */
export function SkyDome() {
  const material = useShader(
    SKY_VERTEX,
    SKY_FRAGMENT,
    {
      uTop: { value: new THREE.Color('#05030b') },
      uHorizon: { value: new THREE.Color('#2b1150') },
      uBottom: { value: new THREE.Color('#0b0616') },
    },
    { side: THREE.BackSide, transparent: false, depthWrite: false, fog: false },
  )
  return (
    <mesh scale={160} renderOrder={-10}>
      <sphereGeometry args={[1, 48, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

const HALO_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float glow = pow(max(1.0 - d, 0.0), 2.6);
    gl_FragColor = vec4(uColor * glow * 1.6, glow);
  }
`

/** A great pale moon with a soft halo, low over the citadel's shoulder. */
export function Moon() {
  const halo = useShader(
    UV_VERTEX,
    HALO_FRAGMENT,
    { uColor: { value: new THREE.Color('#c9a8ff') } },
    { blending: THREE.AdditiveBlending, fog: false },
  )
  return (
    <group position={[-70, 38, -95]}>
      <mesh>
        <sphereGeometry args={[7, 48, 24]} />
        <meshBasicMaterial color="#f6eeff" fog={false} toneMapped={false} />
      </mesh>
      <Billboard>
        <mesh scale={46}>
          <planeGeometry />
          <primitive object={halo} attach="material" />
        </mesh>
      </Billboard>
    </group>
  )
}

export function Starfield({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Stars
      radius={110}
      depth={40}
      count={5000}
      factor={4.5}
      saturation={0.6}
      fade
      speed={reducedMotion ? 0 : 0.6}
    />
  )
}

/** The sea of clouds the islands float on, tinted by the curse, plus wisps drifting between districts. */
export function CloudSea({ lowPower }: { lowPower: boolean }) {
  return (
    <Clouds
      material={THREE.MeshLambertMaterial}
      texture="/textures/cloud.png"
      limit={lowPower ? 120 : 420}
    >
      <Cloud
        seed={1}
        segments={lowPower ? 30 : 70}
        bounds={[70, 3, 70]}
        volume={22}
        color="#4a2d86"
        position={[0, -17, 0]}
        fade={90}
        speed={0.08}
        opacity={0.9}
      />
      {!lowPower && (
        <>
          <Cloud
            seed={7}
            segments={40}
            bounds={[60, 2, 60]}
            volume={14}
            color={LIGHT.curse}
            position={[0, -12, 0]}
            fade={80}
            speed={0.12}
            opacity={0.45}
          />
          <Cloud
            seed={3}
            segments={10}
            bounds={[9, 1.5, 3]}
            volume={5}
            color="#9d86e8"
            position={[-14, 2, 14]}
            fade={40}
            speed={0.2}
            opacity={0.35}
          />
          <Cloud
            seed={5}
            segments={10}
            bounds={[9, 1.5, 3]}
            volume={5}
            color="#9d86e8"
            position={[16, 4, -12]}
            fade={40}
            speed={0.2}
            opacity={0.35}
          />
        </>
      )}
    </Clouds>
  )
}

const MIST_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    vec2 p = vUv * 3.0 + vec2(uTime * 0.02, uTime * 0.01);
    float n = noise(p) * 0.6 + noise(p * 2.1) * 0.3 + noise(p * 4.3) * 0.1;
    float edge = smoothstep(0.5, 0.05, length(vUv - 0.5));
    gl_FragColor = vec4(uColor, n * edge * 0.42);
  }
`

const MIST_BANKS: Array<{ position: [number, number, number]; scale: number; color: string }> = [
  { position: [0, -6, 0], scale: 90, color: '#5a2f9a' },
  { position: [-22, -2, 18], scale: 34, color: '#7a4fc4' },
  { position: [24, -3, -16], scale: 38, color: '#6a3fb0' },
  { position: [6, -1, 26], scale: 30, color: '#8e5ad6' },
  { position: [-26, 0, -20], scale: 32, color: '#5e3aa6' },
]

/** Low banks of violet haze drifting between the islands: depth layers for the camera to look through. */
export function MistBanks() {
  return (
    <group>
      {MIST_BANKS.map((bank, i) => (
        <MistBank key={i} seed={i * 17.3} {...bank} />
      ))}
    </group>
  )
}

function MistBank({
  position,
  scale,
  color,
  seed,
}: {
  position: [number, number, number]
  scale: number
  color: string
  seed: number
}) {
  const material = useShader(
    UV_VERTEX,
    MIST_FRAGMENT,
    { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uSeed: { value: seed } },
    { side: THREE.DoubleSide },
  )
  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
  })
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, seed]} scale={scale}>
      <planeGeometry />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
