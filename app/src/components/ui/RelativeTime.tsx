const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Infinity],
]

export function relativeTime(iso: string, now = Date.now()): string {
  let value = (new Date(iso).getTime() - now) / 1000
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit)
    value /= size
  }
  return iso
}

/** "2 minutes ago", with the exact time on hover. The browser's clock wins over the server's. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  return (
    <time
      dateTime={iso}
      title={new Date(iso).toLocaleString('en-GB')}
      className={className}
      suppressHydrationWarning
    >
      {relativeTime(iso)}
    </time>
  )
}
