
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {orthographic,lookAt,mul4} from '../src/engine.js';
import {STUDIO_HOLD_MS,STUDIO_EXPORT,bindStudioHold,mapPoint,exportTiles} from '../src/world-studio.js';
test('World Studio opens only on a completed seven-second logo hold',()=>{
 const listeners={},node={addEventListener(type,cb){listeners[type]=cb},setPointerCapture(){}};
 let fn=null,opened=0,delay;
 const clock={setTimeout(cb,ms){fn=cb;delay=ms;return 1},clearTimeout(){fn=null}};
 bindStudioHold(node,()=>opened++,clock);
 const e={button:0,pointerId:1,clientX:3,clientY:4,preventDefault(){}};
 listeners.pointerdown(e);assert.equal(delay,7000);assert.equal(STUDIO_HOLD_MS,7000);assert.equal(opened,0);
 listeners.pointerup(e);assert.equal(fn,null);
 listeners.pointerdown(e);listeners.pointermove({...e,clientX:20});assert.equal(fn,null);
 listeners.pointerdown(e);fn();assert.equal(opened,1);
});
test('orthographic top-down matrix has no singular camera and meters map without perspective',()=>{
 const vp=mul4(orthographic(600,350),lookAt([0,500,100],[0,0,100],[0,0,1]));
 assert.ok([...vp].every(Number.isFinite));assert.equal(vp[15],1);
 const v={x:0,z:100,height:350};
 assert.deepEqual(mapPoint(0,100,v,1200,700),[600,350]);
 assert.deepEqual(mapPoint(-300,275,v,1200,700),[1200,0]);
 assert.deepEqual(mapPoint(300,-75,v,1200,700),[0,700]);
});
test('full PNG stitches the actual world from stadium rear through 2 km without gaps',()=>{
 const tiles=exportTiles();assert.equal(tiles.length,6);
 assert.equal(tiles[0].z+tiles[0].height/2,STUDIO_EXPORT.end);
 assert.equal(tiles.at(-1).z-tiles.at(-1).height/2,STUDIO_EXPORT.start);
 for(let i=1;i<tiles.length;i++){assert.equal(tiles[i-1].z-tiles[i].z,350);assert.equal(tiles[i].offset-tiles[i-1].offset,700)}
 assert.equal(tiles[0].pixelWidth,1200);
 const src=readFileSync(new URL('../src/world-studio.js',import.meta.url),'utf8');
 assert.match(src,/drawWorld\(this.renderer,cam,/);assert.match(src,/out\.toBlob/);
 assert.match(src,/game\.stopped=true/);
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/world-studio\.js\?v=0\.77\.39/);
});

test('iPhone native touch long press survives duplicate pointer cancellation',()=>{
 const listeners={},classes=new Set(),node={addEventListener(type,cb){listeners[type]=cb},classList:{add:s=>classes.add(s),remove:s=>classes.delete(s)}};
 let fn=null,opened=0,delay;
 const clock={setTimeout(cb,ms){fn=cb;delay=ms;return 1},clearTimeout(){fn=null}};
 bindStudioHold(node,()=>opened++,clock);
 const t={identifier:7,clientX:10,clientY:10},e={touches:[t],cancelable:true,preventDefault(){}};
 listeners.pointerdown({pointerType:'touch',button:0,pointerId:1});assert.equal(fn,null);
 listeners.touchstart(e);assert.equal(delay,7000);assert.ok(classes.has('ws-holding'));
 listeners.pointercancel({pointerType:'touch',pointerId:1});assert.ok(fn);
 listeners.touchmove({...e,touches:[{...t,clientX:25}]});assert.ok(fn);
 fn();assert.equal(opened,1);assert.ok(!classes.has('ws-holding'));
 listeners.touchstart(e);listeners.touchend({...e,touches:[]});assert.equal(fn,null);
 listeners.touchstart(e);listeners.touchmove({...e,touches:[{...t,clientX:50}]});assert.equal(fn,null);
 listeners.touchstart(e);listeners.touchcancel({...e,touches:[]});assert.equal(fn,null);
 const src=readFileSync(new URL('../src/world-studio.js',import.meta.url),'utf8');
 assert.match(src,/\.menu-title h1/);
});
