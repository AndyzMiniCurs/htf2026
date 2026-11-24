/**
 * The Desync crawling in from the screen edges: purple crystal veins with loose cubes,
 * after the event's key art. Pure decoration, fixed behind the app.
 */
export function CurseVeins() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
    >
      <Vein className="absolute -left-24 top-0 h-full w-[34rem] opacity-35" />
      <Vein className="absolute -right-24 top-0 h-full w-[34rem] -scale-x-100 opacity-35" />
    </div>
  )
}

function Vein({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 540 1000" preserveAspectRatio="xMinYMid slice" className={className}>
      <defs>
        <linearGradient id="vein" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--curse-hi)' }} stopOpacity=".55" />
          <stop offset=".6" style={{ stopColor: 'var(--curse)' }} stopOpacity=".35" />
          <stop offset="1" style={{ stopColor: 'var(--royal-deep)' }} stopOpacity=".2" />
        </linearGradient>
      </defs>
      <path
        d="M120 -20 170 90 110 150 190 260 140 330 230 450 150 540 210 640 120 760 190 880 140 1020 60 1020 100 880 40 760 120 640 70 540 140 450 60 330 110 260 40 150 90 90 60 -20Z"
        fill="url(#vein)"
      />
      <path
        d="M150 330 260 300 330 340 250 360Z M140 640 250 690 300 660 230 720Z"
        fill="url(#vein)"
      />
      <g opacity=".7" className="fill-curse-hi motion-safe:animate-[drift_9s_ease-in-out_infinite]">
        <rect x="250" y="120" width="18" height="18" rx="3" transform="rotate(18 259 129)" />
        <rect x="300" y="420" width="12" height="12" rx="2" transform="rotate(-24 306 426)" />
        <rect x="270" y="780" width="22" height="22" rx="3" transform="rotate(32 281 791)" />
        <rect x="340" y="610" width="9" height="9" rx="2" />
      </g>
    </svg>
  )
}
