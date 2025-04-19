// Versão do cache - atualize para forçar nova instalação
const CACHE_VERSION = 'v4';
const CACHE_NAME = `cantinho-do-pet-${CACHE_VERSION}`;

// Assets para cache inicial
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/relatorio.js',
  '/manifest.json',
  
  // Assets locais
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/logo/WhatsApp Image 2025-04-18 at 15.16.34.jpeg',
  '/assets/dev-logo.png',
  
  // CDNs externas
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.8/main.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js'
];

// Estratégia: Cache First, falling back to network
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  return cachedResponse || fetch(request);
};

// Estratégia: Network First, falling back to cache
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    return await caches.match(request);
  }
};

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[Service Worker] Cache aberto');
      
      try {
        await cache.addAll(PRECACHE_ASSETS);
        console.log('[Service Worker] Assets pré-cacheados');
      } catch (error) {
        console.error('[Service Worker] Falha ao cachear alguns assets:', error);
      }
    })()
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
      console.log('[Service Worker] Ativado e pronto para controlar fetches!');
    })()
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições que não são GET
  if (request.method !== 'GET') return;

  // Páginas e rotas principais - Network First
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets estáticos - Cache First
  if (
    PRECACHE_ASSETS.some(asset => url.pathname === asset) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // CDNs externas - Cache First com atualização em background
  if (
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(
      (async () => {
        // Retorna do cache imediatamente
        const cachedResponse = await caches.match(request);
        
        // Atualiza o cache em background
        if (navigator.onLine) {
          fetch(request).then(async (response) => {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response);
          });
        }
        
        return cachedResponse || fetch(request);
      })()
    );
    return;
  }

  // Padrão: Network First para outras requisições
  event.respondWith(networkFirst(request));
});

// Mensagens para atualização em background
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});