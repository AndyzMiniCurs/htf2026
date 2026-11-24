import { MapPin } from 'lucide-react'
import { useId } from 'react'
import { cx } from '#/components/ui/cx.ts'
import { STATUS_META } from '#/components/glitches/glitch-meta.ts'
import { coastline, fromView, toView, toViewLength } from './map-geometry.ts'
import { CITADEL, DISTRICTS, districtMapPoint } from './world.ts'
import type { District } from './world.ts'
import type { GlitchListItem, Location } from '#/lib/glitch.ts'

/** Island radius on the chart per mesh kind, in map units (0..100). */
const ISLAND_SIZE: Record<District['node'], number> = {
  Round: 14,
  X: 9.5,
  L: 9,
  Flat: 10,
  Long: 8.5,
  Ramp: 8,
}

/** Where a district sits on the chart, and how big its island is drawn. */
export function districtOnChart(district: District): { x: number; y: number; r: number } {
  const point = districtMapPoint(district)
  return {
    x: toView(point.x),
    y: toView(point.y),
    r: toViewLength(ISLAND_SIZE[district.node]),
  }
}

const COLUMNS = 'ABCDEFGHIJ'

/**
 * The chart of Achrona as SVG layers for a 0..100 viewBox: graticule with A–J / 1–10 edges,
 * ley lines from the Citadel, floating islands with contour rings, and a compass rose.
 * `rifts` counts open glitches per district: those islands get a corrupted ley line.
 */
export function AchronaChart({ rifts }: { rifts?: ReadonlyMap<string, number> }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id = (name: string) => `chart-${name}-${uid}`
  const citadel = districtOnChart(CITADEL)

  return (
    <>
      <defs>
        <radialGradient id={id('isle')} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#7d8fd0" />
          <stop offset=".55" stopColor="#3d4778" />
          <stop offset="1" stopColor="#252a4f" />
        </radialGradient>
        <linearGradient id={id('cliff')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1d38" />
          <stop offset="1" stopColor="#0b0d1c" />
        </linearGradient>
        <filter id={id('shadow')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* Graticule: one square per grid reference, labelled on the chart's edges. */}
      <g stroke="#e0b66a" strokeOpacity=".09" strokeWidth=".18">
        {Array.from({ length: 11 }, (_, i) => {
          const v = toView(i * 10)
          return (
            <g key={i}>
              <line x1={v} y1={toView(0)} x2={v} y2={toView(100)} />
              <line x1={toView(0)} y1={v} x2={toView(100)} y2={v} />
            </g>
          )
        })}
      </g>
      <g
        fill="#e0b66a"
        fillOpacity=".55"
        fontSize="2.3"
        className="font-serif"
        textAnchor="middle"
        aria-hidden
      >
        {Array.from({ length: 10 }, (_, i) => (
          <g key={i}>
            <text x={toView(i * 10 + 5)} y={toView(0) - 2}>
              {COLUMNS[i]}
            </text>
            <text x={toView(0) - 2.6} y={toView(i * 10 + 5) + 0.8}>
              {i + 1}
            </text>
          </g>
        ))}
      </g>

      {/* Ley lines: magic runs from the Citadel to every island; a torn island's line sputters. */}
      <g fill="none" strokeLinecap="round">
        {DISTRICTS.filter((d) => d.id !== CITADEL.id).map((district) => {
          const to = districtOnChart(district)
          const mx = (citadel.x + to.x) / 2
          const my = (citadel.y + to.y) / 2
          // Bow each line sideways so they read as currents, not spokes.
          const bend = 0.18
          const qx = mx - (to.y - citadel.y) * bend
          const qy = my + (to.x - citadel.x) * bend
          const d = `M${citadel.x} ${citadel.y}Q${qx} ${qy} ${to.x} ${to.y}`
          const torn = (rifts?.get(district.id) ?? 0) > 0
          return (
            <g key={district.id}>
              <path
                d={d}
                stroke={torn ? '#a52bd9' : '#e0b66a'}
                strokeOpacity=".22"
                strokeWidth="1.4"
              />
              <path
                d={d}
                className={torn ? 'ley-flow ley-torn' : 'ley-flow'}
                stroke={torn ? '#d78bff' : '#f3d39a'}
                strokeWidth=".45"
                strokeDasharray="1.2 3"
              />
            </g>
          )
        })}
      </g>

      {/* Floating islands: a blurred shadow on the sea, the cliff underneath, the land on top. */}
      {DISTRICTS.map((district) => {
        const { x, y, r } = districtOnChart(district)
        const rotation = district.rotation * 0.6
        const shape = (opts: { scale?: number }) =>
          coastline(district.id, x, y, r, { rotation, ...opts })
        const count = rifts?.get(district.id) ?? 0
        return (
          <g key={district.id}>
            <path
              d={coastline(district.id, x + 1.4, y + 3.2, r, { rotation, scale: 0.92 })}
              fill="#000"
              opacity=".45"
              filter={`url(#${id('shadow')})`}
            />
            <path
              d={coastline(district.id, x, y + 1.5, r, { rotation, scale: 0.97 })}
              fill={`url(#${id('cliff')})`}
            />
            <path d={shape({})} fill={`url(#${id('isle')})`} />
            <g fill="none" stroke="#c9d3ff" strokeOpacity=".16" strokeWidth=".22">
              <path d={shape({ scale: 0.72 })} />
              <path d={shape({ scale: 0.46 })} />
              <path d={shape({ scale: 0.22 })} />
            </g>
            <path
              d={shape({})}
              fill="none"
              stroke={count > 0 ? '#c75cf2' : '#e0b66a'}
              strokeOpacity={count > 0 ? 0.7 : 0.45}
              strokeWidth=".35"
            />
            <text
              x={x}
              y={y + r * 0.82 + 4.4}
              textAnchor="middle"
              className="fill-[#e1e7ff] font-gothic"
              fontSize="3.3"
              style={{ paintOrder: 'stroke', stroke: '#0a0d18', strokeWidth: 0.9 }}
            >
              {district.name}
            </text>
            {rifts && (
              <text
                x={x}
                y={y + r * 0.82 + 7.3}
                textAnchor="middle"
                className="font-serif"
                fontSize="1.9"
                letterSpacing=".25"
                fill={count > 0 ? '#d78bff' : '#3fd18f'}
                style={{ paintOrder: 'stroke', stroke: '#0a0d18', strokeWidth: 0.6 }}
              >
                {count > 0 ? `${count} ${count === 1 ? 'RIFT' : 'RIFTS'}` : 'CALM'}
              </text>
            )}
          </g>
        )
      })}

      <Compass x={93} y={7.5} />
    </>
  )
}

/** A gilt compass rose in the chart's corner; its outer ring turns slowly. */
function Compass({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <g className="compass-ring">
        <circle r="4.6" fill="none" stroke="#e0b66a" strokeOpacity=".55" strokeWidth=".25" />
        <circle
          r="4"
          fill="none"
          stroke="#e0b66a"
          strokeOpacity=".4"
          strokeWidth=".5"
          strokeDasharray=".3 1.27"
        />
      </g>
      <path d="M0 -4.2 .9 0 0 4.2 -.9 0Z" fill="#e0b66a" />
      <path d="M-4.2 0 0 -.9 4.2 0 0 .9Z" fill="#8a6428" />
      <path d="M0 -4.2 .9 0H-.9Z" fill="#f3d39a" />
      <text y="-5.3" textAnchor="middle" fontSize="1.9" className="font-gothic" fill="#f3d39a">
        N
      </text>
    </g>
  )
}

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
 * The chart of Achrona seen from above, as a static sheet: the same districts as the 3D world at
 * the same places, so a spot picked here is where its rift appears. The live, navigable version
 * is the war table on /map.
 */
export function AchronaMap({ glitches = [], value, onPick, className }: AchronaMapProps) {
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
        'chart-sea relative aspect-square w-full overflow-hidden rounded-xl border border-line',
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
        <AchronaChart />
        {glitches.map(({ glitchId, status, location }) =>
          status === 'FIXED' || !location ? null : (
            <g key={glitchId}>
              <circle
                cx={toView(location.x)}
                cy={toView(location.y)}
                r="3"
                style={{ fill: STATUS_META[status].color }}
                fillOpacity=".25"
              />
              <rect
                x={toView(location.x) - 1.5}
                y={toView(location.y) - 1.5}
                width="3"
                height="3"
                transform={`rotate(45 ${toView(location.x)} ${toView(location.y)})`}
                fill="#0c0f1a"
                style={{ stroke: STATUS_META[status].color }}
                strokeWidth=".6"
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
