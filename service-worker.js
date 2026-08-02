
const CACHE = 'dh-hanguk-v10.2-web-upgrade';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js','js/v9-features.js','js/v10-features.js',
  'migration.js',
  'cards.json',
  'lessons.json',
  'manifest.webmanifest',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const acceptsHtml = request.headers.get('accept')?.includes('text/html');
        if (acceptsHtml) return caches.match('index.html');

        return new Response('Offline resource unavailable', { status: 503 });
      })
  );
});
