import { createFileRoute } from '@tanstack/react-router'
import { ArrivalsChart, MagicOutlook } from '#/components/forecast/ForecastCharts.tsx'
import {
  Heatmap,
  ModelCard,
  NextAssignees,
  SkillMatrix,
  Verdict,
} from '#/components/forecast/ForecastPanels.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { getForecast } from '#/lib/forecast.functions.ts'

export const Route = createFileRoute('/_app/forecast')({
  loader: () => getForecast(),
  head: () => ({ meta: [{ title: 'Foresight · Guardians of the Grid' }] }),
  component: ForesightPage,
})

/**
 * Foresight: a model trained on past incidents forecasts the next hours, and the forecast decides
 * how new glitches are staffed (experts in a storm, training quests in a lull).
 */
function ForesightPage() {
  const forecast = Route.useLoaderData()
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div>
        <h1 className="title-gothic text-4xl sm:text-5xl">Foresight</h1>
        <p className="max-w-[70ch] text-fg-muted">
          A model trained on past incidents forecasts the next 12 hours of rifts, and the forecast
          decides who takes each new one.
        </p>
      </div>

      <Verdict forecast={forecast} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel heading="Next 12 hours">
            <ArrivalsChart hours={forecast.hours} peakAt={forecast.peak.at} />
          </Panel>
          <Panel heading="Magic at the usual fixing pace">
            <MagicOutlook hours={forecast.hours} magicNow={forecast.magicNow} />
          </Panel>
        </div>
        <div className="flex flex-col gap-5">
          <Panel heading="Next rift goes to">
            <NextAssignees forecast={forecast} />
          </Panel>
          <Panel heading="The model">
            <ModelCard model={forecast.model} />
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel heading="Defender skills">
          <SkillMatrix forecast={forecast} />
          <p className="mt-3 text-sm text-fg-muted">
            Speed against everyone else at that kind of glitch, trusted more with more fixes. The
            best per kind is ringed in gold.
          </p>
        </Panel>
        <Panel heading="When the Desync strikes">
          <Heatmap grid={forecast.heatmap} />
        </Panel>
      </div>
    </div>
  )
}
