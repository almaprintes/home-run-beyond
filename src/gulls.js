// Real continuous air traffic, independent of ball, player input and randomness.
export const GULL_RANGE=2000;
export const GULL_ATLAS='./assets/environment/gull-flight.webp?v=0.77.35';
export const GULL_CELL=192;
export const RECOVERY_SECONDS=1.8;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=(v,n)=>((v%n)+n)%n;
const centers=[75,140,290,480,670,860,1540,1730,1920];
export const GULL_ROUTES=Object.freeze(centers.flatMap((z,f)=>Array.from({length:3},(_,i)=>Object.freeze({
 id:'gull-'+f+'-'+i,route:true,z:z+i*6,y:(f<2?13:22)+i*4+(f%3)*3,
 dir:f%2?-1:1,speed:8+i*.8,phase:i*1.6+f*.7,offset:330+i*25+f*43
}))));
export function gullPosition(b,t){
 if(!b.route){
  const elapsed=t-b.centerTime,hit=b.struckAt==null?0:Math.max(0,t-b.struckAt);
  return {x:b.x+b.dir*b.speed*elapsed,y:b.y+Math.min(22,hit*12),z:b.z+Math.min(24,hit*7),dir:b.dir,phase:b.phase,hit,id:b.id};
 }
 const age=b.struckAt==null?Infinity:t-b.struckAt;
 const recovering=age>=0&&age<RECOVERY_SECONDS;
 const u=recovering?age/RECOVERY_SECONDS:0;
 // Temporary reaction returns smoothly to the original flight lane.
 const rise=recovering?Math.sin(Math.PI*u)**2*(8*u-3):0;
 return {x:wrap(b.offset+b.dir*b.speed*t,680)-340,
  y:b.y+Math.sin(t*.9+b.phase)*1.2+rise,z:b.z+Math.sin(t*.21+b.phase)*3,
  dir:b.dir,phase:b.phase,id:b.id,hit:recovering?age+.001:0,age:recovering?age:Infinity};
}
export function gullFrame(t,p){
 const a=p.age;
 if(Number.isFinite(a)&&a>=0&&a<RECOVERY_SECONDS){
  if(a<.14)return 3;if(a<.32)return 4;if(a<.62)return 5;
  if(a<.94)return 6;if(a<1.26)return 7;return 8;
 }
 return [0,1,2,1][Math.floor(wrap(t*5.8+(p.phase||0),4))];
}
export function visibleGulls(t,cam,hits){
 return GULL_ROUTES.filter(b=>Math.abs(b.z-cam[2])<=320).map(b=>gullPosition({...b,struckAt:hits?.get(b.id)},t))
  .filter(p=>Math.abs(p.x-cam[0])<320&&Math.abs(p.y-cam[1])<180);
}
export function traceAirTraffic(from,to,t0,t1,radius=1.45,hits,alreadyHit){
 if(Math.max(from.z,to.z)<0||Math.min(from.z,to.z)>GULL_RANGE)return null;
 let first=null;
 for(const route of GULL_ROUTES){
  if(alreadyHit?.has(route.id)||route.z<Math.min(from.z,to.z)-8||route.z>Math.max(from.z,to.z)+8)continue;
  const bird={...route,struckAt:hits?.get(route.id)};
  const hit=traceGullCollision(from,to,bird,t0,t1,radius);
  if(hit&&(!first||hit.t<first.t))first=hit;
 }
 return first;
}
export function traceGullCollision(from,to,bird,t0,t1,radius=1.45){
 if(!bird||(bird.struckAt!=null&&t0-bird.struckAt<RECOVERY_SECONDS)||Math.max(from.z,to.z)<0||Math.min(from.z,to.z)>GULL_RANGE)return null;
 const a=gullPosition(bird,t0),b=gullPosition(bird,t1);
 if(bird.route&&Math.abs(b.x-a.x)>300)return null; // never collide across the off-map wrap
 const p=[from.x-a.x,from.y-a.y,from.z-a.z],d=[to.x-b.x-p[0],to.y-b.y-p[1],to.z-b.z-p[2]];
 const R=radius+.90,A=d.reduce((s,v)=>s+v*v,0),B=2*p.reduce((s,v,i)=>s+v*d[i],0),C=p.reduce((s,v)=>s+v*v,0)-R*R;
 if(A<1e-10||B>=0)return null;
 const disc=B*B-4*A*C;if(disc<0)return null;
 const t=C<=0?0:(-B-Math.sqrt(disc))/(2*A);
 if(t<0||t>1)return null;
 const point={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t};
 if(point.z<0||point.z>GULL_RANGE)return null;
 const n=p.map((v,i)=>v+d[i]*t),length=Math.hypot(...n)||1;
 return {kind:'gull',material:'gull',t,point,normal:{x:n[0]/length,y:n[1]/length,z:n[2]/length},bird,at:t0+(t1-t0)*t};
}
export function gullDeflection(ball,hit){
 const speed=Math.hypot(ball.vx,ball.vy,ball.vz),n=hit.normal;
 const lateral=clamp(speed*.035,1,6)*(Math.abs(n.x)>.05?Math.sign(n.x):hit.bird.dir);
 return {vx:ball.vx*.94+lateral,vy:ball.vy*.94-1.5,vz:ball.vz*.94};
}

// Lightweight procedural fallback if the approved sprite atlas fails to load.
export function drawGulls(r,cam,game){
 if(!r?.add||cam[2]>GULL_RANGE+250||cam[1]>260)return 0;
 const t=game.clock||0,all=visibleGulls(t,cam,game.gullHits);
 r.setMaterial?.('plain');let count=0;
 for(const p of all){
  if(Math.abs(p.x-cam[0])>300)continue;
  const flap=Math.sin(t*(p.hit?22:6)+p.phase)*.72,dir=p.dir;
  // Nose is +/−X. Wings extend along Z, with the inner wing slightly raised.
  r.add('ball',p.x,p.y,p.z,1.85,.65,.63,'#f5f6f3');
  r.add('ball',p.x+dir*.83,p.y+.16,p.z,.62,.58,.58,'#fffdf2');
  r.add('ball',p.x+dir*1.17,p.y+.10,p.z,.54,.20,.23,'#e7b546');
  r.add('ball',p.x-dir*.84,p.y-.02,p.z,.80,.13,.55,'#e8ecec');
  for(const s of [-1,1]){
   const angle=-s*flap,dy=Math.sin(flap)*1.04;
   r.add('ball',p.x-dir*.10,p.y+dy*.65,p.z+s*.97*Math.cos(flap),.85,.15,1.85,'#b9c5ce',0,angle);
   r.add('ball',p.x-dir*.38,p.y+dy*1.65,p.z+s*2.05*Math.cos(flap),.53,.14,1.20,'#56616c',0,angle);
  }
  count++;
 }
 return count;
}
