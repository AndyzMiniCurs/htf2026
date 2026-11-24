import { Fragment } from 'react'
import { cx } from '#/components/ui/cx.ts'
import { GLITCH_STATUSES } from '#/lib/glitch.ts'
import { STATUS_META } from './glitch-meta.ts'
import type { GlitchStatus } from '#/lib/glitch.ts'

/** The four lifecycle stages at fixed size: passed stages lit, the current one glowing. */
export function LifecycleStrip({ status }: { status: GlitchStatus }) {
  const current = GLITCH_STATUSES.indexOf(status)
  return (
    <ol aria-label={`Lifecycle: ${STATUS_META[status].label}`} className="flex items-center">
      {GLITCH_STATUSES.map((stage, i) => {
        const { label, color, icon: Icon } = STATUS_META[stage]
        const reached = i <= current
        return (
          <Fragment key={stage}>
            {i > 0 && (
              <span aria-hidden className="h-0.5 min-w-4 flex-1 overflow-hidden bg-line">
                {/* The path fills toward the next seal when a glitch moves on. */}
                <span
                  className="block h-full origin-left transition-transform duration-700 ease-out-expo"
                  style={{ background: color, transform: `scaleX(${reached ? 1 : 0})` }}
                />
              </span>
            )}
            <li
              aria-current={i === current ? 'step' : undefined}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cx(
                  'grid size-11 place-items-center rounded-full border-2 transition-[box-shadow,border-color,color,background-color] duration-500 sm:size-12',
                  reached ? 'bg-field' : 'border-line bg-ground-2 text-fg-faint',
                )}
                style={
                  reached
                    ? {
                        borderColor: color,
                        color,
                        boxShadow: i === current ? `0 0 20px -4px ${color}` : undefined,
                      }
                    : undefined
                }
              >
                <Icon aria-hidden className="size-5" />
              </span>
              <span
                className="label-caps text-[0.62rem] sm:text-[0.68rem]"
                style={{ color: reached ? color : 'var(--fg-faint)' }}
              >
                {label}
              </span>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
