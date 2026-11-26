import test from 'node:test';
import assert from 'node:assert/strict';
import {drawTerrain,terrainBaseColor,terrainPatchMaterial,riverAt,groundAt,RIVER_HALF_WIDTH} from '../src/world.js';
import {WORLD_CENTER_X,WORLD_WIDTH,BIOMES,biomeColorAt,biomeTransitionAt} from '../src/biomes.js';
function snapshot(z=700,y=60,x=0){
 const fields=[],stats={detail:0};
 const r={setLayer(){},setMaterial(){},
  field(x,y,z,w,d,color,ry=0,material='grass'){fields.push({x,y,z,w,d,color,material,ry})},
  add(){stats.detail++},box(){stats.detail++},pole(){stats.detail++},ball(){stats.detail++},cone(){stats.detail++}};
 drawTerrain(r,z,x,y,0,null);
 return {fields,detail:stats.detail};
}
const inside=(p,x,z)=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2;
test('una sola base opaca de 600 metros anclada al centro del bateador',()=>{
 for(const [x,y,z] of [[0,25,427],[0,80,704],[260,120,1350],[-260,400,3600]]){
  const {fields}=snapshot(z,y,x);
  const underlay=fields.filter(p=>p.w===WORLD_WIDTH&&p.d>=9000);
  assert.equal(underlay.length,1);
  assert.equal(underlay[0].x,WORLD_CENTER_X);
  for(const zz of [z-2500,z-800,z,z+1500,z+3700])
   assert.ok(underlay.some(p=>inside(p,WORLD_CENTER_X,zz)),'suelo vacío en '+zz);
 }
});
test('el cauce y sus orillas no se salen del ancho disponible',()=>{
 const {fields}=snapshot(704,50,0);
 const water=fields.filter(p=>p.material==='water'&&p.z!==1110);
 assert.ok(water.length>0);
 assert.ok(water.every(p=>p.w<=RIVER_HALF_WIDTH*2));
 assert.ok(water.every(p=>p.z>1600&&p.z<1750));
 assert.ok(!water.some(p=>inside(p,0,704)));
 assert.ok(!water.some(p=>inside(p,280,1680)),'agua fuera de la orilla');
 const bank=fields.filter(p=>p.material==='dirt'&&p.z===1680);
 assert.ok(bank.some(p=>p.w===590));
 assert.equal(groundAt(0,1680).type,'water');
 assert.equal(groundAt(280,1680).type,'grass');
 assert.equal(riverAt(1680,280),false);
});
test('ciudad contiene diferentes materiales sin exceder corredor ni FPS',()=>{
 const {fields,detail}=snapshot(700,55,0);
 const types=new Set(fields.filter(p=>p.z>230&&p.z<1300).map(p=>p.material));
 for(const mat of ['grass','dirt','paving'])assert.ok(types.has(mat));
 assert.ok(fields.length<800&&detail<12000);
 assert.ok(fields.every(p=>p.w<=600));
});
test('colores de bioma deterministicos; mezcla progresiva en cada transición',()=>{
 for(const z of [704,5000,8600,13000,19000,27000,37000,47000]){
  assert.equal(terrainBaseColor(z),terrainBaseColor(z));
  assert.equal(terrainBaseColor(z),biomeColorAt(z));
 }
 assert.equal(terrainBaseColor(700),'#659c63');
 assert.equal(terrainBaseColor(5000),'#759a68');
 for(let i=1;i<BIOMES.length;i++){
  const edge=BIOMES[i].start;
  assert.equal(biomeTransitionAt(edge).active,true);
  assert.equal(biomeTransitionAt(edge).t,.5);
 }
 for(let i=-4;i<=4;i++)assert.ok(['grass','paving','dirt'].includes(terrainPatchMaterial(4,i)));
});
