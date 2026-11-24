import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '#/components/layout/AppShell.tsx'
import { LiveRealmProvider } from '#/components/layout/LiveRealm.tsx'
import { getDashboard } from '#/lib/monitoring.functions.ts'

/** Every page behind login lives under this layout: no session, no entry. */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context, location }) => {
    if (!context.me) throw redirect({ to: '/login', search: { redirect: location.href } })
    return { me: context.me }
  },
  loader: () => getDashboard(),
  component: AppLayout,
})

function AppLayout() {
  const { me } = Route.useRouteContext()
  const dashboard = Route.useLoaderData()
  return (
    <LiveRealmProvider initialLockdown={dashboard.lockdown}>
      <AppShell me={me} magicLevel={dashboard.magicLevel}>
        <Outlet />
      </AppShell>
    </LiveRealmProvider>
  )
}
