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
test('la flecha se renderiza en 3D y apunta igual que el vector físico',()=>{
 const calls=[],r={box:(...args)=>calls.push(args),ball(){}};
 drawAimArrow(r,Math.PI/5,'perfect');
 assert.equal(calls.length,3);
 assert.ok(Math.abs(calls[0][7]-Math.PI/5)<1e-10);
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
 assert.match(game,/setPointerCapture\(e.pointerId\)/);
 assert.match(game,/window.addEventListener\('pointerup',release\)/);
});
