import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingAt,buildingParcel,groundAt,roadAt,riverAt,urbanGroundTiles,BUILDING_PAVING_MARGIN,ROAD_LOT_GAP} from '../src/world.js';
import {ROAD_CENTERS,roadTraffic} from '../src/traffic.js';
test('every building has complete cobblestone perimeter and a grass setback from roads',()=>{
 let count=0;
 for(let j=0;j<=24;j++)for(let i=-4;i<=4;i++){
  const b=buildingAt(i,j);if(!b)continue;count++;
  const p=buildingParcel(b);
  assert.equal(p.w,b.w+18);assert.equal(p.d,b.d+18);
  assert.equal(BUILDING_PAVING_MARGIN,9);assert.equal(ROAD_LOT_GAP,6);
  for(const z of ROAD_CENTERS)assert.ok(Math.abs(z-b.z)-p.d/2-14>=ROAD_LOT_GAP-1e-8);
  assert.ok(p.z+p.d/2+ROAD_LOT_GAP<=1603);
  for(const x of [p.x-p.w/2+.1,p.x,p.x+p.w/2-.1])for(const z of [p.z-p.d/2+.1,p.z,p.z+p.d/2-.1])assert.equal(groundAt(x,z).type,'paving');
 }
 assert.equal(count,92);
 for(const z of ROAD_CENTERS.filter(z=>z<1600))for(const side of [-1,1])for(const x of [-200,0,200])assert.equal(groundAt(x,z+side*15).type,'grass');
});
test('reserved park, civic plaza and vacant dirt lot have no buildings',()=>{
 for(const j of [8,9])for(const i of [-2,-1]){assert.equal(buildingAt(i,j),null);assert.equal(groundAt(i*60,270+j*60).type,'grass')}
 for(const i of [1,2])assert.equal(buildingAt(i,14),null);
 assert.equal(groundAt(90,1110).type,'paving');
 assert.equal(buildingAt(3,5),null);assert.equal(groundAt(180,570).type,'grass');
 assert.ok(urbanGroundTiles(11).some(p=>p.material==='dirt'));
});
test('the river has no road or cars crossing the water',()=>{
 assert.equal(roadAt(1665),false);assert.equal(ROAD_CENTERS.includes(1665),false);
 assert.deepEqual(roadTraffic(1665,0),[]);assert.equal(groundAt(0,1665).type,'water');
 assert.ok(riverAt(1665));
});
