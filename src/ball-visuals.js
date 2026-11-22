// Tamaño cinematográfico controlado: la pelota se acerca sin convertirse en gigante.
// Funciones puras para poder probar rebotes hacia cámara en cualquier resolución.
export function ballSpriteDiameter(projectedRadiusPx,screenWidth=390){
 const px=Number.isFinite(projectedRadiusPx)?Math.max(0,projectedRadiusPx):0;
 const scale=Math.max(.76,Math.min(1.18,screenWidth/390));
 const value=18+26*(1-Math.exp(-px/18));
 return Math.max(16,Math.min(46,value*scale));
}
export function ballShadowOpacity(altitude){
 const h=Math.max(0,Number.isFinite(altitude)?altitude:1e4);
 return Math.max(.018,Math.min(.34,.34*Math.exp(-h/18)));
}
export function ballImpactOpacity(age){
 if(!Number.isFinite(age)||age<0||age>.36)return 0;
 return Math.pow(1-age/.36,1.8)*.62;
}
