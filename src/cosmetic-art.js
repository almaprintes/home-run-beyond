// Dibujo 2D procedural, 100% local/offline. Una mini luna tiene cráteres,
// una escoba tiene cerdas, una trucha tiene aletas; nunca se simulan con un tinte.
// Los sprites originales del jugador son la base para preservar sus poses.
import {makeCosmeticCanvas} from './cosmetic-render.js?v=0.38.0';

export const ILLUSTRATED_BALLS=new Set([
 'rainbow','sun','moon','earth','mars','saturn','billiard','tennis','golf',
 'beach','watermelon','orange','eyeball','meteor','disco','bomb','pumpkin',
 'snow','bowling','dice','donut','candy','crystal','soccer'
]);
export const WEAPON_POSES=Object.freeze({
 ready:{grip:[.265,.48],tip:[.105,.025]},
 watch:{grip:[.265,.48],tip:[.105,.025]},
 loaded:{grip:[.29,.42],tip:[.47,.015]},
 contact:{grip:[.56,.52],tip:[.88,.45]},
 follow:{grip:[.49,.26],tip:[.035,.19]}
});
const TAU=Math.PI*2;
function circle(ctx,x,y,r,fill,stroke=null,lw=2){
 ctx.beginPath();ctx.arc(x,y,Math.max(.0001,r),0,TAU);
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}
}
function ellipse(ctx,x,y,rx,ry,fill,stroke=null,lw=2){
 ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}
}
function poly(ctx,points,fill,stroke=null,lw=2){
 ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}
}
function line(ctx,points,color,width=3){
 ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);
 ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.stroke();
}
function stripe(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function seeded(n){const v=Math.sin(n*78.233+3.151)*43758.5453;return v-Math.floor(v)}
function gradient(ctx,x1,y1,x2,y2,cols){
 const g=ctx.createLinearGradient(x1,y1,x2,y2);
 for(const [p,c] of cols)g.addColorStop(p,c);
 return g;
}
function ballSphere(ctx,item){
 const g=ctx.createRadialGradient(-22,-30,5,0,0,59);
 g.addColorStop(0,'#fff9ee');g.addColorStop(.17,item.color);g.addColorStop(.78,item.color);
 g.addColorStop(1,'#313044');
 circle(ctx,0,0,51,g,'#ffffff55',1.5);
}
function polygonStar(ctx,r,points,fill,innerRatio=.53){
 const list=[];for(let i=0;i<points*2;i++){const a=i*Math.PI/points-Math.PI/2;const t=i%2?r*innerRatio:r;list.push([Math.cos(a)*t,Math.sin(a)*t])}
 poly(ctx,list,fill);
}
export function paintThemedBall(ctx,item,size=120){
 const mode=item.design||'baseball';
 const c=item.color||'#ffffff',accent=item.accent||'#d44747';
 ctx.save();ctx.translate(size/2,size/2);ctx.scale(size/128,size/128);
 if(mode==='dice'){
  // Dado genuinamente cúbico: tres caras isométricas, no una esfera tintada.
  poly(ctx,[[-42,-42],[8,-54],[53,-26],[0,-8]],'#fffaf0','#a9a2a1',2);
  poly(ctx,[[-42,-42],[0,-8],[0,47],[-45,18]],'#ddd5c6','#aaa5a0',2);
  poly(ctx,[[0,-8],[53,-26],[46,24],[0,47]],'#f6e6d5','#aaa5a0',2);
  for(const [x,y] of [[-29,-19],[-14,-8],[-29,7],[21,-5],[37,-13],[20,17]])circle(ctx,x,y,5,'#8b5b6d');
  ctx.restore();return;
 }
 if(mode==='sun'){for(let i=0;i<15;i++){const a=i*TAU/15;line(ctx,[[Math.cos(a)*43,Math.sin(a)*43],[Math.cos(a)*59,Math.sin(a)*59]],'#ffcc43',7)}}
 if(mode==='saturn'){ctx.save();ctx.rotate(-.30);ellipse(ctx,0,0,64,25,'#dbb575','#f3e2bd',7);ctx.restore()}
 if(mode==='bomb'){line(ctx,[[8,-48],[16,-65],[26,-68]],'#d6bf91',6);polygonStar(ctx,13,8,'#ffbe46')}
 if(mode==='meteor'){for(let i=0;i<6;i++){const y=-26+i*11;poly(ctx,[[-57,y-4],[-87-seeded(i)*10,y],[-58,y+5]],i%2?'#e86e32':'#ffc165')}}
 ballSphere(ctx,item);
 ctx.save();ctx.beginPath();ctx.arc(0,0,51,0,TAU);ctx.clip();
 switch(mode){
  case 'rainbow':
   for(let i=0;i<8;i++)stripe(ctx,-52,-50+i*13,104,14,['#e55659','#f6a34d','#fbe577','#73c86f','#54b7ca','#7c7dd7','#d594c6','#f7c9cd'][i]);
   break;
  case 'sun':{
   const glow=ctx.createRadialGradient(-12,-20,3,0,0,50);
   glow.addColorStop(0,'#fff9b6');glow.addColorStop(.34,'#ffcd4c');glow.addColorStop(.8,'#f28823');glow.addColorStop(1,'#b74c21');
   circle(ctx,0,0,52,glow);
   for(let i=0;i<6;i++){const a=i*TAU/6;ellipse(ctx,Math.sin(a)*23,Math.cos(a)*22,16,8,'#ffed82aa')}
   break;
  }
  case 'moon':
   for(let i=0;i<17;i++){const x=-37+seeded(i)*74,y=-37+seeded(i+21)*74;
    if(x*x+y*y<1580)circle(ctx,x,y,3+seeded(i+44)*11,'#9da4ac','#f2f4f0',1.2)}
   break;
  case 'earth':
   poly(ctx,[[-43,-28],[-21,-37],[-11,-21],[-19,-9],[-7,8],[-23,27],[-30,16],[-40,9]],'#65c889');
   poly(ctx,[[6,-44],[34,-30],[26,-10],[40,7],[21,10],[9,-1],[-3,-11]],'#82d79d');
   poly(ctx,[[17,17],[31,22],[22,45],[5,33]],'#79be76');
   ellipse(ctx,5,-24,29,5,'#ffffff77');break;
  case 'mars':
   for(let i=0;i<11;i++){const y=-40+i*9;line(ctx,[[-51,y+Math.sin(i)*7],[51,y-6+Math.cos(i)*5]],i%2?'#e2ac8b66':'#974c4166',3)}
   circle(ctx,20,14,15,'#a65448','#dca082',2);break;
  case 'saturn':for(let i=0;i<6;i++)line(ctx,[[-52,-35+i*14],[52,-29+i*12]],i%2?'#d5a875':'#f5d9a4',5);break;
  case 'billiard':
   circle(ctx,0,-8,24,'#fffdf7');ctx.fillStyle='#15171b';ctx.font='bold 33px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('8',0,-6);break;
  case 'tennis':
   ctx.beginPath();ctx.ellipse(-26,0,23,58,-.19,-1.2,1.2);ctx.strokeStyle='white';ctx.lineWidth=5;ctx.stroke();
   ctx.beginPath();ctx.ellipse(29,0,24,58,.18,1.9,4.4);ctx.stroke();break;
  case 'golf':
   for(let i=0;i<65;i++){const x=(seeded(i*2)-.5)*100,y=(seeded(i*2+1)-.5)*100;
    if(x*x+y*y<2100)circle(ctx,x,y,2.1+seeded(i+100)*2,'#9cabb855','#ffffffa8',.5)}
   break;
  case 'beach':
   for(let i=0;i<8;i++){const angle=i*TAU/8;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,53,angle,angle+TAU/8);ctx.closePath();ctx.fillStyle=['#f2dd72','#e15b5e','#5bb7cb','#f1f5e8'][i%4];ctx.fill()}
   circle(ctx,0,0,9,'#ffede1');break;
  case 'watermelon':
   for(let i=0;i<9;i++){const xx=-53+i*13;line(ctx,[[xx,-50],[xx+6,0],[xx,50]],i%2?'#378d55':'#9eda72',6)}
   break;
  case 'orange':
   for(let i=0;i<35;i++){const x=(seeded(i+2)-.5)*95,y=(seeded(i+72)-.5)*95;
    if(x*x+y*y<2000)circle(ctx,x,y,1.2,'#e17b35')}
   ellipse(ctx,-6,-43,12,4,'#4d9357');break;
  case 'eyeball':
   circle(ctx,0,0,28,accent,'#4f6f74',3);circle(ctx,0,0,14,'#1f2432');circle(ctx,-6,-8,7,'white');
   for(let i=0;i<6;i++){const a=i*TAU/6;line(ctx,[[Math.cos(a)*31,Math.sin(a)*31],[Math.cos(a)*45,Math.sin(a)*45]],'#d47b78',2)}
   break;
  case 'meteor':
   for(let i=0;i<19;i++){const x=(seeded(i)-.5)*85,y=(seeded(i+23)-.5)*85;
    if(x*x+y*y<2000)circle(ctx,x,y,3+seeded(i+43)*9,i%3?'#655d5a':'#f9a45b')}
   break;
  case 'disco':
   for(let y=-54;y<54;y+=15)for(let x=-54;x<54;x+=15){
    const xx=x+(y%2?6:0);if(xx*xx+y*y<2600)stripe(ctx,xx,y,11,10,['#8da9d9','#dde9f4','#b8e3e6','#bfb9da'][Math.floor(seeded(xx*y)*4)])}
   break;
  case 'bomb':circle(ctx,-14,-20,15,'#ffffff44');break;
  case 'pumpkin':
   for(let i=-3;i<=3;i++)ellipse(ctx,i*9,1,11,49,'#eda6483d','#a65f32aa',1.5);
   poly(ctx,[[-22,-2],[-5,1],[-23,12]],'#543c35');poly(ctx,[[12,-2],[31,1],[15,13]],'#543c35');
   break;
  case 'snow':
   for(let i=0;i<5;i++){const a=i*TAU/5;const x=Math.cos(a)*29,y=Math.sin(a)*29;
    polygonStarAt(ctx,x,y,7,6,'#93c8e0')}
   break;
  case 'bowling':
   for(const [x,y] of [[-11,-22],[10,-18],[-3,-3]])circle(ctx,x,y,7,'#292638','#cac5e2',1);
   break;
  case 'dice':
   ctx.fillStyle='#f6e9d4';ctx.fillRect(-44,-44,88,88);
   for(const [x,y] of [[-24,-24],[24,-24],[0,0],[-24,24],[24,24]])circle(ctx,x,y,7,accent);
   break;
  case 'donut':{
   circle(ctx,0,0,48,'#cb946b');ellipse(ctx,0,-8,43,34,accent);
   for(let i=0;i<21;i++){const x=(seeded(i)-.5)*75,y=(seeded(i+51)-.5)*55;
    line(ctx,[[x,y],[x+7,y+4]],['#f2e8b8','#b4eac8','#a8caef'][i%3],3)}
   circle(ctx,0,0,14,'#33212c');break;
  }
  case 'candy':
   for(let i=0;i<8;i++){const a=i*TAU/8;poly(ctx,[[0,0],[Math.cos(a)*52,Math.sin(a)*52],[Math.cos(a+.77)*52,Math.sin(a+.77)*52]],i%2?accent:c)}
   break;
  case 'crystal':
   poly(ctx,[[-38,-19],[-10,-43],[24,-39],[44,-6],[24,37],[-11,43],[-44,9]],'#bceeff');
   poly(ctx,[[-10,-43],[8,-6],[24,-39]],'#f3ffff');
   poly(ctx,[[8,-6],[44,-6],[24,37],[-11,43]],'#6aaec7');break;
  case 'soccer':
   polygonStar(ctx,21,5,'#202a33',.88);
   for(let i=0;i<5;i++){const a=i*TAU/5;const x=Math.cos(a)*39,y=Math.sin(a)*39;
    poly(ctx,[[x-10,y-6],[x+6,y-9],[x+11,y+7],[x-4,y+10]],'#253039');
    line(ctx,[[0,0],[x,y]],'#273742',2)}
   break;
 }
 ctx.restore();
 if(mode==='saturn'){ctx.save();ctx.rotate(-.3);ctx.beginPath();ctx.ellipse(0,0,64,25,0,0,Math.PI);ctx.strokeStyle='#f6dfb3';ctx.lineWidth=12;ctx.stroke();ctx.restore()}
 if(mode==='bomb'){polygonStarAt(ctx,29,-63,11,7,'#ffd968');}
 if(mode==='pumpkin'){stripe(ctx,-5,-53,10,14,'#44884d')}
 ctx.restore();
}
function polygonStarAt(ctx,x,y,r,points,fill){ctx.save();ctx.translate(x,y);polygonStar(ctx,r,points,fill);ctx.restore()}

// Todos los bates extravagantes tienen silueta propia y un punto de agarre fijo.
// Coordenadas de dibujo: mano en 0, extremo exterior en 210.
export function paintWeapon(ctx,item){
 const mode=item.design||'wood',c=item.color||'#a97f4c',accent=item.accent||'#e8bf73';
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 // Puño universal, coherente con las manos del bateador en las 5 poses.
 line(ctx,[[2,0],[47,0]],'#292d33',12);
 line(ctx,[[5,-4],[39,-4]],'#5c626b',3);
 const special=new Set(['broom','trout','wire','bread','banana','paddle','guitar','wrench','hammer','hockey','umbrella','cactus','wand','mic','pan','swordfish','lollipop','foam','tentacle','bone','mace','shovel','rake','carrot','torch']);
 if(!special.has(mode)){
  const g=gradient(ctx,32,-18,32,18,[[0,accent],[.48,c],[1,'#544538']]);
  poly(ctx,[[39,-6],[73,-9],[165,-16],[195,-14],[208,-6],[208,8],[188,13],[73,9],[39,6]],g,'#372e31',2.4);
  if(mode==='carbon'||mode==='metal')for(let i=0;i<10;i++)line(ctx,[[76+i*11,-9],[90+i*11,9]],mode==='metal'?'#ffffff77':'#adc2d455',2);
  if(mode==='neon'||mode==='ice'||mode==='flame'||mode==='nebula'){
   line(ctx,[[72,0],[192,0]],accent,mode==='flame'?8:4);
   if(mode==='flame')for(let i=0;i<5;i++)polygonStarAt(ctx,101+i*18,-15-i%2*4,8+i%2*6,5,accent);
   if(mode==='nebula')for(let i=0;i<7;i++)polygonStarAt(ctx,91+i*17,-10+i%3*9,3,4,'#e2d6ff');
  }
 }else if(mode==='broom'){
  line(ctx,[[33,0],[171,0]],c,9);poly(ctx,[[157,-14],[205,-24],[210,24],[157,14]],accent,'#9c6b39',2);
  for(let i=0;i<14;i++)line(ctx,[[174,-17+i*2.5],[207,-22+i*3.3]],'#ad824f',1.9);
 }else if(mode==='trout'||mode==='swordfish'){
  line(ctx,[[38,0],[84,0]],'#5e8c83',11);
  ellipse(ctx,141,0,57,22,c,'#355d65',3);
  poly(ctx,[[184,-3],[213,-23],[207,0],[213,23]],accent,'#456776',2);
  poly(ctx,[[111,-16],[145,-39],[162,-15]],accent);
  poly(ctx,[[137,15],[163,35],[163,12]],accent);
  circle(ctx,95,-7,4,'white');circle(ctx,94,-7,2,'#1a3549');
  for(let i=0;i<6;i++)line(ctx,[[126+i*8,-10],[126+i*8,10]],'#d8f4e988',1.5);
  if(mode==='swordfish')poly(ctx,[[91,-3],[75,-2],[38,-5],[78,4]],'#a4d8dc');
 }else if(mode==='wire'){
  line(ctx,[[38,0],[190,0]],c,20);
  for(let i=0;i<7;i++){const x=91+i*14;line(ctx,[[x,-12],[x+16,12]],accent,3);line(ctx,[[x-5,13],[x+8,-13]],'#5c656e',2)}
  for(let i=0;i<5;i++){const x=96+i*22;poly(ctx,[[x,-12],[x+4,-21],[x+7,-12]],'#d5d2ce');poly(ctx,[[x,12],[x+4,21],[x+7,12]],'#d5d2ce')}
 }else if(mode==='bread'||mode==='banana'||mode==='carrot'){
  poly(ctx,[[37,-5],[70,-10],[140,-20],[198,-14],[209,-4],[205,13],[149,20],[67,8]],c,accent,3);
  if(mode==='bread'){for(let i=0;i<4;i++)line(ctx,[[95+i*23,-14],[105+i*23,-1]],'#ad6f3d',4)}
  if(mode==='banana'){line(ctx,[[77,5],[148,14],[196,-1]],'#ffffb7',6)}
  if(mode==='carrot')for(let i=0;i<5;i++)line(ctx,[[106+i*15,-17],[121+i*15,13]],'#c75f28',2);
 }else if(['paddle','shovel','rake','hockey','foam','umbrella'].includes(mode)){
  line(ctx,[[42,0],[183,0]],mode==='foam'?c:'#b98b61',11);
  if(mode==='paddle')ellipse(ctx,178,0,31,16,c,accent,3);
  if(mode==='shovel')poly(ctx,[[171,-15],[205,-25],[216,0],[205,25],[171,15]],c,'#445968',3);
  if(mode==='rake'){line(ctx,[[179,-23],[179,23]],c,8);for(let i=-3;i<=3;i++)line(ctx,[[182,i*8],[207,i*8]],accent,3)}
  if(mode==='hockey')line(ctx,[[170,0],[170,20],[211,20]],accent,14);
  if(mode==='foam')poly(ctx,[[70,-13],[204,-16],[213,0],[204,16],[70,13]],c,accent,3);
  if(mode==='umbrella')poly(ctx,[[179,-24],[216,0],[179,24]],c,accent,3);
 }else if(mode==='guitar'){
  line(ctx,[[34,0],[168,0]],'#986b4a',12);
  ellipse(ctx,160,0,31,31,c,accent,3);ellipse(ctx,177,0,27,23,c,accent,3);circle(ctx,171,0,9,'#26303c');
  for(let i=-2;i<=2;i++)line(ctx,[[44,i*2],[209,i*2]],'#f9dfb8',.7);
 }else if(['wrench','hammer','pan','mace','mic'].includes(mode)){
  line(ctx,[[39,0],[159,0]],c,13);
  if(mode==='wrench')poly(ctx,[[170,-14],[188,-26],[208,-16],[190,-6],[190,6],[208,16],[188,26],[170,14]],c,accent,3);
  if(mode==='hammer')poly(ctx,[[156,-28],[211,-25],[217,20],[163,24]],c,'#444d5c',4);
  if(mode==='pan')ellipse(ctx,177,0,33,31,c,'#2d3946',5);
  if(mode==='mace'){circle(ctx,177,0,29,c,accent,4);for(let i=0;i<8;i++){const a=i*TAU/8;polygonStarAt(ctx,177+Math.cos(a)*27,Math.sin(a)*27,8,4,accent)}}
  if(mode==='mic'){ellipse(ctx,186,0,25,28,c,accent,4);for(let i=-3;i<=3;i++)line(ctx,[[172,i*7],[206,i*7]],'#627787',2)}
 }else if(mode==='cactus'||mode==='tentacle'){
  line(ctx,[[39,0],[198,0]],c,mode==='cactus'?25:22);
  for(let i=0;i<5;i++){const x=90+i*24;circle(ctx,x,i%2?9:-9,3,accent);
   if(mode==='cactus')line(ctx,[[x,0],[x+4,i%2?23:-23]],'#34845b',7);
   else circle(ctx,x+5,i%2?9:-9,6,accent)}
 }else if(mode==='wand'||mode==='lollipop'||mode==='torch'){
  line(ctx,[[35,0],[181,0]],mode==='torch'?'#956d44':mode==='wand'?c:'#faf0e9',9);
  if(mode==='wand')polygonStarAt(ctx,192,0,25,5,accent);
  if(mode==='lollipop'){circle(ctx,182,0,32,c,accent,3);for(let i=0;i<6;i++){const a=i*TAU/6;line(ctx,[[182,0],[182+Math.cos(a)*27,Math.sin(a)*27]],accent,5)}}
  if(mode==='torch'){polygonStarAt(ctx,182,0,30,8,'#ffb846');polygonStarAt(ctx,188,-8,16,6,'#fff19a')}
 }else if(mode==='bone'){
  line(ctx,[[55,0],[184,0]],c,17);for(const x of [57,182]){circle(ctx,x,-12,12,c);circle(ctx,x,12,12,c)}
 }
 ctx.restore();
}
function torsoForPose(pose){
 if(pose==='loaded')return {p:[[.34,.48],[.77,.48],[.81,.69],[.37,.69]],neck:[.56,.45],belt:.68};
 if(pose==='contact')return {p:[[.18,.39],[.44,.39],[.47,.70],[.21,.71]],neck:[.36,.37],belt:.65};
 if(pose==='follow')return {p:[[.37,.38],[.69,.38],[.71,.69],[.38,.69]],neck:[.53,.36],belt:.67};
 return {p:[[.31,.44],[.74,.44],[.78,.68],[.30,.68]],neck:[.53,.42],belt:.67};
}
// Accesorios de cabeza realmente distintos para disfraces; el uniforme no
// se limita a colorear ribetes de la camiseta.
export function overlayHeadAccessory(ctx,width,height,item,pose='ready'){
 const mode=item.design;
 if(!['chef','fisher','pirate','cowboy','astronaut','ninja','fireman','robot','boxing'].includes(mode))return;
 const head=pose==='contact'?[.32,.16]:pose==='follow'?[.48,.16]:pose==='loaded'?[.65,.27]:[.54,.28];
 const [cx,cy]=head,c=item.color,accent=item.accent;
 ctx.save();ctx.scale(width,height);
 if(mode==='chef'){
  // Gorro alto de cocina con pliegues y banda.
  poly(ctx,[[cx-.11,cy-.13],[cx-.13,cy-.27],[cx-.07,cy-.32],[cx+.02,cy-.30],[cx+.12,cy-.28],[cx+.12,cy-.12]],'#f5f3e5','#bfcbd3',.012);
  for(const d of [-.06,0,.06])line(ctx,[[cx+d,cy-.27],[cx+d,cy-.15]],'#c1c8cc',.008);
  stripe(ctx,cx-.13,cy-.17,.26,.045,'#e45750');
 }else if(mode==='pirate'){
  poly(ctx,[[cx-.22,cy-.08],[cx-.15,cy-.22],[cx,cy-.18],[cx+.13,cy-.23],[cx+.25,cy-.08],[cx,cy-.12]],'#202c36','#d2a365',.013);
  polygonStarAt(ctx,cx,cy-.16,.026,5,'#f2e0bd');
 }else if(mode==='cowboy'){
  ellipse(ctx,cx,cy-.10,.25,.035,'#926840','#4b3a29',.013);
  poly(ctx,[[cx-.14,cy-.12],[cx-.10,cy-.24],[cx+.10,cy-.24],[cx+.16,cy-.12]],'#b98960','#6b4c32',.012);
  stripe(ctx,cx-.13,cy-.14,.26,.028,'#dfba81');
 }else if(mode==='fisher'){
  poly(ctx,[[cx-.15,cy-.08],[cx-.12,cy-.22],[cx+.12,cy-.22],[cx+.18,cy-.08]],c,accent,.012);
  ellipse(ctx,cx+.01,cy-.08,.22,.028,accent);
 }else if(mode==='astronaut'){
  ellipse(ctx,cx,cy,.23,.23,'#b3d9ed66','#e7fbff',.014);
  ellipse(ctx,cx+.045,cy+.015,.14,.105,'#56a6c65c','#b8edff',.009);
  line(ctx,[[cx-.16,cy-.11],[cx-.08,cy-.16]],'#ffffff9c',.014);
 }else if(mode==='ninja'){
  poly(ctx,[[cx-.11,cy-.02],[cx+.18,cy-.04],[cx+.16,cy+.065],[cx-.12,cy+.075]],'#202934','#8d4551',.01);
  stripe(ctx,cx+.02,cy-.015,.09,.022,'#f4ece2');
 }else if(mode==='fireman'){
  poly(ctx,[[cx-.18,cy-.07],[cx-.15,cy-.18],[cx+.14,cy-.18],[cx+.19,cy-.07]],'#e0ac4b','#ffe8a4',.014);
  stripe(ctx,cx-.07,cy-.17,.14,.075,'#e8f5e6');
 }else if(mode==='robot'){
  poly(ctx,[[cx-.14,cy-.03],[cx+.17,cy-.04],[cx+.14,cy+.08],[cx-.14,cy+.09]],'#253b4c','#8bdce4',.012);
  stripe(ctx,cx-.08,cy,.15,.026,'#66e7ed');
  line(ctx,[[cx,cy-.20],[cx,cy-.26]],'#779ba9',.015);
  circle(ctx,cx,cy-.26,.025,'#60e1dd');
 }else if(mode==='boxing'){
  const hand=pose==='contact'?[.57,.49]:pose==='follow'?[.68,.50]:pose==='loaded'?[.18,.43]:[.26,.49];
  circle(ctx,hand[0],hand[1],.075,'#d84f56','#fff0ce',.011);
 }
 ctx.restore();
}
export function overlayOutfit(ctx,width,height,item,pose='ready'){
 if(!ctx||!item||item.design==='classic')return;
 const area=torsoForPose(pose);
 ctx.save();ctx.scale(width,height);
 ctx.beginPath();ctx.moveTo(...area.p[0]);for(const point of area.p.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.clip();
 ctx.globalAlpha=.85;stripe(ctx,0,.30,1,.5,item.color);
 ctx.globalAlpha=1;
 const accent=item.accent||'#fafafa';
 const mode=item.design;
 const stripeW=.04;
 if(['stripes','pinstripes','jersey'].includes(mode)){for(let x=.2;x<.9;x+=mode==='pinstripes'?.055:.10)stripe(ctx,x,.33,mode==='pinstripes'?.009:stripeW,.40,accent)}
 else if(mode==='hoops'||mode==='hockey')for(let y=.45;y<.68;y+=.08)stripe(ctx,.08,y,.8,.027,accent);
 else if(mode==='chevron'){
  line(ctx,[[.22,.48],[.52,.62],[.8,.48]],accent,.05);
 }else if(mode==='cycling'||mode==='running'||mode==='astronaut'||mode==='robot'){
  poly(ctx,[[.22,.45],[.53,.45],[.35,.69],[.11,.69]],accent);
  poly(ctx,[[.7,.44],[.77,.44],[.57,.67]],accent);
 }else if(mode==='basket'){stripe(ctx,.47,.4,.11,.31,accent);stripe(ctx,.28,.48,.51,.018,accent)}
 else if(['polo','shoulders','golf'].includes(mode)){poly(ctx,[[.28,.43],[.53,.53],[.72,.44],[.60,.41]],accent)}
 else if(mode==='boxing'){poly(ctx,[[.29,.43],[.70,.43],[.60,.61],[.37,.61]],accent)}
 else if(mode==='kimono'){line(ctx,[[.31,.48],[.59,.65]],'#7b8290',.025);line(ctx,[[.75,.48],[.49,.65]],'#7b8290',.025);stripe(ctx,.27,.64,.55,.022,accent)}
 else if(mode==='wrestling'){stripe(ctx,.41,.42,.20,.28,accent);stripe(ctx,.28,.57,.49,.025,accent)}
 else if(mode==='chef'){stripe(ctx,.51,.48,.02,.20,accent);for(let i=0;i<3;i++)circle(ctx,.47,.53+i*.05,.012,'#273343')}
 else if(mode==='fisher'){stripe(ctx,.31,.48,.09,.18,accent);stripe(ctx,.67,.48,.08,.18,accent)}
 else if(mode==='pirate'||mode==='cowboy'){line(ctx,[[.30,.46],[.73,.66]],accent,.045)}
 else if(mode==='ninja'){stripe(ctx,.29,.58,.52,.05,accent);stripe(ctx,.36,.46,.32,.018,accent)}
 else if(mode==='fireman'){stripe(ctx,.28,.49,.50,.045,accent);stripe(ctx,.28,.61,.50,.045,accent)}
 else if(mode==='retro')for(let x=.28;x<.74;x+=.06)stripe(ctx,x,.42,.012,.3,accent);
 if(!['chef','ninja','robot','astronaut','fisher','pirate','cowboy'].includes(mode)){
  ctx.font='bold .07px sans-serif';ctx.fillStyle=accent;ctx.textAlign='center';ctx.fillText('7',.53,.61);
 }
 ctx.restore();
 overlayHeadAccessory(ctx,width,height,item,pose);
}
export function composeSpecialPose(image,outfit,bat,pose='ready'){
 if(typeof document==='undefined'||!image)return image;
 const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
 if(!(w>0&&h>0))return image;
 try{
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return image;
  let original=image;
  if(outfit?.id&&outfit.id!=='red')original=makeCosmeticCanvas(original,{kind:'outfit',color:outfit.color,pose});
  ctx.drawImage(original,0,0,w,h);
  if(outfit&&outfit.design!=='classic')overlayOutfit(ctx,w,h,outfit,pose);
  if(bat&&bat.design!=='classic'){
   const placement=WEAPON_POSES[pose]||WEAPON_POSES.ready;
   const [gx,gy]=placement.grip,[tx,ty]=placement.tip;
   const x0=gx*w,y0=gy*h,x1=tx*w,y1=ty*h;
   const dx=x1-x0,dy=y1-y0,dist=Math.hypot(dx,dy);
   // Erase the original wooden prop, never alter physical game state.
   ctx.save();ctx.globalCompositeOperation='destination-out';
   line(ctx,[[x0,y0],[x1,y1]],'#000',pose==='contact'?27:pose==='follow'?29:39);
   ctx.restore();
   ctx.save();ctx.translate(x0,y0);ctx.rotate(Math.atan2(dy,dx));
   ctx.scale(dist/205,dist/205);
   paintWeapon(ctx,bat);ctx.restore();
  }
  return canvas;
 }catch(e){console.warn('Ilustración del equipamiento no disponible',e);return image}
}
export function makeIllustratedBall(item,size=128){
 if(typeof document==='undefined')return null;
 try{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  paintThemedBall(ctx,item,size);
  return canvas;
 }catch(error){console.warn('Pelota ilustrada no disponible',error);return null}
}
export function makeCosmeticPreview(category,item,source=null){
 if(typeof document==='undefined')return null;
 try{
  const canvas=document.createElement('canvas');canvas.width=176;canvas.height=112;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  if(category==='ball'){
   if(ILLUSTRATED_BALLS.has(item.design)){
    const ball=makeIllustratedBall(item,96);
    if(ball)ctx.drawImage(ball,40,8,96,96);
   }else{
    const img=source&&makeCosmeticCanvas(source,{kind:'ball',color:item.color});
    if(img)ctx.drawImage(img,40,8,96,96);
    else paintThemedBall(ctx,{...item,design:'baseball'},96);
   }
  }else if(category==='bat'){
   ctx.save();ctx.translate(11,57);ctx.rotate(-.11);ctx.scale(.71,.71);paintWeapon(ctx,item);ctx.restore();
  }else if(source){
   const original=composeSpecialPose(source,item,{design:'classic'},'ready');
   const w=original.naturalWidth||original.width,h=original.naturalHeight||original.height;
   const dh=110,dw=dh*w/h;
   ctx.drawImage(original,(176-dw)/2,1,dw,dh);
  }else{
   ctx.fillStyle=item.color;ctx.fillRect(47,18,83,77);
   ctx.fillStyle=item.accent;ctx.fillRect(58,45,59,15);
  }
  return canvas;
 }catch(error){console.warn('Vista previa no disponible',error);return null}
}
