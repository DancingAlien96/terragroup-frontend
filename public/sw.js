/**
 * TerraGroup service worker — mínimo para habilitar la instalación PWA.
 *
 * Filosofía: NO cacheamos data del backend ni páginas dinámicas porque este
 * es un SaaS transaccional (pagos, contratos, ventas) — mostrar contenido
 * desactualizado desde caché sería peor que mostrar un error. El SW solo
 * satisface el requisito de Chrome/Safari para "installability" y muestra
 * una pantalla amable de offline cuando no hay red.
 *
 * Estrategia:
 *  - install: cachea shell mínima (offline page + iconos)
 *  - activate: limpia versiones viejas
 *  - fetch: network-first sin fallback a cache para HTML/API. Los assets
 *    estáticos (icons, fonts) usa cache-first.
 */
const CACHE_VERSION = 'terragroup-v1';
const SHELL_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/apple-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo interceptamos GETs; el resto (POST/PUT/PATCH/DELETE) va directo a red.
  if (req.method !== 'GET') return;

  // Requests cross-origin (backend API, uploads.urbandata.app) van sin tocar.
  if (url.origin !== self.location.origin) return;

  // Assets estáticos con hash de Next.js (/_next/static/*): cache-first.
  // Nunca cambian para el mismo hash, así que es seguro cachearlos indefinidamente.
  if (url.pathname.startsWith('/_next/static/') || SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit ?? fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        return res;
      })),
    );
    return;
  }

  // Todo lo demás (páginas, data fetches): network-first sin fallback.
  // Si no hay red, el browser muestra su pantalla estándar de offline.
});
