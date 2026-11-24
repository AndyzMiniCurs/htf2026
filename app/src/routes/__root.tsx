import { HeadContent, Outlet, Scripts, createRootRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useOnline } from '#/hooks/useOnline.ts'
import { Button } from '#/components/ui/Button.tsx'
import { Crest } from '#/components/layout/Crest.tsx'
import { ToastProvider } from '#/components/ui/Toast.tsx'
import { getMe } from '#/lib/auth.functions.ts'

import { MagicCursor } from '#/components/layout/MagicCursor.tsx'
import appCss from '../styles.css?url'
import type { ErrorComponentProps } from '@tanstack/react-router'
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
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icon-192.png' },
    ],
  }),
  // Who is signed in, for every route below; null on the login screen.
  beforeLoad: async () => ({ me: await getMe() }),
  shellComponent: RootDocument,
  component: () => (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ServiceWorker />
        <MagicCursor />
        <Outlet />
      </ToastProvider>
    </MotionConfig>
  ),
  errorComponent: RootError,
})

/** Installs the offline shell in production builds only; in dev it would cache Vite's modules. */
function ServiceWorker() {
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js')
    }
  }, [])
  return null
}

/** When mission control cannot be reached at all: say so in the realm's voice and offer a retry. */
function RootError({ reset }: ErrorComponentProps) {
  const router = useRouter()
  const online = useOnline()
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <Crest className="size-16" />
        <h1 className="title-gothic text-4xl">
          {online ? 'The grid went quiet' : 'You are offline'}
        </h1>
        <p className="text-fg-muted">
          {online
            ? 'Mission control did not answer. It may be restarting; try again in a moment.'
            : 'Reconnect to reach mission control again.'}
        </p>
        <Button
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          Try again
        </Button>
      </div>
    </main>
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
          config={{ position: 'bottom-left', hideUntilHover: true }}
          plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}
