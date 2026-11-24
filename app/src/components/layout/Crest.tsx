import { useId } from 'react'

/**
 * The guardians' crest: a gilt shield over a night field crossed by the Grid's ley lines, a crystal
 * sword planted through it, and one band torn sideways by The Desync. Authored SVG, no raster;
 * public/favicon.svg and the PWA icons are rendered from this same drawing.
 */
export function Crest({ className }: { className?: string }) {
  // Ids must stay unique when two crests share a page; useId's colons are not valid in url(#…).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id = (name: string) => `crest-${name}-${uid}`
  const url = (name: string) => `url(#${id(name)})`

  const emblem = (
    <>
      <path d="M10 9Q32 3 54 9V30C54 44 44 54 32 60 20 54 10 44 10 30Z" fill={url('field')} />
      <g clipPath={url('inner')} stroke="#3b74ff" strokeOpacity=".38" strokeWidth=".7">
        <path d="M16 6v56M24 6v56M40 6v56M48 6v56M6 18h52M6 26h52M6 34h52M6 42h52" />
      </g>
      <g fill="#9fd0ff">
        <circle cx="24" cy="26" r="1.3" />
        <circle cx="40" cy="34" r="1.3" />
        <circle cx="48" cy="18" r="1.1" />
        <circle cx="16" cy="42" r="1.1" />
      </g>
      <ellipse cx="32" cy="27" rx="9" ry="18" fill={url('aura')} />
      <path
        d="M32 8.6 35 15V38.8H29V15Z"
        fill={url('blade')}
        stroke="#f6d8ff"
        strokeOpacity=".7"
        strokeWidth=".6"
        strokeLinejoin="round"
      />
      <path d="M32 10.5v28" stroke="#fff" strokeOpacity=".75" strokeWidth=".6" />
      <path
        d="M19.5 39.6Q25.5 37.4 32 38.4 38.5 37.4 44.5 39.6L42.6 42.4Q37 40.8 32 41.5 27 40.8 21.4 42.4Z"
        fill={url('gold')}
      />
      <rect
        x="17.6"
        y="38.4"
        width="2.6"
        height="2.6"
        transform="rotate(45 18.9 39.7)"
        fill="#f3d39a"
      />
      <rect
        x="43.8"
        y="38.4"
        width="2.6"
        height="2.6"
        transform="rotate(45 45.1 39.7)"
        fill="#f3d39a"
      />
      <rect x="30.6" y="42" width="2.8" height="7.5" fill="#5c3d08" />
      <path d="M30.6 44.5h2.8M30.6 47h2.8" stroke="#e0b66a" strokeWidth=".7" />
      <rect
        x="30"
        y="49.6"
        width="4"
        height="4"
        transform="rotate(45 32 51.6)"
        fill="#c75cf2"
        stroke="#f3d39a"
        strokeWidth=".6"
      />
    </>
  )

  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <defs>
        <radialGradient id={id('field')} cx=".5" cy=".3" r=".75">
          <stop offset="0" stopColor="#2347b8" />
          <stop offset=".55" stopColor="#13205a" />
          <stop offset="1" stopColor="#090d26" />
        </radialGradient>
        <radialGradient id={id('aura')}>
          <stop offset="0" stopColor="#c75cf2" stopOpacity=".55" />
          <stop offset="1" stopColor="#c75cf2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('blade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor="#d9c6ff" />
          <stop offset="1" stopColor="#a52bd9" />
        </linearGradient>
        <linearGradient id={id('gold')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3d39a" />
          <stop offset=".5" stopColor="#e0b66a" />
          <stop offset="1" stopColor="#8a6428" />
        </linearGradient>
        <clipPath id={id('inner')}>
          <path d="M14 12.2Q32 7.5 50 12.2V30C50 41.5 42 50 32 55.4 22 50 14 41.5 14 30Z" />
        </clipPath>
        <clipPath id={id('shield')}>
          <path d="M10 9Q32 3 54 9V30C54 44 44 54 32 60 20 54 10 44 10 30Z" />
        </clipPath>
        <clipPath id={id('band')}>
          <rect x="0" y="22" width="64" height="4.6" />
        </clipPath>
        <mask id={id('rest')}>
          <rect width="64" height="64" fill="#fff" />
          <rect x="0" y="22" width="64" height="4.6" fill="#000" />
        </mask>
      </defs>

      <g mask={url('rest')}>{emblem}</g>
      {/* The Desync: one band of the crest slips sideways, edged in split colour. */}
      <g clipPath={url('shield')}>
        <g clipPath={url('band')}>
          <g className="crest-slip">{emblem}</g>
        </g>
        <rect x="0" y="21.6" width="64" height=".8" fill="#ff2bd6" opacity=".85" />
        <rect x="0" y="26.2" width="64" height=".8" fill="#22e6ff" opacity=".85" />
      </g>

      <path
        d="M10 9Q32 3 54 9V30C54 44 44 54 32 60 20 54 10 44 10 30Z"
        fill="none"
        stroke={url('gold')}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 12.2Q32 7.5 50 12.2V30C50 41.5 42 50 32 55.4 22 50 14 41.5 14 30Z"
        fill="none"
        stroke="#f3d39a"
        strokeOpacity=".45"
        strokeWidth=".7"
      />
      <rect
        x="30.2"
        y="3.4"
        width="3.6"
        height="3.6"
        transform="rotate(45 32 5.2)"
        fill="#c75cf2"
        stroke="#f3d39a"
        strokeWidth=".6"
      />
    </svg>
  )
}
