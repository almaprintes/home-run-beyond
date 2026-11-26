import {lookAt,perspective,mul4} from './engine.js?v=0.77.65';
import {groundAt} from './world.js?v=0.77.65';
export const MAX_GLASS_SHARDS=84;

// FX pequeños, ligados a la posición real del choque; sin texturas adicionales.
export const EFFECT_MATERIALS=Object.freeze({
 glass:{color:'#a8e5f2',secondary:'#f5fdff',count:17,life:.62,spread:15,gravity:31,kind:'shard'},
 solid:{color:'#ffe6ae',secondary:'#fffaf0',count:12,life:.42,spread:14,gravity:30,kind:'spark'},
 concrete:{color:'#b9b8af',secondary:'#dfd8c5',count:10,life:.52,spread:10,gravity:21,kind:'dust'},
 brick:{color:'#d49a78',secondary:'#aa6a52',count:12,life:.55,spread:12,gravity:24,kind:'dust'},
 rubber:{color:'#8ea8a2',secondary:'#d4ded3',count:6,life:.27,spread:7,gravity:10,kind:'soft'},
 roof:{color:'#d8b99c',secondary:'#f6dfbc',count:9,life:.44,spread:11,gravity:23,kind:'dust'},
 grass:{color:'#9acc78',secondary:'#dce79e',count:9,life:.43,spread:9,gravity:13,kind:'grass'},
 dirt:{color:'#bd9468',secondary:'#e4cda3',count:11,life:.55,spread:12,gravity:23,kind:'dust'},
 road:{color:'#bec9d1',secondary:'#e4ebee',count:11,life:.32,spread:14,gravity:29,kind:'spark'},
 paving:{color:'#bcb5a5',secondary:'#e6dfd2',count:9,life:.32,spread:12,gravity:29,kind:'dust'},
 asphalt:{color:'#bec9d1',secondary:'#e4ebee',count:11,life:.32,spread:14,gravity:29,kind:'spark'},
 water:{color:'#83e1f2',secondary:'#d6fcff',count:13,life:.65,spread:12,gravity:25,kind:'splash'},
 puddle:{color:'#91dfeb',secondary:'#e2fdff',count:11,life:.53,spread:9,gravity:23,kind:'splash'},
 swamp:{color:'#9ecaa2',secondary:'#d8e8b2',count:11,life:.55,spread:8,gravity:22,kind:'splash'},
 bat:{color:'#ffe2a3',secondary:'#fffef4',count:15,life:.31,spread:15,gravity:7,kind:'spark'}
});
export function materialEffect(material){
 return EFFECT_MATERIALS[material]||EFFECT_MATERIALS.concrete;
}
export function hitStopDuration(quality){
 return quality==='perfect'?.060:quality==='excellent'?.038:quality==='good'?.018:0;
}
export function fxStrength(value){
 if(!Number.isFinite(value))return 0;
 return Math.max(0,Math.min(1,Math.log1p(Math.max(0,value))/Math.log(115)));
}
function hash(i,seed){let x=Math.sin(i*127.1+seed*311.7)*43758.5453;return x-Math.floor(x)}
function project(vp,x,y,z,width,height){
 const w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
 if(!(w>.01))return null;
 const a=(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w;
 const b=(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w;
 return {x:(a+1)*.5*width,y:(1-b)*.5*height,depth:w};
}

// Graphic accents inspired by sports animation. No full-screen strobe;
 // a single short burst, and peripheral speed strokes clear of the HUD.
export function cinematicIntensity(quality,speed,age,launchView,reduced=false){
 if(reduced)return {burst:0,wind:0};
 const power=quality==='perfect'?1:quality==='excellent'?.62:0;
 const burst=launchView?power*Math.max(0,1-age/.20)**2:0;
 const wind=launchView?0:Math.max(0,Math.min(1,(speed-40)/160))*Math.max(0,Math.min(1,(4.5-age)/2));
 return {burst,wind};
}
export function drawCinematicAccents(ctx,game,camera,target,width,height,zoom){
 if(game.state!=='flight'||!game.ball||game.save?.reducedEffects||!ctx?.moveTo||!ctx?.lineTo)return;
 const age=game.liveSeconds||0,b=game.ball,speed=Math.hypot(b.vx||0,b.vy||0,b.vz||0);
 const {burst,wind}=cinematicIntensity(game.pendingShot?.quality,speed,age,game.launchView);
 if(burst>.005){
  const vp=mul4(perspective(zoom*Math.PI/180,width/Math.max(1,height),.25,2500),lookAt(camera,target));
  const p=project(vp,-4.5+(game.pendingShot?.contactOffsetMm||0)/1000,2.5,-4.7,width,height);
  if(p){const r=Math.min(width,height)*(.065+age*.55);
   ctx.save();ctx.globalAlpha=burst*.82;ctx.fillStyle='#fff5cb';
   for(let i=0;i<12;i++){
    const a=i*Math.PI/6+.09,ux=Math.cos(a),uy=Math.sin(a),len=r*(1.4+hash(i,7)*1.2);
    ctx.beginPath();ctx.moveTo(p.x+ux*r*.32-uy*2,p.y+uy*r*.32+ux*2);
    ctx.lineTo(p.x+ux*len,p.y+uy*len);
    ctx.lineTo(p.x+ux*r*.32+uy*2,p.y+uy*r*.32-ux*2);ctx.closePath();ctx.fill();
   }
   ctx.globalAlpha=burst*.7;ctx.beginPath();ctx.arc(p.x,p.y,r*.29,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
 if(wind>.015){
  ctx.save();ctx.strokeStyle='#f2fbff';ctx.lineCap='round';
  // 16 bounded streaks, phased continuously rather than flickering randomly.
  for(let i=0;i<16;i++){
   const a=(i+.35)*Math.PI/8,dx=Math.cos(a),dy=Math.sin(a);
   const phase=(age*(1.8+wind)+hash(i,19))%1,edge=.72+phase*.37;
   const alpha=Math.sin(Math.PI*phase)*wind*.32;
   const x=width*.5+dx*width*.58*edge,y=height*.5+dy*height*.56*edge;
   const len=.10+.12*wind;
   ctx.globalAlpha=alpha;ctx.lineWidth=1+hash(i,21)*1.5;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-dx*width*len,y-dy*height*len);ctx.stroke();
  }
  ctx.restore();
 }
}
export class ImpactEffects{
 constructor(){this.particles=[];this.rings=[];this.seed=1;this.solarClock=0;this.glassShards=[];this.glassChimeCooldown=0}
 clear(){this.particles.length=0;this.rings.length=0;this.solarClock=0;this.glassShards.length=0;this.glassChimeCooldown=0}
 spawn({x=0,y=0,z=0,material='concrete',strength=20,normal={x:0,y:1,z:0},ballId=null}={}){
  const style=materialEffect(material),scale=fxStrength(strength);
  if(ballId==='sol'){
   if(scale>=.07)this.spawnSolarBurst({x,y,z,strength,normal});
   return;
  }
  if(scale<.07)return;
  const seed=this.seed++;
  const count=Math.min(18,Math.max(3,Math.round(style.count*(.40+.65*scale))));
  const life=style.life,spread=style.spread*(.28+.82*scale);
  this.rings.push({x,y,z,age:0,life:style.kind==='splash'?.40:.30,material,color:style.color,strength:scale});
  for(let i=0;i<count;i++){
   const a=hash(i+1,seed)*Math.PI*2,r=.32+.68*hash(i+61,seed),u=hash(i+111,seed);
   const vx=Math.cos(a)*spread*r+(normal.x||0)*spread*.42;
   const vz=Math.sin(a)*spread*r+(normal.z||0)*spread*.42;
   const vy=(style.kind==='splash'?5:style.kind==='spark'?2.5:1)+spread*(.35+u*.65)+Math.max(0,normal.y||0)*spread*.33;
   this.particles.push({
    x,y,z,vx,vy,vz,age:0,life:life*(.65+.65*u),gravity:style.gravity,
    kind:style.kind,color:i%3===0?style.secondary:style.color,size:.7+1.5*u,
    material
   });
  }
  // Límite estricto: efectos de muchos rebotes no penalizan el iPhone.
  if(this.particles.length>90)this.particles.splice(0,this.particles.length-90);
  if(this.rings.length>8)this.rings.splice(0,this.rings.length-8);
 }
 // Each pane's actual exterior face is used even when struck from inside.
 spawnGlassShards(hit,strength=20){
  const b=hit?.building,parts=hit?.windowId?.split(':');
  const axis=parts?.[2],side=Number(parts?.[3]);
  if(!b||!['x','z'].includes(axis)||Math.abs(side)!==1||!hit.point)return;
  const along=axis==='x'?'z':'x',half=axis==='x'?b.w/2:b.d/2,span=axis==='x'?b.d/2:b.w/2;
  const plane=b[axis]+side*half,center=b[along],power=fxStrength(strength),seed=this.seed++;
  const count=6+Math.round(power*6);
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  for(let i=0;i<count;i++){
   const u=hash(i+3,seed),v=hash(i+43,seed),w=hash(i+83,seed);
   const p={x:0,z:0,y:Math.max(.25,hit.point.y+(u-.5)*1.1),vx:0,vz:0,vy:1+v*(2+power*3),
    axis,side,plane,center,span,age:0,settled:false,settledAge:0,bounces:0,
    restLife:2.4+w*1.4,size:.34+u*.83,aspect:.5+v*.55,
    rx:u*6.28,ry:v*6.28,rz:w*6.28,spin:3+u*9,
    color:['#a8dce9','#d4f5fb','#75b9ce','#edfaff'][i%4]};
   p[axis]=plane+side*(.28+v*.38);
   p[along]=clamp(hit.point[along]+(w-.5)*1.8,center-span-.4,center+span+.4);
   p['v'+axis]=side*(.8+power*2.8+u*.9);
   p['v'+along]=(w-.5)*(2+power*3.8);
   this.glassShards.push(p);
  }
  if(this.glassShards.length>MAX_GLASS_SHARDS)this.glassShards.splice(0,this.glassShards.length-MAX_GLASS_SHARDS);
 }
 updateGlassShards(step,onGlassLand,holdDebris=false){
  this.glassChimeCooldown=Math.max(0,this.glassChimeCooldown-step);
  let landed=false;
  for(const p of this.glassShards){
   p.age+=step;
   if(p.settled){if(!holdDebris)p.settledAge+=step;continue}
   p.vy-=18*step;
   p.x+=p.vx*step;p.y+=p.vy*step;p.z+=p.vz*step;
   const drag=Math.exp(-1.1*step);p.vx*=drag;p.vz*=drag;
   const along=p.axis==='x'?'z':'x',out=(p[p.axis]-p.plane)*p.side;
   if(out<.22||out>5.5){
    p[p.axis]=p.plane+p.side*Math.max(.22,Math.min(5.5,out));p['v'+p.axis]=0;
   }
   const lateral=p[along]-p.center;
   if(Math.abs(lateral)>p.span+2){
    p[along]=p.center+Math.sign(lateral)*(p.span+2);p['v'+along]=0;
   }
   p.rx+=p.spin*step;p.ry+=p.spin*.57*step;p.rz+=p.spin*.73*step;
   const floor=groundAt(p.x,p.z).y+.075;
   if(p.y<=floor){
    p.y=floor;
    if(p.bounces===0)landed=true;
    p.bounces++;p.vy=Math.abs(p.vy)*.16;p.vx*=.24;p.vz*=.24;p.spin*=.30;
    if(p.bounces>=2||p.vy<.65){p.settled=true;p.vx=p.vy=p.vz=0;p.rx=p.rz=0}
   }
  }
  if(landed&&this.glassChimeCooldown===0){this.glassChimeCooldown=.35;onGlassLand?.()}
  this.glassShards=this.glassShards.filter(p=>p.settled?p.settledAge<p.restLife:p.age<12);
 }
 drawGlassShards(r,cam){
  if(!this.glassShards.length)return;
  r.setLayer?.('opaque');r.setMaterial?.('plain');
  for(const p of this.glassShards){
   if(Math.hypot(p.x-cam[0],p.z-cam[2])>260)continue;
   const fade=p.settled?Math.min(1,Math.max(0,(p.restLife-p.settledAge)/.7)):1;
   const size=p.size*fade;
   if(size<.025)continue;
   r.add?.('glassShard',p.x,p.y,p.z,size,.045*fade,size*p.aspect,p.color,p.ry,p.rx,p.rz,'plain');
  }
 }
 addSolarParticle(x,y,z,vx,vy,vz,life,size,seed,index,flame){
  this.particles.push({x,y,z,vx,vy,vz,age:0,life,gravity:flame?-3:9,kind:flame?'flame':'ember',color:['#fff1a2','#ffcc4b','#ff8427','#f64b1d'][Math.floor(hash(index+71,seed)*4)],size,material:'solar'});
  if(this.particles.length>90)this.particles.splice(0,this.particles.length-90);
 }
 spawnSolarBurst({x,y,z,strength,normal}){
  const power=fxStrength(strength),seed=this.seed++;
  const count=Math.round(5+9*power);
  for(let i=0;i<count;i++){
   const a=hash(i+1,seed)*Math.PI*2,spread=(3+10*power)*(.45+hash(i+7,seed));
   this.addSolarParticle(x,y,z,Math.cos(a)*spread+(normal.x||0)*2,2+spread*.6,Math.sin(a)*spread+(normal.z||0)*2,.20+hash(i+31,seed)*.28,1.2+hash(i+51,seed)*2,seed,i,i%3!==0);
  }
 }
 spawnSolarTrail(ball,dt){
  const speed=Math.hypot(ball?.vx||0,ball?.vy||0,ball?.vz||0);
  if(!ball||speed<.35||ball.spin?.frozen){this.solarClock=0;return}
  this.solarClock+=Math.max(0,Math.min(.05,dt||0));
  const interval=ball.spinContact?.075:.048;
  if(this.solarClock<interval)return;
  this.solarClock%=interval;
  const seed=this.seed++,n=ball.spinContact?1:2;
  const ux=(ball.vx||0)/speed,uy=(ball.vy||0)/speed,uz=(ball.vz||0)/speed;
  for(let i=0;i<n;i++){
   const a=hash(i+2,seed)*Math.PI*2,spread=.5+hash(i+5,seed)*.7;
   this.addSolarParticle(ball.x-ux*1.35+Math.cos(a)*spread,ball.y-uy*.7,ball.z-uz*1.35+Math.sin(a)*spread,-ux*3+Math.cos(a),1.5-uy*2,-uz*3+Math.sin(a),.16+hash(i+9,seed)*.18,1.1+hash(i+13,seed)*1.3,seed,i,!ball.spinContact||i%2===0&&seed%3===0);
  }
 }
 spawnBat({x=-4.5,y=2.5,z=-4.7,quality='good'}={}){
  const strength=quality==='perfect'?100:quality==='excellent'?73:quality==='good'?42:18;
  this.spawn({x,y,z,material:'bat',strength,normal:{x:0,y:1,z:1}});
 }
 update(dt,onGlassLand,holdDebris=false){
  const step=Math.max(0,Math.min(.06,Number(dt)||0));
  this.updateGlassShards(step,onGlassLand,holdDebris);
  for(const p of this.particles){
   p.age+=step;p.x+=p.vx*step;p.y+=p.vy*step;p.z+=p.vz*step;
   p.vy-=p.gravity*step;p.vx*=Math.exp(-1.6*step);p.vz*=Math.exp(-1.6*step);
  }
  for(const r of this.rings)r.age+=step;
  this.particles=this.particles.filter(p=>p.age<p.life);
  this.rings=this.rings.filter(r=>r.age<r.life);
 }
 draw(ctx,camera,target,width,height,zoom=62){
  if(!ctx||!(this.particles.length||this.rings.length))return;
  const vp=mul4(perspective(zoom*Math.PI/180,width/Math.max(1,height),.25,2500),lookAt(camera,target));
  for(const ring of this.rings){
   const p=project(vp,ring.x,ring.y,ring.z,width,height);
   if(!p||p.x< -80||p.x>width+80||p.y< -80||p.y>height+80)continue;
   const t=ring.age/ring.life;
   ctx.save();ctx.globalAlpha=(1-t)*.50*ring.strength;
   ctx.strokeStyle=ring.color;ctx.lineWidth=Math.max(1.1,3.1*(1-t));
   ctx.beginPath();
   const radius=(10+42*t)*(.58+.55*ring.strength);
   ctx.ellipse(p.x,p.y,radius,radius*(ring.material==='water'||ring.material==='puddle'||ring.material==='swamp'?.35:.65),0,0,Math.PI*2);
   ctx.stroke();ctx.restore();
  }
  for(const f of this.particles){
   const p=project(vp,f.x,f.y,f.z,width,height);
   if(!p||p.x< -16||p.x>width+16||p.y< -16||p.y>height+16)continue;
   const t=f.age/f.life,r=Math.max(.8,Math.min(5,f.size*(1-t)*Math.min(1.4,24/Math.sqrt(p.depth))));
   ctx.save();ctx.globalAlpha=Math.max(0,(1-t)*(f.kind==='soft'?.33:.76));
   ctx.fillStyle=f.color;ctx.beginPath();
   if(f.kind==='shard'){const angle=f.age*11+f.vx;ctx.moveTo(p.x+Math.cos(angle)*r*1.7,p.y+Math.sin(angle)*r*1.7);ctx.lineTo(p.x+Math.cos(angle+2.1)*r,p.y+Math.sin(angle+2.1)*r);ctx.lineTo(p.x+Math.cos(angle+4.2)*r*1.3,p.y+Math.sin(angle+4.2)*r*1.3);ctx.closePath();}
   else if(f.kind==='flame'){
    const tipX=p.x+Math.sin(f.age*16+f.vx)*r*.6;
    ctx.moveTo(tipX,p.y-r*2.5);ctx.quadraticCurveTo(p.x+r*1.6,p.y,p.x+r*.65,p.y+r);
    ctx.quadraticCurveTo(p.x-r*1.6,p.y+r*1.25,tipX,p.y-r*2.5);ctx.closePath();
   }else if(f.kind==='ember'){
    ctx.moveTo(p.x,p.y-r*1.7);ctx.lineTo(p.x+r*.65,p.y);ctx.lineTo(p.x,p.y+r);ctx.lineTo(p.x-r*.65,p.y);ctx.closePath();
   }else ctx.arc(p.x,p.y,r,0,Math.PI*2);
   ctx.fill();ctx.restore();
  }
 }
}
