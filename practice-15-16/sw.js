const APP_SHELL_CACHE = 'app-shell-v2';
const DYNAMIC_CACHE = 'dynamic-content-v1';

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-16x16.png',
  '/icons/icon-32x32.png',
  '/icons/icon-64x64.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/icons/icon-512x512.png'
];

const DYNAMIC_PAGES = ['/content/home.html', '/content/about.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
      caches.open(DYNAMIC_CACHE).then((cache) => cache.addAll(DYNAMIC_PAGES))
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const stale = keys.filter((key) => key !== APP_SHELL_CACHE && key !== DYNAMIC_CACHE);
      return Promise.all(stale.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/content/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/content/home.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((networkResponse) => {
        const copy = networkResponse.clone();
        caches.open(APP_SHELL_CACHE).then((cache) => cache.put(event.request, copy));
        return networkResponse;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Новое уведомление', body: '' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-64x64.png'
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
