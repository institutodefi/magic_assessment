/* MAGIC® · Service Worker
   Cache "app shell" para carga instantánea y funcionamiento offline básico.
   Estrategia: cache-first para estáticos, network-first para HTML. */
const CACHE = 'magic-v1';
const SHELL = [
  '/',
  '/index.html',
  '/certificar.html',
  '/soy-magic.html',
  '/evaluar.html',
  '/aviso-legal.html',
  '/assets/contact-modal.js',
  '/assets/magic_logo-sm.webp',
  '/assets/iee_logo_full-sm.webp',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // No interceptar llamadas a la API ni a terceros (Supabase, Brevo, Google Fonts)
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/.netlify')) return;

  // HTML: network-first (contenido siempre fresco; offline -> cache)
  if (req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Estáticos: cache-first
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
