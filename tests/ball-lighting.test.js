import test from 'node:test';
import assert from 'node:assert/strict';
import {neutralizeBaseballLighting,shadeRollingSurface} from '../src/sprites.js';
test('leather loses baked-in shadow without losing the red stitching',()=>{
 const w=96,h=96,a=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,shade=245-y*1.05,thread=x===34||x===62;
  a[i]=thread?shade:shade;a[i+1]=thread?shade*.22:shade;a[i+2]=thread?shade*.20:shade;a[i+3]=255;
 }
 const b=neutralizeBaseballLighting(a,w,h);
 const p=(x,y)=>(y*w+x)*4;
 assert.ok(Math.abs(b[p(48,12)]-b[p(48,82)])<25);
 assert.ok(b[p(34,60)]>b[p(34,60)+1]*2);
 assert.deepEqual(a[p(48,82)],159);
});
test('light stays fixed even when the sphere rotates 180 degrees',()=>{
 const w=32,h=32,source=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<source.length;i+=4){source[i]=240;source[i+1]=240;source[i+2]=240;source[i+3]=255}
 const a=new Uint8ClampedArray(32*32*4),b=new Uint8ClampedArray(a.length);
 const cam=[0,5,-20],target=[0,3,30];
 shadeRollingSurface(source,w,h,{orientation:[0,0,0,1]},cam,target,a,32,true);
 shadeRollingSurface(source,w,h,{orientation:[1,0,0,0]},cam,target,b,32,true);
 assert.deepEqual(a,b);
 assert.ok(a[(7*32+16)*4]>a[(24*32+16)*4]);
});
