// service-worker.js - Versão atualizada
const CACHE = 'ac-transporte-v8';
const BASE = '/';
const OFFLINE_URL = BASE + 'offline.html';

const assets = [
  BASE,
  BASE + 'index.html',
  BASE + 'styles.css',
  BASE + 'app.js',
  BASE + 'firebase.js',
  BASE + 'Logo.jpg',
  BASE + 'avatar.png',
  BASE + 'manifest.json',
  OFFLINE_URL
];

// Instalação
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => {
        console.log('[Service Worker] Cache aberto');
        return cache.addAll(assets);
      })
      .then(() => {
        console.log('[Service Worker] Todos os recursos cacheados');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Falha ao fazer cache:', error);
      })
  );
});

// Ativação
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          if (name !== CACHE) {
            console.log('[Service Worker] Removendo cache antigo:', name);
            return caches.delete(name);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Cache limpo');
      return self.clients.claim();
    })
  );
});

// Fetch com estratégia cache-first para assets, network-first para dados
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Ignorar requisições não-GET e firestore
  if (event.request.method !== 'GET' || 
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebasestorage.googleapis.com')) {
    return;
  }
  
  // Para assets estáticos, usar cache-first
  if (assets.some(asset => url.pathname.endsWith(asset.replace(BASE, '')))) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          
          return fetch(event.request)
            .then(response => {
              // Verificar se a resposta é válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clonar a resposta para cache
              const responseToCache = response.clone();
              
              caches.open(CACHE)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            });
        })
        .catch(() => {
          // Se offline e navegação, mostrar página offline
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        })
    );
  } else {
    // Para outras requisições, network-first
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
