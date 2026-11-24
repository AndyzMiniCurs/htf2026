import { useId } from 'react'
import { cx } from './cx.ts'
import type { ReactNode } from 'react'

/** An on/off switch with its label and an optional description; a real checkbox underneath. */
export function Switch({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description?: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cx(
        'flex items-start justify-between gap-4 py-3',
        disabled ? 'opacity-50' : 'cursor-pointer',
      )}
    >
      <span>
        <span className="block font-bold text-fg">{label}</span>
        {description && <span className="text-sm text-fg-muted">{description}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          'relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors duration-200',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-royal-hi',
          checked ? 'border-royal-hi bg-royal' : 'border-line-strong bg-field',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 size-5.5 rounded-full bg-white shadow transition-transform duration-200 ease-out-expo',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </span>
    </label>
  )
}
