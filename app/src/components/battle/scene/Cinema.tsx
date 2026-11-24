import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Glitch,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction, GlitchMode, ToneMappingMode } from 'postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  BEAST,
  CLAUDE_SPOT,
  clamp01,
  easeInCubic,
  easeOutCubic,
  glowTexture,
  nowSeconds,
} from './shared.ts'
import type { ChromaticAberrationEffect } from 'postprocessing'
import type { FinisherTimeline } from '../finisher.ts'
import type { BattleFx } from './shared.ts'

const INTRO = 2
const FIGHT_POS = new THREE.Vector3(0, 5.2, 13.5)
const FIGHT_LOOK = new THREE.Vector3(0, 2.8, 0)
const INTRO_POS = new THREE.Vector3(-9, 16, 30)
const CLAUDE_EYE = CLAUDE_SPOT.clone().add(new THREE.Vector3(0, 1.1, 0))

type CameraProps = {
  openedAt: number
  summonedAt: number | null
  wonAt: number | null
  timeline: FinisherTimeline
  fx: BattleFx
  reducedMotion: boolean
}

/**
 * Directs the battle like a film: a swooping establishing shot, a gently breathing fight
 * camera, close-up on Claude's landing, a wide two-shot while it codes, a push-in on the
 * strike, and a slow orbit over the sealed rift.
 */
export function CinematicCamera({
  openedAt,
  summonedAt,
  wonAt,
  timeline,
  fx,
  reducedMotion,
}: CameraProps) {
  const pos = useMemo(() => FIGHT_POS.clone(), [])
  const look = useMemo(() => FIGHT_LOOK.clone(), [])
  const goalPos = useMemo(() => new THREE.Vector3(), [])
  const goalLook = useMemo(() => new THREE.Vector3(), [])
  const started = useRef(false)

  useFrame(({ camera, size }, delta) => {
    const now = nowSeconds()
    const calm = reducedMotion ? 0 : 1
    goalPos.copy(FIGHT_POS)
    goalLook.copy(FIGHT_LOOK)
    goalPos.x += Math.sin(now * 0.25) * 1.2 * calm
    goalPos.y += Math.sin(now * 0.33) * 0.4 * calm
    let lambda = 3

    const intro = clamp01((now - openedAt) / INTRO)
    if (intro < 1 && calm) {
      goalPos.lerpVectors(INTRO_POS, goalPos, easeOutCubic(intro))
      lambda = 12
    }

    if (summonedAt !== null && wonAt === null) {
      const s = now - summonedAt
      if (s < timeline.turn) {
        // Low close-up on Claude touching down.
        // Tilt with Claude as it falls, so the drop is in frame.
        const fall = (1 - easeInCubic(clamp01(s / timeline.land))) * 16
        goalPos.copy(CLAUDE_EYE).add(new THREE.Vector3(3, 2, 11.5))
        goalLook.copy(CLAUDE_EYE).add(new THREE.Vector3(0.8, 0.4 + fall * 0.7, 0))
        lambda = 7
      } else {
        // Wide two-shot from the side: Claude left, the glitch right, the code between.
        goalPos.set(2.5, 4, 13.5 - (s - timeline.turn) * 0.45 * calm)
        goalLook.copy(CLAUDE_EYE).lerp(BEAST, 0.55)
      }
      lambda = Math.max(lambda, 4)
    }

    if (wonAt !== null) {
      // Slow orbit around the sealing rift.
      const a = (now - wonAt) * 0.22 * calm
      goalPos.set(BEAST.x + Math.sin(a) * 14, 5.2, BEAST.z + Math.cos(a) * 14)
      goalLook.copy(BEAST)
      lambda = 2.5
    }

    // Portrait phones see less width: frame Claude too, and pull back along the view line.
    if (size.width / size.height < 0.8) {
      if (summonedAt !== null) goalLook.lerp(CLAUDE_EYE, 0.3)
      goalPos.sub(goalLook).multiplyScalar(1.55).add(goalLook)
    }

    if (!started.current || reducedMotion) {
      started.current = true
      pos.copy(calm ? INTRO_POS : goalPos)
      look.copy(goalLook)
    }
    pos.x = THREE.MathUtils.damp(pos.x, goalPos.x, lambda, delta)
    pos.y = THREE.MathUtils.damp(pos.y, goalPos.y, lambda, delta)
    pos.z = THREE.MathUtils.damp(pos.z, goalPos.z, lambda, delta)
    look.x = THREE.MathUtils.damp(look.x, goalLook.x, lambda, delta)
    look.y = THREE.MathUtils.damp(look.y, goalLook.y, lambda, delta)
    look.z = THREE.MathUtils.damp(look.z, goalLook.z, lambda, delta)

    fx.shake = Math.max(0, fx.shake - delta * 2.2)
    const shake = fx.shake * fx.shake * 0.6 * calm
    camera.position.set(
      pos.x + (Math.random() - 0.5) * shake,
      pos.y + (Math.random() - 0.5) * shake,
      pos.z,
    )
    camera.lookAt(look)
  })
  return null
}

/** The lens: bloom, an aberration that bites with each hit, a glitch burst on the strike, grain. */
export function BattleEffects({
  fx,
  burst,
  lowPower,
}: {
  fx: BattleFx
  burst: boolean
  lowPower: boolean
}) {
  const aberration = useRef<ChromaticAberrationEffect>(null)
  const offset = useMemo(() => new THREE.Vector2(0.0008, 0.0008), [])
  const delay = useMemo(() => new THREE.Vector2(0, 0.05), [])
  const duration = useMemo(() => new THREE.Vector2(0.1, 0.3), [])
  const strength = useMemo(() => new THREE.Vector2(0.2, 0.5), [])
  useFrame(() => {
    const k = 0.0007 + fx.shake * 0.006 + fx.pulse * 0.002
    aberration.current?.offset.set(k, k * 0.6)
  })
  if (lowPower) {
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.65} radius={0.75} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Vignette offset={0.2} darkness={0.8} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={1.25}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.2}
        radius={0.8}
      />
      <ChromaticAberration
        ref={aberration}
        offset={offset}
        radialModulation
        modulationOffset={0.3}
      />
      <Glitch
        active={burst}
        mode={GlitchMode.CONSTANT_WILD}
        delay={delay}
        duration={duration}
        strength={strength}
        ratio={0.6}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.25} />
      <Vignette offset={0.18} darkness={0.85} />
    </EffectComposer>
  )
}

/** The rift seals: a white flash, a shockwave across the arena and rising motes. */
export function SealBurst({ wonAt, reducedMotion }: { wonAt: number; reducedMotion: boolean }) {
  const wave = useRef<THREE.Mesh>(null)
  const flash = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  // The burst waits for the creature to bleach and implode.
  const delay = 0.85
  useFrame(() => {
    const age = nowSeconds() - wonAt - delay
    const on = age > 0
    if (wave.current) {
      wave.current.visible = on
      const t = clamp01(age / 1.3)
      wave.current.scale.setScalar(0.5 + easeOutCubic(t) * (reducedMotion ? 6 : 14))
      const m = wave.current.material
      if (m instanceof THREE.MeshBasicMaterial) m.opacity = 1 - t
    }
    if (flash.current) {
      flash.current.visible = on
      flash.current.scale.setScalar(2 + easeOutCubic(clamp01(age / 0.4)) * 10)
      flash.current.material.opacity = 1 - clamp01(age / 0.9)
    }
    if (light.current) light.current.intensity = on ? 260 * (1 - clamp01(age / 1.6)) : 0
  })
  return (
    <group>
      <mesh
        ref={wave}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[BEAST.x, 0.12, BEAST.z]}
        visible={false}
      >
        <ringGeometry args={[0.85, 1, 96]} />
        <meshBasicMaterial color="#3fd18f" transparent toneMapped={false} />
      </mesh>
      <sprite ref={flash} position={BEAST} visible={false}>
        <spriteMaterial
          map={glowTexture()}
          color="#e9fff4"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <pointLight ref={light} position={BEAST} color="#3fd18f" distance={40} intensity={0} />
      {!reducedMotion && (
        <Sparkles
          count={120}
          scale={[12, 14, 12]}
          position={[BEAST.x, 6, BEAST.z]}
          size={6}
          speed={2.5}
          color="#b7ffd9"
        />
      )}
    </group>
  )
}
