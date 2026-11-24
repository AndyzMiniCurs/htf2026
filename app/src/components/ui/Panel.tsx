import { cx } from './cx.ts'
import type { ComponentProps, ReactNode } from 'react'

type PanelProps = ComponentProps<'section'> & {
  /** Gothic title in the panel's header bar. */
  heading?: ReactNode
  /** Controls on the right of the header bar. */
  actions?: ReactNode
  /** Drop the inner padding, for tables and media that run edge to edge. */
  flush?: boolean
}

/** The game window: a stone panel in a thin frame with a crystal cube on each corner. */
export function Panel({ heading, actions, flush, className, children, ...props }: PanelProps) {
  return (
    <section
      className={cx(
        'relative rounded-xl border border-line bg-panel shadow-(--shadow)',
        'bg-[linear-gradient(180deg,var(--panel-hi),var(--panel)_42%)]',
        className,
      )}
      {...props}
    >
      <Corners />
      {(heading || actions) && (
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-5 py-3">
          {heading && <h2 className="title-gothic text-2xl">{heading}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? undefined : 'p-5'}>{children}</div>
    </section>
  )
}

function Corners() {
  const cube =
    'pointer-events-none absolute size-2.5 rotate-45 rounded-[2px] border border-curse-hi/70 bg-curse shadow-[0_2px_6px_rgb(0_0_0/0.5)]'
  return (
    <>
      <span aria-hidden className={cx(cube, '-left-[5px] -top-[5px]')} />
      <span aria-hidden className={cx(cube, '-right-[5px] -top-[5px]')} />
      <span aria-hidden className={cx(cube, '-bottom-[5px] -left-[5px]')} />
      <span aria-hidden className={cx(cube, '-bottom-[5px] -right-[5px]')} />
    </>
  )
}
