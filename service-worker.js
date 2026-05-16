// ======================================================
// SERVICE WORKER — VERSIONE STABILE PER iOS + IndexedDB
// ======================================================

const CACHE_NAME = "workout-static-v1";

// File statici da mettere in cache
const ASSETS = [
  "/gym/",
  "/gym/index.html",
  "/gym/style.css",
  "/gym/app.js",
  "/gym/manifest.json",
  "/gym/icon-192.png",
  "/gym/icon-512.png"
];

// Installazione SW
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Attivazione SW
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Strategia: NETWORK FIRST → FALLBACK CACHE
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Aggiorna la cache con la nuova versione
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
