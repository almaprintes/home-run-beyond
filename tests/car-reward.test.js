import test from 'node:test';
import assert from 'node:assert/strict';
import {roadTraffic,registerTrafficHit} from '../src/traffic.js';
import {initialSave,settleShot,CAR_REWARD,GULL_REWARD} from '../src/logic.js';

test('each physical car only counts once per shot, including roof, body and tires',()=>{
 const b={},a=roadTraffic(265,0)[0],other=roadTraffic(265,0)[1];
 assert.equal(registerTrafficHit(b,{kind:'traffic-body',car:a}),true);
 assert.equal(registerTrafficHit(b,{kind:'traffic-roof',car:roadTraffic(265,1)[0]}),false);
 assert.equal(registerTrafficHit(b,{kind:'traffic-wheel',car:a}),false);
 assert.equal(registerTrafficHit(b,{kind:'traffic-body',car:other}),true);
 assert.equal(registerTrafficHit(b,{kind:'traffic-body',car:{...a,roadZ:465}}),true);
 assert.equal(registerTrafficHit(b,{kind:'ground',car:a}),false);
 assert.equal(b.hitCars.size,3);
 assert.equal(registerTrafficHit({}, {kind:'traffic-body',car:a}),true,'new shot resets the count');
});
test('car reward is fixed, independent of equipment multiplier and compatible with gull bonus',()=>{
 const s=initialSave();s.levels.multiplier=51;s.ownedBalls.push('cristal');s.equippedBall='cristal';
 const normal=settleShot(s,100);
 const before=s.coins,earned=s.earnedCoins;
 const hit=settleShot(s,100,{cars:3,gull:true});
 assert.equal(CAR_REWARD,50);assert.equal(hit.carCoins,150);assert.equal(hit.carCount,3);
 assert.equal(hit.eventCoins,GULL_REWARD);
 assert.equal(hit.coins,normal.coins+1150);
 assert.equal(s.coins,before+hit.coins);assert.equal(s.earnedCoins,earned+hit.coins);
 assert.equal(settleShot(s,100,{cars:-5}).coins,normal.coins);
});

import {readFileSync} from 'node:fs';
test('unique car and gull encounters announce rewards immediately and keep special rows in the final result',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/if\(registerTrafficHit\(b,hit\)\)this\.showEncounterReward\?\.\('car',b\.hitCars\.size\)/);
 assert.match(game,/if\(newGull\)this\.showEncounterReward\?\.\('gull',gulls\.size\)/);
 assert.match(game,/this\.renderEncounterRewards\?\.\(reward\)/);
 assert.match(game,/this\.encounterTimer=gull\?2\.5:1\.65/);
 for(const id of ['encounter-pop','car-reward','gull-reward','car-reward-amount','gull-reward-amount'])assert.ok(html.includes('id="'+id+'"'));
});
