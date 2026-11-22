import test from 'node:test';
import assert from 'node:assert/strict';
import {aimSweep,redirectShot,aimDegrees,SWEEP_MAX_RAD} from '../src/aiming.js';
import {calculateShot} from '../src/logic.js';
import {drawAimArrow} from '../src/world.js';
import {BaseballGame} from '../src/game.js';
import {aimArrowProjection} from '../src/sprites.js';
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

test('la flecha conserva escala y pivote al barrer todo su recorrido',()=>{
 const camera=[-6.7,7.5,-20.5],target=[-.8,3.5,12];
 const poses=[-.85,-.45,0,.45,.85].map(angle=>
  aimArrowProjection(camera,target,430,930,62,angle));
 assert.ok(poses.every(Boolean),'la flecha debe poder proyectarse en todo el barrido');
 for(const pose of poses){
  assert.equal(pose.x,poses[0].x,'el pivote horizontal no puede desplazarse');
  assert.equal(pose.y,poses[0].y,'el pivote vertical no puede desplazarse');
  assert.equal(pose.heightPx,poses[0].heightPx,'el tamaño no depende del ángulo');
 }
 assert.ok(new Set(poses.map(p=>p.rotation.toFixed(4))).size>2,
  'el indicador sigue rotando mientras mantiene su escala');
});

test('barrido con velocidad regular, giro suave en extremos y sin saltos al cerrar el ciclo',()=>{
 const quarter=2.1/4;
 const eps=.0005;
 assert.ok(Math.abs(aimSweep(quarter)-SWEEP_MAX_RAD)<1e-9);
 assert.ok(Math.abs(aimSweep(quarter*3)+SWEEP_MAX_RAD)<1e-9);
 const x=[.13,.18,.23].map(t=>aimSweep(t));
 const v1=(x[1]-x[0])/.05,v2=(x[2]-x[1])/.05;
 assert.ok(Math.abs(v1-v2)<.08,'el giro central debería mantener una velocidad prácticamente constante');
 const boundary=(aimSweep(quarter+eps)-aimSweep(quarter-eps))/(2*eps);
 assert.ok(Math.abs(boundary)<.02,'el cambio de sentido debe detenerse sin golpe seco');
 assert.ok(Math.abs(aimSweep(2.1-eps)-aimSweep(2.1+eps))<.01,'la repetición no puede saltar');
 for(let i=1;i<=600;i++){
  const a=aimSweep(i*2.1/600),b=aimSweep((i-1)*2.1/600);
  assert.ok(Math.abs(a-b)<.025,'salto brusco al avanzar un fotograma');
 }
});

test('el giro visual del indicador respeta exactamente el rumbo sin distorsión de perspectiva',()=>{
 const cam=[-6.7,7.5,-20.5],target=[-.8,3.5,12];
 for(const angle of [-SWEEP_MAX_RAD,-.45,0,.45,SWEEP_MAX_RAD]){
  const pose=aimArrowProjection(cam,target,430,930,62,angle);
  assert.ok(pose);
  assert.ok(Math.abs(pose.rotation+angle)<1e-10,'el giro no debe acelerar por perspectiva');
 }
});
