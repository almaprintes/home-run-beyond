import test from 'node:test';
import assert from 'node:assert/strict';
import {ImpactEffects,MAX_GLASS_SHARDS} from '../src/impact-fx.js';
import {BaseballGame} from '../src/game.js';
import {buildingAt,buildingFacade,groundAt,drawWorld} from '../src/world.js';
const b=buildingAt(0,1),pane=buildingFacade(b).windows.find(w=>w.axis==='z'&&w.side===-1);
const p={x:(pane.min[0]+pane.max[0])/2,y:(pane.min[1]+pane.max[1])/2,z:(pane.min[2]+pane.max[2])/2};
const hit={building:b,windowId:pane.id,point:{...p,y:28}};
test('glass falls outside the correct facade, bounces, settles and expires',()=>{
 const fx=new ImpactEffects();fx.spawnGlassShards(hit,80);
 assert.ok(fx.glassShards.length>=6&&fx.glassShards.length<=12);
 let chimes=0;
 for(let i=0;i<200;i++)fx.update(.016,()=>chimes++);
 assert.ok(fx.glassShards.length>0);
 assert.ok(fx.glassShards.every(s=>s.settled&&s.bounces>=1));
 assert.ok(fx.glassShards.every(s=>Math.abs(s.y-groundAt(s.x,s.z).y-.075)<1e-8&&s.z<b.z-b.d/2&&s.z>=b.z-b.d/2-5.5));
 assert.ok(chimes>0&&chimes<fx.glassShards.length);
 for(let i=0;i<300;i++)fx.update(.016);
 assert.equal(fx.glassShards.length,0);
});
test('all facade directions use the exterior, independent of incoming ball direction',()=>{
 const fx=new ImpactEffects();
 for(const pane of buildingFacade(b).windows.slice(0,200)){
  const center={x:(pane.min[0]+pane.max[0])/2,y:(pane.min[1]+pane.max[1])/2,z:(pane.min[2]+pane.max[2])/2};
  fx.spawnGlassShards({building:b,windowId:pane.id,point:center},80);
 }
 assert.ok(fx.glassShards.length<=MAX_GLASS_SHARDS);
 for(let i=0;i<60;i++)fx.update(.016);
 assert.ok(fx.glassShards.every(s=>(s[s.axis]-s.plane)*s.side>=.219));
 const draws=[];fx.drawGlassShards({add(...a){draws.push(a)}},[b.x,20,b.z-20]);
 assert.equal(draws.length,fx.glassShards.length);assert.ok(draws.every(d=>d[0]==='glassShard'));
 fx.clear();assert.equal(fx.glassShards.length,0);
});
test('actual window break creates physical visual debris even with Mini Sol',()=>{
 for(const reducedEffects of [false,true]){
  const g=Object.create(BaseballGame.prototype);
  Object.assign(g,{state:'flight',simElapsed:0,save:{equippedBall:'sol',reducedEffects},audio:{impact(){}},impactFX:new ImpactEffects(),ball:{...p,z:p.z-4,vx:0,vy:0,vz:120,bounces:0,maxZ:0}});
  g.finishShot=()=>{g.state='rest'};
  for(let i=0;i<4&&!g.brokenWindows?.has(pane.id);i++)g.simulateStep(.016);
  assert.ok(g.brokenWindows.has(pane.id));assert.ok(g.ball.vz>0&&g.ball.vz<120);
  assert.equal(g.impactFX.glassShards.length>0,!reducedEffects);
 }
});