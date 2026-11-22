// Cinemática visual de giro: conserva la pelota de béisbol aprobada.
// Se integra una vez por fotograma real, no en los subpasos acelerados del vuelo.
const TAU=Math.PI*2;
export function spinTarget(ball,contact=false){
 const vx=Number(ball?.vx)||0,vz=Number(ball?.vz)||0;
 const planar=Math.hypot(vx,vz);
 if(planar<.18)return 0;
 // Principalmente la dirección longitudinal; si sale casi lateral, se usa vx.
 const forward=Math.abs(vz)>=Math.abs(vx)*.3?vz:vx;
 const direction=Math.sign(forward)||1;
 if(contact){
  // Rodadura: el giro cambia de sentido cuando la pelota retrocede.
  return direction*Math.min(14,Math.max(.3,planar/1.45*.42));
 }
 // Backspin del golpe inicial y giro en el aire. El sentido sigue al recorrido.
 return -direction*Math.min(13.5,Math.max(4.4,4.1+planar*.065));
}
export function initBallSpin(ball){
 if(!ball)return null;
 const rate=spinTarget(ball,false);
 ball.spin={angle:0,tilt:0,rate,contact:false,impacts:0};
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
 let target=spinTarget(ball,contact||spin.contact);
 if(wet)target*=.18;
 if(speed<.75)target=0;
 const responsiveness=(contact||spin.contact)?18:12;
 spin.rate+=(target-spin.rate)*(1-Math.exp(-step*responsiveness));
 // Siempre avanza con tiempo real, incluso con simulación acelerada 22×.
 spin.angle=(spin.angle+spin.rate*step)%TAU;
 spin.tilt=(spin.tilt+Math.min(4,Math.abs(spin.rate)*.24)*step)%TAU;
 spin.contact=!!contact;
 return spin;
}
