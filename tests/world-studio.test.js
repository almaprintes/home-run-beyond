
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
 assert.match(sw,/world-studio\.js\?v=0\.77\.66/);
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

import {initialSave,createCatalogTestSave,SHOP_SECTIONS,equipCosmetic,SAVE_KEY} from '../src/logic.js';
import {isDiscovered} from '../src/discoveries.js';
import {BaseballGame} from '../src/game.js';
test('catalog test owns and discovers every item at zero cost without modifying actual progress',()=>{
 const actual=initialSave();actual.coins=1234;actual.levels.power=24;actual.best=1116;
 const original=JSON.stringify(actual),test=createCatalogTestSave(actual);
 for(const [key,section] of Object.entries(SHOP_SECTIONS)){
  assert.equal(test[section.owned].length,section.items.length);
  for(const item of section.items){assert.ok(isDiscovered(test,key,item.id));assert.equal(equipCosmetic(test,key,item.id),'equipped')}
 }
 assert.equal(test.coins,1234);assert.equal(test.levels.power,24);
 test.coins+=1000;test.best=3000;test.levels.power++;
 assert.equal(JSON.stringify(actual),original);
});
test('catalog test mode cannot overwrite real local storage and restores original equipment',()=>{
 const storage=globalThis.localStorage,doc=globalThis.document,writes=[];
 globalThis.localStorage={setItem(k,v){writes.push([k,v])}};
 globalThis.document={getElementById:()=>({hidden:false})};
 try{
  const g=Object.create(BaseballGame.prototype);Object.assign(g,{state:'menu',save:initialSave(),closeItemPreview(){},applySettings(){},showMenu(){},sprites:{prepareEquipment(){}}});
  const original=g.save;
  g.persist();assert.equal(writes.length,1);assert.equal(writes[0][0],SAVE_KEY);
  assert.ok(g.setCatalogTestMode(true));assert.ok(g.catalogTestActive);assert.notEqual(g.save,original);
  equipCosmetic(g.save,'outfit',SHOP_SECTIONS.outfit.items.at(-1).id);g.save.coins=0;g.persist();assert.equal(writes.length,1);
  assert.ok(g.setCatalogTestMode(false));assert.equal(g.save,original);assert.equal(g.catalogTestActive,false);g.persist();assert.equal(writes.length,2);assert.equal(writes[1][1],writes[0][1]);
  g.state='flight';assert.equal(g.setCatalogTestMode(true),false);
 }finally{if(storage===undefined)delete globalThis.localStorage;else globalThis.localStorage=storage;if(doc===undefined)delete globalThis.document;else globalThis.document=doc}
});
