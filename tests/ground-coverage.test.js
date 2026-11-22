import test from 'node:test';
import assert from 'node:assert/strict';
import {drawTerrain,drawWorld,terrainCoverage} from '../src/world.js';
import {Renderer,MATERIAL_IDS} from '../src/engine.js';
import {readFileSync} from 'node:fs';

function captureTerrain(z,y=65,x=0){
 const fields=[],counters={detail:0};
 const r={
  setMaterial(){},setLayer(){},
  field(px,py,pz,w,d,color,rotation=0,material='grass'){
   fields.push({x:px,y:py,z:pz,w,d,color,material});
  },
  add(){counters.detail++},box(){counters.detail++},
  ball(){counters.detail++},pole(){counters.detail++},cone(){counters.detail++}
 };
 drawTerrain(r,z,x,y,0,null);
 return {fields,counters};
}
const contains=(field,x,z)=>Math.abs(x-field.x)<=field.w/2 &&
                                Math.abs(z-field.z)<=field.d/2;

test('ciudad 0.70 km: el terreno cubre de forma continua carreteras, edificios y horizonte',()=>{
 const camera={x:600,y:72,z:650};
 const {fields}=captureTerrain(camera.z,camera.y,camera.x);
 const ground=fields.filter(f=>f.material==='grass'&&f.w>=3000);
 assert.ok(ground.length>=13,'se sigue cortando el suelo a pocos cientos de metros');
 for(const z of [50,270,427,507,650,704,900,1300,1750,2050,2550]){
  assert.ok(ground.some(f=>contains(f,600,z)), 'suelo ausente en z='+z);
 }
 assert.ok(ground.every(f=>f.color!=='#4badd1'),'césped confundido con agua');
 assert.ok(ground.every(f=>f.y<5),'campo urbano elevado incorrectamente');
});

test('cámara alta o desviada lateralmente mantiene el suelo bajo la pelota',()=>{
 for(const [x,y,z] of [[-900,25,520],[1190,180,740],[1500,340,1150],[2500,500,3400]]){
  const {fields}=captureTerrain(z,y,x);
  const ground=fields.filter(f=>f.material==='grass'&&f.w>=3000);
  const coverage=terrainCoverage(z,y);
  assert.ok(coverage.ahead>=1900&&coverage.behind>=750);
  for(const testZ of [z,z+500,z+950,z+1500]){
   assert.ok(ground.some(f=>contains(f,x,testZ)), 'zona azul a '+x+'/'+testZ);
  }
 }
});

test('el radio de detalle no crece con el horizonte y protege FPS de iPhone',()=>{
 const a=captureTerrain(700,75,0),b=captureTerrain(700,380,0);
 const grassA=a.fields.filter(f=>f.material==='grass'&&f.w>=3000);
 const grassB=b.fields.filter(f=>f.material==='grass'&&f.w>=3000);
 assert.ok(grassB.length>grassA.length,'el terreno debe ampliarse cuando sube cámara');
 assert.ok(b.counters.detail<12000,'demasiada geometría extra al ampliar el terreno');
 const bounds=terrainCoverage(700,380);
 assert.equal(bounds.detail,370,'los detalles deben seguir limitados a su radio habitual');
});

test('niebla del suelo diferenciada y framebuffer opaco',()=>{
 const engine=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 assert.match(engine,/if\(vMaterial==1 \|\| vMaterial==8\)/);
 assert.match(engine,/smoothstep\(uFogDistance\*\.95,uFogDistance\*3\.6,vFog\)/);
 assert.match(engine,/gl\.clearColor\(0\.48,\.76,\.84,1\)/);
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(world,/r\.field\(viewX,h-\.18,mid,3200,202,g,0,'grass'\)/);
 assert.match(world,/if\(Math\.abs\(mid-viewZ\)>coverage\.detail\+160\)continue/);
});

test('el terreno se mantiene opaco durante vuelo y permite la transparencia solo en los edificios',()=>{
 const planes=[];
 const r={
  layer:'opaque',fogDistance:0,begin(){},
  setLayer(layer){this.layer=layer},
  setMaterial(){},
  field(x,y,z,w,d,color,rot,material='grass'){planes.push({layer:this.layer,material,z})},
  add(){},box(){},ball(){},pole(){},cone(){}
 };
 drawWorld(r,[0,60,690],{state:'flight',ball:{x:0,y:20,z:710},clock:2,liveSeconds:1});
 const grass=planes.filter(f=>f.material==='grass');
 assert.ok(grass.length>=12);
 assert.ok(grass.every(f=>f.layer==='opaque'),'terreno transparente durante el vuelo');
});
