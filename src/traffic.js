// Vehículos 2.5D: sprites de carrera auténticos de Top Down RACE.
// Copias locales, sin descargar assets del otro juego en runtime.
// Las carreteras son transversales al vuelo (+Z): el tráfico cruza por +/-X.
export const TRAFFIC_VEHICLES=Object.freeze([
 {id:'helix_spark',src:'./assets/traffic/helix_spark.webp'},
 {id:'avenir_gripline',src:'./assets/traffic/avenir_gripline.webp'},
 {id:'veloce_flash',src:'./assets/traffic/veloce_flash.webp'},
 {id:'crown_axis',src:'./assets/traffic/crown_axis.webp'},
 {id:'forge_hammer',src:'./assets/traffic/forge_hammer.webp'},
 {id:'helix_comet',src:'./assets/traffic/helix_comet.webp'}
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
// True top-down cars are placed on a road-surface parallelogram, projected
// using the SAME view-projection matrix as the ground and baseball.
// Rear and front retain their physical orientation while reversing direction.
export function trafficCorners(vehicle,topY=vehicle.y){
 const length=vehicle.length,width=vehicle.width;
 const world=(u,v,y)=>[vehicle.x+vehicle.dir*(.5-v)*length,y,vehicle.z+(u-.5)*width];
 return {topLeft:world(0,0,topY),topRight:world(1,0,topY),
  bottomLeft:world(0,1,topY),bottomRight:world(1,1,topY)};
}
export function drawTrafficSprites(ctx,camera,target,width,height,zoom,project,images,vehicles){
 if(!ctx||typeof project!=='function')return 0;
 let painted=0;
 for(const car of vehicles||[]){
  const sprite=images?.get?.(car.id);
  if(!sprite)continue;
  const world=trafficCorners(car);
  const a=project(camera,target,world.topLeft,width,height,zoom);
  const b=project(camera,target,world.topRight,width,height,zoom);
  const c=project(camera,target,world.bottomLeft,width,height,zoom);
  const d=project(camera,target,world.bottomRight,width,height,zoom);
  if(!a||!b||!c||!d)continue;
  const bounds=[a,b,c,d];
  if(bounds.every(p=>p.x < -100||p.x>width+100||p.y < -100||p.y>height+100))continue;
  // Light translucent contact shadow underneath. This does not rotate the
  // car or pretend its wheels are hovering above the asphalt.
  const shadow=trafficCorners(car,.15);
  const shade=[shadow.topLeft,shadow.topRight,shadow.bottomRight,shadow.bottomLeft]
   .map(p=>project(camera,target,p,width,height,zoom));
  if(shade.every(Boolean)){
   ctx.save();ctx.fillStyle='rgba(5,17,24,.26)';ctx.beginPath();
   ctx.moveTo(shade[0].x,shade[0].y);
   for(let j=1;j<4;j++)ctx.lineTo(shade[j].x,shade[j].y);
   ctx.closePath();ctx.fill();ctx.restore();
  }
  ctx.save();
  ctx.transform(b.x-a.x,b.y-a.y,c.x-a.x,c.y-a.y,a.x,a.y);
  ctx.drawImage(sprite,0,0,1,1);
  ctx.restore();
  painted++;
 }
 return painted;
}
