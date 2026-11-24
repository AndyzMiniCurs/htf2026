import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { cx } from './cx.ts'
import type { ComponentProps, ReactNode } from 'react'

const control = cx(
  'w-full rounded-lg border border-line bg-field px-3.5 text-base text-fg',
  'placeholder:text-fg-faint transition-[border-color,box-shadow] duration-200',
  'hover:border-line-strong focus:border-royal-hi focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--royal-hi)_35%,transparent)] focus:outline-none',
  'aria-invalid:border-ember disabled:opacity-50',
)

type FieldFrameProps = {
  label: string
  hint?: ReactNode
  error?: string
  /** Shown right of the label, e.g. a character counter. */
  aside?: ReactNode
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

/** Label, hint and error wiring shared by every input. */
function FieldFrame({ label, hint, error, aside, children }: FieldFrameProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label-caps text-fg-muted">
          {label}
        </label>
        {aside && <span className="text-sm text-fg-faint tabular">{aside}</span>}
      </div>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-sm text-fg-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-ember">
          {error}
        </p>
      )}
    </div>
  )
}

type Common = { label: string; hint?: ReactNode; error?: string; aside?: ReactNode }

export function Input({
  label,
  hint,
  error,
  aside,
  className,
  ...props
}: Common & ComponentProps<'input'>) {
  return (
    <FieldFrame label={label} hint={hint} error={error} aside={aside}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx(control, 'h-11', className)}
          {...props}
        />
      )}
    </FieldFrame>
  )
}

export function Textarea({
  label,
  hint,
  error,
  aside,
  className,
  ...props
}: Common & ComponentProps<'textarea'>) {
  return (
    <FieldFrame label={label} hint={hint} error={error} aside={aside}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx(control, 'min-h-28 resize-y py-2.5 leading-relaxed', className)}
          {...props}
        />
      )}
    </FieldFrame>
  )
}

export function Select({
  label,
  hint,
  error,
  aside,
  className,
  children,
  ...props
}: Common & ComponentProps<'select'>) {
  return (
    <FieldFrame label={label} hint={hint} error={error} aside={aside}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cx(control, 'h-11 appearance-none pr-10', className)}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted"
          />
        </div>
      )}
    </FieldFrame>
  )
}
