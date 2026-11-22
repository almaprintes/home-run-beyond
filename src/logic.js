export const SAVE_KEY='hrb-v1-progress';
export const MAX_LEVEL=10000;
export const BONUS_EVERY=4;
export const DEFAULT_SAVE=Object.freeze({version:1,coins:170,best:0,shots:0,totalMeters:0,levels:{power:1,swing:1,reflex:1},owned:['classic'],equipped:'classic',sound:true,seenIntro:false,achievements:[],paidUpgrades:0,bonusClaims:0});
export function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
export function initialSave(){return JSON.parse(JSON.stringify(DEFAULT_SAVE))}
export function sanitizeSave(raw){const s=initialSave();if(!raw||typeof raw!=='object')return s;
 for(let k of ['coins','best','shots','totalMeters']){let n=Number(raw[k]);if(Number.isFinite(n))s[k]=clamp(Math.floor(n),0,2e12)}
 for(let k of ['power','swing','reflex']){let n=Number(raw.levels?.[k]);if(Number.isFinite(n)&&n>=1&&n<=MAX_LEVEL)s.levels[k]=Math.floor(n)}
 s.owned=Array.isArray(raw.owned)?[...new Set(['classic',...raw.owned.filter(x=>typeof x==='string'&&x.length<60)])]:['classic'];
 s.equipped=s.owned.includes(raw.equipped)?raw.equipped:'classic';s.sound=raw.sound!==false;s.seenIntro=Boolean(raw.seenIntro);
 s.achievements=Array.isArray(raw.achievements)?raw.achievements.filter(x=>typeof x==='string').slice(0,100):[];
 // Migración: una partida antigua ya contiene niveles comprados; no perder ese progreso.
 const previousLevels=s.levels.power+s.levels.swing+s.levels.reflex-3;
 s.paidUpgrades=Number.isSafeInteger(raw.paidUpgrades)?clamp(raw.paidUpgrades,0,30000):previousLevels;
 s.bonusClaims=Number.isSafeInteger(raw.bonusClaims)?clamp(raw.bonusClaims,0,Math.floor(s.paidUpgrades/BONUS_EVERY)):0;
 return s;}
export const formatInt=n=>Math.round(n).toLocaleString('es-ES');
// Distancia longitudinal desde el bateador: si el balón vuelve hacia atrás, resta metros.
export function forwardDistance(ball){
 const z=Number(ball?.z);
 return Number.isFinite(z)?Math.max(0,z):0;
}
export function upgradeCost(level,key){const bases={power:80,swing:85,reflex:70};if(!(key in bases))throw Error('Unknown skill');let l=clamp(level,1,MAX_LEVEL);return Math.floor(bases[key]*(1+0.19*(l-1)+0.008*(l-1)*(l-1)) /5)*5}
export function upgrade(save,key){if(!(key in save.levels)||save.levels[key]>=MAX_LEVEL)return false;const price=upgradeCost(save.levels[key],key);if(save.coins<price)return false;save.coins-=price;save.levels[key]++;save.paidUpgrades=(save.paidUpgrades||0)+1;return true}
export function bonusCredits(save){return Math.max(0,Math.floor((save.paidUpgrades||0)/BONUS_EVERY)-(save.bonusClaims||0))}
export function bonusProgress(save){return (save.paidUpgrades||0)%BONUS_EVERY}
export function claimBonus(save,key){if(!(key in save.levels)||save.levels[key]>=MAX_LEVEL||bonusCredits(save)<1)return false;save.levels[key]++;save.bonusClaims=(save.bonusClaims||0)+1;return true}
export function timingQuality(deltaMs,reflexLevel){const ms=Math.abs(deltaMs);const perfect=48+Math.min(130,(reflexLevel-1)*.72),excellent=132+Math.min(220,(reflexLevel-1)*1.25),good=280+Math.min(320,(reflexLevel-1)*1.45);if(ms<=perfect)return 'perfect';if(ms<=excellent)return 'excellent';if(ms<=good)return 'good';if(ms<=490)return 'weak';return 'miss'}
export const qualityNames={perfect:'¡PERFECTO!',excellent:'¡EXCELENTE!',good:'¡BUEN GOLPE!',weak:'GOLPE FLOJO',miss:'¡FUERA DE TIEMPO!' };
export const qualityFactor={perfect:1.24,excellent:1.06,good:.87,weak:.61,miss:.38};
export function batSpeedMs(level){return Math.max(54,165-Math.sqrt(Math.max(1,level)-1)*8)}
export function speedForSkills(levels){return 22.5+3.5*Math.pow(levels.power,.68)+1.5*Math.pow(levels.swing,.68)}
export function calculateShot(levels,timingMs){const quality=timingQuality(timingMs,levels.reflex),factor=qualityFactor[quality],base=speedForSkills(levels),speed=base*factor;
 const angle=(34+(quality==='perfect'?5:quality==='excellent'?3:0))*Math.PI/180;
 const slice=clamp(timingMs/850,-.3,.3);
 const vx=speed*slice*.19,vy=speed*Math.sin(angle),vz=Math.sqrt(Math.max(0,speed*speed-vy*vy-vx*vx));
 return {quality,initialSpeed:speed,vx,vy,vz,angle,ratedDistance:speed*speed*Math.sin(2*angle)/9.81};}
export function rewardForMeters(meters,levels){const pace=1+Math.sqrt(levels.power+levels.swing+levels.reflex)*.035;return Math.max(6,Math.floor((meters*.83+8)*pace))}
export function settleShot(save,distance){const meters=Math.max(0,Math.floor(distance));const coins=rewardForMeters(meters,save.levels);save.coins+=coins;save.shots++;save.totalMeters+=meters;const record=meters>save.best;if(record)save.best=meters;return {meters,coins,record};}
export const MILESTONES=[{at:100,label:'FUERA DEL ESTADIO'},{at:250,label:'PRIMER BARRIO'},{at:500,label:'SOBRE LA AUTOPISTA'},{at:1000,label:'UN KILÓMETRO'},{at:1650,label:'RÍO A LA VISTA'},{at:3000,label:'TRES KILÓMETROS'},{at:10000,label:'DIEZ KILÓMETROS'},{at:50000,label:'CINCUENTA KILÓMETROS'}];
export const COSMETICS=[
 {id:'classic',name:'Bate clásico',description:'Madera dorada. El original.',emoji:'🏏',color:'#e7b56e',price:0},
 {id:'gold',name:'Bate dorado',description:'Brilla bajo los focos.',emoji:'✨',color:'#ffc85b',price:320},
 {id:'ocean',name:'Bate oceánico',description:'Acabado azul turquesa.',emoji:'🌊',color:'#52d1e5',price:850},
 {id:'ruby',name:'Bate rubí',description:'Rojo intenso, máxima presencia.',emoji:'❤️',color:'#ee5265',price:1500},
 {id:'nova',name:'Bate Nova',description:'Un pequeño pedazo de galaxia.',emoji:'🚀',color:'#ab8dff',price:3400}
];