// Cambia questo numero ogni volta che fai un update importante
const CACHE_NAME = "workout-cache-v1";

// File da mettere in cache
const ASSETS = [
  "/gym/",                // homepage su GitHub Pages
  "/gym/index.html",
  "/gym/style.css",
  "/gym/app.js",
  "/gym/manifest.json",
  "/gym/icon-192.png",
  "/gym/icon-512.png"
];

// Installazione: cache dei file
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // forza l'installazione immediata
});

// Attivazione: elimina vecchie cache
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // aggiorna subito le pagine aperte
});

// Fetch: network-first con fallback alla cache
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // aggiorna la cache con la nuova versione
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request)) // offline fallback
  );
});
