const CACHE = 'robot-lab-shell-v12';
const ASSETS = [
  './',
  './index.html',
  './styles-v12.css',
  './app-v12.js',
  './config-v12.js',
  './robotlab-v12.webmanifest',
  './robot-main.jpg',
  './robotlab-v12-192.png',
  './robotlab-v12-512.png',
  './robotlab-v12-maskable-512.png'
];
self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;})
      .catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
  );
});
