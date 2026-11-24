import type { GlitchType } from '#/lib/glitch.ts'

/**
 * Curated runbook steps per glitch type, in the order they should be done. The AI only picks and
 * ranks from these (design D6), so a runbook can never contain an invented step.
 * Placeholders: {glitchId}, {location}, {sensor}.
 */
export const RUNBOOK_LIBRARY: Record<GlitchType, Array<string>> = {
  'time-anomaly': [
    'Seal off {location} so nobody walks into the loop',
    'Note the looping interval and compare it with earlier echoes on {glitchId}',
    'Anchor the area with a chronostatic ward at {location}',
    'Check {sensor} for drift while the loop is active',
    'Unwind the loop one cycle at a time from the outer edge inward',
    'Report on {glitchId} when two full minutes pass without repeating',
  ],
  'magic-drain': [
    'Read {sensor} and record how fast the reserve is falling',
    'Close the ley valves feeding {location} to stop further loss',
    'Search {location} for a leaking conduit or a draining artefact',
    'Reroute magic from the citadel reserve to the affected district',
    'Patch the conduit and reopen the valves slowly',
    'Confirm on {glitchId} that {sensor} is back in its normal band',
  ],
  portal: [
    'Evacuate guardians and citizens within reach of the portal at {location}',
    'Measure portal stability with {sensor}',
    'Raise a containment circle around the portal frame',
    'Identify the anchor rune that slipped and stabilise it',
    'Close the portal from the outside in, never from within',
    'Post the final stability reading on {glitchId}',
  ],
  'sensor-fault': [
    'Compare {sensor} with a neighbouring sensor to confirm the fault',
    'Mark the readings of {sensor} as unreliable on {glitchId}',
    'Inspect the sensor housing at {location} for damage or corrosion',
    'Recalibrate {sensor} against the citadel reference crystal',
    'Replace the sensor core if recalibration fails',
    'Watch {sensor} for fifteen minutes before closing {glitchId}',
  ],
  creature: [
    'Warn everyone near {location} and keep a safe distance',
    'Identify the creature from its traces and the echoes on {glitchId}',
    'Set warding lanterns around {location} to keep it contained',
    'Call a second defender before approaching',
    'Guide the creature back through the nearest rift or into a holding ward',
    'Search {location} for nests or more creatures before closing',
  ],
  unknown: [
    'Go to {location} and describe what you see in an update on {glitchId}',
    'Check {sensor} and the nearby districts for related readings',
    'Secure the area until the cause is known',
    'Ask the commander to classify {glitchId} once the cause is clear',
    'Follow the runbook for the matching glitch type',
    'Confirm on {glitchId} that the area is back to normal',
  ],
}
