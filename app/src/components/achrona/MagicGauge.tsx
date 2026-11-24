import { motion, useReducedMotion } from 'motion/react'
import { CountUp } from '#/components/ui/CountUp.tsx'

const R = 52
const ARC = Math.PI * 1.5 * R // a 270° dial

/** The colour of the magic: royal while it flows, amber when thin, ember when nearly gone. */
export function magicColor(level: number): string {
  if (level < 40) return 'var(--ember)'
  if (level < 70) return 'var(--amber)'
  return 'var(--royal-hi)'
}

/** Achrona's magic as a 270° rune dial: 100% means every glitch is sealed. */
export function MagicGauge({ level }: { level: number }) {
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(100, Math.round(level)))
  const color = magicColor(pct)
  const ticks = Array.from({ length: 28 }, (_, i) => -225 + (i * 270) / 27)
  return (
    <figure className="flex flex-col items-center">
      <div className="relative size-44">
        <svg
          viewBox="0 0 140 140"
          className="size-full"
          role="img"
          aria-label={`Magic level ${pct}%`}
        >
          {ticks.map((deg, i) => {
            const rad = (deg * Math.PI) / 180
            const lit = i / 27 <= pct / 100
            return (
              <line
                key={deg}
                x1={70 + Math.cos(rad) * 62}
                y1={70 + Math.sin(rad) * 62}
                x2={70 + Math.cos(rad) * (i % 3 === 0 ? 56 : 59)}
                y2={70 + Math.sin(rad) * (i % 3 === 0 ? 56 : 59)}
                stroke={lit ? color : 'var(--line-strong)'}
                strokeWidth={i % 3 === 0 ? 2 : 1.2}
                strokeLinecap="round"
              />
            )
          })}
          <circle
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke="var(--field)"
            strokeWidth="9"
            strokeDasharray={`${ARC} 999`}
            transform="rotate(135 70 70)"
            strokeLinecap="round"
          />
          <motion.circle
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            transform="rotate(135 70 70)"
            strokeDasharray={`${ARC} 999`}
            initial={false}
            animate={{ strokeDashoffset: ARC * (1 - pct / 100) }}
            transition={reduce ? { duration: 0 } : { duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <span className="title-gothic block text-5xl tabular" style={{ color }}>
              <CountUp value={pct} />%
            </span>
            <span className="label-caps text-[0.65rem] text-fg-muted">magic left</span>
          </div>
        </div>
      </div>
      <figcaption className="mt-1 max-w-[22ch] text-center text-sm text-fg-muted">
        {pct === 100
          ? 'Every rift is sealed.'
          : pct >= 70
            ? 'The grid holds, barely.'
            : pct >= 40
              ? 'The Desync is gaining ground.'
              : 'Achrona is unravelling.'}
      </figcaption>
    </figure>
  )
}
