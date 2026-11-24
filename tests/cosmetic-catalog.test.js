import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BAT_CATALOG,OUTFIT_CATALOG,BALL_CATALOG,ALL_COSMETIC_COUNT,cosmeticItem} from '../src/cosmetic-catalog.js';
import {COSMETICS,OUTFITS,BALL_STYLES,SHOP_SECTIONS,initialSave,sanitizeSave,equipCosmetic,calculateShot,rewardForMeters} from '../src/logic.js';
import {ILLUSTRATED_BALLS,WEAPON_POSES,paintThemedBall,paintWeapon,overlayOutfit,composeSpecialPose,makeIllustratedBall,makeCosmeticPreview} from '../src/cosmetic-art.js';
import {BatterSprites} from '../src/sprites.js';

function recordingContext(){
 const commands=[],gradient={addColorStop(p,c){commands.push(['stop',p,c])}};
 const ctx=new Proxy({}, {
  get(target,key){
   if(key==='commands')return commands;
   if(key==='createLinearGradient'||key==='createRadialGradient')return (...args)=>{commands.push([key,...args]);return gradient};
   if(key==='getImageData')return (x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
   if(key==='createImageData')return (w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
   if(typeof key==='string'&&['save','restore','beginPath','arc','ellipse','moveTo','lineTo','closePath','fill','stroke','clip','fillRect','strokeRect','fillText','translate','rotate','scale','drawImage','putImageData'].includes(key))
    return (...args)=>{commands.push([key,...args]);};
   return target[key];
  },
  set(target,key,value){if(key==='globalCompositeOperation')commands.push(['composite',value]);target[key]=value;return true}
 });
 return ctx;
}

test('catálogo cerrado de 100 cosméticos con IDs únicos en cada categoría',()=>{
 assert.equal(BAT_CATALOG.length,35);
 assert.equal(OUTFIT_CATALOG.length,33);
 assert.equal(BALL_CATALOG.length,32);
 assert.equal(ALL_COSMETIC_COUNT,100);
 assert.deepEqual(COSMETICS,BAT_CATALOG);
 assert.deepEqual(OUTFITS,OUTFIT_CATALOG);
 assert.deepEqual(BALL_STYLES,BALL_CATALOG);
 for(const list of [BAT_CATALOG,OUTFIT_CATALOG,BALL_CATALOG]){
  assert.equal(new Set(list.map(i=>i.id)).size,list.length);
  for(const item of list){
   assert.match(item.color,/^#[a-f0-9]{6}$/i);
   assert.match(item.accent,/^#[a-f0-9]{6}$/i);
   assert.ok(item.name.length>3);
   assert.ok(Number.isSafeInteger(item.price)&&item.price>=0);
   assert.ok(item.design.length>1);
  }
 }
 assert.deepEqual(Object.keys(SHOP_SECTIONS),['bat','outfit','ball']);
});
test('mini Sol tiene rayos propios, mini Luna cráteres, no son tintes con nombres engañosos',()=>{
 assert.equal(cosmeticItem('ball','sun').name,'Pelota amarilla','id antiguo se mantiene con nombre correcto');
 const sol=cosmeticItem('ball','sol'),luna=cosmeticItem('ball','luna');
 assert.equal(sol.design,'sun');assert.equal(luna.design,'moon');
 assert.ok(ILLUSTRATED_BALLS.has(sol.design));assert.ok(ILLUSTRATED_BALLS.has(luna.design));
 const sunCtx=recordingContext(),moonCtx=recordingContext();
 paintThemedBall(sunCtx,sol);
 paintThemedBall(moonCtx,luna);
 const sunLines=sunCtx.commands.filter(c=>c[0]==='stroke').length;
 const moonArcs=moonCtx.commands.filter(c=>c[0]==='arc').length;
 assert.ok(sunLines>=12,'sol sin rayos visibles');
 assert.ok(moonArcs>14,'luna sin relieve craterizado');
 assert.notDeepEqual(sunCtx.commands,moonCtx.commands);
});
test('Tierra, Saturno, billar 8, tenis, dónut, dado y otros tienen arte distinto',()=>{
 const modes=['earth','saturn','billiard','tennis','donut','dice','soccer','eyeball','disco','crystal'];
 const signatures=[];
 for(const mode of modes){
  const item=BALL_CATALOG.find(i=>i.design===mode);
  assert.ok(item,'falta '+mode);
  const ctx=recordingContext();paintThemedBall(ctx,item);
  assert.ok(ctx.commands.length>=14,mode+' no dibuja suficiente detalle');
  signatures.push(JSON.stringify(ctx.commands.map(c=>c[0]+':'+String(c[1]).slice(0,14))));
  if(mode==='billiard')assert.ok(ctx.commands.some(c=>c[0]==='fillText'&&c[1]==='8'));
  if(mode==='saturn')assert.ok(ctx.commands.filter(c=>c[0]==='ellipse').length>=2);
 }
 assert.equal(new Set(signatures).size,modes.length,'distintas pelotas dibujan lo mismo');
});
test('bates extravagantes poseen geometría y detalles propios',()=>{
 const names=['broom','trout','wire','bread','banana','guitar','hammer','pan','hockey','carrot'];
 const signatures=[];
 for(const mode of names){
  const item=BAT_CATALOG.find(i=>i.design===mode);
  assert.ok(item,'falta bate '+mode);
  const ctx=recordingContext();paintWeapon(ctx,item);
  assert.ok(ctx.commands.length>=10,mode+' no tiene geometría');
  signatures.push(JSON.stringify(ctx.commands.map(c=>c[0]+':'+String(c[1]).slice(0,15))));
 }
 assert.equal(new Set(signatures).size,10,'los bates especiales no deberían compartir todos los trazos');
 assert.equal(cosmeticItem('bat','trucha').name,'Trucha gigante');
 assert.equal(cosmeticItem('bat','escoba').name,'Escoba de barrendero');
 assert.equal(cosmeticItem('bat','alambre').design,'wire');
});
test('equipaciones de otros deportes y disfraces trazan patrones reales distintos',()=>{
 for(const id of ['futbol_azulgrana','basket_negro','rugby_verde','karate','chef','astronauta','robot']){
  const item=cosmeticItem('outfit',id),ctx=recordingContext();
  assert.ok(item);overlayOutfit(ctx,200,350,item,'ready');
  assert.ok(ctx.commands.some(c=>c[0]==='clip'));
  assert.ok(ctx.commands.filter(c=>['lineTo','fillRect','fill','stroke','fillText'].includes(c[0])).length>2,id);
 }
});
test('guardar 0.33: compras y colores siguen presentes después de ampliar el catálogo',()=>{
 const old={version:3,coins:2200,owned:['classic','gold','nova'],equipped:'nova',
  ownedBalls:['classic','sun','mint'],equippedBall:'sun',
  ownedOutfits:['red','blue'],equippedOutfit:'blue',levels:{power:49,swing:17,multiplier:9}};
 const save=sanitizeSave(old);
 assert.deepEqual(save.owned,['classic','gold','nova']);
 assert.equal(save.equipped,'nova');
 assert.equal(save.equippedBall,'sun');
 assert.equal(cosmeticItem('ball',save.equippedBall).name,'Pelota amarilla');
 // Compras antiguas siempre visibles; los productos nuevos requieren descubrirlos.
 assert.equal(equipCosmetic(save,'bat','escoba'),'locked');
 save.discovered.push('bat:escoba','ball:luna','outfit:futbol_azulgrana');
 const balanceBefore=save.coins;
 assert.equal(equipCosmetic(save,'bat','escoba'),'insufficient');
 assert.equal(save.coins,balanceBefore);
 save.coins=15000;
 assert.equal(equipCosmetic(save,'bat','escoba'),'purchased');
 assert.equal(equipCosmetic(save,'ball','luna'),'purchased');
 assert.equal(equipCosmetic(save,'outfit','futbol_azulgrana'),'purchased');
 const after=sanitizeSave(save);
 assert.deepEqual(after.owned,save.owned);
 assert.equal(after.equipped,'escoba');
 assert.equal(after.equippedBall,'luna');
 assert.equal(after.equippedOutfit,'futbol_azulgrana');
 const physics=calculateShot(after.levels,0);
 assert.deepEqual(physics,calculateShot(save.levels,0));
 assert.equal(rewardForMeters(900,after.levels),rewardForMeters(900,save.levels));
});
test('arte procedural se dibuja localmente, sin descargar cada objeto del catálogo',()=>{
 const prev=globalThis.document;
 const drawings=[];
 globalThis.document={createElement(type){
  assert.equal(type,'canvas');
  const ctx=recordingContext();drawings.push(ctx);
  return {width:0,height:0,getContext(){return ctx}};
 }};
 try{
  const moon=makeIllustratedBall(cosmeticItem('ball','luna'));
  assert.equal(moon.width,128);
  assert.ok(drawings[0].commands.length>25);
  const bat=makeCosmeticPreview('bat',cosmeticItem('bat','trucha'));
  assert.equal(bat.width,176);
  assert.ok(drawings.at(-1).commands.length>15);
  const baseImage={naturalWidth:194,naturalHeight:347};
  const pose=composeSpecialPose(baseImage,cosmeticItem('outfit','futbol_azulgrana'),cosmeticItem('bat','escoba'),'ready');
  assert.equal(pose.width,194);
  assert.ok(drawings.some(ctx=>ctx.commands.some(c=>c[0]==='composite'&&c[1]==='destination-out')));
  const sample=makeCosmeticPreview('outfit',cosmeticItem('outfit','ninja'),baseImage);
  assert.equal(sample.height,112);
 }finally{if(prev===undefined)delete globalThis.document;else globalThis.document=prev}
});
test('cada pose tiene anclajes para armas con silueta diferente',()=>{
 for(const pose of ['ready','watch','loaded','contact','follow']){
  const anchor=WEAPON_POSES[pose];
  assert.equal(anchor.grip.length,2);
  assert.equal(anchor.tip.length,2);
  assert.ok(Math.hypot(anchor.grip[0]-anchor.tip[0],anchor.grip[1]-anchor.tip[1])>.2);
 }
});
test('la tienda enseña los WebP definitivos de la partida, no un rectángulo de Canvas',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const style=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const sprites=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 assert.match(game,/img\.src=bakedAssetUrl\(this\.shopSection,item\.id\)/);
 assert.match(game,/img\.loading='eager'/);
 assert.match(game,/img\.onload=/);
 assert.match(game,/img\.onerror=/);
 assert.match(style,/\.shop-preview-art img/);
 assert.match(game,/item\.rarity/);
 assert.doesNotMatch(game,/makeCosmeticPreview/);
 assert.doesNotMatch(sprites,/composeSpecialPose|overlayOutfit/);
});

test('colores básicos no cuestan como acabados exclusivos',()=>{
 const plain=BALL_CATALOG.filter(x=>x.design==='baseball'&&x.id!=='dorada');
 assert.equal(plain.length,7);assert.ok(plain.every(x=>x.rarity==='COMÚN'&&x.price<=620));
 assert.equal(cosmeticItem('ball','dorada').price,2300);
 assert.equal(cosmeticItem('ball','dorada').rarity,'RARO');
 assert.equal(cosmeticItem('bat','ruby').price,cosmeticItem('bat','ocean').price);
 assert.equal(cosmeticItem('outfit','purple').price,cosmeticItem('outfit','green').price);
});
