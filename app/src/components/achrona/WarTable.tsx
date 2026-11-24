import { Link } from '@tanstack/react-router'
import { ArrowRight, Minus, Plus, RotateCcw, User, X } from 'lucide-react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { STATUS_META, TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { RelativeTime } from '#/components/ui/RelativeTime.tsx'
import { cx } from '#/components/ui/cx.ts'
import { useIsPhone } from './AchronaDiorama.tsx'
import { AchronaChart, districtOnChart } from './AchronaMap.tsx'
import { fromView, gridRef, spreadMarkers, sweepPhase, toView } from './map-geometry.ts'
import { CITADEL } from './world.ts'
import type { GlitchListItem, GlitchStatus } from '#/lib/glitch.ts'

/** One turn of the radar beam. Rifts flash in step with it, so they share this period. */
const SWEEP_MS = 6000
const MAX_ZOOM = 5
/** Closest two markers may sit, in map units, before they are nudged apart. */
const MARKER_GAP = 5.5
/** How far the Desync's taint spreads around a rift, in chart units, by stage. */
const TAINT: Record<Exclude<GlitchStatus, 'FIXED'>, number> = {
  LEAKED: 15,
  ASSESSING: 11,
  CONTAINING: 7,
}

export type MapFocus = { x: number; y: number; zoom: number }

type WarTableProps = {
  /** Open glitches with a location. */
  glitches: Array<GlitchListItem>
  /** Open glitches per district, for the chart's ley lines and island labels. */
  rifts: ReadonlyMap<string, number>
  selectedId: string | null
  onSelect: (glitchId: string | null) => void
  /** A spot (chart units) to fly to; a new object flies again. */
  focus: MapFocus | null
}

/**
 * The war table: the chart of Achrona as a live, navigable board. Wheel or pinch to zoom, drag
 * to pan; a radar sweeps out from the Citadel and every rift flares as the beam crosses it; the
 * Desync's taint spreads around each rift; picking one flies to it and opens its card.
 */
export function WarTable({ glitches, rifts, selectedId, onSelect, focus }: WarTableProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion() ?? false
  const phone = useIsPhone()
  const view = usePanZoom(viewport, layer, reduce)
  const citadel = districtOnChart(CITADEL)

  const markers = useMemo(
    () =>
      spreadMarkers(
        glitches.flatMap((g) => (g.location ? [{ id: g.glitchId, glitch: g, ...g.location }] : [])),
        MARKER_GAP,
      ),
    [glitches],
  )
  const selected = markers.find((m) => m.id === selectedId) ?? null

  useEffect(() => {
    if (focus) view.flyTo(focus.x, focus.y, focus.zoom)
  }, [focus, view])

  useEffect(() => {
    // On phones the docked card covers the lower half, so the rift is framed higher up.
    if (selected)
      view.flyTo(
        toView(selected.x),
        toView(selected.y),
        Math.max(view.zoom(), 2.2),
        phone ? 0.3 : 0.5,
      )
    // Keyed on the id alone: live data reshuffling the same marker must not fly again.
  }, [selectedId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSelect(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onSelect])

  /** Shows the grid square under a mouse pointer, without re-rendering. */
  function trackPointer(event: React.PointerEvent) {
    if (event.pointerType !== 'mouse' || !readout.current || !viewport.current) return
    const point = view.toChart(event.clientX, event.clientY)
    readout.current.textContent = point
      ? `Grid ${gridRef(fromView(point.x), fromView(point.y))}`
      : ''
  }

  return (
    <div
      ref={viewport}
      className="war-table relative aspect-square w-full overflow-hidden select-none lg:aspect-auto lg:h-[max(30rem,calc(100dvh-15rem))]"
      onPointerMove={trackPointer}
      onClick={(event) => {
        if (event.target === event.currentTarget || event.target instanceof SVGElement)
          onSelect(null)
      }}
    >
      <div
        ref={layer}
        className="absolute inset-0 origin-top-left"
        style={{ ['--k' as string]: 1 }}
      >
        {/* The chart sheet: a square board centred on the table. */}
        <div className="chart-sheet absolute inset-y-0 left-1/2 aspect-square h-full -translate-x-1/2">
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
            <AchronaChart rifts={rifts} />
            {/* Radar range rings around mission control. */}
            <g
              fill="none"
              stroke="#e0b66a"
              strokeOpacity=".14"
              strokeWidth=".2"
              strokeDasharray=".8 1.2"
            >
              {[14, 27, 40].map((r) => (
                <circle key={r} cx={citadel.x} cy={citadel.y} r={r} />
              ))}
            </g>
            <g className="taint" style={{ mixBlendMode: 'screen' }}>
              {markers.map(({ id, glitch, x, y }) => (
                <circle
                  key={id}
                  cx={toView(x)}
                  cy={toView(y)}
                  r={TAINT[glitch.status as keyof typeof TAINT]}
                  fill="url(#war-taint)"
                />
              ))}
            </g>
            <defs>
              <radialGradient id="war-taint">
                <stop offset="0" stopColor="#d78bff" stopOpacity=".8" />
                <stop offset=".4" stopColor="#a52bd9" stopOpacity=".38" />
                <stop offset="1" stopColor="#a52bd9" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>

          {!reduce && <RadarBeam x={citadel.x} y={citadel.y} />}

          <AnimatePresence>
            {markers.map(({ id, glitch, x, y }) => (
              <RiftMarker
                key={id}
                glitch={glitch}
                x={toView(x)}
                y={toView(y)}
                phase={sweepPhase(citadel.x, citadel.y, toView(x), toView(y))}
                selected={id === selectedId}
                reduce={reduce}
                onSelect={() => onSelect(id === selectedId ? null : id)}
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {selected && !phone && (
              <RiftCard
                key={selected.id}
                glitch={selected.glitch}
                x={toView(selected.x)}
                y={toView(selected.y)}
                onClose={() => onSelect(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Phones dock the card under the chart instead of pinning it to a 44px-wide rift. */}
      <AnimatePresence>
        {selected && phone && (
          <RiftCard
            key={selected.id}
            glitch={selected.glitch}
            docked
            onClose={() => onSelect(null)}
          />
        )}
      </AnimatePresence>

      {/* HUD: stays put while the board moves under it. */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-0.5">
        <span className="label-caps text-[0.62rem] text-gold">Chart of Achrona</span>
        <span className="text-sm text-fg">
          <strong className="title-gothic mr-1 text-lg">{markers.length}</strong>
          {markers.length === 1 ? 'rift open' : 'rifts open'}
        </span>
      </div>
      <span
        ref={readout}
        aria-hidden
        className="label-caps pointer-events-none absolute bottom-4 left-3 hidden text-[0.65rem] text-gold/80 lg:block"
      />
      <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-xl border border-line-strong bg-[color-mix(in_oklab,var(--ground)_80%,transparent)] backdrop-blur-sm">
        <ZoomButton label="Zoom in" onClick={() => view.zoomBy(1.6)}>
          <Plus className="size-5" />
        </ZoomButton>
        <ZoomButton label="Zoom out" onClick={() => view.zoomBy(1 / 1.6)}>
          <Minus className="size-5" />
        </ZoomButton>
        <ZoomButton label="Show the whole chart" onClick={view.reset}>
          <RotateCcw className="size-4.5" />
        </ZoomButton>
      </div>
    </div>
  )
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 place-items-center border-b border-line text-fg-muted transition-[color,background-color,transform] duration-150 last:border-b-0 hover:bg-panel-hi hover:text-fg active:scale-90"
    >
      {children}
    </button>
  )
}

/** The radar beam turning around the Citadel, on the document clock so rifts can flash in step. */
function RadarBeam({ x, y }: { x: number; y: number }) {
  const beam = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const animation = beam.current?.animate(
      [{ transform: 'rotate(0turn)' }, { transform: 'rotate(1turn)' }],
      { duration: SWEEP_MS, iterations: Infinity },
    )
    if (animation) animation.startTime = 0
    return () => animation?.cancel()
  }, [])
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${x}%`, top: `${y}%` }}
      >
        <div ref={beam} className="radar-beam size-full rounded-full" />
      </div>
    </div>
  )
}

/**
 * A rift on the chart: a crystal in its status colour around the type sigil. Leaking rifts send
 * out ripples, every rift flares as the radar crosses it, new ones tear open with a shockwave and
 * sealed ones vanish in a verdant flash. Kept the same size on screen at every zoom.
 */
function RiftMarker({
  glitch,
  x,
  y,
  phase,
  selected,
  reduce,
  onSelect,
}: {
  glitch: GlitchListItem
  x: number
  y: number
  phase: number
  selected: boolean
  reduce: boolean
  onSelect: () => void
}) {
  const crystal = useRef<HTMLSpanElement>(null)
  const status = STATUS_META[glitch.status]
  const type = TYPE_META[glitch.type]
  const Icon = type.icon

  useEffect(() => {
    if (reduce) return
    const flare = crystal.current?.animate(
      [
        { filter: 'brightness(2.4)', transform: 'rotate(45deg) scale(1.3)', offset: 0 },
        { filter: 'brightness(1)', transform: 'rotate(45deg) scale(1)', offset: 0.14 },
        { filter: 'brightness(1)', transform: 'rotate(45deg) scale(1)', offset: 1 },
      ],
      { duration: SWEEP_MS, iterations: Infinity },
    )
    // Same clock as the beam: this rift's flare starts the moment the beam reaches its bearing.
    if (flare) flare.startTime = phase * SWEEP_MS
    return () => flare?.cancel()
  }, [phase, reduce])

  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%`, scale: 'calc(1 / var(--k))', transformOrigin: '0 0' }}
      // An explicit target, so a marker brought back mid-exit (filter re-ticked) fades back in.
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <button
        type="button"
        aria-label={`${glitch.glitchId}: ${glitch.description}. ${status.label}, ${type.label}`}
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        className="group absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center"
      >
        {glitch.status === 'LEAKED' && !reduce && (
          <>
            <span aria-hidden className="rift-ripple" style={{ borderColor: status.color }} />
            <span
              aria-hidden
              className="rift-ripple [animation-delay:1.1s]"
              style={{ borderColor: status.color }}
            />
          </>
        )}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute size-8 rounded-full border-2"
          style={{ borderColor: status.color }}
          initial={reduce ? false : { scale: 0.2, opacity: 1 }}
          animate={{ scale: 2.6, opacity: 0 }}
          exit={{ scale: 3, opacity: [0, 1, 0], borderColor: 'var(--verdant)' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.span
          className="relative grid place-items-center"
          initial={reduce ? false : { scale: 0, rotate: -90 }}
          animate={{ scale: selected ? 1.25 : 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 90, transition: { duration: 0.35 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        >
          <span
            ref={crystal}
            className={cx(
              'grid size-8 rotate-45 place-items-center rounded-md border-2 bg-[#0c0f1a] shadow-[0_6px_14px_rgb(0_0_0/0.6)] transition-[border-color,box-shadow] duration-200 group-hover:brightness-125',
              selected && 'shadow-[0_0_0_3px_rgb(224_182_106/0.45),0_6px_18px_rgb(0_0_0/0.6)]',
            )}
            style={{ borderColor: selected ? '#e0b66a' : status.color }}
          >
            <Icon aria-hidden className="size-4 -rotate-45" style={{ color: type.color }} />
          </span>
        </motion.span>
        <span
          aria-hidden
          className="title-gothic pointer-events-none absolute top-full -mt-1 rounded border border-line-strong bg-[#0c0f1a]/90 px-1.5 text-sm whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {glitch.glitchId}
        </span>
      </button>
    </motion.div>
  )
}

/** The picked rift's card, pinned to it on the chart and flipped to stay on the board. */
function RiftCard({
  glitch,
  x = 50,
  y = 50,
  docked = false,
  onClose,
}: {
  glitch: GlitchListItem
  x?: number
  y?: number
  /** Sits at the bottom of the chart instead of pinned to the rift. */
  docked?: boolean
  onClose: () => void
}) {
  const status = STATUS_META[glitch.status]
  const type = TYPE_META[glitch.type]
  const StatusIcon = status.icon
  const below = !docked && y < 38
  const shiftX = x < 26 ? '-14%' : x > 74 ? '-86%' : '-50%'
  return (
    <div
      className={docked ? 'absolute right-16 bottom-2 left-2 z-20' : 'absolute z-10'}
      style={
        docked
          ? undefined
          : { left: `${x}%`, top: `${y}%`, scale: 'calc(1 / var(--k))', transformOrigin: '0 0' }
      }
    >
      <div
        className={docked ? undefined : 'absolute w-[min(17rem,70vw)]'}
        style={
          docked
            ? undefined
            : { transform: `translate(${shiftX}, ${below ? '30px' : 'calc(-100% - 30px)'})` }
        }
      >
        <motion.div
          role="dialog"
          aria-label={`${glitch.glitchId} details`}
          onClick={(event) => event.stopPropagation()}
          className="rounded-xl border border-line-strong bg-[color-mix(in_oklab,var(--panel-hi)_94%,transparent)] p-3.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)] backdrop-blur-md"
          style={{ transformOrigin: below ? '50% 0' : '50% 100%' }}
          initial={docked ? { opacity: 0, y: 24 } : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="title-gothic text-2xl leading-none">{glitch.glitchId}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
                <span
                  className="label-caps inline-flex items-center gap-1 text-[0.66rem]"
                  style={{ color: status.color }}
                >
                  <StatusIcon aria-hidden className="size-3.5" />
                  {status.label}
                </span>
                <span className="text-fg-muted">{type.label}</span>
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-panel hover:text-fg"
            >
              <X className="size-4.5" />
            </button>
          </div>
          <p className="mt-2 line-clamp-3 font-serif leading-snug text-fg">{glitch.description}</p>
          <p className="mt-2.5 flex items-center justify-between gap-2 text-xs text-fg-faint">
            <span className="inline-flex items-center gap-1">
              <User aria-hidden className="size-3.5" />
              {glitch.assignee?.codename ?? 'Unassigned'}
            </span>
            <span>
              <RelativeTime iso={glitch.timestamp} />
              {glitch.location && ` · Grid ${gridRef(glitch.location.x, glitch.location.y)}`}
            </span>
          </p>
          <Link
            to="/glitches/$glitchId"
            params={{ glitchId: glitch.glitchId }}
            className="label-caps mt-3 flex h-11 items-center justify-center gap-2 rounded-full border-b-[3px] border-b-royal-deep bg-royal text-sm text-on-accent transition-[background-color,transform] duration-200 hover:bg-royal-hi active:scale-[0.97]"
          >
            Open quest
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

type View = { k: number; x: number; y: number }

/**
 * Pan and zoom for the board, written straight to the layer's transform so dragging never
 * re-renders React. One pointer pans, two pinch; the wheel zooms around the cursor. Pages still
 * scroll past the chart until it is zoomed in.
 */
function usePanZoom(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  layerRef: React.RefObject<HTMLDivElement | null>,
  reduce: boolean,
) {
  const state = useRef<View>({ k: 1, x: 0, y: 0 })
  const flight = useRef<{ stop: () => void } | null>(null)

  const api = useMemo(() => {
    const size = () => {
      const el = viewportRef.current
      return { w: el?.clientWidth ?? 0, h: el?.clientHeight ?? 0 }
    }
    const clamp = (v: View): View => {
      const { w, h } = size()
      const k = Math.min(MAX_ZOOM, Math.max(1, v.k))
      return {
        k,
        x: Math.min(0, Math.max(w - w * k, v.x)),
        y: Math.min(0, Math.max(h - h * k, v.y)),
      }
    }
    const apply = (next: View) => {
      state.current = clamp(next)
      const { k, x, y } = state.current
      const layer = layerRef.current
      if (layer) {
        layer.style.transform = `translate(${x}px, ${y}px) scale(${k})`
        layer.style.setProperty('--k', String(k))
      }
      if (viewportRef.current) viewportRef.current.style.touchAction = k > 1.01 ? 'none' : 'pan-y'
    }
    /** Zooms by `factor` keeping the viewport point (px, py) still. */
    const zoomAround = (factor: number, px: number, py: number) => {
      const { k, x, y } = state.current
      const nk = Math.min(MAX_ZOOM, Math.max(1, k * factor))
      apply({ k: nk, x: px - (px - x) * (nk / k), y: py - (py - y) * (nk / k) })
    }
    const tweenTo = (target: View) => {
      flight.current?.stop()
      const from = { ...state.current }
      const to = clamp(target)
      if (reduce) return apply(to)
      flight.current = animate(0, 1, {
        duration: 0.75,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (t) =>
          apply({
            k: from.k + (to.k - from.k) * t,
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
          }),
      })
    }
    /** The sheet is a square centred in the viewport; chart units are its 0..100. */
    const sheet = () => {
      const { w, h } = size()
      const side = Math.min(w, h)
      return { side, left: (w - side) / 2, top: (h - side) / 2 }
    }
    return {
      apply,
      zoomAround,
      stop: () => flight.current?.stop(),
      zoom: () => state.current.k,
      zoomBy: (factor: number) => {
        const { w, h } = size()
        const { k, x, y } = state.current
        const nk = Math.min(MAX_ZOOM, Math.max(1, k * factor))
        tweenTo({ k: nk, x: w / 2 - (w / 2 - x) * (nk / k), y: h / 2 - (h / 2 - y) * (nk / k) })
      },
      reset: () => tweenTo({ k: 1, x: 0, y: 0 }),
      /** Frames chart point (chartX, chartY) at zoom k, at `anchorY` of the viewport's height. */
      flyTo: (chartX: number, chartY: number, k: number, anchorY = 0.5) => {
        const { w, h } = size()
        const s = sheet()
        const px = s.left + (chartX / 100) * s.side
        const py = s.top + (chartY / 100) * s.side
        tweenTo({ k, x: w / 2 - px * k, y: h * anchorY - py * k })
      },
      /** The chart point under a client position, or null off the sheet. */
      toChart: (clientX: number, clientY: number) => {
        const box = viewportRef.current?.getBoundingClientRect()
        if (!box) return null
        const { k, x, y } = state.current
        const s = sheet()
        const u = ((clientX - box.left - x) / k - s.left) / s.side
        const v = ((clientY - box.top - y) / k - s.top) / s.side
        return u < 0 || u > 1 || v < 0 || v > 1 ? null : { x: u * 100, y: v * 100 }
      },
    }
  }, [viewportRef, layerRef, reduce])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    api.apply(state.current)
    const pointers = new Map<number, { x: number; y: number }>()
    let dragging = false
    let suppressClick = false
    let start = { x: 0, y: 0 }

    const local = (e: MouseEvent) => {
      const box = el.getBoundingClientRect()
      return { x: e.clientX - box.left, y: e.clientY - box.top }
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      api.stop()
      const p = local(e)
      api.zoomAround(Math.exp(-e.deltaY * 0.0016), p.x, p.y)
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      pointers.set(e.pointerId, local(e))
      start = local(e)
      dragging = false
    }
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      const now = local(e)
      if (pointers.size === 2) {
        const [a, b] = [...pointers.entries()].map(([id, p]) => (id === e.pointerId ? now : p))
        // Two pointers are down, so both pairs exist.
        const [pa, pb] = [...pointers.values()]
        const before = Math.hypot(pa.x - pb.x, pa.y - pb.y)
        const after = Math.hypot(a.x - b.x, a.y - b.y)
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const prevMid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }
        api.stop()
        if (before > 0) api.zoomAround(after / before, mid.x, mid.y)
        const { k, x, y } = state.current
        api.apply({ k, x: x + mid.x - prevMid.x, y: y + mid.y - prevMid.y })
        dragging = true
      } else {
        // Pan only once the board is zoomed, or the page could not scroll past it on phones.
        if (
          !dragging &&
          Math.hypot(now.x - start.x, now.y - start.y) > 5 &&
          state.current.k > 1.01
        ) {
          dragging = true
          el.setPointerCapture(e.pointerId)
        }
        if (dragging) {
          api.stop()
          const { k, x, y } = state.current
          api.apply({ k, x: x + now.x - prev.x, y: y + now.y - prev.y })
        }
      }
      pointers.set(e.pointerId, now)
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (dragging && pointers.size === 0) {
        suppressClick = true
        dragging = false
      }
    }
    // A drag that ends over a marker must not also pick it.
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return
      suppressClick = false
      e.stopPropagation()
      e.preventDefault()
    }
    const onResize = () => api.apply(state.current)

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('click', onClickCapture, true)
    window.addEventListener('resize', onResize)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('resize', onResize)
    }
  }, [api, viewportRef])

  return api
}
