import test from 'node:test';
import assert from 'node:assert/strict';
import {aimBarPosition,aimSweep,aimSweetHalf,aimSweepPeriod,redirectShot,aimDegrees,SWEEP_MAX_RAD} from '../src/aiming.js';
import {calculateShot} from '../src/logic.js';
import {BaseballGame} from '../src/game.js';
import {readFileSync} from 'node:fs';

test('la pelota cruza la barra horizontal de lado a lado a velocidad constante',()=>{
 const period=aimSweepPeriod(1);
 assert.equal(aimBarPosition(0),-1);
 assert.ok(Math.abs(aimBarPosition(period/4))<1e-12);
 assert.ok(Math.abs(aimBarPosition(period/2)-1)<1e-12);
 assert.ok(Math.abs(aimBarPosition(period*3/4))<1e-12);
 assert.ok(Math.abs(aimBarPosition(period)+1)<1e-12);
 const p=[period*.08,period*.13,period*.18].map(t=>aimBarPosition(t));
 assert.ok(Math.abs((p[1]-p[0])-(p[2]-p[1]))<1e-10);
 assert.ok(Math.abs(aimSweep(period/4))<1e-12,'el centro apunta recto');
 assert.ok(Math.abs(aimSweep(0)-SWEEP_MAX_RAD)<1e-12);
 assert.ok(Math.abs(aimSweep(period/2)+SWEEP_MAX_RAD)<1e-12);
 assert.equal(aimDegrees(0),'0°');
});

test('subir Swing facilita solo la barra: centro mayor y velocidad menor',()=>{
 assert.ok(aimSweetHalf(14)>aimSweetHalf(1));
 assert.ok(aimSweepPeriod(14)>aimSweepPeriod(1));
 assert.ok(aimSweetHalf(10000)<=.30);
 assert.ok(aimSweepPeriod(10000)<=3.2);
});

test('dirección aplica el rumbo sin añadir energía a un golpe',()=>{
 const base=calculateShot({power:15,swing:5,multiplier:7},25);
 const left=redirectShot(base,-.6),right=redirectShot(base,.6);
 assert.ok(left.vx<0&&right.vx>0&&left.vz>0&&right.vz>0);
 assert.ok(Math.abs(left.vy-base.vy)<1e-8);
 assert.ok(Math.abs(Math.hypot(right.vx,right.vz)-Math.hypot(base.vx,base.vz))<1e-8);
 assert.equal(right.quality,base.quality);
 assert.equal(right.initialSpeed,base.initialSpeed);
});

test('tocar y mantener congela la calidad; soltar en la zona dulce manda la bola recta',()=>{
 const game=Object.create(BaseballGame.prototype);
 game.state='pitching';game.pitchElapsed=1.25;game.pitchDuration=1.52;
 game.save={levels:{power:4,swing:14,multiplier:2}};
 game.audio={swing(){}};
 const elements=new Map(),previous=globalThis.document;
 globalThis.document={getElementById(id){
  if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',classList:{add(){},remove(){}},style:{}});
  return elements.get(id);
 }};
 try{
  game.freezeSwing(false);
  const q=game.pendingShot.quality,t=game.pitchElapsed;
  assert.equal(game.state,'aiming');
  assert.ok(elements.get('aim-sweet-zone').style.width);
  const quarter=aimSweepPeriod(game.save.levels.swing)/4;
  game.aimElapsed=quarter;game.aimAngle=aimSweep(quarter,game.save.levels.swing);
  game.swingBat(false);
  assert.equal(game.state,'swinging');
  assert.equal(game.pendingShot.quality,q);
  assert.equal(game.pitchElapsed,t);
  assert.equal(game.pendingShot.direction,0);
  assert.equal(elements.get('pitch-surface').hidden,true);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous}
});

test('no quedan flechas visuales ni indicadores antiguos',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const sprites=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(html,/id="aim-meter"/);
 assert.match(html,/id="aim-sweet-zone"/);
 assert.match(html,/id="aim-ball"/);
 assert.match(css,/\.aim-meter\{/);
 assert.match(css,/\.aim-ball\{/);
 assert.doesNotMatch(sprites,/this\.images\['aim-center'\]/);
 assert.doesNotMatch(world,/drawAimArrow\(/);
 assert.doesNotMatch(game,/el\('aim-compass'\)|el\('aim-pointer'\)/);
 assert.match(game,/setPointerCapture\?\.\(e.pointerId\)/);
 assert.match(game,/window.addEventListener\('pointerup',release\)/);
});
