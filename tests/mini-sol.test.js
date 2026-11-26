import test from 'node:test';
import assert from 'node:assert/strict';
import {ImpactEffects} from '../src/impact-fx.js';
import {BaseballGame} from '../src/game.js';
import {shadeRollingSurface} from '../src/sprites.js';
import {spinQuaternion} from '../src/ball-spin.js';
test('Mini Sol uses flames and embers instead of material particles; audio stays physical',()=>{
 const g=Object.create(BaseballGame.prototype),sounds=[];
 g.save={equippedBall:'sol'};g.audio={impact:m=>sounds.push(m)};g.impactFX=new ImpactEffects();
 g.emitCollision('grass',{x:0,y:0,z:0},40);
 assert.ok(g.impactFX.particles.length>0);assert.ok(g.impactFX.particles.every(p=>['flame','ember'].includes(p.kind)));
 assert.equal(g.impactFX.rings.length,0);assert.deepEqual(sounds,['grass']);
 g.impactFX.clear();g.save.equippedBall='classic';g.emitCollision('grass',{x:0,y:0,z:0},40);
 assert.ok(g.impactFX.particles.every(p=>p.kind==='grass'));
});
test('solar trail is bounded, weaker when rolling, and stops emitting at rest',()=>{
 const fx=new ImpactEffects(),ball={x:0,y:5,z:10,vx:0,vy:2,vz:50};
 for(let i=0;i<100;i++)fx.spawnSolarTrail(ball,.05);
 assert.ok(fx.particles.length<=90);assert.ok(fx.particles.some(p=>p.kind==='flame'));
 fx.clear();ball.spinContact=true;for(let i=0;i<10;i++)fx.spawnSolarTrail(ball,.05);
 assert.ok(fx.particles.some(p=>p.kind==='ember'));assert.ok(fx.particles.length<10);
 fx.clear();ball.vy=ball.vz=0;for(let i=0;i<100;i++)fx.spawnSolarTrail(ball,.05);
 assert.equal(fx.particles.length,0);
});
test('solar photosphere changes with quaternion, not the flat angle',()=>{
 const w=32,src=new Uint8ClampedArray(w*w*4),out=new Uint8ClampedArray(w*w*4);
 for(let y=0;y<w;y++)for(let x=0;x<w;x++){let i=(y*w+x)*4;src[i]=255;src[i+1]=x*7;src[i+2]=y*5;src[i+3]=255}
 const spin={orientation:[0,0,0,1],angle:0};
 shadeRollingSurface(src,w,w,spin,[0,7,-20],[0,4,10],out,w,false,.35);const before=out.slice();
 spinQuaternion(spin,[1,0,0],.8);shadeRollingSurface(src,w,w,spin,[0,7,-20],[0,4,10],out,w,false,.35);
 assert.ok(out.some((v,i)=>v!==before[i]));
});
