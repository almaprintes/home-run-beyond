import test from 'node:test';
import assert from 'node:assert/strict';
import {drawTerrain,drawWorld,terrainCoverage} from '../src/world.js';
import {WORLD_CENTER_X,WORLD_WIDTH,WORLD_HALF_WIDTH} from '../src/biomes.js';
import {readFileSync} from 'node:fs';
function capture(z=700,y=65,x=0){
 const fields=[],stats={detail:0};
 const r={setMaterial(){},setLayer(){},field(px,py,pz,w,d,color,rotation=0,material='grass'){fields.push({x:px,y:py,z:pz,w,d,color,material})},
  add(){stats.detail++},box(){stats.detail++},ball(){stats.detail++},pole(){stats.detail++},cone(){stats.detail++}};
 drawTerrain(r,z,x,y,0,null);
 return {fields,detail:stats.detail};
}
const contains=(f,x,z)=>Math.abs(x-f.x)<=f.w/2&&Math.abs(z-f.z)<=f.d/2;
test('el terreno cubre todo el corredor legal y el horizonte, sin ser infinito lateralmente',()=>{
 const {fields}=capture(650,72,200);
 const underlays=fields.filter(f=>f.w===WORLD_WIDTH&&f.d>=9000);
 assert.equal(underlays.length,1);
 assert.equal(underlays[0].x,WORLD_CENTER_X);
 for(const x of [WORLD_CENTER_X-298,0,WORLD_CENTER_X+298]){
  for(const z of [50,270,507,650,900,1300,1750,2550])
   assert.ok(fields.some(f=>contains(f,x,z)),`terreno ausente en ${x}/${z}`);
 }
 assert.ok(fields.every(f=>f.w<=600),'existen planos superiores a los 600 m');
});
test('cámara a diferentes alturas mantiene suelo acotado y no cambia su eje',()=>{
 for(const [x,y,z] of [[-290,25,520],[289,180,740],[0,340,1150],[100,500,3400]]){
  const {fields}=capture(z,y,x),coverage=terrainCoverage(z,y);
  assert.ok(coverage.ahead>=1900&&coverage.behind>=750);
  const base=fields.find(f=>f.w===WORLD_WIDTH&&f.d>=9000);
  assert.ok(base);
  for(const zz of [z,z+500,z+950,z+1500])
   assert.ok(contains(base,WORLD_CENTER_X+290,zz));
  assert.ok(fields.every(f=>f.x-f.w/2>=WORLD_CENTER_X-WORLD_HALF_WIDTH-.01));
  assert.ok(fields.every(f=>f.x+f.w/2<=WORLD_CENTER_X+WORLD_HALF_WIDTH+.01));
 }
});
test('mantener renderizado local y bandas longitudinales suaves protege los FPS',()=>{
 const a=capture(700,75),b=capture(700,380);
 assert.ok(b.fields.length>a.fields.length,'la cámara alta debe ver más terreno');
 assert.ok(b.detail<12000);
 const coverage=terrainCoverage(700,380);
 assert.equal(coverage.detail,370);
 const strips=a.fields.filter(f=>f.w===WORLD_WIDTH&&f.d<100);
 assert.ok(strips.length>30,'biomas no pueden cambiar solo cada 200 m');
});
test('césped, fondo y paredes no se vuelven transparentes en vuelo',()=>{
 const fields=[],r={layer:'opaque',fogDistance:0,begin(){},setLayer(layer){this.layer=layer},
  setMaterial(){},field(x,y,z,w,d,color,rot,material='grass'){fields.push({layer:this.layer,material,w})},
  add(){},box(){},ball(){},pole(){},cone(){}};
 drawWorld(r,[0,60,690],{state:'flight',ball:{x:0,y:20,z:710},clock:2,liveSeconds:1});
 assert.ok(fields.length>=20);
 assert.ok(fields.every(f=>f.layer==='opaque'));
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(world,/WORLD_WIDTH,50\.3/);
 assert.match(world,/drawSideBoundaries\(r,viewZ,viewY\)/);
 const engine=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 assert.match(engine,/gl\.clearColor\(0\.48,\.76,\.84,1\)/);
});
