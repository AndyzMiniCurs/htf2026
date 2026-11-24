import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { AppShell } from '#/components/layout/AppShell.tsx'
import { ToastProvider } from '#/components/ui/Toast.tsx'
import { getMe } from '#/lib/auth.functions.ts'
import { getDashboard } from '#/lib/monitoring.functions.ts'

import appCss from '../styles.css?url'
import type { ReactNode } from 'react'

/** Runs before paint so a stored theme never flashes the other one. Night is the default: it is Achrona's world. */
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='light'||t==='dark'?t:(t==='system'&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=d}catch(e){}})()`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#160f1f' },
      { title: 'Guardians of the Grid · Achrona mission control' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  loader: async () => {
    const [me, dashboard] = await Promise.all([getMe(), getDashboard()])
    return { me, dashboard }
  },
  shellComponent: RootDocument,
  component: AppLayout,
})

function AppLayout() {
  const { me, dashboard } = Route.useLoaderData()
  return (
    <ToastProvider>
      <AppShell me={me} magicLevel={dashboard.magicLevel}>
        <Outlet />
      </AppShell>
    </ToastProvider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{ position: 'bottom-left' }}
          plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}
