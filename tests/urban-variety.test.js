import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingAt,buildingCore,buildingBoxes,buildingFacade,buildingParcel,traceBuildingCollision,surfaceBelowBall} from '../src/world.js';
import {ROAD_CENTERS} from '../src/traffic.js';
test('urban families have diverse dimensions and deterministic positions without encroaching on roads',()=>{
 const buildings=[];
 for(let j=0;j<=24;j++)for(let i=-4;i<=4;i++){
  const b=buildingAt(i,j);if(!b)continue;buildings.push(b);
  assert.deepEqual(b,buildingAt(i,j));
  const p=buildingParcel(b);
  for(const z of ROAD_CENTERS)assert.ok(Math.abs(z-b.z)-p.d/2-14>=6-1e-8);
 }
 assert.equal(buildings.length,92);
 assert.ok(new Set(buildings.map(b=>b.family)).size>=7);
 assert.ok(Math.min(...buildings.map(b=>b.h))<10);
 assert.ok(Math.max(...buildings.map(b=>b.h))>55);
 assert.ok(buildings.some(b=>b.w/b.h>3));
 assert.ok(buildings.some(b=>b.h/b.w>2.5));
 assert.ok(buildings.some(b=>b.x!==b.i*60));
});
test('L-shaped buildings have a real open corner and shared collision geometry',()=>{
 let b;
 for(let j=2;j<=24&&!b;j++)for(let i=-4;i<=4;i++){const a=buildingAt(i,j);if(a?.family==='courtyard'){b=a;break}}
 assert.ok(b);
 const c=buildingCore(b),parts=buildingBoxes(b);
 assert.ok(c.w<b.w);
 assert.equal(parts.filter(p=>p.kind==='wall').length,2);
 const x=b.x+b.w/2-2,z=b.z-b.d/2+2;
 assert.ok(parts.every(p=>x<p.min[0]||x>p.max[0]||z<p.min[2]||z>p.max[2]));
 const wingX=x,wingZ=b.z+b.d*.35;
 const hit=traceBuildingCollision({x:wingX,y:b.h+10,z:wingZ},{x:wingX,y:2,z:wingZ},.5);
 assert.equal(hit?.kind,'roof');
 assert.ok(surfaceBelowBall({x:wingX,y:b.h+10,z:wingZ}).y>5);
 assert.ok(buildingFacade(b).windows.every(w=>!(w.axis==='x'&&w.side===1)));
});
