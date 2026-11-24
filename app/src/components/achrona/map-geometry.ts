/** Map coordinates (0..100) are drawn inside this margin so edge islands, names and the grid fit. */
export const INSET = 12
const SPAN = 100 - INSET * 2

/** Map coordinate (0..100) to chart coordinate (the SVG's 0..100 viewBox). */
export const toView = (v: number): number => INSET + (v / 100) * SPAN
/** Chart coordinate back to map coordinate, clamped to the map. */
export const fromView = (v: number): number =>
  Math.min(100, Math.max(0, ((v - INSET) / SPAN) * 100))
/** A length in map units, as chart units. */
export const toViewLength = (v: number): number => (v * SPAN) / 100

/** Deterministic 0..1 from a string, so an island keeps its coastline for every visitor. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

/**
 * A closed, organic coastline around (cx, cy): an ellipse whose radius wanders with a few
 * seeded waves, smoothed into cubic curves (Catmull-Rom). `scale` shrinks it for contour rings.
 */
export function coastline(
  seed: string,
  cx: number,
  cy: number,
  r: number,
  { scale = 1, squash = 0.82, rotation = 0 } = {},
): string {
  const n = 28
  const phase = [hash(`${seed}a`), hash(`${seed}b`), hash(`${seed}c`)].map((h) => h * Math.PI * 2)
  const points = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const wobble =
      1 +
      0.13 * Math.sin(a * 3 + phase[0]) +
      0.08 * Math.sin(a * 5 + phase[1]) +
      0.05 * Math.sin(a * 9 + phase[2])
    const px = Math.cos(a) * r * wobble * scale
    const py = Math.sin(a) * r * wobble * scale * squash
    return [
      cx + px * Math.cos(rotation) - py * Math.sin(rotation),
      cy + px * Math.sin(rotation) + py * Math.cos(rotation),
    ] as const
  })
  const at = (i: number) => points[(i + n) % n]
  const f = (v: number) => v.toFixed(2)
  let d = `M${f(at(0)[0])} ${f(at(0)[1])}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${f(c1[0] ?? 0)} ${f(c1[1] ?? 0)} ${f(c2[0] ?? 0)} ${f(c2[1] ?? 0)} ${f(p2[0])} ${f(p2[1])}`
  }
  return `${d}Z`
}

/** The chart's square on the A–J / 1–10 grid for a map coordinate, e.g. "E7". */
export function gridRef(x: number, y: number): string {
  const col = Math.min(9, Math.max(0, Math.floor(x / 10)))
  const row = Math.min(9, Math.max(0, Math.floor(y / 10)))
  return `${String.fromCharCode(65 + col)}${row + 1}`
}

/**
 * Where on its turn the radar beam from (cx, cy) crosses (x, y), as 0..1 of a turn, clockwise
 * from north, so a rift can flash exactly as the beam passes it.
 */
export function sweepPhase(cx: number, cy: number, x: number, y: number): number {
  const angle = Math.atan2(x - cx, cy - y)
  return (angle / (Math.PI * 2) + 1) % 1
}

/**
 * Pushes markers apart until no two are closer than `gap` (map units), so rifts reported at
 * nearly the same spot stay separately tappable. Moves are small and deterministic.
 */
export function spreadMarkers<TMarker extends { id: string; x: number; y: number }>(
  markers: Array<TMarker>,
  gap: number,
): Array<TMarker> {
  const placed = markers.map((m) => ({ ...m }))
  for (let round = 0; round < 40; round++) {
    let moved = false
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]
        const b = placed[j]
        let dx = b.x - a.x
        let dy = b.y - a.y
        let dist = Math.hypot(dx, dy)
        if (dist >= gap) continue
        if (dist < 1e-6) {
          // Same spot: part them along a direction derived from their ids.
          const angle = hash(a.id + b.id) * Math.PI * 2
          dx = Math.cos(angle)
          dy = Math.sin(angle)
          dist = 1
        }
        const push = (gap - Math.hypot(b.x - a.x, b.y - a.y)) / 2 + 0.01
        a.x -= (dx / dist) * push
        a.y -= (dy / dist) * push
        b.x += (dx / dist) * push
        b.y += (dy / dist) * push
        moved = true
      }
    }
    if (!moved) break
  }
  return placed.map((m) => ({ ...m, x: clamp(m.x), y: clamp(m.y) }))
}

const clamp = (v: number) => Math.min(100, Math.max(0, v))
