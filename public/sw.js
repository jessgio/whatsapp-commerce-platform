/* This app is not a PWA. Browsers still request /sw.js if another project on
   this origin (often localhost:3000) registered a worker. Unregister leftovers. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => {
        clients.forEach((client) => {
          if ("navigate" in client) client.navigate(client.url);
        });
      }),
  );
});
