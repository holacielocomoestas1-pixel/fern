'use strict';
/* Fern service worker — app shell offline. Generado por gen-sw.js; no editar a mano. */
const CACHE = 'fern-v4.3';
const SHELL = [
  './',
  'index.html',
  'app.js',
  'assets/hero/fern-reading-1254.webp',
  'assets/hero/fern-reading-640.webp',
  'assets/hero/fern-reading-960.webp',
  'assets/hero/mascot-hero-1200.webp',
  'assets/icons/app-icon-192.png',
  'assets/icons/app-icon-512.png',
  'assets/icons/app-icon-maskable-512.png',
  'assets/icons/apple-touch-icon-180.png',
  'assets/icons/favicon-64.png',
  'assets/loading/mascota-cargando-estatica.png',
  'assets/loading/mascota-cargando.gif',
  'assets/loading/mascota-cargando.webp',
  'assets/png/avatar.png',
  'assets/png/complete.png',
  'assets/png/correct.png',
  'assets/png/empty.png',
  'assets/png/goal.png',
  'assets/png/guide-mirrored.png',
  'assets/png/guide.png',
  'assets/png/hint.png',
  'assets/png/home.png',
  'assets/png/listen.png',
  'assets/png/offline.png',
  'assets/png/practice.png',
  'assets/png/ranking.png',
  'assets/png/retry.png',
  'assets/png/return.png',
  'assets/png/speak.png',
  'assets/png/streak.png',
  'assets/png/welcome.png',
  'assets/screenshots/home-narrow.png',
  'assets/screenshots/home-wide.png',
  'assets/splash/splash-1125x2436.png',
  'assets/splash/splash-1170x2532.png',
  'assets/splash/splash-1179x2556.png',
  'assets/splash/splash-1242x2208.png',
  'assets/splash/splash-1242x2688.png',
  'assets/splash/splash-1284x2778.png',
  'assets/splash/splash-1290x2796.png',
  'assets/splash/splash-1536x2048.png',
  'assets/splash/splash-1668x2224.png',
  'assets/splash/splash-1668x2388.png',
  'assets/splash/splash-2048x2732.png',
  'assets/splash/splash-640x1136.png',
  'assets/splash/splash-750x1334.png',
  'assets/splash/splash-828x1792.png',
  'assets/webp/avatar.webp',
  'assets/webp/avatar@2x.webp',
  'assets/webp/complete.webp',
  'assets/webp/complete@2x.webp',
  'assets/webp/correct.webp',
  'assets/webp/correct@2x.webp',
  'assets/webp/empty.webp',
  'assets/webp/empty@2x.webp',
  'assets/webp/goal.webp',
  'assets/webp/goal@2x.webp',
  'assets/webp/guide-mirrored.webp',
  'assets/webp/guide-mirrored@2x.webp',
  'assets/webp/guide.webp',
  'assets/webp/guide@2x.webp',
  'assets/webp/hint.webp',
  'assets/webp/hint@2x.webp',
  'assets/webp/home.webp',
  'assets/webp/home@2x.webp',
  'assets/webp/listen.webp',
  'assets/webp/listen@2x.webp',
  'assets/webp/offline.webp',
  'assets/webp/offline@2x.webp',
  'assets/webp/practice.webp',
  'assets/webp/practice@2x.webp',
  'assets/webp/ranking.webp',
  'assets/webp/ranking@2x.webp',
  'assets/webp/retry.webp',
  'assets/webp/retry@2x.webp',
  'assets/webp/return.webp',
  'assets/webp/return@2x.webp',
  'assets/webp/speak.webp',
  'assets/webp/speak@2x.webp',
  'assets/webp/streak.webp',
  'assets/webp/streak@2x.webp',
  'assets/webp/welcome.webp',
  'assets/webp/welcome@2x.webp',
  'catalogo.html',
  'data.js',
  'fern-academia/app.css',
  'fern-academia/app.mjs',
  'fern-academia/assets/avatar.webp',
  'fern-academia/assets/cheer.webp',
  'fern-academia/assets/games/canopy-grove.webp',
  'fern-academia/assets/games/fern-rally.webp',
  'fern-academia/assets/guide.webp',
  'fern-academia/assets/reader.webp',
  'fern-academia/core.mjs',
  'fern-academia/games/match.css',
  'fern-academia/games/match.mjs',
  'fern-academia/games/race-art.mjs',
  'fern-academia/games/race-model.mjs',
  'fern-academia/games/race-model.test.mjs',
  'fern-academia/games/race.css',
  'fern-academia/games/race.mjs',
  'fern-academia/index.html',
  'fern-academia/interview.mjs',
  'fern-academia/launcher.js',
  'fern-academia/views.mjs',
  'fern-ui.js',
  'fern.css',
  'firebase-sync.mjs',
  'manifest.webmanifest',
  'preview/catalog.js',
  'preview/preview.css',
  'preview/preview.js',
  'web/mascot-states.json',
  'web/mascot.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    // La navegación cache-first debe servir la página correcta: la Academy
    // tiene su propio index.html y sin esto siempre cargaría el de la app.
    const fallback = url.pathname.includes('/fern-academia/') ? 'fern-academia/index.html' : 'index.html';
    event.respondWith(
      caches.match(fallback).then(cached => cached || fetch(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match('index.html'));
    })
  );
});
