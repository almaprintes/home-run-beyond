import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BALL_CATALOG} from '../src/cosmetic-catalog.js';
import {BAKED_ASSET_COUNT,BASEBALL_SKIN_IDS,ballRenderMode,bakedAssetUrl,bakedBallTextureUrl,equippedAssetPaths} from '../src/baked-assets.js';
import {BatterSprites} from '../src/sprites.js';

test('ocho pelotas de béisbol usan costuras propias y UV opacas; las otras 24 no heredan las costuras',()=>{
 const baseball=BALL_CATALOG.filter(item=>ballRenderMode(item)==='baseball');
 const themed=BALL_CATALOG.filter(item=>ballRenderMode(item)==='special');
 assert.equal(baseball.length,8);
 assert.equal(themed.length,24);
 assert.equal(BASEBALL_SKIN_IDS.size,8);
 assert.deepEqual(new Set(baseball.map(i=>i.id)),BASEBALL_SKIN_IDS);
 assert.equal(BAKED_ASSET_COUNT,405);
 for(const item of baseball){
  assert.match(bakedAssetUrl('ball',item.id),/\.webp$/);
  assert.match(bakedBallTextureUrl(item.id),/ball-textures\/.+\.webp$/);
  assert.ok(equippedAssetPaths('red','classic',item.id).includes(bakedBallTextureUrl(item.id)));
 }
 for(const item of themed){
  assert.equal(ballRenderMode(item),'special');
  assert.throws(()=>bakedBallTextureUrl(item.id));
  assert.ok(!equippedAssetPaths('red','classic',item.id).some(p=>p.includes('ball-textures/')));
 }
});
test('pelota amarilla no es Mini Sol y las dos conservan sus identificadores de compra',()=>{
 const yellow=BALL_CATALOG.find(i=>i.id==='sun');
 const solar=BALL_CATALOG.find(i=>i.id==='sol');
 assert.equal(yellow.design,'baseball');
 assert.equal(yellow.name,'Pelota amarilla');
 assert.equal(solar.design,'sun');
 assert.equal(solar.name,'Mini Sol');
 assert.equal(ballRenderMode(yellow),'baseball');
 assert.equal(ballRenderMode(solar),'special');
});
test('separamos la imagen de tienda del UV de rodadura y nunca mapeamos transparencias en 3D',()=>{
 const sprite=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 const generator=readFileSync(new URL('../tools/build_cosmetics.py',import.meta.url),'utf8');
 const art=readFileSync(new URL('../tools/ball_art.py',import.meta.url),'utf8');
 assert.match(sprite,/const uv=this\.bakedImages\.get\(bakedBallTextureUrl\(item\.id\)\)/);
 assert.match(sprite,/if\(ballRenderMode\(item\)==='baseball'&&spin\?\.orientation/);
 assert.match(sprite,/drawSpinningBaseball\(ctx,uv,size,spin,camera,target,this\.ballSurfaceCache\)/);
 assert.match(sprite,/ctx\.drawImage\(image,-size\*\.5,-size\*\.5,size,size\)/);
 assert.match(generator,/verify_ball\(path,item\["design"\]\)/);
 assert.match(generator,/verify_uv\(uv_path\)/);
 assert.match(art,/body\.putalpha\(mask\)/);
 assert.match(art,/body\.alpha_composite\(details\)/);
 assert.match(art,/ImageChops\.multiply/);
 assert.match(art,/def draw_seams\(/);
});
test('las pelotas especiales se dibujan completas desde el pitcher y durante el vuelo',()=>{
 const sprite=new BatterSprites({getContext(){return null}});
 const image={width:160,height:160};
 sprite.getStyledBall=()=>image;
 let painted=[],rotations=[];
 const ctx={rotate(value){rotations.push(value)},drawImage(...args){painted.push(args)}};
 for(const id of ['luna','tenis','golf','playa','sandia','naranja','saturno','donut','dado']){
  const game={save:{equippedBall:id}};
  sprite.drawEquippedBall(ctx,game,32,null,[0,0,0],[0,0,1]);
  sprite.drawEquippedBall(ctx,game,32,{angle:1.1,orientation:[0,0,0,1]},[0,0,0],[0,0,1]);
  assert.equal(painted.at(-1)[0],image,id);
  assert.equal(painted.at(-1)[3],32,id);
 }
 assert.equal(painted.length,18);
 assert.equal(rotations.length,18);
});
