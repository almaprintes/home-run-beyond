import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GULL_ROUTES,GULL_RANGE,gullPosition,gullFrame,visibleGulls,traceAirTraffic,traceGullCollision,gullDeflection,RECOVERY_SECONDS,drawGulls} from '../src/gulls.js';
import {initialSave,settleShot} from '../src/logic.js';
test('air traffic exists before batting, crosses the stadium and harbor, and is independent of the shot',()=>{
 assert.equal(GULL_RANGE,2000);assert.equal(GULL_ROUTES.length,27);
 assert.equal(new Set(GULL_ROUTES.map(b=>b.id)).size,27);
 assert.ok(visibleGulls(0,[0,8,-20]).some(b=>b.z<150&&Math.abs(b.x)<40));
 assert.ok(visibleGulls(1,[0,25,1750]).some(b=>b.z>1500&&b.z<2000));
 assert.equal(visibleGulls(1,[0,25,2400]).length,0);
 const b=GULL_ROUTES[0],p=gullPosition(b,1),q=gullPosition(b,1.1);
 assert.notEqual(p.x,q.x);assert.ok(Math.abs(p.x-q.x)<2);
});
test('real moving collision, misses at a distance, recovery and unique reward',()=>{
 const b=GULL_ROUTES[0],t=1,p=gullPosition(b,t),from={x:p.x,y:p.y,z:p.z-10},to={...from,z:p.z+10};
 const hit=traceAirTraffic(from,to,t,t+.02);
 assert.equal(hit.bird.id,b.id);assert.ok(hit.t>=0&&hit.t<=1);
 assert.equal(traceAirTraffic({...from,y:p.y+70},{...to,y:p.y+70},t,t+.02),null);
 const map=new Map([[b.id,hit.at]]),seen=new Set([b.id]);
 assert.equal(traceAirTraffic(from,to,t,t+.02,1.45,map,seen),null);
 const after=gullPosition({...b,struckAt:hit.at},hit.at+.5);
 assert.ok(after.hit>0);assert.equal(gullFrame(hit.at+.5,after),5);
 assert.equal(gullPosition({...b,struckAt:hit.at},hit.at+RECOVERY_SECONDS+.1).hit,0);
 const v=gullDeflection({vx:0,vy:0,vz:100},hit);assert.ok(v.vz<100);
 const save=initialSave(),r=settleShot(save,100,{gulls:2});assert.equal(r.eventCoins,2000);assert.equal(r.gullCount,2);
});
test('atlas is real WebP and uses all nine frames',()=>{
 const bytes=readFileSync(new URL('../assets/environment/gull-flight.webp',import.meta.url));assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length>30000);
 const frames=[0,.2,.4,.8,1.1,1.5].map(age=>gullFrame(0,{age}));assert.deepEqual(frames,[3,4,5,6,7,8]);
 assert.deepEqual([0,1/5.8,2/5.8,3/5.8].map(t=>gullFrame(t,{age:Infinity,phase:0})),[0,1,2,1]);
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');assert.match(sw,/gull-flight\.webp\?v=0\.77\.48/);
});
test('procedural fallback remains available if atlas cannot load',()=>{
 const calls=[],r={add(...a){calls.push(a)}};const n=drawGulls(r,[0,25,400],{clock:1});assert.ok(n>0);assert.equal(calls.length,n*8);
});
