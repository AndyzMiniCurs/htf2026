import { MapPin } from 'lucide-react'
import { useId } from 'react'
import { cx } from '#/components/ui/cx.ts'
import { TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { DISTRICTS, districtMapPoint } from './world.ts'
import type { GlitchListItem, Location } from '#/lib/glitch.ts'

/** Map coordinates (0..100) are drawn inside this margin so edge islands and their names fit. */
const INSET = 12
const SPAN = 100 - INSET * 2
const toView = (v: number) => INSET + (v / 100) * SPAN
const fromView = (v: number) => Math.min(100, Math.max(0, ((v - INSET) / SPAN) * 100))

/** Island outline radius on the map per mesh kind, in map units (0..100). */
const ISLAND_SIZE: Record<string, number> = { Round: 15, X: 10, L: 9, Flat: 10, Long: 8, Ramp: 8 }

type AchronaMapProps = {
  /** Open glitches to show as markers. */
  glitches?: Array<GlitchListItem>
  /** The picked spot, when the map is a location picker. */
  value?: Location | null
  /** Makes the map a location picker. */
  onPick?: (location: Location) => void
  className?: string
}

/**
 * The chart of Achrona seen from above: the same districts as the 3D world, at the same
 * places, so a spot picked here is where its rift appears in the world.
 */
export function AchronaMap({ glitches = [], value, onPick, className }: AchronaMapProps) {
  const gradientId = useId()
  const picking = Boolean(onPick)

  function pick(event: React.MouseEvent<SVGSVGElement>) {
    if (!onPick) return
    const box = event.currentTarget.getBoundingClientRect()
    const viewX = ((event.clientX - box.left) / box.width) * 100
    const viewY = ((event.clientY - box.top) / box.height) * 100
    onPick({ x: Math.round(fromView(viewX) * 10) / 10, y: Math.round(fromView(viewY) * 10) / 10 })
  }

  return (
    <div
      className={cx(
        'relative aspect-square w-full overflow-hidden rounded-xl border border-line',
        className,
      )}
    >
      <svg
        viewBox="0 0 100 100"
        className={cx('block size-full', picking && 'cursor-crosshair')}
        onClick={pick}
        role={picking ? 'img' : undefined}
        aria-label={picking ? 'Map of Achrona. Click to place the echo.' : 'Map of Achrona'}
      >
        <defs>
          <radialGradient id={`${gradientId}-sea`} cx="50%" cy="45%" r="70%">
            <stop offset="0" stopColor="#1c2550" />
            <stop offset="1" stopColor="#0a0d18" />
          </radialGradient>
          <radialGradient id={`${gradientId}-isle`} cx="40%" cy="35%" r="75%">
            <stop offset="0" stopColor="#6b7cb8" />
            <stop offset=".7" stopColor="#38406a" />
            <stop offset="1" stopColor="#23284a" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gradientId}-sea)`} />
        {/* Faint chart graticule. */}
        <g stroke="#e0b66a" strokeOpacity=".08" strokeWidth=".2">
          {[20, 40, 60, 80].map((v) => (
            <g key={v}>
              <line x1={v} y1="0" x2={v} y2="100" />
              <line x1="0" y1={v} x2="100" y2={v} />
            </g>
          ))}
        </g>
        {DISTRICTS.map((district) => {
          const point = districtMapPoint(district)
          const x = toView(point.x)
          const y = toView(point.y)
          const r = ((ISLAND_SIZE[district.node] ?? 9) * SPAN) / 100
          return (
            <g key={district.id}>
              <ellipse
                cx={x}
                cy={y}
                rx={r}
                ry={r * 0.82}
                fill={`url(#${gradientId}-isle)`}
                stroke="#e0b66a"
                strokeOpacity=".35"
                strokeWidth=".3"
                transform={`rotate(${(district.rotation * 180) / Math.PI} ${x} ${y})`}
              />
              <text
                x={x}
                y={y + r * 0.82 + 3.6}
                textAnchor="middle"
                className="fill-[#e1e7ff] font-gothic"
                fontSize="3.4"
              >
                {district.name}
              </text>
            </g>
          )
        })}
        {glitches.map(({ glitchId, status, type, location }) =>
          status === 'FIXED' || !location ? null : (
            <g key={glitchId}>
              <circle
                cx={toView(location.x)}
                cy={toView(location.y)}
                r="2.6"
                fill={TYPE_META[type].color}
                fillOpacity=".25"
              />
              <circle
                cx={toView(location.x)}
                cy={toView(location.y)}
                r="1.3"
                fill={TYPE_META[type].color}
                stroke="#0c0f1a"
                strokeWidth=".4"
              />
            </g>
          ),
        )}
      </svg>
      {value && (
        <MapPin
          aria-hidden
          className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-full text-gold drop-shadow-[0_3px_6px_rgb(0_0_0/0.7)]"
          style={{ left: `${toView(value.x)}%`, top: `${toView(value.y)}%` }}
          fill="currentColor"
          stroke="#2a1a05"
        />
      )}
    </div>
  )
}
