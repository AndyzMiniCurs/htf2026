import type { SensorPoint } from '#/lib/monitoring.ts'

export type Drop = { from: string; to: string; percent: number; minutes: number }

/**
 * The steepest fall of at least `threshold` (0.4 = 40%) within `windowMs`, for shading on
 * the chart. Display only: the server's anomaly rule decides whether a glitch is opened.
 */
export function steepestDrop(
  points: Array<SensorPoint>,
  threshold = 0.4,
  windowMs = 5 * 60 * 1000,
): Drop | null {
  let best: Drop | null = null
  let start = 0
  for (let end = 0; end < points.length; end++) {
    const endTime = Date.parse(points[end].timestamp)
    while (endTime - Date.parse(points[start].timestamp) > windowMs) start++
    // Highest reading inside the window before this point is where the fall began.
    let peak = start
    for (let i = start; i < end; i++) if (points[i].value > points[peak].value) peak = i
    const high = points[peak].value
    if (high <= 0) continue
    const percent = (high - points[end].value) / high
    if (percent >= threshold && (!best || percent > best.percent)) {
      best = {
        from: points[peak].timestamp,
        to: points[end].timestamp,
        percent: Math.round(percent * 100),
        minutes: Math.max(1, Math.round((endTime - Date.parse(points[peak].timestamp)) / 60000)),
      }
    }
  }
  return best
}
