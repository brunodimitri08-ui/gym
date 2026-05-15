const CACHE_NAME = "workout-cache-v3";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Install: cache iniziale
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: pulizia cache vecchie
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache first, fallback rete
self.addEventListener("fetch", event => {
  const request = event.request;

  // Ignora chiamate non GET (es. POST)
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Prova ad aggiornare in background
        fetch(request).then(response => {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
          });
        }).catch(() => {});
        return cachedResponse;
      }

      // Non in cache → vai in rete
      return fetch(request)
        .then(response => {
          // Metti in cache la risposta nuova
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // Fallback minimale se offline e non in cache
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
