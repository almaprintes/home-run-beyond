export const SWEEP_MAX_RAD=52*Math.PI/180;
export function aimSweepPeriod(swingLevel=1){return 2.1+Math.min(1.1,Math.log2(Math.max(1,swingLevel))*.13)}
export function aimBarPosition(elapsedSeconds,swingLevel=1){
 if(!Number.isFinite(elapsedSeconds))return -1;
 const phase=((elapsedSeconds/aimSweepPeriod(swingLevel))%1+1)%1;
 return phase<.5?-1+4*phase:3-4*phase;
}
export function aimSweetHalf(swingLevel=1){
 return Math.min(.30,.13+.02*Math.log2(Math.max(1,swingLevel)));
}
export function aimSweep(elapsedSeconds,swingLevel=1){
 return -SWEEP_MAX_RAD*aimBarPosition(elapsedSeconds,swingLevel);
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
