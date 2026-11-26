import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingAt,buildingFacade,traceBuildingCollision,windowAppearance,drawWorld} from '../src/world.js';
import {BaseballGame} from '../src/game.js';
import {synthImpulse} from '../src/audio.js';
import {materialEffect} from '../src/impact-fx.js';
const b=buildingAt(0,1);
const pane=buildingFacade(b).windows.find(w=>w.axis==='z'&&w.side===-1);
const center=w=>({x:(w.min[0]+w.max[0])/2,y:(w.min[1]+w.max[1])/2,z:(w.min[2]+w.max[2])/2});
test('ventanas de cuatro fachadas con identificadores únicos y huecos reales',()=>{
 const f=buildingFacade(b);
 assert.equal(new Set(f.windows.map(w=>w.axis+':'+w.side)).size,4);
 assert.equal(new Set(f.windows.map(w=>w.id)).size,f.windows.length);
 for(const w of f.windows){const p=center(w),axis=w.axis;
  const from={...p,[axis]:p[axis]+w.side*6},to={...p,[axis]:p[axis]-w.side*2};
  const h=traceBuildingCollision(from,to,1.45);assert.equal(h?.windowId,w.id,w.id);
  assert.equal(h.kind,'glass');
  assert.equal(traceBuildingCollision(from,to,1.45,new Set([w.id])),null,w.id);
 }
});
test('pilar central sigue siendo muro',()=>{
 const y=center(pane).y,z=b.z-b.d/2;
 const h=traceBuildingCollision({x:b.x,y,z:z-6},{x:b.x,y,z:z+2},1.45);
 assert.equal(h?.kind,'wall');
});
test('bola rompe ventana, conserva dirección y puede salir por la opuesta',()=>{
 const p=center(pane),g=Object.create(BaseballGame.prototype),sounds=[];
 g.state='flight';g.simElapsed=0;g.save={reducedEffects:true};g.audio={impact:m=>sounds.push(m)};g.finishShot=()=>{};
 g.ball={x:p.x,y:p.y,z:p.z-4,vx:0,vy:0,vz:120,bounces:0,maxZ:0};
 for(let i=0;i<50&&g.ball.z<b.z+b.d/2+2;i++)g.simulateStep(.016);
 assert.ok(g.brokenWindows.has(pane.id));assert.ok(g.brokenWindows.size>=2);
 assert.ok(g.ball.z>b.z+b.d/2);assert.ok(g.ball.vz>0&&g.ball.vz<120);
 assert.ok(sounds.filter(s=>s==='glass').length>=2);
});
test('cristal tiene partículas de fragmentos y un timbre propio',()=>{
 assert.equal(materialEffect('glass').kind,'shard');
 const x=synthImpulse('glass',22050),y=synthImpulse('concrete',22050);
 assert.ok(x.every(Number.isFinite));assert.ok(Math.max(...x.map(Math.abs))>.7);
 assert.notDeepEqual(x,y);
});

test('glass has deterministic cold, neutral and warm tones without changing collision boxes',()=>{
 const counts={cool:0,neutral:0,warm:0};let n=0;
 for(let j=0;j<=24;j++)for(let i=-4;i<=4;i++){
  const b=buildingAt(i,j);if(!b)continue;
  for(const w of buildingFacade(b).windows){
   assert.deepEqual(windowAppearance(w.id),{category:w.category,color:w.color});
   counts[w.category]++;n++;
  }
 }
 assert.ok(Math.abs(counts.cool/n-.7)<.04);assert.ok(Math.abs(counts.neutral/n-.2)<.04);assert.ok(Math.abs(counts.warm/n-.1)<.04);
});
test('broken panes remove the whole reflective glass instance',()=>{
 const p=center(pane);
 function capture(brokenWindows){
  let material;const panes=[];
  const r={begin(){},setLayer(){},setMaterial(m){material=m},box(...a){if(material==='glass')panes.push(a)},field(){},ball(){},pole(){},cone(){},add(){}};
  drawWorld(r,[b.x,20,b.z-25],{state:'flight',ball:{...p,vx:0,vy:0,vz:0},brokenWindows,clock:0});
  return panes.filter(a=>Math.abs(a[0]-p.x)<1e-6&&Math.abs(a[1]-p.y)<1e-6&&Math.abs(a[2]-p.z)<1e-6);
 }
 assert.equal(capture(new Set()).length,1);assert.equal(capture(new Set([pane.id])).length,0);
});
