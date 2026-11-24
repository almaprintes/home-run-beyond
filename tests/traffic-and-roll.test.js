import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRAFFIC_VEHICLES,ROAD_CENTERS,TRAFFIC_HALF_SPAN,roadTraffic,
 visibleRoadTraffic,drawProceduralTraffic} from '../src/traffic.js';
import {opaqueBaseballPixels,BALL_SURFACE_SIZE,BatterSprites} from '../src/sprites.js';
import {BaseballGame,groundRollRetention} from '../src/game.js';
import {groundAt} from '../src/world.js';

test('seis coches procedimentales 3D, sin sprites ni vehículos de TDR',()=>{
 assert.equal(TRAFFIC_VEHICLES.length,6);
 assert.deepEqual(new Set(TRAFFIC_VEHICLES.map(v=>v.kind)),new Set(['hatch','sedan','suv','pickup']));
 for(const v of TRAFFIC_VEHICLES){
  assert.ok(!('src' in v),'tráfico independiente de archivos de imagen');
  assert.ok(v.length>=7&&v.width>3&&v.radius>.8);
  assert.ok(v.color.startsWith('#'));
 }
 const src=readFileSync(new URL('../src/traffic.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const sprites=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.doesNotMatch(src,/drawImage|\.webp|Billboard|three-quarter|helix_spark/);
 assert.doesNotMatch(sprites,/drawTrafficSprites|trafficImages|three-quarter/);
 assert.doesNotMatch(sw,/assets\/traffic\//);
 assert.match(world,/drawProceduralTraffic\(r,visibleRoadTraffic/);
});
test('dos sentidos, carriles rectos y rodadura física independiente de los FPS',()=>{
 assert.equal(ROAD_CENTERS.length,9);
 assert.ok(TRAFFIC_HALF_SPAN>280,'los coches reaparecen fuera de la carretera');
 const wrap=(n,span)=>((n%span)+span)%span,span=TRAFFIC_HALF_SPAN*2;
 for(const z of ROAD_CENTERS){
  const before=roadTraffic(z,10),after=roadTraffic(z,10.01);
  assert.equal(before.length,6);
  for(let i=0;i<6;i++){
   const a=before[i],b=after[i];
   assert.ok(a.x>=-TRAFFIC_HALF_SPAN&&a.x<TRAFFIC_HALF_SPAN);
   assert.equal(b.z,a.z);
   assert.equal(a.dir,i%2===0?1:-1);
   assert.ok(a.speed>=12&&a.speed<=25);
   assert.ok(Math.abs(wrap(a.x+TRAFFIC_HALF_SPAN+a.dir*a.speed*.01,span)-TRAFFIC_HALF_SPAN-b.x)<1e-8);
   assert.equal(a.wheelSpeed,a.speed/a.radius);
   const spin=wrap(b.wheelAngle-a.wheelAngle,Math.PI*2);
   const expected=wrap(-a.speed*.01/a.radius,Math.PI*2);
   assert.ok(Math.abs(spin-expected)<1e-8,'la rueda rueda, no patina');
   assert.ok(a.length>a.width);
  }
 }
 assert.deepEqual(roadTraffic(123,4),[]);
 assert.deepEqual(roadTraffic(265,Infinity),roadTraffic(265,0));
 assert.ok(visibleRoadTraffic(665,22,240).length>=12);
});
test('cada vehículo tiene carrocería 3D, lunas, techo, cuatro neumáticos y llantas animadas',()=>{
 const calls=[];
 const r={
  setMaterial(name){calls.push(['material',name])},
  add(...args){calls.push(['add',...args])},
  box(...args){calls.push(['box',...args])}
 };
 const right={...roadTraffic(265,1)[0],x:0,z:265};
 const left={...roadTraffic(265,1)[1],x:14,z:265};
 assert.equal(drawProceduralTraffic(r,[right,left],[0,9,265]),2);
 const shapes=calls.filter(c=>c[0]==='add').map(c=>c[1]);
 for(const k of [right.kind,left.kind]){
  assert.ok(shapes.includes('carBody_'+k));
  assert.ok(shapes.includes('carGlass_'+k));
  assert.ok(shapes.includes('carRoof_'+k));
 }
 assert.equal(shapes.filter(v=>v==='carTire').length,8);
 assert.equal(shapes.filter(v=>v==='carRim').length,8);
 assert.equal(shapes.filter(v=>v==='carArch').length,8);
 const wheels=calls.filter(c=>c[0]==='add'&&c[1]==='carTire');
 assert.ok(wheels.every(c=>c[5]>0&&c[6]>0&&c[7]>0));
 assert.ok(wheels.some(c=>c[9]===Math.PI),'el carril opuesto apunta al sentido contrario');
 const frontRight=calls.some(c=>c[0]==='box'&&c[1]>right.x&&c[1]<right.x+right.length);
 const rearLeft=calls.some(c=>c[0]==='box'&&c[1]<left.x&&c[1]>left.x-left.length);
 assert.ok(frontRight&&rearLeft,'faros y pilotos respetan la dirección');
 assert.ok(calls.filter(c=>c[0]==='box').length>=12);
 const engine=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 assert.match(engine,/function carShell\(/);
 assert.match(engine,/function carCabin\(/);
 assert.match(engine,/function wheelTire\(/);
 assert.match(engine,/function wheelAlloy\(/);
 assert.match(engine,/function wheelArch\(/);
 assert.match(engine,/carTire:wheelTire\(\)/);
 const countBefore=calls.length;
 const far={...right,x:200,z:500};
 assert.equal(drawProceduralTraffic(r,[far],[0,9,265]),1);
 assert.equal(calls.slice(countBefore).filter(c=>c[1]==='carRim').length,0,'LOD de ruedas lejanas');
 assert.equal(drawProceduralTraffic(r,[{...right,x:300}],[0,9,265]),0);
});
test('el cuero de la pelota se extiende hasta el borde de la copia UV sin agujeros',()=>{
 const w=24,h=24,source=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const off=(y*w+x)*4;
  const visible=(x-11.5)**2+(y-11.5)**2<81;
  source[off]=visible?240:0;source[off+1]=visible?150:0;
  source[off+2]=visible?120:0;source[off+3]=visible?255:0;
 }
 const opaque=opaqueBaseballPixels(source,w,h);
 assert.ok(opaque.every((v,i)=>i%4!==3||v===255));
 assert.equal(source[3],0,'el asset aprobado no debe alterarse');
 assert.deepEqual([...opaque.slice((12*w+12)*4,(12*w+12)*4+4)],
  [...source.slice((12*w+12)*4,(12*w+12)*4+4)]);
 assert.ok(BALL_SURFACE_SIZE>=96);
});
test('al rodar vuelve la proyección esférica real; en el aire conserva el sprite original',()=>{
 const sprites=new BatterSprites({getContext(){return null}});
 const image={naturalWidth:160,naturalHeight:160};
 sprites.getStyledBall=()=>image;
 const calls=[];
 const ctx={rotate(angle){calls.push(['rotate',angle])},
  drawImage(...args){calls.push(['draw',...args])}};
 const save={equippedBall:'classic'};
 sprites.drawEquippedBall(ctx,{save,ball:null},30,null,[0,0,0],[0,0,1]);
 assert.equal(calls.filter(x=>x[0]==='draw').length,1);
 assert.equal(calls.filter(x=>x[0]==='rotate').length,0,'en vuelo no gira como moneda');
 const source=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 assert.match(source,/spin\?\.orientation&&planar>1\.3/);
 assert.match(source,/drawSpinningBaseball\(ctx,image,size,spin,camera,target,this\.ballSurfaceCache\)/);
 assert.match(source,/opaqueBaseballPixels\(sourceImage\.data/);
});
test('se conserva exactamente el rozamiento de la versión afinada 0.24',()=>{
 assert.ok(Math.abs(groundRollRetention('road',1)-Math.exp(-1.05))<1e-12);
 assert.ok(Math.abs(groundRollRetention('grass',1)-Math.exp(-2.05))<1e-12);
 const game=Object.create(BaseballGame.prototype);
 game.state='flight';game.simElapsed=0;
 game.ball={x:90,y:groundAt(90,800).y+1.45+.05,z:800,vx:0,vy:-12,vz:25,bounces:0,maxZ:800};
 game.audio={impact(){}};
 game.finishShot=()=>{game.state='rest'};
 for(let i=0;i<10&&game.ball.bounces===0;i++)game.simulateStep(1/60);
 assert.ok(game.ball.bounces>=1);
 assert.equal(game.ball.bounceVisual,1,'el primer bote debe tener respuesta visual');
});
