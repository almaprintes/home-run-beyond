import test from 'node:test';
import assert from 'node:assert/strict';
import {drawTerrain,terrainBaseColor,terrainPatchMaterial,riverAt,groundAt,RIVER_HALF_WIDTH} from '../src/world.js';
import {readFileSync} from 'node:fs';

function snapshot(z=700,y=60,x=0){
 const fields=[],stats={detail:0};
 const r={
  setLayer(){},setMaterial(){},
  field(x,y,z,w,d,color,ry=0,material='grass'){fields.push({x,y,z,w,d,color,material,ry})},
  add(){stats.detail++},box(){stats.detail++},pole(){stats.detail++},ball(){stats.detail++},cone(){stats.detail++}
 };
 drawTerrain(r,z,x,y,0,null);
 return {fields,detail:stats.detail};
}
const inside=(p,x,z)=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2;

test('el suelo siempre tiene una capa verde continua incluso lejos del barrio',()=>{
 for(const [x,y,z] of [[0,25,427],[0,80,704],[850,120,1350],[1700,400,3600]]){
  const {fields}=snapshot(z,y,x);
  const underlay=fields.filter(p=>p.material==='grass'&&p.w>=9000);
  assert.equal(underlay.length,1,'falta la base verde continua');
  for(const zz of [z-2500,z-800,z,z+1500,z+3700]){
   assert.ok(underlay.some(p=>inside(p,x,zz)),'vacío azul en '+x+'/'+zz);
  }
  assert.equal(underlay[0].color,'#608a5c');
 }
});

test('el río ya no es una alfombra azul de 2500 metros bajo la ciudad',()=>{
 const {fields}=snapshot(704,50,0);
 const water=fields.filter(p=>p.material==='water');
 assert.ok(water.length>0,'el río central sigue existiendo');
 assert.ok(water.every(p=>p.w<=RIVER_HALF_WIDTH*2),'río demasiado ancho');
 assert.ok(water.every(p=>p.z>1600&&p.z<1750),'agua fuera del cauce');
 assert.ok(!water.some(p=>inside(p,0,704)),'la ciudad se ha inundado de azul');
 assert.ok(!water.some(p=>inside(p,850,1680)),'agua fuera de su orilla');
 const bank=fields.filter(p=>p.material==='dirt'&&p.z===1680);
 assert.ok(bank.length>=1&&bank.some(p=>p.w>1100),'faltan orillas de tierra');
 assert.equal(groundAt(0,1680).type,'water');
 assert.equal(groundAt(850,1680).type,'grass');
 assert.equal(riverAt(1680,850),false);
});

test('en la ciudad existen solares visibles de tierra y pavimento además del césped',()=>{
 const {fields,detail}=snapshot(700,55,0);
 const urban=fields.filter(p=>p.z>230&&p.z<1300&&p.w<900);
 const types=new Set(urban.map(p=>p.material));
 for(const required of ['grass','dirt','paving'])
  assert.ok(types.has(required),'falta '+required+' en suelo urbano');
 assert.ok(fields.filter(p=>p.material==='grass').length>14,'césped sin detalle');
 assert.ok(fields.length<450&&detail<12000,'demasiadas parcelas para un iPhone');
});

test('las parcelas son deterministas y los colores mantienen el terreno verde',()=>{
 const a=snapshot(704,60,0),b=snapshot(704,60,0);
 assert.deepEqual(a.fields,b.fields,'parpadeos por cambiar parcelas entre fotogramas');
 assert.equal(terrainBaseColor(700),'#659c63');
 assert.equal(terrainBaseColor(5000),'#759a68');
 for(let i=-4;i<=4;i++){
  const material=terrainPatchMaterial(4,i);
  assert.ok(['paving','dirt','grass'].includes(material));
 }
});

test('el shader no transforma el césped lejano en azul cielo',()=>{
 const src=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 assert.match(src,/if\(vMaterial==1 \|\| vMaterial==8\)/);
 assert.match(src,/f=\.34\*smoothstep\(uFogDistance\*\.95,uFogDistance\*6\.,vFog\)/);
 assert.match(src,/gl\.clearColor\(0\.48,\.76,\.84,1\)/);
});
