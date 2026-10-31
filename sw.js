const CACHE_NAME = 'barbearia-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './anuncio.mp4',
  './almoco1.mp4',
  'https://fonts.googleapis.com/css2?family=Kanit:wght@400;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalação do Service Worker e Cache dos Arquivos Estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Ativação e Limpeza de Caches Antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepção de Requisições de Rede (Network First para Planilha, Cache First para Mídia/HTML)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Se for a planilha do Google Sheets, tenta a rede primeiro
  if (url.hostname.includes('docs.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Se a rede falhar (Off-line), retorna resposta vazia sem crashar
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // Para todo o resto (CSS, Vídeos, Fontes, HTML), entrega do Cache e atualiza em background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualiza o cache em segundo plano sem travar a exibição
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Modo offline ativo */});
        
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
