import { Link } from '@tanstack/react-router'
import { Ellipsis, Megaphone } from 'lucide-react'
import { cx } from '#/components/ui/cx.ts'
import { Button } from '#/components/ui/Button.tsx'
import { Crest } from './Crest.tsx'
import { CurseVeins } from './CurseVeins.tsx'
import { MagicVial } from './MagicVial.tsx'
import { navItems } from './nav-items.ts'
import type { NavItem } from './nav-items.ts'
import type { Guardian } from '#/lib/guardian.ts'
import type { ReactNode } from 'react'

type AppShellProps = {
  me: Guardian | null
  magicLevel: number
  children: ReactNode
}

/**
 * The game HUD around every page: top bar with crest, magic vial and guardian;
 * a spellbook rail from 1024px; a thumb hotbar with the report seal below it.
 */
export function AppShell({ me, magicLevel, children }: AppShellProps) {
  const items = navItems.filter((item) => !item.commanderOnly || me?.role === 'commander')
  return (
    <div className="flex min-h-dvh flex-col">
      <CurseVeins />
      <a
        href="#main"
        className="label-caps sr-only z-50 rounded-full bg-royal px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Hud me={me} magicLevel={magicLevel} />
      <div className="flex flex-1">
        <Rail items={items} />
        <main id="main" className="min-w-0 flex-1 px-4 pt-4 pb-28 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
          {children}
        </main>
      </div>
      <Hotbar items={items} />
    </div>
  )
}

function Hud({ me, magicLevel }: { me: Guardian | null; magicLevel: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklab,var(--ground)_82%,transparent)] backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3 rounded-lg">
          <Crest className="size-10 drop-shadow-[0_4px_10px_rgb(165_43_217/0.5)] lg:size-12" />
          <span className="flex flex-col">
            <span className="title-gothic text-xl sm:text-2xl lg:text-[1.75rem]">
              Guardians of the Grid
            </span>
            <span className="label-caps hidden text-[0.65rem] text-fg-faint sm:block">
              Mission control of Achrona
            </span>
          </span>
        </Link>

        <div className="mx-auto hidden md:block">
          <MagicVial level={magicLevel} />
        </div>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <LivePulse />
          <div className="hidden lg:block">
            <Button size="md" icon={<Megaphone aria-hidden className="size-4" />}>
              Report an echo
            </Button>
          </div>
          {me && <GuardianChip me={me} />}
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <MagicVial level={magicLevel} compact />
      </div>
    </header>
  )
}

function LivePulse() {
  return (
    <span className="label-caps hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-fg-muted sm:inline-flex">
      <span className="relative flex size-2.5">
        <span className="absolute inset-0 rounded-full bg-verdant motion-safe:animate-ping" />
        <span className="relative size-2.5 rounded-full bg-verdant" />
      </span>
      Live
    </span>
  )
}

/** The guardian's portrait: their initial set in the gothic face on a crest-coloured tile. */
function GuardianChip({ me }: { me: Guardian }) {
  const commander = me.role === 'commander'
  return (
    <div className="flex items-center gap-2.5">
      <span className="hidden text-right leading-tight xl:block">
        <span className="block font-bold text-fg">{me.codename}</span>
        <span
          className={cx('label-caps text-[0.65rem]', commander ? 'text-pink' : 'text-fg-faint')}
        >
          {me.role}
        </span>
      </span>
      <span
        aria-label={`${me.codename}, ${me.role}`}
        className={cx(
          'title-gothic grid size-11 place-items-center rounded-xl border-2 text-2xl',
          commander
            ? 'border-pink bg-[linear-gradient(160deg,var(--curse),var(--royal-deep))]'
            : 'border-royal-hi bg-[linear-gradient(160deg,var(--royal),var(--royal-deep))]',
        )}
      >
        {me.codename.charAt(0)}
      </span>
    </div>
  )
}

const railItem =
  'group relative flex size-13 items-center justify-center rounded-xl text-fg-muted transition-colors duration-200 hover:bg-panel-hi hover:text-fg'

/** The spellbook rail. Labels appear as tooltips; the active page glows like a lit rune. */
function Rail({ items }: { items: Array<NavItem> }) {
  return (
    <nav
      aria-label="Main"
      className="sticky top-20 z-20 hidden h-[calc(100dvh-5rem)] w-22 shrink-0 flex-col items-center gap-2 border-r border-line bg-[color-mix(in_oklab,var(--ground)_70%,transparent)] py-6 backdrop-blur-md lg:flex"
    >
      {items.map((item) => (
        <NavEntry key={item.label} item={item} className={railItem} iconClass="size-6" tooltip />
      ))}
    </nav>
  )
}

const hotbarItem =
  'flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-fg-muted text-[0.7rem] font-medium transition-colors'

/** Phone navigation: four hotbar slots and the report seal raised in the middle. */
function Hotbar({ items }: { items: Array<NavItem> }) {
  const slots = items.filter((item) => item.hotbar)
  const left = slots.slice(0, 2)
  const right = slots.slice(2, 3)
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[color-mix(in_oklab,var(--ground-2)_92%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-end gap-1 py-1.5">
        {left.map((item) => (
          <NavEntry
            key={item.label}
            item={item}
            className={hotbarItem}
            iconClass="size-6"
            showLabel
          />
        ))}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            aria-label="Report an echo"
            className="-mt-7 grid size-16 place-items-center rounded-full border-4 border-ground bg-[radial-gradient(circle_at_35%_30%,var(--pink),var(--curse)_55%,#4a0f72)] text-white shadow-[0_10px_24px_-6px_var(--curse)] transition-transform active:scale-95"
          >
            <Megaphone aria-hidden className="size-7" />
          </button>
        </div>
        {right.map((item) => (
          <NavEntry
            key={item.label}
            item={item}
            className={hotbarItem}
            iconClass="size-6"
            showLabel
          />
        ))}
        <button type="button" className={hotbarItem}>
          <Ellipsis aria-hidden className="size-6" />
          More
        </button>
      </div>
    </nav>
  )
}

function NavEntry({
  item,
  className,
  iconClass,
  showLabel,
  tooltip,
}: {
  item: NavItem
  className: string
  iconClass: string
  showLabel?: boolean
  tooltip?: boolean
}) {
  const Icon = item.icon
  const content = (
    <>
      <Icon aria-hidden className={iconClass} strokeWidth={1.75} />
      {showLabel && <span className="max-w-full truncate">{item.label}</span>}
      {tooltip && (
        <span
          role="tooltip"
          className="label-caps pointer-events-none absolute left-full z-40 ml-3 rounded-lg border border-line-strong bg-panel-hi px-3 py-1.5 whitespace-nowrap text-fg opacity-0 shadow-(--shadow) transition-[opacity,translate] duration-200 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
        >
          {item.label}
        </span>
      )}
    </>
  )
  if (!item.to) {
    return (
      <button
        type="button"
        disabled
        aria-label={showLabel ? undefined : item.label}
        className={cx(className, 'cursor-not-allowed opacity-50')}
      >
        {content}
      </button>
    )
  }
  return (
    <Link
      to={item.to}
      aria-label={showLabel ? undefined : item.label}
      className={className}
      activeOptions={{ exact: true }}
      activeProps={{
        className:
          'text-fg! bg-[linear-gradient(160deg,color-mix(in_oklab,var(--curse)_45%,transparent),color-mix(in_oklab,var(--royal)_35%,transparent))] shadow-[inset_0_0_0_1px_var(--curse-hi)]',
      }}
    >
      {content}
    </Link>
  )
}
