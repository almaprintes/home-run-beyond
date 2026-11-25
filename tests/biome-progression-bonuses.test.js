import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSave,sanitizeSave,calculateShot,coinRewardBreakdown,settleShot,upgradeCost,pitchTimingGuide,pitchTimingDeltaMs} from '../src/logic.js';
import {BAT_CATALOG,OUTFIT_CATALOG,BALL_CATALOG,RARITY_BONUSES,equipmentBonuses} from '../src/cosmetic-catalog.js';
import {COLLECTIONS,DISCOVERY_RULES,discoveryRegion,unlockEligible,recordDiscoveryShot,isDiscovered} from '../src/discoveries.js';
import {aimSweetHalf,preciseAim} from '../src/aiming.js';

test('all 101 cosmetics have a real region or an explicit long-distance goal',()=>{
 let total=0;
 for(const [category,items] of Object.entries(COLLECTIONS))for(const item of items){
  const region=discoveryRegion(category,item.id);
  assert.ok(region.label&&Number.isFinite(region.at)&&region.at>=0);
  if(item.rarity==='LEYENDA')assert.ok(region.at>=12000);
  assert.equal(item.bonus,RARITY_BONUSES[item.rarity][category]);
  total++;
 }
 assert.equal(total,101);
 assert.equal(discoveryRegion('outfit','pirata').id,'port');
 assert.equal(discoveryRegion('bat','trucha').id,'port');
 assert.equal(discoveryRegion('bat','pata_de_palo').at,1500);
 assert.equal(discoveryRegion('outfit','ninja').at,6000);
 assert.equal(discoveryRegion('ball','sol').id,'distance');
});
test('equipped and owned rarity bonuses are independent, not inventory stacking',()=>{
 const s=initialSave(),levels=s.levels,base=calculateShot(levels,0);
 assert.deepEqual(equipmentBonuses(s),{power:0,precision:0,coins:0});
 s.owned.push('maza','fuego');s.ownedOutfits.push('robot');s.ownedBalls.push('cristal');
 assert.deepEqual(equipmentBonuses(s),{power:0,precision:0,coins:0});
 s.equipped='maza';s.equippedOutfit='robot';s.equippedBall='cristal';
 const b=equipmentBonuses(s);assert.deepEqual(b,{power:.10,precision:.25,coins:.35});
 assert.ok(Math.abs(calculateShot(levels,0,b).initialSpeed/base.initialSpeed-1.10)<1e-10);
 assert.equal(calculateShot(levels,55).quality,'excellent');
 assert.equal(calculateShot(levels,55,b).quality,'perfect');
 assert.equal(aimSweetHalf(1,1,b.precision),aimSweetHalf(1,1)*1.25);
 const guide=pitchTimingGuide(1,1.3,b.precision);
 assert.equal(guide.quality,calculateShot(levels,pitchTimingDeltaMs(1,1.3),b).quality);
 const reward=settleShot(s,1000);assert.equal(reward.coins,1012);
 assert.equal(coinRewardBreakdown(1000,{multiplier:51},.35).total,3037);
 s.equipped='antorcha';assert.equal(equipmentBonuses(s).power,0,'unowned id has no bonus');
});
test('reduced upgrade cost and owned equipment survive the save migration',()=>{
 const s=initialSave();s.coins=4541;s.levels.power=17;s.best=591;s.shots=116;
 s.owned.push('maza');s.equipped='maza';s.discovered.push('outfit:pirata');
 assert.equal(upgradeCost(17,'power'),1745);
 const migrated=sanitizeSave(s);
 assert.equal(migrated.coins,4541);assert.equal(migrated.levels.power,17);
 assert.equal(migrated.furthestZ,591);assert.equal(equipmentBonuses(migrated).power,.10);
 assert.ok(isDiscovered(migrated,'outfit','pirata'));
});
test('biome gate uses actual furthest reached even if the ball rolls back',()=>{
 const s=initialSave();s.coins=1e6;s.earnedCoins=1e6;s.shots=1000;s.best=1499;
 s.discoveryStats={perfectHits:10000,preciseHits:10000,goodStreak:100,bestGoodStreak:100,recordBreaks:1000};
 s.discoveryFlags=['road','roof','river','water','district','harbor','forest','mountains','orbit','swamp'];
 unlockEligible(s);
 assert.equal(isDiscovered(s,'bat','pata_de_palo'),false);
 assert.equal(isDiscovered(s,'outfit','pirata'),false);
 recordDiscoveryShot(s,{peakZ:1500});unlockEligible(s);
 assert.equal(s.furthestZ,1500);assert.ok(isDiscovered(s,'bat','pata_de_palo'));
 assert.equal(isDiscovered(s,'ball','sol'),false);
 assert.equal(sanitizeSave(s).furthestZ,1500);
});
test('paced discoveries cannot show a continuous queue of epic items',()=>{
 const s=initialSave();s.earnedCoins=1e8;s.shots=1000;s.best=190000;
 s.discoveryStats={perfectHits:10000,preciseHits:10000,goodStreak:100,bestGoodStreak:100,recordBreaks:1000};
 s.discoveryFlags=['road','roof','river','water','district','harbor','forest','mountains','orbit','swamp'];
 const early=unlockEligible(s).filter(x=>x.item.rarity!=='ÉPICO'&&x.item.rarity!=='LEYENDA');
 // Simulate a player who has already collected every lower tier.
 s.discovered=[...new Set([...s.discovered.filter(k=>{const [cat,id]=k.split(':');return !['ÉPICO','LEYENDA'].includes(COLLECTIONS[cat].find(x=>x.id===id).rarity)} )])];
 s.lastDiscoveryShot=s.shots;
 assert.equal(recordDiscoveryShot(s).length,0);
 s.shots+=17;assert.equal(recordDiscoveryShot(s).length,0);
 s.shots++;const unlocked=recordDiscoveryShot(s);assert.equal(unlocked.length,1);
 assert.equal(unlocked[0].item.rarity,'ÉPICO');
 s.shots++;assert.equal(recordDiscoveryShot(s).length,0);
});
