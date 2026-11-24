import { Link } from '@tanstack/react-router'
import { Ellipsis, WifiOff } from 'lucide-react'
import { cx } from '#/components/ui/cx.ts'
import { HornIcon } from '#/components/icons/RealmIcons.tsx'
import { useOnline } from '#/hooks/useOnline.ts'
import { Crest } from './Crest.tsx'
import { GuardianMenu } from './GuardianMenu.tsx'
import { LockdownControl } from './LockdownControl.tsx'
import { useLiveRealm } from './LiveRealm.tsx'
import { GlobalShortcuts } from './ShortcutHelp.tsx'
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
  const online = useOnline()
  const items = navItems.filter((item) => !item.commanderOnly || me?.role === 'commander')
  return (
    <div className="flex min-h-dvh flex-col">
      <CurseVeins />
      <GlobalShortcuts />
      <a
        href="#main"
        className="label-caps sr-only z-50 rounded-full bg-royal px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Hud me={me} magicLevel={magicLevel} />
      <div className="flex flex-1">
        <Rail items={items} />
        <main
          id="main"
          className="min-w-0 flex-1 px-4 pt-4 pb-28 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10 print:p-0"
        >
          <OfflineNotice />
          {/* Offline, every form control on the page pauses; links and reading keep working. */}
          <fieldset disabled={!online} className="contents">
            {children}
          </fieldset>
        </main>
      </div>
      <Hotbar items={items} />
    </div>
  )
}

function Hud({ me, magicLevel }: { me: Guardian | null; magicLevel: number }) {
  return (
    <header className="print:hidden! sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklab,var(--ground)_82%,transparent)] backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link to="/" className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg">
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
          {me?.role === 'commander' && <LockdownControl />}
          <Link
            to="/echoes/new"
            className="label-caps hidden h-11 items-center gap-2 rounded-full border-b-[3px] border-b-royal-deep bg-royal px-5 text-sm whitespace-nowrap text-on-accent shadow-[0_8px_20px_-10px_var(--royal)] transition-colors hover:bg-royal-hi lg:inline-flex"
          >
            <HornIcon className="size-5" />
            Report an echo
          </Link>
          {me && <GuardianMenu me={me} />}
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <MagicVial level={magicLevel} compact />
      </div>
    </header>
  )
}

/** The live link to mission control: green while events flow, amber while reconnecting. */
function LivePulse() {
  const { status } = useLiveRealm()
  const online = useOnline()
  const live = online && status === 'live'
  return (
    <span
      role="status"
      title={live ? 'Receiving live updates' : 'Reconnecting to mission control'}
      className="label-caps hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-fg-muted sm:inline-flex"
    >
      <span className="relative flex size-2.5">
        {live && (
          <span className="absolute inset-0 rounded-full bg-verdant motion-safe:animate-ping" />
        )}
        <span className={cx('relative size-2.5 rounded-full', live ? 'bg-verdant' : 'bg-amber')} />
      </span>
      {!online
        ? 'Offline'
        : live
          ? 'Live'
          : status === 'connecting'
            ? 'Connecting'
            : 'Reconnecting'}
    </span>
  )
}

/** Says what still works while the device has no network. */
function OfflineNotice() {
  const online = useOnline()
  if (online) return null
  return (
    <p
      role="status"
      className="mb-4 flex items-center gap-3 rounded-xl border border-amber/60 bg-[color-mix(in_oklab,var(--amber)_12%,var(--panel))] px-4 py-3 text-fg"
    >
      <WifiOff aria-hidden className="size-5 shrink-0 text-amber" />
      You are offline. Mission control shows what it last loaded; reporting and other actions return
      when the connection does.
    </p>
  )
}

const railItem =
  'group relative flex size-13 items-center justify-center rounded-lg border border-line bg-field/70 text-fg-muted shadow-[inset_0_2px_8px_rgb(0_0_0/0.5)] transition-[color,border-color,box-shadow] duration-200 hover:border-line-strong hover:text-fg'

/** The spellbook rail: one inventory slot per page; the active slot is framed in gold. Labels show as tooltips. */
function Rail({ items }: { items: Array<NavItem> }) {
  return (
    <nav
      aria-label="Main"
      className="print:hidden! sticky top-20 z-20 hidden h-[calc(100dvh-5rem)] w-22 shrink-0 flex-col items-center gap-2 border-r border-line bg-[color-mix(in_oklab,var(--ground)_70%,transparent)] py-6 backdrop-blur-md lg:flex"
    >
      {items.map((item) => (
        <NavEntry key={item.label} item={item} className={railItem} iconClass="size-9" tooltip />
      ))}
    </nav>
  )
}

const hotbarItem =
  'group flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent text-fg-muted text-[0.7rem] font-medium transition-colors'

/** Phone navigation: four hotbar slots and the report seal raised in the middle. */
function Hotbar({ items }: { items: Array<NavItem> }) {
  const slots = items.filter((item) => item.hotbar)
  const left = slots.slice(0, 2)
  const right = slots.slice(2, 3)
  return (
    <nav
      aria-label="Main"
      className="print:hidden! fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[color-mix(in_oklab,var(--ground-2)_92%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-end gap-1 py-1.5">
        {left.map((item) => (
          <NavEntry
            key={item.label}
            item={item}
            className={hotbarItem}
            iconClass="size-9"
            showLabel
          />
        ))}
        <div className="flex flex-1 justify-center">
          <Link
            to="/echoes/new"
            aria-label="Report an echo"
            className="-mt-7 grid size-16 place-items-center rounded-full border-4 border-ground bg-[radial-gradient(circle_at_35%_30%,var(--gold-hi),var(--gold)_45%,var(--gold-deep))] text-[#2a1a05] shadow-[0_10px_24px_-6px_var(--gold)] transition-transform active:scale-95"
          >
            <HornIcon className="size-8" />
          </Link>
        </div>
        {right.map((item) => (
          <NavEntry
            key={item.label}
            item={item}
            className={hotbarItem}
            iconClass="size-9"
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
  const content = (
    <>
      <img
        src={item.image}
        alt=""
        width={128}
        height={128}
        draggable={false}
        className={cx(
          iconClass,
          'rounded-md object-cover transition-[filter,transform] duration-200',
          'group-hover:scale-105 group-hover:brightness-110',
          'group-aria-[current=page]:brightness-110',
        )}
      />
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
        className={cx(className, 'cursor-not-allowed opacity-75')}
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
      activeOptions={{ exact: item.to === '/' }}
      activeProps={{
        className:
          'text-gold-hi! border-gold/80! bg-[radial-gradient(circle_at_50%_35%,color-mix(in_oklab,var(--gold)_24%,transparent),color-mix(in_oklab,var(--gold-deep)_18%,var(--field))_75%)] shadow-[0_0_18px_-4px_var(--gold),inset_0_1px_0_color-mix(in_oklab,var(--gold-hi)_40%,transparent)]',
      }}
    >
      {content}
    </Link>
  )
}
