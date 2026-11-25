// Rare encounters are sampled ONCE per successful hit, not per frame.
export const GULL_HIT_CHANCE=.01;
export const GULL_RANGE=1000;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(i,k)=>{const n=Math.sin(i*127.1+k*311.7+6.21)*43758.5453;return n-Math.floor(n)};
export function planGullEncounter(ball,clock=0,rng=Math.random){
 if(!ball||!Number.isFinite(ball.vz)||ball.vz<5)return null;
 if(rng()>=GULL_HIT_CHANCE)return null;
 // Choose a plausible crossing on the initial unobstructed ballistic arc.
 // A wall or other collision can prevent the encounter: never teleport the ball.
 const speed=Math.hypot(ball.vx,ball.vz),mult=clamp(speed/58,1,22);
 const possible=[];
 for(let z=35;z<=960;z+=12){
  const t=(z-ball.z)/ball.vz,x=ball.x+ball.vx*t,y=ball.y+ball.vy*t-4.905*t*t;
  if(t<=0||y<8||y>100||Math.abs(x)>260)continue;
  possible.push({x,y:y-.10,z,t});
  if(possible.length>=8)break; // favour the stadium outskirts, before buildings
 }
 if(!possible.length)return null;
 const p=possible[Math.floor(clamp(rng(),0,.999999)*possible.length)];
 const dir=rng()<.5?-1:1;
 return {id:'rare-gull',x:p.x+.35*dir,y:p.y,z:p.z,centerTime:clock+p.t/mult,dir,speed:8.5,phase:rng()*Math.PI*2,struckAt:null};
}
export function gullPosition(b,t){
 const elapsed=t-b.centerTime;
 const hit=b.struckAt==null?0:Math.max(0,t-b.struckAt);
 return {x:b.x+b.dir*b.speed*elapsed,y:b.y+Math.min(22,hit*12),z:b.z+Math.min(24,hit*7),dir:b.dir,phase:b.phase,hit,id:b.id};
}
export function ambientGulls(t,cam,ball=null){
 const birds=[];
 for(let f=0;f<5;f++){
  const z=100+f*190;
  if(Math.abs(z-cam[2])>300||Math.abs(cam[1]-28)>140)continue;
  for(let i=0;i<3;i++){
   const j=f*3+i,dir=f%2?-1:1,center=dir*(95+18*i);
   const x=center+Math.sin(t*.12+f*2+i*.15)*38;
   const y=18+hash(f,3)*18+i*2.7+Math.sin(t*.9+j)*1.2;
   const p={x,y,z:z+i*7+Math.sin(t*.21+j)*7,dir:Math.cos(t*.12+f*2+i*.15)>=0?1:-1,phase:j*1.5,id:'ambient-'+j,hit:0};
   // Ordinary gulls steer clear; the rare encounter is a real geometric sweep.
   if(ball){
    const dx=p.x-ball.x,dy=p.y-ball.y,dz=p.z-ball.z;
    const distance=Math.hypot(dx,dy,dz);
    if(distance<20)p.y+=Math.pow(1-distance/20,2)*13;
   }
   birds.push(p);
  }
 }
 return birds.sort((a,b)=>Math.abs(a.z-cam[2])-Math.abs(b.z-cam[2])).slice(0,9);
}
// Continuous relative sphere sweep catches fast balls between physics ticks.
export function traceGullCollision(from,to,bird,t0,t1,radius=1.45){
 if(!bird||bird.struckAt!=null||Math.max(from.z,to.z)<0||Math.min(from.z,to.z)>GULL_RANGE)return null;
 const a=gullPosition(bird,t0),b=gullPosition(bird,t1);
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
// Articulated low-poly gulls, with white heads, grey wings and dark tips.
// Same world coordinates for the moving body and collision sphere.
export function drawGulls(r,cam,game){
 if(!r?.add||cam[2]>GULL_RANGE+250||cam[1]>260)return 0;
 const t=game.clock||0,all=ambientGulls(t,cam,game.state==='flight'?game.ball:null);
 if(game.gullEncounter){
  const p=gullPosition(game.gullEncounter,t);
  if(Math.abs(p.z-cam[2])<340&&Math.abs(p.x-cam[0])<330)all.push(p);
 }
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
