import {lerp} from './engine.js';
// Mundo entero dibujado con primitivas low-poly, sin ningún asset externo.
const PI=Math.PI;
export const rand=(a,b=0)=>{let n=Math.sin(a*127.1+b*311.7+26.63)*43758.5453;return n-Math.floor(n)};
const choose=(a,colors)=>colors[Math.floor(rand(a)*colors.length)];
const roofs=['#f19a6b','#e4c688','#8db3c6','#df6b68','#efb851','#7fb3b5','#dcb0c9'];
const walls=['#e8cfac','#f2dab2','#bdcdd5','#dfb9a9','#d6d8c4','#b7cdda','#f1b591'];
const treeColors=['#4e9c6c','#72bd77','#398f77','#57ab86','#9abf61'];
function line(r,ax,az,bx,bz,y,width,col){let dx=bx-ax,dz=bz-az;r.box((ax+bx)/2,y,(az+bz)/2,width,.06,Math.hypot(dx,dz),col,Math.atan2(dx,dz))}
function tree(r,x,z,h=7,seed=1){r.pole(x,h*.25,z,.55,h*.5,'#815a42');const c=choose(seed,treeColors);r.cone(x,h*.64,z,h*.28,h*.66,c);r.cone(x,h*.91,z,h*.24,h*.55,c)}
function bush(r,x,z,s=2){r.ball(x,s*.38,z,s,'#43835e')}
export function riverAt(z){return z>1620&&z<1740}
export function roadAt(z){return z>155&&Math.abs((z+35)%200-100)<14}
export function areaAt(z){if(z<115)return 'ESTADIO';if(z<460)return 'BARRIOS';if(z<1550)return 'CIUDAD';if(z<1950)return 'RÍO Y PUERTO';if(z<3600)return 'COLINAS';if(z<10000)return 'GRAN VALLE';return 'MUNDO ABIERTO'}
function worldHeight(x,z){if(z<1850)return 0;if(z<3600){const a=Math.sin(z*.004+x*.013)*.65+Math.sin(z*.015-x*.009)*.3;return Math.max(0,a*4)}return Math.max(0,(Math.sin(x*.009+z*.004)+Math.sin(x*.004-z*.007))*.8)}
export function groundAt(x,z){if(riverAt(z))return {y:0,type:'water'};if(roadAt(z))return {y:0,type:'road'};return {y:worldHeight(x,z),type:'grass'}}
function buildingData(i,j){const n=i*89+j*791;const h=10+rand(n+1)*39;const w=18+rand(n+2)*15;const d=17+rand(n+3)*23;return {h,w,d,color:choose(n+4,walls),roof:choose(n+8,roofs)}}
export function collideBuilding(pos){if(pos.z<230||pos.z>1530||Math.abs(pos.x)>310)return null;const grid=60;const j=Math.round((pos.z-270)/grid);const i=Math.round(pos.x/grid);const x=i*grid,z=270+j*grid;const b=buildingData(i,j);if(Math.abs(pos.x-x)<b.w*.5+1&&Math.abs(pos.z-z)<b.d*.5+1&&pos.y<=b.h+3)return {x,z,h:b.h};return null}
function city(r,x,z,idx,row,lod){const b=buildingData(idx,row);const paint=b.color;const y=b.h*.5;const col=paint;r.box(x,y,z,b.w,b.h,b.d,col);r.box(x,b.h+.7,z,b.w+2,1.4,b.d+2,b.roof);r.box(x,b.h+2,z,b.w*.36,2,b.d*.25,'#a4d7d4');
 if(lod<2){const winColor=rand(idx,row)>.5?'#9fe0dc':'#fbdf9b';const levels=Math.min(4,Math.floor(b.h/7));for(let t=0;t<levels;t++){const yy=3+t*7;for(let s of [-1,1]){r.box(x+s*b.w*.23,yy,z+b.d*.5+.16,3.6,3.3,.27,winColor);r.box(x+s*(b.w*.5+.1),yy,z, .26,3.3,3.6,winColor)}}}
}
function road(r,x,z,w,d){r.box(x,.035,z,w,.09,d,'#364f5c');r.box(x,.1,z,w*.022,.025,d,'#e5c48b')}
export function drawTerrain(r,viewZ,viewX=0,viewY=0,time=0){const maxR=viewZ<3000?370:700;const start=Math.max(0,Math.floor((viewZ-maxR)/200)-1),end=Math.floor((viewZ+maxR)/200)+1;
 for(let chunk=start;chunk<=end;chunk++){
   const mid=chunk*200+100;if(mid>0){const h=worldHeight(viewX,mid);const g=mid<1750?'#7fbb74':mid<3600?'#86b784':'#95b78a';r.field(0,h-.23,mid,2500,202,g);r.field(0,h-.22,mid,300,199,mid<1900?'#81bd75':'#93bf79')}
   if(chunk*200<1750&&(chunk+1)*200>1620){r.field(0,-.09,1680,2500,120,'#4badd1');for(let x=-720;x<720;x+=36)r.box(x,.035,1660+((x%4)*8),13,.025,2,'#9adfea');for(let i=0;i<4;i++){let xx=-250+i*155+Math.sin(time*.32+i)*24;r.box(xx,1.1,1690+i*6,11,2,6,'#f4e5c8');r.box(xx,2.8,1690+i*6,4,2,4,'#d06f64');r.pole(xx+4,6,1690+i*6,.2,7,'#fff5d5')}}
   if(chunk>0){road(r,0,chunk*200+65,880,24);for(let x=-420;x<420;x+=32)r.box(x,.16,chunk*200+65,13,.06,1.5,'#f5cf92');
    if(Math.abs(chunk*200+65-viewZ)<370)for(let j=0;j<6;j++){const x=((j*173+time*(12+j%3*7)+500)%850)-425,zz=chunk*200+65+(j%2?5.5:-5.5),col=choose(chunk*19+j,['#f0ad6e','#f6e1ba','#8ac4c9','#ec736a','#d9bded']);r.box(x,1.55,zz,7.5,2.8,4.5,col);r.box(x-1.5,3,zz,3.4,1.4,4.1,'#b8d8d4');for(let k of [-1,1])r.ball(x+k*2.4,.68,zz+2.2,1.25,'#263a4c')}
   }
 }
 if(viewZ<2800){const lo=Math.max(0,Math.floor((viewZ-400-270)/60)),hi=Math.min(24,Math.floor((viewZ+400-270)/60));for(let j=lo;j<=hi;j++){const z=270+j*60;if(riverAt(z)||roadAt(z))continue;for(let i=-5;i<=5;i++){const x=i*60;if(Math.abs(x-viewX)>450)continue;const n=i*11+j*191;const lod=Math.abs(z-viewZ)>210?2:1;if(rand(n)<.16){tree(r,x,z,8+rand(n+5)*6,n);tree(r,x+15,z+12,5+rand(n+7)*6,n+32)}else city(r,x,z,i,j,lod);r.box(x+24,.08,z+25,8,.15,8,'#87c77b')}}}
 if(viewZ>1800){let startJ=Math.max(0,Math.floor((viewZ-500-1900)/70)),endJ=Math.floor((viewZ+500-1900)/70);for(let j=startJ;j<=endJ;j++){const z=1900+j*70;for(let i=-5;i<=5;i++){const x=i*80;const y=worldHeight(x,z);if(rand(i,j)>.28)tree(r,x,z,z>3600?12:8,i*99+j);
 if(rand(i*31,j*19)>.87)r.cone(x,y+11,z,20,32,'#879a74')}}}
 // Una vista al horizonte no tiene por qué cargar el mundo completo.
}
function sky(r,camZ,camX,camY){if(camY>240) return;for(let i=0;i<11;i++){const z=camZ-230+((i*107+700)%900),x=camX+((i*193)%800)-400,y=100+(i%4)*22;const a=12+(i%3)*8;r.ball(x,y,z,a,'#f5faff');r.ball(x+10,y+3,z-3,a*.72,'#ffffff');r.ball(x-12,y-2,z+2,a*.85,'#e7f6ff')}}
function stadium(r){r.field(0,.014,38,285,290,'#448e60');for(let i=0;i<11;i++){const z=-40+i*24;r.field(0,.018,z,285,11,i%2?'#559e70':'#4c9368')}
 r.field(0,.13,18,54,54,'#b77e52',PI/4);r.field(0,.16,18,43,43,'#c58b5e',PI/4);r.field(0,.19,18,29,29,'#64a46a',PI/4);
 line(r,0,0,29,25,.21,.35,'#f5f0d6');line(r,0,0,-29,25,.21,.35,'#f5f0d6');line(r,29,25,0,50,.21,.28,'#f5f0d6');line(r,-29,25,0,50,.21,.28,'#f5f0d6');
 for(const [x,z] of [[0,0],[29,25],[-29,25],[0,50]])r.box(x,.26,z,2,.11,2,'#f9faf4',PI/4);
 r.pole(0,.6,21,4,1.1,'#be865a');r.field(0,.75,21,2.2,1,'#f6f3e8');
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
export function drawActors(r,throwProgress=0,swingProgress=0,batColor="#e7b56e"){person(r,-2.3,-5,'batter',swingProgress,true,batColor);person(r,0,21,'pitcher',throwProgress*3,false);if(throwProgress>0 && throwProgress<1){const t=throwProgress;const z=20.5-25.4*t, y=2.5+.35*Math.sin(t*PI);r.ball(0,y,z,.72,'#fffefa');r.add('ball',0,y,z,.77,.77,.77,'#ffffff');}}
export function drawWorld(r,cam,game){const z=cam[2],x=cam[0];r.fogDistance=cam[1]>250?1300:540;r.begin();sky(r,z,x,cam[1]);drawTerrain(r,z,x,cam[1],game.clock||0);if(z<460&&cam[1]<340){stadium(r);if(game.state!=='flight'&&game.state!=='landing')drawActors(r,game.pitch||0,game.swing||0,game.batColor)}
 if(game.ball&&['flight','landing'].includes(game.state)){const b=game.ball;
  if(game.liveSeconds<.46){for(let k=0;k<20;k++){const a=k*Math.PI*2/20,rad=(1-game.liveSeconds/.46)*7+game.liveSeconds*14;r.ball(-2.3+Math.cos(a)*rad,2.2+Math.sin(a)*rad,game.liveSeconds*18,.75+(.46-game.liveSeconds),'#ffda79')}}
  for(let i=6;i>=1;i--){let q=(i/6)*.07;const xx=b.x-b.vx*q,yy=b.y-b.vy*q+.5*9.81*q*q,zz=b.z-b.vz*q;const ss=1.5*(1-i/8);r.ball(xx,Math.max(.4,yy),zz,ss,i>3?'#ffc58e':'#fcead2')}
  r.ball(b.x,b.y,b.z,3.0,'#e6b9a0');r.ball(b.x,b.y,b.z,2.6,'#ffffff');r.box(b.x+.85,b.y+.2,b.z+.85,.17,.16,1.6,'#d45b50',.65);
  r.ball(b.x,b.y-.65,b.z,3,'#fff8e2');
 }
}