export const SWEEP_MAX_RAD=52*Math.PI/180;
export function aimSweepPeriod(swingLevel=1){return 2.1+Math.min(1.1,Math.log2(Math.max(1,Number(swingLevel)||1))*.13)}
export function aimBarPosition(elapsedSeconds,swingLevel=1){
 if(!Number.isFinite(elapsedSeconds))return -1;
 const phase=((elapsedSeconds/aimSweepPeriod(swingLevel))%1+1)%1;
 return phase<.5?-1+4*phase:3-4*phase;
}
// Constant angular speed throughout the entire sector. No central assistance,
 // timing offset, or power-dependent compression: the selected heading is exact.
export function aimSweep(elapsedSeconds,swingLevel=1){
 return -SWEEP_MAX_RAD*aimBarPosition(elapsedSeconds,swingLevel);
}
export function preciseAim(elapsed,swing=1){return aimSweep(elapsed,swing)}
export function aimCompassRotation(angle){return -(Number.isFinite(angle)?angle:0)*180/Math.PI}
export function aimDirection(angle){
 const d=aimCompassRotation(angle);
 return Math.abs(d)<.05?'RECTO':d<0?'IZQUIERDA':'DERECHA';
}
export function aimDegrees(angle){
 const degrees=Math.round((Number.isFinite(angle)?angle:0)*1800/Math.PI)/10;
 return (degrees>0?'+':'')+degrees+'°';
}
export function redirectShot(shot,angle){
 if(!shot)throw Error('Falta el impacto congelado');
 const heading=Number.isFinite(angle)?Math.max(-SWEEP_MAX_RAD,Math.min(SWEEP_MAX_RAD,angle)):0;
 const horizontal=Math.hypot(shot.vx,shot.vz);
 return {...shot,vx:horizontal*Math.sin(heading),vz:horizontal*Math.cos(heading),direction:heading};
}
