// Cinemática visual de giro: conserva la pelota de béisbol aprobada.
// Se integra una vez por fotograma real, no en los subpasos acelerados del vuelo.
const TAU=Math.PI*2;
export const BALL_RADIUS=1.45;
export function rotateQuaternion(q,v){
 const [x,y,z,w]=q;
 const tx=2*(y*v[2]-z*v[1]),ty=2*(z*v[0]-x*v[2]),tz=2*(x*v[1]-y*v[0]);
 return [v[0]+w*tx+y*tz-z*ty,v[1]+w*ty+z*tx-x*tz,v[2]+w*tz+x*ty-y*tx];
}
export function spinQuaternion(spin,axis,angle){
 if(!spin||!Number.isFinite(angle)||Math.abs(angle)<1e-12)return;
 const n=Math.hypot(...axis);if(n<1e-9)return;
 const half=angle*.5,s=Math.sin(half)/n,c=Math.cos(half);
 const [ax,ay,az]=axis,q=spin.orientation||[0,0,0,1];
 // The rotation axis belongs to the WORLD; pre-multiplication is required.
 const dx=ax*s,dy=ay*s,dz=az*s;
 const x=c*q[0]+dx*q[3]+dy*q[2]-dz*q[1];
 const y=c*q[1]-dx*q[2]+dy*q[3]+dz*q[0];
 const z=c*q[2]+dx*q[1]-dy*q[0]+dz*q[3];
 const w=c*q[3]-dx*q[0]-dy*q[1]-dz*q[2];
 const d=Math.hypot(x,y,z,w)||1;
 spin.orientation=[x/d,y/d,z/d,w/d];
}

export function spinTarget(ball,contact=false){
 const vx=Number(ball?.vx)||0,vz=Number(ball?.vz)||0;
 const planar=Math.hypot(vx,vz);
 if(planar<.18)return 0;
 const forward=Math.abs(vz)>=Math.abs(vx)*.3?vz:vx;
 const direction=Math.sign(forward)||1;
 if(contact)return direction*planar/BALL_RADIUS;
 // Backspin stays legible in flight without runaway high-frequency aliasing.
 return -direction*Math.min(13.5,Math.max(4.4,4.1+planar*.065));
}
export function initBallSpin(ball){
 if(!ball)return null;
 const rate=spinTarget(ball,false);
 ball.spin={angle:0,tilt:0,rate,contact:false,impacts:0,orientation:[0,0,0,1]};
 return ball.spin;
}
export function onSpinImpact(ball,normal={x:0,y:1,z:0},material='solid'){
 if(!ball)return null;
 const spin=ball.spin||initBallSpin(ball);
 // El cambio al tocar suelo se vuelve inmediatamente visible, incluso en rebotes.
 const ground=normal.y>.5,wet=['water','swamp','puddle'].includes(material);
 spin.contact=ground;
 spin.impacts++;
 const desired=wet?spinTarget(ball,true)*.18:spinTarget(ball,ground);
 // No reseteamos el ángulo: evitamos saltos de costura en los impactos.
 spin.rate=desired;
 spin.tilt=(spin.tilt+(normal.x||0)*.15+(normal.z||0)*.09)%(TAU);
 return spin;
}
export function advanceBallSpin(ball,dt,contact=false){
 if(!ball)return null;
 const spin=ball.spin||initBallSpin(ball);
 const step=Math.max(0,Math.min(.05,Number(dt)||0));
 const wet=ball.wetTime>0;
 const speed=Math.hypot(Number(ball.vx)||0,Number(ball.vy)||0,Number(ball.vz)||0);
 let target=spinTarget(ball,contact);
 if(wet)target*=.18;
 if(speed<.75)target=0;
 const responsiveness=contact?18:12;
 spin.rate+=(target-spin.rate)*(1-Math.exp(-step*responsiveness));
 // Siempre avanza con tiempo real, incluso con simulación acelerada 22×.
 spin.angle=(spin.angle+spin.rate*step)%TAU;
 // Airborne backspin about the horizontal axis perpendicular to travel.
 const vx=Number(ball.vx)||0,vz=Number(ball.vz)||0;
 spinQuaternion(spin,[vz,0,-vx],-Math.abs(spin.rate)*step);
 spin.tilt=(spin.tilt+Math.min(4,Math.abs(spin.rate)*.24)*step)%TAU;
 spin.contact=!!contact;
 return spin;
}

// While rolling, angular displacement equals actual ground displacement / radius.
// Called per physics substep, so the simulation speed multiplier cannot desync spin.
export function integratePhysicalSpin(ball,previous,dt,contact=false,material='grass'){
 if(!ball)return null;
 const spin=ball.spin||initBallSpin(ball);
 if(!contact)return advanceBallSpin(ball,dt,false);
 const dx=(Number(ball.x)||0)-(Number(previous?.x)||0);
 const dz=(Number(ball.z)||0)-(Number(previous?.z)||0);
 const travel=Math.hypot(dx,dz);
 const radius=BALL_RADIUS;
 const wet=['water','swamp','puddle'].includes(material);
 const traction=wet?.18:1;
 // Prevent a collision correction/teleport from looking like a ground roll.
 const planarSpeed=Math.hypot(Number(ball.vx)||0,Number(ball.vz)||0);
 const maxTravel=(planarSpeed+3)*Math.max(0,dt)*1.5;
 const distance=Math.min(travel,maxTravel);
 const major=Math.abs(dz)>=Math.abs(dx)*.3?dz:dx;
 const signed=Math.sign(major)||Math.sign(ball.vz)||1;
 const delta=signed*distance*traction/radius;
 spin.angle=(spin.angle+delta)%(2*Math.PI);
 spin.rate=dt>0?delta/dt:0;
 spin.contact=true;
 spin.rollAngle=(spin.rollAngle||0)+delta;
 spin.rollHeading=Math.atan2(dx,dz);
 // The approved 2D baseball graphic is projected onto a virtual sphere.
 // Its image-space orientation is opposite to a physical texture unwrap: invert
 // the rendered angular phase so forward rolling reads FORWARD on iPhone.
 // The scalar rollAngle/roll speed remain distance / radius and unchanged.
 spinQuaternion(spin,[dz,0,-dx],-distance*traction/radius);
 spin.tilt=(spin.tilt+.15*delta)%(2*Math.PI);
 return spin;
}
