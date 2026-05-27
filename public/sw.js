/* Minimal service worker so Chrome can treat the site as installable (PWA). */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Keep this SW minimal and avoid unhandled promise rejections in dev.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => {
      // If network fetch fails (common during local dev restarts), return 503
      // instead of throwing an unhandled rejection in the service worker.
      return new Response('Service unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      });
    })
  );
});
