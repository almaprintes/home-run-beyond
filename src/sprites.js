import {lookAt,perspective,mul4} from './engine.js?v=0.77.18';
import {surfaceBelowBall,pitcherBallPosition} from './world.js?v=0.77.18';
import {ballSpriteDiameter,ballShadowOpacity} from './ball-visuals.js?v=0.77.18';
import {COSMETICS,OUTFITS,BALL_STYLES} from './logic.js?v=0.77.18';
import {bakedAssetUrl,equippedAssetPaths,WEAPON_POSES,OUTFIT_WEAPON_POSES} from './baked-assets.js?v=0.77.18';


// Recortes 2.5D tomados de las tres láminas aprobadas. No hay re-render ni
// sustitución por otro personaje: el mismo diseño conserva su silhouette y poses.
export const BATTER_ASSETS=Object.freeze({
 ready:'./assets/batter/ready.webp',
 watch:'./assets/batter/watch.webp',
 loaded:'./assets/batter/loaded.webp',
 contact:'./assets/batter/contact.webp',
 follow:'./assets/batter/follow.webp',
 ball:'./assets/baseball.webp',
 trail:'./assets/swing-trail.webp',
 spark:'./assets/hit-spark.webp'
});

export function selectBatterPose({state,pitch=0,aimAngle=0,swingElapsed=0,ball=null}={}){
 if(state==='menu'||state==='ready'||state==='rest'&&!ball)return 'ready';
 if(state==='pitching')return pitch>.72?'loaded':pitch>.12?'watch':'ready';
 if(state==='aiming')return 'loaded'; // La flecha se renderiza aparte, con pivote fijo y giro continuo.
 if(state==='swinging'||state==='whiff')return swingElapsed<.073?'contact':swingElapsed<.48?'follow':'ready';
 return null;
}

// Misma matriz de proyección del motor WebGL. Los sprites forman parte de la
// escena física: sus pies están sobre el home y la pelota sigue sus coordenadas.
export function projectToScreen(camera,target,point,width,height,fov=62){
 const aspect=width/Math.max(1,height);
 const vp=mul4(perspective(fov*Math.PI/180,aspect,.25,2500),lookAt(camera,target));
 const v=[...point,1],p=[];
 for(let row=0;row<4;row++){
  let val=0;for(let col=0;col<4;col++)val+=vp[col*4+row]*v[col];
  p.push(val);
 }
 if(!Number.isFinite(p[3])||p[3]<=.01)return null;
 const nx=p[0]/p[3],ny=p[1]/p[3];
 return {x:(nx+1)*.5*width,y:(1-ny)*.5*height,w:p[3]};
}

// Inverse projection of the original approved baseball image onto a rotating
// sphere. Rolling uses the WORLD axis (up × ground motion), projected into the
// CURRENT camera: a forward roll cannot look like a sideways coin spin.
export const BALL_SURFACE_SIZE=96;
// Una fotografía recortada de una pelota tiene esquinas transparentes.
// Se rellena únicamente la COPIA UV en memoria, proyectando los píxeles
// vecinos del cuero hacia las esquinas; la imagen original nunca se altera.
export function opaqueBaseballPixels(data,w,h){
 const filled=new Uint8ClampedArray(data);
 const cx=(w-1)/2,cy=(h-1)/2;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const idx=(y*w+x)*4;
  if(filled[idx+3]>=250){filled[idx+3]=255;continue}
  const dx=x-cx,dy=y-cy;
  let sample=-1;
  for(let fraction=.98;fraction>=.01;fraction-=.03){
   const sx=Math.max(0,Math.min(w-1,Math.round(cx+dx*fraction)));
   const sy=Math.max(0,Math.min(h-1,Math.round(cy+dy*fraction)));
   const pos=(sy*w+sx)*4;
   if(data[pos+3]>=245){sample=pos;break}
  }
  if(sample<0)sample=(Math.round(cy)*w+Math.round(cx))*4;
  filled[idx]=data[sample];filled[idx+1]=data[sample+1];
  filled[idx+2]=data[sample+2];filled[idx+3]=255;
 }
 return filled;
}

// Remove the soft studio lighting from the leather ONCE when the sprite loads.
// Use nearby non-thread pixels to estimate the low-frequency light field.
// Thread geometry and local texture remain untouched by the smoothing pass.
export function neutralizeBaseballLighting(data,w,h,color='#ffffff'){
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 const luminance=(r,g,b)=>.25*r+.65*g+.10*b;
 const expected=luminance(...rgb)||1;
 const redRatio=(rgb[0]+12)/(rgb[1]+12),blueRatio=(rgb[0]+12)/(rgb[2]+12);
 const n=12,grid=new Float32Array(n*n),weights=new Float32Array(n*n),samples=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];
  if(data[i+3]<245||((r+12)/(g+12)>Math.max(1.28,redRatio*1.17)&&(r+12)/(b+12)>Math.max(1.20,blueRatio*1.13)))continue;
  const light=luminance(r,g,b),ix=Math.min(n-1,Math.floor(x*n/w)),iy=Math.min(n-1,Math.floor(y*n/h)),k=iy*n+ix;
  grid[k]+=light;weights[k]++;samples.push(light);
 }
 if(!samples.length)return opaqueBaseballPixels(data,w,h);
 samples.sort((a,b)=>a-b);
 const target=Math.min(250,Math.max(expected*.85,samples[Math.floor((samples.length-1)*.88)]));
 const field=new Float32Array(n*n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  let sum=0,count=0;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const k=j*n+i,d=(i-x)**2+(j-y)**2;
   if(d>12||!weights[k])continue;
   const weight=Math.exp(-d/2.2)*Math.min(20,weights[k]);
   sum+=grid[k]/weights[k]*weight;count+=weight;
  }
  field[y*n+x]=count?sum/count:target;
 }
 const out=new Uint8ClampedArray(data);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4;if(!data[k+3])continue;
  const u=Math.max(0,Math.min(n-1,x*n/w-.5)),v=Math.max(0,Math.min(n-1,y*n/h-.5));
  const i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,i1=Math.min(n-1,i+1),j1=Math.min(n-1,j+1);
  const light=(field[j*n+i]*(1-a)+field[j*n+i1]*a)*(1-b)+(field[j1*n+i]*(1-a)+field[j1*n+i1]*a)*b;
  const gain=Math.max(.8,Math.min(2.0,target/Math.max(12,light)));
  for(let ch=0;ch<3;ch++)out[k+ch]=Math.min(255,Math.round(data[k+ch]*gain));
 }
 return opaqueBaseballPixels(out,w,h);
}
export function shadeRollingSurface(source,w,h,spin,camera,target,output,size=BALL_SURFACE_SIZE,fixedLight=false){
 const view=lookAt(camera,target),qu=spin?.visualOrientation||spin?.orientation||[0,0,0,1];
 const qx=-qu[0],qy=-qu[1],qz=-qu[2],qw=qu[3];
 const xr=view[0],yr=view[4],zr=view[8],xu=view[1],yu=view[5],zu=view[9],
       xt=view[2],yt=view[6],zt=view[10];
 for(let row=0;row<size;row++){
  const screenY=1-2*(row+.5)/size;
  for(let col=0;col<size;col++){
   const screenX=2*(col+.5)/size-1;
   const rr=screenX*screenX+screenY*screenY;
   const dest=(row*size+col)*4;
   if(rr>=1){output[dest+3]=0;continue}
   const screenZ=Math.sqrt(1-rr);
   const wx=xr*screenX+xu*screenY+xt*screenZ,
         wy=yr*screenX+yu*screenY+yt*screenZ,
         wz=zr*screenX+zu*screenY+zt*screenZ;
   // Inverse quaternion rotates the visible world-facing normal to the
   // baseball's original pose (no allocations in the per-pixel loop).
   const cx=2*(qy*wz-qz*wy),cy=2*(qz*wx-qx*wz),cz=2*(qx*wy-qy*wx);
   const ox=wx+qw*cx+qy*cz-qz*cy;
   const oy=wy+qw*cy+qz*cx-qx*cz;
   const oz=wz+qw*cz+qx*cy-qy*cx;
   // Original 2D baseball supplied by the creator forms the visible half;
   // mirror it for the hidden half, keeping the approved seams/colour.
   const u=.5+.47*ox*(oz<0?-1:1);
   const v=.5-.47*oy;
   const ix=Math.max(0,Math.min(w-1,Math.round(u*(w-1))));
   const iy=Math.max(0,Math.min(h-1,Math.round(v*(h-1))));
   const src=(iy*w+ix)*4;
   // World-up illumination does not rotate with the texture or the seams.
   const light=fixedLight?.91+.09*Math.max(0,Math.min(1,.70*wy+.72*screenZ)):1;
   output[dest]=source[src]*light;output[dest+1]=source[src+1]*light;
   output[dest+2]=source[src+2]*light;
   output[dest+3]=source[src+3]*Math.min(1,(1-rr)*45);
  }
 }
 return output;
}

export function drawSpinningBaseball(ctx,image,size,spin,camera=null,target=null,cache=null){
 const radius=size*.5;
 if(spin?.orientation&&camera&&target&&cache&&typeof document!=='undefined'&&
    (image?.naturalWidth||image?.width)>0){
  try{
   if(cache.image!==image){
    const srcCanvas=document.createElement('canvas');
    srcCanvas.width=image.naturalWidth||image.width;srcCanvas.height=image.naturalHeight||image.height;
    const srcCtx=srcCanvas.getContext('2d',{willReadFrequently:true});
    srcCtx.drawImage(image,0,0);
    const outCanvas=document.createElement('canvas');
    outCanvas.width=BALL_SURFACE_SIZE;outCanvas.height=BALL_SURFACE_SIZE;
    const outCtx=outCanvas.getContext('2d');
    cache.image=image;
    const sourceImage=srcCtx.getImageData(0,0,srcCanvas.width,srcCanvas.height);
    cache.source={width:sourceImage.width,height:sourceImage.height,
     data:cache.leatherColor?neutralizeBaseballLighting(sourceImage.data,sourceImage.width,sourceImage.height,cache.leatherColor):opaqueBaseballPixels(sourceImage.data,sourceImage.width,sourceImage.height)};
    cache.canvas=outCanvas;cache.context=outCtx;
    cache.frame=outCtx.createImageData(BALL_SURFACE_SIZE,BALL_SURFACE_SIZE);
   }
   shadeRollingSurface(cache.source.data,cache.source.width,cache.source.height,
    spin,camera,target,cache.frame.data,BALL_SURFACE_SIZE,!!cache.leatherColor);
   cache.context.putImageData(cache.frame,0,0);
   ctx.drawImage(cache.canvas,-radius,-radius,size,size);
   return;
  }catch(error){
   // Unsupported/read-protected canvas still shows the original baseball.
   if(!cache.warned){console.warn('Sprite esférico no disponible',error);cache.warned=true}
  }
 }
 ctx.drawImage(image,-radius,-radius,size,size);
}

// Coloca el asset completo en el lienzo global, NO en el recorte del bateador.
// El plano se pinta detrás del personaje; los brazos tapan la empuñadura.
export function weaponPlacement(pose,originX,originY,width,height,outfitId){
 const anchor=OUTFIT_WEAPON_POSES[outfitId]?.[pose]||WEAPON_POSES[pose]||WEAPON_POSES.ready;
 const [gx,gy]=anchor.grip,[tx,ty]=anchor.tip;
 const dx=(tx-gx)*width,dy=(ty-gy)*height;
 return {x:originX+gx*width,y:originY+gy*height,
  angle:Math.atan2(dy,dx),scale:Math.hypot(dx,dy)/292};
}

export class BatterSprites{
 constructor(canvas){
  this.canvas=canvas;
  this.ctx=canvas?.getContext?.('2d',{alpha:true})||null;
  this.images={};this.ready=false;this.ballLoaded=false;
  this.lastWidth=0;this.lastHeight=0;this.lastRatio=0;this.ballSurfaceCache={};this.styledPoses=new Map();this.styledBalls=new Map();this.bakedImages=new Map();this.bakedRequests=new Map();this.equipmentReady=false;
 }
 load(){
  if(!this.ctx||typeof Image==='undefined')return Promise.resolve(false);
  const loaders=Object.entries(BATTER_ASSETS).map(([key,url])=>new Promise(resolve=>{
   const picture=new Image();
   picture.onload=()=>{this.images[key]=picture;resolve(true)};
   picture.onerror=()=>{console.warn('Asset no disponible',url);resolve(false)};
   picture.src=url;
  }));
  return Promise.all(loaders).then(()=>{
   this.ready=!!this.images.ready;
   this.ballLoaded=!!this.images.ball;
   return this.ready;
  });
 }
 // Dynamic image loader with cached failures, so missing files never trigger
 // repeated network requests in the 60 FPS renderer.
 loadBaked(url){
  if(this.bakedImages.has(url))return Promise.resolve(this.bakedImages.get(url));
  if(this.bakedRequests.has(url))return this.bakedRequests.get(url);
  if(typeof Image==='undefined')return Promise.resolve(null);
  const pending=new Promise(resolve=>{
   const image=new Image();
   image.decoding='async';
   image.onload=()=>{this.bakedImages.set(url,image);resolve(image)};
   image.onerror=()=>{this.bakedImages.set(url,null);resolve(null)};
   image.src=url;
  }).then(result=>{this.bakedRequests.delete(url);return result});
  this.bakedRequests.set(url,pending);
  return pending;
 }
 prepareEquipment(save){
  if(!save)return Promise.resolve(false);
  const outfit=OUTFITS.some(x=>x.id===save.equippedOutfit)?save.equippedOutfit:'red';
  const bat=COSMETICS.some(x=>x.id===save.equipped)?save.equipped:'classic';
  const ball=BALL_STYLES.some(x=>x.id===save.equippedBall)?save.equippedBall:'classic';
  const key=[outfit,bat,ball].join('/');
  if(key===this.equipmentKey&&this.equipmentReady)return Promise.resolve(true);
  this.equipmentKey=key;this.equipmentReady=false;
  const paths=equippedAssetPaths(outfit,bat,ball);
  return Promise.all(paths.map(p=>this.loadBaked(p))).then(assets=>{
   const success=assets.every(Boolean);
   if(this.equipmentKey===key){this.equipmentReady=success;this.styledPoses.clear();this.ballSurfaceCache={}}
   return success;
  });
 }
 getStyledPose(pose,save){
  const original=this.images[pose];
  if(!original||!save)return original;
  const outfit=OUTFITS.find(i=>i.id===save.equippedOutfit)||OUTFITS[0];
  const bat=COSMETICS.find(i=>i.id===save.equipped)||COSMETICS[0];
  const key=[pose,outfit.id,bat.id].join('/');
  if(this.styledPoses.has(key))return this.styledPoses.get(key);
  const dressed=this.bakedImages.get(bakedAssetUrl('outfit',outfit.id,pose));
  if(!dressed)return original;
  if(bat.id==='classic'){
   this.styledPoses.set(key,dressed);
   return dressed;
  }
  const batless=this.bakedImages.get(bakedAssetUrl('outfit',outfit.id,pose,true));
  const weapon=this.bakedImages.get(bakedAssetUrl('bat',bat.id));
  // Antes se componía todo en un canvas del tamaño del personaje: al salir
  // del borde el bate se RECORTABA. La capa principal lo dibuja entero detrás.
  if(!batless||!weapon)return dressed;
  this.styledPoses.set(key,batless);
  return batless;
 }
 getStyledBall(save){
  const item=BALL_STYLES.find(i=>i.id===save?.equippedBall)||BALL_STYLES[0];
  return this.bakedImages.get(bakedAssetUrl('ball',item.id))||this.images.ball;
 }
 // El mismo dibujo equipado se usa desde el lanzamiento del pitcher hasta
 // el último rebote. Nunca aparece una pelota blanca que se transforma al batear.
 drawEquippedBall(ctx,game,size,spin,camera,target){
  const image=this.getStyledBall(game.save);
  if(!image)return;
  const item=BALL_STYLES.find(ball=>ball.id===game.save?.equippedBall)||BALL_STYLES[0];
  // La misma pelota aprobada se proyecta como esfera desde el golpe:
  // backspin en vuelo y topspin tras el primer bote, sin girar como moneda.
  // Su copia UV se rellena internamente, SIN alterar el dibujo original.
  // Keep the same spherical projection even at zero speed: no texture snap.
  if(item.design==='baseball'&&spin?.orientation&&camera&&target){
   // Metallic gold has deliberate reflections; ordinary leather is de-lit.
   this.ballSurfaceCache.leatherColor=item.id==='dorada'?null:item.color;
   drawSpinningBaseball(ctx,image,size,spin,camera,target,this.ballSurfaceCache);
   return;
  }
  // Only the pre-hit pitch has no accumulated spin.
  // Las pelotas temáticas siguen girando íntegras sin costuras extrañas.
  if(item.design!=='baseball')ctx.rotate(spin?.angle||0);
  ctx.drawImage(image,-size*.5,-size*.5,size,size);
 }
 resize(){
  const canvas=this.canvas,ctx=this.ctx;
  if(!ctx||!canvas)return null;
  const width=canvas.clientWidth||window.innerWidth,height=canvas.clientHeight||window.innerHeight;
  const ratio=Math.min(window.devicePixelRatio||1,2);
  if(width!==this.lastWidth||height!==this.lastHeight||ratio!==this.lastRatio){
   canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
   this.lastWidth=width;this.lastHeight=height;this.lastRatio=ratio;
  }
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.clearRect(0,0,width,height);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  return {width,height};
 }
 draw(game,zoom=62){
  const ctx=this.ctx,dimensions=this.resize();
  if(!ctx||!dimensions)return;
  const {width,height}=dimensions;
  const camera=game.fxCamera||game.camera,target=game.target;
  const pose=selectBatterPose({...game,swingElapsed:game.visualSwingElapsed??game.swingElapsed});
  const sprite=this.getStyledPose(pose,game.save);
  if(this.ready&&sprite){
   const foot=projectToScreen(camera,target,[-2.3,.10,-5],width,height,zoom);
   const crown=projectToScreen(camera,target,[-2.3,8.2,-5],width,height,zoom);
   if(foot&&crown){
    const heightPx=Math.max(180,Math.min(height*.60,Math.abs(foot.y-crown.y)*.78));
    const widthPx=heightPx*((sprite.naturalWidth||sprite.width)/(sprite.naturalHeight||sprite.height));
    const outfitId=game.save?.equippedOutfit;
    const registration=sprite!==this.images[pose]?OUTFIT_WEAPON_POSES[outfitId]?.[pose]:null;
    const originX=foot.x-widthPx*(registration?.foot??.47);
    const originY=foot.y-heightPx;
    ctx.save();
    // Una sombra mínima bajo el sprite lo integra en el estadio 3D.
    ctx.fillStyle='rgba(4,22,31,.26)';
    ctx.beginPath();ctx.ellipse(foot.x,foot.y+2,widthPx*.26,Math.max(5,heightPx*.022),0,0,Math.PI*2);ctx.fill();
    if(!game.save?.reducedEffects&&game.state==='swinging'&&this.images.trail){
     ctx.globalAlpha=Math.max(0,.78-(game.visualSwingElapsed??game.swingElapsed??0)*5);
     ctx.drawImage(this.images.trail,originX-18,originY+heightPx*.23,widthPx*1.7,heightPx*.54);
     ctx.globalAlpha=1;
    }
    // Arma por detrás del cuerpo sobre el canvas COMPLETO de pantalla.
    // No hay límite de recorte a la silueta de la pose.
    const selectedBat=COSMETICS.find(c=>c.id===game.save?.equipped)||COSMETICS[0];
    const selectedOutfit=OUTFITS.find(c=>c.id===game.save?.equippedOutfit)||OUTFITS[0];
    if(pose&&selectedBat.id!=='classic'){
     const weapon=this.bakedImages.get(bakedAssetUrl('bat',selectedBat.id));
     const withoutBat=this.bakedImages.get(bakedAssetUrl('outfit',selectedOutfit.id,pose,true));
     if(weapon&&withoutBat&&sprite===withoutBat){
      const p=weaponPlacement(pose,originX,originY,widthPx,heightPx,selectedOutfit.id);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
      ctx.scale(p.scale,p.scale);
      ctx.drawImage(weapon,-18,-58);
      ctx.restore();
     }
    }
    // Las manos y el cuerpo se pintan encima de la empuñadura.
    ctx.drawImage(sprite,originX,originY,widthPx,heightPx);
    if(!game.save?.reducedEffects&&game.state==='swinging'&&game.pendingShot?.quality!=='miss'&&(game.visualSwingElapsed??game.swingElapsed??0)<.085&&this.images.spark){
     const alpha=Math.max(0,1-(game.visualSwingElapsed??game.swingElapsed??0)*11);
     ctx.globalAlpha=alpha;
     ctx.drawImage(this.images.spark,originX+widthPx*.75,originY+heightPx*.39,Math.min(100,widthPx*.58),Math.min(100,widthPx*.58));
    }
    ctx.restore();
   }
  }
  if(!game.save?.reducedEffects)game.impactFX?.draw?.(ctx,camera,target,width,height,zoom);
  // Pelota del pitcher, dibujada en el mismo overlay 2D y con el mismo
  // equipamiento que la pelota física del batazo.
  const pitchPosition=this.ballLoaded&&['pitching','aiming','swinging','whiff'].includes(game.state)
   ?pitcherBallPosition((game.pitchElapsed||0)/(game.pitchDuration||1.52)):null;
  if(pitchPosition){
   const p=projectToScreen(camera,target,[pitchPosition.x,pitchPosition.y,pitchPosition.z],width,height,zoom);
   if(p&&p.x>-90&&p.x<width+90&&p.y>-90&&p.y<height+90){
    const edge=projectToScreen(camera,target,[pitchPosition.x+.72,pitchPosition.y,pitchPosition.z],width,height,zoom);
    const projected=edge?Math.hypot(edge.x-p.x,edge.y-p.y):12;
    const size=Math.max(11,Math.min(36,ballSpriteDiameter(projected,width)*.78));
    ctx.save();ctx.translate(p.x,p.y);
    this.drawEquippedBall(ctx,game,size,null,camera,target);
    ctx.restore();
   }
  }
  if(this.ballLoaded&&game.ball&&['flight','landing','rest'].includes(game.state)){
   const b=game.ball;
   const p=projectToScreen(camera,target,[b.x,b.y,b.z],width,height,zoom);
   if(p&&p.x>-160&&p.x<width+160&&p.y>-160&&p.y<height+160){
    const edge=projectToScreen(camera,target,[b.x+1.45,b.y,b.z],width,height,zoom);
    const radiusPx=edge?Math.hypot(edge.x-p.x,edge.y-p.y):15;
    const size=ballSpriteDiameter(radiusPx,width);
    // Sombra proyectada sobre la superficie física: hierba, asfalto, tejado o agua.
    const surface=surfaceBelowBall(b);
    const shadow=projectToScreen(camera,target,[b.x,surface.y+.08,b.z],width,height,zoom);
    if(shadow&&shadow.x>-80&&shadow.x<width+80&&shadow.y>-80&&shadow.y<height+80){
     const altitude=Math.max(0,b.y-surface.y);
     ctx.save();
     ctx.globalAlpha=ballShadowOpacity(altitude);
     ctx.fillStyle=surface.type==='water'||surface.type==='swamp'||surface.type==='puddle'?'#d4f4e7':'#071820';
     ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=Math.min(16,size*.45);
     ctx.beginPath();ctx.ellipse(shadow.x,shadow.y,size*.66,size*.23,0,0,Math.PI*2);ctx.fill();
     ctx.restore();
    }
    ctx.save();ctx.translate(p.x,p.y);
    const bounce=game.state==='rest'?0:Math.max(0,Math.min(1,b.bounceVisual||0));
    if(bounce)ctx.scale(1+.08*bounce,1-.11*bounce);
    this.drawEquippedBall(ctx,game,size,b.spin,camera,target);
    ctx.restore();

   }
  }
 }
}
