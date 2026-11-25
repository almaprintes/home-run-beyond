import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSave,sanitizeSave,upgrade,upgradeCost,bonusCredits,bonusProgress,claimBonus,BONUS_EVERY} from '../src/logic.js';
test('una mejora extra se consigue por cada CINCO compras pagadas',()=>{
 assert.equal(BONUS_EVERY,5);
 const s=initialSave();s.coins=100000;
 for(let i=0;i<4;i++)assert.equal(upgrade(s,'power'),true);
 assert.equal(s.paidUpgrades,4);assert.equal(bonusCredits(s),0);
 assert.equal(bonusProgress(s),4);
 assert.equal(upgrade(s,'power'),true);
 assert.equal(s.paidUpgrades,5);assert.equal(bonusCredits(s),1);
 assert.equal(bonusProgress(s),0);
 const coins=s.coins;assert.equal(claimBonus(s,'multiplier'),true);
 assert.equal(s.levels.multiplier,2);assert.equal(s.coins,coins);
 assert.equal(bonusCredits(s),0);assert.equal(claimBonus(s,'power'),false);
});
test('diez compras generan dos bonos independientes; las fallidas no suman',()=>{
 const s=initialSave();s.coins=500000;
 for(let i=0;i<10;i++)assert.equal(upgrade(s,'swing'),true);
 assert.equal(bonusCredits(s),2);
 assert.equal(claimBonus(s,'power'),true);
 assert.equal(claimBonus(s,'multiplier'),true);
 assert.equal(bonusCredits(s),0);assert.equal(claimBonus(s,'power'),false);
 s.coins=0;assert.equal(upgrade(s,'power'),false);assert.equal(s.paidUpgrades,10);
});
test('se conservan los antiguos bonos sin cobrar cada cuatro',()=>{
 const s=sanitizeSave({coins:154,best:105,shots:6,levels:{power:4,swing:2,reflex:1}});
 assert.equal(s.coins,154);assert.equal(s.paidUpgrades,4);
 assert.equal(bonusCredits(s),1);
 assert.equal(claimBonus(s,'multiplier'),true);assert.equal(bonusCredits(s),0);
 const saved=sanitizeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.pendingLegacyBonuses,0);assert.equal(bonusCredits(saved),0);
});
test('la migración de niveles comprados antiguos conserva progresión al pasar a cada cinco',()=>{
 const old=sanitizeSave({coins:1200,levels:{power:5,swing:3,reflex:1},paidUpgrades:6,bonusClaims:1});
 assert.equal(old.paidUpgrades,6);assert.equal(old.bonusClaims,1);
 assert.equal(bonusCredits(old),0);assert.equal(bonusProgress(old),1);
 const s=sanitizeSave(JSON.parse(JSON.stringify(old)));
 assert.equal(s.bonusClaims,old.bonusClaims);
 assert.equal(bonusProgress(s),1);
});
test('nuevo nivel alto requiere muchas monedas, y no se puede comprar sin ellas',()=>{
 const s=initialSave(),price=upgradeCost(48,'power');
 assert.ok(price>9000);
 s.coins=price-1;s.levels.power=48;
 assert.equal(upgrade(s,'power'),false);
});
