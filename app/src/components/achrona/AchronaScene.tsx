import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, Sparkles } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { placeGlitch } from './world.ts'
import { CameraIntro, CubeDebris, ResponsiveLens } from './scene/Atmosphere.tsx'
import { Citadel } from './scene/Citadel.tsx'
import { Effects } from './scene/Effects.tsx'
import { DistantIslands, Districts } from './scene/Islands.tsx'
import { LIGHT } from './scene/kit.tsx'
import { LeyLines } from './scene/LeyLines.tsx'
import { Rifts } from './scene/Rifts.tsx'
import { CloudSea, Moon, SkyDome, Starfield } from './scene/Sky.tsx'
import { Villages } from './scene/Villages.tsx'
import type { RiftsProps } from './scene/Rifts.tsx'

export type AchronaSceneProps = RiftsProps & {
  /** Phones get fewer pixels, no shadows and no post-processing. */
  lowPower?: boolean
}

const CAMERA_HOME = new THREE.Vector3(40, 21, 40)
const CAMERA_TARGET = new THREE.Vector3(0, 5, 0)

/** The world of Achrona: the citadel and its districts floating over a sea of cursed cloud. */
export default function AchronaScene(props: AchronaSceneProps) {
  const { glitches, reducedMotion, lowPower = false } = props
  const [core, setCore] = useState<THREE.Mesh | null>(null)
  const [arrived, setArrived] = useState(false)

  // Districts with an open glitch turn their ley line and hanging crystals ember.
  const corrupted = useMemo(
    () =>
      new Set(glitches.filter((g) => g.status !== 'FIXED').map((g) => placeGlitch(g).district.id)),
    [glitches],
  )
  const desync = glitches.some((g) => g.status === 'LEAKED')

  return (
    <Canvas
      shadows={!lowPower}
      dpr={lowPower ? [1, 1.25] : [1, 1.6]}
      camera={{ position: CAMERA_HOME.toArray(), fov: 36, near: 0.5, far: 420 }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.NoToneMapping,
      }}
      aria-hidden
    >
      <ResponsiveLens />
      <SkyDome />
      <Starfield reducedMotion={reducedMotion} />
      <Moon />
      <fog attach="fog" args={['#24123f', 42, 115]} />

      <hemisphereLight args={['#b3a2ff', '#2a1640', 1.6]} />
      <directionalLight
        position={[-30, 30, -40]}
        intensity={2.2}
        color="#e4dcff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {/* Curse light from below lights the islands' undersides violet. */}
      <directionalLight position={[0, -20, 10]} intensity={1.4} color={LIGHT.curse} />
      <Environment resolution={128} frames={1}>
        <Lightformer
          form="ring"
          intensity={3}
          color={LIGHT.curseHi}
          position={[0, 10, -20]}
          scale={12}
        />
        <Lightformer intensity={1.5} color="#6f8cff" position={[20, 6, 10]} scale={[10, 4, 1]} />
        <Lightformer intensity={1} color="#ffb35c" position={[-20, 2, 12]} scale={[6, 3, 1]} />
      </Environment>

      <CloudSea lowPower={lowPower} />
      <DistantIslands reducedMotion={reducedMotion} />
      <Districts corrupted={corrupted} />
      <Citadel reducedMotion={reducedMotion} onCore={setCore} />
      <Villages reducedMotion={reducedMotion} />
      <LeyLines corrupted={corrupted} />
      <Rifts {...props} />
      <CubeDebris reducedMotion={reducedMotion} />
      <Sparkles
        count={lowPower ? 80 : 220}
        scale={[70, 26, 70]}
        position={[0, 4, 0]}
        size={3.2}
        speed={reducedMotion ? 0 : 0.3}
        color={LIGHT.pink}
      />

      {arrived ? (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.22}
          minPolarAngle={0.9}
          maxPolarAngle={1.32}
          target={CAMERA_TARGET}
        />
      ) : (
        <CameraIntro
          to={CAMERA_HOME}
          target={CAMERA_TARGET}
          reducedMotion={reducedMotion}
          onDone={() => setArrived(true)}
        />
      )}
      {!lowPower && <Effects sun={core} desync={desync} reducedMotion={reducedMotion} />}
    </Canvas>
  )
}
