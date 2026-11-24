import { AnimatePresence, motion } from 'motion/react'
import { ScrollText, Sparkles } from 'lucide-react'
import { cx } from '#/components/ui/cx.ts'
import { EmptyState } from '#/components/ui/EmptyState.tsx'
import { RelativeTime } from '#/components/ui/RelativeTime.tsx'
import { STATUS_META, TYPE_META } from './glitch-meta.ts'
import type { GlitchListItem } from '#/lib/glitch.ts'

type QuestLogProps = {
  glitches: Array<GlitchListItem>
  highlightedId: string | null
  onHighlight: (glitchId: string | null) => void
}

/** Open glitches as quest scrolls, newest first. Each scroll unrolls in when it arrives. */
export function QuestLog({ glitches, highlightedId, onHighlight }: QuestLogProps) {
  const open = glitches.filter((g) => g.status !== 'FIXED')
  if (open.length === 0) {
    return (
      <EmptyState icon={<Sparkles />} title="The grid holds">
        No open glitches. Achrona's magic flows freely; new echoes will appear here the moment they
        are reported.
      </EmptyState>
    )
  }
  return (
    <ol className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {open.map((glitch) => (
          <motion.li
            key={glitch.glitchId}
            layout
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Quest
              glitch={glitch}
              highlighted={highlightedId === glitch.glitchId}
              onHighlight={onHighlight}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  )
}

function Quest({
  glitch,
  highlighted,
  onHighlight,
}: {
  glitch: GlitchListItem
  highlighted: boolean
  onHighlight: (glitchId: string | null) => void
}) {
  const status = STATUS_META[glitch.status]
  const type = TYPE_META[glitch.type]
  const TypeIcon = type.icon
  const StatusIcon = status.icon
  return (
    <article
      tabIndex={0}
      onMouseEnter={() => onHighlight(glitch.glitchId)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(glitch.glitchId)}
      onBlur={() => onHighlight(null)}
      className={cx(
        'group grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 rounded-xl border p-3.5 transition-[border-color,background-color,box-shadow] duration-300',
        highlighted
          ? 'border-gold/70 bg-panel-hi shadow-[0_10px_28px_-14px_var(--gold)]'
          : 'border-line bg-ground-2/60 hover:border-line-strong',
      )}
    >
      {/* The type sigil, ringed in the status colour. */}
      <span
        className="row-span-3 grid size-12 place-items-center rounded-xl border-2 bg-field"
        style={{ borderColor: status.color, color: type.color }}
        title={type.label}
      >
        <TypeIcon aria-hidden className="size-6" />
      </span>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="title-gothic text-xl">{glitch.glitchId}</h3>
        <RelativeTime iso={glitch.timestamp} className="text-sm text-fg-faint" />
      </div>
      <p className="line-clamp-2 text-[0.95rem] leading-snug text-fg">{glitch.description}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span
          className="label-caps inline-flex items-center gap-1 text-[0.68rem]"
          style={{ color: status.color }}
        >
          <StatusIcon aria-hidden className="size-3.5" />
          {status.label}
        </span>
        <span className="text-fg-muted">{type.label}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-fg-muted">
          {glitch.assignee ? glitch.assignee.codename : 'Unassigned'}
        </span>
      </div>
    </article>
  )
}

export function QuestLogHeading({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <ScrollText aria-hidden className="size-6 text-gold" />
      Quest log
      <span className="label-caps rounded-full bg-royal px-2 py-0.5 text-[0.7rem] text-on-accent">
        {count} open
      </span>
    </span>
  )
}
