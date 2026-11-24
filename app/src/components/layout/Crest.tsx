/** The guardians' crest: a purple crystal shard held in a royal-blue shield. Authored SVG, no raster. */
export function Crest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <defs>
        <linearGradient id="crest-shard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e292f4" />
          <stop offset=".45" stopColor="#a52bd9" />
          <stop offset="1" stopColor="#5a1689" />
        </linearGradient>
        <linearGradient id="crest-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b74ff" />
          <stop offset="1" stopColor="#01296a" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 42 9v14c0 11-8 18.5-18 22C14 41.5 6 34 6 23V9z"
        fill="url(#crest-shield)"
        stroke="#e1e7ff"
        strokeOpacity=".55"
        strokeWidth="1.5"
      />
      <path
        d="M24 10 31 22 26 25 29 38 17 21 23 19z"
        fill="url(#crest-shard)"
        stroke="#f6d8ff"
        strokeOpacity=".7"
        strokeWidth=".8"
        strokeLinejoin="round"
      />
      <rect
        x="34"
        y="27"
        width="4"
        height="4"
        rx=".6"
        transform="rotate(20 36 29)"
        fill="#c75cf2"
      />
      <rect
        x="10.5"
        y="14"
        width="3"
        height="3"
        rx=".5"
        transform="rotate(-15 12 15.5)"
        fill="#e292f4"
      />
    </svg>
  )
}
