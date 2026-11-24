import { CloudLightning, FlaskConical, GraduationCap, Moon, Swords, Wind } from 'lucide-react'
import { TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { cx } from '#/components/ui/cx.ts'
import { GLITCH_TYPES } from '#/lib/glitch.ts'
import type { Forecast, PressureMode } from '#/lib/forecast.ts'

const hour = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const at = (iso: string) => hour.format(Date.parse(iso))

const MODE: Record<
  PressureMode,
  { title: string; rule: string; color: string; icon: typeof Wind }
> = {
  storm: {
    title: 'A storm is coming',
    rule: 'New rifts go to the strongest defender for their kind.',
    color: 'var(--ember)',
    icon: CloudLightning,
  },
  steady: {
    title: 'Steady watch',
    rule: 'New rifts go to the best fit with room to spare.',
    color: 'var(--amber)',
    icon: Wind,
  },
  calm: {
    title: 'A lull',
    rule: 'New rifts become training quests for the least practised free defender, so the experts rest for the next storm.',
    color: 'var(--verdant)',
    icon: Moon,
  },
}

/** The forecast in one sentence: what is coming and how the city staffs for it. */
export function Verdict({ forecast }: { forecast: Forecast }) {
  const mode = MODE[forecast.mode]
  const Icon = mode.icon
  return (
    <section
      aria-label="Forecast verdict"
      className="relative overflow-hidden rounded-xl border bg-panel p-5 shadow-(--shadow) sm:p-6"
      style={{
        borderColor: mode.color,
        backgroundImage: `radial-gradient(60rem 18rem at 0% 0%, color-mix(in oklab, ${mode.color} 16%, transparent), transparent 70%)`,
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl border-2 bg-field"
          style={{ borderColor: mode.color, color: mode.color }}
        >
          <Icon aria-hidden className="size-7" />
        </span>
        <div className="min-w-0">
          <p className="label-caps text-[0.68rem]" style={{ color: mode.color }}>
            Next 3 hours · {forecast.pressureRatio.toFixed(1)}× the usual pressure
          </p>
          <h2 className="title-gothic mt-1 text-3xl sm:text-4xl">{mode.title}</h2>
          <p className="mt-2 max-w-[70ch] text-fg">
            The model expects the most rifts around{' '}
            <strong className="tabular">{at(forecast.peak.at)}</strong> (
            <span className="tabular">{forecast.peak.glitches.toFixed(1)}</span> in that hour).{' '}
            {mode.rule}
          </p>
          {forecast.lockdownAt && (
            <p className="mt-2 font-medium text-ember">
              At the usual fixing pace, magic falls under 20% around {at(forecast.lockdownAt)}: the
              city would lock itself down.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

const REASON: Record<
  NonNullable<Forecast['nextAssignee'][keyof Forecast['nextAssignee']]>['reason'],
  { label: string; icon: typeof Wind }
> = {
  'best-for-storm': { label: 'Best for the storm', icon: Swords },
  'training-quest': { label: 'Training quest', icon: GraduationCap },
  'best-available': { label: 'Best available', icon: Wind },
}

/** Who the next glitch of each kind would go to right now, and why. */
export function NextAssignees({ forecast }: { forecast: Forecast }) {
  return (
    <ul className="flex flex-col gap-2">
      {GLITCH_TYPES.filter((t) => t !== 'unknown').map((type) => {
        const { label, color, icon: Icon } = TYPE_META[type]
        const pick = forecast.nextAssignee[type]
        const reason = pick ? REASON[pick.reason] : null
        const ReasonIcon = reason?.icon
        return (
          <li
            key={type}
            className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-ground-2/60 px-3 py-2"
          >
            <Icon aria-hidden className="size-5 shrink-0" style={{ color }} />
            <span className="min-w-0 flex-1 text-sm text-fg">{label}</span>
            {pick && reason && ReasonIcon ? (
              <span className="flex flex-col items-end">
                <span className="font-bold text-fg">{pick.codename}</span>
                <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                  <ReasonIcon aria-hidden className="size-3.5" />
                  {reason.label} · {Math.round(pick.skill * 100)}%
                </span>
              </span>
            ) : (
              <span className="text-sm text-fg-faint">No defender</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Each defender's skill per kind of glitch, learned from the fix record. Best per kind ringed. */
export function SkillMatrix({ forecast }: { forecast: Forecast }) {
  const types = GLITCH_TYPES.filter((t) => t !== 'unknown')
  const best = Object.fromEntries(
    types.map((t) => [t, Math.max(...forecast.defenders.map((d) => d.skills[t].skill))]),
  ) as Record<(typeof types)[number], number>
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="text-left font-normal text-fg-faint">
              <span className="sr-only">Defender</span>
            </th>
            {types.map((t) => {
              const { label, color, icon: Icon } = TYPE_META[t]
              return (
                <th key={t} scope="col" className="px-1 pb-1 font-normal text-fg-muted">
                  <span className="flex flex-col items-center gap-1 text-xs">
                    <Icon aria-hidden className="size-4" style={{ color }} />
                    {label}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {forecast.defenders.map((d) => (
            <tr key={d.guardianId}>
              <th scope="row" className="pr-2 text-left font-bold whitespace-nowrap text-fg">
                {d.codename}
                <span className="block text-xs font-normal text-fg-faint">{d.openCount} open</span>
              </th>
              {types.map((t) => {
                const s = d.skills[t]
                const top = s.skill === best[t] && s.fixes > 0
                return (
                  <td
                    key={t}
                    title={`${d.codename}, ${TYPE_META[t].label}: ${s.fixes} fixes, median ${s.medianMinutes} min`}
                    className={cx(
                      'rounded-md px-2 py-1.5 text-center tabular',
                      top && 'outline-2 outline-gold',
                    )}
                    style={{
                      background: `color-mix(in oklab, var(--royal-hi) ${Math.round(s.skill * 70)}%, var(--field))`,
                    }}
                  >
                    <span className="block font-bold text-fg">{Math.round(s.skill * 100)}%</span>
                    <span className="block text-[0.7rem] text-fg-muted">
                      {s.fixes ? `${s.fixes} · ${s.medianMinutes}m` : 'new'}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
/** Monday first; the heatmap rows come Sunday first. */
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0]

/** When the Desync strikes: average incidents per weekday and hour. Now is ringed in gold. */
export function Heatmap({ grid }: { grid: Array<Array<number>> }) {
  const max = Math.max(0.01, ...grid.flat())
  const now = new Date()
  return (
    <div>
      <div className="grid grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-[2px]">
        {DAY_INDEX.map((day, row) => (
          <div key={day} className="contents">
            <span className="self-center text-xs text-fg-muted">{DAYS[row]}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const v = grid[day]?.[h] ?? 0
              const current = now.getDay() === day && now.getHours() === h
              return (
                <span
                  key={h}
                  title={`${DAYS[row]} ${String(h).padStart(2, '0')}:00 · ${v.toFixed(1)} per hour`}
                  className={cx(
                    'aspect-square rounded-[3px]',
                    current && 'outline-2 outline-offset-1 outline-gold',
                  )}
                  style={{
                    background: `color-mix(in oklab, var(--curse-hi) ${Math.round((v / max) * 100)}%, var(--field))`,
                  }}
                />
              )
            })}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center text-[0.6rem] text-fg-faint tabular">
            {h % 3 === 0 ? h : ''}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-fg-muted">
        Quiet
        <span
          aria-hidden
          className="h-2 w-24 rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--field), var(--curse-hi))' }}
        />
        {max.toFixed(1)} per hour
      </div>
    </div>
  )
}

/** What the forecast stands on, and how much better it does than the plain average. */
export function ModelCard({ model }: { model: Forecast['model'] }) {
  const better = model.baselineError > 0 ? 1 - model.modelError / model.baselineError : 0
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div className="col-span-2">
        <dt className="label-caps text-[0.65rem] text-fg-faint">Model</dt>
        <dd className="text-fg">{model.kind}</dd>
      </div>
      <div>
        <dt className="label-caps text-[0.65rem] text-fg-faint">Trained on</dt>
        <dd className="text-fg tabular">
          {Math.round(model.trainedHours / 24)} days · {model.incidents.toLocaleString()} incidents
        </dd>
      </div>
      <div>
        <dt className="label-caps text-[0.65rem] text-fg-faint">Tested on</dt>
        <dd className="text-fg">the last week, unseen</dd>
      </div>
      <div className="col-span-2">
        <dt className="label-caps text-[0.65rem] text-fg-faint">
          Error per hour (lower is better)
        </dt>
        <dd className="mt-1 flex flex-col gap-1.5">
          <ErrorBar label="Model" value={model.modelError} max={model.baselineError} accent />
          <ErrorBar label="Average" value={model.baselineError} max={model.baselineError} />
          <span className="text-fg-muted">
            {better > 0
              ? `${Math.round(better * 100)}% closer than the weekday-and-hour average.`
              : 'No better than the weekday-and-hour average yet.'}
          </span>
        </dd>
      </div>
      {model.synthetic && (
        <p className="col-span-2 flex gap-2 rounded-lg border border-amber/50 bg-[color-mix(in_oklab,var(--amber)_10%,var(--panel))] px-3 py-2 text-fg-muted">
          <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
          Trained on synthetic history generated for this demo, with deliberate daily and weekly
          rhythms, storm days and defender strengths.
        </p>
      )}
    </dl>
  )
}

function ErrorBar({
  label,
  value,
  max,
  accent = false,
}: {
  label: string
  value: number
  max: number
  accent?: boolean
}) {
  return (
    <span className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
      <span className="text-fg-muted">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-field">
        <span
          className={cx(
            'bar-grow block h-full rounded-full',
            accent ? 'bg-royal-hi' : 'bg-fg-faint',
          )}
          style={{ width: `${Math.min(100, (value / Math.max(max, 0.01)) * 100)}%` }}
        />
      </span>
      <span className="text-right font-bold text-fg tabular">{value.toFixed(2)}</span>
    </span>
  )
}
