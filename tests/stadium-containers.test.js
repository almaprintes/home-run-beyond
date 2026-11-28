import test from 'node:test';
import assert from 'node:assert/strict';
import {stadiumContainers,stadiumContainerParts,traceStadiumContainerCollision,
 surfaceBelowBall,drawWorld,stadiumContainersObscurePoint} from '../src/world.js';
import {BaseballGame} from '../src/game.js';

const R=1.45;
function fromLocal(c,x,y,z){
 const co=Math.cos(c.yaw),si=Math.sin(c.yaw);
 return {x:c.x+co*x+si*z,y,z:c.z-si*x+co*z};
}
function localNormal(c,axis,sign=1){
 const co=Math.cos(c.yaw),si=Math.sin(c.yaw);
 return axis==='x'?{x:sign*co,y:0,z:-sign*si}:
  axis==='z'?{x:sign*si,y:0,z:sign*co}:{x:0,y:sign,z:0};
}
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;

test('20 contenedores: mismo catálogo geométrico para render y colisiones',()=>{
 const containers=stadiumContainers(),parts=stadiumContainerParts();
 assert.equal(containers.length,20);
 assert.deepEqual(parts.map(p=>[p.kind,p.w,p.h,p.d,p.y]),[
  ['stadium-container-body',13,7,10,4.2],
  ['stadium-container-trim',14,1.2,11,7.9],
  ['stadium-container-top',13,1.3,12,10]
 ]);
 const faces=[];
 const renderer={
  fogDistance:500,begin(){},add(){},field(){},pole(){},ball(){},cone(){},
  setMaterial(){},setLayer(){},
  box(...args){if(args[6]==='#315b71'||args[6]==='#e6a95c'||args[6]==='#264259')faces.push(args)}
 };
 drawWorld(renderer,[0,25,50],{state:'menu',clock:0});
 for(const c of containers)for(const part of parts){
  assert.ok(faces.some(a=>Math.abs(a[0]-c.x)<1e-7&&Math.abs(a[2]-c.z)<1e-7&&
   a[3]===part.w&&a[4]===part.h&&a[5]===part.d&&a[6]===part.color&&a[7]===c.yaw),
   'la pieza dibujada difiere del colisionador: contenedor '+c.id+' / '+part.kind);
 }
});
test('frentes, extremos y cubiertas de TODOS los contenedores son sólidos',()=>{
 for(const c of stadiumContainers()){
  for(const [axis,y,start,end,normalAxis,sign] of [
   ['x',4.2,-11,0,'x',-1],['x',4.2,11,0,'x',1],
   ['z',4.2,-14,0,'z',-1],['z',4.2,14,0,'z',1],
   ['y',0,18,4.2,'y',1]
  ]){
   const a=axis==='x'?fromLocal(c,start,y,0):axis==='z'?fromLocal(c,0,y,start):fromLocal(c,0,start,0);
   const b=axis==='x'?fromLocal(c,end,y,0):axis==='z'?fromLocal(c,0,y,end):fromLocal(c,0,end,0);
   const hit=traceStadiumContainerCollision(a,b,R);
   assert.ok(hit,'falta colisión en '+c.id+' '+axis+' '+start);
   assert.ok(hit.t>=0&&hit.t<=1);
   assert.ok(hit.kind.startsWith('stadium-container-'));
   assert.equal(hit.material,'metal');
   assert.ok(dot(hit.normal,localNormal(c,normalAxis,sign))>.99,
    'normal girada equivocada en '+c.id+' '+axis+' '+start);
  }
 }
});
test('barrido continuo detecta alta velocidad y descarta trayectorias lejanas o altas',()=>{
 const c=stadiumContainers()[8];
 const a=fromLocal(c,-40,4.2,0),b=fromLocal(c,40,4.2,0);
 const hit=traceStadiumContainerCollision(a,b,R);
 assert.ok(hit&&hit.t<.5,'un golpe rápido atraviesa el contenedor');
 const sky=traceStadiumContainerCollision(fromLocal(c,-40,35,0),fromLocal(c,40,35,0),R);
 assert.equal(sky,null,'no debe existir techo invisible a 35 metros');
 const empty=traceStadiumContainerCollision({x:0,y:5,z:0},{x:0,y:6,z:0},R);
 assert.equal(empty,null,'el centro del campo debe estar libre');
});
test('la sombra de la pelota se proyecta sobre el techo visible, no sobre el césped',()=>{
 const c=stadiumContainers()[8],p=fromLocal(c,0,22,0);
 const below=surfaceBelowBall(p);
 assert.equal(below.type,'stadium-container');
 assert.ok(Math.abs(below.y-10.65)<.0001);
 const under=surfaceBelowBall({...p,y:5});
 assert.ok(under.y<8,'el techo no da sombra bajo el objeto');
});
test('la pelota rebota de verdad en paredes y tapas, sin atravesar en un fotograma',()=>{
 for(const side of ['wall','roof']){
  const c=stadiumContainers()[8];
  const start=side==='wall'?fromLocal(c,-11,4.2,0):fromLocal(c,0,25,0);
  const velocity=side==='wall'?localNormal(c,'x',1):{x:0,y:-1,z:0};
  const game=Object.create(BaseballGame.prototype);
  game.state='flight';game.simElapsed=0;game.save={reducedEffects:true};
  game.ball={...start,vx:velocity.x*110,vy:velocity.y*110,vz:velocity.z*110,
   bounces:0,maxZ:0,encounters:{},impactAge:99};
  game.audio={impact(){},land(){}};game.finishShot=()=>{game.state='rest'};
  game.simulateStep(.20);
  const result=game.ball;
  assert.ok(result.bounces>=1,'no rebotó: '+side);
  assert.equal(game.state,'flight','el choque no debe terminar el batazo');
  assert.equal(result.impactMaterial,'metal');
  assert.ok(result.lastCollision.includes('CONTENEDOR'));
  const outgoing={x:result.vx,y:result.vy,z:result.vz};
  assert.ok(dot(outgoing,velocity)<0,'la pelota no invirtió el movimiento: '+side);
 }
});

test('all 20 rotated containers occlude the ball and shadow only when actually between the camera and the point',()=>{
 for(const c of stadiumContainers()){
  for(const axis of ['x','z']){
   const pt=(n,y)=>axis==='x'?fromLocal(c,n,y,0):fromLocal(c,0,y,n);
   for(const sign of [-1,1]){
    // Stay in the gap between neighbouring containers, not inside the next one.
    const cam=pt(sign*10.3,4.2),behind=pt(-sign*12,4.2),front=pt(sign*10,4.2);
    assert.equal(stadiumContainersObscurePoint(cam,behind),true,c.id+' '+axis+' '+sign);
    assert.equal(stadiumContainersObscurePoint(cam,front),false,'front '+c.id);
   }
  }
  assert.equal(stadiumContainersObscurePoint(fromLocal(c,0,25,0),fromLocal(c,0,12.1,0)),false);
  assert.equal(stadiumContainersObscurePoint(fromLocal(c,0,25,0),fromLocal(c,0,4.2,0)),true);
  assert.equal(stadiumContainersObscurePoint(fromLocal(c,-19,20,0),fromLocal(c,19,20,0)),false);
 }
 assert.equal(stadiumContainersObscurePoint([0,5,0],{x:0,y:5,z:30}),false);
});
test('opaque container parts draw in solid layer and fallback baseball is omitted behind them',()=>{
 const c=stadiumContainers()[9],cam=fromLocal(c,0,4.2,-19),behind=fromLocal(c,0,4.2,12);
 const calls=[],r={layer:'opaque',begin(){},setLayer(v){this.layer=v},setMaterial(){},field(){},ball(){},cone(){},pole(){},box(...args){calls.push([this.layer,'box',...args])},add(...args){calls.push([this.layer,'add',...args])}};
 drawWorld(r,[cam.x,cam.y,cam.z],{state:'flight',clock:1,ball:behind});
 const parts=calls.filter(a=>a[1]==='box'&&stadiumContainers().some(c=>Math.abs(a[2]-c.x)<1e-7&&Math.abs(a[4]-c.z)<1e-7&&a[9]===c.yaw)&&stadiumContainerParts().some(p=>a[3]===p.y&&a[5]===p.w&&a[6]===p.h&&a[7]===p.d&&a[8]===p.color));
 assert.equal(parts.length,60);assert.ok(parts.every(a=>a[0]==='solid'));
 assert.equal(calls.filter(a=>a[1]==='add'&&a[2]==='baseball'&&a[0]==='overlay').length,0);
 calls.length=0;
 drawWorld(r,[cam.x,cam.y,cam.z],{state:'flight',clock:1,ball:fromLocal(c,0,4.2,-10)});
 assert.equal(calls.filter(a=>a[1]==='add'&&a[2]==='baseball'&&a[0]==='overlay').length,1);
});
