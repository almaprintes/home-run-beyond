const CACHE='hrb-v12-20261122-atomic-assets-refresh';
const ASSETS=['./','./index.html','./style.css','./manifest.webmanifest','./src/main.js','./src/engine.js','./src/world.js','./src/game.js','./src/logic.js','./src/audio.js','./src/rewarded.js','./src/aiming.js','./src/sprites.js',
 './assets/baseball.webp','./assets/aim-left.webp','./assets/aim-center.webp','./assets/aim-right.webp',
 './assets/bat.webp','./assets/hit-spark.webp','./assets/swing-trail.webp',
 './assets/batter/ready.webp','./assets/batter/watch.webp','./assets/batter/loaded.webp',
 './assets/batter/aim-left.webp','./assets/batter/aim-center.webp','./assets/batter/aim-right.webp',
 './assets/batter/contact.webp','./assets/batter/follow.webp',
 './icons/icon-192.png','./icons/icon-512.png',
 './style.css?v=0.12.0','./src/main.js?v=0.12.0','./src/game.js?v=0.12.0',
 './src/world.js?v=0.12.0','./src/engine.js?v=0.12.0','./src/logic.js?v=0.12.0',
 './src/audio.js?v=0.12.0','./src/rewarded.js?v=0.12.0','./src/aiming.js?v=0.12.0',
 './src/sprites.js?v=0.12.0'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Red primero PARA TODOS LOS ASSETS: una PWA instalada nunca debe mezclar
// HTML v12 con CSS/JS de v10. La copia precargada sigue funcionando sin conexión.
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  try{
   const response=await fetch(request,{cache:'no-store'});
   if(response.ok){
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));
   }
   return response;
  }catch(err){
   const cached=await caches.match(request);
   if(cached)return cached;
   if(request.mode==='navigate'){
    const offline=await caches.match('./index.html');
    if(offline)return offline;
   }
   return Response.error();
  }
 })());
});