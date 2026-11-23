import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TRAFFIC_VEHICLES,ROAD_CENTERS,TRAFFIC_HALF_SPAN,roadTraffic,visibleRoadTraffic,
 trafficCorners,drawTrafficSprites} from '../src/traffic.js';
import {opaqueBaseballPixels,BALL_SURFACE_SIZE,BatterSprites} from '../src/sprites.js';
import {BaseballGame,groundRollRetention} from '../src/game.js';
import {groundAt} from '../src/world.js';

test('los seis coches usan las seis vistas originales 3/4 de TDR, no sprites cenitales',()=>{
 const originalShas={
  helix_spark:'e18b5add0f0d6f54afdd19d9dbea0ec48b505f3e',
  avenir_gripline:'27477dde99580e6d5a7d1dcd31052af84b715ed3',
  veloce_flash:'69581f8df103255eab1d913f20b037057c1dcc55',
  crown_axis:'b68c3c8b970778d6267b5dfe09f3135db4f74cf7',
  forge_hammer:'f67cf51b6a96b50973e8432d67cc8149a062829b',
  helix_comet:'5e880b039b196fa068557770b0704f1c2e0876d9'
 };
 assert.equal(TRAFFIC_VEHICLES.length,6);
 for(const car of TRAFFIC_VEHICLES){
  assert.match(car.src,/\/three-quarter\//,car.id+' no utiliza vista de Taller');
  const p=new URL('../'+car.src.slice(2),import.meta.url);
  assert.ok(existsSync(p),car.id);
  const data=readFileSync(p);
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
  const objectHash=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
  assert.equal(objectHash,originalShas[car.id],car.id+' no coincide con el render 3/4 de TDR');
 }
});
test('el tráfico avanza en sentidos opuestos por dos carriles sin desplazamiento lateral',()=>{
 assert.equal(ROAD_CENTERS.length,9);
 const span=TRAFFIC_HALF_SPAN*2;
 for(const z of ROAD_CENTERS){
  const before=roadTraffic(z,10),after=roadTraffic(z,10.1);
  assert.equal(before.length,6);
  for(let i=0;i<6;i++){
   const a=before[i],b=after[i];
   assert.ok(a.x>=-260&&a.x<260);
   assert.equal(b.z,a.z);
   assert.equal(a.dir,i%2===0?1:-1);
   assert.ok(a.speed>0);
   const correct=((a.x+260+a.dir*a.speed*.1)%span+span)%span-260;
   assert.ok(Math.abs(correct-b.x)<1e-7,'el coche patina o se teletransporta dentro del carril');
  }
 }
 assert.deepEqual(roadTraffic(123,4),[]);
 const visible=visibleRoadTraffic(665,22,240);
 assert.ok(visible.length>=12&&visible.length<=18);
});
test('la orientación del sprite corresponde a la dirección y conserva las proporciones',()=>{
 const right=roadTraffic(265,0).find(c=>c.dir===1);
 const left=roadTraffic(265,0).find(c=>c.dir===-1);
 const rp=trafficCorners(right),lp=trafficCorners(left);
 assert.ok(rp.topLeft[0]>rp.bottomLeft[0]);
 assert.ok(lp.topLeft[0]<lp.bottomLeft[0]);
 assert.ok(Math.abs((rp.topRight[2]-rp.topLeft[2])-right.width)<1e-9);
 assert.ok(Math.abs((rp.topLeft[0]-rp.bottomLeft[0])-right.length)<1e-9);
});
test('la vista 3/4 es vertical, se orienta según el carril y nunca se aplasta sobre el suelo',()=>{
 const right={...roadTraffic(265,4)[0],x:0,z:265};
 const left={...roadTraffic(265,4)[1],x:8,z:265};
 const images=new Map([[right.id,{naturalWidth:1536,naturalHeight:1024}],
  [left.id,{naturalWidth:1536,naturalHeight:1024}]]);
 const calls=[];
 const ctx={
  save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},
  fill(){calls.push('shadow')},
  transform(){calls.push('flat-quad')},
  translate(...args){calls.push(['translate',...args])},
  rotate(...args){calls.push(['rotate',...args])},
  scale(...args){calls.push(['scale',...args])},
  drawImage(...args){calls.push(['car',...args])}
 };
 const project=(camera,target,p)=>({x:300+p[0]*3,y:250+p[2]*.22-p[1]*3});
 const painted=drawTrafficSprites(ctx,[0,20,0],[0,0,300],800,600,62,project,images,[right,left]);
 assert.equal(painted,2);
 assert.equal(calls.filter(x=>Array.isArray(x)&&x[0]==='car').length,2);
 assert.equal(calls.filter(x=>x==='flat-quad').length,0,'no pegar el coche a la carretera');
 assert.ok(calls.some(x=>Array.isArray(x)&&x[0]==='scale'&&x[1]===-1),'girar el coche del carril opuesto');
 const src=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.doesNotMatch(src,/for\(let k of \[-1,1\]\)r\.ball\(x\+k\*2\.4/);
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
 assert.match(source,/spin\?\.groundEngaged&&planar>1\.3/);
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
