// Guardians of the Grid service worker: keeps the app shell and its heavy assets available
// offline. Data stays network-only; the page keeps showing what it last loaded.
const CACHE = 'achrona-v1'
// Pages are cached as they are visited (they need a session), so the shell is static files only.
const SHELL = ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

/** Built assets, models, icons and fonts never change under the same URL: cache first. */
const IMMUTABLE = /^\/(assets|models|icons|textures)\/|\.(woff2?|png|webp|glb)$/

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  // Server functions, SSE and photos are live data: never served from cache.
  if (url.pathname.startsWith('/_serverFn') || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    // Network first so pages are fresh; offline, fall back to the cached page or the shell.
    event.respondWith(
      fetch(request)
        .then((response) => {
          // A redirect (e.g. to /login) must not be replayed for this URL later.
          if (response.ok && !response.redirected) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit ?? caches.match('/').then((home) => home ?? Response.error())),
        ),
    )
    return
  }

  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
