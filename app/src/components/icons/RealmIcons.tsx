import type { ReactNode, SVGProps } from 'react'

export type RealmIcon = (props: { className?: string }) => ReactNode

/** Hand-drawn glyphs on a 24px grid: a translucent wash of the current colour plus one gold detail. */
function Glyph({ children, className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      {children}
    </svg>
  )
}

const wash = { fill: 'currentColor', fillOpacity: 0.26 }
const gold = { fill: 'var(--gold)', stroke: 'var(--gold)' }

/** The report seal: a horn sounding an echo. */
export const HornIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <path d="M4 10.5c5.5 0 9.5-2.4 13-6v15c-3.5-3.6-7.5-6-13-6z" {...wash} />
    <path d="M4 10.5v3M7.5 13.6l1.2 5.4h2.4l-1-5" />
    <path d="M20 9.5a3.2 3.2 0 0 1 0 5" {...gold} fill="none" />
  </Glyph>
)
