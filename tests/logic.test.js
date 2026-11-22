import test from 'node:test';import assert from 'node:assert/strict';
import {initialSave,sanitizeSave,upgradeCost,upgrade,settleShot,forwardDistance,timingQuality,calculateShot,batSpeedMs,rewardForMeters} from '../src/logic.js';
test('progreso válido y contra guardados corruptos',()=>{const s=sanitizeSave({coins:Infinity,levels:{power:-90,swing:1e99,reflex:6},owned:['classic','nova','nova'],equipped:'fake'});assert.equal(s.coins,170);assert.equal(s.levels.power,1);assert.equal(s.levels.swing,1);assert.equal(s.levels.reflex,6);assert.equal(s.equipped,'classic');assert.deepEqual(s.owned,['classic','nova']);});
test('costes crecientes y mejoras persisten',()=>{const s=initialSave(),old=s.coins;assert.equal(upgradeCost(1,'power'),80);assert.ok(upgrade(s,'power'));assert.equal(s.levels.power,2);assert.equal(s.coins,old-80);assert.ok(upgradeCost(200,'power')>upgradeCost(150,'power'));});
test('reflejos amplían la ventana perfecta',()=>{assert.equal(timingQuality(95,1),'excellent');assert.equal(timingQuality(95,80),'perfect');});
test('swing reduce retardo y aumenta velocidad',()=>{assert.ok(batSpeedMs(100)<batSpeedMs(1));const a=calculateShot({power:1,swing:1,reflex:1},0),b=calculateShot({power:100,swing:100,reflex:1},0);assert.ok(b.ratedDistance>a.ratedDistance);assert.ok(a.vz>0);});
test('golpear y récord con moneda determinada por distancia',()=>{const s=initialSave(),first=settleShot(s,90),second=settleShot(s,50);assert.ok(first.record);assert.ok(!second.record);assert.equal(s.shots,2);assert.equal(s.totalMeters,140);assert.equal(s.best,90);assert.equal(first.coins,rewardForMeters(90,s.levels));});
test('el primer nivel no puede salir del estadio de 121 m ni con perfecto',()=>{const s=initialSave(),shot=calculateShot(s.levels,0);assert.ok(shot.ratedDistance<121,`Alcance inicial ${shot.ratedDistance}`)});
test('el desarrollo avanzado puede superar el río y las ciudades',()=>{const shot=calculateShot({power:300,swing:300,reflex:150},0);assert.ok(shot.ratedDistance>10000);});
test('el marcador descuenta metros cuando la bola retrocede',()=>{
 const b={z:430,maxZ:430};
 assert.equal(forwardDistance(b),430);
 b.z=287;assert.equal(forwardDistance(b),287);
 b.z=-14;assert.equal(forwardDistance(b),0);
 b.z=80;assert.equal(forwardDistance(b),80);
 assert.equal(forwardDistance(null),0);
});
test('recompensa y récord usan posición final tras el rebote, no el máximo',()=>{
 const save=initialSave(),ball={z:100,maxZ:475};
 const reward=settleShot(save,forwardDistance(ball));
 assert.equal(reward.meters,100);
 assert.equal(save.best,100);
 assert.equal(save.totalMeters,100);
 assert.equal(reward.coins,rewardForMeters(100,save.levels));
});
