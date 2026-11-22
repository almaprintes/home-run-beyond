import {lookAt,perspective,mul4} from './engine.js?v=0.16.0';
import {surfaceBelowBall} from './world.js?v=0.16.0';
import {ballSpriteDiameter,ballShadowOpacity,ballImpactOpacity} from './ball-visuals.js?v=0.16.0';

// Recortes 2.5D tomados de las tres láminas aprobadas. No hay re-render ni
// sustitución por otro personaje: el mismo diseño conserva su silhouette y poses.
export const BATTER_ASSETS=Object.freeze({
 ready:'./assets/batter/ready.webp',
 watch:'./assets/batter/watch.webp',
 loaded:'./assets/batter/loaded.webp',
 'aim-left':'./assets/batter/aim-left.webp',
 'aim-center':'./assets/batter/aim-center.webp',
 'aim-right':'./assets/batter/aim-right.webp',
 contact:'./assets/batter/contact.webp',
 follow:'./assets/batter/follow.webp',
 ball:'./assets/baseball.webp',
 trail:'./assets/swing-trail.webp',
 spark:'./assets/hit-spark.webp'
});

export function selectBatterPose({state,pitch=0,aimAngle=0,swingElapsed=0}={}){
 if(state==='ready')return 'ready';
 if(state==='pitching')return pitch>.72?'loaded':pitch>.12?'watch':'ready';
 if(state==='aiming')return aimAngle<-.25?'aim-left':aimAngle>.25?'aim-right':'aim-center';
 if(state==='swinging')return swingElapsed<.073?'contact':'follow';
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

export class BatterSprites{
 constructor(canvas){
  this.canvas=canvas;
  this.ctx=canvas?.getContext?.('2d',{alpha:true})||null;
  this.images={};this.ready=false;this.ballLoaded=false;
  this.lastWidth=0;this.lastHeight=0;this.lastRatio=0;
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
  const sprite=this.images[pose];
  if(this.ready&&sprite){
   const foot=projectToScreen(camera,target,[-2.3,.10,-5],width,height,zoom);
   const crown=projectToScreen(camera,target,[-2.3,8.2,-5],width,height,zoom);
   if(foot&&crown){
    const heightPx=Math.max(180,Math.min(height*.60,Math.abs(foot.y-crown.y)*.78));
    const widthPx=heightPx*(sprite.naturalWidth/sprite.naturalHeight);
    const originX=foot.x-widthPx*.47;
    const originY=foot.y-heightPx;
    ctx.save();
    // Una sombra mínima bajo el sprite lo integra en el estadio 3D.
    ctx.fillStyle='rgba(4,22,31,.26)';
    ctx.beginPath();ctx.ellipse(foot.x,foot.y+2,widthPx*.26,Math.max(5,heightPx*.022),0,0,Math.PI*2);ctx.fill();
    if(game.state==='swinging'&&this.images.trail){
     ctx.globalAlpha=Math.max(0,.78-(game.visualSwingElapsed??game.swingElapsed??0)*5);
     ctx.drawImage(this.images.trail,originX-18,originY+heightPx*.23,widthPx*1.7,heightPx*.54);
     ctx.globalAlpha=1;
    }
    // Son las poses aprobadas: preparados, apuntado a ambos lados y swing.
    ctx.drawImage(sprite,originX,originY,widthPx,heightPx);
    if(game.state==='swinging'&&(game.visualSwingElapsed??game.swingElapsed??0)<.085&&this.images.spark){
     const alpha=Math.max(0,1-(game.visualSwingElapsed??game.swingElapsed??0)*11);
     ctx.globalAlpha=alpha;
     ctx.drawImage(this.images.spark,originX+widthPx*.75,originY+heightPx*.39,Math.min(100,widthPx*.58),Math.min(100,widthPx*.58));
    }
    ctx.restore();
   }
  }
  game.impactFX?.draw?.(ctx,camera,target,width,height,zoom);
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
    ctx.rotate((game.clock||0)*.32);
    ctx.drawImage(this.images.ball,-size*.5,-size*.5,size,size);
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
