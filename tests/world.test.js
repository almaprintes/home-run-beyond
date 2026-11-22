import test from 'node:test';import assert from 'node:assert/strict';
import {rand,groundAt,roadAt,riverAt,areaAt,collideBuilding,drawWorld,buildingAt,traceBuildingCollision} from '../src/world.js';
import {BaseballGame} from '../src/game.js';
const worldAPI=()=>({buildingAt,traceBuildingCollision});
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
 assert.ok(buildings>100);assert.ok(empty>15);
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
 assert.ok(game.ball.buildingHits===1);
});
