import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initBallSpin,advanceVisualSpin,integratePhysicalSpin,freezeBallSpin} from '../src/ball-spin.js';
import {BaseballGame} from '../src/game.js';
import {BatterSprites,shadeRollingSurface} from '../src/sprites.js';
test('freeze preserves position, visible quaternion and accumulated angle',()=>{
 const b={x:5,y:1.45,z:90,vx:2,vy:0,vz:5};initBallSpin(b);
 b.spin.groundEngaged=true;for(let i=0;i<8;i++)advanceVisualSpin(b,1/60);
 b.spin.angle=1.7;const q=b.spin.visualOrientation.slice(),pos=[b.x,b.y,b.z];
 freezeBallSpin(b);
 for(let i=0;i<100;i++){advanceVisualSpin(b,.016);integratePhysicalSpin(b,b,.016,true);}
 assert.deepEqual(b.spin.visualOrientation,q);assert.equal(b.spin.angle,1.7);
 assert.deepEqual([b.x,b.y,b.z],pos);assert.equal(b.spin.visualRate,0);
 const texture=new Uint8ClampedArray(16*16*4);
 for(let i=0;i<texture.length;i+=4){texture[i]=i%255;texture[i+3]=255}
 const p=new Uint8ClampedArray(32*32*4),r=new Uint8ClampedArray(p.length);
 shadeRollingSurface(texture,16,16,b.spin,[0,5,-20],[0,3,30],p,32);
 advanceVisualSpin(b,.04);
 shadeRollingSurface(texture,16,16,b.spin,[0,5,-20],[0,3,30],r,32);
 assert.deepEqual(p,r);
});
test('rest keeps drawing the same equipped sprite, without a trail or a painted impact ring',()=>{
 const old=globalThis.window;globalThis.window={devicePixelRatio:1,innerWidth:390,innerHeight:844};
 const pics=[],arcs=[],rot=[];
 const ctx={setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},ellipse(){},fill(){},translate(){},rotate(x){rot.push(x)},drawImage(img){pics.push(img)},arc(...a){arcs.push(a)},stroke(){}};
 try{
  const sprites=new BatterSprites({clientWidth:390,clientHeight:844,getContext:()=>ctx});
  sprites.ballLoaded=true;const img={width:160,height:160};sprites.getStyledBall=()=>img;
  const b={x:0,y:1.45,z:70,vx:0,vy:0,vz:0,impactAge:0,spin:{angle:1.7,orientation:[0,0,0,1],frozen:true}};
  const g={state:'rest',ball:b,save:{equippedBall:'luna'},camera:[8,20,30],target:[0,4,80]};
  sprites.draw(g,58);assert.ok(pics.includes(img));assert.ok(rot.includes(1.7));assert.equal(arcs.length,0);
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old}
});
test('no visual reset at slow speed and no hit mark or ghost trail',()=>{
 const s=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 const g=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const w=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.doesNotMatch(s,/planar>1\.3|ballImpactOpacity|createLinearGradient/);
 assert.match(g,/freezeBallSpin\(b\);this.state='rest'/);
 assert.doesNotMatch(g,/spawnBat\(/);
 assert.match(w,/game.ball&&\['flight','landing','rest'\]/);
});

function testFlight(ball){
 const g=Object.create(BaseballGame.prototype);
 Object.assign(g,{state:'flight',ball:{bounces:0,maxZ:0,...ball},simElapsed:0,liveSeconds:30,audio:{impact(){}}});
 g.finishShot=()=>{g.state='rest'};
 return g;
}
test('airborne ball cannot finish even after 23 seconds, 340 simulated seconds or 200 km',()=>{
 const g=testFlight({x:0,y:80,z:200001,vx:0,vy:0,vz:60,restTime:1,stillTime:1,wetTime:5});
 g.simElapsed=341;
 g.simulateStep(.02);
 assert.equal(g.state,'flight');assert.ok(g.ball.z>200001);assert.equal(g.ball.restTime,0);
 const source=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/liveSeconds\s*>\s*23|simElapsed\s*>\s*340|b\.z\s*>\s*200000/);
});
test('rolling and backwards motion continue until sustained supported rest',()=>{
 for(const dir of [-1,1]){
  const g=testFlight({x:0,y:1.45,z:80,vx:0,vy:0,vz:dir*3,restTime:.44});
  g.simulateStep(.02);assert.equal(g.state,'flight');assert.equal(g.ball.restTime,0);
  for(let i=0;i<600&&g.state==='flight';i++)g.simulateStep(.02);
  assert.equal(g.state,'rest');assert.equal(Math.hypot(g.ball.vx,g.ball.vy,g.ball.vz),0);assert.equal(g.ball.y,1.45);
 }
});
test('a near-stationary ball at the top of its arc is still in flight',()=>{
 const g=testFlight({x:0,y:25,z:80,vx:0,vy:0,vz:0,restTime:.44,wetTime:4});
 g.simulateStep(.02);assert.equal(g.state,'flight');assert.equal(g.ball.restTime,0);assert.ok(g.ball.vy<0);
});

import {buildingAt} from '../src/world.js';
function roofOf(material){
 for(let j=0;j<=24;j++)for(let i=-5;i<=5;i++){
  const b=buildingAt(i,j);if(b?.roofMaterial===material&&b.w>=16&&b.d>=16)return b;
 }
 throw Error('no roof '+material);
}
test('rubber and solid roofs rebound instead of absorbing the first landing',()=>{
 for(const material of ['rubber','solid']){
  const b=roofOf(material),y=b.h+1.4+1.45;
  const g=testFlight({x:b.x+b.w*.36,y:y+.20,z:b.z+b.d*.30,vx:0,vy:-12,vz:2});
  g.save={reducedEffects:true};g.brokenWindows=new Set();g.emitCollision=()=>{};
  g.simulateStep(.025);
  assert.ok(g.ball.vy>6,material);assert.ok(g.ball.vz>1.6);assert.equal(g.ball.bounces,1);assert.equal(g.state,'flight');
  const firstY=g.ball.y;g.simulateStep(.025);assert.ok(g.ball.y>firstY);
 }
});
test('slow roof contact advances horizontally with continuous friction instead of losing half its velocity per step',()=>{
 for(const material of ['rubber','solid']){
  const b=roofOf(material),y=b.h+1.4+1.45,z=b.z+b.d*.30;
  const g=testFlight({x:b.x+b.w*.36,y:y+.0001,z,vx:0,vy:0,vz:2});
  g.save={reducedEffects:true};g.brokenWindows=new Set();g.emitCollision=()=>{};
  for(let i=0;i<20;i++)g.simulateStep(.02);
  assert.equal(g.state,'flight');assert.ok(g.ball.z-z>.45,material);assert.ok(g.ball.vz>.9,material);assert.equal(g.ball.bounces,0);
 }
});

test('supported stationary ball finishes on the first simulation step, without waiting .45 seconds',()=>{
 const g=testFlight({x:0,y:1.45,z:80,vx:0,vy:0,vz:0,restTime:0});
 g.simulateStep(.016);
 assert.equal(g.state,'rest');assert.equal(g.ball.y,1.45);assert.equal(g.ball.vy,0);
});
