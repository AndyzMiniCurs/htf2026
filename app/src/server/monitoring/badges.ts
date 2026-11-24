import type { GlitchType } from '#/lib/glitch.ts'
import type { Badge } from '#/lib/monitoring.ts'

/** One glitch a defender fixed (they were the assignee when it reached FIXED). */
export type Fix = { type: GlitchType; createdAt: string; fixedAt: string }

const STABILIZER_FIXES = 10
const SPECIALIST_FIXES = 5
const RAPID_MS = 15 * 60_000

/** The four badges from the spec, in a fixed order. */
export function badgesFor(fixes: Array<Fix>): Array<Badge> {
  const perType = new Map<GlitchType, number>()
  for (const fix of fixes) perType.set(fix.type, (perType.get(fix.type) ?? 0) + 1)
  const badges: Array<Badge> = []
  if (fixes.length >= 1) badges.push('first-fix')
  if (fixes.length >= STABILIZER_FIXES) badges.push('stabilizer')
  if ([...perType.values()].some((count) => count >= SPECIALIST_FIXES)) badges.push('specialist')
  if (fixes.some((f) => Date.parse(f.fixedAt) - Date.parse(f.createdAt) <= RAPID_MS)) {
    badges.push('rapid-response')
  }
  return badges
}
