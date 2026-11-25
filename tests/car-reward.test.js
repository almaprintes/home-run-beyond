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
