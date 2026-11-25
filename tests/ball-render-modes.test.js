import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {BALL_CATALOG} from '../src/cosmetic-catalog.js';
import {BAKED_ASSET_COUNT,BASEBALL_SKIN_IDS,ballRenderMode,bakedAssetUrl,equippedAssetPaths} from '../src/baked-assets.js';
import {BatterSprites} from '../src/sprites.js';

test('ocho pelotas con las costuras originales, 24 especiales sin costuras ajenas',()=>{
 const baseball=BALL_CATALOG.filter(item=>ballRenderMode(item)==='baseball');
 const themed=BALL_CATALOG.filter(item=>ballRenderMode(item)==='special');
 assert.equal(baseball.length,8);assert.equal(themed.length,24);
 assert.deepEqual(new Set(baseball.map(i=>i.id)),BASEBALL_SKIN_IDS);
 assert.equal(BAKED_ASSET_COUNT,397);
 for(const item of BALL_CATALOG){
  const paths=equippedAssetPaths('red','classic',item.id);
  assert.deepEqual(paths,[bakedAssetUrl('ball',item.id)]);
  assert.ok(!paths.some(path=>path.includes('ball-textures/')));
 }
});
test('tenis es feltro con dos surcos claros dibujados en la mitad frontal de la esfera',()=>{
 const ball=BALL_CATALOG.find(x=>x.id==='tenis');
 assert.equal(ball.design,'tennis');
 assert.equal(ballRenderMode(ball),'special');
 const ballCode=readFileSync(new URL('../tools/ball_art.py',import.meta.url),'utf8');
 const pattern=ballCode.slice(ballCode.indexOf('elif mode=="tennis":'),ballCode.indexOf('elif mode=="beach":'));
 assert.match(pattern,/bezier\(/,'los surcos deben ser curvas, no recolor plano');
 assert.match(pattern,/for seam in \(left,right\)/,'ambos surcos se dibujan sobre la bola');
 assert.match(pattern,/251,252,235,255/,'el canal claro debe contrastar con el fieltro');
 assert.match(ballCode,/tennis felt grooves missing or too faint/,'el arte horneado se comprueba píxel a píxel en CI');
 const path=bakedAssetUrl('ball','tenis');
 assert.ok(path.includes('tenis.webp?v=0.65.0'),'la versión debe invalidar el asset antiguo del iPhone');
});
test('pelota amarilla no es Mini Sol y ambos artículos permanecen disponibles',()=>{
 const yellow=BALL_CATALOG.find(i=>i.id==='sun');
 const solar=BALL_CATALOG.find(i=>i.id==='sol');
 assert.equal(yellow.design,'baseball');
 assert.equal(yellow.name,'Pelota amarilla');
 assert.equal(solar.design,'sun');
 assert.equal(solar.name,'Mini Sol');
});
test('el creador usa la pelota original sin sustituir sus costuras tridimensionales',()=>{
 const ballArt=readFileSync(new URL('../tools/ball_art.py',import.meta.url),'utf8');
 const sprite=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 assert.match(ballArt,/APPROVED_BASEBALL = Path\(__file__\).*"baseball\.webp"/);
 assert.match(ballArt,/if item\["id"\] == "classic":\s*return original/);
 assert.match(ballArt,/if red_thread:\s*continue/);
 assert.doesNotMatch(ballArt,/def draw_seams/);
 const draw=sprite.slice(sprite.indexOf(' drawEquippedBall('),sprite.indexOf(' resize(){'));
 assert.match(draw,/ctx\.drawImage\(image,-size\*\.5,-size\*\.5,size,size\)/);
 assert.match(draw,/drawSpinningBaseball/,'el giro terrestre es una esfera, no una moneda');
 assert.doesNotMatch(draw,/bakedBallTextureUrl/,'nunca volver a la UV procedural sin costuras originales');
 const original=new URL('../assets/baseball.webp',import.meta.url);
 assert.ok(existsSync(original));
 assert.ok(statSync(original).size>1000);
});
test('misma imagen equipada sale del pitcher y llega al bate',()=>{
 const sprite=new BatterSprites({getContext(){return null}});
 const image={width:160,height:160};
 sprite.getStyledBall=()=>image;
 const painted=[],rotations=[];
 const ctx={rotate(v){rotations.push(v)},drawImage(...args){painted.push(args)}};
 for(const id of ['classic','sun','negra','dorada','luna','tenis','golf','playa','sandia','naranja','saturno','donut','dado']){
  const game={save:{equippedBall:id}};
  sprite.drawEquippedBall(ctx,game,32,null,[0,0,0],[0,0,1]);
  sprite.drawEquippedBall(ctx,game,32,{angle:1.1,orientation:[0,0,0,1]},[0,0,0],[0,0,1]);
  assert.equal(painted.at(-1)[0],image,id);
  assert.equal(painted.at(-1)[3],32,id);
 }
 assert.equal(painted.length,26);
 assert.equal(rotations.length,18,'las pelotas tipo béisbol no deben girar planas mientras vuelan');
});

test('dorada es oro pulido con costuras metálicas, no otra pelota amarilla',()=>{
 const gold=BALL_CATALOG.find(i=>i.id==='dorada'),yellow=BALL_CATALOG.find(i=>i.id==='sun');
 assert.equal(gold.design,'baseball');assert.equal(gold.price,2300);assert.equal(yellow.price,620);
 const a=readFileSync(new URL('../assets/baked/balls/dorada.webp',import.meta.url));
 const b=readFileSync(new URL('../assets/baked/balls/sun.webp',import.meta.url));
 assert.notDeepEqual(a,b);
 const py=readFileSync(new URL('../tools/ball_art.py',import.meta.url),'utf8');
 assert.match(py,/return polished_gold_baseball\(original\)/);
 assert.match(py,/gold ball must contain bright reflections and dark metallic contrast/);
});
