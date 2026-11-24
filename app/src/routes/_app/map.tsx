import { createFileRoute } from '@tanstack/react-router'
import { MapPinOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { districtOnChart } from '#/components/achrona/AchronaMap.tsx'
import { WarTable } from '#/components/achrona/WarTable.tsx'
import { DISTRICTS, placeGlitch } from '#/components/achrona/world.ts'
import { QuestCard } from '#/components/glitches/QuestLog.tsx'
import { STATUS_META, TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { Panel } from '#/components/ui/Panel.tsx'
import { cx } from '#/components/ui/cx.ts'
import { GLITCH_TYPES } from '#/lib/glitch.ts'
import { getGlitches } from '#/lib/glitches.functions.ts'
import type { MapFocus } from '#/components/achrona/WarTable.tsx'
import type { GlitchStatus } from '#/lib/glitch.ts'

export const Route = createFileRoute('/_app/map')({
  loader: () => getGlitches({ data: { status: ['LEAKED', 'ASSESSING', 'CONTAINING'] } }),
  head: () => ({ meta: [{ title: 'Map of Achrona · Guardians of the Grid' }] }),
  component: MapPage,
})

const OPEN_STAGES = ['LEAKED', 'ASSESSING', 'CONTAINING'] as const satisfies Array<GlitchStatus>
type OpenStage = (typeof OPEN_STAGES)[number]

function MapPage() {
  const glitches = Route.useLoaderData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [shown, setShown] = useState<ReadonlySet<OpenStage>>(new Set(OPEN_STAGES))

  const placed = glitches.filter((g) => g.location)
  const unplaced = glitches.filter((g) => !g.location)
  const visible = placed.filter((g) => shown.has(g.status as OpenStage))
  const byDistrict = useMemo(() => {
    const map = new Map<string, Array<(typeof placed)[number]>>()
    for (const g of visible) {
      const id = placeGlitch(g).district.id
      map.set(id, [...(map.get(id) ?? []), g])
    }
    return map
  }, [visible])
  const rifts = useMemo(
    () => new Map([...byDistrict].map(([id, list]) => [id, list.length])),
    [byDistrict],
  )

  function toggle(stage: OpenStage) {
    setShown((current) => {
      const next = new Set(current)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="title-gothic text-4xl sm:text-5xl">Map of Achrona</h1>
          <p className="text-fg-muted">
            The war table, live. Tap a rift to fly to it; pinch or scroll to zoom.
          </p>
        </div>
        <div role="group" aria-label="Show stages" className="flex flex-wrap gap-2">
          {OPEN_STAGES.map((stage) => {
            const { label, color, icon: Icon } = STATUS_META[stage]
            const count = placed.filter((g) => g.status === stage).length
            const on = shown.has(stage)
            return (
              <button
                key={stage}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(stage)}
                className={cx(
                  'label-caps inline-flex h-11 items-center gap-2 rounded-full border px-3.5 text-[0.7rem] transition-[color,border-color,background-color,opacity,transform] duration-200 active:scale-95',
                  on ? 'bg-panel-hi text-fg' : 'border-line text-fg-faint opacity-70',
                )}
                style={on ? { borderColor: color } : undefined}
              >
                <Icon aria-hidden className="size-4" style={{ color: on ? color : undefined }} />
                {label}
                <span className="title-gothic text-base normal-case tabular">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Panel flush>
          <WarTable
            glitches={visible}
            rifts={rifts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            focus={focus}
          />
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel heading="Districts" flush>
            <ul className="divide-y divide-line/70">
              {DISTRICTS.map((district) => {
                const list = byDistrict.get(district.id) ?? []
                const point = districtOnChart(district)
                return (
                  <li key={district.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(null)
                        setFocus({ x: point.x, y: point.y, zoom: 2.4 })
                      }}
                      className="group flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-panel-hi"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="title-gothic block truncate text-lg">{district.name}</span>
                        <StageBar list={list} />
                      </span>
                      <span
                        className={cx(
                          'label-caps text-[0.66rem]',
                          list.length > 0 ? 'text-curse-hi' : 'text-verdant',
                        )}
                      >
                        {list.length > 0
                          ? `${list.length} ${list.length === 1 ? 'rift' : 'rifts'}`
                          : 'Calm'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel heading="Legend">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {GLITCH_TYPES.map((type) => {
                const { label, color, icon: Icon } = TYPE_META[type]
                return (
                  <li key={type} className="flex items-center gap-2 text-sm text-fg">
                    <Icon aria-hidden className="size-4 shrink-0" style={{ color }} />
                    {label}
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 text-sm text-fg-muted">
              The sigil is the kind of glitch; the crystal's colour is its stage. Leaking rifts send
              out ripples, and the violet haze is the Desync spreading from them.
            </p>
          </Panel>

          {unplaced.length > 0 && (
            <Panel heading={`No location (${unplaced.length})`}>
              <p className="mb-3 flex items-start gap-2 text-sm text-fg-muted">
                <MapPinOff aria-hidden className="mt-0.5 size-4 shrink-0" />
                Reported without a spot on the map.
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

/** A district's open rifts as one bar split by stage, so its state reads at a glance. */
function StageBar({ list }: { list: Array<{ status: GlitchStatus }> }) {
  if (list.length === 0) return <span className="mt-1 block h-1 rounded-full bg-verdant/25" />
  return (
    <span className="mt-1 flex h-1 gap-0.5 overflow-hidden rounded-full">
      {OPEN_STAGES.map((stage) => {
        const n = list.filter((g) => g.status === stage).length
        return n === 0 ? null : (
          <span
            key={stage}
            className="h-full"
            style={{ flexGrow: n, background: STATUS_META[stage].color }}
          />
        )
      })}
    </span>
  )
}
