self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Do nothing. Bypass completely.
});
