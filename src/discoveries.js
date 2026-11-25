// Colección de 100 cosméticos: los no descubiertos no se exponen en la tienda.
// Comprar/equipar es otra acción: el precio orienta cuándo revelar cada objeto,
// pero gastar en habilidades nunca hace retroceder los descubrimientos.
// Regla estable por ID para no reordenar lo descubierto al crecer el catálogo.
import {BAT_CATALOG,OUTFIT_CATALOG,BALL_CATALOG} from './cosmetic-catalog.js?v=0.77.19';

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
// La antigua curva llegaba a 1536 batazos para cosméticos normales.
// Ritmo nuevo: 8..~316, además de la puerta económica para cada artículo.
const SHOT_TARGETS=Array.from({length:50},(_,n)=>8+n*2+Math.floor(n*n*.12));
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
// Preserve the original challenge allocation for unaffected IDs when prices change.
const LEGACY_RULE_PRICES=Object.freeze({'bat:ruby':1500,'outfit:purple':1400,'ball:mint':1100,'ball:lilac':1800,'ball:negra':1950,'ball:rosa':2450});
const rulePrice=v=>LEGACY_RULE_PRICES[v.key]??v.item.price;
const rest=ordered.filter(v=>!BASE_KEYS.has(v.key)&&!OVERRIDES[v.key])
 .sort((a,b)=>rulePrice(a)-rulePrice(b)||a.key.localeCompare(b.key));
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
// Simple recolours belong to the early collection, not secret/late challenges.
 // Exchange challenge slots with themed designs to preserve the 47/25/15/10 balance.
 const exchange=(a,b)=>{const first=generated.get(a);generated.set(a,generated.get(b));generated.set(b,first)};
 exchange('ball:lilac','bat:platano');
 exchange('ball:negra','outfit:futbol_blanco');
 for(const [key,target] of [['ball:rosa',12],['ball:lilac',14],['ball:negra',18]]){
  generated.set(key,Object.freeze({group:'play',metric:'shots',target}));
 }
 export const DISCOVERY_RULES=Object.freeze(Object.fromEntries(ordered.filter(v=>!BASE_KEYS.has(v.key))
 .map(({key})=>[key,Object.freeze(OVERRIDES[key]||generated.get(key))])));
if(Object.keys(DISCOVERY_RULES).length!==97)throw Error('97 desbloqueos esperados');
export const DISCOVERY_GROUP_COUNTS=Object.freeze(Object.fromEntries(Object.keys(QUOTAS).map(g=>[
 g,Object.values(DISCOVERY_RULES).filter(rule=>rule.group===g).length
])));

const safeCounter=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,2e9):0;
export const DISCOVERY_ECONOMY=Object.freeze({starterCoins:170,skillReserveFactor:2.2,buffer:150});
export function requiredCareerEarnings(price){
 if(!Number.isFinite(price)||price<0)return Infinity;
 // Gross income includes neither spent upgrades nor previously bought cosmetics.
 // 170 starting coins, 2.2x price + 150 reserve for early skill upgrades.
 return Math.max(0,Math.ceil(price*11/5+
  DISCOVERY_ECONOMY.buffer-DISCOVERY_ECONOMY.starterCoins));
}
export function careerEarnings(save){
 return Math.max(0,Number(save?.earnedCoins)||0);
}

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
 // Una partida antigua sin contador económico recibe migración retroactiva.
 // Las nuevas no abren la cola de recompensas al reiniciar la aplicación:
 // las novedades se anuncian una a una al terminar cada batazo.
 if(raw?.earnedCoins===undefined)return unlockEligible(save);
 return [];
}
function metricValue(save,rule){
 if(rule.group==='secret')return save.discoveryFlags?.includes(rule.metric)?1:0;
 if(rule.metric==='best'||rule.metric==='shots'||rule.metric==='totalMeters')return Math.max(0,Number(save[rule.metric])||0);
 return Math.max(0,Number(save.discoveryStats?.[rule.metric])||0);
}
export function isDiscovered(save,category,id){
 return BASE_KEYS.has(category+':'+id)||!!save?.discovered?.includes(category+':'+id);
}
export function unlockEligible(save,limit=Infinity){
 if(!Array.isArray(save.discovered))save.discovered=[...STARTER_DISCOVERIES];
 const have=new Set(save.discovered),newItems=[];
 // Price order: when several achievements arrive together, show one
 // affordable-tier discovery per shot instead of a wall of expensive prizes.
 const eligible=ordered.filter(({key,item})=>!have.has(key)&&!BASE_KEYS.has(key)&&
   metricValue(save,DISCOVERY_RULES[key])>=DISCOVERY_RULES[key].target&&
   careerEarnings(save)>=requiredCareerEarnings(item.price));
 eligible.sort((a,b)=>a.item.price-b.item.price||a.key.localeCompare(b.key));
 for(const {key,category,item} of eligible.slice(0,Math.max(0,limit))){
  save.discovered.push(key);have.add(key);newItems.push({category,item});
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
 return unlockEligible(save,1);
}
export function discoveredCount(save,category){
 const items=COLLECTIONS[category]||[];
 return {found:items.filter(item=>isDiscovered(save,category,item.id)).length,total:items.length};
}
const LABELS={shots:'batazos',totalMeters:'m acumulados',best:'m de récord',
 perfectHits:'contactos perfectos',preciseHits:'contactos excelentes o perfectos',
 bestGoodStreak:'buenos golpes seguidos',recordBreaks:'récords superados'};
export function nextDiscoveryHint(save,category){
 const candidates=(COLLECTIONS[category]||[]).filter(item=>!isDiscovered(save,category,item.id))
  .map(item=>({item,rule:DISCOVERY_RULES[category+':'+item.id]}))
  .filter(x=>x.rule&&x.rule.group!=='secret');
 const income=careerEarnings(save),priority={play:0,record:1,skill:2};
 // Show progress towards the closest *real* discovery, considering skill
 // achievement AND the number of coins already earned, without leaking
 // the hidden item's name, preview or price.
 const deficit=({item,rule})=>Math.max(
   Math.max(0,rule.target-metricValue(save,rule))/Math.max(1,rule.target),
   Math.max(0,requiredCareerEarnings(item.price)-income)/Math.max(1,requiredCareerEarnings(item.price))
 );
 candidates.sort((a,b)=>deficit(a)-deficit(b)||
  a.item.price-b.item.price||priority[a.rule.group]-priority[b.rule.group]);
 const entry=candidates[0];
 if(!entry)return 'Sigue jugando: todavía quedan descubrimientos secretos';
 const {item,rule}=entry,remaining=Math.ceil(rule.target-metricValue(save,rule)),
  needed=Math.max(0,Math.ceil(requiredCareerEarnings(item.price)-income));
 if(remaining>0&&needed>0)return 'Próximo objetivo: '+remaining+' '+LABELS[rule.metric]+' · gana '+needed+' monedas más';
 if(remaining>0)return 'Próximo objetivo: '+remaining+' '+LABELS[rule.metric];
 return 'Próximo objetivo: gana '+needed+' monedas más (las mejoras cuentan)';
}
