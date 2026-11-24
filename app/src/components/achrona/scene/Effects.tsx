import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Glitch,
  GodRays,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction, GlitchMode, ToneMappingMode } from 'postprocessing'
import { useMemo } from 'react'
import * as THREE from 'three'

type EffectsProps = {
  /** The citadel crystal's core: the light god rays pour from. */
  sun: THREE.Mesh | null
  /** A LEAKED glitch exists somewhere: the Desync bites the picture itself. */
  desync: boolean
  reducedMotion: boolean
}

/** The cinematic grade: bloom on every magic light, god rays from the crystal, grain, vignette, and the Desync's glitch. */
export function Effects({ sun, desync, reducedMotion }: EffectsProps) {
  const aberration = useMemo(() => new THREE.Vector2(0.0007, 0.0009), [])
  const glitchDelay = useMemo(() => new THREE.Vector2(8, 15), [])
  const glitchDuration = useMemo(() => new THREE.Vector2(0.08, 0.2), [])
  const glitchStrength = useMemo(() => new THREE.Vector2(0.015, 0.05), [])
  return (
    <EffectComposer multisampling={4} autoClear={false}>
      <Bloom
        mipmapBlur
        intensity={1.25}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.25}
        radius={0.75}
      />
      {sun ? (
        <GodRays
          sun={sun}
          samples={50}
          density={0.94}
          decay={0.93}
          weight={0.35}
          exposure={0.42}
          clampMax={1}
          blur
        />
      ) : (
        <></>
      )}
      <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.35} />
      <Glitch
        active={desync && !reducedMotion}
        mode={GlitchMode.SPORADIC}
        delay={glitchDelay}
        duration={glitchDuration}
        strength={glitchStrength}
        ratio={0.9}
      />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.35} />
      <Vignette offset={0.25} darkness={0.8} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
