// Catálogo único: cambiar rangos o decorado no requiere tocar el motor físico.
// Todas las distancias son metros medidos longitudinalmente desde home.
export const WORLD_CENTER_X=-2.3;
export const WORLD_HALF_WIDTH=300;
export const WORLD_WIDTH=2*WORLD_HALF_WIDTH;
export const BIOMES=Object.freeze([
 {id:'stadium',name:'ESTADIO',start:0,end:150,color:'#538f59',ground:'grass',props:'stadium',left:'grandstand',right:'stadiumWall',transition:35},
 {id:'residential',name:'BARRIOS',start:150,end:500,color:'#659c63',ground:'grass',props:'neighborhood',left:'houses',right:'urbanWall',transition:80},
 {id:'city',name:'CIUDAD',start:500,end:1500,color:'#659c63',ground:'grass',props:'city',left:'towers',right:'towers',transition:120},
 {id:'port',name:'RÍO Y PUERTO',start:1500,end:2000,color:'#83a66a',ground:'grass',props:'port',left:'portwall',right:'containers',transition:90},
 {id:'hills',name:'COLINAS VERDES',start:2000,end:3600,color:'#739d6b',ground:'grass',props:'hills',left:'cliff',right:'cliff',transition:110},
 {id:'valley',name:'GRAN VALLE',start:3600,end:6000,color:'#759a68',ground:'grass',props:'forest',left:'forestCliff',right:'forestCliff',transition:140},
 {id:'pines',name:'PINAR',start:6000,end:8500,color:'#5f8e66',ground:'grass',props:'pines',left:'pineCliff',right:'pineCliff',transition:130},
 {id:'mountain',name:'ALTA MONTAÑA',start:8500,end:12000,color:'#89918a',ground:'rock',props:'mountain',left:'granite',right:'granite',transition:140},
 {id:'volcano',name:'REGIÓN VOLCÁNICA',start:12000,end:16000,color:'#544d4c',ground:'rock',props:'volcano',left:'basalt',right:'basalt',transition:130},
 {id:'desert',name:'DESIERTO',start:16000,end:22000,color:'#c9a36f',ground:'sand',props:'desert',left:'sandstone',right:'sandstone',transition:140},
 {id:'canyon',name:'GRAN CAÑÓN',start:22000,end:30000,color:'#a85e4f',ground:'rock',props:'canyon',left:'redCliff',right:'redCliff',transition:140},
 {id:'tundra',name:'TUNDRA',start:30000,end:40000,color:'#aebbbb',ground:'snow',props:'tundra',left:'iceRock',right:'iceRock',transition:140},
 {id:'glacier',name:'GLACIAR',start:40000,end:Infinity,color:'#bedce5',ground:'snow',props:'glacier',left:'glacier',right:'glacier',transition:150}
]);
export const BOUNDARY_STYLES=Object.freeze({
 grandstand:{height:37,thickness:18,color:'#315b71',trim:'#e6a95c',material:'concrete',decor:'stands'},
 stadiumWall:{height:30,thickness:15,color:'#315b71',trim:'#f1b66b',material:'concrete',decor:'stands'},
 houses:{height:48,thickness:22,color:'#cbb9a1',trim:'#b66e5f',material:'concrete',decor:'urban'},
 urbanWall:{height:43,thickness:15,color:'#a0a9ae',trim:'#e7ca9d',material:'concrete',decor:'urban'},
 towers:{height:105,thickness:29,color:'#9eb4bd',trim:'#4d7182',material:'concrete',decor:'city'},
 portwall:{height:60,thickness:25,color:'#77878f',trim:'#d4a14f',material:'concrete',decor:'port'},
 containers:{height:58,thickness:23,color:'#597987',trim:'#e6a15f',material:'metal',decor:'port'},
 cliff:{height:130,thickness:40,color:'#8c8773',trim:'#679b6c',material:'concrete',decor:'cliff'},
 forestCliff:{height:155,thickness:44,color:'#6b8271',trim:'#4e8769',material:'concrete',decor:'forest'},
 pineCliff:{height:170,thickness:44,color:'#717a68',trim:'#405c4e',material:'concrete',decor:'forest'},
 granite:{height:195,thickness:55,color:'#899095',trim:'#c5c7c3',material:'concrete',decor:'cliff'},
 basalt:{height:190,thickness:55,color:'#393e40',trim:'#dd754c',material:'concrete',decor:'cliff'},
 sandstone:{height:155,thickness:50,color:'#cb9d68',trim:'#eac38f',material:'concrete',decor:'cliff'},
 redCliff:{height:230,thickness:60,color:'#a65d4c',trim:'#d28463',material:'concrete',decor:'cliff'},
 iceRock:{height:170,thickness:52,color:'#a8b8bd',trim:'#e4edf0',material:'concrete',decor:'cliff'},
 glacier:{height:225,thickness:55,color:'#9fc9d9',trim:'#e3faff',material:'concrete',decor:'cliff'}
});
export function biomeAt(z){
 if(!Number.isFinite(z)||z<0)return BIOMES[0];
 for(let i=BIOMES.length-1;i>=0;i--)if(z>=BIOMES[i].start)return BIOMES[i];
 return BIOMES[0];
}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function toHex(values){return '#'+values.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')}
export function mixColors(a,b,t){
 const aa=rgb(a),bb=rgb(b);
 return toHex(aa.map((v,i)=>v+(bb[i]-v)*Math.max(0,Math.min(1,t))));
}
// En cada transición el peso sigue una S (smoothstep), sin cortes de color
// ni de pendiente en la entrada/salida. Cada límite usa su franja de metros.
export function biomeTransitionAt(z){
 const zz=Number.isFinite(z)?z:0;
 for(let i=1;i<BIOMES.length;i++){
  const to=BIOMES[i],from=BIOMES[i-1],width=to.transition;
  if(zz>=to.start-width/2&&zz<=to.start+width/2){
   const t=Math.max(0,Math.min(1,(zz-(to.start-width/2))/width));
   return {from,to,t:t*t*(3-2*t),active:true};
  }
 }
 const selected=biomeAt(zz);
 return {from:selected,to:selected,t:0,active:false};
}
export function biomeColorAt(z){
 const {from,to,t}=biomeTransitionAt(z);
 return mixColors(from.color,to.color,t);
}
export function boundaryProfileAt(z,side){
 const blend=biomeTransitionAt(z);
 const a=BOUNDARY_STYLES[side<0?blend.from.left:blend.from.right];
 const b=BOUNDARY_STYLES[side<0?blend.to.left:blend.to.right];
 const t=blend.t;
 // La altura y el color se interpolan. No hay escalones entre dos biomas.
 return {
  biome:biomeAt(z).id,biomeName:biomeAt(z).name,
  kind:t<.5?(side<0?blend.from.left:blend.from.right):(side<0?blend.to.left:blend.to.right),
  decorFrom:a.decor,decorTo:b.decor,blend:t,
  height:a.height+(b.height-a.height)*t,
  thickness:a.thickness+(b.thickness-a.thickness)*t,
  color:mixColors(a.color,b.color,t),
  trim:mixColors(a.trim,b.trim,t),
  material:t<.5?a.material:b.material
 };
}
// Intersección continua esfera-plano: nunca atraviesa el lado ni a velocidades altas.
export function traceSideBoundary(from,to,radius=1.45){
 if(!from||!to)return null;
 const dx=to.x-from.x;
 const radiusSafe=Math.max(0,Number.isFinite(radius)?radius:1.45);
 const left=WORLD_CENTER_X-WORLD_HALF_WIDTH+radiusSafe;
 const right=WORLD_CENTER_X+WORLD_HALF_WIDTH-radiusSafe;
 let side=0,t=0,pointX=0;
 if(from.x<left||from.x<=left&&dx<0){side=-1;pointX=left;t=dx<0?(left-from.x)/dx:0}
 else if(from.x>right||from.x>=right&&dx>0){side=1;pointX=right;t=dx>0?(right-from.x)/dx:0}
 else if(to.x<left&&dx<0){side=-1;pointX=left;t=(left-from.x)/dx}
 else if(to.x>right&&dx>0){side=1;pointX=right;t=(right-from.x)/dx}
 else return null;
 t=Math.max(0,Math.min(1,t));
 const z=from.z+(to.z-from.z)*t;
 const style=boundaryProfileAt(z,side);
 return {t,point:{x:pointX,y:from.y+(to.y-from.y)*t,z},
  normal:{x:-side,y:0,z:0},kind:'side-boundary',material:style.material,
  side,biome:style.biome,obstacle:style.kind};
}
