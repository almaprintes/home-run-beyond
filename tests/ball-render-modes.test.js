import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {BALL_CATALOG} from '../src/cosmetic-catalog.js';
import {BAKED_ASSET_COUNT,OUTFIT_POSES,BASEBALL_SKIN_IDS,ballRenderMode,bakedAssetUrl,equippedAssetPaths} from '../src/baked-assets.js';
import {BatterSprites,shadeRollingSurface,shadeBeachSphere,shadeOrangeSphere,shadeRainbowSphere,shadeBilliardSphere} from '../src/sprites.js';

test('ocho pelotas con las costuras originales, 24 especiales sin costuras ajenas',()=>{
 const baseball=BALL_CATALOG.filter(item=>ballRenderMode(item)==='baseball');
 const themed=BALL_CATALOG.filter(item=>ballRenderMode(item)==='special');
 assert.equal(baseball.length,8);assert.equal(themed.length,24);
 assert.deepEqual(new Set(baseball.map(i=>i.id)),BASEBALL_SKIN_IDS);
 assert.equal(BAKED_ASSET_COUNT,398);
 for(const item of BALL_CATALOG){
  const paths=equippedAssetPaths('red','classic',item.id);
  assert.deepEqual(paths,[...OUTFIT_POSES.map(pose=>bakedAssetUrl('outfit','red',pose)),bakedAssetUrl('ball',item.id)]);
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
 assert.ok(path.includes('tenis.webp?v=0.77.3'),'la versión debe invalidar el asset antiguo del iPhone');
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
 assert.equal(rotations.length,14,'las pelotas tipo béisbol no deben girar planas mientras vuelan');
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

test('pelota negra sin halo blanco: precio 720 y validación de silueta y costuras',()=>{
 assert.equal(BALL_CATALOG.find(x=>x.id==='negra').price,720);
 const py=readFileSync(new URL('../tools/ball_art.py',import.meta.url),'utf8');
 assert.match(py,/return black_baseball\(original, color\)/);assert.match(py,/white fringe on black baseball/);
});

test('beach ball uses smooth world-axis spherical roll and keeps its original art',()=>{
 const sprites=new BatterSprites({getContext(){return null}});
 const image={width:160,height:160};sprites.getStyledBall=()=>image;
 let flat=0,drawn=0;
 const ctx={rotate(){flat++},drawImage(img){assert.equal(img,image);drawn++}};
 const game={save:{equippedBall:'playa'}};
 sprites.drawEquippedBall(ctx,game,32,{angle:4,orientation:[0,0,0,1]},[0,5,-20],[0,2,20]);
 assert.equal(flat,0);assert.equal(drawn,1);assert.equal(sprites.ballSurfaceCache.mode,'beach');
 const n=32,src=new Uint8ClampedArray(n*n*4),out=new Uint8ClampedArray(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4;src[i]=x*8;src[i+1]=y*8;src[i+3]=255}
 const paint=spin=>{shadeRollingSurface(src,n,n,spin,[0,5,-20],[0,2,20],out,n,false,.47,true);return out.slice()};
 const spin={angle:0,orientation:[0,0,0,1],visualOrientation:[0,0,0,1]};
 const first=paint(spin);spin.angle=3;assert.deepEqual(paint(spin),first);
 spin.visualOrientation=[Math.sin(.4),0,0,Math.cos(.4)];
 assert.notDeepEqual(paint(spin),first);
});

test('beach sphere stays circular through a complete camera orbit, with stationary light',()=>{
 const n=96,spin={orientation:[0,0,0,1],visualOrientation:[.2,0,0,Math.sqrt(.96)]};
 const frame=new Uint8ClampedArray(n*n*4),alpha=f=>Array.from(f.filter((_,i)=>i%4===3));
 let silhouette=null,first=null;
 for(let i=0;i<=24;i++){
  const angle=i*Math.PI/12;
  shadeBeachSphere(spin,[40*Math.sin(angle),24,40*Math.cos(angle)],[0,0,0],frame,n);
  if(!silhouette){silhouette=alpha(frame);first=frame.slice()}
  else assert.deepEqual(alpha(frame),silhouette);
  assert.equal(frame[(48*n+48)*4+3],255);
  assert.equal(frame[3],0);
  for(let j=0;j<n;j++)assert.equal(frame[(48*n+j)*4+3],frame[(j*n+48)*4+3]);
  if(i===6)assert.notDeepEqual(frame,first);
 }
 assert.deepEqual(frame,first);
 const before=frame.slice();
 spin.visualOrientation=[0,0,0,1];shadeBeachSphere(spin,[0,24,40],[0,0,0],frame,n);
 assert.deepEqual(alpha(frame),silhouette);assert.notDeepEqual(frame,before);
});

test('orange uses a continuous rigid sphere with a rotating calyx, not a flat sprite',()=>{
 const sprites=new BatterSprites({getContext(){return null}}),image={width:160,height:160};
 sprites.getStyledBall=()=>image;let rotations=0,draws=0;
 const ctx={rotate(){rotations++},drawImage(img){assert.equal(img,image);draws++}};
 const game={save:{equippedBall:'naranja'}};
 for(const spin of [null,{orientation:[0,0,0,1],angle:2}])sprites.drawEquippedBall(ctx,game,32,spin,[0,5,-20],[0,0,0]);
 assert.equal(rotations,0);assert.equal(draws,2);assert.equal(sprites.ballSurfaceCache.mode,'orange');
 const n=96,out=new Uint8ClampedArray(n*n*4);
 const spin={orientation:[0,0,0,1]};
 const paint=(s,cam)=>shadeOrangeSphere(s,cam,[0,0,0],out,n).slice();
 const first=paint(spin,[0,24,40]),turned=paint({...spin,visualOrientation:[Math.sin(.8),0,0,Math.cos(.8)]},[0,24,40]);
 assert.notDeepEqual(first,turned);
 const alpha=f=>Array.from(f.filter((_,i)=>i%4===3));
 assert.deepEqual(alpha(first),alpha(turned));
 for(let i=0;i<=8;i++){
  const a=i*Math.PI/4,frame=paint(spin,[40*Math.sin(a),24,40*Math.cos(a)]);
  assert.deepEqual(alpha(frame),alpha(first));
 }
 assert.deepEqual(paint({...spin,angle:7},[0,24,40]),first);
 const top=paint(spin,[0,40,.1]),mid=(48*n+48)*4;
 assert.ok(top[mid]>top[mid+1],'brown central stem');
 const calyx=(48*n+55)*4;assert.ok(top[calyx+1]>top[calyx],'green calyx around the stem');
});

test('rainbow sphere uses object-space bands and never rotates the flat billboard',()=>{
 const sprites=new BatterSprites({getContext(){return null}}),image={width:160,height:160};
 sprites.getStyledBall=()=>image;let flat=0,draws=0;
 const ctx={rotate(){flat++},drawImage(img){assert.equal(img,image);draws++}};
 const game={save:{equippedBall:'arcoiris'}};
 for(const spin of [null,{orientation:[0,0,0,1],angle:3}])sprites.drawEquippedBall(ctx,game,32,spin,[0,5,-20],[0,0,0]);
 assert.equal(flat,0);assert.equal(draws,2);assert.equal(sprites.ballSurfaceCache.mode,'rainbow');
 const n=96,out=new Uint8ClampedArray(n*n*4),spin={orientation:[0,0,0,1]};
 const paint=(s,c)=>shadeRainbowSphere(s,c,[0,0,0],out,n).slice();
 const cam=[0,24,40],first=paint(spin,cam),alpha=f=>Array.from(f.filter((_,i)=>i%4===3));
 const rotated=paint({...spin,visualOrientation:[Math.sin(.6),0,0,Math.cos(.6)]},cam);
 assert.notDeepEqual(rotated,first);assert.deepEqual(alpha(rotated),alpha(first));
 assert.deepEqual(paint({...spin,angle:5},cam),first);
 for(let i=0;i<=24;i++){
  const a=i*Math.PI/12,frame=paint(spin,[40*Math.sin(a),24,40*Math.cos(a)]);
  assert.deepEqual(alpha(frame),alpha(first));assert.equal(frame[(48*n+48)*4+3],255);
  if(i===6)assert.notDeepEqual(frame,first);
 }
 assert.deepEqual(paint(spin,cam),first);
});

test('billiard 8 has a spherical resin finish, rotating number and stable silhouette',()=>{
 const sprites=new BatterSprites({getContext(){return null}}),image={width:160,height:160};sprites.getStyledBall=()=>image;
 let rotations=0;const ctx={rotate(){rotations++},drawImage(i){assert.equal(i,image)}};
 sprites.drawEquippedBall(ctx,{save:{equippedBall:'billar8'}},32,{orientation:[0,0,0,1],angle:4},[0,0,20],[0,0,0]);
 assert.equal(rotations,0);assert.equal(sprites.ballSurfaceCache.mode,'billiard');
 const n=96,out=new Uint8ClampedArray(n*n*4),cam=[0,0,20],target=[0,0,0];
 const paint=spin=>shadeBilliardSphere(spin,cam,target,out,n).slice();
 const first=paint({orientation:[0,0,0,1]});
 const side=paint({orientation:[0,Math.SQRT1_2,0,Math.SQRT1_2]});
 assert.notDeepEqual(first,side);
 assert.deepEqual(first.filter((_,i)=>i%4===3),side.filter((_,i)=>i%4===3));
 assert.deepEqual(paint({orientation:[0,0,0,1],angle:7}),first);
 assert.equal(first[(48*n+48)*4+3],255);assert.equal(first[3],0);
 assert.ok(first[(42*n+48)*4]>140);assert.ok(first[(48*n+48)*4]<70);
 assert.ok(bakedAssetUrl('ball','billar8').endsWith('v=0.77.72'));
});
