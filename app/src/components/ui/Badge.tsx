import { cx } from './cx.ts'
import type { CSSProperties, ReactNode } from 'react'

/**
 * A small seal. `color` is any CSS color (usually a token); the fill is a tint of it,
 * the text and border the color itself, so every hue stays readable on both themes.
 */
export function Badge({
  color = 'var(--fg-muted)',
  icon,
  children,
  className,
}: {
  color?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      style={{ '--badge': color } as CSSProperties}
      className={cx(
        'label-caps inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[0.7rem] whitespace-nowrap',
        'border-[color-mix(in_oklab,var(--badge)_55%,transparent)] bg-[color-mix(in_oklab,var(--badge)_16%,transparent)]',
        'text-[color-mix(in_oklab,var(--badge)_70%,var(--fg))]',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
