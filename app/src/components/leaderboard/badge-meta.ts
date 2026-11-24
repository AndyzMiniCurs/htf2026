import { Anvil, Gem, Sparkle, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Badge } from '#/lib/monitoring.ts'

/** Each badge's name, how it is earned (from the spec) and its seal. */
export const BADGE_META: Record<
  Badge,
  { label: string; earned: string; color: string; icon: LucideIcon }
> = {
  'first-fix': {
    label: 'First Fix',
    earned: 'Sealed a first rift',
    color: '#5b8cff',
    icon: Sparkle,
  },
  stabilizer: { label: 'Stabilizer', earned: 'Sealed 10 rifts', color: '#e0b66a', icon: Anvil },
  specialist: {
    label: 'Specialist',
    earned: 'Sealed 5 rifts of one kind',
    color: '#c75cf2',
    icon: Gem,
  },
  'rapid-response': {
    label: 'Rapid Response',
    earned: 'Sealed a rift within 15 minutes of it opening',
    color: '#3fd18f',
    icon: Zap,
  },
}
