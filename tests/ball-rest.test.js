import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initBallSpin,advanceVisualSpin,integratePhysicalSpin,freezeBallSpin} from '../src/ball-spin.js';
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
