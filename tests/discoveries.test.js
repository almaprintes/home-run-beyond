import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialSave,sanitizeSave,equipCosmetic,settleShot} from '../src/logic.js';
import {COLLECTIONS,DISCOVERY_RULES,DISCOVERY_GROUP_COUNTS,STARTER_DISCOVERIES,
 discoveredCount,isDiscovered,unlockEligible,recordDiscoveryShot,nextDiscoveryHint} from '../src/discoveries.js';
import {BaseballGame} from '../src/game.js';

test('100 cosméticos: 3 iniciales y 97 reglas únicas con reparto de 4 sistemas',()=>{
 assert.deepEqual(STARTER_DISCOVERIES,['bat:classic','outfit:red','ball:classic']);
 assert.equal(Object.keys(DISCOVERY_RULES).length,97);
 assert.deepEqual(DISCOVERY_GROUP_COUNTS,{play:47,record:25,skill:15,secret:10});
 for(const [category,items] of Object.entries(COLLECTIONS)){
  for(const item of items){
   const key=category+':'+item.id;
   assert.ok(STARTER_DISCOVERIES.includes(key)||DISCOVERY_RULES[key],key);
  }
 }
 const s=initialSave();
 assert.deepEqual(Object.keys(COLLECTIONS).map(k=>discoveredCount(s,k).found),[1,1,1]);
 assert.equal(Object.values(COLLECTIONS).reduce((n,list)=>n+list.length,0),100);
});
test('la tienda impide comprar los ocultos; 3 batazos descubren pelota azul y 5 el bate dorado',()=>{
 const s=initialSave();s.coins=100000;s.earnedCoins=10000;
 const balance=s.coins;
 assert.equal(equipCosmetic(s,'ball','sky'),'locked');
 assert.equal(equipCosmetic(s,'bat','gold'),'locked');
 assert.equal(s.coins,balance);
 assert.equal(s.ownedBalls.includes('sky'),false);
 let unlocked=[];
 for(let i=0;i<3;i++){
  settleShot(s,90);
  unlocked=recordDiscoveryShot(s,{quality:'good',record:i===0,peakZ:90});
 }
 assert.equal(isDiscovered(s,'ball','sky'),true);
 assert.ok(unlocked.some(x=>x.item.id==='sky'));
 assert.equal(isDiscovered(s,'bat','gold'),false);
 const beforeBuying=s.coins;
 assert.equal(equipCosmetic(s,'ball','sky'),'purchased');
 assert.equal(s.coins,beforeBuying-280);
 for(let i=0;i<2;i++){
  settleShot(s,90);
  unlocked=recordDiscoveryShot(s,{quality:'good',peakZ:90});
 }
 assert.ok(unlocked.some(x=>x.item.id==='gold'));
 assert.equal(equipCosmetic(s,'bat','gold'),'purchased');
 assert.equal(equipCosmetic(s,'ball','sky'),'equipped');
 assert.equal(unlockEligible(s).length,0,'sin repetir anuncios');
});
test('retroactividad: récord, batazos y compras antiguas siguen disponibles sin regalar monedas',()=>{
 const before={version:3,coins:1234,best:3200,shots:77,totalMeters:10000,
  owned:['classic','nova'],equipped:'nova',ownedOutfits:['red','pirata'],equippedOutfit:'pirata',
  ownedBalls:['classic','luna'],equippedBall:'luna',levels:{power:49,swing:17,multiplier:9}};
 const s=sanitizeSave(before);
 assert.equal(s.coins,1234);
 assert.equal(s.best,3200);
 assert.equal(s.shots,77);
 assert.equal(s.equipped,'nova');assert.equal(s.equippedOutfit,'pirata');assert.equal(s.equippedBall,'luna');
 assert.ok(isDiscovered(s,'bat','nova'));
 assert.ok(isDiscovered(s,'outfit','pirata'));
 assert.ok(isDiscovered(s,'ball','luna'));
 assert.ok(isDiscovered(s,'outfit','blue'),'récord 100m previo');
 assert.ok(isDiscovered(s,'ball','tierra'),'récord 3000m previo');
 assert.ok(isDiscovered(s,'bat','gold'),'5 batazos previos');
 assert.ok(isDiscovered(s,'ball','tenis'),'distancia acumulada anterior');
 assert.ok(s.discoveryFlags.includes('river'),'zona demostrada por récord antiguo');
 assert.equal(s.discoveryStats.perfectHits,0,'no inventar perfectos anteriores');
 assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(s))),s);
});
test('cinco contactos perfectos revelan baguette y se conserva el progreso tras guardar',()=>{
 let s=initialSave();s.earnedCoins=15000;
 for(let i=0;i<4;i++)recordDiscoveryShot(s,{quality:'perfect'});
 assert.equal(s.discoveryStats.perfectHits,4);
 assert.equal(isDiscovered(s,'bat','baguette'),false);
 const items=recordDiscoveryShot(s,{quality:'perfect'});
 assert.ok(items.some(x=>x.item.id==='baguette'));
 assert.equal(isDiscovered(s,'bat','baguette'),true);
 s=sanitizeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(s.discoveryStats.perfectHits,5);
 assert.equal(s.discoveryStats.bestGoodStreak,5);
 assert.equal(unlockEligible(s).length,0);
});
test('sucesos especiales y récords se contabilizan por separado y solo una vez',()=>{
 const s=initialSave();s.earnedCoins=100000;
 let found=[];
 found.push(...recordDiscoveryShot(s,{quality:'weak',road:true,roof:true,water:true,swamp:true,peakZ:20500,record:true}));
 assert.equal(found.length,1,'un aviso como máximo por batazo');
 for(let i=0;i<16;i++)found.push(...recordDiscoveryShot(s,{quality:'weak'}));
 assert.ok(found.some(x=>x.item.id==='escoba'),'contacto con asfalto');
 assert.ok(found.some(x=>x.item.id==='chef'),'rebote sobre techo');
 assert.ok(found.some(x=>x.item.id==='pescador'),'paso por el río');
 assert.ok(found.some(x=>x.item.id==='astronauta'),'llegada a órbita');
 assert.equal(s.discoveryStats.recordBreaks,1);
 assert.equal(recordDiscoveryShot(s,{quality:'weak',road:true}).some(x=>x.item.id==='escoba'),false);
 assert.equal(s.discoveryFlags.filter(x=>x==='road').length,1);
});
test('no hay elementos irrecuperables y los nombres secretos no se revelan en pistas',()=>{
 const s=initialSave();
 s.shots=1e7;s.best=190000;s.totalMeters=1e9;s.earnedCoins=1e9;
 s.discoveryStats={perfectHits:10000,preciseHits:10000,goodStreak:100,bestGoodStreak:100,recordBreaks:1000};
 s.discoveryFlags=['road','roof','river','water','district','harbor','forest','mountains','orbit','swamp'];
 const items=unlockEligible(s);
 assert.equal(items.length,97);
 assert.deepEqual(Object.keys(COLLECTIONS).map(k=>discoveredCount(s,k).found),[35,33,32]);
 assert.equal(unlockEligible(s).length,0);
 const fresh=initialSave(),hint=nextDiscoveryHint(fresh,'ball');
 assert.ok(hint.includes('batazos'));
 assert.doesNotMatch(hint,/azul|sky|astronauta|precio/i);
});
test('interfaz: no se crean tarjetas ni imágenes de productos ocultos',()=>{
 const original=globalThis.document;
 const els=new Map();
 const node=(name='div')=>({
  tagName:name,children:[],textContent:'',style:{},hidden:false,className:'',
  classList:{toggle(){}},setAttribute(){},addEventListener(){},
  append(...children){this.children.push(...children)},
  replaceChildren(){this.children=[]}
 });
 globalThis.document={
  getElementById(id){if(!els.has(id))els.set(id,node());return els.get(id)},
  createElement(tag){return node(tag)}
 };
 try{
  const game=Object.create(BaseballGame.prototype);
  game.save=initialSave();game.shopSection='bat';
  game.renderShop();
  assert.equal(els.get('shop-items').children.length,1);
  assert.equal(els.get('shop-discovery-count').textContent,'BATES: 1/35 DESCUBIERTOS');
  assert.ok(els.get('shop-discovery-next').textContent.includes('batazos'));
  game.save.shots=5;game.save.earnedCoins=2000;unlockEligible(game.save);game.renderShop();
  assert.equal(els.get('shop-items').children.length,2);
  assert.equal(els.get('shop-discovery-count').textContent,'BATES: 2/35 DESCUBIERTOS');
  game.showDiscoveries([{category:'bat',item:COLLECTIONS.bat[1]}]);
  assert.equal(els.get('discovery-banner').hidden,false);
  assert.match(els.get('discovery-items').textContent,/Bate dorado/);
  game.showDiscoveries([]);
  assert.equal(els.get('discovery-banner').hidden,true);
 }finally{
  if(original===undefined)delete globalThis.document;else globalThis.document=original;
 }
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="discovery-banner"/);
 assert.match(html,/id="shop-discovery-count"/);
 assert.match(html,/id="shop-discovery-next"/);
});

test('el aviso es un modal superpuesto, independiente del resultado y cerrable',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const gameJs=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const result=html.indexOf('id="result"'),resultEnd=html.indexOf('</section>',result);
 const modal=html.indexOf('id="discovery-banner"');
 assert.ok(result>=0&&resultEnd>result&&modal>resultEnd,'el modal debe estar FUERA de la tarjeta');
 assert.match(html,/class="layer modal-shell discovery-modal-shell" id="discovery-banner"/);
 for(const id of ['discovery-close','discovery-dismiss','discovery-shop']){
  assert.ok(html.includes('id="'+id+'"'));
 }
 assert.match(css,/#discovery-banner\.discovery-modal-shell\{/);
 assert.match(css,/z-index:20/);
 assert.match(css,/#discovery-banner\[hidden\]\{display:none!important\}/);
 assert.match(gameJs,/click\('discovery-close',\(\)=>this\.closeDiscovery\(\)\)/);
 assert.match(gameJs,/click\('discovery-dismiss',\(\)=>this\.closeDiscovery\(\)\)/);
 const prev=globalThis.document;
 const panel={hidden:true};
 globalThis.document={getElementById(id){return id==='discovery-banner'?panel:{textContent:'',focus(){}}}};
 try{
  const game=Object.create(BaseballGame.prototype);
  game.closeDiscovery();
  assert.equal(panel.hidden,true);
  game.showDiscoveries([{category:'bat',item:COLLECTIONS.bat[1]}]);
  assert.equal(panel.hidden,false);
  game.closeDiscovery();
  assert.equal(panel.hidden,true);
 }finally{if(prev===undefined)delete globalThis.document;else globalThis.document=prev}
});
