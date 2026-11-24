import { LoaderCircle } from 'lucide-react'
import { cx } from './cx.ts'
import type { ComponentProps, ReactNode } from 'react'

const variants = {
  /** The event's royal-blue pill: the main action on a screen. */
  primary:
    'bg-royal text-on-accent border-b-royal-deep hover:bg-royal-hi shadow-[0_8px_20px_-10px_var(--royal)]',
  /** Purple crystal: actions that touch the curse itself (AI, lockdown). */
  curse:
    'bg-curse text-on-accent border-b-[color-mix(in_oklab,var(--curse)_55%,black)] hover:bg-curse-hi shadow-[0_8px_20px_-10px_var(--curse)]',
  danger:
    'bg-ember text-on-accent border-b-[color-mix(in_oklab,var(--ember)_55%,black)] hover:brightness-110',
  ghost:
    'bg-transparent text-fg border border-line-strong border-b-line-strong hover:bg-panel-hi hover:border-gold',
} as const

const sizes = {
  // 44px on touch screens, compact where there is a pointer and room.
  sm: 'h-11 lg:h-9 px-4 text-[0.8rem] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
} as const

type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  icon?: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'label-caps inline-flex shrink-0 items-center justify-center rounded-full border-b-[3px] whitespace-nowrap',
        'transition-[background-color,transform,filter,border-color] duration-200 ease-out-expo',
        'active:translate-y-px active:border-b-[1px] disabled:pointer-events-none disabled:opacity-45',
        'min-w-11',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
