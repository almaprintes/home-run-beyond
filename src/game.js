import {Renderer,CanvasRenderer,lerp} from './engine.js?v=0.34.0';
import {drawWorld,groundAt,areaAt,traceBuildingCollision} from './world.js?v=0.34.0';
import {traceSideBoundary,WORLD_CENTER_X,WORLD_HALF_WIDTH} from './biomes.js?v=0.34.0';
import {SAVE_KEY,sanitizeSave,initialSave,formatInt,upgradeCost,upgrade,bonusCredits,bonusProgress,BONUS_EVERY,claimBonus,skillMaxLevel,calculateShot,batSpeedMs,settleShot,forwardDistance,coinMultiplier,MILESTONES,COSMETICS,OUTFITS,BALL_STYLES,SHOP_SECTIONS,equipCosmetic,qualityNames,clamp} from './logic.js?v=0.34.0';
import {GameAudio} from './audio.js?v=0.34.0';
import {hasRewardedAds,showRewardedAd} from './rewarded.js?v=0.34.0';
import {aimSweep,aimBarPosition,aimSweetHalf,redirectShot,aimDegrees,SWEEP_MAX_RAD} from './aiming.js?v=0.34.0';
import {BatterSprites} from './sprites.js?v=0.34.0';
import {makeCosmeticPreview} from './cosmetic-art.js?v=0.34.0';
import {ImpactEffects,hitStopDuration} from './impact-fx.js?v=0.34.0';
import {initBallSpin,onSpinImpact,integratePhysicalSpin,advanceVisualSpin} from './ball-spin.js?v=0.34.0';
const el=id=>document.getElementById(id);
// Rozamiento continuo por segundo: una cola de rodadura algo más larga,
// independiente de los FPS, sin alterar el vuelo ni la pérdida al rebotar.
export function groundRollRetention(type,dt){
 const friction=type==='road'?1.05:2.05;
 return Math.exp(-friction*Math.max(0,Number(dt)||0));
}
export class BaseballGame{
 constructor(){this.state='menu';this.shopSection='bat';this.musicClock=0;this.lastRender=0;this.pitch=0;this.swing=0;this.pitchElapsed=0;this.swingElapsed=0;this.pitchDuration=1.52;this.simElapsed=0;this.distance=0;this.ball=null;this.pendingShot=null;this.activePointer=null;this.aimElapsed=0;this.aimAngle=0;this.camera=[-6.7,7.5,-20.5];this.target=[-.8,3.5,12];this.clock=0;this.last=0;this.fpsClock=0;this.frames=0;this.fps=60;this.qualityClock=0;this.stopped=false;this.toastTimer=0;this.toastText='';this.shake=0;this.audio=new GameAudio();this.impactFX=new ImpactEffects();this.contactHold=0;this.visualSwingElapsed=0;this.fxCamera=null;this.rewardPending=false;this.strikeCalled=false;
 try{this.save=sanitizeSave(JSON.parse(localStorage.getItem(SAVE_KEY)))}catch{this.save=initialSave()}
 this.audio.enabled=this.save.sound;this.audio.voiceEnabled=this.save.voice;this.batColor=COSMETICS.find(c=>c.id===this.save.equipped)?.color||'#e7b56e';
 try{this.renderer=new Renderer(el('world'))}catch(e){console.warn('WebGL2 no disponible; utilizando reserva gráfica 2D',e);this.renderer=new CanvasRenderer(el('world'))}this.renderer.game=this;
 this.spriteReady=false;this.sprites=new BatterSprites(el('character-overlay'));
 this.sprites.load().then(ok=>{
  this.spriteReady=ok;
  this.shopPreviewCache?.clear();
  if(typeof document!=='undefined'&&!el('shop')?.hidden)this.renderShop();
 }).catch(err=>console.warn('Bateador 2.5D no disponible',err));
 this.initUI();this.applySettings();this.drawUI();this.showMenu();requestAnimationFrame(now=>this.frame(now));}
 persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.save))}catch(e){if(e?.name!=='SecurityError')console.warn('No se pudo guardar el progreso',e)}}
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
  this.onAction();
 };
 action.addEventListener('pointerdown',beginHold);
 pitchSurface.addEventListener('pointerdown',beginHold);
 const release=e=>{
  if(this.activePointer===null||e.pointerId!==this.activePointer)return;
  this.activePointer=null;
  if(this.state==='aiming'){e.preventDefault?.();this.swingBat(false)}
 };
 for(const target of [pitchSurface,action]){
  target.addEventListener('pointerup',release);
  target.addEventListener('pointercancel',release);
  target.addEventListener('lostpointercapture',release);
 }
 window.addEventListener('pointerup',release);
 window.addEventListener('pointercancel',release);
 click('again',()=>this.resetAndPitch());
 click('start',()=>{this.save.seenIntro=true;this.persist();el('welcome').hidden=true;this.playFromMenu()});
 click('guide-close',()=>{el('welcome').hidden=true;this.showMenu()});
 click('menu-play',()=>this.playFromMenu());
 click('menu-shop',()=>this.openShop());
 click('menu-settings',()=>this.openSettings());
 click('menu-return',()=>this.showMenu());
 click('settings-close',()=>this.closeSettings());
 click('settings-guide',()=>{this.closeSettings();el('welcome').hidden=false});
 click('settings-reset',()=>this.resetProgress());
 for(const category of Object.keys(SHOP_SECTIONS))click('shop-tab-'+category,()=>{this.shopSection=category;this.renderShop()});
 for(const key of ['sound','voice','music','vibration','showHints','reducedEffects','batterySaver'])
  click('settings-'+key,()=>this.toggleSetting(key));
 el('settings-graphics').addEventListener('change',event=>{
  this.save.graphics=['auto','high','low'].includes(event.target.value)?event.target.value:'auto';
  this.persist();this.applySettings();this.renderSettings();
 });
 click('shop-open',()=>this.openShop());click('shop-close',()=>this.closeShop());click('sound',()=>this.toggleSetting('sound'));
 for(const key of ['power','swing','multiplier'])click('up-'+key,()=>this.buyUpgrade(key));
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
   if(!el('welcome').hidden){el('welcome').hidden=true;this.showMenu();return}
   if(!el('settings').hidden){this.closeSettings();return}
   if(!el('shop').hidden){this.closeShop();return}
   if(this.state==='rest'){this.showMenu();return}
  }
  if(e.code==='Space'||e.code==='Enter'){
   if(e.repeat||!el('welcome').hidden||!el('shop').hidden||!el('settings').hidden||!el('main-menu').hidden)return;
   if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;
   e.preventDefault();if(this.state==='rest')this.resetAndPitch();else this.onAction();
  }
 });
 document.addEventListener('keyup',e=>{if((e.code==='Space'||e.code==='Enter')&&this.state==='aiming'&&this.activePointer===null){e.preventDefault();this.swingBat(false)}});
 document.addEventListener('visibilitychange',()=>{this.last=0;this.stopped=document.hidden});
 document.addEventListener('contextmenu',e=>e.preventDefault());
 this.debug=new URLSearchParams(location.search).has('debug');if(this.debug)el('quality').classList.remove('low');
 }
 showMenu(){
  this.state='menu';this.activePointer=null;this.ball=null;this.pendingShot=null;
  this.impactFX?.clear();this.shake=0;this.camera=[-6.7,7.5,-20.5];this.target=[-.8,3.5,12];
  el('main-menu').hidden=false;el('hud').hidden=true;el('controls').hidden=true;
  el('run-info').hidden=true;el('region').hidden=true;el('result').hidden=true;
  el('upgrades').hidden=true;el('pitch-surface').hidden=true;el('aim-feedback').hidden=true;
  el('aim').hidden=true;el('welcome').hidden=true;el('menu-return').hidden=true;
  this.musicClock=0;this.drawUI();
 }
 playFromMenu(){
  if(!el('shop').hidden||!el('settings').hidden)return;
  el('main-menu').hidden=true;el('hud').hidden=false;
  this.state='ready';this.resetAndPitch();
 }
 openSettings(){
  if(!['menu','ready','rest'].includes(this.state))return;
  this.renderSettings();el('settings').hidden=false;
 }
 closeSettings(){el('settings').hidden=true;this.drawUI()}
 toggleSetting(key){
  if(!['sound','voice','music','vibration','showHints','reducedEffects','batterySaver'].includes(key))return;
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
  for(const key of ['sound','voice','music','vibration','showHints','reducedEffects','batterySaver']){
   const button=el('settings-'+key);
   button.setAttribute('aria-pressed',String(Boolean(this.save[key])));
   button.querySelector('.setting-status').textContent=this.save[key]?'SÍ':'NO';
  }
  el('settings-graphics').value=this.save.graphics;
 }
 resetProgress(){
  if(typeof window==='undefined'||!window.confirm?.('¿Borrar todas las monedas, mejoras, ropa, bates, pelotas y récords de este dispositivo? No se puede deshacer.'))return;
  this.save=initialSave();this.batColor=COSMETICS[0].color;
  this.persist();this.applySettings();this.renderSettings();this.drawUI();
  this.toast('PARTIDA LOCAL REINICIADA');
 }
 closeShop(){el('shop').hidden=true;this.drawUI()}
 openShop(){
  if(!['menu','ready','rest'].includes(this.state))return;
  this.shopSection=this.shopSection||'bat';
  el('shop').hidden=false;this.renderShop();
 }
 renderShop(){
  const category=SHOP_SECTIONS[this.shopSection]||SHOP_SECTIONS.bat;
  el('shop-money').textContent='✦ '+formatInt(this.save.coins);
  for(const key of Object.keys(SHOP_SECTIONS)){
   const tab=el('shop-tab-'+key),active=key===this.shopSection;
   tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active));
  }
  const container=el('shop-items');container.replaceChildren();
  this.shopPreviewCache ||= new Map();
  for(const item of category.items){
   const owned=this.save[category.owned].includes(item.id);
   const equipped=this.save[category.equipped]===item.id;
   const row=document.createElement('div');row.className='shop-item'+(equipped?' selected':'');
   const preview=document.createElement('div');preview.className='shop-preview shop-preview-art';
   const artKey=this.shopSection+':'+item.id;
   let art=this.shopPreviewCache.get(artKey);
   if(!art){
    const source=this.shopSection==='ball'?this.sprites?.images?.ball:
     this.shopSection==='outfit'?this.sprites?.images?.ready:null;
    art=makeCosmeticPreview(this.shopSection,item,source);
    if(art&&source||art&&this.shopSection==='bat')this.shopPreviewCache.set(artKey,art);
   }
   if(art){
    // cloneNode no clona los píxeles de un canvas: copiar el dibujo explícitamente.
    const display=document.createElement('canvas');display.width=art.width;display.height=art.height;
    display.getContext('2d')?.drawImage(art,0,0);
    preview.append(display);
   }
   else preview.textContent=item.emoji;
   const swatch=document.createElement('span');swatch.className='shop-swatch';swatch.style.background=item.color;preview.append(swatch);
   const detail=document.createElement('div');detail.className='shop-detail';
   const strong=document.createElement('strong');strong.textContent=item.name;
   const small=document.createElement('small');
   small.textContent=item.rarity+' · '+item.description;
   detail.append(strong,small);
   const btn=document.createElement('button');btn.type='button';btn.className='shop-buy';
   btn.textContent=equipped?'EQUIPADO':owned?'EQUIPAR':'✦ '+formatInt(item.price);
   btn.disabled=equipped||(!owned&&this.save.coins<item.price);
   btn.setAttribute('aria-label',(equipped?'Equipado ':owned?'Equipar ':'Comprar ')+item.name);
   btn.addEventListener('click',()=>{
    const status=equipCosmetic(this.save,this.shopSection,item.id);
    if(status==='invalid'||status==='insufficient')return;
    if(status==='purchased')this.audio.cash();
    this.batColor=COSMETICS.find(c=>c.id===this.save.equipped)?.color||'#e7b56e';
    this.persist();this.drawUI();this.renderShop();
   });
   row.append(preview,detail,btn);container.append(row);
  }
 }
 buyUpgrade(key){
  if(this.state==='pitching'||this.state==='aiming'||this.state==='swinging'||this.state==='flight'||this.rewardPending)return;
  if(!['power','swing','multiplier'].includes(key))return;
  // Nunca cobrar monedas ni mostrar un anuncio por un nivel sin beneficio.
  if(this.save.levels[key]>=skillMaxLevel(key)){this.toast('MÁXIMO ALCANZADO');return;}
  if(bonusCredits(this.save)>0&&hasRewardedAds()){
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
  el('money').textContent=formatInt(this.save.coins);el('best-hud').textContent=formatInt(this.save.best)+' m';
  el('menu-money').textContent=formatInt(this.save.coins);
  el('menu-best').textContent=formatInt(this.save.best)+' m';
  el('menu-shots').textContent=formatInt(this.save.shots);
  el('menu-region').textContent=areaAt(Math.max(this.save.best,0));
  const bat=COSMETICS.find(item=>item.id===this.save.equipped)||COSMETICS[0];
  const outfit=OUTFITS.find(item=>item.id===this.save.equippedOutfit)||OUTFITS[0];
  const ball=BALL_STYLES.find(item=>item.id===this.save.equippedBall)||BALL_STYLES[0];
  el('menu-equipment').textContent='🏏 '+bat.name+'  ·  👕 '+outfit.name+'  ·  ⚾ '+ball.name;
  el('shots-hud').textContent=formatInt(this.save.shots);el('region-hud').textContent=areaAt(Math.max(this.save.best,0));
  el('sound').textContent=this.save.sound?'♫':'♩';
  const bonus=bonusCredits(this.save)>0,hasAds=hasRewardedAds(),progress=bonusProgress(this.save);
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
 toast(s){el('toast').textContent=s;el('toast').classList.add('show');this.toastTimer=1.85;this.toastText=s}
 onAction(){if(!el('welcome').hidden||!el('shop').hidden||!el('settings').hidden||!el('main-menu').hidden)return;this.audio.init();if(this.state==='ready')this.startPitch();else if(this.state==='pitching')this.freezeSwing(false);}

 startPitch(){
  this.audio?.prepareStrike?.();
  this.state='pitching';this.activePointer=null;this.aimElapsed=0;this.aimAngle=0;
  this.strikeCalled=false;this.swingElapsed=0;this.visualSwingElapsed=0;
  el('app').classList.remove('resting','aiming');el('again').hidden=true;
  el('pitch-surface').hidden=false;el('aim-feedback').hidden=true;
  el('pitch-touch-label').textContent='MANTÉN PULSADO PARA BATEAR';
  el('region').hidden=false;this.pitch=0;this.swing=0;this.pitchElapsed=0;
  this.ball=null;this.distance=0;this.pendingShot=null;
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
 freezeSwing(auto=false){
  if(this.state!=='pitching'||this.strikeCalled)return;
  const contactTime=this.pitchElapsed+batSpeedMs()/1000;
  const deltaMs=(contactTime-.91*this.pitchDuration)*1000;
  this.pendingShot=calculateShot(this.save.levels,auto?999:deltaMs);
  this.pendingShot.deltaMs=deltaMs;
  this.state='aiming';this.aimElapsed=0;this.aimAngle=aimSweep(0,this.save.levels.swing);this.swing=.42;
  el('app').classList.add('aiming');el('aim-feedback').hidden=false;
  el('locked-quality').textContent=qualityNames[this.pendingShot.quality];
  el('aim-heading').textContent=aimDegrees(this.aimAngle);el('aim-direction').textContent='IZQUIERDA';
  el('aim-sweet-zone').style.width=(aimSweetHalf(this.save.levels.swing,this.save.levels.power)*100).toFixed(2)+'%';
  el('aim-ball').style.left='0%';
  el('pitch-touch-label').textContent='SUELTA PARA FIJAR DIRECCIÓN';
  el('aim').hidden=true;el('region').textContent='DIRECCIÓN DEL BATAZO';
 }
 swingBat(auto=false){
  if(this.state==='pitching')this.freezeSwing(auto);
  if(this.state!=='aiming')return;
  const sweet=Math.abs(aimBarPosition(this.aimElapsed,this.save.levels.swing))<=aimSweetHalf(this.save.levels.swing,this.save.levels.power);
  this.pendingShot=redirectShot(this.pendingShot,auto||sweet?0:this.aimAngle);
  this.state='swinging';el('pitch-surface').hidden=true;el('aim-feedback').hidden=true;
  el('app').classList.remove('aiming');
  this.swingElapsed=0;this.visualSwingElapsed=0;this.contactHold=hitStopDuration(this.pendingShot.quality);this.swing=.42;
  el('action').classList.remove('pitch');el('controls').hidden=true;el('aim').hidden=true;
  this.audio.swing();
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
  }
  if(progress>=1.26)this.finishStrike();
 }
 finishStrike(){
  if(this.state!=='pitching'&&this.state!=='whiff')return;
  this.state='rest';this.activePointer=null;this.ball=null;this.distance=0;
  el('app').classList.add('resting');el('app').classList.remove('aiming');
  el('pitch-surface').hidden=true;el('aim-feedback').hidden=true;el('again').hidden=false;
  el('result').hidden=false;el('upgrades').hidden=false;el('controls').hidden=true;
  el('run-info').hidden=true;el('region').hidden=true;el('aim').hidden=true;
  el('record-badge').hidden=true;el('menu-return').hidden=false;el('result-quality').textContent='¡STRIKE!';
  el('result-meters').textContent='0';el('result-coins').textContent='+0';el('coin-breakdown').textContent='SIN CONTACTO · x0';
  el('best-label').textContent='MEJOR MARCA: '+formatInt(this.save.best)+' M';
  el('reward-note').textContent='SIN CONTACTO · SIN MONEDAS';
  this.drawUI();
 }
 launch(){const hit=this.pendingShot;this.state='flight';el('run-info').hidden=false;this.simElapsed=0;this.liveSeconds=0;this.shake=this.save?.reducedEffects?0:hit.quality==='perfect'?.32:hit.quality==='excellent'?.18:.08;const b={x:-4.5,y:2.5,z:-4.7,vx:hit.vx,vy:hit.vy,vz:hit.vz,bounces:0,freeze:0,lastCollision:'',impactAge:99,impactMaterial:'grass',maxZ:0};this.ball=b;initBallSpin(b);this.distance=0;if(!this.save?.reducedEffects)this.impactFX?.spawnBat({x:b.x,y:b.y,z:b.z,quality:hit.quality});this.audio.hit(hit.quality);if(hit.quality==='miss')this.audio.miss();el('impact').textContent=qualityNames[hit.quality];el('impact').style.color=hit.quality==='perfect'?'#ffe38c':'#ffffff';if(this.save?.vibration!==false&&typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(hit.quality==='perfect'?[30,20,50]:25);}

 emitCollision(material,point,strength,normal={x:0,y:1,z:0}){
  if(!Number.isFinite(strength)||strength<1.2)return;
  if(!this.save?.reducedEffects)this.impactFX?.spawn({x:point.x,y:point.y,z:point.z,material,strength,normal});
  if(this.audio?.impact)this.audio.impact(material,strength);
  else this.audio?.land?.();
  if(!this.save?.reducedEffects)this.shake=Math.max(this.shake||0,Math.min(.13,.025+strength*.00085));
 }
 simulateStep(dt){
  const b=this.ball;
  if(!b||this.state!=='flight')return;
  const radius=1.45,prev={x:b.x,y:b.y,z:b.z};
  b.impactAge=(b.impactAge??99)+dt;
  b.vy-=9.81*dt;
  const next={x:b.x+b.vx*dt,y:b.y+b.vy*dt,z:b.z+b.vz*dt};
  const buildingHit=traceBuildingCollision(prev,next,radius);
   const boundaryHit=traceSideBoundary(prev,next,radius);
   const hit=boundaryHit&&(!buildingHit||boundaryHit.t<=buildingHit.t)?boundaryHit:buildingHit;
  let touching=false;
  if(hit){
   // El material determina el rebote; ningún número de impactos termina la partida.
   const n=hit.normal,mat=hit.material||'concrete';
   const sideHit=hit.kind==='side-boundary';
    const restitution=sideHit?.26:mat==='rubber'?.16:mat==='solid'?.80:.71;
   const tangentRetention=sideHit?.64:mat==='rubber'?.48:mat==='solid'?.92:.86;
   b.x=hit.point.x+n.x*.075;
   b.y=hit.point.y+n.y*.075;
   b.z=hit.point.z+n.z*.075;
   const normalSpeed=b.vx*n.x+b.vy*n.y+b.vz*n.z;
   const inward=Math.max(0,-normalSpeed);
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
   if(n.y>.5&&inward<1.5){
    // Reposo/rodadura: mantener contacto con el techo y disipar rozamiento.
    b.vy=0;
    const rollingDrag=Math.exp(-(mat==='rubber'?4.8:.85)*dt);
    b.vx*=rollingDrag;b.vz*=rollingDrag;
    touching=true;
   }
   b.lastCollision=sideHit?'CHOQUE CON '+hit.obstacle.toUpperCase():n.y>.5?(mat==='rubber'?'TEJADO DE GOMA':'REBOTE EN TEJADO'):hit.kind==='vent'?'CASETA DE AZOTEA':'CHOQUE CON FACHADA';
   if(inward>1){
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
  const ground=groundAt(b.x,b.z);
  if(b.y<=ground.y+radius){
   b.y=ground.y+radius;
   const type=ground.type;
   const wet=type==='water'||type==='swamp'||type==='puddle';
   const incomingSpeed=Math.hypot(b.vx,b.vy,b.vz);
   if(wet){
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
     b.vy=normalImpact*(type==='road'?.78:.39);
     b.vz*=type==='road'?.92:.70;b.vx*=type==='road'?.92:.70;
     b.impactAge=0;b.impactMaterial=type;
     b.bounces++;
     onSpinImpact(b,{x:0,y:1,z:0},type);
     this.emitCollision(type,{x:b.x,y:b.y,z:b.z},normalImpact,{x:0,y:1,z:0});
    }else{
     b.vy=0;
     const drag=groundRollRetention(type,dt);
     b.vz*=drag;b.vx*=drag;
     touching=true;
    }
    b.lastCollision=type==='road'?'ASFALTO':'CÉSPED';
   }
  }
  b.spinContact=touching;
  integratePhysicalSpin(b,prev,dt,touching,hit?.material||groundAt(b.x,b.z).type);
  const speed=Math.hypot(b.vx,b.vy,b.vz);
  if(touching&&speed<.85)b.restTime=(b.restTime||0)+dt;
  else b.restTime=0;
  const moved=Math.hypot(b.x-prev.x,b.y-prev.y,b.z-prev.z);
  if(moved<.014&&speed<2)b.stillTime=(b.stillTime||0)+dt;
  else b.stillTime=0;
  // Terminación basada en reposo real, no en el material ni en contar rebotes.
  if(b.restTime>.24||b.stillTime>.75||(b.wetTime||0)>.65&&speed<2.5){
   this.finishShot();return;
  }
  if(this.simElapsed>340||b.z>200000||b.y< -10)this.finishShot();
 }
 finishShot(){if(this.state!=='flight')return;const b=this.ball;this.state='rest';el('app').classList.add('resting');el('pitch-surface').hidden=true;el('again').hidden=false;const reward=settleShot(this.save,forwardDistance(b));this.persist();this.audio.cash();if(reward.record)this.audio.record();el('result-quality').textContent=qualityNames[this.pendingShot.quality];el('result-meters').textContent=formatInt(reward.meters);el('result-coins').textContent='+'+formatInt(reward.coins);
 el('coin-breakdown').textContent='BASE '+formatInt(reward.baseCoins)+' · BONO +'+formatInt(reward.bonusCoins)+' · x'+reward.multiplier.toFixed(2);el('best-label').textContent='MEJOR MARCA: '+formatInt(this.save.best)+' M';el('record-badge').hidden=!reward.record;el('reward-note').textContent=reward.record?'🏆 NUEVO RÉCORD':'RECOMPENSA GANADA';el('result').hidden=false;el('upgrades').hidden=false;el('menu-return').hidden=false;el('controls').hidden=true;el('run-info').hidden=true;el('region').hidden=true;el('aim').hidden=true;
 this.drawUI();const milestone=MILESTONES.filter(m=>reward.meters>=m.at&&!this.save.achievements.includes(m.label));if(milestone.length){for(const m of milestone)this.save.achievements.push(m.label);this.persist();this.toast('🏅 '+milestone[milestone.length-1].at+' M · '+milestone[milestone.length-1].label)} }
 resetAndPitch(){el('result').hidden=true;el('menu-return').hidden=true;this.impactFX?.clear();this.camera=[-6.7,7.5,-20.5];this.target=[-.8,3.5,12];this.startPitch()}
 update(dt){this.clock+=dt;
  if(this.state==='menu'&&this.save.music&&this.save.sound){
   this.musicClock=(this.musicClock||0)-dt;
   if(this.musicClock<=0){this.audio?.menuMusic?.();this.musicClock=6.2}
  }
  if(!this.save?.reducedEffects)this.impactFX?.update(dt);if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)el('toast').classList.remove('show')}
 if(this.state==='pitching'||this.state==='whiff')this.advancePitch(dt);
 if(this.state==='pitching'){
  el('aim').hidden=true;
  if(!this.strikeCalled)el('status-pill').textContent=this.pitch>.7?'🎯 ¡AHORA, AHORA!':'⚾ VIENE EL LANZAMIENTO';
 }
 if(this.state==='whiff'){
  this.swingElapsed+=dt;this.visualSwingElapsed=this.swingElapsed;
  this.swing=.42+.58*clamp(this.swingElapsed/.17,0,1);
 }
 if(this.state==='aiming'){
   // La calidad y el instante del lanzamiento no cambian hasta que el dedo se suelta.
   this.aimElapsed+=dt;
   const position=aimBarPosition(this.aimElapsed,this.save.levels.swing);
   this.aimAngle=aimSweep(this.aimElapsed,this.save.levels.swing);
   el('aim-ball').style.left=((position+1)*50).toFixed(2)+'%';
   el('aim-heading').textContent=aimDegrees(this.aimAngle);
   const value=this.aimAngle*180/Math.PI;
   // Un único indicador: flecha 3D de origen fijo y texto de rumbo.
   el('aim-direction').textContent=Math.abs(position)<=aimSweetHalf(this.save.levels.swing,this.save.levels.power)?'RECTO · PUNTO DULCE':value>0?'IZQUIERDA':'DERECHA';
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
   this.liveSeconds+=dt;
   const speed=Math.hypot(this.ball.vx,this.ball.vz);const mult=clamp(speed/58,1,22);const total=dt*mult;const substeps=Math.ceil(total/.026);
   for(let i=0;i<substeps&&this.state==='flight';i++)this.simulateStep(total/substeps);
   // Always present spin at real display frame rate, not accelerated physics time.
   // First ground impact permanently switches the visible axis from backspin to
   // rolling topspin, including small airborne hops between bounces.
   advanceVisualSpin(this.ball,dt);
   this.distance=forwardDistance(this.ball);el('distance').textContent=formatInt(this.distance);el('region').textContent=areaAt(this.distance)+' · '+(this.distance/1000).toFixed(2)+' KM';
   if(this.liveSeconds>23)this.finishShot();
 }
 const flight=this.state==='flight'||this.state==='rest';let desiredCam,desiredTarget,zoom;
 if(flight&&this.ball){const b=this.ball;const speed=Math.hypot(b.vz,b.vx);desiredCam=[b.x+clamp(b.y*.035,9,50),b.y+Math.min(120,16+b.y*.18),b.z-clamp(18+speed*.42,32,310)];desiredTarget=[b.x,b.y*.54,b.z+clamp(speed*.14,14,65)];zoom=58}
 else{
  const bob=Math.sin(this.clock*.4)*.10;
  if(this.state==='aiming'){
   desiredCam=[-6.7,7.5+bob,-20.5];desiredTarget=[-.8,3.5,12];zoom=62;
  }else{
   desiredCam=[-6.7,7.5+bob,-20.5];desiredTarget=[-.8,3.5,12];zoom=62;
  }
 }
 const smooth=1-Math.exp(-dt*(flight?3.6:this.state==='aiming'?7.5:2.8));for(let i=0;i<3;i++){this.camera[i]=lerp(this.camera[i],desiredCam[i],smooth);this.target[i]=lerp(this.target[i],desiredTarget[i],smooth)}
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