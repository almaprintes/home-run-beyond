import test from 'node:test';
import assert from 'node:assert/strict';
import {BaseballGame,createShotOrbit,shotOrbitPose,SHOT_ORBIT_SECONDS} from '../src/game.js';
import {initialSave,sanitizeSave} from '../src/logic.js';
import {surfaceBelowBall} from '../src/world.js';
test('cinematic enabled by default and respects saved off preference',()=>{
 assert.equal(initialSave().cinematicCamera,true);
 assert.equal(sanitizeSave({version:3}).cinematicCamera,true);
 assert.equal(sanitizeSave({...initialSave(),cinematicCamera:false}).cinematicCamera,false);
});
test('360 orbit follows stationary ball, starts from current camera and clears nearby roofs',()=>{
 const b={x:0,y:1.45,z:330},cam=[9,18,298],target=[0,2,344];
 const o=createShotOrbit(b,cam,target);
 assert.equal(SHOT_ORBIT_SECONDS,4);
 assert.deepEqual(shotOrbitPose(o,0).camera,cam);
 const p1=shotOrbitPose(o,1),p2=shotOrbitPose(o,2),p3=shotOrbitPose(o,3),p4=shotOrbitPose(o,4);
 for(const p of [p1,p2,p3,p4]){
  assert.deepEqual(p.target,[b.x,b.y,b.z]);
  assert.ok(Math.abs(Math.hypot(p.camera[0]-b.x,p.camera[2]-b.z)-40)<1e-8);
  assert.ok(p.camera[1]>=surfaceBelowBall({x:p.camera[0],y:1e6,z:p.camera[2]}).y+6);
 }
 assert.ok(Math.abs(p1.camera[0]+p3.camera[0]-2*b.x)<1e-8);
 assert.ok(Math.abs(p2.camera[2]+p4.camera[2]-2*b.z)<1e-8);
});
function fixture(run){
 const previous=globalThis.document,els=new Map();
 globalThis.document={getElementById(id){if(!els.has(id))els.set(id,{hidden:true,textContent:'',classList:{add(){},remove(){}}});return els.get(id)}};
 try{return run(els)}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous}
}
test('reward persists exactly once before cinematic, skip reveals result without another payment',()=>fixture(els=>{
 const g=Object.create(BaseballGame.prototype);
 Object.assign(g,{state:'flight',save:initialSave(),ball:{x:0,y:1.45,z:100,vx:0,vy:0,vz:0,maxZ:100},camera:[9,18,68],target:[0,2,114],pendingShot:{quality:'good'},clearTransientToast(){},clearEncounterReward(){},renderEncounterRewards(){},showDiscoveries(){},drawUI(){},toast(){},audio:{cash(){},record(){}},persist(){this.writes=(this.writes||0)+1}});
 g.finishShot();assert.equal(g.state,'orbit');assert.equal(g.save.shots,1);assert.equal(g.writes,1);
 const coins=g.save.coins;assert.equal(els.get('result').hidden,true);assert.equal(els.get('orbit-skip').hidden,false);
 g.finishShot();g.completeShotOrbit();g.completeShotOrbit();
 assert.equal(g.state,'rest');assert.equal(g.save.coins,coins);assert.equal(g.save.shots,1);assert.equal(g.writes,1);
 assert.equal(els.get('result').hidden,false);assert.equal(els.get('orbit-skip').hidden,true);
}));
