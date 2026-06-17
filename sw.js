// Time Attendance App — Service Worker v1.0
// Cache-first strategy for offline support

const CACHE_NAME = 'ta-app-v1';
const CORE_ASSETS = [
  './time-attendance.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: cache core assets
self.addEventListener('install', function(e){
  console.log('[SW] Install');
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    }).then(function(){
      return self.skipWaiting(); // activate immediately
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function(e){
  console.log('[SW] Activate');
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim(); // take control immediately
    })
  );
});

// Fetch: cache-first, network fallback
self.addEventListener('fetch', function(e){
  // Skip cross-origin requests (Apps Script, CDN etc.)
  if(!e.request.url.startsWith(self.location.origin)){
    return;
  }
  // Skip non-GET
  if(e.request.method !== 'GET'){
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached){
        // Serve from cache, update in background
        var networkFetch = fetch(e.request).then(function(response){
          if(response && response.status === 200){
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache){
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function(){ /* offline — cached already served */ });
        return cached;
      }
      // Not in cache: fetch from network and cache it
      return fetch(e.request).then(function(response){
        if(!response || response.status !== 200){
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(e.request, clone);
        });
        return response;
      });
    })
  );
});
