/** Below this magic level the city locks itself down (spec: live-monitoring, Lockdown mode). */
export const AUTO_LOCKDOWN_BELOW = 20

/** `auto` marks a lockdown the realm declared itself, so it may also lift it itself. */
export type LockdownState = { on: boolean; auto: boolean }

/**
 * The lockdown that follows a new magic level: magic under the threshold forces it on; once magic
 * recovers, only a lockdown the realm declared lifts by itself. A commander's own lockdown stays.
 */
export function nextLockdown(magic: number, current: LockdownState): LockdownState {
  if (magic < AUTO_LOCKDOWN_BELOW) return current.on ? current : { on: true, auto: true }
  return current.on && current.auto ? { on: false, auto: false } : current
}

/** A commander may not lift a lockdown while magic is still under the threshold. */
export function canLift(magic: number): boolean {
  return magic >= AUTO_LOCKDOWN_BELOW
}
