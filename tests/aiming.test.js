import test from 'node:test';
import assert from 'node:assert/strict';
import {aimSweep,redirectShot,aimDegrees} from '../src/aiming.js';
import {calculateShot} from '../src/logic.js';
import {drawAimArrow} from '../src/world.js';
import {BaseballGame} from '../src/game.js';
import {readFileSync} from 'node:fs';

test('flecha oscila de izquierda a derecha continuamente',()=>{
 assert.equal(aimSweep(0),0);
 assert.ok(aimSweep(.525)>.89);
 assert.ok(aimSweep(1.575)<-.89);
 assert.ok(Math.abs(aimSweep(2.1))<1e-10);
 assert.ok(Math.abs(aimSweep(4.2))<1e-10);
 assert.equal(aimDegrees(0),'0°');
 assert.equal(aimDegrees(.3),'+17°');
});
test('la calidad queda intacta, la dirección varía y la rapidez se conserva',()=>{
 const base=calculateShot({power:15,swing:5,reflex:7},25);
 const a=redirectShot(base,-.6),b=redirectShot(base,.6);
 assert.ok(a.vx<0&&b.vx>0&&a.vz>0&&b.vz>0);
 assert.ok(Math.abs(a.vy-base.vy)<1e-8);
 assert.ok(Math.abs(Math.hypot(b.vx,b.vz)-Math.hypot(base.vx,base.vz))<1e-8);
 assert.equal(a.quality,base.quality);
 assert.equal(a.initialSpeed,base.initialSpeed);
});
test('mantener pausa el pitcher y suelta aplica el rumbo calculado',()=>{
 const game=Object.create(BaseballGame.prototype);
 game.state='pitching';game.pitchElapsed=1.25;game.pitchDuration=1.52;
 game.save={levels:{power:4,swing:3,reflex:2}};
 game.audio={swing(){}};
 const elements=new Map(),old=globalThis.document;
 globalThis.document={getElementById:id=>{
  if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',classList:{add(){},remove(){}},style:{}});
  return elements.get(id);
 }};
 try{
  game.freezeSwing(false);
  const quality=game.pendingShot.quality,delta=game.pendingShot.deltaMs,t=game.pitchElapsed;
  assert.equal(game.state,'aiming');
  game.aimElapsed=1.1;game.aimAngle=aimSweep(game.aimElapsed);
  assert.equal(game.pitchElapsed,t);
  assert.equal(game.pendingShot.quality,quality);
  assert.equal(game.pendingShot.deltaMs,delta);
  game.swingBat(false);
  assert.equal(game.state,'swinging');
  assert.equal(game.pendingShot.quality,quality);
  assert.ok(Math.abs(game.pendingShot.direction-game.aimAngle)<1e-12);
  assert.equal(elements.get('pitch-surface').hidden,true);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old}
});
test('una flecha grande rota alrededor de una única base fija y coincide con el tiro',()=>{
 const frames=[];
 for(const angle of [-.7,0,.7]){
  const boxes=[],pivots=[];
  const r={setLayer(){},box:(...a)=>boxes.push(a),ball:(...a)=>pivots.push(a)};
  drawAimArrow(r,angle,'perfect');
  assert.equal(boxes.length,3,'debe haber un asta y dos lados de una sola punta');
  assert.equal(pivots.length,1,'el origen es un único punto fijo');
  assert.ok(Math.abs(boxes[0][7]-angle)<1e-10,'el asta no sigue el rumbo');
  frames.push({angle,boxes,pivot:pivots[0]});
 }
 assert.deepEqual(frames[0].pivot,frames[1].pivot);
 assert.deepEqual(frames[1].pivot,frames[2].pivot);
 assert.notEqual(frames[0].boxes[0][0],frames[2].boxes[0][0],'la punta tiene que oscilar');
 assert.ok(frames[1].boxes[0][2]>frames[1].pivot[2],'la punta debe ir hacia delante');
 const shot=redirectShot(calculateShot({power:1,swing:1,reflex:1},0),Math.PI/5);
 assert.ok(shot.vx>0);
});
test('control de pulsación larga y liberación con captura táctil',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(html,/id="aim-feedback"/);
 assert.match(html,/id="pitch-touch-label"/);
 assert.match(css,/\.pitch-surface\{touch-action:none\}/);
 assert.match(game,/setPointerCapture\?\.\(e.pointerId\)/);
 assert.match(game,/window.addEventListener\('pointerup',release\)/);
});

test('apuntado tiene solo la flecha grande; sin brújula, barra ni flecha pequeña',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="aim-compass"|id="aim-pointer"|id="aim-vector"/);
 assert.doesNotMatch(css,/\.aim-compass|\.aim-pointer/);
 assert.doesNotMatch(game,/el\('aim-compass'\)|el\('aim-pointer'\)|el\('aim-vector'\)/);
 assert.match(html,/id="aim-direction"/);
 assert.match(game,/el\('aim-direction'\)\.textContent=/);
 assert.match(world,/if\(game\.state==='aiming'&&!game\.sprites\?\.images\?\.\['aim-center'\]\)drawAimArrow/);
 assert.doesNotMatch(world,/!game\.spriteReady\)drawAimArrow/);
 assert.match(html,/id="pitch-touch-label"/);
});

test('el encuadre queda detrás y a la izquierda del bateador',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(game,/desiredCam=\[-6\.7,7\.5\+bob,-20\.5\]/);
 assert.match(game,/desiredTarget=\[-\.8,3\.5,12\]/);
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(world,/const tip=\[x\+1\.5-1\.75\*s,8\.10-3\.4\*s/);
});
