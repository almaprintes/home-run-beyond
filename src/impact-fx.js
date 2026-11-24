import {lookAt,perspective,mul4} from './engine.js?v=0.54.0';

// FX pequeños, ligados a la posición real del choque; sin texturas adicionales.
export const EFFECT_MATERIALS=Object.freeze({
 solid:{color:'#ffe6ae',secondary:'#fffaf0',count:12,life:.42,spread:14,gravity:30,kind:'spark'},
 concrete:{color:'#b9b8af',secondary:'#dfd8c5',count:10,life:.52,spread:10,gravity:21,kind:'dust'},
 brick:{color:'#d49a78',secondary:'#aa6a52',count:12,life:.55,spread:12,gravity:24,kind:'dust'},
 rubber:{color:'#8ea8a2',secondary:'#d4ded3',count:6,life:.27,spread:7,gravity:10,kind:'soft'},
 roof:{color:'#d8b99c',secondary:'#f6dfbc',count:9,life:.44,spread:11,gravity:23,kind:'dust'},
 grass:{color:'#9acc78',secondary:'#dce79e',count:9,life:.43,spread:9,gravity:13,kind:'grass'},
 dirt:{color:'#bd9468',secondary:'#e4cda3',count:11,life:.55,spread:12,gravity:23,kind:'dust'},
 road:{color:'#bec9d1',secondary:'#e4ebee',count:11,life:.32,spread:14,gravity:29,kind:'spark'},
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

export class ImpactEffects{
 constructor(){this.particles=[];this.rings=[];this.seed=1}
 clear(){this.particles.length=0;this.rings.length=0}
 spawn({x=0,y=0,z=0,material='concrete',strength=20,normal={x:0,y:1,z:0}}={}){
  const style=materialEffect(material),scale=fxStrength(strength);
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
 spawnBat({x=-4.5,y=2.5,z=-4.7,quality='good'}={}){
  const strength=quality==='perfect'?100:quality==='excellent'?73:quality==='good'?42:18;
  this.spawn({x,y,z,material:'bat',strength,normal:{x:0,y:1,z:1}});
 }
 update(dt){
  const step=Math.max(0,Math.min(.06,Number(dt)||0));
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
   ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
}
