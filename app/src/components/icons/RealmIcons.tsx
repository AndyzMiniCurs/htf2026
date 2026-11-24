import type { ReactNode, SVGProps } from 'react'

export type RealmIcon = (props: { className?: string }) => ReactNode

/**
 * Achrona's own icon set: hand-drawn on a 24px grid, one stroke weight, two tones.
 * Body shapes take a translucent wash of the current colour; small details (gems, flags,
 * seals, the eye) are always gold so every icon carries one spark of the realm.
 */
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

const wash = { fill: 'currentColor', fillOpacity: 0.16 }
const gold = { fill: 'var(--gold)', stroke: 'var(--gold)' }

/** Overview: the citadel, two spired towers around a keep with a pennant. */
export const CitadelIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <path d="M3.5 21v-8.5h4V21M16.5 21v-8.5h4V21" {...wash} />
    <path d="M3 12.5 5.5 8 8 12.5M16 12.5 18.5 8l2.5 4.5" {...wash} />
    <path d="M7.5 21V10.5h9V21" {...wash} />
    <path d="M7 10.5 12 4l5 6.5" {...wash} />
    <path d="M10.5 21v-2.6a1.5 1.5 0 0 1 3 0V21M2 21h20" />
    <path d="M12 4V1.8l2.6 1-2.6 1" {...gold} strokeWidth={1.1} />
  </Glyph>
)

/** Quest log: a scroll with its rolls and a wax seal. */
export const ScrollIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <path
      d="M7 5h11.5a1.6 1.6 0 0 1 0 3.2H18V18a3 3 0 0 1-3 3H5.6a1.6 1.6 0 0 1 0-3.2H7z"
      {...wash}
    />
    <path d="M7 5a1.6 1.6 0 0 0 0 3.2H18" />
    <path d="M10 11.5h5M10 14.5h4" />
    <circle cx="14.5" cy="18.6" r="1.7" {...gold} strokeWidth={1} />
  </Glyph>
)

/** Map of Achrona: a folded chart, a dashed trail and the X where the rift is. */
export const ChartIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <path d="m3 6.5 6-2.2 6 2.2 6-2.2v13.2l-6 2.2-6-2.2-6 2.2z" {...wash} />
    <path d="M9 4.3v13.2M15 6.5v13.2" strokeOpacity={0.55} />
    <path d="M5.5 15c1.6-2.2 3.4-.4 5-2.6 1.4-1.9 2.8-2.2 4.2-1.6" strokeDasharray="1.6 1.8" />
    <path d="m16.6 7.8 2.4 2.4m0-2.4-2.4 2.4" {...gold} strokeWidth={1.6} />
  </Glyph>
)

/** Sensors: a ley crystal sending out pulses. */
export const LeyCrystalIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <path d="m12 3.5 3.6 5.5L12 20.5 8.4 9z" {...wash} />
    <path d="M8.4 9h7.2M12 3.5V9" strokeOpacity={0.6} />
    <path d="M5.6 8.2a6.5 6.5 0 0 0 0 7.6M18.4 8.2a6.5 6.5 0 0 1 0 7.6" />
    <path d="M3.2 6.3a9.5 9.5 0 0 0 0 11.4M20.8 6.3a9.5 9.5 0 0 1 0 11.4" strokeOpacity={0.5} />
    <circle cx="12" cy="9" r="1.1" {...gold} strokeWidth={0.8} />
  </Glyph>
)

/** Oracle: a seeing orb on its stand, an eye awake inside. */
export const OracleIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <circle cx="12" cy="10" r="7" {...wash} />
    <path d="M7.2 21h9.6l-1.6-3.6H8.8z" {...wash} />
    <path d="M8.4 10s1.4-2.6 3.6-2.6 3.6 2.6 3.6 2.6-1.4 2.6-3.6 2.6-3.6-2.6-3.6-2.6" />
    <circle cx="12" cy="10" r="1.2" {...gold} strokeWidth={0.8} />
    <path d="M8.2 6.6a4.8 4.8 0 0 1 2.4-1.5" strokeOpacity={0.6} />
  </Glyph>
)

/** Hall of Fame: a jewelled crown. */
export const CrownIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <path d="m3.5 8.5 4.3 4.2L12 6l4.2 6.7 4.3-4.2-1.8 9.5H5.3z" {...wash} />
    <path d="M5.3 18h13.4v2.5H5.3z" {...wash} />
    <circle cx="3.5" cy="8" r="1.2" {...gold} strokeWidth={0.8} />
    <circle cx="12" cy="5.4" r="1.3" {...gold} strokeWidth={0.8} />
    <circle cx="20.5" cy="8" r="1.2" {...gold} strokeWidth={0.8} />
  </Glyph>
)

/** Guardians: a heater shield bearing the realm's crystal. */
export const WardIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <path d="M12 2.8 19.2 5.4v5.8c0 5-3.6 8.5-7.2 10-3.6-1.5-7.2-5-7.2-10V5.4z" {...wash} />
    <path d="m12 7.2 2.2 3.6-2.2 5.6-2.2-5.6z" {...gold} strokeWidth={1} />
  </Glyph>
)

/** Settings: a rune dial, the circle guardians turn to tune their tools. */
export const RuneDialIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="8.2" {...wash} />
    <path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5.1 5.1 7 7M17 17l1.9 1.9M5.1 18.9 7 17M17 7l1.9-1.9" />
    <circle cx="12" cy="12" r="3" />
    <path d="m12 10.3 1 1.7-1 1.7-1-1.7z" {...gold} strokeWidth={0.8} />
  </Glyph>
)

/** The report seal: a horn sounding an echo. */
export const HornIcon: RealmIcon = ({ className }) => (
  <Glyph className={className}>
    <path d="M4 10.5c5.5 0 9.5-2.4 13-6v15c-3.5-3.6-7.5-6-13-6z" {...wash} />
    <path d="M4 10.5v3M7.5 13.6l1.2 5.4h2.4l-1-5" />
    <path d="M20 9.5a3.2 3.2 0 0 1 0 5" {...gold} fill="none" />
  </Glyph>
)
