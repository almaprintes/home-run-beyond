const CACHE='hrb-v41-20261124-procedural-vehicles';
const ASSETS=['./','./index.html','./style.css','./manifest.webmanifest','./src/main.js','./src/engine.js','./src/world.js','./src/biomes.js','./src/game.js','./src/logic.js','./src/audio.js','./src/rewarded.js','./src/aiming.js','./src/sprites.js','./src/traffic.js','./src/cosmetic-render.js','./src/cosmetic-catalog.js','./src/cosmetic-art.js','./src/baked-assets.js','./assets/baked/manifest.json','./src/impact-fx.js','./src/ball-visuals.js','./src/ball-spin.js','./assets/materials-atlas-v2.png',
 './assets/strike.mp3','./assets/baseball.webp',
 './assets/bat.webp','./assets/hit-spark.webp','./assets/swing-trail.webp',
 './assets/batter/ready.webp','./assets/batter/watch.webp','./assets/batter/loaded.webp',
 
 './assets/batter/contact.webp','./assets/batter/follow.webp',
 './icons/icon-192.png','./icons/icon-512.png',
 './style.css?v=0.41.0','./src/main.js?v=0.41.0','./src/game.js?v=0.41.0',
 './src/world.js?v=0.41.0','./src/biomes.js?v=0.41.0','./src/engine.js?v=0.41.0','./src/logic.js?v=0.41.0',
 './src/audio.js?v=0.41.0','./src/rewarded.js?v=0.41.0','./src/aiming.js?v=0.41.0',
 './src/sprites.js?v=0.41.0','./src/traffic.js?v=0.41.0','./src/cosmetic-render.js?v=0.41.0','./src/cosmetic-catalog.js?v=0.41.0','./src/cosmetic-art.js?v=0.41.0','./src/baked-assets.js?v=0.41.0','./src/impact-fx.js?v=0.41.0','./src/ball-visuals.js?v=0.41.0','./src/ball-spin.js?v=0.41.0','./assets/materials-atlas-v2.png?v=0.41.0','./assets/strike.mp3?v=0.41.0'];
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