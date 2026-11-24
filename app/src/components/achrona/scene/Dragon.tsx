import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { LIGHT } from './kit.tsx'

const TAIL = [0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.34]
const SPINES = [2, 0.6, -0.8, -2.2]

type Box = { p: [number, number, number]; s: [number, number, number] }

function Block({ p, s, material }: Box & { material: THREE.Material }) {
  return (
    <mesh position={p} material={material}>
      <boxGeometry args={s} />
    </mesh>
  )
}

/** One wing: a bone along the leading edge and a membrane trailing behind it. Built for the right side; the left mirrors it. */
function Wing({ side, hide, skin }: { side: 1 | -1; hide: THREE.Material; skin: THREE.Material }) {
  return (
    <group scale={[side, 1, 1]}>
      <Block p={[3.2, 0, 0.2]} s={[6.4, 0.32, 0.4]} material={hide} />
      <Block p={[3.2, -0.05, -1.7]} s={[6.4, 0.08, 3.6]} material={skin} />
      <Block p={[6.1, 0, -1.2]} s={[0.4, 0.2, 2.6]} material={hide} />
    </group>
  )
}

/** A blocky shadow dragon circling far above the citadel: wings beating, tail swaying, eyes burning curse-violet. */
export function Dragon({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const leftWing = useRef<THREE.Group>(null)
  const rightWing = useRef<THREE.Group>(null)
  const tail = useRef<Array<THREE.Mesh | null>>([])
  const { hide, skin, eye } = useMemo(
    () => ({
      // A faint violet glow and no fog: pure black would vanish into the night sky on phones.
      hide: new THREE.MeshStandardMaterial({
        color: '#1d1628',
        emissive: '#2a1745',
        roughness: 0.7,
        flatShading: true,
        fog: false,
      }),
      skin: new THREE.MeshStandardMaterial({
        color: '#3a2d4d',
        emissive: '#3b1d5c',
        roughness: 0.9,
        side: THREE.DoubleSide,
        fog: false,
      }),
      eye: new THREE.MeshStandardMaterial({
        color: LIGHT.curseHi,
        emissive: LIGHT.curseHi,
        emissiveIntensity: 4,
        fog: false,
      }),
    }),
    [],
  )
  const ahead = useMemo(() => new THREE.Vector3(), [])

  // A tight, lopsided loop over the citadel: wide enough to read as flight, narrow enough to stay in a phone's frame.
  const path = (t: number, out: THREE.Vector3) => {
    const a = t * 0.13
    const r = 15 + Math.sin(a * 2) * 3
    return out.set(Math.cos(a) * r, 19 + Math.sin(a * 3) * 1.5, Math.sin(a) * r)
  }

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime()
    const g = root.current
    if (!g) return
    path(t, g.position)
    g.lookAt(path(t + 0.4, ahead))
    // Bank into the turn: the loop's centre is on the dragon's local -x side.
    g.rotateZ(0.3)
    const flap = Math.sin(t * 2.4) * 0.55
    // Wings push the body down a touch on each downstroke.
    g.position.y -= flap * 0.4
    if (leftWing.current) leftWing.current.rotation.z = -flap
    if (rightWing.current) rightWing.current.rotation.z = flap
    tail.current.forEach((seg, i) => {
      if (seg) seg.position.x = Math.sin(t * 1.6 - i * 0.6) * i * 0.12
    })
  })

  return (
    <group ref={root} scale={0.75}>
      <Block p={[0, 0, 0]} s={[2.2, 1.8, 5]} material={hide} />
      {SPINES.map((z) => (
        <Block key={z} p={[0, 1.15, z]} s={[0.3, 0.5, 0.6]} material={hide} />
      ))}
      <Block p={[0, 0.4, 3.6]} s={[1, 1, 2.4]} material={hide} />
      <Block p={[0, 0.7, 5.6]} s={[1.8, 1.4, 2]} material={hide} />
      <Block p={[0, 0.35, 7.1]} s={[1.3, 0.7, 1.4]} material={hide} />
      <Block p={[0.5, 1.6, 5.2]} s={[0.25, 0.6, 0.25]} material={hide} />
      <Block p={[-0.5, 1.6, 5.2]} s={[0.25, 0.6, 0.25]} material={hide} />
      <Block p={[0.92, 0.95, 5.9]} s={[0.1, 0.22, 0.8]} material={eye} />
      <Block p={[-0.92, 0.95, 5.9]} s={[0.1, 0.22, 0.8]} material={eye} />
      {[-1.6, 1.4].flatMap((z) =>
        [-0.8, 0.8].map((x) => (
          <Block key={`${x}${z}`} p={[x, -1.3, z]} s={[0.5, 1, 0.5]} material={hide} />
        )),
      )}
      {TAIL.map((w, i) => (
        <mesh
          key={i}
          ref={(m) => {
            tail.current[i] = m
          }}
          position={[0, 0, -3.1 - i * 1.25]}
          material={hide}
        >
          <boxGeometry args={[w, w, 1.3]} />
        </mesh>
      ))}
      <group ref={rightWing} position={[1.1, 0.6, 0.8]}>
        <Wing side={1} hide={hide} skin={skin} />
      </group>
      <group ref={leftWing} position={[-1.1, 0.6, 0.8]}>
        <Wing side={-1} hide={hide} skin={skin} />
      </group>
    </group>
  )
}
