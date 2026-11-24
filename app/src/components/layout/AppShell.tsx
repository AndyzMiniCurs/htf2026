import { Link, useLocation, useRouterState } from '@tanstack/react-router'
import { Ellipsis, WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cx } from '#/components/ui/cx.ts'
import { HornIcon } from '#/components/icons/RealmIcons.tsx'
import { useOnline } from '#/hooks/useOnline.ts'
import { PresenterKeys } from '#/components/demo/PresenterKeys.tsx'
import { Crest } from './Crest.tsx'
import { GuardianMenu } from './GuardianMenu.tsx'
import { LockdownControl } from './LockdownControl.tsx'
import { GlobalShortcuts } from './ShortcutHelp.tsx'
import { CurseVeins } from './CurseVeins.tsx'
import { Desync } from './Desync.tsx'
import { MagicVial } from './MagicVial.tsx'
import { navItems } from './nav-items.ts'
import type { NavItem } from './nav-items.ts'
import type { Guardian } from '#/lib/guardian.ts'
import type { ReactNode } from 'react'

type AppShellProps = {
  me: Guardian | null
  magicLevel: number
  /** Glitches not yet fixed: how hard the Desync shakes the screen. */
  openGlitches: number
  children: ReactNode
}

/**
 * The game HUD around every page: top bar with crest, magic vial and guardian;
 * a spellbook rail from 1024px; a thumb hotbar with the report seal below it.
 */
export function AppShell({ me, magicLevel, openGlitches, children }: AppShellProps) {
  const online = useOnline()
  const items = navItems.filter((item) => !item.commanderOnly || me?.role === 'commander')
  return (
    <div className="flex min-h-dvh flex-col">
      <CurseVeins />
      <Desync openGlitches={openGlitches} />
      <GlobalShortcuts />
      {me?.role === 'commander' && <PresenterKeys />}
      <a
        href="#main"
        className="label-caps sr-only z-50 rounded-full bg-royal px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Hud me={me} magicLevel={magicLevel} />
      <div className="flex flex-1 overflow-x-clip">
        <Rail items={items} />
        <main
          id="main"
          className="min-w-0 flex-1 px-4 pt-4 pb-28 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10 print:p-0"
        >
          <OfflineNotice />
          {/* Offline, every form control on the page pauses; links and reading keep working. */}
          <fieldset disabled={!online} className="contents">
            {/* A new page's blocks are fresh DOM, so they play this entrance without a remount. */}
            <div className="page-enter">{children}</div>
          </fieldset>
        </main>
      </div>
      <Hotbar items={items} />
    </div>
  )
}

function Hud({ me, magicLevel }: { me: Guardian | null; magicLevel: number }) {
  const loading = useRouterState({ select: (state) => state.status === 'pending' })
  return (
    <header className="print:hidden! sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklab,var(--ground)_82%,transparent)] backdrop-blur-md pt-[env(safe-area-inset-top)]">
      {loading && (
        <span
          aria-hidden
          className="nav-progress absolute inset-x-0 -bottom-px h-0.5 bg-[linear-gradient(90deg,var(--gold-deep),var(--gold-hi),var(--curse-hi))] shadow-[0_0_10px_var(--gold)]"
        />
      )}
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:h-20 lg:pr-8 lg:pl-5">
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
          {me?.role === 'commander' && <LockdownControl />}
          <Link
            to="/echoes/new"
            aria-label="Report an echo"
            className="label-caps hidden h-11 min-w-11 items-center justify-center gap-2 rounded-full border-b-[3px] border-b-royal-deep bg-royal px-3 text-sm xl:px-5 whitespace-nowrap text-on-accent shadow-[0_8px_20px_-10px_var(--royal)] transition-[background-color,transform] duration-200 ease-out-expo hover:bg-royal-hi active:scale-[0.97] lg:inline-flex"
          >
            <HornIcon className="size-5" />
            {/* Icon only on small desktops and projectors, where the HUD runs out of room. */}
            <span className="hidden xl:inline">Report an echo</span>
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
  'group relative isolate flex size-13 items-center justify-center rounded-lg border border-line bg-field/70 text-fg-muted shadow-[inset_0_2px_8px_rgb(0_0_0/0.5)] transition-[color,border-color,box-shadow] duration-200 hover:border-line-strong hover:text-fg'

/** The spellbook rail: one inventory slot per page; the active slot is framed in gold. Labels show as tooltips. */
function Rail({ items }: { items: Array<NavItem> }) {
  return (
    <nav
      aria-label="Main"
      className="print:hidden! sticky top-20 z-20 hidden h-[calc(100dvh-5rem)] w-22 shrink-0 flex-col items-center gap-2 border-r border-line bg-[color-mix(in_oklab,var(--ground)_70%,transparent)] py-6 backdrop-blur-md lg:flex"
    >
      {items.map((item) => (
        <NavEntry
          key={item.label}
          item={item}
          className={railItem}
          iconClass="size-9"
          indicator="rail-active"
          tooltip
        />
      ))}
    </nav>
  )
}

const hotbarItem =
  'group relative isolate flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent text-fg-muted text-[0.7rem] font-medium transition-colors'

/** Phone navigation: four hotbar slots and the report seal raised in the middle. */
function Hotbar({ items }: { items: Array<NavItem> }) {
  const slots = items.filter((item) => item.hotbar)
  const left = slots.slice(0, 2)
  const right = slots.slice(2, 3)
  const rest = items.filter((item) => !item.hotbar)
  const [moreOpen, setMoreOpen] = useState(false)
  const closeMore = useCallback(() => setMoreOpen(false), [])
  const pathname = useLocation({ select: (location) => location.pathname })
  const moreActive = rest.some((item) => item.to === pathname)
  return (
    <>
      <MoreSheet items={rest} open={moreOpen} onClose={closeMore} />
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
              indicator="hotbar-active"
              showLabel
            />
          ))}
          <div className="flex flex-1 justify-center">
            <Link
              to="/echoes/new"
              aria-label="Report an echo"
              className="-mt-7 grid size-16 place-items-center rounded-full border-4 border-ground bg-[radial-gradient(circle_at_35%_30%,var(--gold-hi),var(--gold)_45%,var(--gold-deep))] text-[#2a1a05] shadow-[0_10px_24px_-6px_var(--gold)] transition-transform duration-200 ease-out-expo active:scale-90"
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
              indicator="hotbar-active"
              showLabel
            />
          ))}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
            className={cx(hotbarItem, (moreOpen || moreActive) && 'text-gold-hi')}
          >
            {moreActive && !moreOpen && <ActiveFrame id="hotbar-active" />}
            <Ellipsis aria-hidden className="size-9 p-1.5" />
            More
          </button>
        </div>
      </nav>
    </>
  )
}

/** Phone: the pages that do not fit the hotbar, in a sheet that rises from it. Drag down to dismiss. */
function MoreSheet({
  items,
  open,
  onClose,
}: {
  items: Array<NavItem>
  open: boolean
  onClose: () => void
}) {
  const first = useRef<HTMLAnchorElement>(null)
  const pathname = useLocation({ select: (location) => location.pathname })
  const openedAt = useRef(pathname)

  useEffect(() => {
    if (!open) return
    openedAt.current = pathname
    first.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open && pathname !== openedAt.current) onClose()
  }, [open, pathname, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[25] lg:hidden">
          <motion.button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(8_4_14/0.6)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            className="absolute inset-x-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] rounded-2xl border border-line-strong bg-panel-hi p-3 shadow-(--shadow)"
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 60 || info.velocity.y > 400) onClose()
            }}
          >
            <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-strong" />
            <ul className="grid grid-cols-3 gap-2">
              {items.map((item, i) =>
                item.to ? (
                  <motion.li
                    key={item.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 + i * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      ref={i === 0 ? first : undefined}
                      to={item.to}
                      className="flex min-h-22 flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-field/70 p-2 text-center text-[0.75rem] font-medium text-fg-muted transition-[transform,border-color,color] duration-150 active:scale-95"
                      activeProps={{ className: 'border-gold/80! text-gold-hi!' }}
                    >
                      <img
                        src={item.image}
                        alt=""
                        width={128}
                        height={128}
                        draggable={false}
                        className="size-10 rounded-md object-cover"
                      />
                      {item.label}
                    </Link>
                  </motion.li>
                ) : null,
              )}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** The gilt frame of the active slot; a shared layout id makes it glide between slots. */
function ActiveFrame({ id }: { id: string }) {
  return (
    <motion.span
      layoutId={id}
      aria-hidden
      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
      className="absolute inset-0 -z-10 rounded-lg border border-gold/80 bg-[radial-gradient(circle_at_50%_35%,color-mix(in_oklab,var(--gold)_24%,transparent),color-mix(in_oklab,var(--gold-deep)_18%,var(--field))_75%)] shadow-[0_0_18px_-4px_var(--gold),inset_0_1px_0_color-mix(in_oklab,var(--gold-hi)_40%,transparent)]"
    />
  )
}

function NavEntry({
  item,
  className,
  iconClass,
  showLabel,
  tooltip,
  indicator,
}: {
  item: NavItem
  className: string
  iconClass: string
  showLabel?: boolean
  tooltip?: boolean
  /** Layout id of the gliding active frame this entry shares with its siblings. */
  indicator?: string
}) {
  const content = (active: boolean) => (
    <>
      {active && indicator && <ActiveFrame id={indicator} />}
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
        {content(false)}
      </button>
    )
  }
  return (
    <Link
      to={item.to}
      aria-label={showLabel ? undefined : item.label}
      className={className}
      activeOptions={{ exact: item.to === '/' }}
      activeProps={{ className: 'text-gold-hi!' }}
    >
      {({ isActive }) => content(isActive)}
    </Link>
  )
}
