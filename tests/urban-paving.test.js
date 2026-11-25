import test from 'node:test';
import assert from 'node:assert/strict';
import {urbanGroundTiles,groundAt,drawTerrain,roadAt,riverAt,traceBuildingCollision} from '../src/world.js';
import {BaseballGame} from '../src/game.js';
import {WORLD_WIDTH} from '../src/biomes.js';

test('urban ground has exactly one non-overlapping tile per point, including attached slabs',()=>{
 let paved=0;
 for(let band=3;band<=32;band++){
  const tiles=urbanGroundTiles(band);
  assert.ok(tiles.length>0);
  assert.ok(Math.abs(tiles.reduce((sum,p)=>sum+p.w*p.d,0)-WORLD_WIDTH*50)<1e-5);
  for(let i=0;i<tiles.length;i++){
   const a=tiles[i];
   for(let j=i+1;j<tiles.length;j++){
    const b=tiles[j];
    assert.ok(Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)<1e-7||
     Math.min(a.z1,b.z1)-Math.max(a.z0,b.z0)<1e-7,'coplanar tiles overlap');
   }
   if(a.material==='paving'){
    paved++;
    for(const fx of [.05,.5,.95])for(const fz of [.05,.5,.95]){
     const x=a.x0+a.w*fx,z=a.z0+a.d*fz;
     assert.equal(groundAt(x,z).type,'paving');
    }
   }
  }
 }
 assert.ok(paved>30);
 assert.equal(groundAt(24,355).type,'paving','building annex slab');
 assert.equal(groundAt(0,1680).type,'water');
});
test('camera motion does not change the geometry or material of a slab',()=>{
 const capture=z=>{
  const fields=[];
  const r={field(x,y,z,w,d,color,rot,material){if(material==='paving')fields.push({x,y,z,w,d,material})},setLayer(){},setMaterial(){},add(){},box(){},ball(){},pole(){},cone(){}};
  drawTerrain(r,z,0,65,0,null);
  return fields.filter(p=>Math.abs(p.x-24)<p.w/2&&Math.abs(p.z-355)<p.d/2);
 };
 const a=capture(330),b=capture(650);
 assert.equal(a.length,1);assert.deepEqual(a,b);
});
test('first impact on a small paving slab uses hard response',()=>{
 const x=24,z=355,dt=1/60,g=Object.create(BaseballGame.prototype);
 g.state='flight';g.simElapsed=0;g.audio={impact(){}};g.finishShot=()=>{};
 g.ball={x,y:1.48,z,vx:0,vy:-12,vz:2,bounces:0,maxZ:z};
 g.simulateStep(dt);
 assert.equal(g.ball.impactMaterial,'paving');
 assert.equal(g.ball.lastCollision,'ADOQUINES');
 assert.ok(Math.abs(g.ball.vy-(12+9.81*dt)*.74)<1e-8);
});
test('fast touchdown at a paving boundary is classified at the actual contact',()=>{
 let sample;
 for(let band=6;band<=28&&!sample;band++)for(const p of urbanGroundTiles(band)){
  if(p.material!=='paving'||p.w<2||p.d<2)continue;
  const z=p.z,x=p.x1;
  if(groundAt(x-.2,z).type!=='paving'||groundAt(x+1,z).type!=='grass')continue;
  if(traceBuildingCollision({x:x-.7,y:1.5,z},{x:x+1.3,y:1.2,z},1.45))continue;
  sample={x,z};break;
 }
 assert.ok(sample,'no suitable boundary');
 const {x,z}=sample,dt=.02,g=Object.create(BaseballGame.prototype);
 g.state='flight';g.simElapsed=0;g.audio={impact(){}};g.finishShot=()=>{};
 g.ball={x:x-.7,y:1.48,z,vx:100,vy:-12,vz:0,bounces:0,maxZ:z};
 g.simulateStep(dt);
 assert.equal(g.ball.impactMaterial,'paving');
 assert.equal(g.ball.lastCollision,'ADOQUINES');
 assert.ok(g.ball.x<x,'touchdown is before the slab edge');
});
