// Time Attendance App — Service Worker v1.2
const CACHE = 'ta-v2';   // bumped: forces every client to re-fetch index.html
const ASSETS = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // Cache each asset individually so one failure doesn't block all
      return Promise.allSettled(
        ASSETS.map(function(a) {
          return c.add(new Request(a, { cache: 'reload' }));
        })
      );
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Only handle GET requests to same origin
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      // Stale-while-revalidate: serve cache, update in background
      var fetchPromise = fetch(e.request).then(function(response) {
        if (response && response.status === 200 && response.type !== 'opaque') {
          // Clone IMMEDIATELY, synchronously, before the response body
          // can be consumed elsewhere. Cloning inside an async .then()
          // callback risks the body already being used by the time it runs.
          var responseToCache = response.clone();
          caches.open(CACHE).then(function(c) {
            c.put(e.request, responseToCache);
          });
        }
        return response;
      }).catch(function() { return cached; });

      return cached || fetchPromise;
    })
  );
});
