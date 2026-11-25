const CACHE='hrb-v77-20261125-baguette-art-approved-sports-8';
const ASSETS=['./','./index.html','./style.css','./manifest.webmanifest','./src/main.js','./src/gulls.js','./src/pitcher.js','./src/engine.js','./src/world.js','./src/biomes.js','./src/game.js','./src/logic.js','./src/audio.js','./src/rewarded.js','./src/aiming.js','./src/sprites.js','./src/traffic.js','./src/discoveries.js','./src/cosmetic-render.js','./src/cosmetic-catalog.js','./src/cosmetic-art.js','./src/baked-assets.js','./assets/baked/manifest.json','./src/impact-fx.js','./src/ball-visuals.js','./src/ball-spin.js','./assets/materials-atlas-v2.png',
 './assets/strike.mp3','./assets/audio/bat-cgeffex.wav','./assets/baseball.webp',
 './assets/bat.webp','./assets/hit-spark.webp','./assets/swing-trail.webp',
 './assets/batter/ready.webp','./assets/batter/watch.webp','./assets/batter/loaded.webp',
 
 './assets/batter/contact.webp','./assets/batter/follow.webp',
 './icons/icon-32.png','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png',
 './icons/icon-32.png?v=0.77.0','./icons/icon-180.png?v=0.77.0','./icons/icon-192.png?v=0.77.0','./icons/icon-512.png?v=0.77.0',
 './manifest.webmanifest?v=0.77.0','./style.css?v=0.77.0','./src/main.js?v=0.77.8','./src/game.js?v=0.77.8',
 './src/gulls.js?v=0.77.8','./src/pitcher.js?v=0.77.8','./src/world.js?v=0.77.8','./src/biomes.js?v=0.77.8','./src/engine.js?v=0.77.8','./src/logic.js?v=0.77.8',
 './src/audio.js?v=0.77.8','./src/rewarded.js?v=0.77.8','./src/aiming.js?v=0.77.8',
 './src/sprites.js?v=0.77.8','./src/traffic.js?v=0.77.8','./src/discoveries.js?v=0.77.8','./src/cosmetic-render.js?v=0.77.8','./src/cosmetic-catalog.js?v=0.77.8','./src/cosmetic-art.js?v=0.77.8','./src/baked-assets.js?v=0.77.8','./src/impact-fx.js?v=0.77.8','./src/ball-visuals.js?v=0.77.8','./src/ball-spin.js?v=0.77.8','./assets/materials-atlas-v2.png?v=0.77.0','./assets/strike.mp3?v=0.77.0','./assets/audio/bat-cgeffex.wav?v=0.77.0'];
const OPTIONAL_AUDIO=[
 './assets/audio/bat-cgeffex.mp3?v=0.77.0',
 './assets/audio/asphalt-ball.mp3?v=0.77.0',
 './assets/audio/wall-ball.mp3?v=0.77.0'
];
// Las grabaciones CC0 no deben impedir la instalación si Freesound
// falla durante la compilación; los originales de PCM sí son obligatorios.
self.addEventListener('install',e=>e.waitUntil(
 caches.open(CACHE).then(async cache=>{
  await cache.addAll(ASSETS.map(path=>new Request(path,{cache:'reload'})));
  await Promise.allSettled(OPTIONAL_AUDIO.map(path=>cache.add(path)));
  // Las 100 miniaturas reales también están disponibles sin red.
  const manifestResponse=await cache.match('./assets/baked/manifest.json');
  const manifest=await manifestResponse.json();
  const previews=[
   ...manifest.bats.map(id=>'./assets/baked/bats/'+id+'.webp'),
   ...manifest.outfits.map(id=>'./assets/baked/outfits/'+id+'/ready.webp'),
   ...manifest.balls.map(id=>'./assets/baked/balls/'+id+'.webp')
  ];
  if(previews.length!==100)throw Error('Catálogo incompleto');
  for(let i=0;i<previews.length;i+=12)await cache.addAll(previews.slice(i,i+12).map(p=>p+(/\/balls\/(?:naranja|nieve)\.webp$/.test(p)?'?v=0.77.8':/\/outfits\/(?:hockey_hielo|basket_rojo)\/ready\.webp$/.test(p)?'?v=0.77.6':/\/bats\/(?:escoba|platano)\.webp$/.test(p)?'?v=0.77.5':/\/outfits\/(?:basket_negro|atletismo|tenis_blanco)\/ready\.webp$/.test(p)?'?v=0.77.4':/\/(?:balls\/(?:tenis|arcoiris)\.webp|bats\/(?:nova|paraguas)\.webp)$/.test(p)?'?v=0.77.3':p.includes('/outfits/futbol_verde/')?'?v=0.77.2':p.includes('/outfits/futbol_rojo/')?'?v=0.77.1':'?v=0.77.0')));
 }).then(()=>self.skipWaiting())
));
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
   if(!response.ok){const cached=await caches.match(request);if(cached)return cached;}
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