import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {BatterSprites,BATTER_ASSETS,selectBatterPose,projectToScreen,weaponPlacement} from '../src/sprites.js';
import {pitcherBallPosition} from '../src/world.js';
import {bakedAssetUrl} from '../src/baked-assets.js';
import {initialSave} from '../src/logic.js';

test('las ocho poses aprobadas se seleccionan a lo largo de la acción',()=>{
 assert.equal(selectBatterPose({state:'ready'}),'ready');
 assert.equal(selectBatterPose({state:'pitching',pitch:.3}),'watch');
 assert.equal(selectBatterPose({state:'pitching',pitch:.88}),'loaded');
 assert.equal(selectBatterPose({state:'aiming',aimAngle:-.65}),'loaded');
 assert.equal(selectBatterPose({state:'aiming',aimAngle:0}),'loaded');
 assert.equal(selectBatterPose({state:'aiming',aimAngle:.65}),'loaded');
 assert.equal(selectBatterPose({state:'swinging',swingElapsed:.04}),'contact');
 assert.equal(selectBatterPose({state:'swinging',swingElapsed:.1}),'follow');
 assert.equal(selectBatterPose({state:'flight'}),null);
 assert.equal(selectBatterPose({state:'rest',ball:{z:120}}),null,'el bateador no sigue la pelota durante el resultado');
 assert.equal(selectBatterPose({state:'rest',ball:null}),'ready','tras un strike el bateador permanece visible');
});
test('todos los recortes originales son WebP locales y legibles',()=>{
 assert.equal(Object.keys(BATTER_ASSETS).length,8);
 for(const [key,path] of Object.entries(BATTER_ASSETS)){
  const name=new URL('../'+path.slice(2),import.meta.url);
  assert.ok(existsSync(name),'Falta el sprite '+key);
  const bytes=readFileSync(name);
  assert.ok(bytes.length>2500,'Imagen inválida '+key);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 for(const name of ['character-sheet','animation-poses','game-assets-sheet']){
  assert.ok(existsSync(new URL('../assets/reference/'+name+'.webp',import.meta.url)));
 }
});
test('el bateador completo y el punto de contacto caben en iPhone vertical',()=>{
 const cam=[-6.7,7.5,-20.5],target=[-.8,3.5,12];
 const width=707,height=1536;
 const foot=projectToScreen(cam,target,[-2.3,.1,-5],width,height);
 const crown=projectToScreen(cam,target,[-2.3,8.2,-5],width,height);
 const pitch=projectToScreen(cam,target,[-4.5,2.5,-4.7],width,height);
 assert.ok(foot&&crown&&pitch);
 assert.ok(foot.x>0&&foot.x<width);
 assert.ok(foot.y>height*.4&&foot.y<height*.94);
 assert.ok(crown.y<foot.y&&pitch.x>foot.x,'la bola debe estar delante del bateador y no a su espalda');
 assert.ok(pitch.y>0&&pitch.y<height);
});
test('la pelota se genera frente al bate y en el punto final del lanzamiento',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(game,/const b=\{x:-4\.5\+\(hit\.contactOffsetMm\|\|0\)\/1000,y:2\.5,z:-4\.7/);
 assert.ok(Math.abs(pitcherBallPosition(1).z+4.9)<1e-9);
 assert.equal(pitcherBallPosition(1).x,-4.5);
 assert.match(world,/const ball=pitcherBallPosition\(throwProgress\)/);
 assert.match(game,/this\.sprites\?\.draw\(this,zoom\)/);
 assert.match(world,/!!game\.spriteReady/);
 assert.match(world,/game\.sprites\?\.ballLoaded&&game\.sprites\?\.ctx/);
});
test('el canvas 2D es una capa visual no interactiva que se adapta a la pantalla',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const style=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(html,/id="character-overlay"/);
 assert.match(style,/#character-overlay\{[^}]*pointer-events:none/);
 assert.match(html,/assets\/baseball\.webp/);
 assert.doesNotMatch(html,/id="aim-pointer"/);
 assert.doesNotMatch(readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8'),/this\.images\['aim-center'\]/);
 assert.match(sw,/\.\/src\/sprites\.js/);
 assert.match(sw,/\.\/assets\/batter\/follow\.webp/);
 const sprites=new BatterSprites({getContext:()=>null});
 assert.equal(sprites.ready,false);
});

test('las armas completas se renderizan fuera del recorte del personaje, sin perder empuñadura',()=>{
 const sprites=new BatterSprites({getContext:()=>null});
 const original={naturalWidth:512,naturalHeight:720},dressed={naturalWidth:512,naturalHeight:720},
  batless={naturalWidth:512,naturalHeight:720},weapon={naturalWidth:320,naturalHeight:116};
 sprites.images.ready=original;
 sprites.bakedImages.set(bakedAssetUrl('outfit','red','ready'),dressed);
 sprites.bakedImages.set(bakedAssetUrl('outfit','red','ready',true),batless);
 sprites.bakedImages.set(bakedAssetUrl('bat','gold'),weapon);
 const save=initialSave();save.equipped='gold';
 assert.equal(sprites.getStyledPose('ready',save),batless,'se usa imagen sin bate para pintar cuerpo delante');
 const p=weaponPlacement('ready',100,300,270,380);
 assert.ok(p.scale>0);
 assert.ok(Number.isFinite(p.angle));
 const src=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 const poseSource=src.slice(src.indexOf(' getStyledPose('),src.indexOf(' getStyledBall('));
 assert.doesNotMatch(poseSource,/document\.createElement\('canvas'\)/,'nunca cortar el bate dentro del recorte');
 const render=src.slice(src.indexOf(' draw(game,zoom='),src.indexOf(' if(!game.save?.reducedEffects)game.impactFX',src.indexOf(' draw(game,zoom=')));
 const weaponAt=render.indexOf('ctx.drawImage(weapon,-18,-58)');
 const bodyAt=render.indexOf('ctx.drawImage(sprite,originX,originY,widthPx,heightPx)');
 assert.ok(weaponAt>=0&&bodyAt>weaponAt,'el arma completa va detrás de manos y cuerpo');
 assert.ok(render.includes('weaponPlacement(pose,originX,originY,widthPx,heightPx,selectedOutfit.id)'));
});

test('Athletic uses the supplied full poses and its own grip coordinates',()=>{
 const data=JSON.parse(readFileSync(new URL('../assets/approved/outfits/futbol_rojo/anchors.json',import.meta.url),'utf8'));
 for(const [pose,anchor] of Object.entries(data)){
  const p=weaponPlacement(pose,10,20,300,365,'futbol_rojo');
  assert.ok(Math.abs(p.x-(10+anchor.grip[0]*300))<1e-6);
  assert.ok(Math.abs(p.y-(20+anchor.grip[1]*365))<1e-6);
  const source=readFileSync(new URL('../assets/approved/outfits/futbol_rojo/'+pose+'-nobat.webp',import.meta.url));
  assert.equal(source.toString('ascii',8,12),'WEBP');
  const a=readFileSync(new URL('../assets/baked/outfits/futbol_rojo/'+pose+'.webp',import.meta.url));
  const b=readFileSync(new URL('../assets/baked/outfits/futbol_rojo/'+pose+'-nobat.webp',import.meta.url));
  assert.notDeepEqual(a,b);
 }
});
