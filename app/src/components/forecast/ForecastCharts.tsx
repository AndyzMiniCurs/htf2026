import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Forecast } from '#/lib/forecast.ts'

const hour = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
/** Axis ticks: just the hour, so twelve of them fit a phone. */
const tickHour = new Intl.DateTimeFormat(undefined, { hour: 'numeric' })

const axis = { tick: { fill: 'var(--fg-faint)', fontSize: 12 }, tickLine: false } as const

/**
 * New rifts the model expects in each of the next hours. The peak hour stands out in the curse's
 * violet; the likely range and the plain average are in the tooltip and the table.
 */
export function ArrivalsChart({ hours, peakAt }: { hours: Forecast['hours']; peakAt: string }) {
  const [asTable, setAsTable] = useState(false)
  const data = hours.map((h) => ({
    ...h,
    label: hour.format(Date.parse(h.at)),
    tick: tickHour.format(Date.parse(h.at)),
    peak: h.at === peakAt,
  }))
  return (
    <div>
      {asTable ? (
        <table className="w-full text-left text-sm tabular">
          <thead className="text-fg-faint">
            <tr>
              <th className="py-1 font-normal">Hour</th>
              <th className="py-1 text-right font-normal">Expected rifts</th>
              <th className="py-1 text-right font-normal">Likely range</th>
              <th className="py-1 text-right font-normal">Plain average</th>
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
          className="h-56"
          role="img"
          aria-label={`Expected new rifts per hour over the next ${hours.length} hours, peaking at ${hour.format(Date.parse(peakAt))}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -22 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
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
                        About {d.glitches.toFixed(1)} new rifts
                      </p>
                      <p className="text-fg-muted tabular">
                        Likely {d.low.toFixed(1)}–{d.high.toFixed(1)}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="glitches" radius={[4, 4, 0, 0]} maxBarSize={30} animationDuration={700}>
                {data.map((d) => (
                  <Cell key={d.at} fill={d.peak ? 'var(--curse-hi)' : 'var(--royal-hi)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <button
        type="button"
        onClick={() => setAsTable((v) => !v)}
        className="min-h-11 text-sm text-fg-muted underline decoration-line-strong underline-offset-4 hover:text-fg"
      >
        {asTable ? 'Show chart' : 'Show as a table'}
      </button>
    </div>
  )
}
