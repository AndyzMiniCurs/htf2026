import {
  ChevronDown,
  CloudLightning,
  FlaskConical,
  GraduationCap,
  Moon,
  Swords,
  Wind,
} from 'lucide-react'
import { TYPE_META } from '#/components/glitches/glitch-meta.ts'
import { cx } from '#/components/ui/cx.ts'
import { GLITCH_TYPES } from '#/lib/glitch.ts'
import type { Forecast, PressureMode } from '#/lib/forecast.ts'
import type { GlitchType } from '#/lib/glitch.ts'

const hour = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const at = (iso: string) => hour.format(Date.parse(iso))
const KINDS = GLITCH_TYPES.filter((t) => t !== 'unknown')

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
    title: 'A quiet stretch',
    rule: 'New rifts become training quests, so the experts rest for the next storm.',
    color: 'var(--verdant)',
    icon: Moon,
  },
}

/** Everything that matters in one card: what is coming, when, and how the city staffs for it. */
export function Verdict({ forecast }: { forecast: Forecast }) {
  const mode = MODE[forecast.mode]
  const Icon = mode.icon
  const total = Math.round(forecast.hours.reduce((sum, h) => sum + h.glitches, 0))
  const lowest = Math.min(forecast.magicNow, ...forecast.hours.map((h) => h.magic))
  return (
    <section
      aria-label="Forecast verdict"
      className="relative overflow-hidden rounded-xl border bg-panel p-5 shadow-(--shadow) sm:p-7"
      style={{
        borderColor: mode.color,
        backgroundImage: `radial-gradient(60rem 18rem at 0% 0%, color-mix(in oklab, ${mode.color} 16%, transparent), transparent 70%)`,
      }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span
          className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 bg-field"
          style={{ borderColor: mode.color, color: mode.color }}
        >
          <Icon aria-hidden className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="title-gothic text-4xl sm:text-5xl">{mode.title}</h2>
          <p className="mt-3 max-w-[60ch] text-lg text-fg">
            About <strong className="tabular">{total}</strong> new {total === 1 ? 'rift' : 'rifts'}{' '}
            in the next 12 hours, most of them around{' '}
            <strong className="tabular">{at(forecast.peak.at)}</strong>.
          </p>
          <p className="mt-1 max-w-[60ch] text-fg-muted">{mode.rule}</p>
          <p
            className={cx(
              'mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
              forecast.lockdownAt ? 'border-ember text-ember' : 'border-line-strong text-fg-muted',
            )}
          >
            {forecast.lockdownAt
              ? `Magic falls under 20% around ${at(forecast.lockdownAt)}: lockdown`
              : `Magic stays above ${lowest}% at the usual fixing pace`}
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * The defenders on watch: what each is best at, and which kinds of new rift would go to them
 * right now (as a training quest in a lull, as the expert in a storm).
 */
export function OnWatch({ forecast }: { forecast: Forecast }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {forecast.defenders.map((d) => {
        const strengths = [...KINDS]
          .filter((t) => d.skills[t].fixes > 0)
          .sort((a, b) => d.skills[b].skill - d.skills[a].skill)
          .slice(0, 2)
        const next = KINDS.filter((t) => forecast.nextAssignee[t]?.guardianId === d.guardianId)
        return (
          <li
            key={d.guardianId}
            className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5 shadow-(--shadow)"
          >
            <div className="flex items-center gap-3">
              <span className="title-gothic grid size-12 place-items-center rounded-xl border-2 border-royal-hi bg-[linear-gradient(160deg,var(--royal),var(--royal-deep))] text-2xl">
                {d.codename.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-fg">{d.codename}</span>
                <span className="text-sm text-fg-faint">
                  {d.openCount} open {d.openCount === 1 ? 'quest' : 'quests'}
                </span>
              </span>
            </div>

            <div>
              <p className="label-caps mb-1.5 text-[0.65rem] text-fg-faint">Best at</p>
              {strengths.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {strengths.map((t) => (
                    <Strength key={t} type={t} skill={d.skills[t].skill} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-muted">No sealed rifts yet</p>
              )}
            </div>

            <div className="mt-auto border-t border-line pt-3">
              <p className="label-caps mb-1.5 flex items-center gap-1.5 text-[0.65rem] text-fg-faint">
                <Swords aria-hidden className="size-3.5" />
                {next.length === 0 ? 'Resting' : 'Takes the next'}
              </p>
              {next.length > 0 ? (
                <p className="flex flex-wrap gap-1.5">
                  {next.map((t) => (
                    <TypeChip
                      key={t}
                      type={t}
                      training={forecast.nextAssignee[t]?.reason === 'training-quest'}
                    />
                  ))}
                </p>
              ) : (
                <p className="text-sm text-fg-muted">Kept free for what comes next.</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Strength({ type, skill }: { type: GlitchType; skill: number }) {
  const { label, color, icon: Icon } = TYPE_META[type]
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)_2.75rem] items-center gap-2 text-sm">
      <Icon aria-hidden className="size-4" style={{ color }} />
      <span className="flex flex-col gap-1">
        <span className="text-fg">{label}</span>
        <span className="h-1.5 overflow-hidden rounded-full bg-field">
          <span
            className="bar-grow block h-full rounded-full"
            style={{ width: `${Math.round(skill * 100)}%`, background: color }}
          />
        </span>
      </span>
      <span className="text-right font-bold text-fg tabular">{Math.round(skill * 100)}%</span>
    </li>
  )
}

/** A kind of rift a defender takes next; a cap marks it as a training quest. */
function TypeChip({ type, training }: { type: GlitchType; training: boolean }) {
  const { label, color, icon: Icon } = TYPE_META[type]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-field px-2.5 py-1 text-xs text-fg">
      <Icon aria-hidden className="size-3.5" style={{ color }} />
      {label}
      {training && (
        <>
          <GraduationCap aria-hidden className="size-3.5 text-gold" />
          <span className="sr-only">(training quest)</span>
        </>
      )}
    </span>
  )
}

/**
 * The evidence, folded away: the model and its track record, when incidents usually come, and
 * every defender's skill per kind. Open for whoever asks how the forecast knows.
 */
export function HowItWorks({ forecast }: { forecast: Forecast }) {
  const { model } = forecast
  const better = model.baselineError > 0 ? 1 - model.modelError / model.baselineError : 0
  return (
    <details className="group rounded-xl border border-line bg-panel shadow-(--shadow)">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <FlaskConical aria-hidden className="size-5 shrink-0 text-gold" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-fg">How the forecast works</span>
          <span className="text-sm text-fg-muted">
            A neural network trained on {Math.round(model.trainedHours / 24)} days of
            {model.synthetic ? ' synthetic' : ''} incidents
            {better > 0 ? `, ${Math.round(better * 100)}% more accurate than a plain average` : ''}.
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="grid gap-8 border-t border-line px-5 py-5 lg:grid-cols-2">
        <section>
          <h3 className="label-caps mb-3 text-[0.68rem] text-gold">The model</h3>
          <ModelFacts forecast={forecast} better={better} />
        </section>
        <section>
          <h3 className="label-caps mb-3 text-[0.68rem] text-gold">When the Desync strikes</h3>
          <Heatmap grid={forecast.heatmap} />
        </section>
        <section className="lg:col-span-2">
          <h3 className="label-caps mb-3 text-[0.68rem] text-gold">Every defender, every kind</h3>
          <SkillTable forecast={forecast} />
          <p className="mt-2 text-sm text-fg-muted">
            Speed against everyone else at that kind, trusted more with more fixes.
          </p>
        </section>
      </div>
    </details>
  )
}

function ModelFacts({ forecast, better }: { forecast: Forecast; better: number }) {
  const { model } = forecast
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-fg">
        {model.kind}. It reads the time of day and week and the last day of activity, and predicts
        each of the next 12 hours. Tested on the last week, which it never saw while learning.
      </p>
      <div className="flex flex-col gap-1.5">
        <ErrorBar label="Model" value={model.modelError} max={model.baselineError} accent />
        <ErrorBar label="Average" value={model.baselineError} max={model.baselineError} />
        <span className="text-fg-muted">
          Average miss per hour, in rifts.{' '}
          {better > 0
            ? `The model misses ${Math.round(better * 100)}% less.`
            : 'The model is not ahead of the average yet.'}
        </span>
      </div>
      {model.synthetic && (
        <p className="rounded-lg border border-amber/50 bg-[color-mix(in_oklab,var(--amber)_10%,var(--panel))] px-3 py-2 text-fg-muted">
          The history is synthetic, generated for this demo with deliberate daily and weekly
          rhythms, storm days and defender strengths ({model.incidents.toLocaleString()} incidents).
        </p>
      )}
    </div>
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
          className={cx('block h-full rounded-full', accent ? 'bg-royal-hi' : 'bg-fg-faint')}
          style={{ width: `${Math.min(100, (value / Math.max(max, 0.01)) * 100)}%` }}
        />
      </span>
      <span className="text-right font-bold text-fg tabular">{value.toFixed(2)}</span>
    </span>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
/** Monday first; the heatmap rows come Sunday first. */
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0]

/** Average incidents per weekday and hour. Now is ringed in gold. */
function Heatmap({ grid }: { grid: Array<Array<number>> }) {
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
            {h % 6 === 0 ? h : ''}
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
        Busy ({max.toFixed(1)} an hour)
      </div>
    </div>
  )
}

function SkillTable({ forecast }: { forecast: Forecast }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] text-left text-sm tabular">
        <thead className="text-fg-faint">
          <tr>
            <th className="py-1.5 font-normal">Defender</th>
            {KINDS.map((t) => (
              <th key={t} className="py-1.5 text-right font-normal">
                {TYPE_META[t].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {forecast.defenders.map((d) => (
            <tr key={d.guardianId} className="border-t border-line/60">
              <th scope="row" className="py-1.5 font-bold text-fg">
                {d.codename}
              </th>
              {KINDS.map((t) => (
                <td
                  key={t}
                  className="py-1.5 text-right text-fg-muted"
                  title={`${d.skills[t].fixes} fixes, median ${d.skills[t].medianMinutes} min`}
                >
                  {Math.round(d.skills[t].skill * 100)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
