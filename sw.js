const CACHE = 'daily-rhythm-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Best-effort background check. Real reliability while the app is fully
// closed would need a push server (e.g. web-push + VAPID, or ntfy.sh) —
// this only fires while the browser process is alive (open tab, or the
// installed PWA recently active / periodic sync granted by Chrome).
async function checkDue() {
  const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
  clientsList.forEach((c) => c.postMessage({ type: 'CHECK_DUE' }));
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'ema-check') {
    event.waitUntil(checkDue());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title, {
      body,
      tag,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      renotify: true,
      requireInteraction: true,
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      if (clientsArr.length > 0) {
        clientsArr[0].focus();
        clientsArr[0].postMessage({ type: 'OPEN_SURVEY', tag: event.notification.tag });
      } else {
        self.clients.openWindow('./index.html');
      }
    })
  );
});
