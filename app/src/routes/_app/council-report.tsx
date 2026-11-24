import { createFileRoute } from '@tanstack/react-router'
import { Printer, ShieldOff } from 'lucide-react'
import { STATUS_META, TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { Crest } from '#/components/layout/Crest.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { EmptyState } from '#/components/ui/EmptyState.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { GLITCH_STATUSES, GLITCH_TYPES } from '#/lib/glitch.ts'
import { getReport } from '#/lib/monitoring.functions.ts'
import type { ReactNode } from 'react'

export const Route = createFileRoute('/_app/council-report')({
  loader: ({ context }) => (context.me.role === 'commander' ? getReport() : null),
  head: () => ({ meta: [{ title: 'Report to the High Council · Guardians of the Grid' }] }),
  component: CouncilReportPage,
})

const longDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' })
const shortDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

function CouncilReportPage() {
  const report = Route.useLoaderData()
  if (!report) {
    return (
      <Panel className="mx-auto max-w-2xl">
        <EmptyState icon={<ShieldOff />} title="Commanders only">
          Only commanders report to the High Council of Achrona.
        </EmptyState>
      </Panel>
    )
  }
  const { dashboard, open, leaderboard } = report
  const top = [...leaderboard].sort((a, b) => b.fixes - a.fixes).slice(0, 5)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-fg-muted">
          A one-page account of the realm, ready to print or save as PDF.
        </p>
        <Button icon={<Printer aria-hidden className="size-4" />} onClick={() => window.print()}>
          Save as PDF
        </Button>
      </div>

      {/* The sheet: parchment on screen, plain paper in print. */}
      <article className="rounded-sm bg-[#f4ead2] px-5 py-8 font-serif text-[#24192e] shadow-[0_24px_60px_-24px_rgb(0_0_0/0.8)] sm:px-14 print:rounded-none print:bg-white print:p-0 print:shadow-none">
        <header className="flex items-center gap-5 border-b-2 border-[#24192e] pb-5">
          <Crest className="size-16 shrink-0 [print-color-adjust:exact]" />
          <div>
            <h1 className="font-gothic text-4xl font-extrabold text-[#2a1550] sm:text-5xl">
              Report to the High Council
            </h1>
            <p className="mt-1 text-[#5a4a5e]">
              Guardians of the Grid · Achrona · {longDate.format(new Date(report.generatedAt))}
            </p>
          </div>
        </header>

        <Section title="State of the realm">
          <p className="text-lg">
            Magic left in Achrona:{' '}
            <strong className="font-gothic text-2xl">{dashboard.magicLevel}%</strong>
            {dashboard.lockdown && (
              <strong className="ml-3 text-[#a3241a]">The city is in lockdown.</strong>
            )}
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <CountTable
              caption="Glitches by stage"
              rows={GLITCH_STATUSES.map((s) => [STATUS_META[s].label, dashboard.byStatus[s]])}
            />
            <CountTable
              caption="Glitches by kind"
              rows={GLITCH_TYPES.map((t) => [TYPE_META[t].label, dashboard.byType[t]])}
            />
          </div>
        </Section>

        <Section title={`Open glitches (${open.length})`}>
          {open.length === 0 ? (
            <p>No glitch is open. Every rift is sealed.</p>
          ) : (
            <div className="-mx-1 overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[34rem] text-left text-[0.95rem] print:min-w-0">
                <thead>
                  <tr className="border-b border-[#24192e]">
                    <th className="py-1.5 pr-3">Glitch</th>
                    <th className="py-1.5 pr-3">Echo</th>
                    <th className="py-1.5 pr-3">Kind</th>
                    <th className="py-1.5 pr-3">Stage</th>
                    <th className="py-1.5 pr-3">Guardian</th>
                    <th className="py-1.5">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {open.map((g) => (
                    <tr
                      key={g.glitchId}
                      className="border-b border-[#24192e]/25 align-top break-inside-avoid"
                    >
                      <td className="py-1.5 pr-3 font-bold whitespace-nowrap">{g.glitchId}</td>
                      <td className="py-1.5 pr-3">{g.description}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{TYPE_META[g.type].label}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {STATUS_META[g.status].label}
                      </td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {g.assignee?.codename ?? 'Unassigned'}
                      </td>
                      <td className="py-1.5 whitespace-nowrap">
                        {shortDate.format(new Date(g.timestamp))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Hall of Fame">
          <ol className="list-decimal pl-6">
            {top.map((entry) => (
              <li key={entry.guardian.guardianId} className="py-0.5">
                <strong>{entry.guardian.codename}</strong>, {entry.fixes}{' '}
                {entry.fixes === 1 ? 'rift' : 'rifts'} sealed
              </li>
            ))}
          </ol>
        </Section>

        <footer className="mt-10 border-t border-[#24192e]/40 pt-3 text-sm text-[#5a4a5e]">
          Compiled by mission control from live records. All names, glitches and readings are demo
          data.
        </footer>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid-page">
      <h2 className="mb-3 font-gothic text-2xl font-extrabold text-[#2a1550]">{title}</h2>
      {children}
    </section>
  )
}

function CountTable({ caption, rows }: { caption: string; rows: Array<[string, number]> }) {
  return (
    <table className="w-full text-left">
      <caption className="mb-1 text-left font-bold">{caption}</caption>
      <tbody>
        {rows.map(([label, count]) => (
          <tr key={label} className="border-b border-[#24192e]/25">
            <td className="py-1">{label}</td>
            <td className="py-1 text-right font-bold tabular-nums">{count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
