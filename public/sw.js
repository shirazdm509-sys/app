// Service Worker - مرکز نشر آثار
const CACHE_NAME = 'nashr-asar-v9';
const STATIC_CACHE = 'nashr-static-v9';
const DYNAMIC_CACHE = 'nashr-dynamic-v9';

const STATIC_ASSETS = [
  '/',
  '/css/style.css',
  '/css/app.css',
  '/js/app.js',
  '/js/books.js',
  '/js/utils.js',
  '/js/offline.js',
  '/js/lectures.js',
  '/js/media.js',
  '/js/news.js',
  '/vendor/tailwind.js',
  '/vendor/fa/all.local.min.css',
  '/vendor/fa/webfonts/fa-solid-900.woff2',
  '/vendor/fa/webfonts/fa-regular-400.woff2',
  '/vendor/fa/webfonts/fa-brands-400.woff2',
  '/vendor/fonts/vazir/font-face-local.css',
  '/vendor/fonts/vazir/Vazir-Regular.woff2',
  '/vendor/fonts/vazir/Vazir-Bold.woff2',
  '/vendor/fonts/vazir/Vazir-Medium.woff2',
  '/vendor/fonts/shabnam/font-face-local.css',
  '/vendor/fonts/shabnam/Shabnam.woff2',
  '/vendor/fonts/shabnam/Shabnam-Bold.woff2',
];

function offlineResponse(msg) {
  return new Response(JSON.stringify({ error: msg || 'offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and chrome-extension
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // API calls - network only (no cache fallback for mutations)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => offlineResponse('api offline'))
    );
    return;
  }

  // WP API - network first with cache fallback
  if (url.hostname.includes('dastgheibqoba.info') && url.pathname.includes('/wp-json/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || offlineResponse('wp offline')))
    );
    return;
  }

  // Icons — always network first so new favicon uploads are immediately visible
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/logos/') || url.pathname.startsWith('/banners/') || url.pathname.startsWith('/sliders/')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(event.request).then(r => r || new Response('', { status: 404 })))
    );
    return;
  }

  // Static assets - cache first
  if (url.hostname !== self.location.hostname ||
      url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        }).catch(() => offlineResponse('static offline'));
      })
    );
    return;
  }

  // HTML pages - network first
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match('/').then(r => r || offlineResponse('page offline')))
  );
});

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch(e) { data = { title: 'مرکز نشر آثار', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'مرکز نشر آثار', {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-72.png',
      tag: data.tag || 'notif',
      data: data.data || { url: '/' },
      dir: 'rtl',
      lang: 'fa',
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
