import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BatterSprites,shadeRollingSurface} from '../src/sprites.js';
import {ImpactEffects} from '../src/impact-fx.js';
import {BaseballGame} from '../src/game.js';
import {initBallSpin,advanceVisualSpin,onSpinImpact,freezeBallSpin} from '../src/ball-spin.js';

test('snowball does not rotate as a flat image and uses the original spherical texture',()=>{
 const sprites=new BatterSprites({getContext:()=>null}),image={width:160,height:160};
 sprites.getStyledBall=()=>image;
 let flat=0,draws=0;
 const ctx={rotate(){flat++},drawImage(img){assert.equal(img,image);draws++}};
 for(const spin of [null,{angle:4,orientation:[0,0,0,1]}])sprites.drawEquippedBall(ctx,{save:{equippedBall:'nieve'}},32,spin,[0,5,-20],[0,0,0]);
 assert.equal(flat,0);assert.equal(draws,2);assert.equal(sprites.ballSurfaceCache.mode,'snow');
 const n=32,src=new Uint8ClampedArray(n*n*4),out=new Uint8ClampedArray(src.length);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const k=(y*n+x)*4;src[k]=170+x*2;src[k+1]=180+y*2;src[k+2]=240;src[k+3]=255}
 const paint=spin=>shadeRollingSurface(src,n,n,spin,[0,5,-20],[0,0,0],out,n,true,.46,true).slice();
 const b={vx:0,vy:10,vz:40};initBallSpin(b);
 const first=paint(b.spin);b.spin.angle=3;assert.deepEqual(paint(b.spin),first);
 advanceVisualSpin(b,.05);assert.notDeepEqual(paint(b.spin),first);
 onSpinImpact(b,{x:0,y:1,z:0},'grass');for(let i=0;i<20;i++)advanceVisualSpin(b,.016);
 assert.ok(b.spin.visualRate>0);
 freezeBallSpin(b);const rest=paint(b.spin);advanceVisualSpin(b,.05);assert.deepEqual(paint(b.spin),rest);
});
test('snow trail is emitted behind motion, bounded, weaker on the ground, and stops at rest',()=>{
 const fx=new ImpactEffects(),b={x:0,y:10,z:40,vx:0,vy:1,vz:80};
 for(let i=0;i<8;i++)fx.spawnSnowTrail(b,.05);
 const flying=fx.particles.length;
 assert.ok(flying>0);assert.ok(fx.particles.every(p=>p.z<b.z));
 assert.ok(fx.particles.some(p=>p.kind==='snowPuff'));
 fx.clear();b.spinContact=true;
 for(let i=0;i<8;i++)fx.spawnSnowTrail(b,.05);
 assert.ok(fx.particles.length>0&&fx.particles.length<flying);
 for(let i=0;i<200;i++)fx.spawnSnowTrail(b,.05);
 assert.ok(fx.particles.length<=90);
 fx.clear();b.vy=b.vz=0;fx.spawnSnowTrail(b,.05);assert.equal(fx.particles.length,0);
 b.vz=50;b.spin={frozen:true};fx.spawnSnowTrail(b,.05);assert.equal(fx.particles.length,0);
});
test('snow impacts add puffs without replacing surface effects or physical sound',()=>{
 const g=Object.create(BaseballGame.prototype),sounds=[];
 g.save={equippedBall:'nieve'};g.audio={impact:m=>sounds.push(m)};g.impactFX=new ImpactEffects();
 g.emitCollision('grass',{x:0,y:1.45,z:20},40);
 assert.ok(g.impactFX.particles.some(p=>p.kind==='snowPuff'));
 assert.ok(g.impactFX.particles.some(p=>p.kind==='snow'));
 assert.ok(g.impactFX.particles.some(p=>p.kind==='grass'));
 assert.deepEqual(sounds,['grass']);
 for(let i=0;i<100;i++)g.impactFX.update(.016);
 assert.equal(g.impactFX.particles.length,0);
 g.save.reducedEffects=true;g.emitCollision('road',{x:0,y:1.45,z:20},40);
 assert.equal(g.impactFX.particles.length,0);assert.deepEqual(sounds,['grass','road']);
 g.save={equippedBall:'classic'};g.emitCollision('road',{x:0,y:1.45,z:20},40);
 assert.ok(g.impactFX.particles.every(p=>p.material!=='snow'));
 const code=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(code,/equippedBall==='nieve'&&!this.save\?\.reducedEffects\)this.impactFX\?\.spawnSnowTrail/);
});
