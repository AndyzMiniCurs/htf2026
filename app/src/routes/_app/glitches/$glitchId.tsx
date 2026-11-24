import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, Bot, GitMerge, Radar, ScrollText, Sparkles } from 'lucide-react'
import { AchronaMap } from '#/components/achrona/AchronaMap.tsx'
import { GlitchTypeBadge, StatusBadge } from '#/components/glitches/GlitchBadges.tsx'
import { LifecycleStrip } from '#/components/glitches/LifecycleStrip.tsx'
import { Badge } from '#/components/ui/Badge.tsx'
import { EmptyState } from '#/components/ui/EmptyState.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { RelativeTime } from '#/components/ui/RelativeTime.tsx'
import { useShortcuts } from '#/hooks/useShortcuts.ts'
import { getErrorCode } from '#/lib/errors.ts'
import { getGlitch, getGlitches } from '#/lib/glitches.functions.ts'
import { listGuardians } from '#/lib/guardians.functions.ts'
import {
  CommandPanel,
  MoveEcho,
  StageActions,
  UpdateForm,
  permissionsFor,
} from '#/components/glitches/GlitchActions.tsx'
import type { Echo, GlitchDetail, GlitchListItem } from '#/lib/glitch.ts'

export const Route = createFileRoute('/_app/glitches/$glitchId')({
  loader: async ({ params, context }) => {
    let glitch: GlitchDetail
    try {
      glitch = await getGlitch({ data: { glitchId: params.glitchId } })
    } catch (err) {
      if (getErrorCode(err) === 'NOT_FOUND' || getErrorCode(err) === 'VALIDATION') throw notFound()
      throw err
    }
    // The list in quest-log order gives j/k their neighbours; commanders also get the roster.
    const [all, guardians] = await Promise.all([
      getGlitches({ data: {} }),
      context.me.role === 'commander' ? listGuardians() : Promise.resolve([]),
    ])
    const index = all.findIndex((g) => g.glitchId === glitch.glitchId)
    return {
      glitch,
      guardians,
      openGlitches: all.filter((g) => g.status !== 'FIXED'),
      previousId: index > 0 ? all[index - 1].glitchId : null,
      nextId: index >= 0 && index < all.length - 1 ? all[index + 1].glitchId : null,
    }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.glitch.glitchId ?? 'Glitch'} · Guardians of the Grid` }],
  }),
  component: GlitchPage,
  notFoundComponent: GlitchNotFound,
})

function GlitchPage() {
  const { glitch, guardians, openGlitches, previousId, nextId } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  useShortcuts({
    j: () => nextId && void navigate({ to: '/glitches/$glitchId', params: { glitchId: nextId } }),
    k: () =>
      previousId && void navigate({ to: '/glitches/$glitchId', params: { glitchId: previousId } }),
  })
  const { me } = Route.useRouteContext()
  const permissions = permissionsFor(me, glitch)
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <BackToLog />
      <Header
        glitch={glitch}
        actions={<StageActions glitch={glitch} permissions={permissions} />}
      />
      {glitch.mergedInto && (
        <p className="flex items-center gap-2 rounded-lg border border-gold/50 bg-gold/10 px-4 py-3 text-fg">
          <GitMerge aria-hidden className="size-5 text-gold" />
          This glitch was merged into
          <Link
            to="/glitches/$glitchId"
            params={{ glitchId: glitch.mergedInto }}
            className="title-gothic text-lg text-gold-hi underline"
          >
            {glitch.mergedInto}
          </Link>
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-5">
          <Panel heading={`Echoes (${glitch.echoes.length})`}>
            <EchoTimeline
              echoes={glitch.echoes}
              movable={permissions.canCommand ? openGlitches : null}
              glitchId={glitch.glitchId}
            />
          </Panel>
          {permissions.canWork && !glitch.mergedInto && (
            <Panel heading="Report progress">
              <UpdateForm glitchId={glitch.glitchId} />
            </Panel>
          )}
        </div>
        <div className="flex flex-col gap-5">
          {permissions.canCommand && (
            <Panel heading="Command">
              <CommandPanel glitch={glitch} guardians={guardians} openGlitches={openGlitches} />
            </Panel>
          )}
          <Panel heading="Where">
            {glitch.location ? (
              <AchronaMap glitches={[glitch]} />
            ) : (
              <p className="text-fg-muted">No location was given for this glitch.</p>
            )}
          </Panel>
          <Panel heading="Runbook">
            <Runbook steps={glitch.runbook} />
          </Panel>
        </div>
      </div>
    </div>
  )
}

function BackToLog() {
  return (
    <Link
      to="/glitches"
      className="inline-flex w-fit items-center gap-2 rounded-lg text-fg-muted hover:text-fg"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Quest log
    </Link>
  )
}

function Header({ glitch, actions }: { glitch: GlitchDetail; actions: React.ReactNode }) {
  return (
    <Panel>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={glitch.status} />
            <GlitchTypeBadge type={glitch.type} />
            {glitch.source === 'prediction' && (
              <Badge color="var(--royal-hi)" icon={<Radar aria-hidden className="size-3.5" />}>
                Predicted from sensors
              </Badge>
            )}
          </div>
          <h1 className="title-gothic text-5xl sm:text-6xl">{glitch.glitchId}</h1>
          <p className="max-w-[60ch] font-serif text-lg text-fg">{glitch.description}</p>
          <p className="text-sm text-fg-muted">
            Opened <RelativeTime iso={glitch.timestamp} /> · {glitch.echoCount}{' '}
            {glitch.echoCount === 1 ? 'echo' : 'echoes'} ·{' '}
            {glitch.assignee ? (
              <>
                assigned to <span className="font-bold text-fg">{glitch.assignee.codename}</span>
              </>
            ) : (
              'not assigned yet'
            )}
          </p>
        </div>
        <div className="flex w-full flex-col gap-4 lg:w-[26rem]">
          <LifecycleStrip status={glitch.status} />
          <div className="flex justify-end">{actions}</div>
        </div>
      </div>
    </Panel>
  )
}

/** Echoes oldest first, like a chronicle of how the glitch unfolded. */
function EchoTimeline({
  echoes,
  movable,
  glitchId,
}: {
  echoes: Array<Echo>
  /** Open glitches an echo can be moved to; null when the viewer cannot move echoes. */
  movable: Array<GlitchListItem> | null
  glitchId: string
}) {
  if (echoes.length === 0) {
    return (
      <EmptyState icon={<ScrollText />} title="No echoes yet">
        Echoes reported about this glitch will appear here.
      </EmptyState>
    )
  }
  return (
    <ol className="relative flex flex-col gap-5 border-l border-line pl-6">
      {echoes.map((echo) => (
        <li key={echo.echoId} className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 -left-[1.95rem] size-3 rotate-45 rounded-[2px] border-2 border-gold bg-ground"
          />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-bold text-fg">{echo.reporter?.codename ?? 'Sensor network'}</span>
            {echo.reporter?.role === 'commander' && (
              <span className="label-caps text-[0.62rem] text-gold">commander</span>
            )}
            <RelativeTime iso={echo.timestamp} className="text-sm text-fg-faint" />
            {movable && (
              <MoveEcho echoId={echo.echoId} currentGlitchId={glitchId} openGlitches={movable} />
            )}
            {echo.groupedByAi && (
              <Badge
                color="var(--curse-hi)"
                icon={<Bot aria-hidden className="size-3.5" />}
                className="ml-auto"
              >
                Grouped by AI
              </Badge>
            )}
          </div>
          <p className="mt-1 max-w-[65ch] text-fg">{echo.description}</p>
          {echo.imageUrl && (
            <a href={echo.imageUrl} target="_blank" rel="noreferrer" className="mt-3 block w-fit">
              <img
                src={echo.imageUrl}
                alt={`Photo from ${echo.reporter?.codename ?? 'the sensor network'}`}
                loading="lazy"
                className="max-h-64 rounded-lg border border-line object-cover"
              />
            </a>
          )}
        </li>
      ))}
    </ol>
  )
}

function Runbook({ steps }: { steps: GlitchDetail['runbook'] }) {
  if (steps.length === 0) {
    return (
      <p className="flex items-start gap-2 text-fg-muted">
        <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
        The runbook is being written. Steps appear once the glitch type is known.
      </p>
    )
  }
  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span
            className={`title-gothic grid size-7 shrink-0 place-items-center rounded-full border text-base ${step.done ? 'border-verdant bg-verdant/15 text-verdant' : 'border-line-strong text-fg-muted'}`}
          >
            {i + 1}
          </span>
          <span className={step.done ? 'text-fg-faint line-through' : 'text-fg'}>{step.text}</span>
        </li>
      ))}
    </ol>
  )
}

function GlitchNotFound() {
  const { glitchId } = Route.useParams()
  return (
    <div className="mx-auto max-w-2xl">
      <BackToLog />
      <Panel className="mt-5">
        <EmptyState
          icon={<ScrollText />}
          title={`No glitch ${glitchId}`}
          action={
            <Link
              to="/glitches"
              className="label-caps inline-flex h-11 items-center rounded-full bg-royal px-5 text-on-accent"
            >
              Open the quest log
            </Link>
          }
        >
          This glitch does not exist in the chronicle. It may have been merged, or the link is
          wrong.
        </EmptyState>
      </Panel>
    </div>
  )
}
