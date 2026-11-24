import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { CITADEL, DISTRICTS } from '../world.ts'
import { LIGHT, UV_VERTEX, useShader } from './kit.tsx'

const FLOW_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uSpeed;
  varying vec2 vUv;
  void main() {
    // Tube uv.x runs along the line: send pulses of magic travelling outward from the citadel.
    float flow = fract(vUv.x * 7.0 - uTime * uSpeed);
    float pulse = smoothstep(0.0, 0.12, flow) * smoothstep(0.45, 0.12, flow);
    gl_FragColor = vec4(uColor * (0.4 + pulse * 2.2), 0.06 + pulse * 0.6);
  }
`

/** Ley lines: sagging arcs of energy from the citadel to every district; ember and fast where a glitch is open. */
export function LeyLines({ corrupted }: { corrupted: Set<string> }) {
  return (
    <group>
      {DISTRICTS.filter((d) => d.id !== CITADEL.id).map((d) => (
        <LeyLine key={d.id} to={d.position} corrupted={corrupted.has(d.id)} />
      ))}
    </group>
  )
}

function LeyLine({ to, corrupted }: { to: [number, number, number]; corrupted: boolean }) {
  const geometry = useMemo(() => {
    const from = new THREE.Vector3(
      CITADEL.position[0],
      CITADEL.position[1] - 3.5,
      CITADEL.position[2],
    )
    const end = new THREE.Vector3(to[0], to[1] - 2.5, to[2])
    const mid = from.clone().lerp(end, 0.5)
    mid.y -= 4
    return new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(from, mid, end),
      64,
      0.05,
      8,
      false,
    )
  }, [to])
  const material = useShader(
    UV_VERTEX,
    FLOW_FRAGMENT,
    {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(corrupted ? LIGHT.ember : LIGHT.royal) },
      uSpeed: { value: corrupted ? 1.4 : 0.45 },
    },
    { blending: THREE.AdditiveBlending },
  )
  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
    ;(material.uniforms.uColor.value as THREE.Color).set(corrupted ? LIGHT.ember : LIGHT.royal)
    material.uniforms.uSpeed.value = corrupted ? 1.4 : 0.45
  })
  return (
    <mesh geometry={geometry}>
      <primitive object={material} attach="material" />
    </mesh>
  )
}
