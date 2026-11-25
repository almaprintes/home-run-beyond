import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BaseballGame} from '../src/game.js';
import {initialSave,SHOP_SECTIONS} from '../src/logic.js';
import {bakedAssetUrl} from '../src/baked-assets.js';
function fixture(run){
 const before=globalThis.document,els=new Map();
 const el=id=>{if(!els.has(id))els.set(id,{hidden:false,scrollTop:0,textContent:'',setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},focus(){this.focused=true}});return els.get(id)};
 globalThis.document={getElementById:el};
 const g=Object.create(BaseballGame.prototype);g.save=initialSave();g.persist=()=>{throw Error('Preview must never persist')};g.drawUI=()=>{};
 try{return run(g,el)}finally{if(before===undefined)delete globalThis.document;else globalThis.document=before}
}
test('viewing any discovered category uses the exact asset and leaves the entire save unchanged',()=>fixture((g,el)=>{
 g.save.coins=0;g.save.discovered.push('bat:gold','outfit:blue','ball:sky');
 const saved=JSON.stringify(g.save);
 for(const [kind,id] of [['bat','gold'],['outfit','blue'],['ball','sky'],['bat','classic']]){
  el('shop-scroll').scrollTop=240;
  const trigger={isConnected:true,focus(){this.focused=true}};
  assert.equal(g.openItemPreview(kind,id,trigger),true);
  assert.equal(el('item-preview-image').src,bakedAssetUrl(kind,id));
  assert.equal(el('item-preview').hidden,false);assert.equal(el('shop').inert,true);
  assert.equal(el('item-preview-title').textContent,SHOP_SECTIONS[kind].items.find(x=>x.id===id).name);
  el('item-preview-image').onload();assert.equal(el('item-preview-image').hidden,false);
  el('shop-scroll').scrollTop=0;g.closeItemPreview();
  assert.equal(el('item-preview').hidden,true);assert.equal(el('shop').inert,false);
  assert.equal(el('shop-scroll').scrollTop,240);assert.equal(trigger.focused,true);
  assert.equal(JSON.stringify(g.save),saved);
 }
}));
test('unknown and undiscovered products cannot be previewed; failures can be retried',()=>fixture((g,el)=>{
 assert.equal(g.openItemPreview('bat','not_real'),false);
 assert.equal(g.openItemPreview('bat','gold'),false);
 assert.equal(g.openItemPreview('ball','classic'),true);
 const img=el('item-preview-image'),url=img.src;
 img.onerror();assert.equal(img.src,url.split('?')[0]);img.onerror();
 assert.equal(el('item-preview-retry').hidden,false);
 g.loadItemPreview(g.itemPreview);assert.equal(img.src,url);
 const pending=img.onload;g.closeItemPreview();pending();assert.equal(img.hidden,true);
}));
test('modal is read-only and has no purchase button; the explicit shop button does not bubble',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const modal=html.slice(html.indexOf('id="item-preview"'),html.indexOf('id="settings"'));
 assert.match(modal,/aria-modal="true"/);assert.match(modal,/id="item-preview-close"/);
 assert.doesNotMatch(modal,/shop-buy|EQUIPAR|COMPRAR/);
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(game,/row.addEventListener\('click',\(\)=>this.openItemPreview/);
 assert.match(game,/btn.addEventListener\('click',e=>\{\s*e.stopPropagation\(\)/);
});
