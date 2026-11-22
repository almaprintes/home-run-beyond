import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BatterSprites,BATTER_ASSETS} from '../src/sprites.js';

test('la versión 0.13 evita cachear CSS y JavaScript viejos bajo la misma URL',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(html,/style\.css\?v=0\.23\.0/);
 assert.match(html,/src\/main\.js\?v=0\.23\.0/);
 assert.match(main,/game\.js\?v=0\.23\.0/);
 for(const src of ['game.js','world.js','sprites.js','impact-fx.js']){
  const code=readFileSync(new URL('../src/'+src,import.meta.url),'utf8');
  for(const [,path] of code.matchAll(/from '(\.\/[^']+\.js(?:\?[^']+)?)'/g)){
   assert.ok(path.endsWith('?v=0.23.0'),src+' importa módulo sin versión: '+path);
  }
 }
 assert.match(sw,/hrb-v23-20261122-single-aim-arrow/);
 assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
 assert.doesNotMatch(sw,/caches\.match\(e\.request\)\.then\(c=>c\|\|fetch/);
 assert.match(sw,/caches\.match\(request\)/);
 assert.match(sw,/clients\.claim/);
});

test('icono y lienzo mantienen tamaño aunque se sirva CSS antiguo',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/class="brand-baseball"[^>]+width="34" height="34"[^>]+max-width:34px/);
 assert.match(html,/id="character-overlay"[^>]+position:absolute;inset:0;width:100%;height:100%/);
 assert.match(html,/Versión 0\.23/);
});

test('se cargan realmente los sprites aprobados y se dibuja el personaje seleccionado',async()=>{
 const previousImage=globalThis.Image, previousWindow=globalThis.window;
 const calls=[];
 const ctx={
  setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},ellipse(){},fill(){},
  translate(){},rotate(){},drawImage(...args){calls.push(args)},
  imageSmoothingEnabled:true,imageSmoothingQuality:'high'
 };
 const canvas={clientWidth:430,clientHeight:930,width:0,height:0,getContext:()=>ctx};
 class FakeImage{
  constructor(){this.naturalWidth=194;this.naturalHeight=347}
  set src(s){this._src=s;this.onload?.()}
  get src(){return this._src}
 }
 globalThis.Image=FakeImage;globalThis.window={devicePixelRatio:1,innerWidth:430,innerHeight:930};
 try{
  const sprites=new BatterSprites(canvas);
  assert.equal(await sprites.load(),true);
  assert.equal(sprites.ready,true);
  assert.equal(sprites.ballLoaded,true);
  const game={state:'pitching',pitch:.40,camera:[-6.7,7.5,-20.5],target:[-.8,3.5,12],ball:null,clock:0};
  sprites.draw(game,62);
  assert.ok(calls.length>0,'no se dibujó el bateador');
  assert.ok(calls.some(([img])=>img.src===BATTER_ASSETS.watch),'no se dibuja la pose del bateador aprobada');
  assert.ok(canvas.width===430&&canvas.height===930);
  calls.length=0;
  game.state='aiming';game.aimAngle=.55;
  sprites.draw(game,62);
  assert.ok(calls.some(([img])=>img.src===BATTER_ASSETS.loaded),'el bateador sigue visible');
  assert.ok(calls.some(([img])=>img.src===BATTER_ASSETS['aim-center']),'la única flecha grande se dibuja por separado');
 }finally{
  if(previousImage===undefined)delete globalThis.Image;else globalThis.Image=previousImage;
  if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
 }
});
