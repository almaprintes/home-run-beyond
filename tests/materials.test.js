import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Renderer,MATERIAL_IDS} from '../src/engine.js';
import {drawWorld} from '../src/world.js';

function mockGL(){
 return {
  VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
  ARRAY_BUFFER:34962,STATIC_DRAW:35044,DYNAMIC_DRAW:35048,FLOAT:5126,
  DEPTH_TEST:2929,LEQUAL:515,CULL_FACE:2884,BLEND:3042,
  SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,
  TRIANGLES:4,
  createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,
  createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>true,
  getUniformLocation:()=>({}),createVertexArray:()=>({}),bindVertexArray(){},
  createBuffer:()=>({}),bindBuffer(){},bufferData(){},enableVertexAttribArray(){},
  vertexAttribPointer(){},vertexAttribDivisor(){},enable(){},depthFunc(){},disable(){},
  viewport(){},clearColor(){},clear(){},useProgram(){},uniformMatrix4fv(){},
  uniform3f(){},uniform1f(){},uniform1i(){},depthMask(){},blendFunc(){},
  drawArraysInstanced(){}
 };
}

test('atlas real tiene las ocho texturas de 192×192 en 4×2 mosaicos',()=>{
 const png=readFileSync(new URL('../assets/materials-atlas.png',import.meta.url));
 assert.equal(png.subarray(1,4).toString('ascii'),'PNG');
 assert.equal(png.readUInt32BE(16),768);
 assert.equal(png.readUInt32BE(20),384);
 assert.ok(png.length>20000&&png.length<500000,'atlas demasiado grande');
 assert.deepEqual(Object.values(MATERIAL_IDS),[0,1,2,3,4,5,6,7,8]);
});

test('el motor añade un identificador de material a cada instancia',()=>{
 const old=globalThis.window;
 globalThis.window={devicePixelRatio:2};
 try{
  const canvas={clientWidth:390,clientHeight:844,width:0,height:0,getContext:mockGL};
  const renderer=new Renderer(canvas);
  renderer.begin();
  renderer.setMaterial('brick');renderer.box(0,5,0,10,10,10,'#c69778');
  renderer.setMaterial('asphalt');renderer.box(15,0,0,12,.1,10,'#48535b');
  renderer.setMaterial('plain');renderer.field(0,0,0,100,100,'#528b58');
  assert.equal(renderer.meshes.box.arr.length,40,'cada caja contiene 20 valores');
  assert.equal(renderer.meshes.box.arr[19],MATERIAL_IDS.brick);
  assert.equal(renderer.meshes.box.arr[39],MATERIAL_IDS.asphalt);
  assert.equal(renderer.meshes.field.arr[19],MATERIAL_IDS.grass);
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old}
});

test('hierba, ladrillo, asfalto, tejas y hormigón se usan en los objetos dibujados',()=>{
 const old=globalThis.window;
 globalThis.window={devicePixelRatio:1};
 try{
  const renderer=new Renderer({clientWidth:390,clientHeight:844,width:0,height:0,getContext:mockGL});
  drawWorld(renderer,[0,24,600],{state:'ready',clock:0,pitch:0,swing:0,batColor:'#ffc55a'});
  const ids=new Set();
  for(const mesh of Object.values(renderer.meshes)){
   for(const layer of ['arr','ghost','overlay']){
    const a=mesh[layer];for(let i=19;i<a.length;i+=20)ids.add(a[i]);
   }
  }
  for(const material of ['grass','brick','asphalt','roof','concrete']){
   assert.ok(ids.has(MATERIAL_IDS[material]),'falta textura '+material);
  }
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old}
});

test('fragment shader proyecta UV de mundo y preserva transparencias de rayos X',()=>{
 const code=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 assert.match(code,/layout\(location=7\) in float aMaterial/);
 assert.match(code,/flat in int vMaterial/);
 assert.match(code,/texture\(uAtlas,/);
 assert.match(code,/vWorld\.xz/);
 assert.match(code,/gl\.uniform1f\(this\.uniforms\.uOpacity,\.18\)/);
 assert.match(code,/vertices\.length\/20/);
 assert.match(code,/atlas\.src='\.\/assets\/materials-atlas\.png\?v=0\.14\.0'/);
});
