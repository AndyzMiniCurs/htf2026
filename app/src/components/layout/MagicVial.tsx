import { motion, useReducedMotion } from 'motion/react'
import { cx } from '#/components/ui/cx.ts'

/** Achrona's magic level as a glowing mana vial. Below 40% the liquid turns ember. */
export function MagicVial({ level, compact }: { level: number; compact?: boolean }) {
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(100, Math.round(level)))
  const low = pct < 40
  return (
    <div className={cx('flex items-center gap-3', compact ? 'w-full' : 'w-[min(26rem,34vw)]')}>
      <span className="label-caps hidden text-fg-muted sm:inline">Magic</span>
      <div
        role="meter"
        aria-label="Magic level in Achrona"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="relative h-4 flex-1 overflow-hidden rounded-full border border-line-strong bg-field shadow-[inset_0_2px_6px_rgb(0_0_0/0.5)]"
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: low
              ? 'linear-gradient(90deg, #7a1a0c, var(--ember), #ffb08a)'
              : 'linear-gradient(90deg, var(--royal-deep), var(--royal-hi) 45%, var(--curse-hi) 85%, var(--pink))',
          }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {!reduce && (
            <motion.span
              aria-hidden
              className="absolute inset-y-0 w-16 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.55),transparent)]"
              animate={{ left: ['-20%', '110%'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
            />
          )}
        </motion.div>
        {/* Quarter ticks, like the notches on a potion flask. */}
        <div aria-hidden className="absolute inset-0 grid grid-cols-4">
          <span className="border-r border-white/15" />
          <span className="border-r border-white/15" />
          <span className="border-r border-white/15" />
        </div>
      </div>
      <span className={cx('title-gothic w-14 text-right text-2xl tabular', low && 'text-ember')}>
        {pct}%
      </span>
    </div>
  )
}
