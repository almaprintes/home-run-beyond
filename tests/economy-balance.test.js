import test from 'node:test';
import assert from 'node:assert/strict';
import {upgradeCost,coinMultiplier,coinRewardBreakdown,initialSave,sanitizeSave,upgrade,claimBonus,bonusCredits,BONUS_EVERY} from '../src/logic.js';

function priceTotal(key,endingLevel){
 let spent=0;
 for(let level=1;level<endingLevel;level++)spent+=upgradeCost(level,key);
 return spent;
}

test('el nuevo presupuesto permite financiar los tres niveles objetivo sin miles de millones',()=>{
 const power=priceTotal('power',1318),swing=priceTotal('swing',177),mult=priceTotal('multiplier',51);
 const sum=power+swing+mult;
 assert.ok(sum>20000000&&sum<30000000,'coste objetivo fuera de rango: '+sum);
 const old=(base,n)=>Math.floor(base*(1+.3*(n-1)+.04*(n-1)**2)/5)*5;
 let oldSpent=0;
 for(let i=1;i<1318;i++)oldSpent+=old(160,i);
 for(let i=1;i<177;i++)oldSpent+=old(180,i);
 for(let i=1;i<51;i++)oldSpent+=old(290,i);
 assert.ok(oldSpent>sum*100,'el descenso debe ser importante después del nivel 50');
});
test('precios suben gradualmente, nunca retroceden con una curva reducida hasta 50',()=>{
 for(const [key,base,max] of [['power',160,1400],['swing',180,400],['multiplier',290,51]]){
  let previous=0;
  for(let n=1;n<max;n++){
   const c=upgradeCost(n,key);
   assert.ok(Number.isFinite(c)&&c>previous,key+' coste descendente o no creciente en nivel '+n);
   if(n<=50)assert.equal(c,Math.floor(base*(1+.3*(n-1)+.02*(n-1)**2)/5)*5);
   previous=c;
  }
 }
});
test('multiplicador termina en ×3 y no consume moneda ni bono posteriormente',()=>{
 const save=initialSave();save.coins=1e7;save.levels.multiplier=51;save.paidUpgrades=10;
 const before=JSON.stringify(save);
 assert.equal(coinMultiplier(51),3);
 assert.equal(coinMultiplier(52),3);
 assert.equal(upgradeCost(51,'multiplier'),Infinity);
 assert.equal(upgrade(save,'multiplier'),false);
 assert.equal(claimBonus(save,'multiplier'),false);
 assert.equal(JSON.stringify(save),before);
 assert.equal(BONUS_EVERY,5);
 assert.equal(bonusCredits(save),2);
});
test('conserva monedas y progreso con la nueva curva de multiplicador',()=>{
 const save=sanitizeSave({version:2,levels:{power:49,swing:17,multiplier:9},coins:1311,best:1730,shots:97,paidUpgrades:72,bonusClaims:6});
 assert.deepEqual(save.levels,{power:49,swing:17,multiplier:9});
 assert.equal(save.coins,1311);
 assert.equal(save.best,1730);
 assert.equal(save.shots,97);
 assert.equal(save.paidUpgrades,72);
 assert.equal(save.bonusClaims,6);
 const coins=coinRewardBreakdown(795,save.levels);
 assert.equal(coins.base,596);
 assert.equal(coins.multiplier,1.48);
 assert.equal(coins.total,882);
});

 test('multiplicador aumenta un 6% al principio, se modera y conserva el máximo de x3',()=>{
 for(const [level,expected] of [[1,1],[2,1.06],[11,1.6],[21,2.2],[22,2.24],[31,2.6],[32,2.62],[41,2.8],[51,3],[99,3]])assert.equal(coinMultiplier(level),expected);
 for(let n=2;n<=51;n++){assert.ok(coinMultiplier(n)>coinMultiplier(n-1));assert.ok(coinMultiplier(n)>=((100+4*(n-1))/100));}
 });
