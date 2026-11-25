import test from 'node:test';
import assert from 'node:assert/strict';
import {planGullEncounter,gullPosition,traceGullCollision,gullDeflection,ambientGulls,drawGulls,GULL_HIT_CHANCE,GULL_RANGE} from '../src/gulls.js';
const shot={x:-4.5,y:2.5,z:-4.7,vx:0,vy:26,vz:58};
test('1% per shot, never per frame; unobstructed simulated flight contacts the moving bird',()=>{
 let planned=0,contacts=0;
 for(let i=0;i<10000;i++){
  let n=0;const bird=planGullEncounter(shot,5,()=>n++===0?(i+.5)/10000:.45);
  if(!bird)continue;planned++;
  const b={...shot};let t=5;
  for(let j=0;j<200;j++){
   const prev={...b},dt=.02;b.vy-=9.81*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
   const hit=traceGullCollision(prev,b,bird,t,t+dt);t+=dt;
   if(hit){contacts++;bird.struckAt=hit.at;assert.equal(traceGullCollision(prev,b,bird,t,t+dt),null);break}
  }
 }
 assert.equal(GULL_HIT_CHANCE,.01);assert.equal(planned,100);assert.equal(contacts,100);
});
test('real geometry: distant trajectories miss, high speed sweeps hit, gull flies away',()=>{
 const bird={x:0,y:20,z:80,centerTime:5,dir:1,speed:8.5,phase:0,struckAt:null};
 const hit=traceGullCollision({x:0,y:20,z:60},{x:0,y:20,z:100},bird,4.99,5.01);
 assert.ok(hit&&hit.t>0&&hit.t<1);
 assert.equal(traceGullCollision({x:0,y:32,z:60},{x:0,y:32,z:100},bird,4.99,5.01),null);
 const v=gullDeflection({vx:0,vy:0,vz:100},hit);assert.ok(v.vz<100&&Math.abs(v.vx)>0);
 bird.struckAt=5;assert.ok(gullPosition(bird,6).y>20);
});
test('stadium, city and harbor flocks, limited geometry and animated wings',()=>{
 assert.ok(ambientGulls(1,[0,25,400]).every(p=>p.z<1000&&p.z>0));
 assert.equal(GULL_RANGE,2000);
 assert.ok(ambientGulls(1,[0,25,1750]).length>0);
 assert.ok(ambientGulls(1,[0,25,1750]).every(p=>p.z>=1500&&p.z<2000));
 assert.equal(ambientGulls(1,[0,25,2400]).length,0);
 const calls=[],r={add(...a){calls.push(a)}};
 const n=drawGulls(r,[0,25,400],{clock:1});assert.ok(n>0&&n<=10);assert.equal(calls.length,n*8);
 const before=JSON.stringify(calls);calls.length=0;drawGulls(r,[0,25,400],{clock:1.2});assert.notEqual(JSON.stringify(calls),before);
});

 test('long flight can generate a harbor encounter, without increasing chance',()=>{
 const long={x:0,y:2.5,z:-4.7,vx:0,vy:90,vz:90};let n=0;
 const bird=planGullEncounter(long,0,()=>n++===0?0:.95);
 // This arc lands near 1650 m; a valid low-altitude crossing is in the port.
 assert.ok(bird&&bird.z>=1500&&bird.z<=2000);
 assert.equal(planGullEncounter(long,0,()=>.02),null);
 const p={x:0,y:20,z:1850,centerTime:5,dir:1,speed:8.5,phase:0,struckAt:null};
 assert.ok(traceGullCollision({x:0,y:20,z:1830},{x:0,y:20,z:1870},p,4.99,5.01));
 p.z=2010;assert.equal(traceGullCollision({x:0,y:20,z:2005},{x:0,y:20,z:2020},p,4.99,5.01),null);
 });
