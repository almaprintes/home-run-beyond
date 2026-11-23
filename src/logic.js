import {BAT_CATALOG,OUTFIT_CATALOG,BALL_CATALOG} from './cosmetic-catalog.js?v=0.34.0';
export const SAVE_KEY='hrb-v1-progress';
export const MAX_LEVEL=10000;
export const MULTIPLIER_MAX_LEVEL=51;
export function skillMaxLevel(key){return key==='multiplier'?MULTIPLIER_MAX_LEVEL:MAX_LEVEL}
export const BONUS_EVERY=5;
export const DEFAULT_SAVE=Object.freeze({version:3,coins:170,best:0,shots:0,totalMeters:0,levels:{power:1,swing:1,multiplier:1},owned:['classic'],equipped:'classic',ownedOutfits:['red'],equippedOutfit:'red',ownedBalls:['classic'],equippedBall:'classic',sound:true,music:false,voice:true,vibration:true,reducedEffects:false,showHints:true,graphics:'auto',batterySaver:false,seenIntro:false,achievements:[],paidUpgrades:0,bonusClaims:0,pendingLegacyBonuses:0});
export function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
export function initialSave(){return JSON.parse(JSON.stringify(DEFAULT_SAVE))}
export function sanitizeSave(raw){
 const s=initialSave();if(!raw||typeof raw!=='object')return s;
 for(const k of ['coins','best','shots','totalMeters']){const n=Number(raw[k]);if(Number.isFinite(n))s[k]=clamp(Math.floor(n),0,2e12)}
 for(const k of ['power','swing','multiplier']){
  const n=Number(k==='multiplier'?raw.levels?.multiplier??raw.levels?.reflex:raw.levels?.[k]);
  if(Number.isFinite(n)&&n>=1&&n<=MAX_LEVEL)s.levels[k]=Math.floor(n);
 }
 s.owned=Array.isArray(raw.owned)?[...new Set(['classic',...raw.owned.filter(x=>typeof x==='string'&&x.length<60)])]:['classic'];
 s.equipped=s.owned.includes(raw.equipped)?raw.equipped:'classic';
 // Guardados anteriores conservan el bate y reciben el uniforme y pelota base.
 const safeOwned=(value,allowed,base)=>Array.isArray(value)?
  [...new Set([base,...value.filter(id=>typeof id==='string'&&allowed.some(item=>item.id===id))])]:[base];
 s.ownedOutfits=safeOwned(raw.ownedOutfits,OUTFITS,'red');
 s.equippedOutfit=s.ownedOutfits.includes(raw.equippedOutfit)?raw.equippedOutfit:'red';
 s.ownedBalls=safeOwned(raw.ownedBalls,BALL_STYLES,'classic');
 s.equippedBall=s.ownedBalls.includes(raw.equippedBall)?raw.equippedBall:'classic';
 s.sound=raw.sound!==false;
 s.music=raw.music===true;
 s.voice=raw.voice!==false;
 s.vibration=raw.vibration!==false;
 s.reducedEffects=raw.reducedEffects===true;
 s.showHints=raw.showHints!==false;
 s.graphics=['auto','high','low'].includes(raw.graphics)?raw.graphics:'auto';
 s.batterySaver=raw.batterySaver===true;
 s.seenIntro=Boolean(raw.seenIntro);
 s.achievements=Array.isArray(raw.achievements)?raw.achievements.filter(x=>typeof x==='string').slice(0,100):[];
 const earned=s.levels.power+s.levels.swing+s.levels.multiplier-3;
 s.paidUpgrades=Number.isSafeInteger(raw.paidUpgrades)?clamp(raw.paidUpgrades,0,30000):earned;
 const oldClaims=Number.isSafeInteger(raw.bonusClaims)?clamp(raw.bonusClaims,0,30000):0;
 if(raw.version===2||raw.version===3){
  s.bonusClaims=oldClaims;
  s.pendingLegacyBonuses=Number.isSafeInteger(raw.pendingLegacyBonuses)?clamp(raw.pendingLegacyBonuses,0,10000):0;
 }else{
  // Los bonos antiguos (cada 4 compras) no desaparecen. Los nuevos son cada 5.
  const pending=Math.max(0,Math.floor(s.paidUpgrades/4)-oldClaims);
  const earnedNew=Math.floor(s.paidUpgrades/BONUS_EVERY);
  s.bonusClaims=Math.max(0,earnedNew-Math.min(earnedNew,pending));
  s.pendingLegacyBonuses=Math.max(0,pending-earnedNew);
 }
 return s;
}
export const formatInt=n=>Math.round(n).toLocaleString('es-ES');
export function forwardDistance(ball){
 const z=Number(ball?.z);
 return Number.isFinite(z)?Math.max(0,z):0;
}
// Coste original hasta nivel 50. A partir de 51 la subida deja de ser
// cuadrática y sigue una potencia sublineal: dificultad sostenida, sin que
// llegar a los biomas lejanos requiera decenas de miles de batazos.
export function upgradeCost(level,key){
 const bases={power:160,swing:180,multiplier:290};
 if(!(key in bases))throw Error('Unknown skill');
 if(level>=skillMaxLevel(key))return Infinity;
 const base=bases[key],n=clamp(level,1,MAX_LEVEL)-1;
 if(level<=50)return Math.floor(base*(1+.30*n+.04*n*n)/5)*5;
 const priceAt50=base*(1+.30*49+.04*49*49);
 const extra=180*(base/160)*Math.pow(level-50,.65);
 return Math.floor((priceAt50+extra)/5)*5;
}
export function upgrade(save,key){
 if(!(key in save.levels)||save.levels[key]>=skillMaxLevel(key))return false;
 const price=upgradeCost(save.levels[key],key);
 if(save.coins<price)return false;
 save.coins-=price;save.levels[key]++;save.paidUpgrades=(save.paidUpgrades||0)+1;return true;
}
export function bonusCredits(save){return Math.max(0,Math.floor((save.paidUpgrades||0)/BONUS_EVERY)-(save.bonusClaims||0))+(save.pendingLegacyBonuses||0)}
export function bonusProgress(save){return (save.paidUpgrades||0)%BONUS_EVERY}
export function claimBonus(save,key){
 if(!(key in save.levels)||save.levels[key]>=skillMaxLevel(key)||bonusCredits(save)<1)return false;
 save.levels[key]++;if(save.pendingLegacyBonuses>0)save.pendingLegacyBonuses--;else save.bonusClaims=(save.bonusClaims||0)+1;return true;
}
export function timingQuality(deltaMs){
 const ms=Math.abs(deltaMs),perfect=48,excellent=132,good=280;
 if(ms<=perfect)return 'perfect';
 if(ms<=excellent)return 'excellent';
 if(ms<=good)return 'good';
 if(ms<=490)return 'weak';
 return 'miss';
}
export const qualityNames={perfect:'¡PERFECTO!',excellent:'¡EXCELENTE!',good:'¡BUEN GOLPE!',weak:'GOLPE FLOJO',miss:'¡FUERA DE TIEMPO!' };
export const qualityFactor={perfect:1.24,excellent:1.06,good:.87,weak:.61,miss:.38};
export function batSpeedMs(){return 165}
export function speedForSkills(levels){return 24+3.5*Math.pow(levels.power,.68)}
export function calculateShot(levels,timingMs){
 const quality=timingQuality(timingMs),factor=qualityFactor[quality],base=speedForSkills(levels),speed=base*factor;
 const angle=(34+(quality==='perfect'?5:quality==='excellent'?3:0))*Math.PI/180;
 const slice=clamp(timingMs/850,-.3,.3);
 const vx=speed*slice*.19,vy=speed*Math.sin(angle),vz=Math.sqrt(Math.max(0,speed*speed-vy*vy-vx*vx));
 return {quality,initialSpeed:speed,vx,vy,vz,angle,ratedDistance:speed*speed*Math.sin(2*angle)/9.81};
}
export function coinMultiplier(level=1){return 1+.04*Math.min(50,Math.max(0,level-1))}
export function coinRewardBreakdown(meters,levels){
 const distance=Math.max(0,Math.floor(Number(meters)||0));
 const base=Math.floor(distance*.75),multiplier=coinMultiplier(levels.multiplier||1);
 const total=Math.floor(base*multiplier);
 return {base,bonus:total-base,multiplier,total};
}
export function rewardForMeters(meters,levels){return coinRewardBreakdown(meters,levels).total}
export function settleShot(save,distance){
 const meters=Math.max(0,Math.floor(distance)),reward=coinRewardBreakdown(meters,save.levels);
 save.coins+=reward.total;save.shots++;save.totalMeters+=meters;
 const record=meters>save.best;if(record)save.best=meters;
 return {meters,coins:reward.total,baseCoins:reward.base,bonusCoins:reward.bonus,multiplier:reward.multiplier,record};
}
export const MILESTONES=[{at:100,label:'FUERA DEL ESTADIO'},{at:250,label:'PRIMER BARRIO'},{at:500,label:'SOBRE LA AUTOPISTA'},{at:1000,label:'UN KILÓMETRO'},{at:1650,label:'RÍO A LA VISTA'},{at:3000,label:'TRES KILÓMETROS'},{at:10000,label:'DIEZ KILÓMETROS'},{at:50000,label:'CINCUENTA KILÓMETROS'}];
// Todos los cosméticos están en un catálogo versionado con diseño procedural.
export const COSMETICS=BAT_CATALOG;
export const OUTFITS=OUTFIT_CATALOG;
export const BALL_STYLES=BALL_CATALOG;
export const SHOP_SECTIONS=Object.freeze({
 bat:{label:'Bates',items:COSMETICS,owned:'owned',equipped:'equipped'},
 outfit:{label:'Ropa',items:OUTFITS,owned:'ownedOutfits',equipped:'equippedOutfit'},
 ball:{label:'Pelotas',items:BALL_STYLES,owned:'ownedBalls',equipped:'equippedBall'}
});
export function equipCosmetic(save,section,id){
 const catalog=SHOP_SECTIONS[section];
 const item=catalog?.items.find(x=>x.id===id);
 if(!catalog||!item)return 'invalid';
 if(!save[catalog.owned].includes(id)){
  if(save.coins<item.price)return 'insufficient';
  save.coins-=item.price;
  save[catalog.owned].push(id);
  save[catalog.equipped]=id;
  return 'purchased';
 }
 save[catalog.equipped]=id;
 return 'equipped';
}
