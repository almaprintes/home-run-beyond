// Colección de 100 cosméticos: los no descubiertos no se exponen en la tienda.
// El precio nunca es un requisito de desbloqueo. Comprar/equipar es otra acción.
// Regla estable por ID para no reordenar lo descubierto al crecer el catálogo.
import {BAT_CATALOG,OUTFIT_CATALOG,BALL_CATALOG} from './cosmetic-catalog.js?v=0.42.0';

export const COLLECTIONS=Object.freeze({bat:BAT_CATALOG,outfit:OUTFIT_CATALOG,ball:BALL_CATALOG});
export const STARTER_DISCOVERIES=Object.freeze(['bat:classic','outfit:red','ball:classic']);
const SECRET_FLAGS=Object.freeze(['road','roof','river','water','district','harbor','forest','mountains','orbit','swamp']);
const COUNTERS=Object.freeze(['perfectHits','preciseHits','bestGoodStreak','goodStreak','recordBreaks']);
export const INITIAL_DISCOVERY_STATS=Object.freeze({
 perfectHits:0,preciseHits:0,goodStreak:0,bestGoodStreak:0,recordBreaks:0
});
const BASE_KEYS=new Set(STARTER_DISCOVERIES);
const OVERRIDES=Object.freeze({
 'ball:sky':{group:'play',metric:'shots',target:3},
 'bat:gold':{group:'play',metric:'shots',target:5},
 'ball:tenis':{group:'play',metric:'totalMeters',target:2500},
 'outfit:blue':{group:'record',metric:'best',target:100},
 'ball:tierra':{group:'record',metric:'best',target:3000},
 'ball:meteorito':{group:'record',metric:'best',target:10000},
 'bat:baguette':{group:'skill',metric:'perfectHits',target:5},
 'bat:escoba':{group:'secret',metric:'road',target:1},
 'outfit:chef':{group:'secret',metric:'roof',target:1},
 'outfit:pescador':{group:'secret',metric:'river',target:1},
 'ball:sandia':{group:'secret',metric:'water',target:1},
 'outfit:astronauta':{group:'secret',metric:'orbit',target:1}
});
const QUOTAS={play:47,record:25,skill:15,secret:10}; // + 3 básicos = 100.
const GROUP_PATTERN=['play','record','play','skill','play','record','play','secret',
 'play','record','play','skill','play','record','play','secret',
 'play','record','play','skill'];
const SHOT_TARGETS=Array.from({length:50},(_,n)=>8+n*2+Math.floor(n*n*.78));
const RECORD_TARGETS=[250,500,800,1000,1300,1650,1900,2300,2700,3400,4200,
 5200,6400,8000,9600,12000,14500,17500,22000,28000,35000,45000,60000,80000,110000];
const SKILL_TARGETS=[
 ['perfectHits',1],['preciseHits',3],['bestGoodStreak',3],['preciseHits',10],
 ['perfectHits',10],['bestGoodStreak',5],['perfectHits',20],['preciseHits',35],
 ['bestGoodStreak',8],['perfectHits',45],['recordBreaks',3],
 ['bestGoodStreak',12],['perfectHits',85],['recordBreaks',10],
 ['preciseHits',150]
];
const ordered=[];
for(const [category,items] of Object.entries(COLLECTIONS)){
 for(const item of items)ordered.push({category,item,key:category+':'+item.id});
}
if(ordered.length!==100)throw Error('El catálogo de descubrimientos debe tener 100 artículos');
const reserved=Object.fromEntries(Object.keys(QUOTAS).map(g=>[g,0]));
for(const value of Object.values(OVERRIDES))reserved[value.group]++;
const remaining=Object.fromEntries(Object.entries(QUOTAS).map(([g,n])=>[g,n-reserved[g]]));
const rest=ordered.filter(v=>!BASE_KEYS.has(v.key)&&!OVERRIDES[v.key])
 .sort((a,b)=>a.item.price-b.item.price||a.key.localeCompare(b.key));
const generated=new Map(),idx={play:0,record:0,skill:0,secret:0};
const availableSecrets=SECRET_FLAGS.filter(flag=>!Object.values(OVERRIDES).some(r=>r.group==='secret'&&r.metric===flag));
for(let i=0;i<rest.length;i++){
 let group=null;
 for(let step=0;step<GROUP_PATTERN.length;step++){
  const candidate=GROUP_PATTERN[(i+step)%GROUP_PATTERN.length];
  if(remaining[candidate]>0){group=candidate;break}
 }
 if(!group)throw Error('No quedan reglas para '+rest[i].key);
 remaining[group]--;
 const n=idx[group]++;
 let metric,target;
 if(group==='play'){metric='shots';target=SHOT_TARGETS[n]}
 if(group==='record'){metric='best';target=RECORD_TARGETS[n]}
 if(group==='skill'){[metric,target]=SKILL_TARGETS[n]}
 if(group==='secret'){metric=availableSecrets[n];target=1}
 if(!metric||!Number.isFinite(target))throw Error('Regla incompleta: '+rest[i].key);
 generated.set(rest[i].key,Object.freeze({group,metric,target}));
}
if(Object.values(remaining).some(n=>n!==0))throw Error('Faltan reglas de descubrimiento');
export const DISCOVERY_RULES=Object.freeze(Object.fromEntries(ordered.filter(v=>!BASE_KEYS.has(v.key))
 .map(({key})=>[key,Object.freeze(OVERRIDES[key]||generated.get(key))])));
if(Object.keys(DISCOVERY_RULES).length!==97)throw Error('97 desbloqueos esperados');
export const DISCOVERY_GROUP_COUNTS=Object.freeze(Object.fromEntries(Object.keys(QUOTAS).map(g=>[
 g,Object.values(DISCOVERY_RULES).filter(rule=>rule.group===g).length
])));

const safeCounter=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,2e9):0;
export function sanitizeDiscovery(save,raw){
 const allowed=new Set(ordered.map(({key})=>key));
 save.discoveryStats=Object.fromEntries(COUNTERS.map(k=>[k,safeCounter(raw?.discoveryStats?.[k])]));
 save.discoveryFlags=Array.isArray(raw?.discoveryFlags)?[...new Set(raw.discoveryFlags.filter(v=>SECRET_FLAGS.includes(v)))]:[];
 // Backfill only achievements provable from existing best distance.
 for(const [flag,at] of [['district',500],['river',1650],['harbor',2200],
  ['forest',3600],['mountains',6200],['orbit',20000]]){
  if((Number(save.best)||0)>=at&&!save.discoveryFlags.includes(flag))save.discoveryFlags.push(flag);
 }
 save.discovered=Array.isArray(raw?.discovered)?[...new Set(raw.discovered.filter(v=>typeof v==='string'&&allowed.has(v)))]:[];
 // Nunca ocultar un artículo que el jugador ya había pagado o equipado.
 for(const {category,item,key} of ordered){
  const owned=category==='bat'?'owned':category==='outfit'?'ownedOutfits':'ownedBalls';
  const equipped=category==='bat'?'equipped':category==='outfit'?'equippedOutfit':'equippedBall';
  if((save[owned]||[]).includes(item.id)||save[equipped]===item.id||BASE_KEYS.has(key)){
   if(!save.discovered.includes(key))save.discovered.push(key);
  }
 }
 return unlockEligible(save); // Migración silenciosa de distancia, récord y batazos.
}
function metricValue(save,rule){
 if(rule.group==='secret')return save.discoveryFlags?.includes(rule.metric)?1:0;
 if(rule.metric==='best'||rule.metric==='shots'||rule.metric==='totalMeters')return Math.max(0,Number(save[rule.metric])||0);
 return Math.max(0,Number(save.discoveryStats?.[rule.metric])||0);
}
export function isDiscovered(save,category,id){
 return BASE_KEYS.has(category+':'+id)||!!save?.discovered?.includes(category+':'+id);
}
export function unlockEligible(save){
 if(!Array.isArray(save.discovered))save.discovered=[...STARTER_DISCOVERIES];
 const have=new Set(save.discovered),newItems=[];
 for(const {key,category,item} of ordered){
  if(have.has(key)||BASE_KEYS.has(key))continue;
  const rule=DISCOVERY_RULES[key];
  if(metricValue(save,rule)>=rule.target){
   save.discovered.push(key);have.add(key);newItems.push({category,item});
  }
 }
 return newItems;
}
export function recordDiscoveryShot(save,{quality='',record=false,peakZ=0,road=false,roof=false,water=false,swamp=false}={}){
 const stats=save.discoveryStats||{...INITIAL_DISCOVERY_STATS};
 save.discoveryStats=stats;
 if(quality==='perfect')stats.perfectHits=safeCounter(stats.perfectHits+1);
 if(quality==='perfect'||quality==='excellent')stats.preciseHits=safeCounter(stats.preciseHits+1);
 if(['perfect','excellent','good'].includes(quality)){
  stats.goodStreak=safeCounter(stats.goodStreak+1);
  stats.bestGoodStreak=Math.max(stats.bestGoodStreak,stats.goodStreak);
 }else stats.goodStreak=0;
 if(record)stats.recordBreaks=safeCounter(stats.recordBreaks+1);
 const flags=new Set(save.discoveryFlags||[]),highest=Math.max(Number(save.best)||0,Number(peakZ)||0);
 for(const [flag,at] of [['district',500],['river',1650],['harbor',2200],
  ['forest',3600],['mountains',6200],['orbit',20000]]){
  if(highest>=at)flags.add(flag);
 }
 if(road)flags.add('road');
 if(roof)flags.add('roof');
 if(water)flags.add('water');
 if(swamp)flags.add('swamp');
 save.discoveryFlags=[...flags];
 return unlockEligible(save);
}
export function discoveredCount(save,category){
 const items=COLLECTIONS[category]||[];
 return {found:items.filter(item=>isDiscovered(save,category,item.id)).length,total:items.length};
}
const LABELS={shots:'batazos',totalMeters:'m acumulados',best:'m de récord',
 perfectHits:'contactos perfectos',preciseHits:'contactos excelentes o perfectos',
 bestGoodStreak:'buenos golpes seguidos',recordBreaks:'récords superados'};
export function nextDiscoveryHint(save,category){
 const candidates=(COLLECTIONS[category]||[]).map(item=>DISCOVERY_RULES[category+':'+item.id])
  .filter(rule=>rule&&rule.group!=='secret'&&metricValue(save,rule)<rule.target);
 candidates.sort((a,b)=>{
  const ra=(a.target-metricValue(save,a))/Math.max(1,a.target);
  const rb=(b.target-metricValue(save,b))/Math.max(1,b.target);
  const priority={play:0,record:1,skill:2};
  return ra-rb||(priority[a.group]-priority[b.group])||a.target-b.target;
 });
 const rule=candidates[0];
 if(!rule)return 'Sigue jugando: todavía quedan descubrimientos secretos';
 const left=Math.ceil(rule.target-metricValue(save,rule));
 return 'Próximo objetivo: '+left+' '+LABELS[rule.metric];
}
