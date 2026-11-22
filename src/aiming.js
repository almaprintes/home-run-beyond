// Dirección variable en fase de pulsación; el lanzamiento conserva su energía.
const SWEEP_MAX_RAD=52*Math.PI/180;
const SWEEP_PERIOD_SECONDS=2.1;
export function aimSweep(elapsedSeconds){
 if(!Number.isFinite(elapsedSeconds))return 0;
 return SWEEP_MAX_RAD*Math.sin(elapsedSeconds*2*Math.PI/SWEEP_PERIOD_SECONDS);
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
