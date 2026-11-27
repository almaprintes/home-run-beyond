import test from 'node:test';
import assert from 'node:assert/strict';
import {aimBarPosition,aimSweep,aimSweepPeriod,redirectShot,aimDegrees,preciseAim,aimCompassRotation,aimDirection,SWEEP_MAX_RAD} from '../src/aiming.js';
import {calculateShot} from '../src/logic.js';
import {BaseballGame} from '../src/game.js';
import {readFileSync} from 'node:fs';

test('la aguja recorre todo el sector angular a velocidad constante',()=>{
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

test('Swing slows the compass without granting a privileged direction',()=>{
 assert.ok(aimSweepPeriod(14)>aimSweepPeriod(1));
 assert.ok(aimSweepPeriod(10000)<=3.2);
 for(const level of [1,14,10000]){
  const period=aimSweepPeriod(level);
  for(let i=0;i<=104;i++){
   const t=period*i/208,expected=SWEEP_MAX_RAD*(1-i/52);
   assert.ok(Math.abs(preciseAim(t,level)-expected)<1e-12);
   assert.equal(preciseAim(t,level,10000,132,.25),preciseAim(t,level));
  }
 }
 assert.ok(Math.abs(aimCompassRotation(SWEEP_MAX_RAD)+52)<1e-12);
 assert.equal(aimDirection(SWEEP_MAX_RAD),'IZQUIERDA');
 assert.equal(aimDirection(-SWEEP_MAX_RAD),'DERECHA');
 assert.equal(aimDirection(0),'RECTO');
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

test('tocar y mantener congela la calidad; soltar conserva la dirección exacta',()=>{
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
  assert.equal(elements.get('aim-direction').textContent,'IZQUIERDA');
  assert.ok(elements.has('aim-needle'));
  const quarter=aimSweepPeriod(game.save.levels.swing)/4;
  game.aimElapsed=quarter;game.aimAngle=aimSweep(quarter,game.save.levels.swing);
  game.swingBat(false);
  assert.equal(game.state,'swinging');
  assert.equal(game.pendingShot.quality,q);
  assert.equal(game.pitchElapsed,t);
  assert.equal(game.pendingShot.direction,preciseAim(quarter,14,4,game.pendingShot.deltaMs));
  assert.equal(elements.get('pitch-surface').hidden,true);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous}
});

test('no quedan flechas visuales ni indicadores antiguos',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const sprites=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(html,/id="aim-compass"/);
 assert.match(html,/id="aim-needle"/);
 assert.doesNotMatch(html,/id="aim-(?:meter|sweet-zone|ball)"/);
 assert.match(css,/\.aim-compass\{/);
 assert.doesNotMatch(css,/\.aim-sweet-zone/);
 assert.doesNotMatch(sprites,/this\.images\['aim-center'\]/);
 assert.doesNotMatch(world,/drawAimArrow\(/);
 assert.match(game,/el\('aim-needle'\)/);
 assert.doesNotMatch(game,/aimSweetHalf|PUNTO DULCE/);
 assert.match(game,/setPointerCapture\?\.\(e.pointerId\)/);
 assert.match(game,/window.addEventListener\('pointerup',release\)/);
});

test('el rumbo elegido no se corrige artificialmente por Potencia',()=>{
 const g=Object.create(BaseballGame.prototype);
 g.state='aiming';g.aimElapsed=0;g.aimAngle=0;
 g.save={levels:{power:49,swing:14,multiplier:7}};
 g.pendingShot=calculateShot(g.save.levels,0);g.audio={swing(){}};
 const elems=new Map(),before=globalThis.document;
 globalThis.document={getElementById:id=>{
  if(!elems.has(id))elems.set(id,{hidden:false,textContent:'',style:{},classList:{add(){},remove(){}}});
  return elems.get(id);
 }};
 try{
  const period=aimSweepPeriod(14);
  const outside=.215;
  g.aimElapsed=(outside+1)*period/4;
  g.aimAngle=aimSweep(g.aimElapsed,14);
  g.swingBat(false);
  assert.ok(Math.abs(g.pendingShot.direction)>.001,'el rumbo lateral debe conservarse');
  assert.equal(g.state,'swinging');
 }finally{
  if(before===undefined)delete globalThis.document;else globalThis.document=before;
 }
});

test('101 sueltas distintas generan 101 rumbos uniformes, sin azar',()=>{
 const period=aimSweepPeriod(1),edge=.4;
 const headings=Array.from({length:101},(_,i)=>preciseAim((1-edge+2*edge*i/100)*period/4,1,1,0));
 assert.equal(new Set(headings).size,101);
 assert.ok(headings[0]>0&&headings.at(-1)<0);
 assert.ok(Math.abs(headings[50])<1e-12);
 assert.ok(headings.every((x,i)=>i===0||x<headings[i-1]));
 const t=(1+edge)*period/4;
 assert.ok(Math.abs(preciseAim(t-1e-8)-preciseAim(t+1e-8))<1e-5);
 assert.ok(Math.abs(preciseAim(period/4,1,1,10))<1e-12);
});
test('dentro de PERFECTO cambia suavemente velocidad, elevación y contacto milimétrico',()=>{
 const levels={power:10,swing:1,multiplier:1},a=calculateShot(levels,0),b=calculateShot(levels,30),c=calculateShot(levels,-30);
 assert.equal(a.quality,b.quality);assert.equal(b.quality,c.quality);
 assert.ok(a.initialSpeed>b.initialSpeed);assert.equal(b.initialSpeed,c.initialSpeed);
 assert.ok(c.angle<a.angle&&a.angle<b.angle);
 assert.ok(c.contactOffsetMm<0&&b.contactOffsetMm>0);
 assert.deepEqual(b,calculateShot(levels,30));
});
test('el reloj conserva fracciones de fotograma de la entrada',()=>{
 const g=Object.create(BaseballGame.prototype);g.last=1000;
 assert.equal(g.inputRemainder(1005),.005);assert.equal(g.inputRemainder(1000),0);
 assert.equal(g.inputRemainder(undefined),0);
});
