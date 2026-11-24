import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { LIGHT } from './kit.tsx'

const CUBES = 160

/** The event's loose crystal cubes: a slow ring of debris circling the whole world. */
export function CubeDebris({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const matrices = useMemo(() => {
    const out: Array<THREE.Matrix4> = []
    const q = new THREE.Quaternion()
    for (let i = 0; i < CUBES; i++) {
      const a = (i / CUBES) * Math.PI * 2 + Math.sin(i * 12.9) * 0.4
      const r = 27 + Math.abs(Math.sin(i * 7.3)) * 12
      const y = -9 + Math.abs(Math.sin(i * 3.1)) * 15
      const s = 0.1 + Math.abs(Math.sin(i * 5.7)) * 0.32
      q.setFromEuler(new THREE.Euler(i, i * 0.7, i * 0.3))
      out.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
          q,
          new THREE.Vector3(s, s, s),
        ),
      )
    }
    return out
  }, [])
  useEffect(() => {
    if (!mesh.current) return
    matrices.forEach((m, i) => mesh.current?.setMatrixAt(i, m))
    mesh.current.instanceMatrix.needsUpdate = true
  }, [matrices])
  useFrame((_, delta) => {
    if (group.current && !reducedMotion) group.current.rotation.y += delta * 0.035
  })
  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, CUBES]}>
        <boxGeometry />
        <meshStandardMaterial
          color={LIGHT.curseHi}
          emissive={LIGHT.curse}
          emissiveIntensity={1.6}
          flatShading
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  )
}

/**
 * A cinematic arrival: the camera starts high and far, then glides down to the citadel.
 * Calls `onDone` when it lands so orbit controls can take over from the same spot.
 */
export function CameraIntro({
  to,
  target,
  reducedMotion,
  onDone,
}: {
  to: THREE.Vector3
  target: THREE.Vector3
  reducedMotion: boolean
  onDone: () => void
}) {
  const camera = useThree((state) => state.camera)
  const from = useMemo(
    () =>
      to
        .clone()
        .multiplyScalar(2.1)
        .add(new THREE.Vector3(0, 26, 0)),
    [to],
  )
  const progress = useRef(reducedMotion ? 1 : 0)
  const done = useRef(false)
  useFrame((_, delta) => {
    if (done.current) return
    progress.current = Math.min(1, progress.current + delta / 4.2)
    const eased = 1 - Math.pow(1 - progress.current, 4)
    camera.position.lerpVectors(from, to, eased)
    camera.lookAt(target)
    if (progress.current >= 1) {
      done.current = true
      onDone()
    }
  })
  return null
}

/** Portrait screens see less width: widen the lens so the whole citadel and its districts stay in frame. */
export function ResponsiveLens() {
  const camera = useThree((state) => state.camera)
  const aspect = useThree((state) => state.size.width / state.size.height)
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    camera.fov = aspect < 1 ? 62 : aspect < 1.4 ? 44 : 36
    camera.updateProjectionMatrix()
  }, [camera, aspect])
  return null
}
