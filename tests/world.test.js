import test from 'node:test';import assert from 'node:assert/strict';
import {rand,groundAt,roadAt,riverAt,areaAt,collideBuilding,drawWorld,buildingAt,traceBuildingCollision,wetAreaAt,drawBatter} from '../src/world.js';
import {BaseballGame} from '../src/game.js';
const worldAPI=()=>({buildingAt,traceBuildingCollision,groundAt,wetAreaAt});
import {lookAt,perspective,mul4} from '../src/engine.js';
test('procedural determinista entre sesiones',()=>{assert.equal(rand(331,76),rand(331,76));assert.notEqual(rand(331,76),rand(331,77))});
test('zonas de agua y suelo',()=>{assert.equal(groundAt(0,1680).type,'water');assert.ok(riverAt(1680));assert.equal(groundAt(0,50).type,'grass');assert.equal(areaAt(0),'ESTADIO');assert.equal(areaAt(900),'CIUDAD');});
test('matrices de cámara finitas',()=>{const m=mul4(perspective(1.1,390/844,.3,2000),lookAt([12,18,-42],[0,3,25]));assert.equal(m.length,16);assert.ok(m.every(Number.isFinite))});
test('mundo genera geometría para estadio, ciudad y vuelo lejano',()=>{for(const z of [0,700,2000,31000]){let count=0;const r={begin(){},add(){count++},box(){count++},field(){count++},ball(){count++},pole(){count++},cone(){count++},fogDistance:500};drawWorld(r,[0,20,z],{state:'ready',pitch:0,swing:0,batColor:'#ffbb44'});assert.ok(count>10,`sin escenario en ${z}m`);assert.ok(count<22000,`escenario excesivo en ${z}m: ${count}`)}});
test('colisiones de edificios solo dentro de sus límites',()=>{assert.equal(collideBuilding({x:0,y:500,z:400}),null);assert.equal(collideBuilding({x:9999,y:0,z:400}),null)});
test('todas las colisiones comparten la generación del decorado, sin edificios fantasma',()=>{
 const {buildingAt}=worldAPI();
 let buildings=0,empty=0;
 for(let j=0;j<=24;j++)for(let i=-5;i<=5;i++){
  const b=buildingAt(i,j),x=i*60,z=270+j*60;
  if(!b){
   empty++;
   assert.equal(collideBuilding({x,y:5,z}),null,`colisión fantasma en ${i},${j}`);
  }else{
   buildings++;
   assert.ok(collideBuilding({x,y:5,z}),`edificio sin cuerpo en ${i},${j}`);
   assert.equal(collideBuilding({x,y:b.h+7,z}),null);
  }
 }
 assert.equal(buildings,92);assert.ok(empty>15);
});

test('el barrido continuo detecta impactos contra tejados, fachadas y casetas',()=>{
 const {buildingAt,traceBuildingCollision}=worldAPI();
 const b=buildingAt(0,1);assert.ok(b);
 const top=traceBuildingCollision({x:b.x,y:b.h+18,z:b.z},{x:b.x,y:b.h-6,z:b.z},1.45);
 assert.ok(top);assert.equal(top.normal.y,1);assert.ok(['roof','vent'].includes(top.kind));
 const start={x:b.x,y:Math.min(5,b.h-2),z:b.z-b.d/2-8};
 const end={...start,z:b.z+b.d/2+6};
 const front=traceBuildingCollision(start,end,1.45);
 assert.ok(front);assert.equal(front.normal.z,-1);
 assert.equal(traceBuildingCollision({x:b.x,y:b.h+20,z:b.z},{x:b.x,y:b.h+12,z:b.z},1.45),null);
});

test('ninguna celda con árboles o carretera genera colisiones falsas',()=>{
 const {buildingAt,traceBuildingCollision}=worldAPI();
 for(let j=0;j<=24;j++)for(let i=-5;i<=5;i++){
  if(buildingAt(i,j))continue;
  const x=i*60,z=270+j*60;
  const hit=traceBuildingCollision({x:x-2,y:4,z},{x:x+2,y:4,z},1.45);
  assert.equal(hit,null,`árbol/carretera invisible tratado como bloque en ${i},${j}`);
 }
});

test('golpe contra pared real rebota y no atraviesa el edificio',()=>{
 const {buildingAt}=worldAPI(),b=buildingAt(0,1);assert.ok(b);
 const game=Object.create(BaseballGame.prototype);
 game.state='flight';
 game.ball={x:b.x,y:5,z:b.z-b.d/2-5,vx:0,vy:0,vz:70,bounces:0,buildingHits:0,maxZ:0};
 game.simElapsed=0;game.audio={land(){}};game.finishShot=()=>{game.state='rest'};
 game.simulateStep(.15);
 assert.ok(game.ball.z < b.z-b.d/2,'la bola entró en el cuerpo del edificio');
 assert.ok(game.ball.vz<0,'la pared no invirtió la componente de velocidad');
 assert.ok(game.ball.bounces>=1,'la pared debe registrar el impacto');
 assert.equal(game.state,'flight','chocar con una pared no finaliza la partida');
});


function flightGame(ball){
 const game=Object.create(BaseballGame.prototype);
 game.state='flight';game.simElapsed=0;
 game.ball={bounces:0,maxZ:0,...ball};
 game.audio={land(){}};
 game.finishShot=()=>{game.state='rest'};
 return game;
}
function findBuilding(material){
 for(let j=0;j<=24;j++)for(let i=-5;i<=5;i++){
  const b=buildingAt(i,j);
  if(b&&b.roofMaterial===material)return b;
 }
 throw Error('No hay cubierta del material '+material);
}
test('tejados duros devuelven gran parte del impulso y la bola sigue en vuelo',()=>{
 const b=findBuilding('solid'),x=b.x+b.w*.34,z=b.z;
 const game=flightGame({x,y:b.h+1.4+1.45+.13,z,vx:0,vy:-17,vz:14});
 let collided=false;
 for(let k=0;k<12;k++){
  game.simulateStep(1/60);
  if(game.ball.bounces>0){collided=true;break;}
 }
 assert.ok(collided,'No llegó al tejado duro');
 assert.equal(game.state,'flight','Un choque contra superficie dura no debe terminar el golpe');
 assert.ok(game.ball.vy>8,'El material duro debe producir rebote alto');
 assert.ok(game.ball.vz>10,'La cubierta sólida no debe eliminar la velocidad horizontal');
});
test('tejado de goma disipa más energía que el tejado duro, sin finalizar por contacto',()=>{
 const b=findBuilding('rubber'),x=b.x+b.w*.34,z=b.z;
 const game=flightGame({x,y:b.h+1.4+1.45+.13,z,vx:0,vy:-17,vz:14});
 for(let k=0;k<12&&game.ball.bounces===0;k++)game.simulateStep(1/60);
 assert.ok(game.ball.bounces>0);
 assert.equal(game.state,'flight');
 assert.ok(game.ball.vy>0&&game.ball.vy<5);
 assert.ok(game.ball.vz<9,'La goma debe frenar apreciablemente el avance');
});
test('pantano y charco frenan casi en seco y se representan en el terreno',()=>{
 const {groundAt,wetAreaAt}=worldAPI();
 for(const [x,z,type] of [[15,2140,'swamp'],[-95,2520,'puddle']]){
  assert.equal(wetAreaAt(x,z),type);
  const ground=groundAt(x,z);assert.equal(ground.type,type);
  const game=flightGame({x,y:ground.y+1.48,z,vx:0,vy:-12,vz:27});
  game.simulateStep(1/60);
  assert.ok(game.ball.vz<6,`el ${type} debería frenar casi toda la velocidad`);
  assert.equal(game.state,'flight','Contacto con agua no debe finalizar de inmediato');
  for(let k=0;k<65&&game.state==='flight';k++)game.simulateStep(1/60);
  assert.equal(game.state,'rest','La bola debe terminar tras quedarse sin movimiento en agua');
 }
});
test('rebotes sucesivos en superficie sólida no terminan por contador de impactos',()=>{
 const b=findBuilding('solid');
 const game=flightGame({x:b.x+b.w*.32,y:b.h+1.4+1.45+.12,z:b.z,vx:0,vy:-8,vz:1});
 for(let k=0;k<120&&game.state==='flight';k++)game.simulateStep(1/60);
 assert.ok(game.ball.bounces>=1);
 assert.ok(game.simElapsed>0);
 // Un golpe puede terminar al reposar, nunca al sumar un número prefijado de choques.
 assert.ok(!/buildingHits>=4|bounces>=4/.test(BaseballGame.prototype.simulateStep.toString()));
});

test('bateador de perfil con piernas, brazos, bate grande y rostro visible',()=>{
 const models=[],r={
  add(...args){models.push({kind:'add',args})},
  pole(...args){models.push({kind:'pole',args})},
  box(...args){models.push({kind:'box',args})},
  ball(...args){models.push({kind:'ball',args})}
 };
 drawBatter(r,-2.3,-5,0,'#aabbcc');
 assert.ok(models.length>=25,'faltan piezas del bateador');
 const batPieces=models.filter(m=>m.kind==='pole'&&m.args[5]==='#aabbcc');
 assert.equal(batPieces.length,1,'un barril grueso visible para el bate');
 assert.ok(batPieces[0].args[3]>=.3&&batPieces[0].args[4]>2);
 const eyes=models.filter(m=>m.kind==='ball'&&m.args[4]==='#202638');
 assert.ok(eyes.length>=2,'los ojos miran hacia la cámara lateral');
});
test('durante el swing el bate pasa por delante del cuerpo',()=>{
 const tip=(phase)=>{
  let coords;const r={add(){},pole(){},box(){},ball(x,y,z,size,col){
   if(size===.71&&col==='#8abcde')coords=[x,y,z];
  }};
  drawBatter(r,-2.3,-5,phase,'#8abcde');return coords;
 };
 const waiting=tip(0),aiming=tip(.42),end=tip(1);
 assert.ok(waiting&&aiming&&end);
 assert.ok(end[2]>aiming[2]&&aiming[2]>waiting[2]);
 assert.ok(waiting[1]>end[1]);
});
