// Tráfico propio de Home Run Beyond: automóviles PROCEDIMENTALES en 3D.
// Ni sprites cenitales ni imágenes importadas de Top Down RACE.
// Calzada transversal al vuelo (+/-X). Eje del vehículo: X, rueda: Z.
export const TRAFFIC_VEHICLES=Object.freeze([
 {id:'hatch_blanco',kind:'hatch',color:'#e4e7e6',length:7.2,width:3.45,radius:.91},
 {id:'sedan_azul',kind:'sedan',color:'#2b638c',length:8.2,width:3.65,radius:.96},
 {id:'suv_verde',kind:'suv',color:'#4d7364',length:8.1,width:3.9,radius:1.08},
 {id:'coupe_rojo',kind:'hatch',color:'#c9483a',length:7.7,width:3.55,radius:.91},
 {id:'pickup_gris',kind:'pickup',color:'#959d9c',length:8.7,width:3.95,radius:1.13},
 {id:'sedan_negro',kind:'sedan',color:'#292d38',length:8.1,width:3.65,radius:.96}
]);
export const ROAD_CENTERS=Object.freeze([265,465,665,865,1065,1265,1465,1665,1865]);
// El punto de reciclaje queda fuera de la calzada, cuyo límite es +/-280.
export const TRAFFIC_HALF_SPAN=322;
const TAU=Math.PI*2,wrap=(n,span)=>((n%span)+span)%span;
export function roadTraffic(roadZ,elapsedSeconds){
 if(!ROAD_CENTERS.includes(roadZ))return [];
 const t=Number.isFinite(elapsedSeconds)?Math.max(0,elapsedSeconds):0,cars=[];
 for(let i=0;i<6;i++){
  const lane=i%2,dir=lane===0?1:-1;
  // All cars in a lane share speed and fixed phase separation on the loop.
  // This guarantees clearance at every time, including offscreen recycling.
  const speed=14+lane*3+(Math.floor(roadZ/200)%3)*1.5;
  const offset=Math.floor(i/2)*(TRAFFIC_HALF_SPAN*2/3)+lane*91+Math.floor(roadZ/200)*67;
  const x=wrap(offset+dir*t*speed,TRAFFIC_HALF_SPAN*2)-TRAFFIC_HALF_SPAN;
  const car=TRAFFIC_VEHICLES[(i+Math.floor(roadZ/200))%TRAFFIC_VEHICLES.length];
  cars.push({...car,x,z:roadZ+(lane===0?-5.5:5.5),dir,speed,lane,roadZ,
   // Ángulo local alrededor del eje Z: v=r*omega. R_y(pi) invierte
   // automáticamente el giro mundial al circular en sentido contrario.
   wheelAngle:wrap(-t*speed/car.radius+offset*.02,TAU),wheelSpeed:speed/car.radius});
 }
 return cars;
}
export function visibleRoadTraffic(viewZ,time,range=360){
 if(!Number.isFinite(viewZ))return [];
 return ROAD_CENTERS.filter(z=>Math.abs(z-viewZ)<=range)
  .flatMap(z=>roadTraffic(z,time));
}
// Collision shapes share the rendered chassis and axle dimensions.
export function trafficCollisionParts(car){
 const L=car.length,W=car.width,R=car.radius,dir=car.dir;
 const parts=[
  {kind:'traffic-body',material:'metal',min:[-L*.49,.47,-W*.45],max:[L*.49,1.72,W*.45]},
  {kind:'traffic-roof',material:'metal',min:[-L*.29,1.72,-W*.365],max:[L*.29,car.kind==='suv'?3.34:3.12,W*.365]}
 ];
 for(const axle of [-1,1])for(const side of [-1,1]){
  const x=dir*axle*L*.306,z=side*(W*.485+.46*.23);
  parts.push({kind:'traffic-wheel',material:'rubber',min:[x-R,.14,z-.23],max:[x+R,2*R+.14,z+.23]});
 }
 return parts;
}
// Continuous relative-motion sweep of a sphere against rounded box bounds.
function sweepPart(a,b,r,part){
 const d=a.map((v,i)=>b[i]-v);
 let lo=0,hi=1;
 for(let i=0;i<3;i++){
  const min=part.min[i]-r,max=part.max[i]+r;
  if(Math.abs(d[i])<1e-10){if(a[i]<min||a[i]>max)return null;continue}
  const p=(min-a[i])/d[i],q=(max-a[i])/d[i];
  lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));
  if(lo>hi)return null;
 }
 const at=t=>a.map((v,i)=>v+d[i]*t);
 const gap=p=>p.map((v,i)=>v-Math.max(part.min[i],Math.min(part.max[i],v)));
 const dist=t=>gap(at(t)).reduce((sum,v)=>sum+v*v,0);
 let t=lo;
 if(dist(lo)>r*r+1e-9){
  // Squared distance to a box is convex along a straight segment.
  let x=lo,y=hi;
  for(let k=0;k<22;k++){const p=(2*x+y)/3,q=(x+2*y)/3;if(dist(p)<dist(q))y=q;else x=p}
  const closest=(x+y)/2;
  if(dist(closest)>r*r+1e-8)return null;
  let left=lo,right=closest;
  for(let k=0;k<24;k++){const mid=(left+right)/2;if(dist(mid)>r*r)left=mid;else right=mid}
  t=right;
 }
 const p=at(t),g=gap(p),len=Math.hypot(...g);
 let n;
 if(len>1e-8)n=g.map(v=>v/len);
 else{
  const faces=[];for(let i=0;i<3;i++){faces.push([p[i]-part.min[i],i,-1],[part.max[i]-p[i],i,1])}
  faces.sort((a,b)=>a[0]-b[0]);n=[0,0,0];n[faces[0][1]]=faces[0][2];
 }
 if(d.reduce((sum,v,i)=>sum+v*n[i],0)>=-1e-8)return null;
 const closest=p.map((v,i)=>Math.max(part.min[i],Math.min(part.max[i],v)));
 const point=len>1e-8?closest.map((v,i)=>v+n[i]*r):p.map((v,i)=>n[i]===0?v:(n[i]<0?part.min[i]-r:part.max[i]+r));
 return {t,point,normal:{x:n[0],y:n[1],z:n[2]},kind:part.kind,material:part.material};
}
export function traceVehicleCollision(from,to,car,startX,endX,radius=1.45){
 const a=[from.x-startX,from.y,from.z-car.z],b=[to.x-endX,to.y,to.z-car.z];
 let first=null;
 for(const part of trafficCollisionParts(car)){
  const hit=sweepPart(a,b,radius,part);
  if(hit&&(!first||hit.t<first.t)){
   const x=startX+(endX-startX)*hit.t;
   first={...hit,point:{x:hit.point[0]+x,y:hit.point[1],z:hit.point[2]+car.z},car};
  }
 }
 return first;
}
export function traceTrafficCollision(from,to,t0,t1,radius=1.45,physicsDt=t1-t0){
 if(!from||!to||Math.min(from.y,to.y)>3.4+radius)return null;
 let first=null;
 for(const z of ROAD_CENTERS){
  if(Math.min(from.z,to.z)>z+9+radius||Math.max(from.z,to.z)<z-9-radius)continue;
  const cars=roadTraffic(z,t0);
  for(const car of cars){
   const endX=car.x+car.dir*car.speed*Math.max(0,t1-t0);
   // Recycling is outside the rendered road; never sweep across a teleport.
   if(Math.min(Math.abs(car.x),Math.abs(endX))>284)continue;
   if(Math.min(from.x,to.x)>Math.max(car.x,endX)+car.length*.5+radius||
      Math.max(from.x,to.x)<Math.min(car.x,endX)-car.length*.5-radius)continue;
   const hit=traceVehicleCollision(from,to,car,car.x,endX,radius);
   if(hit&&(!first||hit.t<first.t))first={...hit,vehicleVx:physicsDt>0?(endX-car.x)/physicsDt:0};
  }
 }
 return first;
}
// Impulse in the car's moving frame. Vehicle keeps its speed and course.
export function trafficDeflection(ball,hit){
 const n=hit.normal,cv=hit.vehicleVx||0,rx=ball.vx-cv,ry=ball.vy,rz=ball.vz;
 const dot=rx*n.x+ry*n.y+rz*n.z,inward=Math.max(0,-dot);
 if(inward<=0)return null;
 const wheel=hit.kind==='traffic-wheel',e=wheel?.42:.54,tangent=wheel?.78:.84;
 const vx=cv+(rx-dot*n.x)*tangent+inward*e*n.x;
 let vy=(ry-dot*n.y)*tangent+inward*e*n.y;
 const vz=(rz-dot*n.z)*tangent+inward*e*n.z;
 // A low tyre strike can squeeze the ball sideways and produce a modest hop.
 if(wheel&&hit.point.y<=2.2&&n.y>-.35)vy=Math.max(vy,Math.min(4,inward*.16));
 return {vx,vy,vz,inward};
}
export function drawProceduralTraffic(r,vehicles,cam=[0,15,0]){
 if(!r||typeof r.add!=='function')return 0;
 let drawn=0;
 r.setMaterial?.('plain');
 for(const car of vehicles||[]){
  // Recorte 3D independiente de la tasa de fotogramas; LOD mecánico cercano.
  if(Math.abs(car.x)>284||Math.abs(car.x-cam[0])>320||Math.abs(car.z-cam[2])>425)continue;
  const x=car.x,z=car.z,L=car.length,W=car.width,dir=car.dir,
   yaw=dir===1?0:Math.PI,wheelY=car.radius+.14,
   wheelSpan=L*.306,thick=.46;
  const fine=Math.abs(car.x-cam[0])<155&&Math.abs(car.z-cam[2])<270;
  const kind=car.kind;
  // Sombra de contacto semitransparente, por debajo de neumáticos y chasis.
  r.setLayer?.('ghost');r.add('ball',x,.105,z,L*.86,.055,W*.86,'#11191d');
  r.setLayer?.('solid');
  r.add('carBody_'+kind,x,1.18,z,L,2.1,W,car.color,yaw);
  r.add('carGlass_'+kind,x,1.95,z,L,kind==='suv'?1.35:1.12,W,'#203b4b',yaw);
  r.add('carRoof_'+kind,x,1.95,z,L,kind==='suv'?1.35:1.12,W,car.color,yaw);
  for(const axle of [-1,1])for(const side of [-1,1]){
   const wx=x+dir*axle*wheelSpan,wz=z+side*(W*.485+thick*.23);
   const diameter=2*car.radius;
   r.add('carTire',wx,wheelY,wz,diameter,diameter,thick,'#151b23',yaw,0,car.wheelAngle);
   // Llantas con cinco radios: misma rotación real que el neumático.
   if(fine){
    r.add('carRim',wx,wheelY,wz,diameter,diameter,thick,'#a4afb8',yaw,0,car.wheelAngle);
    r.add('carArch',wx,wheelY,z+side*(W*.495+.04),
     diameter*1.09,diameter*1.09,.08,'#2b3036',yaw);
   }
  }
  if(fine){
   // Faros delante, pilotos rojos detrás: siempre respetan dir, no hay
   // teletransporte gráfico ni un vehículo mirando en dirección contraria.
   for(const side of [-1,1]){
    r.box(x+dir*(L*.488),1.43,z+side*W*.32,.095,.24,.55,'#eaf5ed');
    r.box(x-dir*(L*.487),1.40,z+side*W*.32,.095,.24,.58,'#d94941');
    r.box(x+dir*L*.235,2.03,z+side*W*.525,.29,.22,.34,car.color);
    // Marcos de ventanilla y pilar central para leer la silueta a distancia.
    const bx=kind==='pickup'?.07:kind==='hatch'?-0.05:0;
    r.box(x+dir*bx*L,2.39,z+side*W*.41,.105,.85,.09,'#26323c');
   }
   r.box(x+dir*L*.503,.93,z,.10,.34,W*.48,'#182932');
   r.box(x-dir*L*.504,.92,z,.11,.25,W*.47,'#464a50');
   r.box(x+dir*L*.495,1.02,z,.10,.075,W*.40,'#9ba8ac');
   // Pickup: caja de carga abierta con su borde y portón.
   if(kind==='suv')for(const side of [-1,1]){
    r.box(x,3.38,z+side*W*.31,L*.42,.075,.09,'#303a40');
   }
   if(kind==='pickup'){
    for(const side of [-1,1]){
     r.box(x-dir*L*.38,2.0,z+side*W*.43,L*.215,.12,.16,car.color);
    }
    r.box(x-dir*L*.49,1.98,z,.13,.12,W*.76,car.color);
    r.box(x-dir*L*.36,1.89,z,L*.23,.05,W*.71,'#30383d');
   }
  }
  drawn++;
 }
 r.setLayer?.('opaque');
 return drawn;
}

// Distinguish physical vehicles by road and model ID, stable throughout a shot.
export function registerTrafficHit(ball,hit){
 const car=hit?.car;
 if(!ball||!hit?.kind?.startsWith('traffic-')||!car?.id||!ROAD_CENTERS.includes(car.roadZ))return false;
 const key=car.roadZ+':'+car.id;
 const cars=ball.hitCars??=new Set();
 const before=cars.size;cars.add(key);return cars.size>before;
}
