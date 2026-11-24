import { createFileRoute } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'
import { ArrivalsChart } from '#/components/forecast/ForecastCharts.tsx'
import { HowItWorks, OnWatch, Verdict } from '#/components/forecast/ForecastPanels.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { getForecast } from '#/lib/forecast.functions.ts'

export const Route = createFileRoute('/_app/forecast')({
  loader: () => getForecast(),
  head: () => ({ meta: [{ title: 'Foresight · Guardians of the Grid' }] }),
  component: ForesightPage,
})

/**
 * Foresight: what the next hours hold and who stands guard. The verdict first, one chart, the
 * defenders on watch; the model's evidence folds away at the bottom.
 */
function ForesightPage() {
  const forecast = Route.useLoaderData()
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="title-gothic text-4xl sm:text-5xl">Foresight</h1>
        <p className="text-fg-muted">What the next 12 hours hold, and who stands guard.</p>
      </div>

      <Verdict forecast={forecast} />

      <Panel heading="Next 12 hours">
        <ArrivalsChart hours={forecast.hours} peakAt={forecast.peak.at} />
      </Panel>

      <section aria-labelledby="on-watch" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="on-watch" className="title-gothic text-3xl">
            On watch
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-fg-muted">
            <GraduationCap aria-hidden className="size-4 text-gold" />
            Training quest: a quieter defender practises while it is calm
          </p>
        </div>
        <OnWatch forecast={forecast} />
      </section>

      <HowItWorks forecast={forecast} />
    </div>
  )
}
