import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {BatterSprites,BATTER_ASSETS,selectBatterPose,projectToScreen} from '../src/sprites.js';

test('las ocho poses aprobadas se seleccionan a lo largo de la acción',()=>{
 assert.equal(selectBatterPose({state:'ready'}),'ready');
 assert.equal(selectBatterPose({state:'pitching',pitch:.3}),'watch');
 assert.equal(selectBatterPose({state:'pitching',pitch:.88}),'loaded');
 assert.equal(selectBatterPose({state:'aiming',aimAngle:-.65}),'aim-left');
 assert.equal(selectBatterPose({state:'aiming',aimAngle:0}),'aim-center');
 assert.equal(selectBatterPose({state:'aiming',aimAngle:.65}),'aim-right');
 assert.equal(selectBatterPose({state:'swinging',swingElapsed:.04}),'contact');
 assert.equal(selectBatterPose({state:'swinging',swingElapsed:.1}),'follow');
 assert.equal(selectBatterPose({state:'flight'}),null);
 assert.equal(selectBatterPose({state:'rest'}),null);
});
test('todos los recortes originales son WebP locales y legibles',()=>{
 assert.equal(Object.keys(BATTER_ASSETS).length,11);
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
 const pitch=projectToScreen(cam,target,[0,2.5,-4.7],width,height);
 assert.ok(foot&&crown&&pitch);
 assert.ok(foot.x>0&&foot.x<width);
 assert.ok(foot.y>height*.4&&foot.y<height*.94);
 assert.ok(crown.y<foot.y&&pitch.x>foot.x);
 assert.ok(pitch.y>0&&pitch.y<height);
});
test('la pelota se genera frente al bate y en el punto final del lanzamiento',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(game,/const b=\{x:0,y:2\.5,z:-4\.7/);
 assert.match(world,/z=20\.5-25\.4\*t/);
 assert.match(game,/this\.sprites\?\.draw\(this,zoom\)/);
 assert.match(world,/!!game\.spriteReady/);
 assert.match(world,/!game\.sprites\?\.ballLoaded/);
});
test('el canvas 2D es una capa visual no interactiva que se adapta a la pantalla',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const style=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(html,/id="character-overlay"/);
 assert.match(style,/#character-overlay\{[^}]*pointer-events:none/);
 assert.match(html,/assets\/baseball\.webp/);
 assert.match(html,/id="aim-pointer"[^>]*assets\/aim-center\.webp/);
 assert.match(sw,/\.\/src\/sprites\.js/);
 assert.match(sw,/\.\/assets\/batter\/follow\.webp/);
 const sprites=new BatterSprites({getContext:()=>null});
 assert.equal(sprites.ready,false);
});
