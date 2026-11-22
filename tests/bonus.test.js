import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSave,sanitizeSave,upgrade,upgradeCost,bonusCredits,bonusProgress,claimBonus} from '../src/logic.js';

test('cuatro mejoras pagadas desbloquean +1 nivel extra',()=>{
 const s=initialSave();s.coins=5000;
 for(let i=0;i<4;i++)assert.equal(upgrade(s,'power'),true);
 assert.equal(s.paidUpgrades,4);assert.equal(bonusCredits(s),1);assert.equal(bonusProgress(s),0);
 const old=s.coins;
 assert.equal(claimBonus(s,'reflex'),true);
 assert.equal(s.levels.reflex,2);assert.equal(s.coins,old);
 assert.equal(bonusCredits(s),0);assert.equal(claimBonus(s,'swing'),false);
});
test('una compra fallida no cuenta para bonus',()=>{
 const s=initialSave();s.coins=0;assert.equal(upgrade(s,'power'),false);assert.equal(s.paidUpgrades,0);
});
test('el bono extra no modifica las compras pagadas y no se duplica',()=>{
 const s=initialSave();s.coins=100000;
 for(let i=0;i<8;i++)upgrade(s,'swing');
 assert.equal(bonusCredits(s),2);
 assert.equal(claimBonus(s,'power'),true);
 assert.equal(claimBonus(s,'reflex'),true);
 assert.equal(claimBonus(s,'power'),false);
 assert.equal(s.bonusClaims,2);
});
test('migración concede bono por compras antiguas conservando saldo',()=>{
 const s=sanitizeSave({coins:154,best:105,shots:6,levels:{power:4,swing:2,reflex:1}});
 assert.equal(s.coins,154);assert.equal(s.paidUpgrades,4);assert.equal(bonusCredits(s),1);
});
test('progreso del bono se conserva sin canjes adicionales',()=>{
 const original=sanitizeSave({coins:1200,levels:{power:5,swing:3,reflex:1},paidUpgrades:6,bonusClaims:1});
 const restored=sanitizeSave(JSON.parse(JSON.stringify(original)));
 assert.equal(restored.paidUpgrades,6);assert.equal(restored.bonusClaims,1);assert.equal(bonusCredits(restored),0);
 assert.equal(bonusProgress(restored),2);
});