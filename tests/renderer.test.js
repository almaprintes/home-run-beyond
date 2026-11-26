import test from 'node:test';import assert from 'node:assert/strict';
import {Renderer,GLASS_OPACITY,sortGlassInstances} from '../src/engine.js';import {drawWorld} from '../src/world.js';
function fakeGL(){let draws=0;const target={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,ARRAY_BUFFER:34962,STATIC_DRAW:35044,DYNAMIC_DRAW:35048,FLOAT:5126,DEPTH_TEST:2929,LEQUAL:515,CULL_FACE:2884,BLEND:3042,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,TRIANGLES:4,createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>true,getUniformLocation:()=>({}),createVertexArray:()=>({}),bindVertexArray(){},createBuffer:()=>({}),bindBuffer(){},bufferData(){},enableVertexAttribArray(){},vertexAttribPointer(){},vertexAttribDivisor(){},enable(){},depthFunc(){},disable(){},viewport(){},clearColor(){},clear(){},useProgram(){},uniformMatrix4fv(){},uniform3f(){},uniform1f(){},depthMask(){},blendFunc(){},drawArraysInstanced(_p,_offset,_count,instances){draws+=instances}};return {gl:target,getDraws:()=>draws}}
test('motor WebGL genera lotes instanciados válidos sin excepciones',()=>{globalThis.window={devicePixelRatio:2};const {gl,getDraws}=fakeGL();const canvas={clientWidth:390,clientHeight:844,getContext:()=>gl,width:0,height:0};const renderer=new Renderer(canvas);drawWorld(renderer,[12,16,-34],{state:'pitching',pitch:.5,swing:0,batColor:'#ffc55a'});assert.ok(renderer.totalInstances>100);renderer.render([12,16,-34],[-1,2,28],60);assert.ok(getDraws()>100);renderer.setQuality(false);assert.ok(canvas.width<=390*1.2);delete globalThis.window;});
// El tráfico debe pasar por el render WebGL2 real (instancing y depth buffer),
// no por el canvas de los sprites ni imágenes TDR.
test('coches 3D procedimentales se incorporan al buffer WebGL instanciado',()=>{
 globalThis.window={devicePixelRatio:2};
 try{
  const {gl,getDraws}=fakeGL();
  const canvas={clientWidth:390,clientHeight:844,getContext:()=>gl,width:0,height:0};
  const renderer=new Renderer(canvas);
  const ball={x:0,y:25,z:265,vx:2,vy:4,vz:25,spin:{angle:0}};
  drawWorld(renderer,[0,22,245],{state:'flight',clock:3,ball,liveSeconds:3});
  assert.ok(renderer.meshes.carTire.solid.length>=4*20,'neumáticos instanciados');
  assert.ok(renderer.meshes.carRim.solid.length>=4*20,'llantas instanciadas');
  const bodies=['hatch','sedan','suv','pickup'].reduce((n,k)=>n+renderer.meshes['carBody_'+k].solid.length,0);
  assert.ok(bodies>0,'carrocerías tridimensionales en la capa sólida');
  assert.equal(renderer.meshes.carTire.ghost.length,0);
  assert.equal(renderer.meshes.carRim.ghost.length,0);
  assert.ok(['hatch','sedan','suv','pickup'].every(k=>renderer.meshes['carBody_'+k].ghost.length===0));
  renderer.render([0,22,245],[0,4,300],58);
  assert.ok(getDraws()>100);
 }finally{delete globalThis.window}
});

test('glass is a dedicated sorted alpha pass, independent of ghost and solid layers',()=>{
 globalThis.window={devicePixelRatio:1};
 try{
  const {gl}=fakeGL(),opacities=[],writes=[],draws=[];
  gl.uniform1f=(u,v)=>opacities.push(v);gl.depthMask=v=>writes.push(v);
  gl.drawArraysInstanced=(...a)=>draws.push(a);
  const r=new Renderer({clientWidth:390,clientHeight:844,getContext:()=>gl});
  r.begin();r.setMaterial('glass');r.setLayer('glass');
  r.box(0,5,30,6,4,.09,'#629cb8');r.box(0,5,90,6,4,.09,'#629cb8');
  assert.equal(GLASS_OPACITY,.75);
  assert.equal(r.meshes.box.glass.length,40);assert.equal(r.meshes.box.arr.length,0);
  const sorted=sortGlassInstances(r.meshes.box.glass,[1,0,0,0,0,1,0,0,0,0,-1,0,0,0,0,1]);
  assert.equal(sorted[14],90);assert.equal(sorted[34],30);
  r.render([0,5,0],[0,5,100],60);
  assert.ok(opacities.includes(.75));assert.deepEqual(writes,[false,true]);assert.equal(draws.length,1);
  r.begin();assert.equal(r.meshes.box.glass.length,0);
 }finally{delete globalThis.window}
});
