import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { AchronaDiorama } from '#/components/achrona/AchronaDiorama.tsx'
import { QuestLog, QuestLogHeading } from '#/components/glitches/QuestLog.tsx'
import { STATUS_META, TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { Panel } from '#/components/ui/Panel.tsx'
import { RelativeTime } from '#/components/ui/RelativeTime.tsx'
import { GLITCH_STATUSES, GLITCH_TYPES } from '#/lib/glitch.ts'
import { getDashboard } from '#/lib/monitoring.functions.ts'
import { getGlitches } from '#/lib/glitches.functions.ts'
import { MagicGauge } from '#/components/achrona/MagicGauge.tsx'
import type { GlitchListItem, GlitchStatus, GlitchType } from '#/lib/glitch.ts'

export const Route = createFileRoute('/_app/')({
  // The world and the quest log show every glitch; the dashboard brings the realm's totals.
  loader: async () => {
    const [dashboard, glitches] = await Promise.all([getDashboard(), getGlitches({ data: {} })])
    return { dashboard, glitches }
  },
  component: OverviewPage,
})

function OverviewPage() {
  const { dashboard, glitches } = Route.useLoaderData()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const open = glitches.filter((g) => g.status !== 'FIXED')

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
      <h1 className="sr-only">Overview of Achrona</h1>
      {dashboard.lockdown && <LockdownBanner />}
      <div className="flex min-w-0 flex-col gap-5">
        <Panel
          flush
          heading="Achrona"
          actions={<StatusTally byStatus={dashboard.byStatus} />}
          className="overflow-hidden"
        >
          <div className="relative h-[clamp(20rem,52vh,46rem)] lg:h-[max(26rem,calc(100dvh-27rem))]">
            <AchronaDiorama
              glitches={glitches}
              highlightedId={highlightedId}
              onHighlight={setHighlightedId}
              onSelect={setHighlightedId}
            />
            <Chronicle glitches={glitches} />
          </div>
        </Panel>
        <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
          <Panel heading="Magic">
            <MagicGauge level={dashboard.magicLevel} />
          </Panel>
          <Panel heading="Glitches by kind">
            <TypeTally byType={dashboard.byType} />
          </Panel>
        </div>
      </div>

      <Panel
        heading={<QuestLogHeading count={open.length} />}
        className="lg:max-h-[calc(100dvh-8.5rem)] lg:overflow-y-auto"
      >
        <QuestLog
          glitches={glitches}
          highlightedId={highlightedId}
          onHighlight={setHighlightedId}
        />
      </Panel>
    </div>
  )
}

/** Counts per status as small seals in the panel header. */
function StatusTally({ byStatus }: { byStatus: Record<GlitchStatus, number> }) {
  return (
    <ul className="hidden items-center gap-4 sm:flex" aria-label="Glitches per status">
      {GLITCH_STATUSES.map((status) => {
        const { label, color, icon: Icon } = STATUS_META[status]
        return (
          <li key={status} className="flex items-center gap-1.5" title={label}>
            <Icon aria-hidden className="size-4" style={{ color }} />
            <span className="title-gothic text-xl tabular">{byStatus[status]}</span>
            <span className="label-caps hidden text-[0.65rem] text-fg-muted xl:inline">
              {label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** The latest happenings, written along the bottom of the world like a story caption. */
function Chronicle({ glitches }: { glitches: Array<GlitchListItem> }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-[linear-gradient(0deg,rgb(12_15_26/0.92),transparent)] px-5 pt-12 pb-4 sm:block">
      <p className="label-caps mb-1.5 text-[0.65rem] text-gold">Chronicle</p>
      <ul className="flex flex-col gap-1 font-serif text-[0.95rem] text-[#e1e7ff]">
        {glitches.slice(0, 3).map((g) => (
          <li key={g.glitchId} className="truncate">
            <span className="title-gothic mr-2 text-base">{g.glitchId}</span>
            {g.description}
            <span className="ml-2 text-[#b7b2cf]">
              · <RelativeTime iso={g.timestamp} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** How many glitches of each kind are on record, each kind in its own colour and sigil. */
function TypeTally({ byType }: { byType: Record<GlitchType, number> }) {
  const max = Math.max(1, ...GLITCH_TYPES.map((t) => byType[t]))
  return (
    <ul className="flex flex-col gap-2.5" aria-label="Glitches per type">
      {GLITCH_TYPES.map((type) => {
        const { label, color, icon: Icon } = TYPE_META[type]
        const count = byType[type]
        return (
          <li
            key={type}
            className="grid grid-cols-[1.5rem_8.5rem_minmax(0,1fr)_2rem] items-center gap-3"
          >
            <Icon aria-hidden className="size-5" style={{ color }} />
            <span className="truncate text-fg">{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-field">
              <span
                className="block h-full rounded-full transition-[width] duration-700 ease-out-expo"
                style={{ width: `${(count / max) * 100}%`, background: color }}
              />
            </span>
            <span className="title-gothic text-right text-xl tabular">{count}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Shown on every overview while a commander holds the city in lockdown. */
function LockdownBanner() {
  return (
    <p
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-ember bg-[color-mix(in_oklab,var(--ember)_18%,var(--panel))] px-5 py-3.5 text-fg lg:col-span-2"
    >
      <ShieldAlert aria-hidden className="size-6 shrink-0 text-ember" />
      <span>
        <strong className="title-gothic mr-2 text-2xl text-ember">Lockdown</strong>A great attack is
        under way. Report every echo, hold your post.
      </span>
    </p>
  )
}
