import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pitcherBallPosition,drawActors} from '../src/world.js';
import {BatterSprites} from '../src/sprites.js';
import {pitchBallSpin} from '../src/ball-spin.js';
import {initialSave} from '../src/logic.js';

test('pelota del pitcher comparte posición 3D entre el mundo y el overlay equipado',()=>{
 assert.equal(pitcherBallPosition(0),null);
 assert.equal(pitcherBallPosition(1.26),null);
 const mid=pitcherBallPosition(.5);
 assert.equal(mid.x,-2.25);
 assert.ok(mid.y>2.5);
 assert.ok(Math.abs(mid.z-7.8)<1e-9);
 assert.deepEqual(pitcherBallPosition(.5),pitcherBallPosition(.5));
 const calls=[],r={ball(...args){calls.push(args)},add(){},pole(){},box(){}};
 drawActors(r,.5,0,'#ffeeaa',true,false,'#42aaee');
 assert.ok(calls.some(([x,y,z,size,color])=>
  Math.abs(x-mid.x)<1e-8&&Math.abs(y-mid.y)<1e-8&&Math.abs(z-mid.z)<1e-8&&color==='#42aaee'));
 calls.length=0;
 drawActors(r,.5,0,'#ffeeaa',true,true,'#42aaee');
 assert.ok(!calls.some(([x,y,z])=>
  Math.abs(x-mid.x)<1e-8&&Math.abs(y-mid.y)<1e-8&&Math.abs(z-mid.z)<1e-8),
 'el 3D no debe duplicar una bola blanca por debajo de la pelota equipada');
});

test('Mini Luna equipada se ve ya durante el lanzamiento, antes del golpe',()=>{
 const previous=globalThis.window;
 const drawn=[];
 const ctx={
  setTransform(){},clearRect(){},save(){},restore(){},
  translate(){},rotate(){},
  drawImage(...args){drawn.push(args)}
 };
 globalThis.window={devicePixelRatio:1,innerWidth:430,innerHeight:930};
 try{
  const canvas={clientWidth:430,clientHeight:930,getContext(){return ctx}};
  const sprites=new BatterSprites(canvas);
  sprites.ballLoaded=true;
  sprites.ready=false;
  const styled={width:128,height:128};
  sprites.getStyledBall=()=>styled;
  const save=initialSave();save.equippedBall='luna';
  const game={
   state:'pitching',pitchElapsed:.65,pitchDuration:1.52,
   camera:[-6.7,7.5,-20.5],target:[-.8,3.5,12],save,
   ball:null
  };
  sprites.draw(game,62);
  assert.ok(drawn.some(call=>call[0]===styled),'la pelota de Luna no aparece en el lanzamiento');
  const duringPitch=drawn.find(call=>call[0]===styled);
  assert.equal(duringPitch.length,5);
  drawn.length=0;game.state='aiming';
  sprites.draw(game,62);
  assert.ok(drawn.some(call=>call[0]===styled),'cambió de pelota al apuntar');
  drawn.length=0;game.state='swinging';
  sprites.draw(game,62);
  assert.ok(drawn.some(call=>call[0]===styled),'cambió de pelota antes de golpear');
  drawn.length=0;game.state='whiff';game.pitchElapsed=1.72;
  sprites.draw(game,62);
  assert.ok(drawn.some(call=>call[0]===styled),'la pelota no continúa detrás del bateador');
 }finally{
  if(previous===undefined)delete globalThis.window;else globalThis.window=previous;
 }
});

test('la misma función de dibujo sirve para lanzamiento y batazo',()=>{
 const sprites=new BatterSprites({getContext(){return null}});
 const ctx={rotate(){},drawImage(...args){this.last=args}};
 sprites.getStyledBall=()=>({width:128,height:128});
 const game={save:{equippedBall:'sol'}};
 sprites.drawEquippedBall(ctx,game,28,null,[0,0,0],[0,0,1]);
 assert.equal(ctx.last[3],28);
 sprites.drawEquippedBall(ctx,game,28,{angle:.4},[0,0,0],[0,0,1]);
 assert.equal(ctx.last[3],28);
 const src=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 assert.match(src,/this\.drawEquippedBall\(ctx,game,size,pitchBallSpin\(game\.pitchElapsed\),camera,target\)/);
 assert.match(src,/this\.drawEquippedBall\(ctx,game,departureSize,b\.spin,camera,target\)/);
});

test('cabecera de tienda, botón X, saldo y pestañas permanecen fuera del scroll de los artículos',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const shop=html.slice(html.indexOf('id="shop"'),html.indexOf('id="settings"'));
 const header=shop.indexOf('class="shop-fixed-head"');
 const scroll=shop.indexOf('id="shop-scroll"');
 const list=shop.indexOf('id="shop-items"');
 assert.ok(header>=0&&header<scroll&&scroll<list);
 for(const id of ['shop-title','shop-close','shop-money','shop-tab-bat','shop-tab-outfit','shop-tab-ball']){
  const pos=shop.indexOf('id="'+id+'"');
  assert.ok(pos>header&&pos<scroll,id+' desaparece al desplazarse');
 }
 assert.match(css,/#shop \.shop-modal\{/);
 assert.match(css,/#shop \.shop-fixed-head\{/);
 assert.match(css,/#shop \.shop-scroll\{/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/overscroll-behavior-y:contain/);
 assert.match(game,/el\('shop-scroll'\)\.scrollTop=0/);
 assert.match(game,/const container=el\('shop-items'\);container\.replaceChildren\(\)/);
});

test('pitch overlay sends the actual moving spherical orientation and freezes it on hold',()=>{
 const old=globalThis.window;globalThis.window={devicePixelRatio:1,innerWidth:430,innerHeight:930};
 try{
  const ctx={setTransform(){},clearRect(){},save(){},restore(){},translate(){},rotate(){},drawImage(){}};
  const sprites=new BatterSprites({clientWidth:430,clientHeight:930,getContext(){return ctx}});
  sprites.ballLoaded=true;sprites.ready=false;const spins=[];sprites.drawEquippedBall=(ctx,g,size,spin)=>spins.push(spin);
  const g={state:'pitching',pitchElapsed:.4,pitchDuration:1.52,camera:[-6.7,7.5,-20.5],target:[-.8,3.5,12],save:initialSave(),ball:null};
  sprites.draw(g,62);g.pitchElapsed=.6;sprites.draw(g,62);g.state='aiming';sprites.draw(g,62);g.state='swinging';sprites.draw(g,62);
  assert.equal(spins.length,4);assert.notDeepEqual(spins[0].orientation,spins[1].orientation);
  assert.deepEqual(spins[1],pitchBallSpin(.6));assert.deepEqual(spins[1],spins[2]);assert.deepEqual(spins[2],spins[3]);
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old}
});
