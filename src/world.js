import {lerp} from './engine.js?v=0.27.0';
// Mundo entero dibujado con primitivas low-poly, sin ningún asset externo.
const PI=Math.PI;
export const rand=(a,b=0)=>{let n=Math.sin(a*127.1+b*311.7+26.63)*43758.5453;return n-Math.floor(n)};
const choose=(a,colors)=>colors[Math.floor(rand(a)*colors.length)];
const roofs=['#f19a6b','#e4c688','#8db3c6','#df6b68','#efb851','#7fb3b5','#dcb0c9'];
const walls=['#e8cfac','#f2dab2','#bdcdd5','#dfb9a9','#d6d8c4','#b7cdda','#f1b591'];
const treeColors=['#4e9c6c','#72bd77','#398f77','#57ab86','#9abf61'];
function line(r,ax,az,bx,bz,y,width,col){let dx=bx-ax,dz=bz-az;r.box((ax+bx)/2,y,(az+bz)/2,width,.06,Math.hypot(dx,dz),col,Math.atan2(dx,dz))}
function tree(r,x,z,h=7,seed=1){
 r.setMaterial?.('wood');r.pole(x,h*.25,z,.55,h*.5,'#815a42');
 r.setMaterial?.('grass');const c=choose(seed,treeColors);
 r.cone(x,h*.64,z,h*.28,h*.66,c);r.cone(x,h*.91,z,h*.24,h*.55,c);
 r.setMaterial?.('plain');
}
function bush(r,x,z,s=2){r.ball(x,s*.38,z,s,'#43835e')}
export const RIVER_HALF_WIDTH=540;
export function riverAt(z,x=0){return z>1620&&z<1740&&Math.abs(x)<=RIVER_HALF_WIDTH}
export function roadAt(z){return z>155&&Math.abs((z+35)%200-100)<14}
export function areaAt(z){if(z<115)return 'ESTADIO';if(z<460)return 'BARRIOS';if(z<1550)return 'CIUDAD';if(z<1950)return 'RÍO Y PUERTO';if(z<3600)return 'COLINAS';if(z<10000)return 'GRAN VALLE';return 'MUNDO ABIERTO'}
function worldHeight(x,z){if(z<1850)return 0;if(z<3600){const a=Math.sin(z*.004+x*.013)*.65+Math.sin(z*.015-x*.009)*.3;return Math.max(0,a*4)}return Math.max(0,(Math.sin(x*.009+z*.004)+Math.sin(x*.004-z*.007))*.8)}
const WET_PATCHES=[
 {x:15,z:2140,rx:72,rz:55,type:'swamp'},
 {x:-95,z:2520,rx:34,rz:22,type:'puddle'},
 {x:105,z:2970,rx:45,rz:30,type:'puddle'},
 {x:-26,z:3480,rx:66,rz:40,type:'swamp'}
];
export function wetAreaAt(x,z){
 for(const patch of WET_PATCHES){
  if(((x-patch.x)/patch.rx)**2+((z-patch.z)/patch.rz)**2<1)return patch.type;
 }
 return null;
}
export function groundAt(x,z){
 if(riverAt(z,x))return {y:0,type:'water'};
 const wet=wetAreaAt(x,z);
 if(wet)return {y:worldHeight(x,z),type:wet};
 if(roadAt(z))return {y:0,type:'road'};
 return {y:worldHeight(x,z),type:'grass'};
}
function buildingData(i,j){
 const n=i*89+j*791,h=10+rand(n+1)*39,w=18+rand(n+2)*15,d=17+rand(n+3)*23;
 const roofMaterial=rand(n+10)<.22?'rubber':'solid';
 return {h,w,d,color:choose(n+4,walls),roof:roofMaterial==='rubber'?'#314f55':choose(n+8,roofs),roofMaterial};
}

// Única fuente de verdad para los edificios visibles y sus colisiones.
// La cuadrícula también genera árboles y huecos para carreteras/río.
export function buildingAt(i,j){
 if(!Number.isInteger(i)||!Number.isInteger(j)||i< -5||i>5||j<0||j>24)return null;
 const x=i*60,z=270+j*60,n=i*11+j*191;
 if(riverAt(z)||roadAt(z)||rand(n)<.16)return null;
 return {x,z,i,j,...buildingData(i,j)};
}
export function buildingBoxes(b){
 const halfW=b.w/2,halfD=b.d/2;
 return [
  {kind:'wall',material:'concrete',min:[b.x-halfW,0,b.z-halfD],max:[b.x+halfW,b.h,b.z+halfD]},
  {kind:'roof',material:b.roofMaterial,min:[b.x-halfW-1,b.h,b.z-halfD-1],max:[b.x+halfW+1,b.h+1.4,b.z+halfD+1]},
  {kind:'vent',material:'solid',min:[b.x-b.w*.18,b.h+1,b.z-b.d*.125],max:[b.x+b.w*.18,b.h+3,b.z+b.d*.125]}
 ];
}
function sweptSphereBox(start,end,radius,box){
 const d=[end.x-start.x,end.y-start.y,end.z-start.z],p=[start.x,start.y,start.z];
 let enter=-Infinity,exit=Infinity,axis=-1,sign=0;
 for(let a=0;a<3;a++){
  const low=box.min[a]-radius,high=box.max[a]+radius;
  if(Math.abs(d[a])<1e-9){if(p[a]<low||p[a]>high)return null;continue;}
  const t1=(low-p[a])/d[a],t2=(high-p[a])/d[a],near=Math.min(t1,t2),far=Math.max(t1,t2);
  if(near>enter){enter=near;axis=a;sign=d[a]>0?-1:1}
  exit=Math.min(exit,far);
  if(exit<enter)return null;
 }
 if(exit<0||enter>1)return null;
 let t=Math.max(0,enter),point={x:p[0]+d[0]*t,y:p[1]+d[1]*t,z:p[2]+d[2]*t};
 let normal=[0,0,0];
 if(enter>=0){normal[axis]=sign;}
 else{
  // Recuperación segura si ya se encuentra solapando el sólido.
  const faces=[];for(let a=0;a<3;a++){
   faces.push({axis:a,sign:-1,dist:p[a]-(box.min[a]-radius),boundary:box.min[a]-radius});
   faces.push({axis:a,sign:1,dist:box.max[a]+radius-p[a],boundary:box.max[a]+radius});
  }
  faces.sort((a,b)=>a.dist-b.dist);
  const f=faces[0];normal[f.axis]=f.sign;
  const coords=[point.x,point.y,point.z];coords[f.axis]=f.boundary;
  point={x:coords[0],y:coords[1],z:coords[2]};
 }
 return {t,point,normal:{x:normal[0],y:normal[1],z:normal[2]},kind:box.kind,material:box.material};
}
export function traceBuildingCollision(from,to,radius=1.45){
 if(!from||!to)return null;
 const xMin=Math.min(from.x,to.x)-radius-2,xMax=Math.max(from.x,to.x)+radius+2;
 const zMin=Math.min(from.z,to.z)-radius-2,zMax=Math.max(from.z,to.z)+radius+2;
 // Iteramos las celdas cruzadas, no solo el edificio más cercano al punto final.
 const iMin=Math.max(-5,Math.floor(xMin/60)-1),iMax=Math.min(5,Math.ceil(xMax/60)+1);
 const jMin=Math.max(0,Math.floor((zMin-270)/60)-1),jMax=Math.min(24,Math.ceil((zMax-270)/60)+1);
 let nearest=null;
 for(let j=jMin;j<=jMax;j++)for(let i=iMin;i<=iMax;i++){
  const b=buildingAt(i,j);if(!b)continue;
  if(b.x+b.w/2+radius+2<xMin||b.x-b.w/2-radius-2>xMax||b.z+b.d/2+radius+2<zMin||b.z-b.d/2-radius-2>zMax)continue;
  for(const box of buildingBoxes(b)){
   const hit=sweptSphereBox(from,to,radius,box);
   if(!hit)continue;
   const dot=(to.x-from.x)*hit.normal.x+(to.y-from.y)*hit.normal.y+(to.z-from.z)*hit.normal.z;
   if(hit.t>0&&dot>=0)continue;
   if(!nearest||hit.t<nearest.t-1e-8||(Math.abs(hit.t-nearest.t)<1e-8&&hit.normal.y>nearest.normal.y)){
    nearest={...hit,building:b};
   }
  }
 }
 return nearest;
}
// Altura de la superficie visible situada debajo de la pelota. Misma geometría
// de cubiertas y casetas que se utiliza para las colisiones, nunca sombras flotantes.
export function surfaceBelowBall(ball){
 const x=Number(ball?.x),z=Number(ball?.z),y=Number(ball?.y);
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(y))return {y:0,type:'grass'};
 let floor=groundAt(x,z);
 const imin=Math.max(-5,Math.floor(x/60)-1),imax=Math.min(5,Math.ceil(x/60)+1);
 const jmin=Math.max(0,Math.floor((z-270)/60)-1),jmax=Math.min(24,Math.ceil((z-270)/60)+1);
 for(let j=jmin;j<=jmax;j++)for(let i=imin;i<=imax;i++){
  const building=buildingAt(i,j);if(!building)continue;
  for(const box of buildingBoxes(building)){
   if(x<box.min[0]||x>box.max[0]||z<box.min[2]||z>box.max[2])continue;
   const top=box.max[1];
   if(top<=y+1.5&&top>floor.y)floor={y:top,type:box.kind==='roof'?'roof':box.kind==='vent'?'concrete':'building'};
  }
 }
 return floor;
}
// API de compatibilidad: solo devuelve un edificio realmente existente.
export function collideBuilding(pos){
 if(!pos)return null;
 for(let j=Math.max(0,Math.floor((pos.z-270)/60)-1);j<=Math.min(24,Math.ceil((pos.z-270)/60)+1);j++)
  for(let i=Math.max(-5,Math.floor(pos.x/60)-1);i<=Math.min(5,Math.ceil(pos.x/60)+1);i++){
   const b=buildingAt(i,j);if(!b)continue;
   for(const box of buildingBoxes(b))
    if(pos.x>=box.min[0]&&pos.x<=box.max[0]&&pos.y>=box.min[1]&&pos.y<=box.max[1]&&pos.z>=box.min[2]&&pos.z<=box.max[2])
     return {x:b.x,z:b.z,h:b.h,kind:box.kind};
  }
 return null;
}
// Segmento cámara → pelota; válido incluso si la cámara nace dentro del obstáculo.
export function segmentBlockedByBox(cam,ball,box){
 if(!cam||!ball||!box)return false;
 const p=Array.isArray(cam)?cam:[cam.x,cam.y,cam.z],q=[ball.x,ball.y,ball.z];
 let tMin=0,tMax=1;
 for(let a=0;a<3;a++){
  const dir=q[a]-p[a];
  if(!Number.isFinite(dir)||!Number.isFinite(p[a]))return false;
  if(Math.abs(dir)<1e-9){if(p[a]<box.min[a]||p[a]>box.max[a])return false;continue}
  const t0=(box.min[a]-p[a])/dir,t1=(box.max[a]-p[a])/dir;
  tMin=Math.max(tMin,Math.min(t0,t1));
  tMax=Math.min(tMax,Math.max(t0,t1));
  if(tMin>tMax)return false;
 }
 return tMin<=1&&tMax>=0;
}
export function buildingObscuresBall(cam,ball,building){
 return !!(ball&&building&&buildingBoxes(building).some(box=>segmentBlockedByBox(cam,ball,box)));
}
function treeObscuresBall(cam,ball,x,z,h){
 const radius=Math.max(4,h*.35);
 return segmentBlockedByBox(cam,ball,{min:[x-radius,0,z-radius],max:[x+radius,h*1.48,z+radius]});
}
function city(r,x,z,idx,row,lod,ghost=false){
 const b=buildingAt(idx,row);if(!b)return;
 if(ghost)r.setLayer?.('ghost');
 const paint=b.color;const y=b.h*.5;const col=paint;
 r.setMaterial?.(rand(idx*17,row*13)<.60?'plaster':'brick');
 r.box(x,y,z,b.w,b.h,b.d,col);
 r.setMaterial?.(b.roofMaterial==='rubber'?'rubber':'roof');
 r.box(x,b.h+.7,z,b.w+2,1.4,b.d+2,b.roof);
 r.setMaterial?.('metal');
 r.box(x,b.h+2,z,b.w*.36,2,b.d*.25,'#a4d7d4');
 r.setMaterial?.('plain');
 if(lod<2){const winColor=rand(idx,row)>.5?'#9fe0dc':'#fbdf9b';const levels=Math.min(4,Math.floor(b.h/7));for(let t=0;t<levels;t++){const yy=3+t*7;for(let s of [-1,1]){r.box(x+s*b.w*.23,yy,z+b.d*.5+.16,3.6,3.3,.27,winColor);r.box(x+s*(b.w*.5+.1),yy,z, .26,3.3,3.6,winColor)}}}
 r.setLayer?.('opaque');
}
function road(r,x,z,w,d){
 r.setMaterial?.('asphalt');r.box(x,.035,z,w,.09,d,'#364f5c');
 r.setMaterial?.('plain');r.box(x,.19,z,w*.022,.035,d,'#e5c48b');
}
// El suelo se extiende más allá del horizonte visible. Los edificios y vehículos
// siguen usando un radio corto para mantener los FPS de la PWA en iPhone.
export function terrainCoverage(viewZ,viewY=0){
 const h=Math.max(0,Number(viewY)||0);
 return {
  detail:viewZ<3000?370:700,
  behind:Math.max(750,Math.min(2000,650+h*2.5)),
  ahead:Math.max(1900,Math.min(4400,1550+h*5.5))
 };
}
// Material de cada solar: parches grandes, sin líneas finas ni brillo repetitivo.
// Coordenadas ancladas al mundo: al mover la cámara no se desliza la textura.
export function terrainPatchMaterial(chunk,index){
 const n=Math.floor(rand(chunk*37+index*91,chunk*11+index*3)*10);
 if(chunk>=1&&chunk<=7)return n<3?'paving':n<5?'dirt':'grass';
 return n<2?'dirt':'grass';
}
export function terrainBaseColor(z){
 if(z<200)return '#538f59';
 if(z<1550)return '#659c63';
 if(z<1850)return '#83a66a';
 if(z<3600)return '#739d6b';
 return '#759a68';
}
export function drawTerrain(r,viewZ,viewX=0,viewY=0,time=0,focusBall=null){
 const cam=[viewX,viewY,viewZ];
 const drawTree=(x,z,h,seed)=>{
  if(focusBall&&treeObscuresBall(cam,focusBall,x,z,h))r.setLayer?.('ghost');
  tree(r,x,z,h,seed);r.setLayer?.('opaque');
 };
 const coverage=terrainCoverage(viewZ,viewY);
 const start=Math.max(0,Math.floor((viewZ-coverage.behind)/200)-1);
 const end=Math.floor((viewZ+coverage.ahead)/200)+1;
 // Una sola capa verde de seguridad debajo de todas las calles y edificios:
 // nunca debe verse el color cian del framebuffer como si fuera suelo.
 r.field(viewX,-.60,viewZ+500,9000,9000,'#608a5c',0,'grass');
 for(let chunk=start;chunk<=end;chunk++){
   const mid=chunk*200+100;
   if(mid>0){
    const h=worldHeight(viewX,mid);
    r.field(viewX,h-.18,mid,4200,204,terrainBaseColor(mid),0,'grass');
    // Cerca de la cámara, el césped alterna tierra seca y solares pavimentados.
    // Pocas parcelas grandes: más legibles que cientos de puntitos con shimmer.
    if(Math.abs(mid-viewZ)<coverage.detail+320 && !riverAt(mid)){
     const xOrigin=Math.floor(viewX/320)*320;
     for(let i=-4;i<=4;i++){
      const seed=chunk*61+i*131;
      const mat=terrainPatchMaterial(chunk,i);
      const col=mat==='paving'?'#afa894':mat==='dirt'?'#ab926d':
                  rand(seed,9)<.5?'#5e9a60':'#82b079';
      const xx=xOrigin+i*320+rand(seed,2)*70-35;
      const zz=mid+rand(seed,3)*95-47.5;
      const ww=130+rand(seed,4)*155,dd=46+rand(seed,5)*64;
      r.field(xx,h-.065,zz,ww,dd,col,rand(seed,6)*.35,mat);
     }
     if(chunk>0&&chunk<8){
      // Parcelas y aceras urbanas a ambos lados de la calzada.
      for(const side of [-1,1]){
       r.field(side*265,h-.038,mid,150,130,'#aba99b',0,'paving');
       r.field(side*365,h-.032,mid+38,68,46,'#a78765',0,'dirt');
      }
     }
    }
   }
   // El cauce ocupa realmente 1.080 m de anchura, NO toda la ciudad.
   // Las orillas de tierra quedan alrededor, encima del césped.
   if(chunk*200<1750&&(chunk+1)*200>1620){
    r.field(0,-.07,1680,1460,154,'#a49b72',0,'dirt');
    r.field(0,-.015,1680,RIVER_HALF_WIDTH*2,118,'#3d9ab4',0,'water');
   }
   if(Math.abs(mid-viewZ)>coverage.detail+160)continue;
   if(chunk*200<1750&&(chunk+1)*200>1620){for(let x=-520;x<=520;x+=36)r.box(x,.035,1660+((x%4)*8),13,.025,2,'#9adfea');for(let i=0;i<4;i++){let xx=-250+i*155+Math.sin(time*.32+i)*24;r.box(xx,1.1,1690+i*6,11,2,6,'#f4e5c8');r.box(xx,2.8,1690+i*6,4,2,4,'#d06f64');r.pole(xx+4,6,1690+i*6,.2,7,'#fff5d5')}}
   if(chunk>0){road(r,0,chunk*200+65,880,24);for(let x=-420;x<420;x+=32)r.box(x,.16,chunk*200+65,13,.06,1.5,'#f5cf92');
    if(Math.abs(chunk*200+65-viewZ)<370)for(let j=0;j<6;j++){const x=((j*173+time*(12+j%3*7)+500)%850)-425,zz=chunk*200+65+(j%2?5.5:-5.5),col=choose(chunk*19+j,['#f0ad6e','#f6e1ba','#8ac4c9','#ec736a','#d9bded']);r.box(x,1.55,zz,7.5,2.8,4.5,col);r.box(x-1.5,3,zz,3.4,1.4,4.1,'#b8d8d4');for(let k of [-1,1])r.ball(x+k*2.4,.68,zz+2.2,1.25,'#263a4c')}
   }
 }
 if(viewZ<2800){const lo=Math.max(0,Math.floor((viewZ-400-270)/60)),hi=Math.min(24,Math.floor((viewZ+400-270)/60));for(let j=lo;j<=hi;j++){const z=270+j*60;if(riverAt(z)||roadAt(z))continue;for(let i=-5;i<=5;i++){const x=i*60;if(Math.abs(x-viewX)>450)continue;const n=i*11+j*191;const lod=Math.abs(z-viewZ)>210?2:1;const b=buildingAt(i,j);
 if(!b){drawTree(x,z,8+rand(n+5)*6,n);drawTree(x+15,z+12,5+rand(n+7)*6,n+32)}
 else city(r,x,z,i,j,lod,buildingObscuresBall(cam,focusBall,b));r.box(x+24,.13,z+25,8,.20,8,'#b9b8ad',0,0,0,'paving')}}}
 // Charcos y pantanos bajos: misma huella procedural para dibujo y resistencia del terreno.
 for(const patch of WET_PATCHES){
  if(Math.abs(patch.z-viewZ)>700)continue;
  const yy=worldHeight(patch.x,patch.z)+.12;
  r.setMaterial?.('water');r.add('ball',patch.x,yy,patch.z,patch.rx*2,.10,patch.rz*2,
    patch.type==='swamp'?'#597f71':'#62a8b4');
  r.add('ball',patch.x-patch.rx*.15,yy+.05,patch.z+patch.rz*.12,patch.rx*.95,.045,patch.rz*.7,
    patch.type==='swamp'?'#779b75':'#8bcaca');
  r.setMaterial?.('plain');
 }
 if(viewZ>1800){let startJ=Math.max(0,Math.floor((viewZ-500-1900)/70)),endJ=Math.floor((viewZ+500-1900)/70);for(let j=startJ;j<=endJ;j++){const z=1900+j*70;for(let i=-5;i<=5;i++){const x=i*80;const y=worldHeight(x,z);if(rand(i,j)>.28)drawTree(x,z,z>3600?12:8,i*99+j);
 if(rand(i*31,j*19)>.87){
  if(focusBall&&treeObscuresBall(cam,focusBall,x,z,32))r.setLayer?.('ghost');
  r.cone(x,y+11,z,20,32,'#879a74');r.setLayer?.('opaque');
 }}}}
 // Una vista al horizonte no tiene por qué cargar el mundo completo.
}
function sky(r,camZ,camX,camY){if(camY>240) return;for(let i=0;i<11;i++){const z=camZ-230+((i*107+700)%900),x=camX+((i*193)%800)-400,y=100+(i%4)*22;const a=12+(i%3)*8;r.ball(x,y,z,a,'#f5faff');r.ball(x+10,y+3,z-3,a*.72,'#ffffff');r.ball(x-12,y-2,z+2,a*.85,'#e7f6ff')}}
function stadium(r){r.field(0,-.02,38,285,290,'#448e60');for(let i=0;i<11;i++){const z=-40+i*24;r.field(0,.15,z,285,11,i%2?'#559e70':'#4c9368')}
 r.field(0,.13,18,54,54,'#b77e52',PI/4,'dirt');r.field(0,.16,18,43,43,'#c58b5e',PI/4,'dirt');r.field(0,.19,18,29,29,'#64a46a',PI/4,'grass');
 line(r,0,0,29,25,.21,.35,'#f5f0d6');line(r,0,0,-29,25,.21,.35,'#f5f0d6');line(r,29,25,0,50,.21,.28,'#f5f0d6');line(r,-29,25,0,50,.21,.28,'#f5f0d6');
 for(const [x,z] of [[0,0],[29,25],[-29,25],[0,50]])r.box(x,.26,z,2,.11,2,'#f9faf4',PI/4);
 r.setMaterial?.('dirt');r.pole(0,.6,21,4,1.1,'#be865a');r.setMaterial?.('plain');r.field(0,.75,21,2.2,1,'#f6f3e8');
 for(let i=0;i<=38;i++){const a=-1.52+i*3.04/38,x=121*Math.sin(a),z=121*Math.cos(a);r.pole(x,3.9,z,.65,8,'#2a6572');if(i<38){const b=-1.52+(i+1)*3.04/38,nx=121*Math.sin(b),nz=121*Math.cos(b);line(r,x,z,nx,nz,2,1.9,i%5===0?'#ff9b52':'#285d67');}
 if(i%2===0){const bx=137*Math.sin(a),bz=137*Math.cos(a);r.box(bx,4.2,bz,13,7,10,'#315b71',a);r.box(bx,7.9,bz,14,1.2,11,'#e6a95c',a);r.box(bx,10,bz,13,1.3,12,'#264259',a);}}
 // Tribunas detrás del home plate.
 for(let k=0;k<7;k++){for(let s of [-1,1]){r.box(s*(18+k*8),4+k*.9,-32-k*5,7,7+k*1.8,15,'#31566d',s*-.28);r.box(s*(18+k*8),8.1+k*1.8,-34-k*5,8,.7,16,k%2?'#edb662':'#e9e6d3',s*-.28)}}
 // Marcador y focos.
 r.pole(-87,17,108,1.3,35,'#d5e2e4');r.box(-87,30,108,33,18,2.8,'#11324c');r.box(-87,29,106.45,28,11,.2,'#1f665c');r.box(-89,34,106,14,2,.2,'#ffc15a');
 for(const [x,z] of [[-116,32],[116,32],[-75,-65],[75,-65]]){r.pole(x,18,z,1.35,36,'#a2b8b9');r.box(x,36,z,13,4,3,'#d9e9de');for(let d=-1;d<=1;d++)r.ball(x+d*4,36,z-1.8,2.4,'#fff5c3')}
 for(let i=-7;i<8;i++){if(i===0)continue;tree(r,i*35,150+Math.abs(i)*7,7+rand(i)*5,i)}
}
function person(r,x,z,team,phase=0,batting=false,batColor='#e7b56e'){const bob=batting?Math.sin(phase*6)*.08:Math.sin(phase*2)*.04;
 const palette=team==='pitcher'?{shirt:'#f4dfce',pants:'#e8e8e9',cap:'#22677e',skin:'#e6a47c'}:{shirt:'#feaa45',pants:'#fcf7e8',cap:'#152e50',skin:'#bc815f'};
 const bend=batting?Math.sin(phase)*.3:0;
 // ground shadow
 r.add('ball',x,.035,z,2,.05,1.3,'#2b6553');
 for(let side of [-1,1]){r.pole(x+side*.51,1.05,z+side*.1,.36,2.1,palette.pants,0,side*bend);r.box(x+side*.56,.22,z+.32,.9,.38,1.4,'#203249')}
 r.box(x,3.06+bob,z,2.2,2.4,1.35,palette.shirt);
 r.ball(x,4.95+bob,z,1.82,palette.skin);r.add('ball',x,5.67+bob,z-.03,1.96,.43,1.92,palette.cap);
 r.box(x,5.58+bob,z+.84,1.63,.18,.92,palette.cap);
 r.ball(x-.32,4.98,z+.83,.13,'#1e2330');r.ball(x+.32,4.98,z+.83,.13,'#1e2330');
 if(batting){const swing=phase;const lift=Math.sin(swing*Math.PI)*.4;r.pole(x-1.35,3.5+bob,z+.2,.28,1.8,palette.skin,0,.3,-.65+lift);r.pole(x+1.1,3.45+bob,z+.3,.28,1.8,palette.skin,0,-.5,1.1-lift);
 const angle= -.55+swing*3.6;
 r.pole(x+Math.sin(angle)*2.15,4.55+bob,z+Math.cos(angle)*1.25,.21,4.8,batColor,0,.22,1.45-angle);
 r.box(x,3.2+bob,z+1.0,.65,.18,.15,'#fff0d4');
 }else{r.pole(x-1.35,3.13+bob,z+.3,.29,1.5,palette.skin,0,-.1,-.35);r.pole(x+1.35,3.1+bob,z+.3,.29,1.5,palette.skin,0,-.1,.35);r.ball(x-1.6,2.7+bob,z+.65,.65,'#89533b')}
}
// Cilindro orientado entre dos puntos: brazos y bate procedurales de perfil.
function limb(r,a,b,radius,color){
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz);
 if(len<1e-5)return;
 const rx=Math.atan2(dz,dy),rz=-Math.asin(Math.max(-1,Math.min(1,dx/len)));
 r.pole((a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5,radius,len,color,0,rx,rz);
}
export function drawBatter(r,x=-2.3,z=-5,phase=0,batColor='#e7b56e'){
 const p=Math.max(0,Math.min(1,phase)),s=p*p*(3-2*p),skin='#bc815f';
 const shirt='#feaa45',cap='#152e50',pants='#fcf7e8';
 // Postura lateral de bateo: piernas abiertas, rodillas flexionadas y hombros girados.
 r.add('ball',x,.06,z,3.1,.08,2.2,'#285a4b');
 for(const side of [-1,1]){
  const fx=x+side*1.04,fz=z+side*.43;
  limb(r,[x+side*.6,2.03,z],[fx,1.0,fz],.34,pants);
  limb(r,[fx,1.0,fz],[fx+side*.22,.33,fz+.13],.30,pants);
  r.box(fx+side*.30,.24,fz+.33,1.2,.46,1.55,'#1d344e',.25);
 }
 r.box(x,2.5,z,2.35,.33,1.45,'#203c55',.70);
 r.box(x,3.25,z,2.40,2.25,1.55,shirt,.78);
 r.box(x+.83,3.23,z+.18,.21,.8,.75,'#fff0d4',.78);
 r.ball(x,5.03,z,1.90,skin);
 r.add('ball',x,5.70,z,2.06,.43,2.03,cap);
 r.box(x+.72,5.57,z+.58,1.57,.20,1.1,cap,.55);
 // Cara y gorra apuntadas al costado del campo para verse desde la cámara diagonal.
 r.ball(x-.81,5.04,z+.38,.15,'#202638');
 r.ball(x-.87,5.04,z-.26,.12,'#202638');
 r.box(x-.91,4.74,z+.05,.10,.12,.48,'#9d6147');
 const hand=[x+.92-.44*s,4.32-.14*s,z-1.0+1.04*s];
 const leftShoulder=[x-.84,4.03,z+.12],rightShoulder=[x+.90,4.15,z+.26];
 const leftElbow=[x-.15,3.80,z-1.12+.44*s];
 const rightElbow=[x+1.39-.35*s,3.94,z-.48+.58*s];
 limb(r,leftShoulder,leftElbow,.31,skin);limb(r,leftElbow,hand,.28,skin);
 limb(r,rightShoulder,rightElbow,.32,skin);
 limb(r,rightElbow,[hand[0]+.08,hand[1]-.12,hand[2]-.08],.26,skin);
 r.ball(hand[0],hand[1],hand[2],.58,'#e8b588');
 // Bate largo alzado detrás del hombro, visible durante la espera y el golpe.
 const tip=[x+1.5-1.75*s,8.10-3.4*s,z-1.25+5.8*s];
 const shaft=[hand[0]+(tip[0]-hand[0])*.34,
              hand[1]+(tip[1]-hand[1])*.34,
              hand[2]+(tip[2]-hand[2])*.34];
 limb(r,hand,shaft,.18,'#44352d');
 limb(r,shaft,tip,.47,batColor);
 r.ball(hand[0],hand[1],hand[2],.36,'#f3d6a5');
 r.ball(tip[0],tip[1],tip[2],.71,batColor);
 r.box(hand[0],hand[1]-.13,hand[2],.46,.19,.46,'#d8b484');
}
export function drawActors(r,throwProgress=0,swingProgress=0,batColor='#e7b56e',hideBatter=false){
 if(!hideBatter)drawBatter(r,-2.3,-5,swingProgress,batColor);
 person(r,0,21,'pitcher',throwProgress*3,false);
 if(throwProgress>0 && throwProgress<1.26){
  const t=throwProgress,z=20.5-25.4*t,y=2.5+.35*Math.sin(Math.min(t,1)*PI);
  r.ball(-4.5*t,y,z,.72,'#fffefa');
  r.add('ball',-4.5*t,y,z,.77,.77,.77,'#ffffff');
 }
}
// Indicador único: pivote fijo en el punto de contacto del bate.
// La punta recorre un arco al variar angle; no se dibuja barra ni mini-flecha.
export function drawAimArrow(r,angle=0,quality='good'){
 const color=quality==='perfect'?'#72ffdd':quality==='excellent'?'#89eedf':
             quality==='miss'?'#ffa69b':'#78d9ff';
 const x=-4.5,z=-4.7,y=5.4,len=31;
 const dx=Math.sin(angle),dz=Math.cos(angle);
 const tipX=x+dx*len,tipZ=z+dz*len;
 r.setLayer?.('overlay');
 // Única flecha rígida girando alrededor de la misma base.
 r.box(x+dx*len*.43,y,z+dz*len*.43,2.05,.42,len*.86,color,angle);
 for(const side of [-1,1]){
  const px=tipX-Math.sin(angle+side*.66)*8.1;
  const pz=tipZ-Math.cos(angle+side*.66)*8.1;
  const vx=tipX-px,vz=tipZ-pz;
  r.box((px+tipX)/2,y,(pz+tipZ)/2,2.8,.49,Math.hypot(vx,vz),color,Math.atan2(vx,vz));
 }
 // La bola del origen no se desplaza aunque cambie el rumbo.
 r.ball(x,y+.14,z,2.35,'#fff3bf');
 r.setLayer?.('opaque');
}
export function drawBaseball(r,x,y,z,spin=0){
 // Pelota de béisbol inequívoca: esfera blanca suave, costuras rojas y puntadas.
 // Su propia pasada de profundidad mantiene el balón visible tras los obstáculos.
 r.setLayer?.('overlay');
 r.add('baseball',x,y,z,3.35,3.35,3.35,'#fffdf5');
 const radius=1.74,segments=15;
 for(const meridian of [-.83,.83,2.31,3.97]){
  const seam=(theta,offset=0)=>{
   const phi=meridian+.19*Math.sin(theta*2)+offset+spin;
   const st=Math.sin(theta);
   return [x+radius*st*Math.cos(phi),y+radius*Math.cos(theta),z+radius*st*Math.sin(phi)];
  };
  let prev=seam(.2);
  for(let i=1;i<=segments;i++){
   const theta=.2+(Math.PI-.4)*i/segments,next=seam(theta);
   limb(r,prev,next,.068,'#b52f38');prev=next;
  }
  for(let i=2;i<=segments-2;i+=2){
   const theta=.2+(Math.PI-.4)*i/segments;
   limb(r,seam(theta,-.105),seam(theta,.105),.050,'#df4549');
  }
 }
 r.setLayer?.('opaque');
}
export function drawWorld(r,cam,game){
 const z=cam[2],x=cam[0];r.fogDistance=cam[1]>250?1300:540;r.begin();
 sky(r,z,x,cam[1]);
 drawTerrain(r,z,x,cam[1],game.clock||0,game.state==='flight'?game.ball:null);if(z<460&&cam[1]<340){stadium(r);if(game.state!=='flight'&&game.state!=='landing')drawActors(r,(game.pitchElapsed||0)/(game.pitchDuration||1.52),game.swing||0,game.batColor,!!game.spriteReady);
 if(game.state==='aiming'&&!game.sprites?.images?.['aim-center'])drawAimArrow(r,game.aimAngle||0,game.pendingShot?.quality||'good');
 }
 if(game.ball&&['flight','landing'].includes(game.state)){const b=game.ball;
  if(game.liveSeconds<.46){for(let k=0;k<20;k++){const a=k*Math.PI*2/20,rad=(1-game.liveSeconds/.46)*7+game.liveSeconds*14;r.ball(-2.3+Math.cos(a)*rad,2.2+Math.sin(a)*rad,game.liveSeconds*18,.75+(.46-game.liveSeconds),'#ffda79')}}
  for(let i=6;i>=1;i--){let q=(i/6)*.07;const xx=b.x-b.vx*q,yy=b.y-b.vy*q+.5*9.81*q*q,zz=b.z-b.vz*q;const ss=1.5*(1-i/8);r.ball(xx,Math.max(.4,yy),zz,ss,i>3?'#ffc58e':'#fcead2')}
  if(!game.sprites?.ballLoaded)drawBaseball(r,b.x,b.y,b.z,b.spin?.angle||0);
 }
}