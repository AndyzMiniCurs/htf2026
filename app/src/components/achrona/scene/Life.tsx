import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DISTRICTS } from '../world.ts'
import { LIGHT } from './kit.tsx'

const BIRDS = 18

/** A bird silhouette: two wings hinged on the body, built once and shared by the flock. */
function birdGeometry() {
  const g = new THREE.BufferGeometry()
  // Body at the origin, wing tips at ±x; the vertex shader flaps vertices by |x|.
  const v = [0, 0, 0.35, -1, 0, -0.1, 0, 0, -0.25, 0, 0, 0.35, 0, 0, -0.25, 1, 0, -0.1]
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  g.computeVertexNormals()
  return g
}

const BIRD_VERTEX = /* glsl */ `
  uniform float uTime;
  attribute float aPhase;
  void main() {
    vec3 p = position;
    float flap = sin(uTime * 9.0 + aPhase) * 0.55;
    p.y += abs(p.x) * flap;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  }
`
const BIRD_FRAGMENT = /* glsl */ `
  void main() { gl_FragColor = vec4(0.08, 0.04, 0.14, 1.0); }
`

/** A flock of dark birds circling the citadel in loose formation, wings beating. */
export function Flock({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => {
    const g = birdGeometry()
    g.setAttribute(
      'aPhase',
      new THREE.InstancedBufferAttribute(
        new Float32Array(Array.from({ length: BIRDS }, (_, i) => i * 1.7)),
        1,
      ),
    )
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BIRD_VERTEX,
        fragmentShader: BIRD_FRAGMENT,
        uniforms: { uTime: { value: 0 } },
        side: THREE.DoubleSide,
      }),
    [],
  )
  const birds = useMemo(
    () =>
      Array.from({ length: BIRDS }, (_, i) => ({
        offset: (i % 6) * 0.09 + Math.floor(i / 6) * 0.03,
        radius: 20 + (i % 3) * 1.6,
        height: 13 + (i % 4) * 0.9,
        size: 0.32 + (i % 3) * 0.08,
      })),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime()
    material.uniforms.uTime.value = t
    if (!mesh.current) return
    birds.forEach((bird, i) => {
      const a = t * 0.12 + bird.offset
      dummy.position.set(
        Math.cos(a) * bird.radius,
        bird.height + Math.sin(t * 0.7 + i) * 0.6,
        Math.sin(a) * bird.radius,
      )
      // Face along the circle's tangent, banking into the turn.
      dummy.rotation.set(0.25, -a, 0)
      dummy.scale.setScalar(bird.size)
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geometry, material, BIRDS]} frustumCulled={false} />
}

const LANTERN_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    // Each lantern rises 16 units over its own lifetime, sways, then starts again from its village.
    float life = fract(uTime * (0.035 + aSeed * 0.02) + aSeed * 7.0);
    vec3 p = position;
    p.y += life * 16.0;
    p.x += sin(uTime * 0.6 + aSeed * 20.0) * 0.6 * life;
    p.z += cos(uTime * 0.5 + aSeed * 13.0) * 0.6 * life;
    vAlpha = smoothstep(0.0, 0.08, life) * smoothstep(1.0, 0.6, life);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (9.0 + aSeed * 6.0) * uPixelRatio * (30.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`
const LANTERN_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = smoothstep(0.5, 0.0, d);
    float halo = pow(max(1.0 - d, 0.0), 3.0) * 0.6;
    gl_FragColor = vec4(uColor * (core * 2.4 + halo), (core + halo) * vAlpha);
  }
`

const LANTERNS = 70

/** Sky lanterns drifting up from the villages: the people of Achrona still hope. */
export function SkyLanterns({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(LANTERNS * 3)
    const seeds = new Float32Array(LANTERNS)
    const villages = DISTRICTS.filter((d) => d.id !== 'citadel')
    for (let i = 0; i < LANTERNS; i++) {
      const d = villages[i % villages.length]
      const a = i * 2.39996
      const r = 1 + (i % 5) * 0.7
      positions.set(
        [d.position[0] + Math.cos(a) * r, d.position[1] + 1, d.position[2] + Math.sin(a) * r],
        i * 3,
      )
      seeds[i] = (i * 0.618034) % 1
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: LANTERN_VERTEX,
        fragmentShader: LANTERN_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uColor: { value: new THREE.Color(LIGHT.lantern) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  useEffect(() => {
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
  }, [material])
  useFrame((_, delta) => {
    if (!reducedMotion) material.uniforms.uTime.value += delta
  })
  return <points geometry={geometry} material={material} frustumCulled={false} />
}
