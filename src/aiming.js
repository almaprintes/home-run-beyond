export const SWEEP_MAX_RAD=52*Math.PI/180;
export function aimSweepPeriod(swingLevel=1){return 2.1+Math.min(1.1,Math.log2(Math.max(1,swingLevel))*.13)}
export function aimBarPosition(elapsedSeconds,swingLevel=1){
 if(!Number.isFinite(elapsedSeconds))return -1;
 const phase=((elapsedSeconds/aimSweepPeriod(swingLevel))%1+1)%1;
 return phase<.5?-1+4*phase:3-4*phase;
}
// El mayor alcance exige más precisión: Potencia estrecha la zona central.
// Swing contrarresta la dificultad ampliándola y ralentizando el cursor.
// El límite inferior evita que incluso con mucha potencia resulte imposible.
export function aimSweetHalf(swingLevel=1,powerLevel=1,precision=0){
 const help=.022*Math.log2(Math.max(1,swingLevel));
 const difficulty=.016*Math.log2(Math.max(1,powerLevel));
 return Math.max(.055,Math.min(.30,.13+help-difficulty))*(1+Math.max(0,Math.min(.25,precision)));
}
export function aimSweep(elapsedSeconds,swingLevel=1){
 return -SWEEP_MAX_RAD*aimBarPosition(elapsedSeconds,swingLevel);
}
// Continuous sweet-zone response. Identical input always produces the same shot.
export function preciseAim(elapsed,swing=1,power=1,contactMs=0,precision=0){
 const raw=-aimBarPosition(elapsed,swing),edge=aimSweetHalf(swing,power,precision),a=Math.abs(raw);
 const compressed=a<=edge?.30*a:.30*edge+(a-edge)*(1-.30*edge)/(1-edge);
 const timing=Math.max(-1,Math.min(1,(Number(contactMs)||0)/132));
 const heading=Math.sign(raw)*compressed*SWEEP_MAX_RAD+timing*(.6*Math.PI/180)*(1-a);
 return Math.max(-SWEEP_MAX_RAD,Math.min(SWEEP_MAX_RAD,heading));
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
