
import {Renderer} from './engine.js?v=0.77.53';
import {drawWorld,buildingAt,buildingBoxes,fountainParts,stadiumFenceParts,stadiumContainers,stadiumContainerParts,areaAt} from './world.js?v=0.77.53';
import {visibleRoadTraffic,trafficCollisionParts} from './traffic.js?v=0.77.53';
import {WORLD_CENTER_X,WORLD_HALF_WIDTH} from './biomes.js?v=0.77.53';

export const STUDIO_HOLD_MS=7000;
export const STUDIO_EXPORT={start:-100,end:2000,width:600,tileHeight:350,pixelsPerMeter:2};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function mapPoint(x,z,view,w,h){
 const scale=h/view.height;
 return [w/2+(view.x-x)*scale,h/2+(view.z-z)*scale];
}
export function exportTiles(){
 const {start,end,width,tileHeight,pixelsPerMeter:p}=STUDIO_EXPORT;
 return Array.from({length:(end-start)/tileHeight},(_,i)=>({x:WORLD_CENTER_X,z:end-(i+.5)*tileHeight,height:tileHeight,pixelWidth:width*p,pixelHeight:tileHeight*p,offset:i*tileHeight*p}));
}
// No authentication claim: a seven-second gesture deliberately hides the tool in the public PWA.
export function bindStudioHold(node,open,clock=globalThis){
 let timer=null,active=null;
 const clear=()=>{if(timer!==null)clock.clearTimeout(timer);timer=null;active=null;node.classList?.remove('ws-holding')};
 const begin=(kind,id,x,y)=>{
  if(active)return;
  active={kind,id,x,y};node.classList?.add('ws-holding');
  timer=clock.setTimeout(()=>{clear();open()},STUDIO_HOLD_MS);
 };
 const move=(kind,id,x,y)=>{
  if(active?.kind===kind&&active.id===id&&Math.hypot(x-active.x,y-active.y)>(kind==='touch'?30:12))clear();
 };
 node.addEventListener('touchstart',e=>{
  if(e.cancelable!==false)e.preventDefault();
  if(e.touches.length!==1){clear();return}
  const t=e.touches[0];begin('touch',t.identifier,t.clientX,t.clientY);
 },{passive:false});
 node.addEventListener('touchmove',e=>{
  if(e.cancelable!==false)e.preventDefault();
  if(active?.kind!=='touch')return;
  if(e.touches.length!==1){clear();return}
  const t=Array.from(e.touches).find(t=>t.identifier===active.id);
  if(!t){clear();return}
  move('touch',t.identifier,t.clientX,t.clientY);
 },{passive:false});
 for(const type of ['touchend','touchcancel'])node.addEventListener(type,e=>{
  if(e.cancelable!==false)e.preventDefault();
  if(active?.kind==='touch'&&(!Array.from(e.touches||[]).some(t=>t.identifier===active.id)||type==='touchcancel'))clear();
 },{passive:false});
 node.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||e.button!==0||active)return;
  e.preventDefault();begin('pointer',e.pointerId,e.clientX,e.clientY);
  try{node.setPointerCapture?.(e.pointerId)}catch{}
 });
 node.addEventListener('pointermove',e=>move('pointer',e.pointerId,e.clientX,e.clientY));
 for(const type of ['pointerup','pointercancel','lostpointercapture'])node.addEventListener(type,e=>{
  if(active?.kind==='pointer'&&active.id===e.pointerId)clear();
 });
 for(const type of ['contextmenu','dragstart','selectstart'])node.addEventListener(type,e=>e.preventDefault());
 return clear;
}

export function installWorldStudio(game){
 let studio=null;
 const open=()=>{if(!['menu','ready','rest'].includes(game.state))return;studio??=new WorldStudio(game);studio.open()};
 const cancels=[...document.querySelectorAll('#hud .brand,.menu-brand,.menu-title h1')].map(node=>bindStudioHold(node,open));
 window.addEventListener('blur',()=>cancels.forEach(cancel=>cancel()));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancels.forEach(cancel=>cancel())});
}

class WorldStudio{
 constructor(game){
  this.game=game;this.view={x:WORLD_CENTER_X,z:230,height:650};this.pointers=new Map();this.busy=false;this.url=null;
  const panel=document.createElement('section');panel.className='world-studio';panel.hidden=true;
  panel.setAttribute('aria-label','World Studio · herramientas de desarrollo');
  panel.innerHTML='<header class="ws-head"><div><strong>WORLD STUDIO</strong><small>HOME RUN BEYOND · MAPA REAL</small></div><button class="ws-button" data-ws="close">Cerrar ×</button></header>'+
   '<div class="ws-map"><canvas aria-label="Vista cenital del mundo"></canvas><canvas aria-hidden="true"></canvas><div class="ws-info"></div><div class="ws-scale">100 m</div></div>'+
   '<div class="ws-controls"><div class="ws-row"><button class="ws-button" data-ws="home">Estadio</button><button class="ws-button" data-ws="out">−</button><button class="ws-button" data-ws="in">+</button><label>Distancia <input data-ws="jump" type="number" min="0" max="200000" step="50" value="230" inputmode="numeric"/> m</label></div>'+
   '<div class="ws-row"><label><input data-ws="collisions" type="checkbox"/> Colisiones</label><button class="ws-button ws-primary" data-ws="capture">PNG visible</button><button class="ws-button ws-primary" data-ws="full">PNG 0–2 km</button></div><div class="ws-row"><button class="ws-button ws-primary ws-test" data-ws="test" aria-pressed="false">Desbloquear y adquirir todo</button></div><div class="ws-status" role="status">Arrastra para explorar · pellizca para ampliar</div></div>';
  document.getElementById('app').append(panel);this.panel=panel;this.map=panel.querySelector('.ws-map');
  [this.canvas,this.overlay]=this.map.querySelectorAll('canvas');
  this.status=panel.querySelector('.ws-status');this.info=panel.querySelector('.ws-info');this.scale=panel.querySelector('.ws-scale');
  this.jump=panel.querySelector('[data-ws=jump]');this.collisions=panel.querySelector('[data-ws=collisions]');
  const button=(id,fn)=>panel.querySelector('[data-ws='+id+']').addEventListener('click',fn);
  button('close',()=>this.close());button('home',()=>{this.view={x:WORLD_CENTER_X,z:230,height:650};this.render()});
  button('in',()=>this.zoom(.75));button('out',()=>this.zoom(1/.75));
  button('capture',()=>this.export(false));button('full',()=>this.export(true));
  this.testButton=panel.querySelector('[data-ws=test]');
  button('test',()=>this.toggleCatalogTest());
  this.jump.addEventListener('change',()=>{this.view.z=clamp(Number(this.jump.value)||0,0,200000);this.render()});
  this.collisions.addEventListener('change',()=>this.render());
  this.map.addEventListener('pointerdown',e=>{
   if(this.busy)return;e.preventDefault();this.map.setPointerCapture?.(e.pointerId);
   this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  });
  this.map.addEventListener('pointermove',e=>{
   if(this.busy||!this.pointers.has(e.pointerId))return;
   const old=[...this.pointers.values()],before=this.pointers.get(e.pointerId),next={x:e.clientX,y:e.clientY};
   this.pointers.set(e.pointerId,next);
   const m=this.view.height/Math.max(1,this.map.clientHeight);
   if(old.length===1){this.view.x+= (next.x-before.x)*m;this.view.z+=(next.y-before.y)*m;}
   else if(old.length===2){const now=[...this.pointers.values()],a=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y),b=Math.hypot(now[0].x-now[1].x,now[0].y-now[1].y);
    if(a>8&&b>8)this.view.height*=a/b;
    this.view.x+=(now[0].x+now[1].x-old[0].x-old[1].x)*m/2;
    this.view.z+=(now[0].y+now[1].y-old[0].y-old[1].y)*m/2;
   }this.render();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])this.map.addEventListener(type,e=>this.pointers.delete(e.pointerId));
  this.map.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(e.deltaY*.001))},{passive:false});
  window.addEventListener('resize',()=>this.render());
 }
 open(){
  if(!this.panel.hidden)return;
  this.priorStopped=this.game.stopped;this.game.stopped=true;this.time=this.game.clock||0;
  this.panel.hidden=false;this.status.textContent='Arrastra para explorar · pellizca para ampliar';this.syncCatalogTest();
  try{this.renderer??=new Renderer(this.canvas)}catch(e){this.status.textContent='WebGL2 no disponible: '+e.message;return}
  this.renderer.dpr=Math.min(2,window.devicePixelRatio||1);
  const opened=++this.openToken||1;this.openToken=opened;
  const repaint=()=>{if(this.panel.hidden||this.openToken!==opened)return;this.render();if(!this.renderer.textureReady&&performance.now()<until)requestAnimationFrame(repaint)};
  const until=performance.now()+2500;
  requestAnimationFrame(repaint);
 }
 syncCatalogTest(){
  const active=this.game.catalogTestActive;
  this.testButton.textContent=active?'Salir de pruebas · restaurar partida':'Desbloquear y adquirir todo';
  this.testButton.setAttribute('aria-pressed',String(active));
 }
 toggleCatalogTest(){
  if(this.busy)return;
  const enable=!this.game.catalogTestActive;
  if(!this.game.setCatalogTestMode(enable)){this.status.textContent='Espera a terminar la acción en curso.';return}
  this.syncCatalogTest();
  this.status.textContent=enable?'Modo pruebas: catálogo completo, sin gastar monedas. Cierra y abre la tienda.':'Partida real restaurada.';
 }
 close(){
  if(this.busy)return;
  this.panel.hidden=true;this.pointers.clear();this.game.stopped=this.priorStopped;
  if(this.url){URL.revokeObjectURL(this.url);this.url=null}
 }
 zoom(factor){if(this.busy)return;this.view.height*=factor;this.render()}
 render(){
  if(this.panel.hidden||!this.renderer||this.busy)return;
  this.view.x=clamp(this.view.x,WORLD_CENTER_X-WORLD_HALF_WIDTH,WORLD_CENTER_X+WORLD_HALF_WIDTH);
  this.view.z=clamp(this.view.z,-100,200000);this.view.height=clamp(this.view.height,90,740);
  this.draw(this.view);
  const w=this.canvas.width,h=this.canvas.height;this.overlay.width=w;this.overlay.height=h;
  if(this.collisions.checked)this.drawCollisions(this.overlay.getContext('2d'),this.view,w,h);
  if(document.activeElement!==this.jump)this.jump.value=Math.round(this.view.z);
  this.info.textContent=areaAt(this.view.z)+' · '+Math.round(this.view.z)+' m · VISTA '+Math.round(this.view.height)+' m';
  this.scale.style.width=(100*this.map.clientHeight/this.view.height)+'px';
 }
 draw(view,pixelWidth,pixelHeight){
  const cam=[view.x,500,view.z],target=[view.x,0,view.z];
  drawWorld(this.renderer,cam,{state:'flight',worldStudio:true,clock:this.time,ball:null});
  this.renderer.render(cam,target,60,{heightMeters:view.height,pixelWidth,pixelHeight});
 }
 drawCollisions(ctx,view,w,h){
  const scale=h/view.height;
  const path=(x,z,ww,dd,yaw=0)=>{
   const co=Math.cos(yaw),si=Math.sin(yaw);ctx.beginPath();
   for(const [i,[u,v]] of [[-ww/2,-dd/2],[ww/2,-dd/2],[ww/2,dd/2],[-ww/2,dd/2]].entries()){
    const p=mapPoint(x+co*u+si*v,z-si*u+co*v,view,w,h);
    if(i)ctx.lineTo(...p);else ctx.moveTo(...p);
   }ctx.closePath();ctx.stroke();
  };
  ctx.save();ctx.lineWidth=Math.max(1,scale*.45);ctx.strokeStyle='#ffdd66';
  for(let j=0;j<=24;j++)for(let i=-4;i<=4;i++){
   const b=buildingAt(i,j);if(!b||Math.abs(b.z-view.z)>view.height/2+50)continue;
   for(const part of buildingBoxes(b).slice(0,2)){const [x,,z]=part.min,[xx,,zz]=part.max;path((x+xx)/2,(z+zz)/2,xx-x,zz-z)}
  }
  ctx.strokeStyle='#ff856b';
  for(const p of fountainParts())path(p.x,p.z,p.w,p.d);
  if(view.z-view.height/2<155){
   for(const p of stadiumFenceParts())path(p.x,p.z,p.w,p.d,p.yaw);
   for(const c of stadiumContainers())for(const p of stadiumContainerParts())path(c.x,c.z,p.w,p.d,c.yaw);
  }
  ctx.strokeStyle='#70eaff';
  for(const car of visibleRoadTraffic(view.z,this.time,410)){
   if(Math.abs(car.x)>284)continue;
   for(const p of trafficCollisionParts(car)){const [x,,z]=p.min,[xx,,zz]=p.max;path(car.x+(x+xx)/2,car.z+(z+zz)/2,xx-x,zz-z)}
  }
  ctx.restore();
 }
 async export(full){
  if(this.busy||!this.renderer)return;
  this.busy=true;this.status.textContent=full?'Componiendo mapa real de 0–2 km…':'Preparando PNG…';
  try{
   const out=document.createElement('canvas'),ctx=out.getContext('2d');
   if(full){
    const s=STUDIO_EXPORT;out.width=s.width*s.pixelsPerMeter;out.height=(s.end-s.start)*s.pixelsPerMeter;
    for(const tile of exportTiles()){
     this.draw(tile,tile.pixelWidth,tile.pixelHeight);
     ctx.drawImage(this.canvas,0,tile.offset);
     if(this.collisions.checked){ctx.save();ctx.translate(0,tile.offset);ctx.beginPath();ctx.rect(0,0,tile.pixelWidth,tile.pixelHeight);ctx.clip();this.drawCollisions(ctx,tile,tile.pixelWidth,tile.pixelHeight);ctx.restore()}
     await new Promise(resolve=>requestAnimationFrame(resolve));
    }
   }else{
    this.draw(this.view);out.width=this.canvas.width;out.height=this.canvas.height;ctx.drawImage(this.canvas,0,0);
    if(this.collisions.checked)this.drawCollisions(ctx,this.view,out.width,out.height);
   }
   const blob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(Error('PNG vacío')),'image/png'));
   if(this.url)URL.revokeObjectURL(this.url);this.url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=this.url;a.download=full?'hrb-world-0-2000m.png':'hrb-world-'+Math.round(this.view.z)+'m.png';
   a.textContent='Guardar PNG · '+out.width+' × '+out.height;a.style.color='#ffdc8f';a.style.pointerEvents='auto';
   this.status.replaceChildren(a);
   // iOS can use the explicit link on a fresh user gesture after the async export.
  }catch(e){this.status.textContent='No se pudo exportar: '+e.message}
  finally{this.busy=false;this.render()}
 }
}
