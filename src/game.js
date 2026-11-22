import {Renderer,CanvasRenderer,lerp} from './engine.js';
import {drawWorld,groundAt,areaAt,traceBuildingCollision} from './world.js';
import {SAVE_KEY,sanitizeSave,initialSave,formatInt,upgradeCost,upgrade,bonusCredits,bonusProgress,BONUS_EVERY,claimBonus,calculateShot,batSpeedMs,settleShot,MILESTONES,COSMETICS,qualityNames,clamp} from './logic.js';
import {GameAudio} from './audio.js';
import {hasRewardedAds,showRewardedAd} from './rewarded.js';
const el=id=>document.getElementById(id);
export class BaseballGame{
 constructor(){this.state='ready';this.pitch=0;this.swing=0;this.pitchElapsed=0;this.swingElapsed=0;this.pitchDuration=1.52;this.simElapsed=0;this.distance=0;this.ball=null;this.pendingShot=null;this.camera=[11,16,-35];this.target=[0,2,32];this.clock=0;this.last=0;this.fpsClock=0;this.frames=0;this.fps=60;this.qualityClock=0;this.stopped=false;this.toastTimer=0;this.toastText='';this.shake=0;this.audio=new GameAudio();this.rewardPending=false;
 try{this.save=sanitizeSave(JSON.parse(localStorage.getItem(SAVE_KEY)))}catch{this.save=initialSave()}
 this.audio.enabled=this.save.sound;this.batColor=COSMETICS.find(c=>c.id===this.save.equipped)?.color||'#e7b56e';
 try{this.renderer=new Renderer(el('world'))}catch(e){console.warn('WebGL2 no disponible; utilizando reserva gráfica 2D',e);this.renderer=new CanvasRenderer(el('world'))}this.renderer.game=this;
 this.initUI();this.drawUI();this.showIntro();requestAnimationFrame(now=>this.frame(now));}
 persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.save))}catch(e){if(e?.name!=='SecurityError')console.warn('No se pudo guardar el progreso',e)}}
 initUI(){const click=(id,fn)=>el(id).addEventListener('click',e=>{e.preventDefault();fn(e)});
 el('action').addEventListener('pointerdown',e=>{e.preventDefault();this.onAction()});
 el('pitch-surface').addEventListener('pointerdown',e=>{if(this.state!=='pitching')return;e.preventDefault();this.onAction()});
 click('again',()=>this.resetAndPitch());click('start',()=>{this.save.seenIntro=true;this.persist();el('welcome').hidden=true;this.resetAndPitch()});
 click('shop-open',()=>this.openShop());click('shop-close',()=>this.closeShop());click('sound',()=>{this.save.sound=!this.save.sound;this.audio.enabled=this.save.sound;this.persist();this.drawUI();this.toast(this.save.sound?'SONIDO ACTIVADO':'SONIDO DESACTIVADO')});
 for(const key of ['power','swing','reflex'])click('up-'+key,()=>this.buyUpgrade(key));
 document.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){if(e.repeat)return;if(!el('welcome').hidden||!el('shop').hidden)return;e.preventDefault();if(this.state==='rest')this.resetAndPitch();else this.onAction()}});
 document.addEventListener('visibilitychange',()=>{this.last=0;this.stopped=document.hidden});
 document.addEventListener('contextmenu',e=>e.preventDefault());
 this.debug=new URLSearchParams(location.search).has('debug');if(this.debug)el('quality').classList.remove('low');
 }
 showIntro(){el('welcome').hidden=this.save.seenIntro;if(!this.save.seenIntro){el('controls').hidden=true;el('upgrades').hidden=true;el('run-info').hidden=true;}}
 closeShop(){el('shop').hidden=true;this.drawUI()}
 openShop(){if(this.state==='pitching'||this.state==='swinging'||this.state==='flight')return;el('shop').hidden=false;this.renderShop()}
 renderShop(){el('shop-items').replaceChildren();for(const item of COSMETICS){const owned=this.save.owned.includes(item.id),equipped=this.save.equipped===item.id;const row=document.createElement('div');row.className='shop-item';const preview=document.createElement('div');preview.className='shop-preview';preview.style.color=item.color;preview.textContent=item.emoji;const detail=document.createElement('div');detail.className='shop-detail';const strong=document.createElement('strong');strong.textContent=item.name;const small=document.createElement('small');small.textContent=item.description;detail.append(strong,small);const btn=document.createElement('button');btn.className='shop-buy';btn.textContent=equipped?'EQUIPADO':owned?'EQUIPAR':`✦ ${formatInt(item.price)}`;btn.disabled=equipped||(!owned&&this.save.coins<item.price);btn.addEventListener('click',()=>{if(!owned&&this.save.coins<item.price)return;if(!owned){this.save.coins-=item.price;this.save.owned.push(item.id);this.audio.cash()}this.save.equipped=item.id;this.batColor=item.color;this.persist();this.renderShop();this.drawUI()});row.append(preview,detail,btn);el('shop-items').append(row)}}
 buyUpgrade(key){
  if(this.state==='pitching'||this.state==='swinging'||this.state==='flight'||this.rewardPending)return;
  if(bonusCredits(this.save)>0){
   if(hasRewardedAds()){
    this.rewardPending=true;this.drawUI();
    showRewardedAd().then(rewarded=>{if(rewarded)this.applyBonus(key);else this.toast('VÍDEO NO COMPLETADO · CONSERVAS EL BONO')})
     .finally(()=>{this.rewardPending=false;this.drawUI()});
   }else this.applyBonus(key);
   return;
  }
  if(upgrade(this.save,key)){
   this.audio.cash();this.persist();this.drawUI();
   if(bonusCredits(this.save)>0)this.toast('🎁 ¡BONUS EXTRA DESBLOQUEADO!');
   else this.toast({power:'¡MÁS POTENCIA!',swing:'¡SWING MÁS RÁPIDO!',reflex:'¡REFLEJOS MEJORADOS!'}[key]);
  }else this.toast('TE FALTAN MONEDAS');
 }
 applyBonus(key){if(claimBonus(this.save,key)){this.audio.cash();this.persist();this.drawUI();this.toast('🎁 +1 NIVEL EXTRA · ¡GRATIS!')}}
 drawUI(){
  el('money').textContent=formatInt(this.save.coins);el('best-hud').textContent=formatInt(this.save.best)+' m';
  el('shots-hud').textContent=formatInt(this.save.shots);el('region-hud').textContent=areaAt(Math.max(this.save.best,0));
  el('sound').textContent=this.save.sound?'♫':'♩';
  const bonus=bonusCredits(this.save)>0,hasAds=hasRewardedAds(),progress=bonusProgress(this.save);
  el('bonus-track').classList.toggle('ready',bonus);
  el('bonus-text').textContent=bonus?(hasAds?'MEJORA EXTRA CON VÍDEO':'BONO ALFA · SIN ANUNCIO'):'MEJORA EXTRA CADA 4 COMPRAS';
  el('bonus-progress').textContent=bonus?'ELIGE SKILL':progress+'/'+BONUS_EVERY;
  for(const key of ['power','swing','reflex']){
   const lvl=this.save.levels[key],cost=upgradeCost(lvl,key),affordable=cost<=this.save.coins;
   const button=el('up-'+key),free=bonus&&!this.rewardPending;
   el('level-'+key).textContent='NIV. '+formatInt(lvl);
   el('cost-'+key).textContent=free?'+1 NIVEL':formatInt(cost);
   el('buy-label-'+key).textContent=this.rewardPending?'ESPERA':free?(hasAds?'VER VÍDEO':'BONO GRATIS'):affordable?'MEJORAR':'SIN MONEDAS';
   button.classList.toggle('is-affordable',!bonus&&affordable&&!this.rewardPending);
   button.classList.toggle('is-bonus',free);
   button.classList.toggle('is-locked',!free&&!affordable);
   button.disabled=this.rewardPending||(!bonus&&!affordable);
   button.setAttribute('aria-label',key+' nivel '+lvl+', '+(free?'mejora extra '+(hasAds?'con vídeo':'gratis en alfa'):affordable?'mejorar por '+cost+' monedas':'faltan monedas'));
  }
 }
 toast(s){el('toast').textContent=s;el('toast').classList.add('show');this.toastTimer=1.85;this.toastText=s}
 onAction(){if(!el('welcome').hidden||!el('shop').hidden)return;this.audio.init();if(this.state==='ready')this.startPitch();else if(this.state==='pitching')this.swingBat(false);}
 startPitch(){this.state='pitching';el('app').classList.remove('resting');el('again').hidden=true;el('pitch-surface').hidden=false;el('region').hidden=false;this.pitch=0;this.swing=0;this.pitchElapsed=0;this.ball=null;this.distance=0;this.pendingShot=null;el('result').hidden=true;el('record-badge').hidden=true;el('impact').textContent='';el('distance').textContent='0';el('controls').hidden=true;el('run-info').hidden=false;el('upgrades').hidden=true;el('action-title').textContent='¡BATEA!';el('action-sub').textContent='PULSA EN EL MOMENTO JUSTO';el('action-icon').textContent='⚾';el('action').classList.add('pitch');el('status-pill').textContent='⚾ VIENE EL LANZAMIENTO';el('tip').textContent='Sigue la pelota y pulsa cuando llegue al bate';el('region').textContent='ESTADIO · 0 KM';this.audio.tone(420,.12,'sine',.065,0,-140);}
 swingBat(auto=false){if(this.state!=='pitching')return;const contactTime=this.pitchElapsed+batSpeedMs(this.save.levels.swing)/1000;const deltaMs=(contactTime-.91*this.pitchDuration)*1000;this.pendingShot=calculateShot(this.save.levels,auto?999:deltaMs);this.pendingShot.deltaMs=deltaMs;this.state='swinging';el('pitch-surface').hidden=true;this.swingElapsed=0;this.swing=0;el('action').classList.remove('pitch');el('controls').hidden=true;el('aim').hidden=true;this.audio.swing();}
 launch(){const hit=this.pendingShot;this.state='flight';this.simElapsed=0;this.liveSeconds=0;this.shake=hit.quality==='perfect'?.32:hit.quality==='excellent'?.18:.08;const b={x:-2.3,y:2.2,z:0,vx:hit.vx,vy:hit.vy,vz:hit.vz,bounces:0,freeze:0,lastCollision:'',maxZ:0};this.ball=b;this.distance=0;this.audio.hit(hit.quality);if(hit.quality==='miss')this.audio.miss();el('impact').textContent=qualityNames[hit.quality];el('impact').style.color=hit.quality==='perfect'?'#ffe38c':'#ffffff';if(navigator.vibrate)navigator.vibrate(hit.quality==='perfect'?[30,20,50]:25);}

 simulateStep(dt){
  const b=this.ball;if(!b||this.state!=='flight')return;
  const radius=1.45;
  const before={x:b.x,y:b.y,z:b.z};
  b.vy-=9.81*dt;
  const next={x:b.x+b.vx*dt,y:b.y+b.vy*dt,z:b.z+b.vz*dt};
  const hit=traceBuildingCollision(before,next,radius);
  if(hit){
   // Una cubierta no debe mantener indefinidamente una pelota de baja energía.
   const n=hit.normal,eps=.09;
   const speedBefore=Math.hypot(b.vx,b.vy,b.vz);
   const inward=-(b.vx*n.x+b.vy*n.y+b.vz*n.z);
   b.x=hit.point.x+n.x*eps;b.y=hit.point.y+n.y*eps;b.z=hit.point.z+n.z*eps;
   b.buildingHits=(b.buildingHits||0)+1;
   b.firstBuildingZ ??= b.z;
   b.afterBuildingTime ??= 0;
   b.lastCollision=n.y>.5?'REBOTE EN TEJADO':hit.kind==='vent'?'CASETA DE AZOTEA':'CHOQUE CON FACHADA';
   // Apoyada en una azotea: detener en vez de simular micro-rebotes invisibles.
   if(n.y>.5 && (speedBefore<4.5 ||
       (b.buildingHits>1&&speedBefore<9&&inward<3.5))){
    b.vx=0;b.vy=0;b.vz=0;
    b.maxZ=Math.max(b.maxZ,b.z);
    this.finishShot();return;
   }
   if(inward>0){
    const rebound=n.y>.5?.38:.28,friction=n.y>.5?.77:.68;
    b.vx=(b.vx-(1+rebound)*(-inward)*n.x)*friction;
    b.vy=(b.vy-(1+rebound)*(-inward)*n.y)*friction;
    b.vz=(b.vz-(1+rebound)*(-inward)*n.z)*friction;
   }else{
    // Si aparece una penetración previa, resolverla sin reinyectar energía.
    b.vx*=.45;b.vy*=.45;b.vz*=.45;
   }
   b.bounces++;
   if(b.buildingHits<=3)this.audio.land();
   if(b.buildingHits>=4||Math.hypot(b.vx,b.vy,b.vz)<3.5){
    b.maxZ=Math.max(b.maxZ,b.z);
    this.finishShot();return;
   }
  }else{
   b.x=next.x;b.y=next.y;b.z=next.z;
  }
  b.maxZ=Math.max(b.maxZ,b.z);
  this.simElapsed+=dt;
  const ground=groundAt(b.x,b.z);
  if(b.y<=ground.y+radius){
   b.y=ground.y+radius;b.bounces++;
   if(ground.type==='water'){b.lastCollision='¡AL AGUA!';this.finishShot();return}
   const bounce=ground.type==='road'?.61:.37;
   b.vy=Math.abs(b.vy)*bounce;
   b.vz*=ground.type==='road'?.72:.58;b.vx*=.58;
   b.lastCollision=ground.type==='road'?'REBOTE EN ASFALTO':'REBOTE EN CÉSPED';
   if(b.bounces<=3)this.audio.land();
   if(b.bounces>=4||Math.abs(b.vz)<3||Math.abs(b.vy)<1.8){this.finishShot();return}
  }
  if(b.buildingHits>0){
   b.afterBuildingTime=(b.afterBuildingTime||0)+dt;
   const moved=Math.hypot(b.x-before.x,b.y-before.y,b.z-before.z);
   // Cuando la bola no se desplaza realmente, no esperar los 23 s de vuelo.
   if(moved<Math.max(.018,dt*1.35))b.stillAfterHit=(b.stillAfterHit||0)+dt;
   else b.stillAfterHit=Math.max(0,(b.stillAfterHit||0)-dt*.5);
   if(b.stillAfterHit>.48 ||
     (b.afterBuildingTime>1.5&&Math.hypot(b.vx,b.vy,b.vz)<5.5) ||
     (b.afterBuildingTime>3.0&&Math.abs(b.z-b.firstBuildingZ)<12)){
    b.lastCollision='PELOTA DETENIDA';
    this.finishShot();return;
   }
  }
  if(this.simElapsed>340||b.z>200000||b.y< -10)this.finishShot();
 }
 finishShot(){if(this.state!=='flight')return;const b=this.ball;this.state='rest';el('app').classList.add('resting');el('pitch-surface').hidden=true;el('again').hidden=false;const reward=settleShot(this.save,Math.max(1,b?.maxZ||0));this.persist();this.audio.cash();if(reward.record)this.audio.record();el('result-quality').textContent=qualityNames[this.pendingShot.quality];el('result-meters').textContent=formatInt(reward.meters);el('result-coins').textContent='+'+formatInt(reward.coins);el('best-label').textContent='MEJOR MARCA: '+formatInt(this.save.best)+' M';el('record-badge').hidden=!reward.record;el('reward-note').textContent=reward.record?'🏆 NUEVO RÉCORD':'RECOMPENSA GANADA';el('result').hidden=false;el('upgrades').hidden=false;el('controls').hidden=true;el('run-info').hidden=true;el('region').hidden=true;el('aim').hidden=true;
 this.drawUI();const milestone=MILESTONES.filter(m=>reward.meters>=m.at&&!this.save.achievements.includes(m.label));if(milestone.length){for(const m of milestone)this.save.achievements.push(m.label);this.persist();this.toast('🏅 '+milestone[milestone.length-1].at+' M · '+milestone[milestone.length-1].label)} }
 resetAndPitch(){el('result').hidden=true;this.camera=[11,16,-35];this.target=[0,2,32];this.startPitch()}
 update(dt){this.clock+=dt;if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)el('toast').classList.remove('show')}
 if(this.state==='pitching'){this.pitchElapsed+=dt;this.pitch=clamp(this.pitchElapsed/this.pitchDuration,0,1);if(this.pitchElapsed>this.pitchDuration+.22)this.swingBat(true);
 const aim=this.pitch>.69&&this.pitch<.96;el('aim').hidden=!aim;el('aim').style.scale=String(1+Math.min(.4,(this.save.levels.reflex-1)*.003));el('aim').style.opacity=String(aim?clamp((this.pitch-.69)*6,.3,1):0);
 el('status-pill').textContent=this.pitch>.7?'🎯 ¡AHORA, AHORA!':'⚾ VIENE EL LANZAMIENTO';}
 if(this.state==='swinging'){this.swingElapsed+=dt;this.swing=clamp(this.swingElapsed/.17,0,1);if(this.swingElapsed>=.12)this.launch()}
 if(this.state==='flight'){
   this.liveSeconds+=dt;
   const speed=Math.hypot(this.ball.vx,this.ball.vz);const mult=clamp(speed/58,1,22);const total=dt*mult;const substeps=Math.ceil(total/.026);
   for(let i=0;i<substeps&&this.state==='flight';i++)this.simulateStep(total/substeps);
   this.distance=this.ball?.maxZ||0;el('distance').textContent=formatInt(this.distance);el('region').textContent=areaAt(this.distance)+' · '+(this.distance/1000).toFixed(2)+' KM';
   if(this.liveSeconds>23)this.finishShot();
 }
 const flight=this.state==='flight'||this.state==='rest';let desiredCam,desiredTarget,zoom;
 if(flight&&this.ball){const b=this.ball;const speed=Math.hypot(b.vz,b.vx);desiredCam=[b.x+clamp(b.y*.035,9,50),b.y+Math.min(120,16+b.y*.18),b.z-clamp(18+speed*.42,32,310)];desiredTarget=[b.x,b.y*.54,b.z+clamp(speed*.14,14,65)];zoom=58}
 else{const bob=Math.sin(this.clock*.4)*.28;desiredCam=[12,16.5+bob,-34];desiredTarget=[-1,2.4,28];zoom=58}
 const smooth=1-Math.exp(-dt*(flight?3.6:2.3));for(let i=0;i<3;i++){this.camera[i]=lerp(this.camera[i],desiredCam[i],smooth);this.target[i]=lerp(this.target[i],desiredTarget[i],smooth)}
 this.renderer.fogDistance=flight&&this.camera[1]>350?1700:580;drawWorld(this.renderer,this.camera,this);if(this.shake>0){this.shake=Math.max(0,this.shake-dt);const j=this.shake*5;this.camera[0]+=Math.sin(this.clock*93)*j;this.camera[1]+=Math.cos(this.clock*111)*j*.44;}this.renderer.render(this.camera,this.target,zoom);
 }
 frame(now){if(this.stopped){this.last=now;requestAnimationFrame(t=>this.frame(t));return}const dt=this.last?clamp((now-this.last)/1000,0,.048):.016;this.last=now;this.frames++;this.fpsClock+=dt;this.qualityClock+=dt;
 if(this.fpsClock>1.4){this.fps=Math.round(this.frames/this.fpsClock);el('fps').textContent=this.fps+' FPS';this.fpsClock=0;this.frames=0}
 if(this.qualityClock>9){if(this.fps<31&&this.renderer.dpr>1.3){this.renderer.setQuality(false);this.toast('MODO RENDIMIENTO ACTIVADO')}this.qualityClock=0}
 try{this.update(dt)}catch(e){console.error('Render/update error',e);this.stopped=true;el('status-pill').textContent='ERROR 3D — REINICIA LA APLICACIÓN';}
 requestAnimationFrame(t=>this.frame(t));}
}