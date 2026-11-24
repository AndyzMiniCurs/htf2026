import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Glitch,
  GodRays,
  HueSaturation,
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
  /** World distance from the camera to the citadel, where focus sits. */
  focusDistance: number
  /** A LEAKED glitch exists somewhere: the Desync bites the picture itself. */
  desync: boolean
  reducedMotion: boolean
}

/**
 * The film grade, in lens order: focus on the citadel with the far islands falling into
 * bokeh, light blooming and pouring from the crystal, a slight lens fringe, the Desync's
 * glitch, then filmic tone mapping, a violet grade, grain and a heavy vignette.
 */
export function Effects({ sun, focusDistance, desync, reducedMotion }: EffectsProps) {
  const aberration = useMemo(() => new THREE.Vector2(0.0006, 0.0008), [])
  const glitchDelay = useMemo(() => new THREE.Vector2(8, 15), [])
  const glitchDuration = useMemo(() => new THREE.Vector2(0.08, 0.2), [])
  const glitchStrength = useMemo(() => new THREE.Vector2(0.015, 0.05), [])
  return (
    <EffectComposer multisampling={0} autoClear={false}>
      <DepthOfField focusDistance={focusDistance} focusRange={34} bokehScale={3.2} />
      <Bloom
        mipmapBlur
        intensity={0.95}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.2}
        radius={0.8}
      />
      {sun ? (
        <GodRays
          sun={sun}
          samples={60}
          density={0.95}
          decay={0.94}
          weight={0.28}
          exposure={0.35}
          clampMax={1}
          blur
        />
      ) : (
        <></>
      )}
      <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.4} />
      <Glitch
        active={desync && !reducedMotion}
        mode={GlitchMode.SPORADIC}
        delay={glitchDelay}
        duration={glitchDuration}
        strength={glitchStrength}
        ratio={0.9}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <HueSaturation saturation={0.12} />
      <BrightnessContrast brightness={0.02} contrast={0.12} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.28} />
      <Vignette offset={0.18} darkness={0.85} />
    </EffectComposer>
  )
}
