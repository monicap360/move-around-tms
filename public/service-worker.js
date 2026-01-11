self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Basic offline fallback (optional)
  // event.respondWith(
  //   caches.match(event.request).then(response => response || fetch(event.request))
  // );
});
