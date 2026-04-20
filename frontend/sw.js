const CACHE='vt-v1', ASSETS=['/','/index.html','/app.js','/styles.css'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('fetch', e => {
  if(e.request.url.includes('/api/')) { e.respondWith(fetch(e.request).catch(()=>new Response(JSON.stringify({error:'offline'}), {status:503}))); return; }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});