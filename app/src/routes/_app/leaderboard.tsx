import { createFileRoute } from '@tanstack/react-router'
import { Crown, Trophy } from 'lucide-react'
import { BADGE_META } from '#/components/leaderboard/badge-meta.ts'
import { EmptyState } from '#/components/ui/EmptyState.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { cx } from '#/components/ui/cx.ts'
import { BADGES } from '#/lib/monitoring.ts'
import { getLeaderboard } from '#/lib/monitoring.functions.ts'
import type { Badge, LeaderboardEntry } from '#/lib/monitoring.ts'

export const Route = createFileRoute('/_app/leaderboard')({
  loader: () => getLeaderboard(),
  head: () => ({ meta: [{ title: 'Hall of Fame · Guardians of the Grid' }] }),
  component: HallOfFame,
})

/** Podium heights and metals for places 1-3, drawn in 2-1-3 order. */
const PODIUM = [
  { place: 2, height: 'h-28', metal: '#c9d2e8' },
  { place: 1, height: 'h-40', metal: '#e0b66a' },
  { place: 3, height: 'h-20', metal: '#c48a5a' },
] as const

function HallOfFame() {
  const entries = Route.useLoaderData()
  const { me } = Route.useRouteContext()
  const ranked = [...entries].sort((a, b) => b.fixes - a.fixes)

  if (ranked.length === 0) {
    return (
      <Panel className="mx-auto max-w-2xl">
        <EmptyState icon={<Trophy />} title="No rifts sealed yet">
          The first guardian to seal a rift opens the Hall of Fame.
        </EmptyState>
      </Panel>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div>
        <h1 className="title-gothic text-4xl sm:text-5xl">Hall of Fame</h1>
        <p className="text-fg-muted">Defenders ranked by the rifts they sealed.</p>
      </div>

      <Panel>
        <ol className="flex items-end justify-center gap-3 pt-6 sm:gap-6" aria-label="Top three">
          {PODIUM.map(({ place, height, metal }) => {
            const entry = ranked[place - 1] as LeaderboardEntry | undefined
            if (!entry) return <li key={place} className="w-24 sm:w-40" aria-hidden />
            return (
              <li key={place} className="flex w-24 flex-col items-center gap-2 sm:w-40">
                {place === 1 && (
                  <Crown
                    aria-hidden
                    className="size-8 text-gold drop-shadow-[0_0_10px_var(--gold)]"
                  />
                )}
                <span
                  className="title-gothic grid size-16 place-items-center rounded-2xl border-2 text-3xl sm:size-20 sm:text-4xl"
                  style={{
                    borderColor: metal,
                    background: `linear-gradient(160deg, color-mix(in oklab, ${metal} 35%, var(--panel)), var(--royal-deep))`,
                  }}
                >
                  {entry.guardian.codename.charAt(0)}
                </span>
                <span className="max-w-full truncate font-bold text-fg">
                  {entry.guardian.codename}
                </span>
                <span className="text-sm text-fg-muted tabular">
                  {entry.fixes} {entry.fixes === 1 ? 'rift' : 'rifts'} sealed
                </span>
                <div
                  className={cx(
                    'flex w-full items-start justify-center rounded-t-xl border-x border-t pt-2',
                    height,
                  )}
                  style={{
                    borderColor: metal,
                    background: `linear-gradient(180deg, color-mix(in oklab, ${metal} 30%, transparent), transparent)`,
                  }}
                >
                  <span className="title-gothic text-4xl" style={{ color: metal }}>
                    {place}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel heading="Ranking" flush>
          <ol className="divide-y divide-line/70">
            {ranked.map((entry, i) => (
              <li
                key={entry.guardian.guardianId}
                className={cx(
                  'flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5',
                  entry.guardian.guardianId === me.guardianId &&
                    'bg-panel-hi shadow-[inset_3px_0_0_var(--gold)]',
                )}
              >
                <span className="title-gothic w-8 text-2xl text-fg-muted tabular">{i + 1}</span>
                <span className="min-w-0 flex-1 font-bold text-fg">
                  {entry.guardian.codename}
                  {entry.guardian.guardianId === me.guardianId && (
                    <span className="ml-2 text-sm font-normal text-fg-faint">(you)</span>
                  )}
                </span>
                <span className="flex gap-1.5">
                  {entry.badges.map((badge) => (
                    <BadgeSeal key={badge} badge={badge} />
                  ))}
                </span>
                <span className="w-24 text-right text-fg-muted tabular">
                  <span className="title-gothic text-xl text-fg">{entry.fixes}</span> sealed
                </span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel heading="Badges">
          <ul className="flex flex-col gap-3">
            {BADGES.map((badge) => (
              <li key={badge} className="flex items-center gap-3">
                <BadgeSeal badge={badge} />
                <span>
                  <span className="block font-bold text-fg">{BADGE_META[badge].label}</span>
                  <span className="text-sm text-fg-muted">{BADGE_META[badge].earned}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function BadgeSeal({ badge }: { badge: Badge }) {
  const { label, earned, color, icon: Icon } = BADGE_META[badge]
  return (
    <span
      title={`${label}: ${earned}`}
      className="grid size-9 shrink-0 place-items-center rounded-full border-2 bg-field"
      style={{ borderColor: color, boxShadow: `0 0 12px -4px ${color}` }}
    >
      <Icon aria-label={label} className="size-4" style={{ color }} />
    </span>
  )
}
