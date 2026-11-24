import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AchronaDiorama } from '#/components/achrona/AchronaDiorama.tsx'
import { QuestLog, QuestLogHeading } from '#/components/glitches/QuestLog.tsx'
import { STATUS_META } from '#/components/glitches/glitch-meta.ts'
import { Panel } from '#/components/ui/Panel.tsx'
import { RelativeTime } from '#/components/ui/RelativeTime.tsx'
import { GLITCH_STATUSES } from '#/lib/glitch.ts'
import { getDashboard } from '#/lib/monitoring.functions.ts'
import type { GlitchListItem, GlitchStatus } from '#/lib/glitch.ts'

export const Route = createFileRoute('/_app/')({
  loader: () => getDashboard(),
  component: OverviewPage,
})

function OverviewPage() {
  const dashboard = Route.useLoaderData()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const open = dashboard.recent.filter((g) => g.status !== 'FIXED')

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
      <h1 className="sr-only">Overview of Achrona</h1>
      <Panel
        flush
        heading="Achrona"
        actions={<StatusTally byStatus={dashboard.byStatus} />}
        className="overflow-hidden"
      >
        <div className="relative h-[clamp(20rem,52vh,46rem)] lg:h-[calc(100dvh-15rem)]">
          <AchronaDiorama
            glitches={dashboard.recent}
            highlightedId={highlightedId}
            onHighlight={setHighlightedId}
            onSelect={setHighlightedId}
          />
          <Chronicle glitches={dashboard.recent} />
        </div>
      </Panel>

      <Panel
        heading={<QuestLogHeading count={open.length} />}
        className="lg:max-h-[calc(100dvh-8.5rem)] lg:overflow-y-auto"
      >
        <QuestLog
          glitches={dashboard.recent}
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-[linear-gradient(0deg,rgb(22_15_31/0.92),transparent)] px-5 pt-12 pb-4 sm:block">
      <p className="label-caps mb-1.5 text-[0.65rem] text-pink">Chronicle</p>
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
