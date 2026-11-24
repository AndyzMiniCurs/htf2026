import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Forecast } from '#/lib/forecast.ts'

const hour = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
/** Axis ticks: just the hour, so twelve of them fit a phone. */
const tickHour = new Intl.DateTimeFormat(undefined, { hour: 'numeric' })

const axis = {
  tick: { fill: 'var(--fg-faint)', fontSize: 12 },
  tickLine: false,
} as const

type Hours = Forecast['hours']

function rows(hours: Hours) {
  return hours.map((h) => ({
    ...h,
    label: hour.format(Date.parse(h.at)),
    tick: tickHour.format(Date.parse(h.at)),
    range: [h.glitches - h.low, h.high - h.glitches] as [number, number],
  }))
}

/** Lets every chart here be read as a table too. */
function TableToggle({ asTable, onToggle }: { asTable: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="min-h-11 text-sm text-fg-muted underline decoration-line-strong underline-offset-4 hover:text-fg"
    >
      {asTable ? 'Show chart' : 'Show as a table'}
    </button>
  )
}

/**
 * New glitches the model expects each hour, with its 80% range, against what the plain
 * weekday-and-hour average would have said. The peak hour is shaded.
 */
export function ArrivalsChart({ hours, peakAt }: { hours: Hours; peakAt: string }) {
  const [asTable, setAsTable] = useState(false)
  const data = rows(hours)
  const peak = hour.format(Date.parse(peakAt))
  const peakTick = tickHour.format(Date.parse(peakAt))
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-fg-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3 w-2.5 rounded-t-[3px] bg-royal-hi" />
          Model forecast (80% range)
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="w-4 border-t-2 border-dashed border-fg-faint" />
          Weekday-and-hour average
        </span>
      </div>
      {asTable ? (
        <table className="w-full text-left text-sm tabular">
          <thead className="text-fg-faint">
            <tr>
              <th className="py-1 font-normal">Hour</th>
              <th className="py-1 text-right font-normal">Model</th>
              <th className="py-1 text-right font-normal">80% range</th>
              <th className="py-1 text-right font-normal">Average</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.at} className="border-t border-line/60">
                <td className="py-1 text-fg-muted">{d.label}</td>
                <td className="py-1 text-right text-fg">{d.glitches.toFixed(1)}</td>
                <td className="py-1 text-right text-fg-muted">
                  {d.low.toFixed(1)}–{d.high.toFixed(1)}
                </td>
                <td className="py-1 text-right text-fg-muted">{d.baseline.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="h-64"
          role="img"
          aria-label={`Expected new glitches over the next ${hours.length} hours, peaking at ${peak}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
              <ReferenceArea x1={peakTick} x2={peakTick} fill="var(--curse)" fillOpacity={0.12} />
              <XAxis
                dataKey="tick"
                {...axis}
                axisLine={{ stroke: 'var(--line)' }}
                interval="preserveStartEnd"
                minTickGap={12}
              />
              <YAxis {...axis} axisLine={false} allowDecimals={false} width={40} />
              <Tooltip
                cursor={{ fill: 'var(--panel-hi)', fillOpacity: 0.6 }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const d = active ? payload.at(0)?.payload : null
                  if (!d) return null
                  return (
                    <div className="rounded-lg border border-line-strong bg-panel-hi px-3 py-2 text-sm shadow-(--shadow)">
                      <p className="text-fg-muted">{d.label}</p>
                      <p className="font-bold text-fg tabular">
                        {d.glitches.toFixed(1)} glitches expected
                      </p>
                      <p className="text-fg-muted tabular">
                        80% range {d.low.toFixed(1)}–{d.high.toFixed(1)} · average{' '}
                        {d.baseline.toFixed(1)}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="glitches"
                fill="var(--royal-hi)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive
                animationDuration={700}
              >
                <ErrorBar dataKey="range" width={6} stroke="var(--frost)" strokeOpacity={0.6} />
              </Bar>
              <Line
                dataKey="baseline"
                stroke="var(--fg-faint)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                type="monotone"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <TableToggle asTable={asTable} onToggle={() => setAsTable((v) => !v)} />
    </div>
  )
}

/** Magic at the usual fixing pace over the same hours, against the 20% lockdown line. */
export function MagicOutlook({ hours, magicNow }: { hours: Hours; magicNow: number }) {
  const [asTable, setAsTable] = useState(false)
  const data = [{ label: 'Now', tick: 'Now', magic: magicNow, at: '' }, ...rows(hours)]
  const lowest = Math.min(...data.map((d) => d.magic))
  return (
    <div>
      {asTable ? (
        <table className="w-full text-left text-sm tabular">
          <thead className="text-fg-faint">
            <tr>
              <th className="py-1 font-normal">Hour</th>
              <th className="py-1 text-right font-normal">Magic</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-line/60">
                <td className="py-1 text-fg-muted">{d.label}</td>
                <td className="py-1 text-right text-fg">{d.magic}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="h-44"
          role="img"
          aria-label={`Magic from ${magicNow}% now, lowest ${lowest}% over the next ${hours.length} hours`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
              <XAxis
                dataKey="tick"
                {...axis}
                axisLine={{ stroke: 'var(--line)' }}
                interval="preserveStartEnd"
                minTickGap={12}
              />
              <YAxis
                {...axis}
                axisLine={false}
                domain={[0, 100]}
                ticks={[0, 20, 50, 100]}
                width={40}
              />
              <ReferenceArea y1={0} y2={20} fill="var(--ember)" fillOpacity={0.1} />
              <ReferenceLine
                y={20}
                stroke="var(--ember)"
                strokeDasharray="4 4"
                label={{
                  value: 'Lockdown',
                  position: 'insideBottomLeft',
                  fill: 'var(--fg-muted)',
                  fontSize: 11,
                }}
              />
              <Tooltip
                cursor={{ stroke: 'var(--fg-faint)', strokeWidth: 1 }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const d = active ? payload.at(0)?.payload : null
                  if (!d) return null
                  return (
                    <div className="rounded-lg border border-line-strong bg-panel-hi px-3 py-2 text-sm shadow-(--shadow)">
                      <p className="text-fg-muted">{d.label}</p>
                      <p className="font-bold text-fg tabular">{d.magic}% magic</p>
                    </div>
                  )
                }}
              />
              <Line
                dataKey="magic"
                stroke="var(--curse-hi)"
                strokeWidth={2}
                type="monotone"
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: 'var(--panel)',
                  strokeWidth: 2,
                  fill: 'var(--curse-hi)',
                }}
                animationDuration={900}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <TableToggle asTable={asTable} onToggle={() => setAsTable((v) => !v)} />
    </div>
  )
}
