import type { ReactNode } from 'react'

/** What a screen shows when there is nothing yet, with the way forward. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-2xl border border-line-strong bg-ground-2 text-curse-hi [&>svg]:size-8">
        {icon}
      </div>
      <h3 className="title-gothic text-2xl">{title}</h3>
      {children && <p className="max-w-[48ch] text-fg-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
