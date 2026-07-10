const CACHE = 'hashwatch-v2';
const ASSETS = ['/', '/index.html'];
const API_CACHE = 'hashwatch-api-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all(
      ['hashwatch-v1', 'hashwatch-api-v1'].map((name) =>
        caches.keys().then((keys) =>
          Promise.all(keys.filter((k) => k !== CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
        )
      )
    )
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((res) => {
          cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      }),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(request, clone));
        return res;
      })),
    );
  }
});

self.addEventListener('push', (e) => {
  let data = { title: 'HashWatch', body: '', icon: '/favicon.ico', badge: '/favicon.ico' };
  if (e.data) {
    try {
      data = { ...data, ...e.data.json() };
    } catch {
      data.body = e.data.text();
    }
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: 'hashwatch-alert',
      renotify: true,
      silent: false,
      data: data.data || {},
      requireInteraction: true,
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const urlToOpen = new URL('/', self.location.origin).href;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});
