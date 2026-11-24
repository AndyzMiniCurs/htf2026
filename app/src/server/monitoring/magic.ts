import type { GlitchStatus, GlitchType } from '#/lib/glitch.ts'

/** How much magic one open glitch drains, by lifecycle stage (spec: live-monitoring). */
export const STATUS_DRAIN: Record<GlitchStatus, number> = {
  LEAKED: 10,
  ASSESSING: 7,
  CONTAINING: 4,
  FIXED: 0,
}

/** Multiplier per glitch type; 1 is "normal severity". */
export const TYPE_SEVERITY: Record<GlitchType, number> = {
  'magic-drain': 1.5,
  portal: 1.3,
  'time-anomaly': 1.2,
  creature: 1,
  unknown: 1,
  'sensor-fault': 0.5,
}

/** 100 when nothing is open, minus each open glitch's weighted drain, never below 0. */
export function magicLevel(glitches: Array<{ status: GlitchStatus; type: GlitchType }>): number {
  const drain = glitches.reduce((sum, g) => sum + STATUS_DRAIN[g.status] * TYPE_SEVERITY[g.type], 0)
  return Math.max(0, Math.round(100 - drain))
}
