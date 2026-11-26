import test from 'node:test';
import assert from 'node:assert/strict';
import {FOUNTAIN,fountainParts,drawFountain,groundAt,traceFountainCollision,surfaceBelowBall} from '../src/world.js';
import {BaseballGame} from '../src/game.js';
test('plaza fountain water, stone rim and jets use shared coordinates',()=>{
 const {x,z,waterY}=FOUNTAIN;
 assert.equal(groundAt(x+6,z).type,'water');
 assert.equal(groundAt(x+6,z).y,waterY);
 assert.equal(groundAt(x+15,z).type,'paving');
 const parts=[],jets=[],water=[];
 drawFountain({setMaterial(){},box(...p){parts.push(p)},ball(...p){jets.push(p)},field(...p){water.push(p)}},0.2);
 assert.equal(parts.length,fountainParts().length);assert.ok(jets.length>20);assert.equal(water.length,1);
 const hit=traceFountainCollision({x,y:1.5,z:z-20},{x,y:1.5,z:z-4});
 assert.ok(hit);assert.equal(hit.kind,'fountain-stone');assert.equal(hit.normal.z,-1);
 assert.equal(surfaceBelowBall({x,y:5,z}).y,3.3);
});
test('ball landing in fountain water loses speed and does not earn a roof discovery',()=>{
 const g=Object.create(BaseballGame.prototype);g.state='flight';g.simElapsed=0;g.audio={land(){}};g.finishShot=()=>{};
 g.ball={x:FOUNTAIN.x+6,y:FOUNTAIN.waterY+1.48,z:FOUNTAIN.z,vx:0,vy:-12,vz:18,bounces:0,maxZ:FOUNTAIN.z};
 g.simulateStep(1/60);
 assert.equal(g.ball.impactMaterial,'water');assert.ok(g.ball.vz<5);assert.ok(!g.ball.encounters?.roof);
});
