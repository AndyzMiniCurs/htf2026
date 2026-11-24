import {
  Activity,
  BookOpenText,
  Castle,
  Map,
  ScrollText,
  Settings,
  Shield,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  icon: LucideIcon
  /** Set once the route exists; until then the item renders disabled. */
  to?: '/'
  /** Shown in the phone hotbar; the rest live behind "More". */
  hotbar?: boolean
  commanderOnly?: boolean
}

/** One list drives the desktop spellbook rail and the phone hotbar. */
export const navItems: Array<NavItem> = [
  { label: 'Overview', icon: Castle, to: '/', hotbar: true },
  { label: 'Quest log', icon: ScrollText, hotbar: true },
  { label: 'Map of Achrona', icon: Map, hotbar: true },
  { label: 'Sensors', icon: Activity },
  { label: 'Oracle', icon: BookOpenText, hotbar: true },
  { label: 'Hall of Fame', icon: Trophy },
  { label: 'Guardians', icon: Shield, commanderOnly: true },
  { label: 'Settings', icon: Settings },
]
