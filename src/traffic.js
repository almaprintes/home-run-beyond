// Vehículos originales de Top Down RACE, renders completos a 3/4 del Taller.
// Copias locales independientes. NUNCA usar las skins cenitales de carrera.
// La carretera cruza perpendicular al vuelo (+/-X en el mundo).
export const TRAFFIC_VEHICLES=Object.freeze([
 {id:'helix_spark',src:'./assets/traffic/three-quarter/helix_spark.webp'},
 {id:'avenir_gripline',src:'./assets/traffic/three-quarter/avenir_gripline.webp'},
 {id:'veloce_flash',src:'./assets/traffic/three-quarter/veloce_flash.webp'},
 {id:'crown_axis',src:'./assets/traffic/three-quarter/crown_axis.webp'},
 {id:'forge_hammer',src:'./assets/traffic/three-quarter/forge_hammer.webp'},
 {id:'helix_comet',src:'./assets/traffic/three-quarter/helix_comet.webp'}
]);
export const ROAD_CENTERS=Object.freeze([265,465,665,865,1065,1265,1465,1665,1865]);
export const TRAFFIC_HALF_SPAN=260;
const wrap=(n,span)=>((n%span)+span)%span;

export function roadTraffic(roadZ,elapsedSeconds){
 if(!ROAD_CENTERS.includes(roadZ))return [];
 const t=Number.isFinite(elapsedSeconds)?elapsedSeconds:0;
 const cars=[];
 for(let i=0;i<6;i++){
  const lane=i%2,dir=lane===0?1:-1;
  const speed=12+Math.floor(i/2)*4+(Math.floor(roadZ/200)%3)*1.5;
  const offset=i*91+Math.floor(roadZ/200)*67;
  const x=wrap(offset+dir*t*speed,TRAFFIC_HALF_SPAN*2)-TRAFFIC_HALF_SPAN;
  const z=roadZ+(lane===0?-5.5:5.5);
  cars.push({id:TRAFFIC_VEHICLES[(i+Math.floor(roadZ/200))%TRAFFIC_VEHICLES.length].id,
   x,z,y:.95,length:7.5,width:3.9,dir,speed,lane,roadZ});
 }
 return cars;
}
export function visibleRoadTraffic(viewZ,time,range=350){
 if(!Number.isFinite(viewZ))return [];
 return ROAD_CENTERS.filter(z=>Math.abs(z-viewZ)<=range)
  .flatMap(z=>roadTraffic(z,time));
}

// Huella sobre el asfalto para la sombra de contacto (no para pegar la
// carrocería como una textura cenital).
export function trafficCorners(vehicle,topY=vehicle.y){
 const length=vehicle.length,width=vehicle.width;
 const world=(u,v,y)=>[vehicle.x+vehicle.dir*(.5-v)*length,y,vehicle.z+(u-.5)*width];
 return {topLeft:world(0,0,topY),topRight:world(1,0,topY),
  bottomLeft:world(0,1,topY),bottomRight:world(1,1,topY)};
}

// Proyección del largo real del vehículo sobre el carril. Su sprite mantiene
// la imagen de Taller en 3/4 y se alza vertical sobre ese punto de apoyo.
export function trafficBillboard(vehicle,camera,target,width,height,zoom,project,image){
 if(typeof project!=='function'||!image)return null;
 const y=.15,z=vehicle.z,x=vehicle.x;
 const a=project(camera,target,[x-vehicle.length*.5,y,z],width,height,zoom);
 const b=project(camera,target,[x+vehicle.length*.5,y,z],width,height,zoom);
 const foot=project(camera,target,[x,y,z],width,height,zoom);
 if(!a||!b||!foot)return null;
 const span=Math.hypot(b.x-a.x,b.y-a.y);
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 if(!Number.isFinite(span)||span<1.4||!(iw>0&&ih>0))return null;
 const spriteWidth=span*1.12,spriteHeight=spriteWidth*ih/iw;
 if(foot.x< -spriteWidth||foot.x>width+spriteWidth||
    foot.y< -spriteHeight||foot.y>height+spriteHeight)return null;
 return {x:foot.x,y:foot.y,width:spriteWidth,height:spriteHeight,
  angle:Math.atan2(b.y-a.y,b.x-a.x),flip:vehicle.dir===1};
}

export function drawTrafficSprites(ctx,camera,target,width,height,zoom,project,images,vehicles){
 if(!ctx||typeof project!=='function')return 0;
 let painted=0;
 // Los lejanos se dibujan primero; así dos coches próximos se superponen bien.
 const ordered=[...(vehicles||[])].sort((a,b)=>
  ((b.x-camera[0])**2+(b.z-camera[2])**2)-
  ((a.x-camera[0])**2+(a.z-camera[2])**2));
 for(const car of ordered){
  const sprite=images?.get?.(car.id);
  if(!sprite)continue;
  const p=trafficBillboard(car,camera,target,width,height,zoom,project,sprite);
  if(!p)continue;
  // Sombra baja sobre la calzada; la carrocería NO se deforma en ese plano.
  const shadow=trafficCorners(car,.12);
  const shade=[shadow.topLeft,shadow.topRight,shadow.bottomRight,shadow.bottomLeft]
   .map(v=>project(camera,target,v,width,height,zoom));
  if(shade.every(Boolean)){
   ctx.save();ctx.fillStyle='rgba(5,17,24,.16)';ctx.beginPath();
   ctx.moveTo(shade[0].x,shade[0].y);
   for(let j=1;j<4;j++)ctx.lineTo(shade[j].x,shade[j].y);
   ctx.closePath();ctx.fill();ctx.restore();
  }
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(p.angle);
  if(p.flip)ctx.scale(-1,1); // El frontal original apunta a la izquierda.
  ctx.drawImage(sprite,-p.width*.5,-p.height*.96,p.width,p.height);
  ctx.restore();
  painted++;
 }
 return painted;
}
