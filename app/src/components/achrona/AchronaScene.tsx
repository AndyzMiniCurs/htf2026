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
import { Flock, SkyLanterns } from './scene/Life.tsx'
import { CloudSea, MistBanks, Moon, SkyDome, Starfield } from './scene/Sky.tsx'
import { Villages } from './scene/Villages.tsx'
import type { RiftsProps } from './scene/Rifts.tsx'

export type AchronaSceneProps = RiftsProps & {
  /** Phones get fewer pixels, no shadows and no post-processing. */
  lowPower?: boolean
}

// A low, wide establishing shot: the citadel a little off-centre, districts receding into haze.
const CAMERA_HOME = new THREE.Vector3(36, 13, 46)
const CAMERA_TARGET = new THREE.Vector3(0, 7, 0)
const FOCUS_DISTANCE = CAMERA_HOME.distanceTo(CAMERA_TARGET)

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
      <fog attach="fog" args={['#121a33', 48, 135]} />

      <hemisphereLight args={['#8f9cff', '#262447', 1.25]} />
      <directionalLight
        position={[-42, 34, -58]}
        intensity={3.4}
        color="#d6c8ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {/* Moonlight is the backlight (rim on every silhouette); a cool fill keeps the camera side readable. */}
      <directionalLight position={[34, 14, 40]} intensity={0.9} color="#7484ff" />
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
      <MistBanks />
      <DistantIslands reducedMotion={reducedMotion} />
      <Districts corrupted={corrupted} />
      <Citadel reducedMotion={reducedMotion} onCore={setCore} />
      <Villages reducedMotion={reducedMotion} />
      <LeyLines corrupted={corrupted} />
      <Rifts {...props} />
      <CubeDebris reducedMotion={reducedMotion} />
      <Flock reducedMotion={reducedMotion} />
      <SkyLanterns reducedMotion={reducedMotion} />
      <Sparkles
        count={lowPower ? 60 : 140}
        scale={[60, 24, 60]}
        position={[0, 6, 0]}
        size={1.6}
        speed={reducedMotion ? 0 : 0.25}
        opacity={0.7}
        color={LIGHT.pink}
      />

      {arrived ? (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.18}
          minPolarAngle={1.05}
          maxPolarAngle={1.42}
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
      {!lowPower && (
        <Effects
          sun={core}
          focusDistance={FOCUS_DISTANCE}
          desync={desync}
          reducedMotion={reducedMotion}
        />
      )}
    </Canvas>
  )
}
