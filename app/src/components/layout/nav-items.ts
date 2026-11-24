export type NavItem = {
  label: string
  /** Painted icon in public/icons/realm (CC0, see SOURCE.txt there). */
  image: string
  /** Set once the route exists; until then the item renders disabled. */
  to?: '/' | '/glitches' | '/guardians'
  /** Shown in the phone hotbar; the rest live behind "More". */
  hotbar?: boolean
  commanderOnly?: boolean
}

/** One list drives the desktop spellbook rail and the phone hotbar. */
export const navItems: Array<NavItem> = [
  { label: 'Overview', image: '/icons/realm/overview.webp', to: '/', hotbar: true },
  { label: 'Quest log', image: '/icons/realm/quest-log.webp', to: '/glitches', hotbar: true },
  { label: 'Map of Achrona', image: '/icons/realm/map.webp', hotbar: true },
  { label: 'Sensors', image: '/icons/realm/sensors.webp' },
  { label: 'Oracle', image: '/icons/realm/oracle.webp', hotbar: true },
  { label: 'Hall of Fame', image: '/icons/realm/hall-of-fame.webp' },
  {
    label: 'Guardians',
    image: '/icons/realm/guardians.webp',
    to: '/guardians',
    commanderOnly: true,
  },
  { label: 'Settings', image: '/icons/realm/settings.webp' },
]
