import test from 'node:test';
import assert from 'node:assert/strict';
import {pitcherPose,pitcherReactionPlan,pitcherCutActive,pitcherCamera} from '../src/pitcher.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {selectPitcherFrame,PITCHER_ATLAS,PITCHER_FRAMES} from '../src/sprites.js';
import {drawWorld,drawPitcher,pitcherBallPosition} from '../src/world.js';
test('pitcher salta hacia un batazo próximo sin modificar su trayectoria',()=>{
 const shot=Object.freeze({vx:6,vy:16,vz:36}),plan=pitcherReactionPlan(shot);
 assert.equal(plan.jump,true);
 const g={state:'flight',pendingShot:shot,pitcherReaction:plan,liveSeconds:plan.start+.4};
 const p=pitcherPose(g);assert.equal(p.phase,'jump');assert.ok(p.lift>1.9);assert.ok(p.reach>.9);
 assert.equal(shot.vx,6);assert.equal(shot.vy,16);assert.equal(shot.vz,36);
 assert.equal(pitcherPose({...g,liveSeconds:plan.start+1}).phase,'land');
 const wide=pitcherReactionPlan({vx:40,vy:16,vz:36});assert.equal(wide.jump,false);
 assert.equal(pitcherPose({state:'flight',pitcherReaction:wide,liveSeconds:.5}).lift,0);
});
test('lanzamiento articulado y pelota de lanzamiento no se alteran',()=>{
 assert.equal(pitcherPose({state:'ready'}).phase,'ready');
 assert.ok(pitcherPose({state:'pitching',pitchElapsed:.22,pitchDuration:1.52}).throw>.8);
 assert.ok(Math.abs(pitcherBallPosition(.5).z-7.8)<1e-9);assert.equal(pitcherBallPosition(.5).y,2.85);
 const calls=[],r={add(...a){calls.push(a)},pole(){},box(){},ball(){}};
 drawPitcher(r,pitcherPose({state:'ready'}));assert.ok(calls.some(a=>a.at(-1)==='#94582e'));
 assert.ok(calls.every(a=>a.slice(1,7).every(Number.isFinite)));
});
test('el mundo sigue dibujando al pitcher tras el golpe',()=>{
 const calls=[],r={begin(){},add(...a){calls.push(a)},box(){},field(){},ball(){},pole(){},cone(){}};
 const shot={vx:0,vy:16,vz:36},plan=pitcherReactionPlan(shot);
 drawWorld(r,[0,9,-15],{state:'flight',ball:{x:0,y:8,z:18,vx:0,vy:16,vz:36},pendingShot:shot,pitcherReaction:plan,liveSeconds:plan.start+.4,sprites:{ballLoaded:true}});
 assert.ok(calls.some(a=>a[0]==='ball'&&a[3]>19&&a[3]<23&&a.at(-1)==='#94582e'));
});

test('personalized face and conditional camera never mutate the ball',()=>{
 const plan=pitcherReactionPlan({vx:6,vy:16,vz:36});
 const ball=Object.freeze({x:1,y:20,z:100,vx:6,vy:16,vz:36});
 const g={state:'flight',liveSeconds:.8,pitcherReaction:plan,save:{cinematicCamera:true},ball};
 assert.equal(pitcherCutActive(g),true);
 assert.equal(pitcherCutActive({...g,liveSeconds:.5}),false);
 assert.equal(pitcherCutActive({...g,liveSeconds:1.1}),false);
 assert.equal(pitcherCutActive({...g,save:{cinematicCamera:false}}),false);
 assert.equal(pitcherCutActive({...g,save:{cinematicCamera:true,reducedEffects:true}}),false);
 assert.equal(pitcherCutActive({...g,pitcherReaction:{jump:false}}),false);
 assert.ok(pitcherCamera(g).camera.every(Number.isFinite));
 assert.equal(pitcherPose({...g,pitcherCut:true}).phase,'jump');
 assert.equal(ball.z,100);
 const calls=[],r={add(...a){calls.push(a)},pole(){},box(){},ball(){}};
 drawPitcher(r,pitcherPose({state:'ready'}));
 assert.ok(calls.some(a=>a.includes('#1464a1')));
 assert.ok(calls.some(a=>a.includes('#a9a8a1')));
});

test('six approved sprite frames are loaded from the verified transparent WebP',()=>{
 const asset=readFileSync(new URL('../'+PITCHER_ATLAS.split('?')[0].slice(2),import.meta.url));
 assert.equal(asset.toString('ascii',8,12),'WEBP');
 assert.equal(asset.length,159614);
 assert.equal(createHash('sha1').update('blob '+asset.length+'\0').update(asset).digest('hex'),'1fb5818e5f0346d4cc84b8f13c4188f4fb061cba');
 assert.equal(PITCHER_FRAMES.length,6);
 assert.equal(selectPitcherFrame({state:'ready'}),0);
 assert.equal(selectPitcherFrame({state:'pitching',pitchElapsed:.02,pitchDuration:1.52}),1);
 assert.equal(selectPitcherFrame({state:'pitching',pitchElapsed:.2,pitchDuration:1.52}),2);
 assert.equal(selectPitcherFrame({state:'flight',pitcherCut:true,liveSeconds:.66}),3);
 assert.equal(selectPitcherFrame({state:'flight',pitcherCut:true,liveSeconds:.8}),4);
 assert.equal(selectPitcherFrame({state:'flight',pitcherCut:true,liveSeconds:1.01}),5);
 assert.equal(selectPitcherFrame({state:'orbit'}),null);
});
