const CACHE_NAME = 'app-banca-v4';

// Recursos que queremos cachear - Corregidos según tu estructura de GitHub
const urlsToCache = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './favicon.ico',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalación del service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto y recursos cargados');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del service worker (Limpieza de versiones antiguas)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Responder a las peticiones de red
self.addEventListener('fetch', event => {
  // Ignorar peticiones que no son http o https (como extensiones o esquemas internos)
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Ignorar peticiones a servicios externos que no queremos cachear (n8n, Google Scripts, etc)
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si está en caché, lo devolvemos inmediatamente
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Si no está, intentamos buscarlo en la red
        return fetch(event.request)
          .then(response => {
            // No cacheamos si la respuesta no es válida o es de terceros
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonamos la respuesta para guardarla en cache y seguir sirviéndola
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // En caso de error total de red, devolvemos el index como fallback
            // Solo para peticiones de navegación (páginas)
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
