import {
  ChartIcon,
  CitadelIcon,
  CrownIcon,
  LeyCrystalIcon,
  OracleIcon,
  RuneDialIcon,
  ScrollIcon,
  WardIcon,
} from '#/components/icons/RealmIcons.tsx'
import type { RealmIcon } from '#/components/icons/RealmIcons.tsx'

export type NavItem = {
  label: string
  icon: RealmIcon
  /** Set once the route exists; until then the item renders disabled. */
  to?: '/'
  /** Shown in the phone hotbar; the rest live behind "More". */
  hotbar?: boolean
  commanderOnly?: boolean
}

/** One list drives the desktop spellbook rail and the phone hotbar. */
export const navItems: Array<NavItem> = [
  { label: 'Overview', icon: CitadelIcon, to: '/', hotbar: true },
  { label: 'Quest log', icon: ScrollIcon, hotbar: true },
  { label: 'Map of Achrona', icon: ChartIcon, hotbar: true },
  { label: 'Sensors', icon: LeyCrystalIcon },
  { label: 'Oracle', icon: OracleIcon, hotbar: true },
  { label: 'Hall of Fame', icon: CrownIcon },
  { label: 'Guardians', icon: WardIcon, commanderOnly: true },
  { label: 'Settings', icon: RuneDialIcon },
]
