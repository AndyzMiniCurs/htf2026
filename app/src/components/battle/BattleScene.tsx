import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { finisherTimeline } from './finisher.ts'
import { Arena } from './scene/Arena.tsx'
import { BattleEffects, CinematicCamera, SealBurst } from './scene/Cinema.tsx'
import { ClaudeFinisher } from './scene/ClaudeFinisher.tsx'
import { GlitchBeast } from './scene/GlitchBeast.tsx'
import { createFx } from './scene/shared.ts'
import { Spells } from './scene/Spells.tsx'

export type BattleSceneProps = {
  /** The glitch kind's colour. */
  color: string
  /** 0..1 */
  health: number
  /** Claude's summon charge, 0..1: the rune circle brightens with it. */
  charge: number
  /** Keyboard aim: which shard a cast from the keyboard goes to. */
  targetIndex: number
  /** A keyboard cast; the nonce changes on every cast. */
  keyboardCast: { nonce: number } | null
  /** Page-clock seconds: when the battle opened, Claude was summoned, the glitch fell. */
  openedAt: number
  summonedAt: number | null
  wonAt: number | null
  reducedMotion: boolean
  lowPower: boolean
  onHit: (shard: number) => void
  onMiss: () => void
}

/** The sealing battle: a floating arena, the glitch creature, spells, Claude, and a directed camera. */
export default function BattleScene(props: BattleSceneProps) {
  const { color, summonedAt, wonAt, reducedMotion, lowPower } = props
  const fx = useMemo(createFx, [])
  const timeline = finisherTimeline(reducedMotion)
  const [burst, setBurst] = useState(false)

  // The lens tears for half a second when Claude's beam lands.
  useEffect(() => {
    if (summonedAt === null || reducedMotion) return
    const wait = (summonedAt + timeline.strike) * 1000 - performance.now()
    const on = window.setTimeout(() => setBurst(true), wait)
    const off = window.setTimeout(() => setBurst(false), wait + 500)
    return () => {
      window.clearTimeout(on)
      window.clearTimeout(off)
    }
  }, [summonedAt, reducedMotion, timeline.strike])

  return (
    <Canvas
      dpr={lowPower ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [-9, 16, 30], fov: 42, near: 0.1, far: 500 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => props.onMiss()}
    >
      <color attach="background" args={['#05030b']} />
      <fog attach="fog" args={['#0a0f2c', 28, 110]} />
      <Arena
        color={color}
        charge={props.charge}
        reducedMotion={reducedMotion}
        lowPower={lowPower}
      />
      <GlitchBeast
        color={color}
        health={props.health}
        fx={fx}
        agitated={summonedAt !== null && wonAt === null}
        wonAt={wonAt}
        reducedMotion={reducedMotion}
        lowPower={lowPower}
      />
      <Spells
        color={color}
        targetIndex={props.targetIndex}
        keyboardCast={props.keyboardCast}
        locked={summonedAt !== null || wonAt !== null}
        fx={fx}
        reducedMotion={reducedMotion}
        onHit={props.onHit}
        onMiss={props.onMiss}
      />
      {summonedAt !== null && (
        <ClaudeFinisher
          summonedAt={summonedAt}
          timeline={timeline}
          color={color}
          fx={fx}
          reducedMotion={reducedMotion}
          lowPower={lowPower}
        />
      )}
      {wonAt !== null && <SealBurst wonAt={wonAt} reducedMotion={reducedMotion} />}
      <CinematicCamera
        openedAt={props.openedAt}
        summonedAt={summonedAt}
        wonAt={wonAt}
        timeline={timeline}
        fx={fx}
        reducedMotion={reducedMotion}
      />
      <BattleEffects fx={fx} burst={burst} lowPower={lowPower} />
    </Canvas>
  )
}
