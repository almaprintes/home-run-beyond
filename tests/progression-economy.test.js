import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSave,sanitizeSave,upgrade,upgradeCost,coinRewardBreakdown,calculateShot,settleShot} from '../src/logic.js';
import {COLLECTIONS,DISCOVERY_RULES,DISCOVERY_GROUP_COUNTS,requiredCareerEarnings,
 careerEarnings,isDiscovered,recordDiscoveryShot,unlockEligible,nextDiscoveryHint} from '../src/discoveries.js';

test('auditoría completa: los 97 desbloqueos tienen precio, logro y economía coherentes',()=>{
 const entries=Object.entries(COLLECTIONS).flatMap(([category,items])=>items
  .filter(item=>item.price>0).map(item=>({category,item,rule:DISCOVERY_RULES[category+':'+item.id]})));
 assert.equal(entries.length,97);
 assert.deepEqual(DISCOVERY_GROUP_COUNTS,{play:47,record:25,skill:15,secret:10});
 const prices=entries.map(({item})=>item.price);
 assert.equal(prices.reduce((a,b)=>a+b,0),519000);
 assert.ok(entries.every(x=>x.rule && x.rule.target>=1),'cada cosmético tiene logro');
 assert.ok(entries.every(x=>requiredCareerEarnings(x.item.price)>0),'cada cosmético tiene umbral de ingresos');
 for(const {item} of entries){
  assert.ok(requiredCareerEarnings(item.price)>=item.price,'se preserva presupuesto para habilidades');
 }
 assert.equal(requiredCareerEarnings(280),596);
 assert.equal(requiredCareerEarnings(320),684);
 assert.equal(requiredCareerEarnings(350),750);
 assert.equal(requiredCareerEarnings(1100),2400);
 assert.equal(requiredCareerEarnings(16000),35180);
});

test('reinicio real: primer batazo perfecto a 120 m no descubre ropa o pelota de 1100',()=>{
 const save=initialSave();
 assert.equal(save.coins,170);
 const reward=settleShot(save,120);
 assert.equal(reward.coins,90);
 assert.equal(save.coins,260);
 assert.equal(save.earnedCoins,90);
 const newly=recordDiscoveryShot(save,{quality:'perfect',record:reward.record,peakZ:120});
 assert.deepEqual(newly,[]);
 assert.equal(isDiscovered(save,'ball','mint'),false);
 assert.equal(isDiscovered(save,'outfit','blue'),false);
 assert.equal(isDiscovered(save,'ball','sky'),false);
 assert.equal(save.discoveryStats.perfectHits,1,'el perfecto cuenta, no se pierde');
 assert.ok(nextDiscoveryHint(save,'outfit').includes('monedas'),'la pista debe reflejar la parte económica');
});

test('desbloqueos reales en 7-9 batazos normales, manteniendo inversión en skills',()=>{
 const save=initialSave(),events=[];
 for(let i=1;i<=9;i++){
  const reward=settleShot(save,120);
  const batch=recordDiscoveryShot(save,{quality:'good',record:reward.record,peakZ:120});
  assert.ok(batch.length<=1,'nunca dos notificaciones en un solo batazo');
  events.push(...batch.map(x=>({shot:i,key:x.category+':'+x.item.id})));
  if(i===2){assert.equal(upgrade(save,'power'),true)}
  if(i===4){assert.equal(upgrade(save,'swing'),true)}
 }
 assert.deepEqual(events,[
  {shot:7,key:'ball:sky'},
  {shot:8,key:'bat:gold'},
  {shot:9,key:'outfit:blue'}
 ]);
 assert.equal(save.earnedCoins,810);
 assert.equal(save.coins,170+810-160-180);
 assert.ok(save.coins>=350,'puede comprar azul océano aun pagando power y swing');
 assert.equal(save.levels.power,2);assert.equal(save.levels.swing,2);
 assert.equal(isDiscovered(save,'ball','mint'),false);
});

test('un artículo de 1100 exige logros Y dinero de carrera, incluso con perfecto inicial',()=>{
 const save=initialSave();save.shots=1;save.best=140;save.discoveryStats.perfectHits=1;
 assert.ok(!isDiscovered(save,'ball','mint'));
 save.earnedCoins=2399;assert.equal(unlockEligible(save).length,1,'otros objetos baratos pueden salir');
 assert.equal(isDiscovered(save,'ball','mint'),false);
 save.earnedCoins=2400;assert.ok(unlockEligible(save).some(x=>x.item.id==='mint'));
 assert.equal(isDiscovered(save,'ball','mint'),true);
});

test('comprar skills no penaliza ni rebloquea: ingresos acumulados, no saldo actual',()=>{
 const save=initialSave();save.earnedCoins=3000;save.best=500;
 const names=unlockEligible(save).map(({category,item})=>category+':'+item.id);
 assert.ok(names.includes('ball:mint')===false,'perfecto sigue siendo requisito');
 assert.ok(names.includes('outfit:blue'));
 save.coins=0;const before=[...save.discovered];
 unlockEligible(save);
 assert.deepEqual(save.discovered,before);
 assert.ok(isDiscovered(save,'outfit','blue'),'sin desaparición por falta de saldo');
 const restored=sanitizeSave(JSON.parse(JSON.stringify(save)));
 assert.ok(isDiscovered(restored,'outfit','blue'));
 assert.equal(careerEarnings(restored),3000);
});

test('migración conservadora de las ganancias de partidas previas y compras respetadas',()=>{
 const old={version:3,coins:90,best:1700,shots:10,totalMeters:3400,
  owned:['classic','nova'],equipped:'nova',ownedOutfits:['red'],equippedOutfit:'red',
  ownedBalls:['classic','mint'],equippedBall:'mint',levels:{power:4,swing:2,multiplier:1}};
 const save=sanitizeSave(old);
 assert.equal(save.earnedCoins,Math.floor(3400*.75)-10);
 assert.ok(isDiscovered(save,'ball','mint'),'propiedad antigua siempre es visible');
 assert.equal(save.coins,90);
 assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(save))),save);
});

test('progreso jugable: los 47 retos normales ya no piden más de 400 batazos',()=>{
 const play=Object.values(DISCOVERY_RULES).filter(x=>x.group==='play'&&x.metric==='shots');
 assert.ok(play.length>30);
 assert.ok(Math.max(...play.map(x=>x.target))<=400);
 assert.ok(Math.min(...play.map(x=>x.target))>=3);
});

test('ROI de multiplicador auditable: la ganancia marginal por golpe es 4% del básico',()=>{
 const reference=coinRewardBreakdown(120,{power:1,swing:1,multiplier:1});
 const after=coinRewardBreakdown(120,{power:1,swing:1,multiplier:2});
 assert.equal(reference.total,90);
 assert.equal(after.total,93);
 assert.equal(upgradeCost(1,'multiplier'),290);
 // No se modifica la física ni se presentan distancias ideales como garantizadas.
 const theoretical=calculateShot({power:1,swing:1,multiplier:1},0);
 assert.ok(theoretical.ratedDistance>100&&theoretical.ratedDistance<140);
});

test('recargar la PWA no vacía la cola: solo un descubrimiento por batazo entre sesiones',()=>{
 const save=initialSave();
 save.earnedCoins=100000;save.shots=200;save.best=10000;save.totalMeters=100000;
 save.discoveryStats.perfectHits=40;save.discoveryStats.preciseHits=40;
 const first=recordDiscoveryShot(save,{quality:'good',record:true,peakZ:10000});
 assert.equal(first.length,1);
 const previous=save.discovered.slice();
 const loaded=sanitizeSave(JSON.parse(JSON.stringify(save)));
 assert.deepEqual(loaded.discovered,previous,'abrir la app no descubre otros 30 objetos silenciosamente');
 const next=recordDiscoveryShot(loaded,{quality:'good'});
 assert.equal(next.length,1,'el siguiente logro se revela tras jugar, no tras reiniciar');
 assert.equal(loaded.discovered.length,previous.length+1);
});
