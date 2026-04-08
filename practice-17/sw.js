const APP_SHELL_CACHE = 'app-shell-v4';
const DYNAMIC_CACHE = 'dynamic-content-v3';
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
self.addEventListener('notificationclick', (event) => {
  const { notification, action } = event;
  if (action === 'snooze') {
    const reminderId = notification.data && notification.data.reminderId;
    if (!reminderId) {
      notification.close();
      return;
    }
    event.waitUntil(
      fetch(`/snooze?reminderId=${reminderId}`, { method: 'POST' })
        .then(async (response) => {
          notification.close();
          const { newReminderTime } = await response.json();
          const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of allClients) {
            client.postMessage({
              type: 'SNOOZE_UPDATED',
              reminderId,
              newReminderTime
            });
          }
        })
        .catch((error) => {
          console.error('Snooze failed:', error);
          notification.close();
        })
    );
    return;
  }
  const reminderId = notification.data && notification.data.reminderId;
  if (reminderId) {
    event.waitUntil(
      fetch(`/dismiss?reminderId=${reminderId}`, { method: 'POST' })
        .then(async () => {
          const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of allClients) {
            client.postMessage({
              type: 'DISMISS_REMINDER',
              reminderId
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          notification.close();
        })
    );
  } else {
    notification.close();
  }
});
self.addEventListener('notificationclose', (event) => {
  const { notification } = event;
  const reminderId = notification.data && notification.data.reminderId;
  if (reminderId) {
    event.waitUntil(
      fetch(`/dismiss?reminderId=${reminderId}`, { method: 'POST' })
        .then(async () => {
          const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of allClients) {
            client.postMessage({
              type: 'DISMISS_REMINDER',
              reminderId
            });
          }
        })
        .catch(() => {})
    );
  }
});
self.addEventListener('push', (event) => {
  let data = { title: 'Новое уведомление', body: '', reminderId: null };
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
    badge: '/icons/icon-64x64.png',
    data: {
      reminderId: data.reminderId || null
    }
  };
  if (data.reminderId) {
    options.actions = [{ action: 'snooze', title: 'Отложить на 5 минут' }];
  }
  event.waitUntil(self.registration.showNotification(data.title, options));
});