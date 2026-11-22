import test from 'node:test';
import assert from 'node:assert/strict';
import {BIOMES,WORLD_CENTER_X,WORLD_HALF_WIDTH,WORLD_WIDTH,biomeAt,biomeTransitionAt,
 biomeColorAt,boundaryProfileAt,traceSideBoundary} from '../src/biomes.js';
import {drawTerrain,drawSideBoundaries,terrainBaseColor,groundAt,areaAt} from '../src/world.js';
import {BaseballGame} from '../src/game.js';

const color=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const maxDelta=(a,b)=>Math.max(...color(a).map((c,i)=>Math.abs(c-color(b)[i])));

test('13 biomas consecutivos sin huecos, solapamientos ni retrocesos',()=>{
 assert.equal(BIOMES.length,13);
 assert.equal(BIOMES[0].start,0);
 assert.equal(BIOMES.at(-1).end,Infinity);
 for(let i=1;i<BIOMES.length;i++){
  assert.equal(BIOMES[i].start,BIOMES[i-1].end);
  assert.ok(BIOMES[i].transition>=30&&BIOMES[i].transition<=150);
  assert.equal(biomeAt(BIOMES[i].start).id,BIOMES[i].id);
 }
 assert.equal(areaAt(0),'ESTADIO');
 assert.equal(areaAt(900),'CIUDAD');
 assert.equal(areaAt(13000),'REGIÓN VOLCÁNICA');
 assert.equal(areaAt(42000),'GLACIAR');
 assert.equal(groundAt(10,20000).type,'sand');
 assert.equal(groundAt(10,43000).type,'snow');
});
test('el ancho jugable total es 600 m exactos centrados en home',()=>{
 assert.equal(WORLD_WIDTH,600);assert.equal(WORLD_HALF_WIDTH,300);
 assert.equal(WORLD_CENTER_X,-2.3);
 const right=WORLD_CENTER_X+300,left=WORLD_CENTER_X-300;
 assert.equal(traceSideBoundary({x:0,y:10,z:800},{x:100,y:10,z:800}),null);
 for(const [from,to,expected,norm] of [
  [{x:275,y:15,z:800},{x:450,y:15,z:850},right-1.45,-1],
  [{x:-285,y:15,z:800},{x:-450,y:15,z:850},left+1.45,1]
 ]){
  const hit=traceSideBoundary(from,to,1.45);
  assert.ok(hit);assert.equal(hit.kind,'side-boundary');assert.equal(hit.point.x,expected);
  assert.equal(hit.normal.x,norm);assert.ok(hit.t>=0&&hit.t<=1);
  assert.ok(hit.obstacle&&hit.biome);
 }
});
test('cada bioma mantiene obstáculos a ambos lados, incluso en vuelo de 500 m',()=>{
 for(const b of BIOMES){
  const z=Number.isFinite(b.end)?(b.start+b.end)/2:b.start+500;
  const left=boundaryProfileAt(z,-1),right=boundaryProfileAt(z,1);
  for(const profile of [left,right]){
   assert.ok(profile.kind&&profile.height>=25&&profile.thickness>=15);
   assert.ok(/^#[0-9a-f]{6}$/i.test(profile.color));
  }
  const hit=traceSideBoundary({x:290,y:500,z},{x:490,y:500,z},1.45);
  assert.ok(hit,'se atravesó una pared al volar sobre '+b.name);
  assert.equal(hit.biome,b.id);
 }
});
test('transiciones continuas y suaves en TODOS los cambios de bioma',()=>{
 for(let i=1;i<BIOMES.length;i++){
  const border=BIOMES[i].start,half=BIOMES[i].transition/2;
  const t1=biomeTransitionAt(border-half),tm=biomeTransitionAt(border),t2=biomeTransitionAt(border+half);
  assert.ok(t1.active&&t2.active&&tm.active);
  assert.ok(t1.t<=.000001&&t2.t>=.999999);
  assert.ok(Math.abs(tm.t-.5)<1e-9);
  // No hay salto de color, ni en el suelo ni en las paredes de ambos lados.
  assert.ok(maxDelta(biomeColorAt(border-.01),biomeColorAt(border+.01))<2,border+'m: suelo');
  for(const side of [-1,1]){
   const a=boundaryProfileAt(border-.01,side),b=boundaryProfileAt(border+.01,side);
   assert.ok(maxDelta(a.color,b.color)<2,border+'m: pared');
   assert.ok(Math.abs(a.height-b.height)<.25,border+'m: altura');
  }
  assert.ok(maxDelta(terrainBaseColor(border-.01),terrainBaseColor(border+.01))<2);
 }
});
function snap(z,y=85){
 const fields=[],boxes=[],n={pieces:0};
 const renderer={
  field(x,yy,zz,w,d,c,rot=0,material='grass'){fields.push({x,y:yy,z:zz,w,d,c,material})},
  box(x,yy,zz,w,h,d,c){boxes.push({x,y:yy,z:zz,w,h,d,c});n.pieces++},
  ball(){n.pieces++},pole(){n.pieces++},cone(){n.pieces++},
  add(){n.pieces++},setMaterial(){},setLayer(){}
 };
 drawTerrain(renderer,z,0,y,0,null);
 return {fields,boxes,pieces:n.pieces};
}
test('todos los planos de suelo, río, carreteras y parcelas quedan dentro de 600m',()=>{
 for(const z of [40,700,1700,3200,7200,10000,14000,19000,26000,33000,44000]){
  const scene=snap(z);
  assert.ok(scene.fields.length>9,'no se pintó terreno en '+z);
  for(const f of scene.fields){
   assert.ok(f.x-f.w/2>=WORLD_CENTER_X-WORLD_HALF_WIDTH-.01,'suelo desborda izquierda en '+z);
   assert.ok(f.x+f.w/2<=WORLD_CENTER_X+WORLD_HALF_WIDTH+.01,'suelo desborda derecha en '+z);
  }
  assert.ok(scene.pieces<6000,'demasiada geometría a '+z+' m');
 }
});
test('las barreras laterales son visibles y su altura cambia paulatinamente',()=>{
 const calls=[],r={box(...a){calls.push(a)},setMaterial(){},pole(){},cone(){},ball(){}};
 drawSideBoundaries(r,8500,50);
 const walls=calls.filter(a=>a[4]>=25&&a[5]>=32&&a[3]>=15);
 assert.ok(walls.length>20);
 assert.ok(walls.some(a=>a[0]>WORLD_CENTER_X+290));
 assert.ok(walls.some(a=>a[0]<WORLD_CENTER_X-290));
 assert.ok(walls.length<300);
});
test('choque rápido contra ambos bordes rebota hacia el interior sin atravesar el mundo',()=>{
 for(const side of [-1,1]){
  const game=Object.create(BaseballGame.prototype);
  game.state='flight';game.simElapsed=0;game.audio={impact(){}};
  game.ball={x:WORLD_CENTER_X+side*285,y:500,z:8600,
   vx:side*2100,vy:0,vz:40,bounces:0,maxZ:8600};
  game.finishShot=()=>{game.state='rest'};
  game.simulateStep(.02);
  assert.ok(game.ball.x>=WORLD_CENTER_X-WORLD_HALF_WIDTH+1.45-1e-6);
  assert.ok(game.ball.x<=WORLD_CENTER_X+WORLD_HALF_WIDTH-1.45+1e-6);
  assert.ok(game.ball.vx*side<0,'no rebotó hacia dentro');
  assert.ok(Math.abs(game.ball.vx)<2100,'el choque añadió energía');
  assert.equal(game.ball.bounces,1);
  assert.equal(game.state,'flight');
 }
});
