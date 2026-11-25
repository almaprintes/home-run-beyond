import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spinTarget,initBallSpin,onSpinImpact,advanceBallSpin} from '../src/ball-spin.js';
import {BatterSprites} from '../src/sprites.js';

const ball=(vz=100,vx=0)=>({x:0,y:4,z:70,vx,vy:12,vz});
test('desde el bate la pelota gira claramente en el aire y no depende de la hora',()=>{
 const b=ball(110);
 initBallSpin(b);
 assert.ok(Math.abs(b.spin.rate)>6,'el giro inicial era casi invisible');
 let previous=b.spin.angle;
 for(let i=0;i<60;i++)advanceBallSpin(b,1/60,false);
 assert.ok(Math.abs(b.spin.angle-previous)>1,'debe mostrar costuras cambiando');
 assert.ok(Number.isFinite(b.spin.tilt));
});
test('la pelota que rebota hacia atrás invierte también el giro',()=>{
 const b=ball(95);
 initBallSpin(b);
 const outbound=b.spin.rate;
 b.vz=-68;
 onSpinImpact(b,{x:0,y:0,z:-1},'concrete');
 assert.ok(outbound*b.spin.rate<0,'rebote contra fachada no invirtió el giro');
 for(let i=0;i<15;i++)advanceBallSpin(b,1/60,false);
 assert.ok(b.spin.rate>0);
});
test('en el suelo rueda en el sentido de marcha y frena al detenerse',()=>{
 const b=ball(18);b.vy=0;
 initBallSpin(b);
 onSpinImpact(b,{x:0,y:1,z:0},'grass');
 let first=spinTarget(b,true);
 assert.ok(first>0,'la rueda hacia delante debe girar hacia delante');
 for(let i=0;i<15;i++)advanceBallSpin(b,1/60,true);
 assert.ok(b.spin.rate>0);
 b.vz=-14;
 onSpinImpact(b,{x:0,y:1,z:0},'grass');
 assert.ok(b.spin.rate<0,'rueda hacia atrás con spin contrario');
 for(let i=0;i<10;i++)advanceBallSpin(b,1/60,true);
 b.vz=0;
 for(let i=0;i<90;i++)advanceBallSpin(b,1/60,true);
 assert.ok(Math.abs(b.spin.rate)<.005,'pelota quieta no debe seguir girando');
});
test('agua y goma amortiguan rotación y nunca provocan saltos de fase',()=>{
 const b=ball(130);
 initBallSpin(b);
 advanceBallSpin(b,.016);
 const angle=b.spin.angle;
 b.vz=15;
 onSpinImpact(b,{x:0,y:1,z:0},'water');
 b.wetTime=.02;
 assert.equal(b.spin.angle,angle,'las costuras saltaron de posición');
 assert.ok(Math.abs(b.spin.rate)<5);
 for(let i=0;i<10;i++)advanceBallSpin(b,1/60,true);
 assert.ok(Math.abs(b.spin.rate)<2);
});
test('el giro está limitado por fotograma y no se acelera por multiplicador 22x',()=>{
 const b=ball(380);
 initBallSpin(b);
 assert.ok(Math.abs(spinTarget(b))<=13.5);
 const prior=b.spin.angle;
 advanceBallSpin(b,9,false);
 assert.ok(Math.abs(b.spin.angle-prior)<=13.5*.051,'un frame con pausa no debe saltar cientos de grados');
});
test('la pelota original no se transforma en una moneda en vuelo y vuelve a girar en el suelo',()=>{
 const priorWindow=globalThis.window;
 globalThis.window={devicePixelRatio:1,innerWidth:390,innerHeight:844};
 const angles=[],pictures=[];
 const ctx={setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},
  ellipse(){},fill(){},translate(){},rotate(a){angles.push(a)},drawImage(image){pictures.push(image)}};
 const sprites=new BatterSprites({clientWidth:390,clientHeight:844,getContext:()=>ctx});
 sprites.ballLoaded=true;const original={width:160,height:160};sprites.images.ball=original;
 const b=ball(12);b.spin={angle:1.4,groundEngaged:false};
 const game={state:'flight',ball:b,save:{equippedBall:'classic'},
  camera:[8,20,-15],target:[0,4,80],clock:987,fxCamera:null};
 try{
  sprites.draw(game,58);
  assert.equal(angles.length,0,'en vuelo la pelota aprobada no gira como una moneda plana');
  assert.ok(pictures.includes(original));
  b.spin.angle=-.75;
  sprites.draw(game,58);
  assert.equal(angles.length,0,'el backspin debe ser físico, no un giro lateral en el lienzo');
  const source=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
  assert.match(source,/spin\?\.orientation&&camera&&target/);
  assert.match(source,/drawSpinningBaseball\(ctx,image,size,spin,camera,target,this\.ballSurfaceCache\)/);
 }finally{if(priorWindow===undefined)delete globalThis.window;else globalThis.window=priorWindow}
});
test('el juego actualiza el giro una vez por fotograma, y la alternativa 3D también lo usa',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(game,/initBallSpin\(b\)/);
 assert.match(game,/onSpinImpact\(b,n,mat\)/);
 assert.match(game,/integratePhysicalSpin\(b,prev,dt,touching/);
 assert.match(world,/drawBaseball\(r,b\.x,b\.y,b\.z,b\.spin\?\.angle\|\|0\)/);
});
