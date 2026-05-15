let CACHE_NAME = "workout-cache";

// Installazione: cache degli asset
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

// Attivazione
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Fetch con auto-update
self.addEventListener("fetch", event => {
  if (event.request.url.includes("version.json")) {
    return event.respondWith(fetch(event.request, { cache: "no-store" }));
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

// Messaggi dal client
self.addEventListener("message", event => {
  if (event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
