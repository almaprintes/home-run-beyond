import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSave,sanitizeSave,upgradeCost,upgrade,settleShot,forwardDistance,swingPerfectHalfMs,timingQuality,calculateShot,batSpeedMs,claimBonus,rewardForMeters,coinMultiplier,coinRewardBreakdown} from '../src/logic.js';

test('la partida migra reflejos a multiplicador conservando monedas, niveles, récords y cosméticos',()=>{
 const s=sanitizeSave({coins:2847,best:1730,shots:84,totalMeters:5000,levels:{power:49,swing:14,reflex:7},owned:['classic','nova'],equipped:'nova'});
 assert.equal(s.coins,2847);assert.equal(s.best,1730);assert.equal(s.shots,84);
 assert.deepEqual(s.levels,{power:49,swing:14,multiplier:7});
 assert.equal(s.equipped,'nova');assert.equal(s.totalMeters,5000);
 const again=sanitizeSave(s);assert.deepEqual(again.levels,s.levels);
});
test('guardados corruptos no crean niveles, dinero o cosméticos falsos',()=>{
 const s=sanitizeSave({coins:Infinity,levels:{power:-90,swing:1e99,reflex:6},owned:['classic','nova','nova'],equipped:'fake'});
 assert.equal(s.coins,170);assert.equal(s.levels.power,1);assert.equal(s.levels.swing,1);
 assert.equal(s.levels.multiplier,6);assert.equal(s.equipped,'classic');
 assert.deepEqual(s.owned,['classic','nova']);
});
test('los precios aumentan claramente a niveles altos y guardan saldo',()=>{
 const s=initialSave();const before=s.coins;
 assert.equal(upgradeCost(1,'power'),160);
 assert.ok(upgrade(s,'power'));assert.equal(s.levels.power,2);assert.equal(s.coins,before-160);
 assert.ok(upgradeCost(49,'power')>upgradeCost(14,'power')*5);
 assert.ok(upgradeCost(200,'power')>upgradeCost(150,'power'));
 assert.ok(upgradeCost(1,'multiplier')>upgradeCost(1,'swing'));
});
test('Swing widens perfect timing without raising maximum power or coin multiplier',()=>{
 const a={power:20,swing:1,multiplier:1},b={power:20,swing:1000,multiplier:1};
 assert.equal(batSpeedMs(1),batSpeedMs(100));
 assert.equal(swingPerfectHalfMs(1),48);
 assert.equal(timingQuality(95,{swingLevel:1}),'excellent');
 assert.equal(timingQuality(85,{swingLevel:1000}),'perfect');
 assert.equal(calculateShot(a,70).quality,'excellent');
 assert.equal(calculateShot(b,70).quality,'perfect');
 assert.deepEqual(calculateShot(a,0),calculateShot(b,0));
 assert.equal(rewardForMeters(900,a),rewardForMeters(900,b));
});
test('Potencia es la única que modifica la física y el alcance del batazo',()=>{
 const a=calculateShot({power:1,swing:1,multiplier:1},0);
 const b=calculateShot({power:100,swing:1,multiplier:1},0);
 assert.ok(b.ratedDistance>a.ratedDistance&&b.initialSpeed>a.initialSpeed);
 assert.ok(a.vz>0&&a.ratedDistance<121);
 const c=calculateShot({power:1,swing:1,multiplier:100},0);
 assert.equal(a.ratedDistance,c.ratedDistance);
});
test('el multiplicador mejora solo monedas, no la distancia o el swing',()=>{
 const a={power:15,swing:5,multiplier:1},b={power:15,swing:5,multiplier:20};
 assert.deepEqual(calculateShot(a,0),calculateShot(b,0));
 assert.ok(rewardForMeters(900,b)>rewardForMeters(900,a));
 assert.equal(coinMultiplier(1),1);
 assert.equal(coinMultiplier(51),3);
 assert.equal(coinMultiplier(10000),3);
 const detail=coinRewardBreakdown(900,b);
 assert.equal(detail.base+detail.bonus,detail.total);
 assert.equal(detail.total,rewardForMeters(900,b));
});
test('las monedas aparecen separadas entre base y bonus',()=>{
 const save=initialSave();save.levels.multiplier=7;
 const r=settleShot(save,959);
 assert.equal(r.baseCoins,Math.floor(959*.75));
 assert.equal(r.multiplier,1.36);
 assert.equal(r.coins,r.baseCoins+r.bonusCoins);
 assert.ok(r.coins>r.baseCoins);
 assert.equal(save.coins,170+r.coins);
 assert.equal(save.best,959);
});
test('sin retroceso añadido: recompensas basadas en la posición final',()=>{
 const ball={z:430,maxZ:475};
 assert.equal(forwardDistance(ball),430);
 ball.z=100;assert.equal(forwardDistance(ball),100);
 ball.z=-14;assert.equal(forwardDistance(ball),0);
 assert.equal(forwardDistance(null),0);
 const s=initialSave(),reward=settleShot(s,forwardDistance({z:100,maxZ:475}));
 assert.equal(reward.meters,100);assert.equal(s.best,100);
 assert.equal(s.totalMeters,100);
});
test('las regiones lejanas siguen alcanzables mediante Potencia elevada',()=>{
 const r=calculateShot({power:4500,swing:1,multiplier:1},0);
 assert.ok(r.ratedDistance>10000);
});

test('la curva reducida conserva el coste de entrada y suaviza niveles altos',()=>{
 const bases={power:160,swing:180,multiplier:290};
 for(const [key,base] of Object.entries(bases)){
  for(const level of [1,2,17,49,50]){
   const n=level-1;
   const original=Math.floor(base*(1+.30*n+.02*n*n)/5)*5;
   assert.equal(upgradeCost(level,key),original,key+' nivel '+level);
  }
  if(key==='multiplier')continue;
  let prev=upgradeCost(50,key);
  for(let level=51;level<=1350;level++){
   const next=upgradeCost(level,key);
   assert.ok(next>=prev,'el precio no debe bajar: '+key+' '+level);
   prev=next;
  }
 }
 assert.equal(upgradeCost(49,'power'),9835);
 assert.equal(upgradeCost(50,'power'),10195);
 assert.equal(upgradeCost(51,'power'),10315);
 assert.equal(upgradeCost(1318,'power'),22675);
 assert.ok(upgradeCost(1318,'power')<upgradeCost(130,'power')*2);
});

test('Multiplicador deja de vender niveles al llegar a ×3, sin quitar progreso antiguo',()=>{
 const save=initialSave();save.coins=100000000;save.levels.multiplier=50;
 const price=upgradeCost(50,'multiplier');
 assert.ok(price>0);
 assert.equal(upgrade(save,'multiplier'),true);
 assert.equal(save.levels.multiplier,51);
 assert.equal(coinMultiplier(save.levels.multiplier),3);
 const coins=save.coins,paid=save.paidUpgrades;
 assert.equal(upgradeCost(51,'multiplier'),Infinity);
 assert.equal(upgrade(save,'multiplier'),false);
 assert.equal(save.coins,coins);
 assert.equal(save.paidUpgrades,paid);
 save.paidUpgrades=10;
 assert.equal(claimBonus(save,'multiplier'),false);
 assert.equal(save.bonusClaims,0);
 assert.equal(sanitizeSave({version:2,coins:coins,levels:{power:49,swing:17,multiplier:68}}).levels.multiplier,68);
});
