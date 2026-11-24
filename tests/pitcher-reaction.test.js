import test from 'node:test';
import assert from 'node:assert/strict';
import {pitcherPose,pitcherReactionPlan} from '../src/pitcher.js';
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
