/* SBA Checklisten — Service Worker (PWA).
 *
 * App-Hülle: beim Installieren vorgeladen, Cache-Name aus js/version.js (neue Version → neuer Cache,
 * alte werden gelöscht). Statische Dateien: zuerst Cache, dann Netz. Die Checklisten selbst liegen
 * nicht im Cache, sondern im lokalen Speicher der App (js/store.js) — die App ist damit ohne Netz
 * vollständig benutzbar. API-Aufrufe laufen immer über das Netz; ohne Netz antwortet die App aus
 * ihrem Speicher.
 */
import { APP } from './js/version.js';

const CACHE = APP.cache;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css',
  'assets/sba-logo.png', 'assets/sba-symbol.png',
  'icons/favicon.ico', 'icons/favicon-64.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'js/config.js', 'js/version.js', 'js/i18n.js', 'js/api.js', 'js/store.js', 'js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))).catch(() => null)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;           // API und Fremdes: nur Netz
  if (u.pathname.includes('/api/')) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((c) => c || fetch(req).then((r) => {
      if (r.ok && /\.(js|css|png|ico|webmanifest|html)$/.test(u.pathname)) { const copy = r.clone(); caches.open(CACHE).then((cc) => cc.put(req, copy)); }
      return r;
    }).catch(() => caches.match('index.html')))
  );
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
