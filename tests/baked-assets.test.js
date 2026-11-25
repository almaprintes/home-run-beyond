import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BAT_CATALOG,OUTFIT_CATALOG,BALL_CATALOG} from '../src/cosmetic-catalog.js';
import {BAKED_ASSET_COUNT,OUTFIT_POSES,bakedAssetUrl,ballRenderMode,equippedAssetPaths,WEAPON_POSES} from '../src/baked-assets.js';
import {BatterSprites} from '../src/sprites.js';
import {initialSave,calculateShot,coinRewardBreakdown,sanitizeSave,equipCosmetic} from '../src/logic.js';

const abs=path=>new URL('../'+path.slice(2),import.meta.url);
function assertWebP(uri){
 const file=abs(uri);
 assert.ok(existsSync(file),'Falta asset completo '+uri);
 assert.ok(statSync(file).size>200,'Asset vacío '+uri);
 const buffer=readFileSync(file);
 assert.equal(buffer.toString('ascii',0,4),'RIFF',uri);
 assert.equal(buffer.toString('ascii',8,12),'WEBP',uri);
 return createHash('sha256').update(buffer).digest('hex');
}
test('397 imágenes WebP completas publicables, sin generación al renderizar ni overlays',()=>{
 const manifest=JSON.parse(readFileSync(abs('./assets/baked/manifest.json'),'utf8'));
 assert.equal(BAKED_ASSET_COUNT,397);
 assert.equal(manifest.counts.total,397);
 assert.equal(manifest.counts.outfitFrames,330);
 assert.equal(manifest.counts.uniformAlphaValidated,330);
 assert.equal(manifest.counts.bats,35);
 assert.equal(manifest.counts.balls,32);
 assert.equal(manifest.counts.ballsValidated,32);
 assert.equal(manifest.verified,true);
 assert.deepEqual(manifest.poses,OUTFIT_POSES);
 assert.equal(OUTFIT_CATALOG.length,33);
 assert.equal(BAT_CATALOG.length,35);
 assert.equal(BALL_CATALOG.length,32);
 for(const item of OUTFIT_CATALOG){
  for(const pose of OUTFIT_POSES){
   assertWebP(bakedAssetUrl('outfit',item.id,pose));
   assertWebP(bakedAssetUrl('outfit',item.id,pose,true));
  }
 }
 for(const item of BAT_CATALOG)assertWebP(bakedAssetUrl('bat',item.id));
 for(const item of BALL_CATALOG){
  assertWebP(bakedAssetUrl('ball',item.id));
  assert.ok(['baseball','special'].includes(ballRenderMode(item)));
 }
});
test('cinco poses por uniforme y variantes reales de ropa distintas a los originales',()=>{
 for(const pose of OUTFIT_POSES){
  const classic=assertWebP(bakedAssetUrl('outfit','red',pose));
  const blue=assertWebP(bakedAssetUrl('outfit','blue',pose));
  const soccer=assertWebP(bakedAssetUrl('outfit','futbol_azulgrana',pose));
  const astronaut=assertWebP(bakedAssetUrl('outfit','astronauta',pose));
  assert.notEqual(classic,blue,'Azul copia el uniforme rojo en '+pose);
  assert.notEqual(blue,soccer,'Fútbol copia el azul en '+pose);
  assert.notEqual(soccer,astronaut,'Astronauta no lleva uniforme propio en '+pose);
  assert.notEqual(classic,assertWebP(bakedAssetUrl('outfit','red',pose,true)));
 }
 for(const [pose,{grip,tip}] of Object.entries(WEAPON_POSES)){
  assert.ok(OUTFIT_POSES.includes(pose));
  assert.ok(Math.hypot(grip[0]-tip[0],grip[1]-tip[1])>.2);
 }
});
test('bates especiales, mini Luna y mini Sol son imágenes únicas guardadas en archivos',()=>{
 const trout=assertWebP(bakedAssetUrl('bat','trucha'));
 const broom=assertWebP(bakedAssetUrl('bat','escoba'));
 const wire=assertWebP(bakedAssetUrl('bat','alambre'));
 assert.equal(new Set([trout,broom,wire]).size,3);
 const moon=assertWebP(bakedAssetUrl('ball','luna'));
 const sun=assertWebP(bakedAssetUrl('ball','sol'));
 const earth=assertWebP(bakedAssetUrl('ball','tierra'));
 const yellow=assertWebP(bakedAssetUrl('ball','sun'));
 assert.equal(new Set([moon,sun,earth,yellow]).size,4);
});
test('cada selección prepara las poses completas y su propio bate y pelota',()=>{
 const options=equippedAssetPaths('futbol_azulgrana','trucha','luna');
 assert.equal(options.length,12);
 assert.ok(options.includes(bakedAssetUrl('outfit','futbol_azulgrana','follow')));
 assert.ok(options.includes(bakedAssetUrl('outfit','futbol_azulgrana','follow',true)));
 assert.ok(options.includes(bakedAssetUrl('bat','trucha')));
 assert.ok(options.includes(bakedAssetUrl('ball','luna')));
 assert.deepEqual(equippedAssetPaths('red','classic','classic'),[...OUTFIT_POSES.map(pose=>bakedAssetUrl('outfit','red',pose)),bakedAssetUrl('ball','classic')]);
 assert.throws(()=>bakedAssetUrl('outfit','../../bad','ready'));
});
test('el sprite completo se elige por pose, sin volver a pintar el cuerpo encima',()=>{
 const sprite=new BatterSprites({getContext:()=>null});
 const original={naturalWidth:194,naturalHeight:347};
 sprite.images={ready:original,ball:original};
 const save=initialSave();
 save.equippedOutfit='blue';
 const dressed={naturalWidth:194,naturalHeight:347,id:'uniforme-azul-completo'};
 sprite.bakedImages.set(bakedAssetUrl('outfit','blue','ready'),dressed);
 assert.equal(sprite.getStyledPose('ready',save),dressed);
 assert.equal(sprite.getStyledPose('ready',save),dressed);
 const moon={naturalWidth:160,naturalHeight:160,id:'moon-webp'};
 save.equippedBall='luna';
 sprite.bakedImages.set(bakedAssetUrl('ball','luna'),moon);
 assert.equal(sprite.getStyledBall(save),moon);
});
test('compra antigua y habilidad intactas tras la migración visual',()=>{
 const save=sanitizeSave({version:3,coins:5000,levels:{power:49,swing:17,multiplier:9},
  ownedOutfits:['red','blue'],equippedOutfit:'blue',
  owned:['classic','gold'],equipped:'gold',
  ownedBalls:['classic','sun'],equippedBall:'sun'});
 assert.equal(save.equippedOutfit,'blue');
 assert.equal(save.equipped,'gold');
 assert.equal(save.equippedBall,'sun');
 const shot=calculateShot(save.levels,0);
 const earnings=coinRewardBreakdown(965,save.levels);
 const originalCoins=save.coins;
 assert.equal(equipCosmetic(save,'outfit','blue'),'equipped');
 assert.equal(save.coins,originalCoins);
 assert.deepEqual(calculateShot(save.levels,0),shot);
 assert.deepEqual(coinRewardBreakdown(965,save.levels),earnings);
});
test('el código de juego no usa las superposiciones rectangulares anteriores',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const sprite=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 const assets=readFileSync(new URL('../src/baked-assets.js',import.meta.url),'utf8');
 const wf=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 assert.doesNotMatch(game,/makeCosmeticPreview/);
 assert.doesNotMatch(sprite,/composeSpecialPose|overlayOutfit|makeCosmeticCanvas|paintWeapon/);
 assert.match(sprite,/getStyledPose\(pose,save\)/);
 assert.match(sprite,/bakedAssetUrl\('outfit',outfit\.id,pose/);
 assert.match(game,/img\.src=bakedAssetUrl\(this\.shopSection,item\.id\)/);
 assert.match(wf,/python tools\/build_cosmetics\.py/);
 assert.match(assets,/BAKED_ASSET_COUNT=397/);
});

test('0.55: las anclas siguen la mano y la punta del bate de las cinco poses originales',()=>{
 assert.ok(WEAPON_POSES.loaded.grip[0]<.2);assert.ok(WEAPON_POSES.loaded.tip[0]>.4);
 assert.ok(WEAPON_POSES.follow.grip[0]<.4);assert.ok(WEAPON_POSES.contact.tip[0]>.85);
 const generator=readFileSync(new URL('../tools/build_cosmetics.py',import.meta.url),'utf8');
 assert.match(generator,/BAT_FRAME_MASKS/);assert.doesNotMatch(generator,/wood_tone=/);
});

test('las 100 vistas previas son archivos únicos del catálogo, sin emoji sustituto',()=>{
 const entries=[...BAT_CATALOG.map(item=>['bat',item]),...OUTFIT_CATALOG.map(item=>['outfit',item]),...BALL_CATALOG.map(item=>['ball',item])];
 assert.equal(entries.length,100);
 const urls=entries.map(([category,item])=>bakedAssetUrl(category,item.id));
 assert.equal(new Set(urls).size,100);
 urls.forEach(assertWebP);
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(game,/img\.onload=\(\)=>\{img\.hidden=false;status\.hidden=true\}/);
 assert.doesNotMatch(game,/preview\.textContent=item\.emoji/);
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/previews\.length!==100/);
 const workflow=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 assert.match(workflow,/git add assets\/baked/);
});

test('Dorado campeón usa acabado de oro y tejido negro en las cinco poses',()=>{
 const gen=readFileSync(new URL('../tools/build_cosmetics.py',import.meta.url),'utf8');
 assert.match(gen,/champion_helmet/);assert.match(gen,/champion_cloth/);
 const gold=OUTFIT_CATALOG.find(i=>i.id==='gold');assert.equal(gold.price,2400);
 for(const pose of OUTFIT_POSES){const g=assertWebP(bakedAssetUrl('outfit','gold',pose));assert.notEqual(g,assertWebP(bakedAssetUrl('outfit','red',pose)));assert.notEqual(g,assertWebP(bakedAssetUrl('outfit','blue',pose)));assertWebP(bakedAssetUrl('outfit','gold',pose,true));}
});

test('el uniforme original también usa el fotograma reparado cuando está disponible',()=>{
 const sprites=new BatterSprites({getContext:()=>null});const original={naturalWidth:194,naturalHeight:347},repaired={...original,id:'repaired'};
 sprites.images.ready=original;sprites.bakedImages.set(bakedAssetUrl('outfit','red','ready'),repaired);
 assert.equal(sprites.getStyledPose('ready',initialSave()),repaired);
});


test('escoba and Canary banana use the exact approved full artwork',()=>{
 for(const id of ['escoba','platano']){
  const source=readFileSync(new URL('../assets/approved/bats/'+id+'.webp',import.meta.url));
  const baked=readFileSync(new URL('../assets/baked/bats/'+id+'.webp',import.meta.url));
  assert.equal(source.toString('ascii',8,12),'WEBP');
  assert.ok(source.length>9000);
  assert.deepEqual(baked,source);
  assert.match(bakedAssetUrl('bat',id),/v=0\.77\.5$/);
 }
 assert.equal(BAT_CATALOG.find(x=>x.id==='platano').name,'Plátano de Canarias');
 assert.equal(BAT_CATALOG.find(x=>x.id==='platano').price,3100);
 assert.equal(BAT_CATALOG.find(x=>x.id==='escoba').price,2600);
});


test('approved orange and snowball art survives the bake byte for byte',()=>{
 for(const [id,price] of [['naranja',4800],['nieve',5500]]){
  const approved=readFileSync(new URL('../assets/approved/balls/'+id+'.webp',import.meta.url));
  const baked=readFileSync(new URL('../assets/baked/balls/'+id+'.webp',import.meta.url));
  assert.equal(approved.toString('ascii',8,12),'WEBP');
  assert.deepEqual(baked,approved);
  assert.match(bakedAssetUrl('ball',id),/v=0\.77\.8$/);
  assert.equal(BALL_CATALOG.find(x=>x.id===id).price,price);
 }
});


test('approved thunder hammer artwork is preserved exactly',()=>{
 const approved=readFileSync(new URL('../assets/approved/bats/martillo.webp',import.meta.url));
 const baked=readFileSync(new URL('../assets/baked/bats/martillo.webp',import.meta.url));
 assert.equal(approved.toString('ascii',8,12),'WEBP');
 assert.deepEqual(baked,approved);
 assert.match(bakedAssetUrl('bat','martillo'),/v=0\.77\.10$/);
 assert.equal(BAT_CATALOG.find(x=>x.id==='martillo').price,6500);
});
