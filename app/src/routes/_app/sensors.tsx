import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { SensorChart } from '#/components/sensors/SensorChart.tsx'
import { getSensorSeries } from '#/lib/monitoring.functions.ts'

const REFRESH_MS = 3000

export const Route = createFileRoute('/_app/sensors')({
  loader: () => getSensorSeries({ data: { minutes: 15 } }),
  head: () => ({ meta: [{ title: 'Sensors · Guardians of the Grid' }] }),
  component: SensorsPage,
})

function SensorsPage() {
  const series = Route.useLoaderData()
  const router = useRouter()

  // shortcut: polls every 3 s; switch to the sensor.reading live events once useLiveEvents (5.5) lands.
  useEffect(() => {
    const timer = window.setInterval(() => {
      void router.invalidate({ filter: (match) => match.routeId === Route.id })
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [router])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div>
        <h1 className="title-gothic text-4xl sm:text-5xl">Sensors</h1>
        <p className="text-fg-muted">
          The ley network's readings over the last 15 minutes. A shaded band marks a fall of 40% or
          more within five minutes.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {series.map((s) => (
          <SensorChart key={s.sensorId} series={s} />
        ))}
      </div>
    </div>
  )
}
