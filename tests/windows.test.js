import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingAt,buildingFacade,traceBuildingCollision} from '../src/world.js';
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
