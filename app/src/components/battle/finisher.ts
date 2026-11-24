/**
 * Claude's finisher, in seconds after the summon. The 3D scene, the terminal overlay and
 * the battle rules all read this one timeline so the strike lands on every layer at once.
 */
export type FinisherTimeline = {
  /** Claude has dropped onto the arena. */
  land: number
  /** Claude turns from the camera to the glitch. */
  turn: number
  /** The code stream starts pouring into the glitch. */
  code: number
  /** The beam hits: the glitch's health drops to zero. */
  strike: number
}

export function finisherTimeline(reducedMotion: boolean): FinisherTimeline {
  return reducedMotion
    ? { land: 0.2, turn: 0.2, code: 0.25, strike: 1 }
    : { land: 0.9, turn: 1.6, code: 1.7, strike: 4.2 }
}

/** Seconds from victory to the victory card: the glitch cleanses, implodes, the rift seals. */
export const VICTORY_CARD_DELAY = { full: 3, reduced: 0.6 } as const

export type TerminalLine = { at: number; text: string; tone: 'prompt' | 'tool' | 'done' }

/** What Claude "types" while fixing the glitch, timed against the finisher. */
export function terminalScript(glitchId: string, t: FinisherTimeline): Array<TerminalLine> {
  const step = (t.strike - t.code) / 4
  return [
    { at: 0.1, text: `> seal the rift ${glitchId}`, tone: 'prompt' },
    { at: t.code, text: `Read(rifts/${glitchId}.ts)`, tone: 'tool' },
    { at: t.code + step, text: 'Search(desync anomalies) · 3 found', tone: 'tool' },
    { at: t.code + step * 2, text: 'Update(reality.ts) +42 −13', tone: 'tool' },
    { at: t.code + step * 3, text: 'Bash(npm test) · all passing', tone: 'tool' },
    { at: t.strike + 0.3, text: `Rift ${glitchId} sealed.`, tone: 'done' },
  ]
}
