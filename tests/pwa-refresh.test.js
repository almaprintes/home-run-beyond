import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BatterSprites,BATTER_ASSETS} from '../src/sprites.js';

test('v0.50 evita mezclar versiones de CSS, JS, WebAudio y PWA en caché',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(html,/style\.css\?v=0\.77\.0/);
 assert.match(html,/src\/main\.js\?v=0\.77\.8/);
 assert.match(main,/game\.js\?v=0\.77\.8/);
 for(const src of ['main.js','logic.js','engine.js','game.js','world.js','sprites.js','traffic.js','discoveries.js','cosmetic-render.js','cosmetic-catalog.js','cosmetic-art.js','baked-assets.js','impact-fx.js']){
  const code=readFileSync(new URL('../src/'+src,import.meta.url),'utf8');
  for(const [,path] of code.matchAll(/from '(\.\/[^']+\.js(?:\?[^']+)?)'/g)){
   assert.ok(path.endsWith('?v=0.77.8'),src+' importa módulo sin versión: '+path);
  }
 }
 assert.match(sw,/hrb-v77-20261125-baguette-art/);
 assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
 assert.match(sw,/caches\.match\(request\)/);
 assert.match(sw,/clients\.claim/);
 assert.match(sw,/\.\/assets\/strike\.mp3/);
 assert.match(sw,/\.\/src\/biomes\.js\?v=0\.77\.8/);
 assert.match(sw,/\.\/src\/cosmetic-render\.js\?v=0\.77\.8/);
 assert.match(sw,/\.\/src\/cosmetic-catalog\.js\?v=0\.77\.8/);
 assert.match(sw,/\.\/src\/cosmetic-art\.js\?v=0\.77\.8/);
 assert.match(sw,/\.\/src\/baked-assets\.js\?v=0\.77\.8/);
 assert.match(sw,/\.\/assets\/baked\/manifest\.json/);
 assert.match(sw,/\.\/src\/traffic\.js\?v=0\.77\.8/);
 assert.match(sw,/\.\/src\/discoveries\.js\?v=0\.77\.8/);
 assert.doesNotMatch(sw,/assets\/traffic\//);
});

test('la interfaz muestra nuevo multiplicador, barra de dirección y desglose de premios',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/Versión 0\.77/);
 assert.match(html,/id="aim-ball"/);
 assert.match(html,/id="aim-sweet-zone"/);
 assert.match(html,/id="up-multiplier"/);
 assert.match(html,/id="main-menu"/);
 assert.match(html,/id="menu-play"/);
 assert.match(html,/id="settings"/);
 assert.match(html,/id="shop-tab-ball"/);
 assert.match(html,/id="coin-breakdown"/);
 assert.match(html,/id="multiplier-current"/);
 assert.match(html,/id="multiplier-next"/);
 assert.match(html,/MEJORA EXTRA CADA 5 COMPRAS/);
 assert.doesNotMatch(html,/id="up-reflex"/);
 assert.match(html,/class="brand-baseball"[^>]+width="34" height="34"[^>]+max-width:34px/);
 assert.match(html,/id="character-overlay"[^>]+position:absolute;inset:0;width:100%;height:100%/);
});

test('sprites aprobados persisten durante apuntado, sin dibujar la flecha antigua',async()=>{
 const previousImage=globalThis.Image,previousWindow=globalThis.window;
 const calls=[];
 const ctx={setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},ellipse(){},fill(){},
  translate(){},rotate(){},drawImage(...args){calls.push(args)},imageSmoothingEnabled:true,imageSmoothingQuality:'high'};
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
  assert.equal(sprites.ballLoaded,true);
  const game={state:'pitching',pitch:.40,camera:[-6.7,7.5,-20.5],target:[-.8,3.5,12],ball:null,clock:0};
  sprites.draw(game,62);
  assert.ok(calls.some(([img])=>img.src===BATTER_ASSETS.watch));
  calls.length=0;game.state='aiming';
  sprites.draw(game,62);
  assert.ok(calls.some(([img])=>img.src===BATTER_ASSETS.loaded));
  assert.ok(!Object.keys(BATTER_ASSETS).some(key=>key.startsWith('aim-')));
  assert.ok(canvas.width===430&&canvas.height===930);
 }finally{
  if(previousImage===undefined)delete globalThis.Image;else globalThis.Image=previousImage;
  if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
 }
});

 test('Baskonia name is identical in the versioned catalog and discovery',async()=>{
 const {OUTFIT_CATALOG}=await import('../src/cosmetic-catalog.js?v=0.77.8');
 const item=OUTFIT_CATALOG.find(x=>x.id==='basket_rojo');
 assert.equal(item.name,'Baloncesto Baskonia');
 assert.equal(item.price,3800);
 });
