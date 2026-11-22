import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentBlockedByBox,buildingObscuresBall,buildingAt,drawBaseball,drawWorld} from '../src/world.js';
import {Renderer} from '../src/engine.js';
import {readFileSync} from 'node:fs';

test('la línea cámara-pelota detecta interposición e interior de un edificio',()=>{
 const box={min:[-5,0,10],max:[5,12,22]};
 assert.equal(segmentBlockedByBox([0,6,0],{x:0,y:6,z:40},box),true);
 assert.equal(segmentBlockedByBox([0,6,15],{x:0,y:6,z:45},box),true);
 assert.equal(segmentBlockedByBox([15,6,0],{x:15,y:6,z:45},box),false);
 assert.equal(segmentBlockedByBox([0,6,0],{x:0,y:6,z:5},box),false);
 assert.equal(segmentBlockedByBox([0,20,0],{x:0,y:20,z:45},box),false);
});
test('solo se desvanecen edificios realmente cruzados por la cámara',()=>{
 const b=buildingAt(0,1);assert.ok(b);
 const cam=[b.x,b.h*.65,b.z-b.d];
 const target={x:b.x,y:b.h*.65,z:b.z+b.d};
 assert.equal(buildingObscuresBall(cam,target,b),true);
 assert.equal(buildingObscuresBall([b.x+300,b.h*.65,b.z],target,b),false);
 assert.equal(buildingObscuresBall(cam,null,b),false);
});
test('pelota tridimensional blanca con costuras curvas y puntadas rojas en capa superior',()=>{
 const calls=[],r={layer:'opaque',setLayer(layer){this.layer=layer;calls.push(['layer',layer])},
  add(...args){calls.push(['add',this.layer,...args])},
  pole(...args){calls.push(['pole',this.layer,...args])}
 };
 drawBaseball(r,14,6,310,1.2);
 const shell=calls.filter(c=>c[0]==='add'&&c[2]==='baseball');
 const seam=calls.filter(c=>c[0]==='pole'&&['#b52f38','#df4549'].includes(c[7]));
 assert.equal(shell.length,1);
 assert.equal(shell[0][1],'overlay');
 assert.equal(shell[0][9],'#fffdf5');
 assert.ok(seam.length>=65,'faltan costuras y puntos de béisbol');
 assert.ok(seam.every(c=>c[1]==='overlay'));
 assert.equal(r.layer,'opaque');
});
test('el mundo etiqueta obstáculos oclusores como fantasma y la pelota como overlay',()=>{
 const b=buildingAt(0,1);assert.ok(b);
 const cam=[b.x,b.h*.5,b.z],ball={x:b.x,y:b.h*.5,z:b.z+12,vx:1,vy:1,vz:2};
 const seen={opaque:0,ghost:0,overlay:0};
 const r={layer:'opaque',fogDistance:500,begin(){},setLayer(layer){this.layer=layer},
  add(){seen[this.layer]++},
  box(){seen[this.layer]++},field(){seen[this.layer]++},
  ball(){seen[this.layer]++},pole(){seen[this.layer]++},cone(){seen[this.layer]++}
 };
 drawWorld(r,cam,{state:'flight',ball,clock:1,liveSeconds:.8});
 assert.ok(seen.ghost>0,'el edificio entre cámara y bola debe ser translúcido');
 assert.ok(seen.overlay>65,'el balón y sus costuras deben aparecer en capa superior');
 assert.ok(seen.opaque>50,'el mundo restante debe conservarse visible');
});
test('renderer soporta mezcla, limpieza de profundidad y transparencia por capas',()=>{
 const js=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 assert.match(js,/uniform float uOpacity/);
 assert.match(js,/gl\.depthMask\(false\)/);
 assert.match(js,/gl\.blendFunc\(gl\.SRC_ALPHA,gl\.ONE_MINUS_SRC_ALPHA\)/);
 assert.match(js,/gl\.clear\(gl\.DEPTH_BUFFER_BIT\)/);
 assert.match(js,/baseball:sphere\(14,24\)/);
});
