let CACHE_NAME = "workout-cache";

// Durante l'installazione, carica gli asset
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        "/gym/",
        "/gym/index.html",
        "/gym/style.css",
        "/gym/app.js",
        "/gym/manifest.json",
        "/gym/icon-192.png",
        "/gym/icon-512.png",
        "/gym/version.json"
      ]);
    })
  );
  self.skipWaiting();
});

// Attivazione: elimina vecchie cache se cambia la versione
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Fetch con auto-update della cache
self.addEventListener("fetch", event => {
  if (event.request.url.includes("version.json")) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
