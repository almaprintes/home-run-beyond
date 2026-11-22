const CACHE='hrb-v1-20261122-skillfix1';
const ASSETS=['./','./index.html','./style.css','./manifest.webmanifest','./src/main.js','./src/engine.js','./src/world.js','./src/game.js','./src/logic.js','./src/audio.js','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Las navegaciones usan la red primero para no dejar una versión antigua instalada en iOS.
// Los assets instalados permanecen disponibles offline mediante la caché versionada.
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){
  e.respondWith(fetch(e.request).then(r=>{
   if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}
   return r;
  }).catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html'))));
  return;
 }
 e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{
  if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(cache=>cache.put(e.request,copy)));}
  return r;
 })));
});