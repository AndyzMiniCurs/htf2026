import {
  CircleHelp,
  Droplets,
  Flame,
  Ghost,
  Hourglass,
  Orbit,
  RadioTower,
  Search,
  ShieldCheck,
  ShieldHalf,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { GlitchStatus, GlitchType } from '#/lib/glitch.ts'

/** How each status reads in the UI. Colors are CSS tokens so themes and lockdown recolor them. */
export const STATUS_META: Record<GlitchStatus, { label: string; color: string; icon: LucideIcon }> =
  {
    LEAKED: { label: 'Leaked', color: 'var(--ember)', icon: Flame },
    ASSESSING: { label: 'Assessing', color: 'var(--amber)', icon: Search },
    CONTAINING: { label: 'Containing', color: 'var(--royal-hi)', icon: ShieldHalf },
    FIXED: { label: 'Fixed', color: 'var(--verdant)', icon: ShieldCheck },
  }

/** Every glitch type has its own icon and color everywhere a glitch is shown (spec: ai-assistance). */
export const TYPE_META: Record<GlitchType, { label: string; color: string; icon: LucideIcon }> = {
  'time-anomaly': { label: 'Time anomaly', color: '#6fa8ff', icon: Hourglass },
  'magic-drain': { label: 'Magic drain', color: 'var(--curse-hi)', icon: Droplets },
  portal: { label: 'Portal', color: '#3fd6c8', icon: Orbit },
  'sensor-fault': { label: 'Sensor fault', color: 'var(--amber)', icon: RadioTower },
  creature: { label: 'Creature', color: 'var(--ember)', icon: Ghost },
  unknown: { label: 'Unknown', color: 'var(--fg-faint)', icon: CircleHelp },
}
