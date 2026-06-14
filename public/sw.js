const CACHE_NAME = 'dictia-v1'

// Static assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Domains that must NEVER be intercepted (APIs, auth, CDN)
const PASSTHROUGH_ORIGINS = [
  'supabase.co',
  'api.groq.com',
  'api.anthropic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]

function shouldPassthrough(url) {
  return PASSTHROUGH_ORIGINS.some(origin => url.includes(origin))
}

// Install: cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  )
  self.skipWaiting()
})

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch strategy:
// - API calls (Supabase, Groq, Anthropic, Google Fonts): always network, no cache
// - Navigation (HTML): network-first, fallback to cached shell
// - Static assets (JS, CSS, images): cache-first, then network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = request.url

  // Always pass through API calls — never intercept
  if (shouldPassthrough(url)) return

  // For navigation requests: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match('/') || caches.match(request))
    )
    return
  }

  // For static assets: cache-first
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
  }
})
