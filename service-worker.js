// service-worker.js
const CACHE = 'ac-transporte-v2';
const OFFLINE_URL = 'offline.html';

const assets = [
  '/',
  'index.html',
  'styles.css',
  'app.js',
  'logo.jpg',
  'avatar.png',
  'manifest.json',
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
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
  // Somente requisições GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retornar do cache se existir
        if (response) {
          return response;
        }

        // Tentar buscar da rede
        return fetch(event.request)
          .then(response => {
            // Se a resposta não for válida, retornar como está
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar resposta para armazenar no cache
            const responseToCache = response.clone();
            caches.open(CACHE)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Se offline e for uma página, mostrar offline.html
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // Para outros recursos, retornar erro simples
            return new Response('Offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});
