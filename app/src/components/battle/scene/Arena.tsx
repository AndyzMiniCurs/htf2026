import { Environment, Lightformer, Sparkles, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ISLANDS, UV_VERTEX, useNightMaterial, useShader } from '#/components/achrona/scene/kit.tsx'
import { CloudSea, SkyDome, Starfield } from '#/components/achrona/scene/Sky.tsx'
import { glowTexture, nowSeconds } from './shared.ts'

const RUNE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uGold;
  uniform float uTime;
  uniform float uPower;
  varying vec2 vUv;
  #define PI 3.14159265
  float ring(float r, float at, float w) { return smoothstep(w, 0.0, abs(r - at)); }
  float glyphs(float a, float r, float inner, float outer, float count, float seed) {
    if (r < inner || r > outer) return 0.0;
    float cell = floor((a / (2.0 * PI) + 0.5) * count);
    float row = floor((r - inner) / (outer - inner) * 3.0);
    float on = step(0.45, fract(sin(cell * 12.9898 + row * 78.233 + seed) * 43758.5453));
    float gap = step(0.18, fract((a / (2.0 * PI) + 0.5) * count));
    return on * gap;
  }
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    float gold = ring(r, 0.96, 0.012) + ring(r, 0.9, 0.006) + ring(r, 0.62, 0.008) + ring(r, 0.3, 0.006);
    gold += glyphs(a + uTime * 0.06, r, 0.91, 0.95, 64.0, 1.0) * 0.9;
    float power = glyphs(a - uTime * 0.12, r, 0.64, 0.7, 40.0, 7.0);
    // A hexagram: two triangles, drawn as distance to their edges.
    float t1 = r * cos(mod(a, 2.0 * PI / 3.0) - PI / 3.0);
    float t2 = r * cos(mod(a + PI / 3.0, 2.0 * PI / 3.0) - PI / 3.0);
    float star = (ring(t1, 0.31, 0.006) + ring(t2, 0.31, 0.006)) * step(r, 0.63);
    vec3 col = uGold * gold * 1.4 + uColor * (power + star) * (0.6 + uPower * 2.4);
    col += uColor * exp(-abs(r - 0.96) * 28.0) * (0.25 + uPower * 0.5);
    float alpha = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0) * step(r, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`

/** The sealing circle on the island; its inner runes brighten as Claude's summon charges. */
function RuneCircle({ color, charge }: { color: string; charge: number }) {
  const material = useShader(
    UV_VERTEX,
    RUNE_FRAGMENT,
    {
      uColor: { value: new THREE.Color(color) },
      uGold: { value: new THREE.Color('#e0b66a') },
      uTime: { value: 0 },
      uPower: { value: 0 },
    },
    { blending: THREE.AdditiveBlending, toneMapped: false },
  )
  useFrame((_, delta) => {
    material.uniforms.uTime.value = nowSeconds()
    const power = material.uniforms.uPower
    power.value = THREE.MathUtils.damp(power.value, charge, 4, delta)
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} material={material}>
      <planeGeometry args={[15, 15]} />
    </mesh>
  )
}

/** Standing stones around the circle, each crowned with a floating gold rune. */
function RuneStones({ reducedMotion }: { reducedMotion: boolean }) {
  const stones = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        return { x: Math.cos(a) * 7.9, z: Math.sin(a) * 7.9, h: 1.8 + (i % 3) * 0.5, a }
      }),
    [],
  )
  const runes = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!runes.current || reducedMotion) return
    const t = nowSeconds()
    runes.current.children.forEach((rune, i) => {
      rune.position.y = stones[i].h + 0.7 + Math.sin(t * 1.4 + i) * 0.15
      rune.rotation.y = t * 0.8 + i
    })
  })
  return (
    <group>
      {stones.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, s.h / 2 - 0.2, s.z]}
          rotation={[0, -s.a, (i % 2 ? 1 : -1) * 0.06]}
        >
          <boxGeometry args={[0.7, s.h, 0.5]} />
          <meshStandardMaterial color="#1b1f33" roughness={0.85} flatShading />
        </mesh>
      ))}
      <group ref={runes}>
        {stones.map((s, i) => (
          <group key={i} position={[s.x, s.h + 0.7, s.z]}>
            <mesh scale={[0.18, 0.3, 0.18]}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#ffd98a" toneMapped={false} />
            </mesh>
            <sprite scale={1.4}>
              <spriteMaterial
                map={glowTexture()}
                color="#e0b66a"
                transparent
                opacity={0.55}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          </group>
        ))}
      </group>
    </group>
  )
}

/** The arena's floating island, its top flush with y = 0. */
function Island() {
  const { nodes } = useGLTF(ISLANDS)
  const mesh = nodes.Round as THREE.Mesh
  const material = useNightMaterial(mesh.material as THREE.Material, '#3a3f86')
  const scale = 0.62
  const top = useMemo(() => {
    mesh.geometry.computeBoundingBox()
    return mesh.geometry.boundingBox?.max.y ?? 0
  }, [mesh])
  return (
    <mesh
      geometry={mesh.geometry}
      material={material}
      scale={scale}
      position={[0, -top * scale + 0.02, 0]}
      receiveShadow
    />
  )
}

/** Sky, clouds, the island and its circle, and the light the glossy creature reflects. */
export function Arena({
  color,
  charge,
  reducedMotion,
  lowPower,
}: {
  color: string
  charge: number
  reducedMotion: boolean
  lowPower: boolean
}) {
  return (
    <>
      <SkyDome />
      <Starfield reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <CloudSea lowPower={lowPower} />
        <Island />
      </Suspense>
      <RuneCircle color={color} charge={charge} />
      <RuneStones reducedMotion={reducedMotion} />
      <Sparkles
        count={lowPower ? 30 : 80}
        scale={[16, 7, 16]}
        position={[0, 3.5, 0]}
        size={2.4}
        speed={reducedMotion ? 0 : 0.35}
        color="#e0b66a"
      />
      <hemisphereLight args={['#8f9cff', '#140d26', 0.7]} />
      <directionalLight position={[-8, 14, -10]} intensity={1.6} color="#b8c4ff" />
      <directionalLight position={[6, 6, 12]} intensity={0.6} color="#ffd9a8" />
      {/* Local light rig, so nothing is fetched at pitch time. */}
      <Environment resolution={128}>
        <Lightformer form="ring" intensity={1} color={color} scale={8} position={[0, 4, -9]} />
        <Lightformer intensity={2} color="#9fb0ff" position={[-7, 8, 6]} scale={[10, 3, 1]} />
        <Lightformer intensity={1.5} color="#ffcf8a" position={[7, 3, 6]} scale={[6, 6, 1]} />
      </Environment>
    </>
  )
}
