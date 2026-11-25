import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialSave,sanitizeSave,settleShot,GULL_REWARD,GULL_ACHIEVEMENT} from '../src/logic.js';
test('real gull encounter pays a fixed 1000 coin reward and a unique persistent achievement',()=>{
 const s=initialSave();s.levels.multiplier=51;s.ownedBalls.push('cristal');s.equippedBall='cristal';
 const ordinary=settleShot(s,100);
 assert.equal(ordinary.eventCoins,undefined);
 const before=s.coins,earned=s.earnedCoins,shots=s.shots;
 const hit=settleShot(s,100,{gull:true});
 assert.equal(hit.eventCoins,GULL_REWARD);assert.equal(hit.coins,ordinary.coins+1000);
 assert.equal(s.coins,before+hit.coins);assert.equal(s.earnedCoins,earned+hit.coins);assert.equal(s.shots,shots+1);
 assert.equal(s.best,100);assert.equal(s.achievements.filter(a=>a===GULL_ACHIEVEMENT).length,1);
 const twice=settleShot(s,100,{gull:true});assert.equal(twice.eventCoins,1000);
 assert.equal(sanitizeSave(s).achievements.filter(a=>a===GULL_ACHIEVEMENT).length,1);
});
test('reward is tied to the winning physical collision and final shot settlement',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(game,/if\(hit\?\.kind==='gull'\)\{[\s\S]*?\.gull=true/);
 assert.match(game,/finishShot\(\)\{if\(this\.state!=='flight'\)return/);
 assert.match(game,/settleShot\(this\.save,forwardDistance\(b\),\{gull:b\.encounters\?\.gull===true\}\)/);
 assert.match(game,/GAVIOTA \+/);
});
