import { useEffect, useState } from 'react'
import { cx } from '#/components/ui/cx.ts'

/**
 * The pointer as a pixel-art RPG cursor, in the spirit of the Hack The Future site, with a
 * choice of styles in Settings. Mouse and trackpad only: touch keeps the platform behaviour,
 * and text fields keep the native I-beam so typing still feels normal.
 */

export type CursorId = 'arrow' | 'wand' | 'sword' | 'ember' | 'orb' | 'system'

type Variant = {
  label: string
  /** Pixel rows; each character is a palette key, '.' or ' ' is empty. */
  grid?: Array<string>
  palette?: Record<string, string>
  /** Screen pixels per grid cell. */
  scale?: number
  /** Where the click lands, in grid cells. */
  hotspot: [number, number]
  /** A little spell flickering over the tip. */
  wisp?: boolean
  /** Colours of the particles left behind as the pointer moves. */
  trail?: Array<string>
}

const ARROW = [
  '1',
  '11',
  '131',
  '1321',
  '13221',
  '132221',
  '1322221',
  '13222221',
  '132222221',
  '1322222221',
  '13222211111',
  '1321221',
  '131 1221',
  '11  1221',
  '1    1221',
  '     1221',
  '      11',
]
// Rasterised from a thick 45° stroke, then outlined, so the diagonals stay clean.
const WAND = [
  '..111',
  '.11411',
  '1144411',
  '1443441',
  '11444111',
  '.11412611',
  '..11112611',
  '.....112611',
  '......113311',
  '.......113311',
  '........112611',
  '.........112611',
  '..........112611',
  '...........112611',
  '............112611',
  '.............11261',
  '..............1111',
]
const SWORD = [
  '1111',
  '15611',
  '115611',
  '.115611',
  '..115611',
  '...115611',
  '....115611..1111',
  '.....11561111331',
  '......1156113311',
  '.......11563311',
  '........113311',
  '.......11332211',
  '......1133112211',
  '......13311112211',
  '......1111..112211',
  '.............11331',
  '..............1331',
  '..............1111',
]

export const CURSORS: Record<CursorId, Variant> = {
  arrow: {
    label: 'Arcane arrow',
    grid: ARROW,
    palette: { '1': '#f3e3b5', '2': '#123a9e', '3': '#3b74ff' },
    scale: 2,
    hotspot: [0, 0],
    wisp: true,
  },
  wand: {
    label: 'Mage wand',
    grid: WAND,
    palette: {
      '1': '#140e1e',
      '2': '#8a5530',
      '3': '#e0b66a',
      '4': '#fff3c4',
      '6': '#5a3418',
    },
    scale: 1.75,
    hotspot: [3, 3],
    trail: ['#ffd98a', '#3fd6c8', '#fff3c4'],
  },
  sword: {
    label: 'Guardian blade',
    grid: SWORD,
    palette: { '1': '#140e1e', '2': '#7a4a28', '3': '#e0b66a', '5': '#dce8ff', '6': '#7d8cbe' },
    scale: 1.75,
    hotspot: [1, 1],
  },
  ember: {
    label: 'Claude’s ember',
    grid: ARROW,
    palette: { '1': '#1a0c06', '2': '#d97757', '3': '#f0a27a' },
    scale: 2,
    hotspot: [0, 0],
    trail: ['#d97757', '#ffb48a', '#ffd98a'],
  },
  orb: {
    label: 'Rune orb',
    scale: 1,
    hotspot: [0, 0],
    trail: ['#3fd6c8', '#6fa8ff', '#e0b66a'],
  },
  system: { label: 'Plain pointer', hotspot: [0, 0] },
}
export const CURSOR_IDS = Object.keys(CURSORS) as Array<CursorId>

const STORAGE_KEY = 'achrona-cursor'
const CHANGE_EVENT = 'achrona-cursor'

function readCursor(): CursorId {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved && saved in CURSORS ? (saved as CursorId) : 'arrow'
}

function cells(grid: Array<string>, palette: Record<string, string>) {
  return grid.flatMap((row, y) =>
    [...row].flatMap((key, x) => (key in palette ? [{ x, y, fill: palette[key] }] : [])),
  )
}
const gridWidth = (grid: Array<string>) => Math.max(...grid.map((row) => row.length))

/** The cursor's markup, built only from the constants above (no user input reaches it). */
function cursorMarkup(variant: Variant) {
  const parts: Array<string> = []
  if (variant.grid && variant.palette) {
    const scale = variant.scale ?? 2
    const w = gridWidth(variant.grid)
    const h = variant.grid.length
    const rects = cells(variant.grid, variant.palette)
      .map((c) => `<rect x="${c.x}" y="${c.y}" width="1.02" height="1.02" fill="${c.fill}"/>`)
      .join('')
    parts.push(
      `<svg class="mc-art" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges">${rects}</svg>`,
    )
  } else {
    parts.push('<span class="mc-orb"><i></i></span>')
  }
  if (variant.wisp) parts.push(`<span class="mc-wisp">${'<i></i>'.repeat(6)}</span>`)
  parts.push('<span class="mc-reticle"></span>')
  return parts.join('')
}

const TEXT_FIELD =
  'input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable="true"]'
const INTERACTIVE = 'a, button, [role="button"], label, summary, select, [role="tab"]'
const MAX_SPARKS = 28

export function MagicCursor() {
  const [id, setId] = useState<CursorId | null>(null)

  useEffect(() => {
    setId(readCursor())
    const onChange = () => setId(readCursor())
    window.addEventListener(CHANGE_EVENT, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  useEffect(() => {
    if (!id || id === 'system') return
    const fine = matchMedia('(pointer: fine) and (hover: hover)')
    if (!fine.matches) return
    const variant = CURSORS[id]
    const scale = variant.scale ?? 2
    const [hx, hy] = variant.hotspot.map((v) => v * scale)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    const el = document.createElement('div')
    el.className = `magic-cursor mc-is-${id}`
    el.setAttribute('aria-hidden', 'true')
    el.style.setProperty('--hx', `${hx}px`)
    el.style.setProperty('--hy', `${hy}px`)
    el.innerHTML = cursorMarkup(variant)
    document.body.append(el)
    document.documentElement.classList.add('mc-on')

    let x = -100
    let y = -100
    let lastSpark = { x: -100, y: -100 }
    let sparks = 0
    let frame = 0
    const render = () => {
      frame = 0
      el.style.transform = `translate3d(${x - hx}px, ${y - hy}px, 0)`
    }
    const spark = (host: Element) => {
      const colors = variant.trail
      if (!colors || reduced || sparks >= MAX_SPARKS) return
      if (Math.hypot(x - lastSpark.x, y - lastSpark.y) < 9) return
      lastSpark = { x, y }
      const s = document.createElement('i')
      s.className = 'mc-spark'
      s.style.left = `${x}px`
      s.style.top = `${y}px`
      s.style.color = colors[Math.floor(Math.random() * colors.length)]
      s.style.background = s.style.color
      s.style.setProperty('--dx', `${(Math.random() - 0.5) * 18}px`)
      s.style.setProperty('--dy', `${6 + Math.random() * 14}px`)
      sparks++
      s.addEventListener('animationend', () => {
        s.remove()
        sparks--
      })
      host.append(s)
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      x = event.clientX
      y = event.clientY
      // A modal <dialog> sits in the top layer: the cursor has to live inside it to stay visible.
      const host = document.querySelector('dialog:modal') ?? document.body
      if (el.parentElement !== host) host.append(el)
      const target = event.target instanceof Element ? event.target : null
      const typing = Boolean(target?.closest(TEXT_FIELD))
      el.classList.toggle('mc-text', typing)
      el.classList.toggle('mc-hover', Boolean(target?.closest(INTERACTIVE)))
      // The battle arena asks for a crosshair over the shards.
      el.classList.toggle('mc-aim', document.body.style.cursor === 'crosshair')
      el.classList.remove('mc-gone')
      if (!typing) spark(host)
      if (!frame) frame = requestAnimationFrame(render)
    }
    const onDown = () => {
      el.classList.remove('mc-cast')
      // Restart the burst animation on every click.
      void el.offsetWidth
      el.classList.add('mc-cast')
    }
    const onLeave = () => el.classList.add('mc-gone')

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
      el.remove()
      document.querySelectorAll('.mc-spark').forEach((s) => s.remove())
      document.documentElement.classList.remove('mc-on')
    }
  }, [id])
  return null
}

/** Settings control: pick the cursor; the choice is kept on this device. */
export function CursorPicker() {
  const [current, setCurrent] = useState<CursorId>('arrow')
  useEffect(() => setCurrent(readCursor()), [])
  function choose(id: CursorId) {
    localStorage.setItem(STORAGE_KEY, id)
    setCurrent(id)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
  return (
    <fieldset>
      <legend className="mb-3 text-fg-muted">
        Your pointer, for mouse and trackpad. Touch screens keep their own.
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CURSOR_IDS.map((id) => (
          <label
            key={id}
            className={cx(
              'flex h-16 items-center gap-3 rounded-lg border px-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-royal-hi',
              current === id
                ? 'border-gold bg-panel-hi text-fg'
                : 'border-line text-fg-muted hover:border-line-strong',
            )}
          >
            <input
              type="radio"
              name="cursor"
              value={id}
              checked={current === id}
              onChange={() => choose(id)}
              className="sr-only"
            />
            <CursorPreview id={id} />
            {CURSORS[id].label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function CursorPreview({ id }: { id: CursorId }) {
  const variant = CURSORS[id]
  if (id === 'system') {
    return (
      <span aria-hidden className="grid size-8 place-items-center text-xl">
        ↖
      </span>
    )
  }
  if (!variant.grid || !variant.palette) {
    return (
      <span aria-hidden className="grid size-8 place-items-center">
        <span className="mc-orb static">
          <i />
        </span>
      </span>
    )
  }
  const w = gridWidth(variant.grid)
  const h = variant.grid.length
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${Math.max(w, h)} ${Math.max(w, h)}`}
      className="size-8 shrink-0"
      shapeRendering="crispEdges"
    >
      {cells(variant.grid, variant.palette).map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1.02} height={1.02} fill={c.fill} />
      ))}
    </svg>
  )
}
