const CACHE = 'shiguang-photoreal-v8';
const ASSETS = [
  './', './index.html', './favicon.svg', './panorama.css', './panorama.js', './vendor/three.min.js',
  './assets/hero/courtyard-overlook.png',
  './assets/panoramas/courtyard-overlook-360.webp',
  './assets/panoramas/gate-entry.webp',
  './assets/panoramas/heart-tree.webp',
  './assets/panoramas/hall-threshold.webp',
  './assets/panoramas/hall-center.webp',
  './assets/panoramas/memory-wall.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
