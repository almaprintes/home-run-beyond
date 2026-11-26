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
 return Math.max(.014,Math.min(.26,.26*Math.exp(-h/18)));
}
// Ellipse radii, not diameters: 76% of the visible ball's width.
export function ballShadowGeometry(diameter,altitude=0){
 const size=Number.isFinite(diameter)?Math.max(0,diameter):0;
 const h=Number.isFinite(altitude)?Math.max(0,altitude):0;
 const spread=1+.05*(1-Math.exp(-h/18));
 return {rx:size*.38*spread,ry:size*.14*spread,blur:Math.min(4,size*.08*spread)};
}
// The cinematic diameter is independent of world radius. Anchor the lower
// visible edge at the projected physical contact point near a surface.
export function ballGroundedScreenY(centerY,groundY,diameter,clearance,bounce=0,visibleRadius=.5){
 if(![centerY,groundY,diameter,clearance].every(Number.isFinite))return centerY;
 // Ignore floors above the sphere's physical underside (e.g. an interior).
 if(clearance<-.18||clearance>=2.9)return centerY;
 const t=Math.max(0,Math.min(1,(clearance-.12)/2.78));
 const weight=1-t*t*(3-2*t);
 const radius=diameter*visibleRadius*(1-.11*Math.max(0,Math.min(1,bounce)));
 return centerY+(groundY-radius-centerY)*weight;
}
export function ballImpactOpacity(age){
 if(!Number.isFinite(age)||age<0||age>.36)return 0;
 return Math.pow(1-age/.36,1.8)*.62;
}
