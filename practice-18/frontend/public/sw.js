const APP_SHELL_CACHE = "techmarket-app-shell-v1";
const DYNAMIC_CACHE = "techmarket-dynamic-v1";
const IS_DEV = self.location.hostname === "localhost" && self.location.port === "3001";
const APP_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-16x16.png",
  "/icons/icon-32x32.png",
  "/icons/icon-64x64.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-256x256.png",
  "/icons/icon-512x512.png"
];

self.addEventListener("install", (event) => {
  if (IS_DEV) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  if (IS_DEV) {
    event.waitUntil(self.clients.claim());
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key !== APP_SHELL_CACHE && key !== DYNAMIC_CACHE)
      .map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (IS_DEV) return;
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "ТехМаркет", body: "Новое уведомление", reminderId: null };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-64x64.png",
    data: { reminderId: data.reminderId || null }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  const reminderId = event.notification?.data?.reminderId;
  if (reminderId) {
    event.waitUntil(
      fetch(`/api/reminders/dismiss?reminderId=${reminderId}`, { method: "POST" })
        .catch(() => {})
        .finally(() => event.notification.close())
    );
  }
  event.notification.close();
});

self.addEventListener("notificationclose", (event) => {
  const reminderId = event.notification?.data?.reminderId;
  if (!reminderId) return;
  event.waitUntil(
    fetch(`/api/reminders/dismiss?reminderId=${reminderId}`, { method: "POST" }).catch(() => {})
  );
});
