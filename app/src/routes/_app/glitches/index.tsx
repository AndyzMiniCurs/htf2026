import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Radar, Search, SearchX, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GlitchTypeBadge, StatusBadge } from '#/components/glitches/GlitchBadges.tsx'
import { QuestCard } from '#/components/glitches/QuestLog.tsx'
import { STATUS_META, TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { HornIcon } from '#/components/icons/RealmIcons.tsx'
import { EmptyState } from '#/components/ui/EmptyState.tsx'
import { Input, Select } from '#/components/ui/Field.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { RelativeTime } from '#/components/ui/RelativeTime.tsx'
import { cx } from '#/components/ui/cx.ts'
import { GLITCH_SORTS, GLITCH_STATUSES, GLITCH_TYPES, glitchQuerySchema } from '#/lib/glitch.ts'
import { getGlitches } from '#/lib/glitches.functions.ts'
import { useShortcuts } from '#/hooks/useShortcuts.ts'
import type { GlitchListItem, GlitchQuery, GlitchStatus, GlitchType } from '#/lib/glitch.ts'

export const Route = createFileRoute('/_app/glitches/')({
  // The search state lives in the URL, so a copied link reopens the same view.
  validateSearch: glitchQuerySchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getGlitches({ data: deps }),
  head: () => ({ meta: [{ title: 'Quest log · Guardians of the Grid' }] }),
  component: QuestLogPage,
})

const SORT_LABEL: Record<(typeof GLITCH_SORTS)[number], string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  status: 'By lifecycle stage',
}

function QuestLogPage() {
  const glitches = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(-1)
  const move = (step: number) => {
    const next = Math.min(glitches.length - 1, Math.max(0, selected + step))
    setSelected(next)
    // Cards (phone) and table rows (desktop) both carry the index; only one set is visible.
    const rows = document.querySelectorAll<HTMLElement>(`[data-glitch-row="${next}"]`)
    Array.from(rows)
      .find((row) => row.offsetParent !== null)
      ?.scrollIntoView({ block: 'nearest' })
  }
  useShortcuts({
    j: () => move(1),
    k: () => move(-1),
    Enter: () => {
      const glitch = glitches[selected] as GlitchListItem | undefined
      if (glitch)
        void navigate({ to: '/glitches/$glitchId', params: { glitchId: glitch.glitchId } })
    },
  })
  const selectedId = glitches[selected]?.glitchId ?? null
  const filtered = Boolean(
    search.q || search.status?.length || search.type?.length || search.from || search.to,
  )
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="title-gothic text-4xl sm:text-5xl">Quest log</h1>
          <p className="text-fg-muted">
            Every glitch reported in Achrona: {glitches.length} shown.
          </p>
        </div>
        <Link
          to="/echoes/new"
          className="label-caps inline-flex h-11 items-center gap-2 rounded-full border-b-[3px] border-b-royal-deep bg-royal px-5 text-on-accent hover:bg-royal-hi"
        >
          <HornIcon className="size-5" />
          Report an echo
        </Link>
      </div>

      <Filters search={search} />

      {glitches.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<SearchX />}
            title={filtered ? 'No glitch matches' : 'The grid holds'}
            action={
              filtered && (
                <Link
                  to="/glitches"
                  search={{}}
                  className="label-caps inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-fg hover:border-gold"
                >
                  Clear filters
                </Link>
              )
            }
          >
            {filtered
              ? 'Try fewer filters or another word.'
              : 'No glitches have been reported. New echoes appear here the moment they arrive.'}
          </EmptyState>
        </Panel>
      ) : (
        <>
          <ol className="flex flex-col gap-3 lg:hidden">
            {glitches.map((g, i) => (
              <li key={g.glitchId} data-glitch-row={i}>
                <QuestCard glitch={g} highlighted={g.glitchId === selectedId} />
              </li>
            ))}
          </ol>
          <Panel flush className="hidden overflow-hidden lg:block">
            <GlitchTable glitches={glitches} selectedId={selectedId} />
          </Panel>
        </>
      )}
    </div>
  )
}

/** Search, filters and sort; every change rewrites the URL, which reloads the list. */
function Filters({ search }: { search: GlitchQuery }) {
  const navigate = useNavigate({ from: '/glitches/' })
  const [text, setText] = useState(search.q ?? '')
  const [more, setMore] = useState(false)
  const activeCount =
    (search.status?.length ?? 0) +
    (search.type?.length ?? 0) +
    (search.from ? 1 : 0) +
    (search.to ? 1 : 0) +
    (search.sort && search.sort !== 'newest' ? 1 : 0)

  const update = (patch: Partial<GlitchQuery>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  // Typing updates the URL after a short pause instead of on every key.
  useEffect(() => {
    if (text === (search.q ?? '')) return
    const timer = window.setTimeout(() => update({ q: text || undefined }), 250)
    return () => window.clearTimeout(timer)
  }, [text])

  return (
    <Panel>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-end">
        <div className="relative">
          <Input
            label="Search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Glitch id or words from the echo"
            className="pl-10"
          />
          <Search
            aria-hidden
            className="pointer-events-none absolute bottom-3.5 left-3.5 size-4 text-fg-faint"
          />
        </div>
        {/* Phones show only the search until the guardian asks for the rest. */}
        <button
          type="button"
          aria-expanded={more}
          aria-controls="glitch-filters"
          onClick={() => setMore((v) => !v)}
          className="label-caps flex h-11 items-center justify-center gap-2 rounded-lg border border-line text-fg-muted hover:border-line-strong hover:text-fg lg:hidden"
        >
          <SlidersHorizontal aria-hidden className="size-4" />
          {more ? 'Hide filters' : activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
        </button>
        <div id="glitch-filters" className={cx(more ? 'contents' : 'hidden', 'lg:contents')}>
          <Input
            label="From"
            type="date"
            value={search.from ?? ''}
            onChange={(e) => update({ from: e.target.value || undefined })}
          />
          <Input
            label="To"
            type="date"
            value={search.to ?? ''}
            onChange={(e) => update({ to: e.target.value || undefined })}
          />
          <Select
            label="Sort"
            value={search.sort ?? 'newest'}
            onChange={(e) => update({ sort: e.target.value as GlitchQuery['sort'] })}
          >
            {GLITCH_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABEL[sort]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div
        className={cx(more ? 'flex' : 'hidden', 'mt-4 flex-col gap-3 lg:flex lg:flex-row lg:gap-8')}
      >
        <ChipGroup
          label="Stage"
          options={GLITCH_STATUSES}
          selected={search.status ?? []}
          meta={(s: GlitchStatus) => STATUS_META[s]}
          onChange={(status) => update({ status: status.length ? status : undefined })}
        />
        <ChipGroup
          label="Type"
          options={GLITCH_TYPES}
          selected={search.type ?? []}
          meta={(t: GlitchType) => TYPE_META[t]}
          onChange={(type) => update({ type: type.length ? type : undefined })}
        />
      </div>
    </Panel>
  )
}

function ChipGroup<TValue extends string>({
  label,
  options,
  selected,
  meta,
  onChange,
}: {
  label: string
  options: ReadonlyArray<TValue>
  selected: Array<TValue>
  meta: (value: TValue) => {
    label: string
    color: string
    icon: React.ComponentType<{ className?: string }>
  }
  onChange: (next: Array<TValue>) => void
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="label-caps mb-2 w-full text-fg-muted lg:mr-1 lg:mb-0 lg:w-auto lg:float-left">
        {label}
      </legend>
      {options.map((value) => {
        const { label: text, color, icon: Icon } = meta(value)
        const on = selected.includes(value)
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(on ? selected.filter((v) => v !== value) : [...selected, value])
            }
            style={
              on
                ? {
                    borderColor: color,
                    color,
                    background: `color-mix(in oklab, ${color} 16%, transparent)`,
                  }
                : undefined
            }
            className={cx(
              'inline-flex h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors lg:h-9',
              on ? 'font-bold' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            <Icon aria-hidden className="size-4" />
            {text}
          </button>
        )
      })}
    </fieldset>
  )
}

function GlitchTable({
  glitches,
  selectedId,
}: {
  glitches: Array<GlitchListItem>
  selectedId: string | null
}) {
  const navigate = useNavigate()
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-line-strong text-fg-muted">
          {['Glitch', 'Echo', 'Type', 'Stage', 'Guardian', 'Echoes', 'Opened'].map((col) => (
            <th key={col} scope="col" className="label-caps px-5 py-3.5 text-[0.7rem] font-bold">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {glitches.map((g, i) => (
          <tr
            key={g.glitchId}
            data-glitch-row={i}
            aria-selected={g.glitchId === selectedId}
            // The id link handles keyboard users; the whole row is a larger mouse target.
            onClick={() =>
              navigate({ to: '/glitches/$glitchId', params: { glitchId: g.glitchId } })
            }
            className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-panel-hi aria-selected:bg-panel-hi aria-selected:shadow-[inset_3px_0_0_var(--gold)]"
          >
            <td className="px-5 py-3.5 whitespace-nowrap">
              <Link
                to="/glitches/$glitchId"
                params={{ glitchId: g.glitchId }}
                className="title-gothic text-xl hover:text-gold-hi"
              >
                {g.glitchId}
              </Link>
            </td>
            <td className="max-w-[28rem] px-5 py-3.5">
              <span className="line-clamp-2">{g.description}</span>
              {g.source === 'prediction' && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-royal-hi">
                  <Radar aria-hidden className="size-3.5" />
                  Predicted from sensors
                </span>
              )}
            </td>
            <td className="px-5 py-3.5">
              <GlitchTypeBadge type={g.type} />
            </td>
            <td className="px-5 py-3.5">
              <StatusBadge status={g.status} />
            </td>
            <td className="px-5 py-3.5 whitespace-nowrap text-fg-muted">
              {g.assignee?.codename ?? 'Unassigned'}
            </td>
            <td className="px-5 py-3.5 tabular text-fg-muted">{g.echoCount}</td>
            <td className="px-5 py-3.5 whitespace-nowrap text-fg-muted">
              <RelativeTime iso={g.timestamp} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
