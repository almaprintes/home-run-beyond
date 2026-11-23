import {lookAt,perspective,mul4} from './engine.js?v=0.35.0';
import {surfaceBelowBall,pitcherBallPosition} from './world.js?v=0.35.0';
import {ballSpriteDiameter,ballShadowOpacity,ballImpactOpacity} from './ball-visuals.js?v=0.35.0';
import {COSMETICS,OUTFITS,BALL_STYLES} from './logic.js?v=0.35.0';
import {makeCosmeticCanvas} from './cosmetic-render.js?v=0.35.0';
import {ILLUSTRATED_BALLS,composeSpecialPose,makeIllustratedBall} from './cosmetic-art.js?v=0.35.0';

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
export const BALL_SURFACE_SIZE=64;
export function shadeRollingSurface(source,w,h,spin,camera,target,output,size=BALL_SURFACE_SIZE){
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
   output[dest]=source[src];output[dest+1]=source[src+1];
   output[dest+2]=source[src+2];
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
    cache.image=image;cache.source=srcCtx.getImageData(0,0,srcCanvas.width,srcCanvas.height);
    cache.canvas=outCanvas;cache.context=outCtx;
    cache.frame=outCtx.createImageData(BALL_SURFACE_SIZE,BALL_SURFACE_SIZE);
   }
   shadeRollingSurface(cache.source.data,cache.source.width,cache.source.height,
    spin,camera,target,cache.frame.data);
   cache.context.putImageData(cache.frame,0,0);
   ctx.drawImage(cache.canvas,-radius,-radius,size,size);
   return;
  }catch(error){
   // Unsupported/read-protected canvas still shows the original baseball.
   if(!cache.warned){console.warn('Sprite esférico no disponible',error);cache.warned=true}
  }
 }
 ctx.rotate(spin?.angle||0);ctx.drawImage(image,-radius,-radius,size,size);
}

export class BatterSprites{
 constructor(canvas){
  this.canvas=canvas;
  this.ctx=canvas?.getContext?.('2d',{alpha:true})||null;
  this.images={};this.ready=false;this.ballLoaded=false;
  this.lastWidth=0;this.lastHeight=0;this.lastRatio=0;this.ballSurfaceCache={};this.styledPoses=new Map();this.styledBalls=new Map();
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
 // Cache one recoloured copy per pose and equipment combination.
 // Original approved art is never overwritten.
 getStyledPose(pose,save){
  const source=this.images[pose];
  if(!source||!save)return source;
  const outfit=OUTFITS.find(item=>item.id===save.equippedOutfit)||OUTFITS[0];
  const bat=COSMETICS.find(item=>item.id===save.equipped)||COSMETICS[0];
  if(outfit.id==='red'&&bat.id==='classic')return source;
  const key=pose+'|'+outfit.id+'|'+bat.id;
  if(this.styledPoses.has(key))return this.styledPoses.get(key);
  const result=composeSpecialPose(source,outfit,bat,pose);
  this.styledPoses.set(key,result);
  return result;
 }
 getStyledBall(save){
  const source=this.images.ball,ball=BALL_STYLES.find(item=>item.id===save?.equippedBall)||BALL_STYLES[0];
  if(!source||ball.id==='classic')return source;
  if(this.styledBalls.has(ball.id))return this.styledBalls.get(ball.id);
  const result=ILLUSTRATED_BALLS.has(ball.design)?makeIllustratedBall(ball)||source:
   makeCosmeticCanvas(source,{kind:'ball',color:ball.color});
  this.styledBalls.set(ball.id,result);
  return result;
 }
 // El mismo dibujo equipado se usa desde el lanzamiento del pitcher hasta
 // el último rebote. Nunca aparece una pelota blanca que se transforma al batear.
 drawEquippedBall(ctx,game,size,spin,camera,target){
  const item=BALL_STYLES.find(b=>b.id===game.save?.equippedBall)||BALL_STYLES[0];
  const image=this.getStyledBall(game.save);
  if(!image)return;
  if(ILLUSTRATED_BALLS.has(item.design)){
   ctx.rotate(spin?.angle||0);
   ctx.drawImage(image,-size*.5,-size*.5,size,size);
  }else drawSpinningBaseball(ctx,image,size,spin,camera,target,this.ballSurfaceCache);
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
    const originX=foot.x-widthPx*.47;
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
    // Son las poses aprobadas: preparados, apuntado a ambos lados y swing.
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
  if(this.ballLoaded&&game.ball&&(game.state==='flight'||game.state==='landing')){
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
    const speed=Math.hypot(b.vx||0,b.vy||0,b.vz||0);
    if(speed>15&&typeof ctx.createLinearGradient==='function'){
     const tail=projectToScreen(camera,target,
      [b.x-(b.vx||0)*.047,b.y-(b.vy||0)*.047,b.z-(b.vz||0)*.047],
      width,height,zoom);
     if(tail&&Math.hypot(p.x-tail.x,p.y-tail.y)>3){
      ctx.save();const grad=ctx.createLinearGradient(tail.x,tail.y,p.x,p.y);
      grad.addColorStop(0,'rgba(255,250,225,0)');
      grad.addColorStop(1,'rgba(255,247,217,.46)');
      ctx.strokeStyle=grad;ctx.lineWidth=Math.min(6,size*.14);
      ctx.lineCap='round';ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(p.x,p.y);ctx.stroke();
      ctx.restore();
     }
    }
    ctx.save();ctx.translate(p.x,p.y);
    this.drawEquippedBall(ctx,game,size,b.spin,camera,target);
    ctx.restore();
    const impact=ballImpactOpacity(b.impactAge);
    if(impact>0&&typeof ctx.stroke==='function'){
     ctx.save();ctx.globalAlpha=impact;
     ctx.strokeStyle=b.impactMaterial==='water'?'#a5f0fc':'#ffe1ae';
     ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(p.x,p.y,size*(.63+(1-impact)*.65),0,Math.PI*2);ctx.stroke();
     ctx.restore();
    }
   }
  }
 }
}
