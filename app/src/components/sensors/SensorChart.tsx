import { TriangleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Panel } from '#/components/ui/Panel.tsx'
import { CountUp } from '#/components/ui/CountUp.tsx'
import { steepestDrop } from './drop.ts'
import type { SensorId, SensorSeries } from '#/lib/monitoring.ts'

/** One hue per sensor, validated together on the night panel (dataviz validator, dark mode). */
export const SENSOR_COLOR: Record<SensorId, string> = {
  'magic-reserve': '#c75cf2',
  'ley-flux': '#b8873a',
  'portal-stability': '#2aa89c',
}

const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const timeWithSeconds = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** A sensor's last minutes as a single-series line; the title names it, so no legend. */
export function SensorChart({ series }: { series: SensorSeries }) {
  const gradient = useId()
  const [asTable, setAsTable] = useState(false)
  const color = SENSOR_COLOR[series.sensorId]
  const points = series.points.map((p) => ({ t: Date.parse(p.timestamp), value: p.value }))
  const latest = series.points.at(-1)
  const drop = steepestDrop(series.points)

  return (
    <Panel
      heading={series.label}
      actions={
        <span className="flex items-baseline gap-1.5">
          <span className="title-gothic text-3xl tabular">
            {latest ? <CountUp value={latest.value} decimals={1} /> : '–'}
          </span>
          <span className="text-sm text-fg-muted">{series.unit}</span>
        </span>
      }
    >
      {drop && (
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-fg">
          <TriangleAlert aria-hidden className="size-4 shrink-0 text-ember" />
          Fell {drop.percent}% in {drop.minutes} {drop.minutes === 1 ? 'minute' : 'minutes'}
        </p>
      )}
      {asTable ? (
        <table className="w-full text-left text-sm tabular">
          <thead>
            <tr className="text-fg-muted">
              <th className="py-1 font-medium">Time</th>
              <th className="py-1 text-right font-medium">{series.unit}</th>
            </tr>
          </thead>
          <tbody>
            {series.points
              .slice(-10)
              .reverse()
              .map((p) => (
                <tr key={p.timestamp} className="border-t border-line/60">
                  <td className="py-1 text-fg-muted">
                    {timeWithSeconds.format(new Date(p.timestamp))}
                  </td>
                  <td className="py-1 text-right text-fg">{p.value.toFixed(1)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <div
          className="h-48"
          role="img"
          aria-label={`${series.label}, last ${points.length} readings, now ${latest?.value ?? 'unknown'} ${series.unit}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={color} stopOpacity={0.28} />
                  <stop offset="1" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t: number) => time.format(t)}
                tick={{ fill: 'var(--fg-faint)', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--line)' }}
                minTickGap={40}
              />
              <YAxis
                tick={{ fill: 'var(--fg-faint)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={['auto', 'auto']}
              />
              {drop && (
                <ReferenceArea
                  x1={Date.parse(drop.from)}
                  x2={Date.parse(drop.to)}
                  fill="var(--ember)"
                  fillOpacity={0.12}
                  stroke="var(--ember)"
                  strokeOpacity={0.5}
                  strokeDasharray="3 3"
                />
              )}
              <Tooltip
                cursor={{ stroke: 'var(--fg-faint)', strokeWidth: 1 }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const point = active ? payload.at(0)?.payload : null
                  if (!point) return null
                  return (
                    <div className="rounded-lg border border-line-strong bg-panel-hi px-3 py-2 text-sm shadow-(--shadow)">
                      <p className="text-fg-muted">{timeWithSeconds.format(point.t)}</p>
                      <p className="font-bold text-fg tabular">
                        {point.value.toFixed(1)} {series.unit}
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradient})`}
                dot={false}
                activeDot={{ r: 5, stroke: 'var(--panel)', strokeWidth: 2, fill: color }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <button
        type="button"
        onClick={() => setAsTable((v) => !v)}
        className="mt-1 min-h-11 text-sm text-fg-muted underline decoration-line-strong underline-offset-4 hover:text-fg"
      >
        {asTable ? 'Show chart' : 'Show latest readings as a table'}
      </button>
    </Panel>
  )
}
