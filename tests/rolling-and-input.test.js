import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BALL_RADIUS,initBallSpin,integratePhysicalSpin,onSpinImpact,rotateQuaternion,spinQuaternion,advanceVisualSpin,SPIN_GRIP} from '../src/ball-spin.js';
import {drawSpinningBaseball,shadeRollingSurface,BALL_SURFACE_SIZE} from '../src/sprites.js';
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

test('avanzar por +Z rueda sobre el eje horizontal X y no como moneda lateral',()=>{
 const b={x:0,y:BALL_RADIUS,z:0,vx:0,vy:0,vz:8};
 initBallSpin(b);
 b.z=Math.PI*BALL_RADIUS/2;
 integratePhysicalSpin(b,{x:0,z:0},Math.PI*BALL_RADIUS/16,true,'grass');
 const top=rotateQuaternion(b.spin.orientation,[0,1,0]);
 const right=rotateQuaternion(b.spin.orientation,[1,0,0]);
 assert.ok(top[2]>.999,'la rodadura física debe llevar el polo superior hacia delante (+Z)');
 assert.ok(Math.abs(top[0])<1e-8,'un avance recto no produce giro lateral');
 assert.ok(Math.abs(right[0]-1)<1e-8,'el eje transversal se mantiene fijo');
});

test('desplazamiento lateral X rueda sobre Z, y marcha atrás deshace exactamente el giro',()=>{
 const b={x:0,y:BALL_RADIUS,z:0,vx:8,vy:0,vz:0};
 initBallSpin(b);
 b.x=Math.PI*BALL_RADIUS/2;
 integratePhysicalSpin(b,{x:0,z:0},Math.PI*BALL_RADIUS/16,true,'grass');
 const top=rotateQuaternion(b.spin.orientation,[0,1,0]);
 assert.ok(top[0]>.999,'la rodadura lateral debe llevar el polo superior hacia +X');
 b.vx=-8;b.x=0;
 integratePhysicalSpin(b,{x:Math.PI*BALL_RADIUS/2,z:0},Math.PI*BALL_RADIUS/16,true,'grass');
 const home=rotateQuaternion(b.spin.orientation,[0,1,0]);
 assert.ok(Math.abs(home[1]-1)<1e-8,'retroceder la misma distancia vuelve a su orientación');
});

test('la proyección distingue el giro hacia atrás del avance real en cámara',()=>{
 const w=32,h=32,source=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;
  source[i]=Math.round(y*255/(h-1));source[i+1]=0;source[i+2]=120;source[i+3]=255;
 }
 const output=new Uint8ClampedArray(BALL_SURFACE_SIZE*BALL_SURFACE_SIZE*4);
 const camera=[0,5,-18],target=[0,5,30];
 const center=(31*BALL_SURFACE_SIZE+31)*4;
 const air={orientation:[0,0,0,1]};
 spinQuaternion(air,[1,0,0],-.34);
 shadeRollingSurface(source,w,h,{visualOrientation:air.orientation},camera,target,output);
 const airborne=output[center];
 const roll={orientation:[0,0,0,1]};
 spinQuaternion(roll,[1,0,0],+.34);
 shadeRollingSurface(source,w,h,{visualOrientation:roll.orientation},camera,target,output);
 const grounded=output[center];
 assert.ok(grounded>airborne,
  'el giro hacia delante aparece igual que el backspin desde la cámara trasera');
});

test('el sprite aprobado gira como esfera y conserva sus colores, sin franjas de moneda',()=>{
 const w=32,h=32,source=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;
  source[i]=x*7;source[i+1]=y*7;source[i+2]=120;source[i+3]=255;
 }
 const cache=new Uint8ClampedArray(BALL_SURFACE_SIZE*BALL_SURFACE_SIZE*4);
 const b={orientation:[0,0,0,1]};
 shadeRollingSurface(source,w,h,b,[0,8,-18],[0,3,25],cache);
 const original=new Uint8ClampedArray(cache);
 spinQuaternion(b,[1,0,0],Math.PI/2);
 shadeRollingSurface(source,w,h,b,[0,8,-18],[0,3,25],cache);
 assert.ok(cache.some((v,i)=>v!==original[i]),'costuras deben cambiar con el giro hacia delante');
 assert.equal(cache[0+3],0,'imagen esférica tiene fondo transparente');
 const center=(BALL_SURFACE_SIZE*BALL_SURFACE_SIZE/2+BALL_SURFACE_SIZE/2)*4;
 assert.equal(cache[center+3],255,'la pelota sigue opaca en su centro');
});

test('el lienzo iOS usa reproyección esférica 64px con la pelota aprobada',()=>{
 const before=globalThis.document;
 const color=new Uint8ClampedArray(16*16*4);
 color.fill(255);
 let created=0,uploaded=0,drawn=0,rotated=0;
 globalThis.document={createElement(){
  const n=++created;
  return {width:0,height:0,getContext(){
   return n===1?{drawImage(){},getImageData:()=>({width:16,height:16,data:color})}:
   {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){uploaded++}};
  }};
 }};
 const ctx={drawImage(){drawn++},rotate(){rotated++}};
 const img={naturalWidth:16,naturalHeight:16};
 const b={orientation:[0,0,0,1],angle:0};
 const cache={};
 try{
  drawSpinningBaseball(ctx,img,40,b,[0,8,-18],[0,3,25],cache);
  spinQuaternion(b,[1,0,0],.3);
  drawSpinningBaseball(ctx,img,40,b,[0,8,-18],[0,3,25],cache);
  assert.equal(created,2,'caché 2D se crea una sola vez');
  assert.equal(uploaded,2,'la textura se actualiza con el giro');
  assert.equal(drawn,2,'una única esfera por fotograma');
  assert.equal(rotated,0,'no se gira la imagen plana hacia un costado');
 }finally{
  if(before===undefined)delete globalThis.document;else globalThis.document=before;
 }
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

test('primera colisión con el suelo sale del modo backspin incluso si todavía rebota',()=>{
 const g=groundAt(990,800);
 const b={x:990,y:g.y+BALL_RADIUS+.12,z:800,vx:0,vy:-15,vz:44,bounces:0,maxZ:800};
 initBallSpin(b);
 const game=Object.create(BaseballGame.prototype);
 game.state='flight';game.ball=b;game.simElapsed=0;game.audio={impact(){}};
 game.finishShot=()=>{game.state='rest'};
 const flightSpin=b.spin.visualRate;
 assert.ok(flightSpin<0,'el golpe empieza con backspin');
 game.simulateStep(.022);
 assert.equal(b.spin.groundEngaged,true,'el primer bote no marcó contacto con suelo');
 assert.equal(b.spinContact,false,'primer rebote debe poder seguir por el aire');
 // Antes se aplicaba de nuevo backspin al actualizar un salto pequeño.
 for(let i=0;i<5;i++)advanceVisualSpin(b,1/60);
 assert.ok(b.spin.visualRate>0,'no pasó a giro hacia delante tras el primer bote');
 const forwardRate=b.spin.visualRate;
 b.y=g.y+BALL_RADIUS+2;b.vy=3;
 game.simulateStep(.016);
 advanceVisualSpin(b,1/60);
 assert.equal(b.spin.groundEngaged,true,'un pequeño salto reactivó el backspin');
 assert.ok(b.spin.visualRate>0,'la pelota sigue girando hacia atrás después de rebotar');
 assert.ok(b.spin.visualRate>=forwardRate*.75);
});

test('rodadura visible no se invierte por aliasing al acelerar el tiempo 22 veces',()=>{
 const b={x:0,y:BALL_RADIUS,z:0,vx:0,vy:-5,vz:90};
 initBallSpin(b);
 onSpinImpact(b,{x:0,y:1,z:0},'grass');
 assert.ok(SPIN_GRIP.grass>SPIN_GRIP.water);
 for(let i=0;i<9;i++)advanceVisualSpin(b,1/60);
 assert.ok(b.spin.visualRate>0);
 assert.ok(b.spin.visualRate<=12.5);
 const q0=b.spin.visualOrientation.slice();
 // The physical engine can jump a large simulation distance per real frame.
 b.z+=90*22/60;
 advanceVisualSpin(b,1/60);
 const q1=b.spin.visualOrientation;
 const dot=Math.abs(q0.reduce((sum,x,j)=>sum+x*q1[j],0));
 const angularStep=2*Math.acos(Math.min(1,dot));
 assert.ok(angularStep<.23,'estroboscopio: gira demasiados radianes en un fotograma');
});

test('el sprite muestra la orientación visual suavizada, no el giro físico estroboscópico',()=>{
 const w=32,h=32,source=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4;source[k]=x*6;source[k+1]=y*6;source[k+2]=140;source[k+3]=255;
 }
 const output=new Uint8ClampedArray(BALL_SURFACE_SIZE*BALL_SURFACE_SIZE*4);
 const b={x:0,y:BALL_RADIUS,z:0,vx:0,vy:0,vz:26};
 initBallSpin(b);
 const physical=b.spin.orientation.slice();
 shadeRollingSurface(source,w,h,b.spin,[0,5,-20],[0,3,30],output);
 const before=new Uint8ClampedArray(output);
 onSpinImpact(b,{x:0,y:1,z:0},'grass');
 for(let i=0;i<5;i++)advanceVisualSpin(b,1/60);
 assert.deepEqual(b.spin.orientation,physical,'el test no debe modificar el cuaternión físico');
 shadeRollingSurface(source,w,h,b.spin,[0,5,-20],[0,3,30],output);
 assert.ok(output.some((v,i)=>v!==before[i]),
  'la pelota sigue mostrando la orientación física acelerada en vez de la visual');
});

test('una fachada no activa rodadura y el movimiento hacia atrás invierte el eje',()=>{
 const b={x:0,y:7,z:100,vx:0,vy:0,vz:35};
 initBallSpin(b);
 onSpinImpact(b,{x:0,y:0,z:-1},'brick');
 assert.equal(b.spin.groundEngaged,false);
 b.vz=-35;
 advanceVisualSpin(b,1/60);
 assert.ok(b.spin.visualRate<0,'sigue en modo de giro aéreo sin contacto con el suelo');
 onSpinImpact(b,{x:0,y:1,z:0},'road');
 for(let i=0;i<7;i++)advanceVisualSpin(b,1/60);
 assert.ok(b.spin.visualRate>0,'el suelo debe activar la rodadura incluso retrocediendo');
 const q=b.spin.visualOrientation.slice();
 advanceVisualSpin(b,1/60);
 assert.notDeepEqual(b.spin.visualOrientation,q);
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
