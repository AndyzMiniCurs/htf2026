import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

/** Open glitches at which the screen is as torn as it gets. */
const FULL_DESYNC = 10

type Band = { top: number; height: number; shift: number; hue: number; tear: boolean }

/**
 * The Desync reaches past the diorama into the whole screen: the more glitches are open, the
 * more often and harder everything stutters. When the last one is fixed a verdant light sweeps
 * across once and the screen goes still.
 */
export function Desync({ openGlitches }: { openGlitches: number }) {
  const level = Math.min(openGlitches, FULL_DESYNC) / FULL_DESYNC
  const [bands, setBands] = useState<Array<Band>>([])
  const [cleared, setCleared] = useState(0)
  const previous = useRef(openGlitches)

  useEffect(() => {
    if (previous.current > 0 && openGlitches === 0) setCleared((n) => n + 1)
    previous.current = openGlitches
  }, [openGlitches])

  useEffect(() => {
    const root = document.documentElement
    if (level === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer: ReturnType<typeof setTimeout>

    // Never more than one burst per 1.2 s, so the screen stays under three flashes a second.
    const schedule = () => {
      const gap = 9000 - 7800 * level
      timer = setTimeout(burst, gap * (0.6 + Math.random() * 0.8))
    }
    const burst = () => {
      if (document.hidden) return schedule()
      const count = 2 + Math.round(level * 4 * Math.random())
      setBands(
        Array.from({ length: count }, () => ({
          top: Math.random() * 100,
          height: 0.4 + Math.random() * (2 + level * 7),
          shift: (Math.random() - 0.5) * (20 + level * 80),
          hue: Math.random() < 0.5 ? 90 : -120,
          tear: Math.random() < 0.25,
        })),
      )
      root.dataset.desync = level > 0.5 ? 'heavy' : 'burst'
      timer = setTimeout(
        () => {
          setBands([])
          delete root.dataset.desync
          schedule()
        },
        140 + Math.random() * 220,
      )
    }
    schedule()
    return () => {
      clearTimeout(timer)
      delete root.dataset.desync
    }
  }, [level])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden print:hidden"
      style={{ '--desync': level } as CSSProperties}
    >
      {level > 0 && <div className="desync-veil absolute inset-0" />}
      {bands.map((band, i) => (
        <div
          key={i}
          className={band.tear ? 'desync-band desync-tear' : 'desync-band'}
          style={
            {
              top: `${band.top}%`,
              height: `${band.height}%`,
              '--shift': `${band.shift}px`,
              '--hue': `${band.hue}deg`,
            } as CSSProperties
          }
        />
      ))}
      {cleared > 0 && <div key={cleared} className="desync-clear absolute inset-0" />}
    </div>
  )
}
