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
  const speed=12+Math.floor(i/2)*4+(Math.floor(roadZ/200)%3)*1.5;
  const offset=i*91+Math.floor(roadZ/200)*67;
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
  r.setLayer?.('opaque');
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
 return drawn;
}
