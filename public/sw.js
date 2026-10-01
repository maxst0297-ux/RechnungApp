/* RechnungApp – Service Worker: hält die App auf dem Handy bereit, auch wenn der Laptop gerade nicht erreichbar ist.
   Netz zuerst (Neues kommt sofort an), ohne Verbindung aus dem Zwischenspeicher. Daten laufen nie über den Zwischenspeicher –
   die liegen in der App-Datenbank des Geräts und werden beim Abgleich mit dem Laptop ausgetauscht.
   Versionskennung und Dateiliste setzt der Server beim Ausliefern ein. */
const VERSION = '__VERSION__';
const DATEIEN = __DATEIEN__;
const CACHE = 'rechnungapp-' + VERSION;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const netz = await Promise.race([fetch(e.request), new Promise((_, nein) => setTimeout(() => nein(new Error('Zeit')), 4000))]);
      if (netz.ok) cache.put(e.request, netz.clone());
      return netz;
    } catch {
      const treffer = (await cache.match(e.request, { ignoreSearch: true })) || (e.request.mode === 'navigate' ? await cache.match('/') : null);
      return treffer || Response.error();
    }
  })());
});
