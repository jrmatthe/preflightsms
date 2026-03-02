// PreflightSMS Service Worker
// Network-first for pages, cache-first for static assets, network-only for API routes

const CACHE_VERSION = 'v1';
const CACHE_NAME = `preflightsms-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// App shell files to precache on install
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Max items in the dynamic cache before pruning
const MAX_DYNAMIC_CACHE = 100;

// ── Install: precache the app shell ──────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll for static files, but don't fail install if / fetch fails
      // (e.g. during build when dev server isn't running)
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache failed (non-fatal):', err);
        // At minimum, cache the offline page
        return cache.add(OFFLINE_URL).catch(() => {});
      });
    })
  );
  // Activate immediately, don't wait for existing tabs to close
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('preflightsms-') && key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: route requests to the right strategy ──────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // 1. API routes → network-only (offline queue handles failures)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api?')) {
    return; // Let the browser handle it normally
  }

  // 2. _next/static/ → cache-first (immutable hashed bundles)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 3. Navigation requests (HTML) → network-first, fall back to cached /
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // 4. _next/data/ (Next.js JSON data fetches) → network-first
  if (url.pathname.startsWith('/_next/data/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 5. Other same-origin assets (images, fonts, etc.) → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── Strategies ───────────────────────────────────────────────

// Cache-first: check cache, only go to network if not cached
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // If both cache and network fail, return a basic error
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first for navigation: try network, fall back to cache, then offline page
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      // Also update the cached / if this was a navigation to /
      if (new URL(request.url).pathname === '/') {
        cache.put(new Request('/'), response.clone());
      }
    }
    return response;
  } catch (err) {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fall back to cached root page (SPA — all routes render from /)
    const cachedRoot = await caches.match('/');
    if (cachedRoot) return cachedRoot;

    // Last resort: offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first: try network, fall back to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale-while-revalidate: serve from cache immediately, update cache in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        trimCache(cache);
      }
      return response;
    })
    .catch(() => cached || new Response('Offline', { status: 503 }));

  return cached || fetchPromise;
}

// ── Helpers ──────────────────────────────────────────────────

// Prevent cache from growing unbounded
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_DYNAMIC_CACHE) {
    // Delete oldest entries (first in the list)
    const deleteCount = keys.length - MAX_DYNAMIC_CACHE;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
