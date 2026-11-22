import test from 'node:test';
import assert from 'node:assert/strict';
import {lookAt,perspective,mul4} from '../src/engine.js';

function screenPoint(cam,target,point,aspect=.46){
 const vp=mul4(perspective(62*Math.PI/180,aspect,.25,2000),lookAt(cam,target));
 const p=[...point,1],clip=[];
 for(let row=0;row<4;row++){
  let sum=0;
  for(let col=0;col<4;col++)sum+=vp[col*4+row]*p[col];
  clip.push(sum);
 }
 return {x:clip[0]/clip[3],y:clip[1]/clip[3]};
}
test('en iPhone vertical el bateador y el bate están dentro del encuadre',()=>{
 const camera=[-6.7,7.5,-20.5],target=[-.8,3.5,12],aspect=707/1536;
 const head=screenPoint(camera,target,[-2.3,5,-5],aspect);
 const feet=screenPoint(camera,target,[-2.3,.15,-5],aspect);
 const tip=screenPoint(camera,target,[-.8,8.10,-6.25],aspect);
 const pitcher=screenPoint(camera,target,[0,4,21],aspect);
 for(const p of [head,feet,tip,pitcher]){
  assert.ok(p.x>=-.95&&p.x<=.95,'El bateador o el pitcher queda fuera horizontalmente: '+JSON.stringify(p));
  assert.ok(p.y>=-.95&&p.y<=.95,'El bateador o el pitcher queda fuera verticalmente: '+JSON.stringify(p));
 }
 assert.ok(head.x<0&&pitcher.x>head.x,'bateador al lado del pitcher');
 assert.ok(feet.y<head.y,'cuerpo completo visible');
 assert.ok(tip.y>head.y,'bate claramente levantado');
});
test('los grados de la brújula siguen la dirección proyectada en pantalla',()=>{
 const cam=[-6.7,7.5,-20.5],target=[-.8,3.5,12];
 const origin=screenPoint(cam,target,[-2.3,6,20]).x;
 const positive=screenPoint(cam,target,[14,6,20]).x;
 const negative=screenPoint(cam,target,[-18,6,20]).x;
 assert.ok(positive<origin,'un rumbo positivo corresponde a izquierda de pantalla');
 assert.ok(negative>origin,'un rumbo negativo corresponde a derecha de pantalla');
});
