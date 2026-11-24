import { cx } from './cx.ts'
import type { ComponentProps } from 'react'

/** Icon-only control. Needs an aria-label; 44px hit area for thumbs. */
export function IconButton({
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { 'aria-label': string }) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex size-11 items-center justify-center rounded-full text-fg-muted',
        'transition-[color,background-color,transform] duration-200 ease-out-expo hover:bg-panel-hi active:scale-90 hover:text-fg disabled:opacity-45',
        className,
      )}
      {...props}
    />
  )
}
