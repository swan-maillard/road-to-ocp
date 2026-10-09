// Road to OCP service worker (offline build).
// Cache-first for assets, network-first for navigations so installs keep
// working with no connection and still pick up new builds when online.
const CACHE = 'road-to-ocp-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './offline-content.json',
  './offline-seed.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map((u) => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function put(req, res) {
  if (!res || res.status !== 200 || res.type === 'opaque') return;
  const c = await caches.open(CACHE);
  await c.put(req, res.clone());
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('.json')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        await put(req, res);
        return res;
      } catch {
        return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      await put(req, res);
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});
