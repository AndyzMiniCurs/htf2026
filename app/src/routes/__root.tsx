import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ToastProvider } from '#/components/ui/Toast.tsx'
import { getMe } from '#/lib/auth.functions.ts'

import appCss from '../styles.css?url'
import type { ReactNode } from 'react'

/** Runs before paint so a stored theme never flashes the other one. Night is the default: it is Achrona's world. */
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='light'||t==='dark'?t:(t==='system'&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=d}catch(e){}})()`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#0c0f1a' },
      { title: 'Guardians of the Grid · Achrona mission control' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  // Who is signed in, for every route below; null on the login screen.
  beforeLoad: async () => ({ me: await getMe() }),
  shellComponent: RootDocument,
  component: () => (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  ),
})

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
          config={{ position: 'bottom-left', hideUntilHover: true }}
          plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}
