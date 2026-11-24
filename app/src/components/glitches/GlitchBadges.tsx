import { Badge } from '#/components/ui/Badge.tsx'
import { STATUS_META, TYPE_META } from './glitch-meta.ts'
import type { GlitchStatus, GlitchType } from '#/lib/glitch.ts'

export function StatusBadge({ status }: { status: GlitchStatus }) {
  const { label, color, icon: Icon } = STATUS_META[status]
  return (
    <Badge color={color} icon={<Icon aria-hidden className="size-3.5" />}>
      {label}
    </Badge>
  )
}

export function GlitchTypeBadge({ type }: { type: GlitchType }) {
  const { label, color, icon: Icon } = TYPE_META[type]
  return (
    <Badge color={color} icon={<Icon aria-hidden className="size-3.5" />}>
      {label}
    </Badge>
  )
}
