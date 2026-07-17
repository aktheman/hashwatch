const CACHE = 'hashwatch-v3';
const API_CACHE = 'hashwatch-api-v2';
const STATIC_ASSETS = ['/', '/index.html', '/offline.html'];
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  const KEEP = [CACHE, API_CACHE];
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const networkRes = await fetch(request);
          if (networkRes.ok) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          const cached = await cache.match(request);
          return cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) {
          fetch(request).then((res) => {
            if (res.ok) {
              caches.open(CACHE).then((c) => c.put(request, res));
            }
          }).catch(() => {});
          return cached;
        }
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        } catch {
          if (request.mode === 'navigate') {
            const offlinePage = await caches.match('/offline.html');
            return offlinePage || new Response('Offline', { status: 503 });
          }
          return new Response('', { status: 503 });
        }
      }),
    );
  }
});

self.addEventListener('push', (e) => {
  let data = { title: 'HashWatch', body: '', icon: '/assets/icon.png', badge: '/assets/favicon.png' };
  if (e.data) {
    try {
      data = { ...data, ...e.data.json() };
    } catch {
      data.body = e.data.text();
    }
  }
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: 'hashwatch-alert',
    renotify: true,
    silent: false,
    data: data.data || {},
    requireInteraction: true,
  };
  if (Array.isArray(data.actions) && data.actions.length > 0) {
    options.actions = data.actions;
  }
  e.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const action = e.action;
  const data = e.notification.data || {};

  if (action === 'dismiss') return;

  let urlToOpen = new URL('/', self.location.origin).href;
  if (action === 'view_miner' && data.url) {
    urlToOpen = new URL(data.url, self.location.origin).href;
  } else if (data.url) {
    urlToOpen = new URL(data.url, self.location.origin).href;
  }

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

self.addEventListener('sync', (e) => {
  if (e.tag === 'hashwatch-reconnect') {
    e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({ type: 'SW_RECONNECT' });
        }
      }),
    );
  }
});
