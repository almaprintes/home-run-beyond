// Dirección variable en fase de pulsación; el lanzamiento conserva su energía.
export const SWEEP_MAX_RAD=52*Math.PI/180;
const SWEEP_PERIOD_SECONDS=2.1;
// Un barrido casi a velocidad constante, con aceleración continua en los giros.
// Sin frenadas largas en los extremos ni cambios bruscos de sentido.
function smoothLinearTravel(u){
 const edge=.16,normalization=1-edge;
 if(u<edge)return (u*.5-edge*Math.sin(Math.PI*u/edge)/(2*Math.PI))/normalization;
 if(u>1-edge)return 1-smoothLinearTravel(1-u);
 return (u-edge*.5)/normalization;
}
export function aimSweep(elapsedSeconds){
 if(!Number.isFinite(elapsedSeconds))return 0;
 const time=((elapsedSeconds/SWEEP_PERIOD_SECONDS+.25)%1+1)%1;
 return SWEEP_MAX_RAD*(time<.5
  ?-1+2*smoothLinearTravel(time*2)
  :1-2*smoothLinearTravel((time-.5)*2));
}
export function aimDegrees(angle){
 const degrees=Math.round((Number.isFinite(angle)?angle:0)*180/Math.PI);
 return (degrees>0?'+':'')+degrees+'°';
}
export function redirectShot(shot,angle){
 if(!shot)throw Error('Falta el impacto congelado');
 const heading=Number.isFinite(angle)?Math.max(-SWEEP_MAX_RAD,Math.min(SWEEP_MAX_RAD,angle)):0;
 const horizontal=Math.hypot(shot.vx,shot.vz);
 return {...shot,vx:horizontal*Math.sin(heading),vz:horizontal*Math.cos(heading),direction:heading};
}
