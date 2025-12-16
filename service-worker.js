// service-worker.js
const CACHE = 'ac-transporte-v3';
const BASE = '/teste03/';
const OFFLINE_URL = BASE + 'offline.html';

const assets = [
  BASE,
  BASE + 'index.html',
  BASE + 'styles.css',
  BASE + 'js/app.js',
  BASE + 'logo.jpg',
  BASE + 'avatar.png',
  BASE + 'manifest.json',
  OFFLINE_URL
];

// Instalação
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(assets))
      .then(() => self.skipWaiting())
  );
});

// Ativação
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.map(name => {
          if (name !== CACHE) return caches.delete(name);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});
