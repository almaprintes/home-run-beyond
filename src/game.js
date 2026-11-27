import {equipmentBonuses} from './cosmetic-catalog.js?v=0.77.71';
import {Renderer,CanvasRenderer,lerp} from './engine.js?v=0.77.71';
import {drawWorld,groundAt,surfaceBelowBall,areaAt,traceBuildingCollision,traceFountainCollision,traceStadiumContainerCollision,traceStadiumFenceCollision} from './world.js?v=0.77.71';
import {traceSideBoundary,WORLD_CENTER_X,WORLD_HALF_WIDTH} from './biomes.js?v=0.77.71';
import {CAR_REWARD,GULL_REWARD,SAVE_KEY,sanitizeSave,initialSave,createCatalogTestSave,formatInt,upgradeCost,upgrade,bonusCredits,bonusProgress,BONUS_EVERY,claimBonus,skillMaxLevel,calculateShot,pitchTimingDeltaMs,pitchTimingGuide,settleShot,forwardDistance,coinMultiplier,MILESTONES,COSMETICS,OUTFITS,BALL_STYLES,SHOP_SECTIONS,equipCosmetic,qualityNames,clamp} from './logic.js?v=0.77.71';
import {recordDiscoveryShot,discoveredCount,nextDiscoveryHint,isDiscovered,discoveryRegion} from './discoveries.js?v=0.77.71';
import {GameAudio} from './audio.js?v=0.77.71';
import {hasRewardedAds,showRewardedAd} from './rewarded.js?v=0.77.71';
import {aimSweep,aimBarPosition,aimSweetHalf,preciseAim,redirectShot,aimDegrees,SWEEP_MAX_RAD} from './aiming.js?v=0.77.71';
import {BatterSprites} from './sprites.js?v=0.77.71';
import {bakedAssetUrl} from './baked-assets.js?v=0.77.71';
import {ImpactEffects,hitStopDuration} from './impact-fx.js?v=0.77.71';
import {initBallSpin,onSpinImpact,integratePhysicalSpin,advanceVisualSpin,freezeBallSpin} from './ball-spin.js?v=0.77.71';
import {traceTrafficCollision,trafficDeflection,registerTrafficHit} from './traffic.js?v=0.77.71';
import {pitcherReactionPlan} from './pitcher.js?v=0.77.71';
import {traceAirTraffic,gullDeflection} from './gulls.js?v=0.77.71';
const el=id=>document.getElementById(id);
// Rozamiento continuo por segundo: una cola de rodadura algo más larga,
// independiente de los FPS, sin alterar el vuelo ni la pérdida al rebotar.
export function groundRollRetention(type,dt){
 const friction=type==='road'?1.05:type==='paving'?1.25:2.05;
 return Math.exp(-friction*Math.max(0,Number(dt)||0));
}
// Keep the launch composition while the ball departs in real simulation time.
export const LAUNCH_VIEW_SECONDS=.65;
export function flightTimeScale(speed,launchView=false){return launchView?1:clamp(speed/58,1,22)}
export const SHOT_ORBIT_SECONDS=4;
export function createShotOrbit(ball,camera,target){
 const angle=Math.atan2(camera[0]-ball.x,camera[2]-ball.z);
 const radius=40;
 // Find a safe height around the entire orbit, not just its first point.
 // Existing obstruction fading keeps the ball visible behind nearby facades.
 let height=ball.y+22;
 for(let i=0;i<72;i++){
  const a=i*Math.PI/36;
  const x=ball.x+Math.sin(a)*radius,z=ball.z+Math.cos(a)*radius;
  height=Math.max(height,surfaceBelowBall({x,y:1e6,z}).y+7);
 }
 return {elapsed:0,angle,radius,height,origin:[...camera],originTarget:[...target],ball:{x:ball.x,y:ball.y,z:ball.z}};
}
export function shotOrbitPose(orbit,elapsed){
 const t=clamp(elapsed/SHOT_ORBIT_SECONDS,0,1),a=orbit.angle+t*Math.PI*2,b=orbit.ball;
 const blend=clamp(elapsed/.40,0,1);
 const initialRadius=Math.hypot(orbit.origin[0]-b.x,orbit.origin[2]-b.z);
 const radius=lerp(initialRadius,orbit.radius,blend);
 const height=lerp(orbit.origin[1],orbit.height,blend)+4*Math.sin(Math.PI*t);
 const destination=elapsed<=0?[...orbit.origin]:[b.x+Math.sin(a)*radius,height,b.z+Math.cos(a)*radius];
 return {camera:destination,
  target:[b.x,b.y,b.z].map((v,i)=>lerp(orbit.originTarget[i],v,blend)),zoom:58};
}
export class BaseballGame{
 constructor(){this.state='menu';this.shopSection='bat';this.musicClock=0;this.lastRender=0;this.pitch=0;this.swing=0;this.pitchElapsed=0;this.swingElapsed=0;this.pitchDuration=1.52;this.simElapsed=0;this.distance=0;this.ball=null;this.pendingShot=null;this.activePointer=null;this.aimElapsed=0;this.aimAngle=0;this.camera=[-6.7,7.5,-20.5];this.target=[-.8,3.5,12];this.clock=0;this.last=0;this.fpsClock=0;this.frames=0;this.fps=60;this.qualityClock=0;this.stopped=false;this.toastTimer=0;this.toastText='';this.shake=0;this.audio=new GameAudio();this.impactFX=new ImpactEffects();this.contactHold=0;this.visualSwingElapsed=0;this.fxCamera=null;this.rewardPending=false;this.strikeCalled=false;
 try{this.save=sanitizeSave(JSON.parse(localStorage.getItem(SAVE_KEY)))}catch{this.save=initialSave()}
 this.audio.enabled=this.save.sound;this.audio.voiceEnabled=this.save.voice;this.batColor=COSMETICS.find(c=>c.id===this.save.equipped)?.color||'#e7b56e';
 try{this.renderer=new Renderer(el('world'))}catch(e){console.warn('WebGL2 no disponible; utilizando reserva gráfica 2D',e);this.renderer=new CanvasRenderer(el('world'))}this.renderer.game=this;
 this.spriteReady=false;this.sprites=new BatterSprites(el('character-overlay'));
 this.sprites.load().then(ok=>{
  this.spriteReady=ok;
  this.sprites.prepareEquipment(this.save);
  if(typeof document!=='undefined'&&!el('shop')?.hidden)this.renderShop();
 }).catch(err=>console.warn('Bateador 2.5D no disponible',err));
 this.initUI();this.applySettings();this.drawUI();this.showMenu();requestAnimationFrame(now=>this.frame(now));}
 persist(){if(this.catalogTestOriginal)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.save))}catch(e){if(e?.name!=='SecurityError')console.warn('No se pudo guardar el progreso',e)}}
 get catalogTestActive(){return !!this.catalogTestOriginal}
 setCatalogTestMode(active){
  if(!['menu','ready','rest'].includes(this.state)||this.rewardPending)return false;
  if(Boolean(active)===this.catalogTestActive)return true;
  if(active){
   this.catalogTestOriginal=this.save;
   this.save=createCatalogTestSave(this.catalogTestOriginal);
  }else{
   this.save=this.catalogTestOriginal;
   this.catalogTestOriginal=null;
  }
  this.batColor=COSMETICS.find(c=>c.id===this.save.equipped)?.color||'#e7b56e';
  this.closeItemPreview(false);el('shop').hidden=true;el('settings').hidden=true;
  this.applySettings();this.showMenu();
  this.sprites?.prepareEquipment?.(this.save);
  return true;
 }
 initUI(){const click=(id,fn)=>el(id).addEventListener('click',e=>{e.preventDefault();fn(e)});
 const pitchSurface=el('pitch-surface'),action=el('action');
 // A single control path regardless of where the finger starts on iPhone.
 // The pointer stays captured while aiming; only its matching release fires.
 const beginHold=e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(this.state==='ready'){e.preventDefault();this.onAction();return}
  if(this.state!=='pitching'||this.strikeCalled||this.activePointer!==null)return;
  e.preventDefault();
  this.activePointer=e.pointerId;
  try{e.currentTarget.setPointerCapture?.(e.pointerId)}catch{}
  this.onAction(e.timeStamp);
 };
 action.addEventListener('pointerdown',beginHold);
 pitchSurface.addEventListener('pointerdown',beginHold);
 const release=e=>{
  if(this.activePointer===null||e.pointerId!==this.activePointer)return;
  this.activePointer=null;
  if(this.state==='aiming'){e.preventDefault?.();this.swingBat(false,e.timeStamp)}
 };
 for(const target of [pitchSurface,action]){
  target.addEventListener('pointerup',release);
  target.addEventListener('pointercancel',release);
  target.addEventListener('lostpointercapture',release);
 }
 window.addEventListener('pointerup',release);
 window.addEventListener('pointercancel',release);
 click('again',()=>this.resetAndPitch());
 click('orbit-skip',()=>this.completeShotOrbit());
 click('start',()=>{this.save.seenIntro=true;this.persist();el('welcome').hidden=true;this.playFromMenu()});
 click('guide-close',()=>{el('welcome').hidden=true;this.showMenu()});
 click('menu-play',()=>this.playFromMenu());
 click('menu-shop',()=>this.openShop());
 click('discovery-close',()=>this.closeDiscovery());
 click('discovery-dismiss',()=>this.closeDiscovery());
 click('discovery-shop',()=>{
  if(this.latestDiscoveryCategory)this.shopSection=this.latestDiscoveryCategory;
  this.closeDiscovery();this.openShop();
 });
 click('menu-settings',()=>this.openSettings());
 click('menu-return',()=>this.showMenu());
 click('settings-close',()=>this.closeSettings());
 click('settings-guide',()=>{this.closeSettings();el('welcome').hidden=false});
 click('settings-reset',()=>this.resetProgress());
 for(const category of Object.keys(SHOP_SECTIONS))click('shop-tab-'+category,()=>{this.shopSection=category;el('shop-scroll').scrollTop=0;this.renderShop()});
 for(const key of ['sound','voice','music','vibration','showHints','reducedEffects','batterySaver','cinematicCamera'])
  click('settings-'+key,()=>this.toggleSetting(key));
 el('settings-graphics').addEventListener('change',event=>{
  this.save.graphics=['auto','high','low'].includes(event.target.value)?event.target.value:'auto';
  this.persist();this.applySettings();this.renderSettings();
 });
 click('shop-open',()=>this.openShop());click('shop-close',()=>this.closeShop());
 click('item-preview-close',()=>this.closeItemPreview());click('item-preview-back',()=>this.closeItemPreview());
 click('item-preview-retry',()=>{if(this.itemPreview)this.loadItemPreview(this.itemPreview)});
 el('item-preview').addEventListener('click',e=>{if(e.target===el('item-preview'))this.closeItemPreview()});click('sound',()=>this.toggleSetting('sound'));
 for(const key of ['power','swing','multiplier'])click('up-'+key,()=>this.buyUpgrade(key));
 document.addEventListener('keydown',e=>{
  if(this.state==='orbit'){if(['Escape','Enter',' '].includes(e.key)){e.preventDefault();this.completeShotOrbit()}return}
  if(this.itemPreview&&!el('item-preview').hidden){
   if(e.key==='Escape'){e.preventDefault();this.closeItemPreview();return}
   if(e.key==='Tab'){
    const buttons=['item-preview-close','item-preview-retry','item-preview-back'].map(el).filter(b=>b&&!b.hidden&&!b.disabled);
    const i=buttons.indexOf(document.activeElement),next=e.shiftKey?(i<=0?buttons.length-1:i-1):(i+1)%buttons.length;
    e.preventDefault();buttons[next]?.focus?.();
   }
   return;
  }
  if(e.key==='Escape'){
   if(!el('discovery-banner').hidden){this.closeDiscovery();return}
   if(!el('welcome').hidden){el('welcome').hidden=true;this.showMenu();return}
   if(!el('settings').hidden){this.closeSettings();return}
   if(!el('shop').hidden){this.closeShop();return}
   if(this.state==='rest'){this.showMenu();return}
  }
  if(e.code==='Space'||e.code==='Enter'){
   if(e.repeat||!el('welcome').hidden||!el('shop').hidden||!el('discovery-banner').hidden||!el('settings').hidden||!el('main-menu').hidden)return;
   if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;
   e.preventDefault();if(this.state==='rest')this.resetAndPitch();else this.onAction(e.timeStamp);
  }
 });
 document.addEventListener('keyup',e=>{if((e.code==='Space'||e.code==='Enter')&&this.state==='aiming'&&this.activePointer===null){e.preventDefault();this.swingBat(false,e.timeStamp)}});
 document.addEventListener('visibilitychange',()=>{this.last=0;this.stopped=document.hidden;if(document.hidden)this.audio?.stopFlightWind?.()});
 document.addEventListener('contextmenu',e=>e.preventDefault());
 this.debug=new URLSearchParams(location.search).has('debug');if(this.debug)el('quality').classList.remove('low');
 }
 showMenu(){
  this.audio?.stopFlightWind?.();this.launchView=false;this.launchCamera=null;this.shotOrbit=null;this.pendingResult=null;if(el('orbit-skip'))el('orbit-skip').hidden=true;
  this.closeDiscovery();this.clearTransientToast();this.clearEncounterReward?.();
  this.state='menu';this.activePointer=null;this.ball=null;this.pendingShot=null;
  this.impactFX?.clear();this.shake=0;this.camera=[-6.7,7.5,-20.5];this.target=[-.8,3.5,12];
  el('main-menu').hidden=false;el('hud').hidden=true;el('controls').hidden=true;
  el('run-info').hidden=true;el('region').hidden=true;el('result').hidden=true;
  el('upgrades').hidden=true;el('pitch-surface').hidden=true;el('aim-feedback').hidden=true;
  el('aim').hidden=true;el('welcome').hidden=true;el('menu-return').hidden=true;
  this.musicClock=0;this.drawUI();
 }
 playFromMenu(){
  if(!el('shop').hidden||!el('settings').hidden||!el('discovery-banner').hidden)return;
  const start=()=>{
   el('menu-play').disabled=false;
   el('menu-play').querySelector('strong').textContent='JUGAR';
   el('main-menu').hidden=true;el('hud').hidden=false;
   this.state='ready';this.resetAndPitch();
  };
  const tasks=[];
  // Desbloquear WebAudio dentro del gesto y precargar el golpe real antes del pitcher.
  if(this.audio?.enabled&&this.audio?.prepareRecorded)tasks.push(this.audio.prepareRecorded('bat'));
  if(this.sprites?.prepareEquipment)tasks.push(this.sprites.prepareEquipment(this.save));
  if(tasks.length){
   el('menu-play').disabled=true;
   el('menu-play').querySelector('strong').textContent='PREPARANDO...';
   Promise.allSettled(tasks).then(start);
  }else start();
 }
 openSettings(){
  if(!['menu','ready','rest'].includes(this.state))return;
  this.renderSettings();el('settings').hidden=false;
 }
 closeSettings(){el('settings').hidden=true;this.drawUI()}
 toggleSetting(key){
  if(!['sound','voice','music','vibration','showHints','reducedEffects','batterySaver','cinematicCamera'].includes(key))return;
  this.save[key]=!this.save[key];this.persist();this.applySettings();this.renderSettings();this.drawUI();
  if(key==='music'&&this.save.music&&this.state==='menu'){this.audio.init();this.musicClock=0}
 }
 applySettings(){
  this.audio.enabled=this.save.sound;
  this.audio.voiceEnabled=this.save.voice;
  el('app').classList.toggle('hide-help',!this.save.showHints);
  const low=this.save.batterySaver||this.save.graphics==='low';
  if(this.renderer?.setQuality){
   if(low)this.renderer.setQuality(false);
   else if(this.save.graphics==='high')this.renderer.setQuality(true);
   else if(this.lastGraphicsWasLow||this.lastGraphicsWasHigh)this.renderer.setQuality(true);
  }
  this.lastGraphicsWasLow=low;this.lastGraphicsWasHigh=this.save.graphics==='high';
 }
 renderSettings(){
  for(const key of ['sound','voice','music','vibration','showHints','reducedEffects','batterySaver','cinematicCamera']){
   const button=el('settings-'+key);
   button.setAttribute('aria-pressed',String(Boolean(this.save[key])));
   button.querySelector('.setting-status').textContent=this.save[key]?'SÍ':'NO';
  }
  el('settings-graphics').value=this.save.graphics;
 }
 resetProgress(){
  if(this.catalogTestActive){this.toast('SAL DEL MODO PRUEBAS PARA REINICIAR TU PARTIDA');return;}
  if(typeof window==='undefined'||!window.confirm?.('¿Borrar todas las monedas, mejoras, ropa, bates, pelotas y récords de este dispositivo? No se puede deshacer.'))return;
  this.save=initialSave();this.batColor=COSMETICS[0].color;
  this.persist();this.applySettings();this.renderSettings();this.drawUI();
  this.toast('PARTIDA LOCAL REINICIADA');
 }
 // Viewing is deliberately read-only: no equipCosmetic, no persist.
 openItemPreview(kind,id,trigger=null){
  const category=SHOP_SECTIONS[kind],item=category?.items.find(x=>x.id===id);
  if(!item||el('shop').hidden||!isDiscovered(this.save,kind,id))return false;
  const owned=this.save[category.owned].includes(id),equipped=this.save[category.equipped]===id;
  this.itemPreview={kind,id,trigger,scroll:el('shop-scroll').scrollTop||0};
  el('item-preview-title').textContent=item.name;
  el('item-preview-rarity').textContent=item.rarity;
  el('item-preview-description').textContent=item.description+' · '+discoveryRegion(kind,item.id).label;
  el('item-preview-ownership').textContent=equipped?'EQUIPADO':owned?'EN TU COLECCIÓN':'NO ADQUIRIDO';
  el('item-preview-price').textContent=owned?'':'✦ '+formatInt(item.price);
  el('item-preview-stage').setAttribute('data-category',kind);
  el('item-preview').hidden=false;el('shop').inert=true;
  this.loadItemPreview(this.itemPreview);el('item-preview-close').focus?.();
  return true;
 }
 loadItemPreview(preview){
  const img=el('item-preview-image'),status=el('item-preview-loading'),retry=el('item-preview-retry');
  const item=SHOP_SECTIONS[preview.kind].items.find(x=>x.id===preview.id);
  const url=bakedAssetUrl(preview.kind,preview.id);
  const token={};this.itemPreviewLoad=token;
  let fallback=false;
  img.hidden=true;status.hidden=false;status.textContent='Cargando imagen…';retry.hidden=true;
  img.alt=item.name;
  img.onload=()=>{if(this.itemPreviewLoad!==token)return;img.hidden=false;status.hidden=true;retry.hidden=true};
  img.onerror=()=>{
   if(this.itemPreviewLoad!==token)return;
   if(!fallback){fallback=true;img.src=url.split('?')[0];return}
   img.hidden=true;status.hidden=false;status.textContent='Imagen no disponible';retry.hidden=false;
  };
  img.src=url;
 }
 closeItemPreview(restore=true){
  if(!this.itemPreview)return;
  const previous=this.itemPreview;this.itemPreview=null;this.itemPreviewLoad=null;
  el('item-preview').hidden=true;el('shop').inert=false;
  const img=el('item-preview-image');img.onload=null;img.onerror=null;img.removeAttribute?.('src');
  if(restore){
   el('shop-scroll').scrollTop=previous.scroll;
   if(previous.trigger?.isConnected)previous.trigger.focus?.({preventScroll:true});
   else el('shop-scroll').focus?.({preventScroll:true});
  }
 }
 closeShop(){this.closeItemPreview(false);el('shop').hidden=true;this.drawUI()}
 openShop(){
  if(!['menu','ready','rest'].includes(this.state))return;
  this.closeDiscovery();
  this.shopSection=this.shopSection||'bat';
  el('shop').hidden=false;el('shop-scroll').scrollTop=0;this.renderShop();
 }
 renderShop(){
  const category=SHOP_SECTIONS[this.shopSection]||SHOP_SECTIONS.bat;
  el('shop-money').textContent='✦ '+formatInt(this.save.coins);
  for(const key of Object.keys(SHOP_SECTIONS)){
   const tab=el('shop-tab-'+key),active=key===this.shopSection;
   tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active));
  }
  const count=discoveredCount(this.save,this.shopSection);
  el('shop-discovery-count').textContent=category.label.toUpperCase()+': '+count.found+'/'+count.total+' DESCUBIERTOS';
  el('shop-discovery-next').textContent=this.catalogTestActive?'MODO PRUEBAS · TODO ADQUIRIDO · NO SE GUARDA':nextDiscoveryHint(this.save,this.shopSection);
  el('shop-discovery-bar').style.width=(100*count.found/count.total).toFixed(1)+'%';
  const container=el('shop-items');container.replaceChildren();
  for(const item of [...category.items].sort((a,b)=>discoveryRegion(this.shopSection,a.id).at-discoveryRegion(this.shopSection,b.id).at||a.price-b.price)){
   if(!isDiscovered(this.save,this.shopSection,item.id))continue;
   const owned=this.save[category.owned].includes(item.id);
   const equipped=this.save[category.equipped]===item.id;
   const row=document.createElement('div');row.className='shop-item'+(equipped?' selected':'');
   const preview=document.createElement('button');preview.type='button';preview.className='shop-preview shop-preview-art';
   preview.setAttribute('aria-label','Ampliar '+item.name);preview.setAttribute('aria-haspopup','dialog');
   const img=document.createElement('img');
   img.loading='eager';img.decoding='async';
   img.alt='Aspecto real de '+item.name;
   const url=bakedAssetUrl(this.shopSection,item.id);
   const status=document.createElement('span');status.className='shop-preview-status';status.textContent='Cargando…';
   img.hidden=true;
   let retry=false;
   img.onload=()=>{img.hidden=false;status.hidden=true};
   img.onerror=()=>{
    if(!retry){retry=true;img.src=url.split('?')[0];return}
    console.warn('Vista previa no disponible',url);
    img.hidden=true;status.hidden=false;status.textContent='Ver detalle';
   };
   const zoom=document.createElement('span');zoom.className='shop-zoom-icon';zoom.setAttribute('aria-hidden','true');zoom.textContent='⌕';
   preview.append(img,status,zoom);
   img.src=bakedAssetUrl(this.shopSection,item.id);
   const detail=document.createElement('div');detail.className='shop-detail';
   const strong=document.createElement('strong');strong.textContent=item.name;
   const small=document.createElement('small');
   small.textContent=item.rarity+' · '+item.description+' · '+discoveryRegion(this.shopSection,item.id).label;
   detail.append(strong,small);
   const btn=document.createElement('button');btn.type='button';btn.className='shop-buy';
   btn.textContent=equipped?'EQUIPADO':owned?'EQUIPAR':'✦ '+formatInt(item.price);
   btn.disabled=equipped||(!owned&&this.save.coins<item.price);
   btn.setAttribute('aria-label',(equipped?'Equipado ':owned?'Equipar ':'Comprar ')+item.name);
   const kind=this.shopSection;
   row.addEventListener('click',()=>this.openItemPreview(kind,item.id,preview));
   btn.addEventListener('click',e=>{
    e.stopPropagation();
    const status=equipCosmetic(this.save,this.shopSection,item.id);
    if(status==='invalid'||status==='insufficient'||status==='locked')return;
    if(status==='purchased')this.audio.cash();
    this.batColor=COSMETICS.find(c=>c.id===this.save.equipped)?.color||'#e7b56e';
    this.persist();this.drawUI();this.renderShop();
    this.sprites?.prepareEquipment?.(this.save);
   });
   row.append(preview,detail,btn);container.append(row);
  }
 }
 closeDiscovery(){const panel=el('discovery-banner');if(panel)panel.hidden=true}
 showDiscoveries(newItems=[]){
  const panel=el('discovery-banner');if(!panel)return;
  if(!newItems.length){this.closeDiscovery();return}
  panel.hidden=false;
  this.latestDiscoveryCategory=newItems[0].category;
  el('discovery-caption').textContent=newItems.length===1?'¡NUEVO DESCUBRIMIENTO!':
   '¡'+newItems.length+' NUEVOS DESCUBRIMIENTOS!';
  const items=el('discovery-items');
  items.replaceChildren();
  for(const {category,item} of newItems){
   const card=document.createElement('div');card.className='discovery-item';
   const art=document.createElement('img');art.className='discovery-art';art.alt='';art.decoding='async';
   const url=bakedAssetUrl(category,item.id);let retried=false;
   art.onerror=()=>{if(!retried){retried=true;art.src=url.split('?')[0]}else art.hidden=true};
   art.src=url;
   const name=document.createElement('strong');name.textContent=item.name;
   const bonus=document.createElement('small');bonus.textContent=item.rarity+' · '+item.description;card.append(art,name,bonus);items.append(card);
  }
  el('discovery-shop').textContent='VER EN TIENDA';
  el('discovery-close').focus?.();
 }
 buyUpgrade(key){
  if(this.state==='pitching'||this.state==='aiming'||this.state==='swinging'||this.state==='flight'||this.state==='orbit'||this.rewardPending)return;
  if(!['power','swing','multiplier'].includes(key))return;
  // Nunca cobrar monedas ni mostrar un anuncio por un nivel sin beneficio.
  if(this.save.levels[key]>=skillMaxLevel(key)){this.toast('MÁXIMO ALCANZADO');return;}
  if(!this.catalogTestActive&&bonusCredits(this.save)>0&&hasRewardedAds()){
   this.rewardPending=true;this.drawUI();
   showRewardedAd().then(rewarded=>{if(rewarded)this.applyBonus(key);else this.toast('VÍDEO NO COMPLETADO · CONSERVAS EL BONO')})
    .finally(()=>{this.rewardPending=false;this.drawUI()});
   return;
  }
  // Sin anuncios, las compras de pago pueden seguir. El bono queda pendiente.
  if(upgrade(this.save,key)){
   this.audio.cash();this.persist();this.drawUI();
   if(bonusCredits(this.save)>0)this.toast('🎁 ¡BONUS EXTRA DESBLOQUEADO!');
   else this.toast({power:'¡MÁS POTENCIA!',swing:'¡SWING MÁS RÁPIDO!',multiplier:'¡MÁS MONEDAS POR METRO!'}[key]);
  }else this.toast('TE FALTAN MONEDAS');
 }
 applyBonus(key){if(claimBonus(this.save,key)){this.audio.cash();this.persist();this.drawUI();this.toast('🎁 NIVEL EXTRA POR ANUNCIO')}}
 drawUI(){
  el('app').classList.toggle('catalog-test-active',this.catalogTestActive);
  el('money').textContent=formatInt(this.save.coins);el('best-hud').textContent=formatInt(this.save.best)+' m';
  el('menu-money').textContent=formatInt(this.save.coins);
  el('menu-best').textContent=formatInt(this.save.best)+' m';
  el('menu-shots').textContent=formatInt(this.save.shots);
  el('menu-region').textContent=areaAt(Math.max(this.save.best,0));
  const bat=COSMETICS.find(item=>item.id===this.save.equipped)||COSMETICS[0];
  const outfit=OUTFITS.find(item=>item.id===this.save.equippedOutfit)||OUTFITS[0];
  const ball=BALL_STYLES.find(item=>item.id===this.save.equippedBall)||BALL_STYLES[0];
  this.ballStyleColor=ball.color;
  el('menu-equipment').textContent='🏏 '+bat.name+'  ·  👕 '+outfit.name+'  ·  ⚾ '+ball.name;
  el('shots-hud').textContent=formatInt(this.save.shots);el('region-hud').textContent=areaAt(Math.max(this.save.best,0));
  el('sound').textContent=this.save.sound?'♫':'♩';
  const bonus=bonusCredits(this.save)>0,hasAds=!this.catalogTestActive&&hasRewardedAds(),progress=bonusProgress(this.save);
  el('bonus-track').classList.toggle('ready',bonus);
  el('bonus-text').textContent=bonus?(hasAds?'BONO DISPONIBLE · VER ANUNCIO':'BONO PENDIENTE · SIN ANUNCIOS'):'MEJORA EXTRA CADA '+BONUS_EVERY+' COMPRAS';
  el('bonus-progress').textContent=bonus?(hasAds?'ELIGE SKILL':'EN ESPERA'):progress+'/'+BONUS_EVERY;
  for(const key of ['power','swing','multiplier']){
   const lvl=this.save.levels[key],maxed=lvl>=skillMaxLevel(key),cost=upgradeCost(lvl,key),affordable=!maxed&&cost<=this.save.coins;
   const button=el('up-'+key),free=!maxed&&bonus&&hasAds&&!this.rewardPending;
   el('level-'+key).textContent='NIV. '+formatInt(lvl);
   if(key==='multiplier'){
    // Mismo cálculo que se utiliza al pagar monedas tras el batazo.
    const current=coinMultiplier(lvl),upcoming=coinMultiplier(lvl+1);
    const display=n=>'×'+n.toFixed(2).replace('.',',');
    el('multiplier-current').textContent=display(current);
    el('multiplier-next').textContent=upcoming>current?'SIG. '+display(upcoming):'MÁXIMO';
   }
   el('cost-'+key).textContent=maxed?'—':free?'+1 NIVEL':formatInt(cost);
   el('buy-label-'+key).textContent=maxed?'MÁXIMO':this.rewardPending?'ESPERA':free?'VER ANUNCIO':affordable?'MEJORAR':'SIN MONEDAS';
   button.classList.toggle('is-affordable',!free&&affordable&&!this.rewardPending);
   button.classList.toggle('is-bonus',free);
   button.classList.toggle('is-locked',maxed||(!free&&!affordable));
   button.disabled=maxed||this.rewardPending||(!free&&!affordable);
   const multiplierInfo=key==='multiplier'?', multiplicador actual por '+coinMultiplier(lvl).toFixed(2)+(maxed?', máximo alcanzado':', siguiente por '+coinMultiplier(lvl+1).toFixed(2)):'';
   button.setAttribute('aria-label',key+' nivel '+lvl+multiplierInfo+', '+(maxed?'máximo alcanzado':free?'mejora extra con anuncio':affordable?'mejorar por '+cost+' monedas':'faltan monedas'));
  }
 }
 clearTransientToast(){
  el('toast').classList.remove('show');
  el('toast').textContent='';
  const subtitle=el('upgrades-subtitle');
  subtitle.classList.remove('is-feedback');
  subtitle.textContent='Sube habilidades antes del siguiente batazo';
  this.toastTimer=0;this.toastText='';this.toastPlacement='';
 }
 toast(s){
  this.clearTransientToast();
  // En descanso no existen carteles flotantes detrás del resultado.
  // El feedback de habilidades y logros se muestra en su propio panel.
  if(this.state==='rest'){
   const subtitle=el('upgrades-subtitle');
   subtitle.textContent=s;subtitle.classList.add('is-feedback');
   this.toastPlacement='upgrades';
  }else{
   el('toast').textContent=s;el('toast').classList.add('show');
   this.toastPlacement='floating';
  }
  this.toastTimer=1.85;this.toastText=s;
 }
 // Sample the fraction between the last draw and the actual input event.
 inputRemainder(time){return Number.isFinite(time)&&Number.isFinite(this.last)&&this.last>0?clamp((time-this.last)/1000,0,.048):0}
 onAction(time){if(!el('welcome').hidden||!el('shop').hidden||!el('settings').hidden||!el('main-menu').hidden)return;this.audio.init();if(this.state==='ready')this.startPitch();else if(this.state==='pitching')this.freezeSwing(false,time);}

 startPitch(){
  this.audio?.stopFlightWind?.();this.launchView=false;this.launchCamera=null;this.shotOrbit=null;this.pendingResult=null;if(el('orbit-skip'))el('orbit-skip').hidden=true;
  this.brokenWindows=new Set();this.gullHits??=new Map();
  this.clearEncounterReward?.();this.renderEncounterRewards?.();
  this.clearTransientToast();
  this.audio?.prepareGameEffects?.();
  this.audio?.prepareStrike?.();
  this.state='pitching';this.activePointer=null;this.aimElapsed=0;this.aimAngle=0;
  this.strikeCalled=false;this.swingElapsed=0;this.visualSwingElapsed=0;
  el('app').classList.remove('resting','aiming');el('again').hidden=true;
  el('pitch-surface').hidden=false;el('aim-feedback').hidden=true;
  el('pitch-touch-label').textContent='MANTÉN PULSADO PARA BATEAR';
  el('region').hidden=false;this.pitch=0;this.swing=0;this.pitchElapsed=0;
  this.ball=null;this.distance=0;this.pendingShot=null;
  this.updatePitchGuide();
  el('result').hidden=true;el('record-badge').hidden=true;
  el('impact').textContent='';el('distance').textContent='0';el('controls').hidden=true;
  el('run-info').hidden=true;el('upgrades').hidden=true;
  el('action-title').textContent='¡BATEA!';
  el('action-sub').textContent='MANTÉN PARA APUNTAR';el('action-icon').textContent='⚾';
  el('action').classList.add('pitch');
  el('status-pill').textContent='⚾ VIENE EL LANZAMIENTO';
  el('tip').textContent='Mantén al llegar la pelota y suelta para lanzar';
  el('region').textContent='ESTADIO · 0 KM';
  this.audio.tone(420,.12,'sine',.065,0,-140);
 }
 updatePitchGuide(){
  const label=el('pitch-touch-label');if(!label)return;
  if(this.state!=='pitching'||this.strikeCalled||this.save?.showHints===false){
   label.removeAttribute?.('data-timing');
   if(this.state==='pitching')label.textContent=this.strikeCalled?'¡STRIKE!':'MANTÉN PULSADO PARA BATEAR';
   return;
  }
  const guide=pitchTimingGuide(this.pitchElapsed,this.pitchDuration,equipmentBonuses(this.save).precision);
  label.textContent={wait:'ESPERA · OBSERVA LA PELOTA',ready:'¡PREPÁRATE!',perfect:'¡AHORA! MANTÉN PULSADO',late:'¡BATEA!'}[guide.phase];
  label.setAttribute?.('data-timing',guide.phase);
  for(const [key,value] of [['--pitch-progress',guide.progress],['--pitch-perfect-start',guide.start],['--pitch-perfect-end',guide.end]])label.style?.setProperty?.(key,(value*100).toFixed(3)+'%');
 }
 freezeSwing(auto=false,time){
  if(this.state!=='pitching'||this.strikeCalled)return;
  const extra=this.inputRemainder(time);
  const deltaMs=pitchTimingDeltaMs(this.pitchElapsed+extra,this.pitchDuration);
  this.pendingShot=calculateShot(this.save.levels,auto?999:deltaMs,equipmentBonuses(this.save));
  this.pendingShot.deltaMs=deltaMs;
  this.state='aiming';this.aimElapsed=-extra;this.aimAngle=preciseAim(0,this.save.levels.swing,this.save.levels.power,deltaMs,equipmentBonuses(this.save).precision);this.swing=.42;
  el('app').classList.add('aiming');el('aim-feedback').hidden=false;
  el('locked-quality').textContent=qualityNames[this.pendingShot.quality];
  el('aim-heading').textContent=aimDegrees(this.aimAngle);el('aim-direction').textContent='IZQUIERDA';
  el('aim-sweet-zone').style.width=(aimSweetHalf(this.save.levels.swing,this.save.levels.power,equipmentBonuses(this.save).precision)*100).toFixed(2)+'%';
  el('aim-ball').style.left='0%';
  el('pitch-touch-label').removeAttribute?.('data-timing');
  el('pitch-touch-label').textContent='SUELTA PARA FIJAR DIRECCIÓN';
  el('aim').hidden=true;el('region').textContent='DIRECCIÓN DEL BATAZO';
 }
 swingBat(auto=false,time){
  if(this.state==='pitching')this.freezeSwing(auto,time);
  if(this.state!=='aiming')return;
  const elapsed=Math.max(0,this.aimElapsed+this.inputRemainder(time));
  this.aimAngle=preciseAim(elapsed,this.save.levels.swing,this.save.levels.power,this.pendingShot.deltaMs,equipmentBonuses(this.save).precision);
  this.pendingShot=redirectShot(this.pendingShot,auto?0:this.aimAngle);
  this.state='swinging';el('pitch-surface').hidden=true;el('aim-feedback').hidden=true;
  el('app').classList.remove('aiming');
  this.swingElapsed=0;this.visualSwingElapsed=0;this.contactHold=hitStopDuration(this.pendingShot.quality);this.swing=.42;
  el('action').classList.remove('pitch');el('controls').hidden=true;el('aim').hidden=true;
  // No reproducir ruido de movimiento: solo el contacto real en launch().
 }
 // Una bola no tocada nunca se convierte en un batazo lento.
 resolveSwing(){
  if(this.pendingShot?.quality==='miss'){
   this.state='whiff';this.swing=1;
   el('region').textContent='SWING AL AIRE';
   return;
  }
  this.launch();
 }
 // La bola sin contacto cruza el home y continúa detrás del bateador.
 advancePitch(dt){
  if(this.state!=='pitching'&&this.state!=='whiff')return;
  this.pitchElapsed+=Math.max(0,dt);
  const progress=this.pitchElapsed/this.pitchDuration;
  this.pitch=clamp(progress,0,1);
  if(progress>=1.08&&!this.strikeCalled){
   this.strikeCalled=true;this.audio?.strike?.();
   el('status-pill').textContent='⚾ ¡STRIKE!';
   el('region').textContent='¡STRIKE!';
   this.updatePitchGuide();
  }
  if(progress>=1.26)this.finishStrike();
 }
 finishStrike(){
  if(this.state!=='pitching'&&this.state!=='whiff')return;
  this.clearTransientToast();
  this.state='rest';this.activePointer=null;this.ball=null;this.distance=0;
  el('app').classList.add('resting');el('app').classList.remove('aiming');
  el('pitch-surface').hidden=true;el('aim-feedback').hidden=true;el('again').hidden=false;
  el('result').hidden=false;el('upgrades').hidden=false;el('controls').hidden=true;
  el('run-info').hidden=true;el('region').hidden=true;el('aim').hidden=true;
  el('record-badge').hidden=true;el('menu-return').hidden=false;el('result-quality').textContent='¡STRIKE!';
  el('result-meters').textContent='0';el('result-coins').textContent='+0';el('coin-breakdown').textContent='SIN CONTACTO · x0';
  el('best-label').textContent='MEJOR MARCA: '+formatInt(this.save.best)+' M';el('result-total-meters').textContent=formatInt(this.save.totalMeters||0)+' m';
  el('reward-note').textContent='SIN CONTACTO · SIN MONEDAS';
  this.showDiscoveries([]);this.drawUI();
 }
 launch(){const hit=this.pendingShot;this.pitcherReaction=pitcherReactionPlan(hit);this.pitcherReactionStartedAt=this.clock||0;this.state='flight';this.launchView=true;this.launchCamera={camera:[...(this.camera||[-6.7,7.5,-20.5])],target:[...(this.target||[-.8,3.5,12])]};el('run-info').hidden=false;this.simElapsed=0;this.liveSeconds=0;this.shake=this.save?.reducedEffects?0:hit.quality==='perfect'?.32:hit.quality==='excellent'?.18:.08;const b={x:-4.5+(hit.contactOffsetMm||0)/1000,y:2.5,z:-4.7,vx:hit.vx,vy:hit.vy,vz:hit.vz,bounces:0,freeze:0,lastCollision:'',impactAge:99,impactMaterial:'grass',maxZ:0,encounters:{road:false,roof:false,water:false,swamp:false}};this.ball=b;initBallSpin(b);this.gullHits??=new Map();this.distance=0;this.audio.hit(hit.quality);el('impact').textContent=qualityNames[hit.quality];el('impact').style.color=hit.quality==='perfect'?'#ffe38c':'#ffffff';if(this.save?.vibration!==false&&typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(hit.quality==='perfect'?[30,20,50]:25);}

 showEncounterReward(kind,count){
  if(typeof document==='undefined')return;
  const pop=el('encounter-pop');if(!pop)return;
  const gull=kind==='gull',amount=(gull?GULL_REWARD:CAR_REWARD)*count;
  const icon=el('encounter-icon'),title=el('encounter-title'),value=el('encounter-amount');
  icon.textContent=gull?'🪽':'🚗';
  title.textContent=gull?(count===1?'¡GAVIOTA GOLPEADA!':count+' GAVIOTAS GOLPEADAS'):(count===1?'¡COCHE GOLPEADO!':count+' COCHES GOLPEADOS');
  value.textContent='+'+formatInt(amount)+' MONEDAS';
  pop.classList.toggle('is-gull',gull);pop.classList.toggle('reduced',!!this.save?.reducedEffects);
  pop.hidden=false;pop.classList.remove('reward-pop-in');void pop.offsetWidth;pop.classList.add('reward-pop-in');
  this.encounterTimer=gull?2.5:1.65;
  this.audio?.cash?.();
  if(this.save?.vibration!==false&&typeof navigator!=='undefined')navigator.vibrate?.(gull?[45,55,60]:35);
 }
 clearEncounterReward(){
  this.encounterTimer=0;
  if(typeof document!=='undefined'){const pop=el('encounter-pop');if(pop)pop.hidden=true}
 }
 renderEncounterRewards(reward={}){
  if(typeof document==='undefined')return;
  const box=el('encounter-rewards');if(!box)return;
  const cars=reward.carCount||0,gulls=reward.gullCount||0;
  box.hidden=!cars&&!gulls;el('result')?.classList.toggle('has-encounter',!box.hidden);
  el('car-reward').hidden=!cars;el('gull-reward').hidden=!gulls;
  if(cars){el('car-reward-title').textContent=cars===1?'¡COCHE GOLPEADO!':cars+' COCHES GOLPEADOS';el('car-reward-amount').textContent='+'+formatInt(reward.carCoins)}
  if(gulls){el('gull-reward-title').textContent=gulls===1?'¡GAVIOTA GOLPEADA!':gulls+' GAVIOTAS GOLPEADAS';el('gull-reward-amount').textContent='+'+formatInt(reward.eventCoins)}
 }
 emitCollision(material,point,strength,normal={x:0,y:1,z:0}){
  if(!Number.isFinite(strength)||strength<1.2)return;
  if(!this.save?.reducedEffects)this.impactFX?.spawn({x:point.x,y:point.y,z:point.z,material,strength,normal,ballId:this.save?.equippedBall});
  if(this.audio?.impact)this.audio.impact(material,strength);
  else this.audio?.land?.();
  if(!this.save?.reducedEffects)this.shake=Math.max(this.shake||0,Math.min(.13,.025+strength*.00085));
 }
 simulateStep(dt,trafficStart=this.clock||0,trafficEnd=trafficStart+dt){
  const b=this.ball;
  if(!b||this.state!=='flight')return;
  const radius=1.45,prev={x:b.x,y:b.y,z:b.z};
  b.impactAge=(b.impactAge??99)+dt;
  b.vy-=9.81*dt;
  const next={x:b.x+b.vx*dt,y:b.y+b.vy*dt,z:b.z+b.vz*dt};
  const buildingHit=traceBuildingCollision(prev,next,radius,this.brokenWindows);
  const fountainHit=traceFountainCollision(prev,next,radius);
  const boundaryHit=traceSideBoundary(prev,next,radius);
  const containerHit=traceStadiumContainerCollision(prev,next,radius);
  const fenceHit=traceStadiumFenceCollision(prev,next,radius);
  const carHit=traceTrafficCollision(prev,next,trafficStart,trafficEnd,radius,dt);
  const gullHit=traceAirTraffic(prev,next,trafficStart,trafficEnd,radius,this.gullHits,b.hitGulls);
  // Resolver el primer contacto real de la trayectoria, no un solapamiento
  // del siguiente fotograma: edificios, muros y contenedores compiten por t.
  const hit=[buildingHit,fountainHit,boundaryHit,containerHit,fenceHit,carHit,gullHit].filter(Boolean)
   .reduce((first,candidate)=>!first||candidate.t<first.t?candidate:first,null);
  let touching=false;
  if(hit?.kind==='gull'){
   (this.gullHits??=new Map()).set(hit.bird.id,hit.at);
   const gulls=b.hitGulls??=new Set(),newGull=!gulls.has(hit.bird.id);gulls.add(hit.bird.id);
   if(newGull)this.showEncounterReward?.('gull',gulls.size);
   Object.assign(b,gullDeflection(b,hit));
   b.x=hit.point.x;b.y=hit.point.y;b.z=hit.point.z;
   b.lastCollision='¡GAVIOTA!';(b.encounters??={}).gull=true;
   // Soft contact and a startled escape; no blood or falling bird.
   onSpinImpact(b,hit.normal,'rubber');
  }else if(hit?.kind==='glass'){
   // Break only the struck pane. Keep the direction; lose 8% speed.
   const n=hit.normal,inward=Math.max(0,-(b.vx*n.x+b.vy*n.y+b.vz*n.z));
   (this.brokenWindows??=new Set()).add(hit.windowId);
   b.x=hit.point.x-n.x*.045;b.y=hit.point.y-n.y*.045;b.z=hit.point.z-n.z*.045;
   b.vx*=.92;b.vy*=.92;b.vz*=.92;
   b.lastCollision='¡CRISTAL ROTO!';b.impactAge=0;b.impactMaterial='glass';
   this.emitCollision('glass',{x:b.x-n.x*radius,y:b.y-n.y*radius,z:b.z-n.z*radius},Math.max(3,inward),{x:-n.x,y:-n.y,z:-n.z});
   if(!this.save?.reducedEffects)this.impactFX?.spawnGlassShards?.(hit,Math.max(3,inward));
   // Stop at contact for this substep so the next wall/pane cannot be skipped.
  }else if(hit?.kind?.startsWith('traffic-')){
   const n=hit.normal,mat=hit.material,response=trafficDeflection(b,hit);
   if(response){
    if(registerTrafficHit(b,hit))this.showEncounterReward?.('car',b.hitCars.size);
    const remaining=Math.max(0,1-hit.t)*dt;
    Object.assign(b,{vx:response.vx,vy:response.vy,vz:response.vz});
    // Move outside the car at its contact position; advance the remaining
    // fraction in the outgoing direction without trapping the ball under it.
    b.x=hit.point.x+n.x*.09+b.vx*remaining;
    b.y=hit.point.y+n.y*.09+b.vy*remaining;
    b.z=hit.point.z+n.z*.09+b.vz*remaining;
    b.lastCollision=hit.kind==='traffic-wheel'?'¡NEUMÁTICO!':'¡CHOQUE CON COCHE!';
    (b.encounters??={}).road=true;b.impactAge=0;b.impactMaterial=mat;b.bounces++;
    onSpinImpact(b,n,mat);this.emitCollision(mat,{x:b.x,y:b.y,z:b.z},response.inward,n);
   }else{b.x=next.x;b.y=next.y;b.z=next.z;}
  }else if(hit){
   // El material determina el rebote; ningún número de impactos termina la partida.
   const n=hit.normal,mat=hit.material||'concrete';
   const sideHit=hit.kind==='side-boundary';
   const roofTop=hit.kind==='roof'&&n.y>.5;
   const normalSpeed=b.vx*n.x+b.vy*n.y+b.vz*n.z;
   const inward=Math.max(0,-normalSpeed);
   const roofRolling=roofTop&&inward<=.9;
   // Rubber roofs remain softer than rigid roofs, but are not adhesive.
   const restitution=roofTop?(mat==='rubber'?.58:.80):sideHit?.26:mat==='rubber'?.16:mat==='solid'?.80:.71;
   const tangentRetention=roofRolling?1:roofTop?(mat==='rubber'?.86:.92):sideHit?.64:mat==='rubber'?.48:mat==='solid'?.92:.86;
   b.x=hit.point.x+n.x*.075;
   b.y=hit.point.y+n.y*.075;
   b.z=hit.point.z+n.z*.075;
   if(inward>0){
    const nx=n.x,ny=n.y,nz=n.z;
    // Velocidad perpendicular reflejada y tangencial frenada según el material.
    b.vx=(b.vx-normalSpeed*nx)*tangentRetention+inward*restitution*nx;
    b.vy=(b.vy-normalSpeed*ny)*tangentRetention+inward*restitution*ny;
    b.vz=(b.vz-normalSpeed*nz)*tangentRetention+inward*restitution*nz;
   }else{
    // Corrección de penetración previa: sin inyectar energía en el sólido.
    b.vx*=.84;b.vy*=.84;b.vz*=.84;
   }
   if(roofRolling){
    // Persistent support is not a new impact. Apply friction per second,
    // then consume the remaining horizontal travel without crossing a vent.
    b.vy=0;b.y=hit.point.y+.0001;
    const drag=Math.exp(-(mat==='rubber'?1.8:1.05)*dt);
    b.vx*=drag;b.vz*=drag;
    const remaining=Math.max(0,1-hit.t)*dt;
    const end={x:b.x+b.vx*remaining,y:b.y,z:b.z+b.vz*remaining};
    const obstruction=traceBuildingCollision(b,end,radius,this.brokenWindows);
    if(obstruction){
     b.x=obstruction.point.x+obstruction.normal.x*.001;
     b.z=obstruction.point.z+obstruction.normal.z*.001;
    }else{b.x=end.x;b.z=end.z;}
    const floor=surfaceBelowBall(b);
    touching=Math.abs(b.y-radius-floor.y)<=.12;
   }else if(!roofTop&&n.y>.5&&inward<1.5){
    // Other surfaces keep their existing contact response.
    b.vy=0;
    const rollingDrag=Math.exp(-(mat==='rubber'?4.8:.85)*dt);
    b.vx*=rollingDrag;b.vz*=rollingDrag;
    touching=true;
   }
   const stadiumHit=hit.kind?.startsWith('stadium-container-');
   b.lastCollision=stadiumHit?(n.y>.5?'REBOTE EN CONTENEDOR':'CHOQUE CON CONTENEDOR'):
    hit.kind?.startsWith('stadium-fence-')?'CHOQUE CON VALLA':
    hit.kind==='fountain-stone'?'CHOQUE CON FUENTE':
    sideHit?'CHOQUE CON '+hit.obstacle.toUpperCase():
    hit.kind==='interior-floor'?'REBOTE EN SUELO INTERIOR':
    n.y>.5?(mat==='rubber'?'TEJADO DE GOMA':'REBOTE EN TEJADO'):
    hit.kind==='vent'?'CASETA DE AZOTEA':'CHOQUE CON FACHADA';
   if(inward>(roofTop?.9:1)){
    if(roofTop)b.bounceVisual=1;
    if(!sideHit&&hit.kind!=='fountain-stone'&&hit.kind!=='interior-floor'&&!hit.kind?.startsWith('stadium-fence-')&&n.y>.5)(b.encounters??={}).roof=true;
    b.impactAge=0;b.impactMaterial=mat;
    b.bounces++;
    onSpinImpact(b,n,mat);
    this.emitCollision(mat,{x:b.x,y:b.y,z:b.z},inward,n);
   }
  }else{
   b.x=next.x;b.y=next.y;b.z=next.z;
  }
  b.x=clamp(b.x,WORLD_CENTER_X-WORLD_HALF_WIDTH+radius,
    WORLD_CENTER_X+WORLD_HALF_WIDTH-radius);
   b.maxZ=Math.max(b.maxZ,b.z);
  this.simElapsed+=dt;
  let ground=groundAt(b.x,b.z);
  // A fast ball may cross a narrow slab during a single physics substep.
  // Classify the first touchdown, not the point after crossing its edge.
  if(!hit&&b.y<=ground.y+radius&&prev.y>ground.y+radius&&b.vy<0){
   const t=clamp((prev.y-ground.y-radius)/(prev.y-b.y),0,1);
   const x=prev.x+(b.x-prev.x)*t,z=prev.z+(b.z-prev.z)*t;
   const contact=groundAt(x,z);
   if(contact.type!==ground.type&&(contact.type==='paving'||ground.type==='paving')&&Math.abs(contact.y-ground.y)<1e-6){
    b.x=x;b.z=z;ground=contact;
   }
  }
  if(b.y<=ground.y+radius){
   b.y=ground.y+radius;
   const type=ground.type;
   const wet=type==='water'||type==='swamp'||type==='puddle';
   const incomingSpeed=Math.hypot(b.vx,b.vy,b.vz);
   if(wet){
    (b.encounters??={}).water=true;
    if(type==='swamp')(b.encounters??={}).swamp=true;
    // El agua absorbe casi todo el impulso, pero no para de forma artificial al tocar.
    const retention=type==='water'?.035:type==='swamp'?.12:.20;
    b.vx*=retention;b.vz*=retention;
    b.vy=Math.max(0,b.vy)*.04;
    b.lastCollision=type==='water'?'¡AL AGUA!':type==='swamp'?'¡PANTANO!':'¡CHARCO!';
    if(!(b.wetTime>0)){
     b.impactAge=0;b.impactMaterial=type;
     onSpinImpact(b,{x:0,y:1,z:0},type);
     this.emitCollision(type,{x:b.x,y:b.y,z:b.z},incomingSpeed,{x:0,y:1,z:0});
    }
    b.wetTime=(b.wetTime||0)+dt;
    touching=true;
   }else{
    const normalImpact=Math.abs(Math.min(0,b.vy));
    if(normalImpact>.9){
     if(type==='road')(b.encounters??={}).road=true;
     b.vy=normalImpact*(type==='road'?.78:type==='paving'?.74:.39);
     const retention=type==='road'?.92:type==='paving'?.89:.70;
      b.vz*=retention;b.vx*=retention;
     b.impactAge=0;b.impactMaterial=type;
     b.bounces++;
     // Compresión visual breve, independiente de la física acelerada.
     b.bounceVisual=1;
     onSpinImpact(b,{x:0,y:1,z:0},type);
     this.emitCollision(type,{x:b.x,y:b.y,z:b.z},normalImpact,{x:0,y:1,z:0});
    }else{
     b.vy=0;
     const drag=groundRollRetention(type,dt);
     b.vz*=drag;b.vx*=drag;
     touching=true;
    }
    if(hit?.kind!=='glass'&&!hit?.kind?.startsWith('traffic-'))b.lastCollision=type==='road'?'ASFALTO':type==='paving'?'ADOQUINES':'CÉSPED';
   }
  }
  b.spinContact=touching;
  integratePhysicalSpin(b,prev,dt,touching,hit?.material||groundAt(b.x,b.z).type);
  // No time, distance or bounce-count cap. Confirm actual surface support.
  const planarSpeed=Math.hypot(b.vx,b.vz);
  const planarMoved=Math.hypot(b.x-prev.x,b.z-prev.z);
  // Tiny vertical solver corrections on a roof are not airborne flight.
  // Check an actual supporting surface, and only when nearly stationary.
  let support=null;
  if(planarSpeed<.20&&Math.abs(b.vy)<1.5&&planarMoved<=.25*dt+.001){
   if(touching)support=b.y-radius;
   else{
    const floor=surfaceBelowBall(b);
    const gap=b.y-radius-floor.y;
    if(gap>=-.02&&gap<=.12)support=floor.y;
   }
  }
  if(support!==null){
   b.restTime=(b.restTime||0)+dt;
   // Supported, nearly stationary contact needs no artificial waiting.
   if(touching||b.restTime>=.10){
    b.y=support+radius;b.vx=0;b.vy=0;b.vz=0;
    this.finishShot();return;
   }
  }else b.restTime=0;
 }
 finishShot(){if(this.state!=='flight')return;this.clearTransientToast();this.audio?.stopFlightWind?.();this.launchView=false;this.launchCamera=null;this.clearEncounterReward?.();const b=this.ball;freezeBallSpin(b);this.state='rest';el('pitch-surface').hidden=true;const reward=settleShot(this.save,forwardDistance(b),{gull:b.encounters?.gull===true,gulls:b.hitGulls?.size||0,cars:b.hitCars?.size||0});
 const newly=recordDiscoveryShot(this.save,{quality:this.pendingShot?.quality,record:reward.record,
  peakZ:b.maxZ||0,road:!!b.encounters?.road,roof:!!b.encounters?.roof,
  water:!!b.encounters?.water,swamp:!!b.encounters?.swamp});
 const milestone=MILESTONES.filter(m=>reward.meters>=m.at&&!this.save.achievements.includes(m.label));
 for(const m of milestone)this.save.achievements.push(m.label);
 this.persist();
 this.pendingResult={reward,newly,milestone};
 if(this.save.cinematicCamera===true&&this.camera?.length===3&&this.target?.length===3){
  this.shotOrbit=createShotOrbit(b,this.camera,this.target);this.state='orbit';this.shake=0;
  for(const id of ['hud','result','upgrades','again','menu-return','controls','run-info','region','aim','aim-feedback'])el(id).hidden=true;
  el('orbit-skip').hidden=false;return;
 }
 this.presentShotResult();
 }
 completeShotOrbit(){
  if(this.state!=='orbit'||!this.pendingResult)return;
  this.state='rest';this.presentShotResult();
 }
 presentShotResult(){
  if(!this.pendingResult)return;
  const {reward,newly,milestone}=this.pendingResult;this.pendingResult=null;
  if(el('orbit-skip'))el('orbit-skip').hidden=true;
  el('hud').hidden=false;el('app').classList.add('resting');el('again').hidden=false;
  this.renderEncounterRewards?.(reward);
  this.showDiscoveries(newly);this.audio.cash();if(reward.record)this.audio.record();el('result-quality').textContent=qualityNames[this.pendingShot.quality];el('result-meters').textContent=formatInt(reward.meters);el('result-coins').textContent='+'+formatInt(reward.coins);
 el('coin-breakdown').textContent='BASE '+formatInt(reward.baseCoins)+' · BONO +'+formatInt(reward.bonusCoins)+' · x'+reward.multiplier.toFixed(2);el('best-label').textContent='MEJOR MARCA: '+formatInt(this.save.best)+' M';el('result-total-meters').textContent=formatInt(this.save.totalMeters||0)+' m';el('record-badge').hidden=!reward.record;el('reward-note').textContent=reward.eventCoins?'🏅 ENCUENTRO CON GAVIOTA':reward.record?'🏆 NUEVO RÉCORD':reward.carCoins?'🚗 '+reward.carCount+' '+(reward.carCount===1?'COCHE':'COCHES')+' · +'+formatInt(reward.carCoins):'RECOMPENSA GANADA';el('result').hidden=false;el('upgrades').hidden=false;el('menu-return').hidden=false;el('controls').hidden=true;el('run-info').hidden=true;el('region').hidden=true;el('aim').hidden=true;
 this.drawUI();if(milestone.length)this.toast('🏅 '+milestone[milestone.length-1].at+' M · '+milestone[milestone.length-1].label); }
 resetAndPitch(){this.showDiscoveries([]);el('result').hidden=true;el('menu-return').hidden=true;this.impactFX?.clear();this.camera=[-6.7,7.5,-20.5];this.target=[-.8,3.5,12];this.startPitch()}
 update(dt){this.clock+=dt;
  if(this.state==='menu'&&this.save.music&&this.save.sound){
   this.musicClock=(this.musicClock||0)-dt;
   if(this.musicClock<=0){this.audio?.menuMusic?.();this.musicClock=6.2}
  }
  if(this.encounterTimer>0){this.encounterTimer-=dt;if(this.encounterTimer<=0)this.clearEncounterReward?.()}
  if(!this.save?.reducedEffects)this.impactFX?.update(dt,()=>this.audio?.sound?.('glass',.026),this.state==='orbit');if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)this.clearTransientToast()}
 if(this.state==='pitching'||this.state==='whiff')this.advancePitch(dt);
 if(this.state==='pitching'){
  el('aim').hidden=true;
  this.updatePitchGuide();
  if(!this.strikeCalled)el('status-pill').textContent='⚾ VIENE EL LANZAMIENTO';
 }
 if(this.state==='whiff'){
  this.swingElapsed+=dt;this.visualSwingElapsed=this.swingElapsed;
  this.swing=.42+.58*clamp(this.swingElapsed/.17,0,1);
 }
 if(this.state==='aiming'){
   // La calidad y el instante del lanzamiento no cambian hasta que el dedo se suelta.
   this.aimElapsed+=dt;
   const position=aimBarPosition(Math.max(0,this.aimElapsed),this.save.levels.swing);
   this.aimAngle=preciseAim(Math.max(0,this.aimElapsed),this.save.levels.swing,this.save.levels.power,this.pendingShot?.deltaMs,equipmentBonuses(this.save).precision);
   el('aim-ball').style.left=((position+1)*50).toFixed(2)+'%';
   el('aim-heading').textContent=aimDegrees(this.aimAngle);
   const value=this.aimAngle*180/Math.PI;
   // Un único indicador: flecha 3D de origen fijo y texto de rumbo.
   el('aim-direction').textContent=Math.abs(position)<=aimSweetHalf(this.save.levels.swing,this.save.levels.power,equipmentBonuses(this.save).precision)?'PUNTO DULCE · '+(Math.abs(value)<.05?'RECTO':value>0?'IZQUIERDA':'DERECHA'):value>0?'IZQUIERDA':'DERECHA';
 }
 if(this.state==='swinging'){
   this.swingElapsed+=dt;
   const hold=this.contactHold||0;
   this.visualSwingElapsed=this.swingElapsed<=.05?this.swingElapsed:Math.max(.05,this.swingElapsed-hold);
   this.swing=.42+.58*clamp(this.visualSwingElapsed/.17,0,1);
   // Never delay a released hit because of a cosmetic hit-stop.
   if(this.swingElapsed>=.09)this.resolveSwing();
 }
 if(this.state==='flight'){
   const departure=!!this.launchCamera&&this.liveSeconds<LAUNCH_VIEW_SECONDS;
   this.liveSeconds+=dt;
   if(departure){
    this.swingElapsed+=dt;
    this.visualSwingElapsed=Math.max(.05,this.swingElapsed-(this.contactHold||0));
    this.swing=.42+.58*clamp(this.visualSwingElapsed/.17,0,1);
   }
   const speed=Math.hypot(this.ball.vx,this.ball.vz);const mult=flightTimeScale(speed,departure);const total=dt*mult;const substeps=Math.ceil(total/.026);
   for(let i=0;i<substeps&&this.state==='flight';i++)this.simulateStep(total/substeps,this.clock-dt+dt*i/substeps,this.clock-dt+dt*(i+1)/substeps);
   if(this.ball)this.ball.bounceVisual=Math.max(0,(this.ball.bounceVisual||0)-dt*5.5);
   // Always present spin at real display frame rate, not accelerated physics time.
   // First ground impact permanently switches the visible axis from backspin to
   // rolling topspin, including small airborne hops between bounces.
   if(this.state==='flight'){
    advanceVisualSpin(this.ball,dt);
    if(this.save?.equippedBall==='sol'&&!this.save?.reducedEffects)this.impactFX?.spawnSolarTrail(this.ball,dt);
    if(this.save?.equippedBall==='nieve'&&!this.save?.reducedEffects)this.impactFX?.spawnSnowTrail(this.ball,dt);
   }
   this.launchView=this.state==='flight'&&!!this.launchCamera&&this.liveSeconds<LAUNCH_VIEW_SECONDS;
   if(this.state==='flight')this.audio?.flightWind?.(Math.hypot(this.ball.vx,this.ball.vy,this.ball.vz),this.launchView||this.save?.reducedEffects?0:1);
   this.distance=forwardDistance(this.ball);el('distance').textContent=formatInt(this.distance);el('region').textContent=areaAt(this.distance)+' · '+(this.distance/1000).toFixed(2)+' KM';
   // The display clock is telemetry only; simulateStep decides physical rest.
 }
 const flight=this.state==='flight'||this.state==='rest'||this.state==='orbit';let desiredCam,desiredTarget,zoom;
 const departure=this.state==='flight'&&this.launchView&&!!this.launchCamera;
 const cutToFlight=this.state==='flight'&&!departure&&!!this.launchCamera;
 if(departure){
  desiredCam=this.launchCamera.camera;desiredTarget=this.launchCamera.target;zoom=62;
 }else if(this.shotOrbit&&['orbit','rest'].includes(this.state)){
  if(this.state==='orbit')this.shotOrbit.elapsed=Math.min(SHOT_ORBIT_SECONDS,this.shotOrbit.elapsed+dt);
  const pose=shotOrbitPose(this.shotOrbit,this.shotOrbit.elapsed);desiredCam=pose.camera;desiredTarget=pose.target;zoom=pose.zoom;
  if(this.state==='orbit'&&this.shotOrbit.elapsed>=SHOT_ORBIT_SECONDS)this.completeShotOrbit();
 }else if(flight&&this.ball){const b=this.ball;const speed=Math.hypot(b.vz,b.vx);desiredCam=[b.x+clamp(b.y*.035,9,50),b.y+Math.min(120,16+b.y*.18),b.z-clamp(18+speed*.42,32,310)];desiredTarget=[b.x,b.y*.54,b.z+clamp(speed*.14,14,65)];zoom=58;
 }
 else{
  const bob=Math.sin(this.clock*.4)*.10;
  if(this.state==='aiming'){
   desiredCam=[-6.7,7.5+bob,-20.5];desiredTarget=[-.8,3.5,12];zoom=62;
  }else{
   desiredCam=[-6.7,7.5+bob,-20.5];desiredTarget=[-.8,3.5,12];zoom=62;
  }
 }
 const smooth=departure||cutToFlight||this.shotOrbit&&['orbit','rest'].includes(this.state)?1:1-Math.exp(-dt*(flight?3.6:this.state==='aiming'?7.5:2.8));for(let i=0;i<3;i++){this.camera[i]=lerp(this.camera[i],desiredCam[i],smooth);this.target[i]=lerp(this.target[i],desiredTarget[i],smooth)}
 if(cutToFlight)this.launchCamera=null;
 this.renderer.fogDistance=flight&&this.camera[1]>350?1700:580;
 const cameraFrame=[...this.camera];
 if(this.shake>0){
  this.shake=Math.max(0,this.shake-dt);
  const jitter=Math.min(.5,this.shake*1.55);
  cameraFrame[0]+=Math.sin(this.clock*93)*jitter;
  cameraFrame[1]+=Math.cos(this.clock*111)*jitter*.4;
 }
 this.fxCamera=cameraFrame;
 drawWorld(this.renderer,cameraFrame,this);
 this.renderer.render(cameraFrame,this.target,zoom);this.sprites?.draw(this,zoom);
 }
 frame(now){if(this.stopped){this.last=now;requestAnimationFrame(t=>this.frame(t));return}
  if(this.save.batterySaver&&this.lastRender&&now-this.lastRender<32){
   requestAnimationFrame(t=>this.frame(t));return;
  }
  this.lastRender=now;
  const dt=this.last?clamp((now-this.last)/1000,0,.048):.016;this.last=now;this.frames++;this.fpsClock+=dt;this.qualityClock+=dt;
 if(this.fpsClock>1.4){this.fps=Math.round(this.frames/this.fpsClock);el('fps').textContent=this.fps+' FPS';this.fpsClock=0;this.frames=0}
 if(this.qualityClock>9){if(this.save.graphics==='auto'&&!this.save.batterySaver&&this.fps<31&&this.renderer.dpr>1.3){this.renderer.setQuality(false);this.toast('MODO RENDIMIENTO ACTIVADO')}this.qualityClock=0}
 try{this.update(dt)}catch(e){console.error('Render/update error',e);this.stopped=true;el('status-pill').textContent='ERROR 3D — REINICIA LA APLICACIÓN';}
 requestAnimationFrame(t=>this.frame(t));}
}