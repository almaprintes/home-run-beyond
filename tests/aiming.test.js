import test from 'node:test';
import assert from 'node:assert/strict';
import {aimBarPosition,aimSweep,aimSweetHalf,aimSweepPeriod,redirectShot,aimDegrees,preciseAim,SWEEP_MAX_RAD} from '../src/aiming.js';
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
 assert.ok(aimSweetHalf(14,1)>aimSweetHalf(1,1));
 assert.ok(aimSweepPeriod(14)>aimSweepPeriod(1));
 assert.ok(aimSweetHalf(10000,1)<=.30);
 assert.ok(aimSweepPeriod(10000)<=3.2);
});

test('Potencia estrecha el punto dulce; Swing lo amplía y compensa el desafío',()=>{
 const swing=14;
 assert.ok(aimSweetHalf(swing,49)<aimSweetHalf(swing,1));
 assert.ok(aimSweetHalf(swing,100)<aimSweetHalf(swing,49));
 assert.ok(aimSweetHalf(14,49)>aimSweetHalf(1,49),'Swing aumenta el margen con Potencia fija');
 const novice=aimSweetHalf(1,1),highPower=aimSweetHalf(1,49),recovered=aimSweetHalf(14,49);
 assert.ok(highPower<novice,'la potencia no puede ser gratis en términos de precisión');
 assert.ok(recovered>highPower,'Swing tiene que recuperar margen');
 assert.ok(recovered<aimSweetHalf(14,1),'la misma mejora de Swing no cancela toda la dificultad extra');
 assert.ok(aimSweetHalf(1,10000)>=.055,'no se puede dejar una zona imposible');
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
  assert.equal(elements.get('aim-sweet-zone').style.width,
   (aimSweetHalf(14,4)*100).toFixed(2)+'%',
   'la barra representa la dificultad efectiva de Potencia y Swing');
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

test('un golpe fuera del punto dulce por Potencia alta no se corrige artificialmente',()=>{
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
  const tolerance=aimSweetHalf(14,49),period=aimSweepPeriod(14);
  const outside=tolerance+.015;
  g.aimElapsed=(outside+1)*period/4;
  g.aimAngle=aimSweep(g.aimElapsed,14);
  g.swingBat(false);
  assert.ok(Math.abs(g.pendingShot.direction)>.001,'fuera de la franja no debe disparar recto');
  assert.equal(g.state,'swinging');
 }finally{
  if(before===undefined)delete globalThis.document;else globalThis.document=before;
 }
});

test('zona dulce continua: 101 sueltas distintas generan 101 rumbos, sin azar',()=>{
 const period=aimSweepPeriod(1),edge=aimSweetHalf(1,1);
 const headings=Array.from({length:101},(_,i)=>preciseAim((1-edge+2*edge*i/100)*period/4,1,1,0));
 assert.equal(new Set(headings).size,101);
 assert.ok(headings[0]>0&&headings.at(-1)<0);
 assert.ok(Math.abs(headings[50])<1e-12);
 assert.ok(headings.every((x,i)=>i===0||x<headings[i-1]));
 const t=(1+edge)*period/4;
 assert.ok(Math.abs(preciseAim(t-1e-8)-preciseAim(t+1e-8))<1e-5);
 assert.ok(Math.abs(preciseAim(period/4,1,1,10))>0);
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
