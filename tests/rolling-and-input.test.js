import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BALL_RADIUS,initBallSpin,integratePhysicalSpin,onSpinImpact} from '../src/ball-spin.js';
import {drawSpinningBaseball} from '../src/sprites.js';
import {BaseballGame} from '../src/game.js';
import {groundAt} from '../src/world.js';

test('el giro de rodadura mide metros recorridos y radio real, no fotogramas',()=>{
 const b={x:0,y:1.45,z:0,vx:0,vy:0,vz:8};
 initBallSpin(b);
 const distance=Math.PI*BALL_RADIUS;
 b.z=distance;
 integratePhysicalSpin(b,{x:0,z:0},distance/8,true,'grass');
 assert.ok(Math.abs(b.spin.rollAngle-Math.PI)<1e-8);
 assert.ok(Math.abs(b.spin.angle-Math.PI)<1e-8);
 assert.ok(b.spin.contact);
 assert.ok(Math.abs(b.spin.rate-8/BALL_RADIUS)<1e-8);
});

test('rodar hacia atrás invierte exactamente el giro, sin reiniciar las costuras',()=>{
 const b={x:0,y:1.45,z:0,vx:0,vy:0,vz:6};
 initBallSpin(b);
 b.z=3;
 integratePhysicalSpin(b,{x:0,z:0},.5,true,'grass');
 const first=b.spin.rollAngle;
 b.vz=-6;b.z=1;
 integratePhysicalSpin(b,{x:0,z:3},1/3,true,'grass');
 assert.ok(b.spin.rollAngle<first);
 assert.ok(Math.abs(b.spin.rollAngle-1/BALL_RADIUS)<1e-6);
});

test('si no se mueve sobre el suelo, no gira aunque la simulación se acelere',()=>{
 const b={x:42,z:80,vx:0,vz:0,vy:0,y:1.45};
 initBallSpin(b);const angle=b.spin.angle;
 integratePhysicalSpin(b,{x:42,z:80},.26,true,'asphalt');
 assert.equal(b.spin.angle,angle);
 assert.equal(b.spin.rate,0);
});

test('agua amortigua el giro y las correcciones de choque no crean giros gigantes',()=>{
 const b={x:0,z:0,y:1.45,vx:0,vz:5,vy:0};
 initBallSpin(b);
 b.z=2;
 integratePhysicalSpin(b,{x:0,z:0},.4,true,'water');
 assert.ok(b.spin.rollAngle>0&&b.spin.rollAngle<.4);
 const phase=b.spin.angle;
 onSpinImpact(b,{x:0,y:1,z:0},'grass');
 assert.equal(b.spin.angle,phase);
 b.z=120;
 integratePhysicalSpin(b,{x:0,z:2},.02,true,'grass');
 assert.ok(b.spin.rollAngle<.6,'no debe sumar teleport como distancia rodada');
});

test('la pelota aprobada enseña costuras desplazándose sobre esfera sin aplanarla',()=>{
 const srcRows=[];
 const ctx={save(){},restore(){},beginPath(){},arc(){},clip(){},fillRect(){},rotate(){},
  drawImage(...args){srcRows.push(args)}};
 const image={naturalWidth:300,naturalHeight:300};
 const b={contact:true,rollAngle:0,angle:0,rollHeading:0};
 drawSpinningBaseball(ctx,image,40,b);
 assert.equal(srcRows.length,20);
 const original=srcRows.map(args=>args[2]);
 srcRows.length=0;
 b.angle=1.3;b.rollAngle=1.3;
 drawSpinningBaseball(ctx,image,40,b);
 assert.equal(srcRows.length,20);
 assert.ok(srcRows.some((args,i)=>args[2]!==original[i]));
 assert.ok(srcRows.every(args=>args[7]>=2&&args[8]>0));
});

test('el juego calcula el spin en subpasos físicos, no tras acelerar 22 veces',()=>{
 const source=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(source,/integratePhysicalSpin\(b,prev,dt,touching/);
 assert.doesNotMatch(source,/advanceBallSpin\(this\.ball,dt/);
 const game=Object.create(BaseballGame.prototype);
 const ground=groundAt(990,800);
 game.state='flight';game.ball={x:990,y:ground.y+BALL_RADIUS,z:800,
  vx:0,vy:0,vz:12,bounces:0,maxZ:800};
 game.simElapsed=0;
 game.finishShot=()=>{};
 game.simulateStep(.05);
 assert.ok(game.ball.spin.contact,'contacto terrestre detectado');
 assert.ok(game.ball.spin.rollAngle>.1);
 const moved=game.ball.z-800;
 assert.ok(Math.abs(game.ball.spin.rollAngle-moved/BALL_RADIUS)<.08);
});

test('un único dedo puede pulsar y soltar desde toda la superficie, incluso si se pierde captura',()=>{
 const priorDocument=globalThis.document,priorWindow=globalThis.window,priorLocation=globalThis.location;
 const elements=new Map(),winEvents=new Map();
 function element(id){
  if(!elements.has(id)){
   const events=new Map();
   elements.set(id,{
    events,hidden:false,style:{},textContent:'',classList:{add(){},remove(){}},
    addEventListener:(n,cb)=>events.set(n,cb),
    setPointerCapture(){},getAttribute(){return ''}});
  }
  return elements.get(id);
 }
 globalThis.document={getElementById:element,addEventListener(){}};
 globalThis.window={addEventListener:(n,cb)=>winEvents.set(n,cb)};
 globalThis.location={search:''};
 try{
  const game=Object.create(BaseballGame.prototype);
  let hits=0;game.state='pitching';game.activePointer=null;
  game.onAction=()=>{if(game.state==='pitching')game.state='aiming'};
  game.swingBat=()=>{hits++;game.state='swinging'};
  game.initUI();
  const surface=element('pitch-surface');
  const down=surface.events.get('pointerdown'),up=surface.events.get('pointerup');
  down({pointerId:5,pointerType:'touch',currentTarget:surface,preventDefault(){}});
  assert.equal(game.activePointer,5);
  assert.equal(game.state,'aiming');
  up({pointerId:5,preventDefault(){}});
  assert.equal(hits,1);
  surface.events.get('lostpointercapture')({pointerId:5,preventDefault(){}});
  assert.equal(hits,1,'un único toque nunca dispara dos veces');
  game.state='pitching';
  const action=element('action');
  action.events.get('pointerdown')({pointerId:8,pointerType:'touch',currentTarget:action,preventDefault(){}});
  assert.equal(game.state,'aiming');
  action.events.get('pointercancel')({pointerId:8,preventDefault(){}});
  assert.equal(hits,2,'iPhone canceló el evento pero el golpe no puede perderse');
 }finally{
  if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;
  if(priorWindow===undefined)delete globalThis.window;else globalThis.window=priorWindow;
  if(priorLocation===undefined)delete globalThis.location;else globalThis.location=priorLocation;
 }
});
