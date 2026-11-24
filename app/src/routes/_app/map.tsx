import { createFileRoute } from '@tanstack/react-router'
import { MapPinOff, MousePointerClick } from 'lucide-react'
import { useState } from 'react'
import { AchronaMap } from '#/components/achrona/AchronaMap.tsx'
import { QuestCard } from '#/components/glitches/QuestLog.tsx'
import { TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { Panel } from '#/components/ui/Panel.tsx'
import { GLITCH_TYPES } from '#/lib/glitch.ts'
import { getGlitches } from '#/lib/glitches.functions.ts'

export const Route = createFileRoute('/_app/map')({
  loader: () => getGlitches({ data: { status: ['LEAKED', 'ASSESSING', 'CONTAINING'] } }),
  head: () => ({ meta: [{ title: 'Map of Achrona · Guardians of the Grid' }] }),
  component: MapPage,
})

function MapPage() {
  const glitches = Route.useLoaderData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const placed = glitches.filter((g) => g.location)
  const unplaced = glitches.filter((g) => !g.location)
  const selected = glitches.find((g) => g.glitchId === selectedId) ?? null

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div>
        <h1 className="title-gothic text-4xl sm:text-5xl">Map of Achrona</h1>
        <p className="text-fg-muted">
          {placed.length} open {placed.length === 1 ? 'glitch' : 'glitches'} marked on the map. Tap
          a marker to see what is happening there.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel flush className="overflow-hidden">
          <AchronaMap
            glitches={glitches}
            onSelectGlitch={(id) => setSelectedId((current) => (current === id ? null : id))}
            selectedId={selectedId}
            className="mx-auto max-w-[calc(100dvh-14rem)] rounded-none border-0"
          />
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel heading="Selected">
            {selected ? (
              <QuestCard glitch={selected} highlighted />
            ) : (
              <p className="flex items-center gap-2 text-fg-muted">
                <MousePointerClick aria-hidden className="size-5 shrink-0 text-gold" />
                No glitch selected. Tap a marker on the map.
              </p>
            )}
          </Panel>
          <Panel heading="Legend">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {GLITCH_TYPES.map((type) => {
                const { label, color, icon: Icon } = TYPE_META[type]
                return (
                  <li key={type} className="flex items-center gap-2 text-sm text-fg">
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-full border-2 bg-ground"
                      style={{ borderColor: color }}
                    >
                      <Icon aria-hidden className="size-3.5" style={{ color }} />
                    </span>
                    {label}
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 text-sm text-fg-muted">
              A pulsing marker is a glitch still leaking.
            </p>
          </Panel>
          {unplaced.length > 0 && (
            <Panel heading={`No location (${unplaced.length})`}>
              <p className="mb-3 flex items-start gap-2 text-sm text-fg-muted">
                <MapPinOff aria-hidden className="mt-0.5 size-4 shrink-0" />
                These were reported without a spot on the map.
              </p>
              <ol className="flex flex-col gap-3">
                {unplaced.slice(0, 4).map((g) => (
                  <li key={g.glitchId}>
                    <QuestCard glitch={g} />
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
