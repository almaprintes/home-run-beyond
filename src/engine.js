import {pitcherPose} from './pitcher.js?v=0.75.0';
// Motor 3D propio WebGL2: sin modelos, texturas, fuentes externas ni dependencias.
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 m0;
layout(location=3) in vec4 m1;
layout(location=4) in vec4 m2;
layout(location=5) in vec4 m3;
layout(location=6) in vec3 aColor;
layout(location=7) in float aMaterial;
uniform mat4 uViewProj;
uniform vec3 uCamPos;
out vec3 vCol;out float vFog;out float vShade;out float vHeight;
out vec3 vWorld;out vec3 vNormal;flat out int vMaterial;
void main(){mat4 model=mat4(m0,m1,m2,m3);vec4 world=model*vec4(aPos,1.);vec3 n=normalize(mat3(model)*aNormal);
float sun=max(0.,dot(n,normalize(vec3(-0.6,1.8,0.7))));
float fill=max(0.,dot(n,normalize(vec3(0.8,0.65,-0.3))));
vShade=0.64+sun*.31+fill*.08+clamp(world.y/900.,0.,.14);
vCol=aColor;vHeight=world.y;vFog=length(world.xyz-uCamPos);vWorld=world.xyz;vNormal=n;vMaterial=int(aMaterial+.5);gl_Position=uViewProj*world;}
`;
const FRAG=`#version 300 es
precision highp float;
in vec3 vCol;in float vFog;in float vShade;in float vHeight;
in vec3 vWorld;in vec3 vNormal;flat in int vMaterial;
uniform float uFogDistance;
uniform vec3 uFogColor;
uniform float uOpacity;
uniform float uTextureReady;
uniform highp sampler2DArray uMaterialArray;
out vec4 fragColor;
void main(){
 vec3 base=vCol;
 if(uTextureReady>.5 && vMaterial>0){
  vec3 n=abs(normalize(vNormal));
  vec2 coord=n.y>max(n.x,n.z)?vWorld.xz:(n.x>n.z?vWorld.zy:vWorld.xy);
  float density=vMaterial==1?22.:vMaterial==2?16.:vMaterial==3?17.:vMaterial==4?18.:
                vMaterial==5?18.:vMaterial==6?24.:vMaterial==7?40.:vMaterial==8?24.:
                vMaterial==9?26.:vMaterial==10?24.:vMaterial==11?20.:25.;
  vec2 uv=coord/density;
  // Each material has its own GPU array layer and mip chain: no atlas tile bleeding.
  vec3 pigment=textureGrad(uMaterialArray,vec3(uv,float(vMaterial-1)),dFdx(uv),dFdy(uv)).rgb;
  float strength=vMaterial==1?.73:vMaterial==2?.76:vMaterial==3?.81:.70;
  float distantFade=1.-.68*smoothstep(185.,650.,vFog);
  base=mix(vCol,pigment*(.88+.12*vCol),strength*distantFade);
 }
 vec3 col=pow(base*vShade,vec3(.96));
 float f=smoothstep(uFogDistance*.43,uFogDistance,vFog);
 // La niebla atmosférica no debe convertir el terreno próximo en cielo.
 // La hierba y la tierra permanecen legibles hasta el horizonte lejano.
 if(vMaterial==1 || vMaterial==8){
  // El césped lejano debe seguir pareciendo tierra, no convertirse en cielo.
  // La niebla se mezcla solo parcialmente sobre materiales terrestres.
  f=.34*smoothstep(uFogDistance*.95,uFogDistance*6.,vFog);
 }
 fragColor=vec4(mix(col,uFogColor,f),uOpacity);
}
`;
export function lerp(a,b,t){return a+(b-a)*t}
export function perspective(fov,aspect,near,far){const out=new Float32Array(16),f=1/Math.tan(fov/2);out[0]=f/aspect;out[5]=f;out[10]=(far+near)/(near-far);out[11]=-1;out[14]=(2*far*near)/(near-far);return out}
function norm(v){let d=Math.hypot(...v)||1;return v.map(a=>a/d)}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
export function lookAt(eye,target,up=[0,1,0]){const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((a,v,i)=>a+v*eye[i],0),-y.reduce((a,v,i)=>a+v*eye[i],0),-z.reduce((a,v,i)=>a+v*eye[i],0),1])}
export function mul4(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function meshFromTriangles(tris){let arr=[];for(const [a,b,c] of tris){const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);let n=norm(cross(ab,ac));for(const p of [a,b,c])arr.push(...p,...n)}return new Float32Array(arr)}
function cube(){let T=[],v=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];for(const [a,b,c,d] of [[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[3,7,6,2],[0,1,5,4]]){T.push([v[a],v[b],v[c]],[v[a],v[c],v[d]])}return meshFromTriangles(T)}
function prism(sides=10,topRadius=0.5,bottomRadius=0.5){const T=[];for(let i=0;i<sides;i++){let a=i*2*Math.PI/sides,b=(i+1)*2*Math.PI/sides,ca=Math.cos(a),cb=Math.cos(b),sa=Math.sin(a),sb=Math.sin(b);let p0=[ca*bottomRadius,-.5,sa*bottomRadius],p1=[cb*bottomRadius,-.5,sb*bottomRadius],p2=[cb*topRadius,.5,sb*topRadius],p3=[ca*topRadius,.5,sa*topRadius];if(topRadius>0)T.push([p0,p2,p1],[p0,p3,p2]);else T.push([p0,p3,p1]);T.push([[0,-.5,0],p1,p0]);if(topRadius>0)T.push([[0,.5,0],p3,p2]);}return meshFromTriangles(T)}
function sphere(lat=6,lng=10){const T=[];for(let j=0;j<lat;j++){const t0=-Math.PI/2+j*Math.PI/lat,t1=-Math.PI/2+(j+1)*Math.PI/lat;for(let i=0;i<lng;i++){const p0=i*Math.PI*2/lng,p1=(i+1)*Math.PI*2/lng;const point=(t,p)=>[.5*Math.cos(t)*Math.cos(p),.5*Math.sin(t),.5*Math.cos(t)*Math.sin(p)];const a=point(t0,p0),b=point(t0,p1),c=point(t1,p1),d=point(t1,p0);if(j>0)T.push([a,b,c]);if(j<lat-1)T.push([a,c,d]);}}return meshFromTriangles(T)}
function plane(){return meshFromTriangles([[[-.5,0,-.5],[.5,0,.5],[.5,0,-.5]],[[-.5,0,-.5],[-.5,0,.5],[.5,0,.5]]])}

/* Coches de carretera procedimentales: geometría real, sin sprites ni cajas de juguete.
   Los ejes delanteros apuntan a +X; cabina, capó, lunas y techo son mallas separadas. */
const CAR_CABINS={
 hatch:{rearBase:-.36,rearRoof:-.26,frontRoof:.14,frontBase:.30},
 sedan:{rearBase:-.31,rearRoof:-.17,frontRoof:.13,frontBase:.29},
 suv:{rearBase:-.38,rearRoof:-.31,frontRoof:.21,frontBase:.30},
 pickup:{rearBase:-.15,rearRoof:-.10,frontRoof:.20,frontBase:.30}
};
function carShell(kind){
 const T=[],rings=[],stations=[-.50,-.47,-.36,-.20,.05,.27,.39,.48,.50];
 for(const x of stations){
  const edge=1-.16*Math.pow(Math.abs(x)/.5,4);
  const cap=kind==='pickup'&&x<-.18 ? -.02 : .01;
  const height=.24-.12*Math.pow(Math.abs(x)/.5,2)+cap;
  const side=.47*edge;
  const profile=[
   [-side*.91,-.34],[-side,-.25],[-side,.10],
   [-side*.83,height],[side*.83,height],[side,.10],
   [side,-.25],[side*.91,-.34]
  ];
  rings.push(profile.map(([z,y])=>[x,y,z]));
 }
 for(let i=0;i<rings.length-1;i++){
  for(let j=0;j<8;j++){
   const k=(j+1)%8,a=rings[i][j],b=rings[i+1][j],c=rings[i+1][k],d=rings[i][k];
   T.push([a,c,b],[a,d,c]);
  }
 }
 for(let j=0;j<8;j++){
  const k=(j+1)%8;
  T.push([[stations[0],0,0],rings[0][j],rings[0][k]]);
  T.push([[stations[stations.length-1],0,0],rings[rings.length-1][k],rings[rings.length-1][j]]);
 }
 return meshFromTriangles(T);
}
function carCabin(kind,part){
 const T=[],p=CAR_CABINS[kind],w0=.438,w1=.365;
 const bl=[p.rearBase,0,-w0],br=[p.rearBase,0,w0],
  fl=[p.frontBase,0,-w0],fr=[p.frontBase,0,w0],
  tl=[p.rearRoof,1,-w1],tr=[p.rearRoof,1,w1],
  ul=[p.frontRoof,1,-w1],ur=[p.frontRoof,1,w1];
 const quad=(a,b,c,d)=>T.push([a,b,c],[a,c,d]);
 if(part==='glass'){
  quad(bl,fl,ul,tl);quad(fr,br,tr,ur);
  quad(fl,fr,ur,ul);quad(br,bl,tl,tr);
 }else{
  const t=([x,y,z])=>[x,y+.045,z];
  quad(t(tl),t(ul),t(ur),t(tr));
  const f=.032;
  quad([p.frontRoof,1,-w1-f],[p.frontRoof,1,w1+f],t(ur),t(ul));
  quad([p.rearRoof,1,w1+f],[p.rearRoof,1,-w1-f],t(tl),t(tr));
 }
 return meshFromTriangles(T);
}
function wheelTire(){
 const T=[],n=16,profile=[[-.5,.36],[-.42,.47],[-.27,.50],[.27,.50],[.42,.47],[.5,.36]];
 for(let j=0;j<profile.length-1;j++){
  const [z0,r0]=profile[j],[z1,r1]=profile[j+1];
  for(let i=0;i<n;i++){
   const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;
   const p=(ang,r,z)=>[Math.cos(ang)*r,Math.sin(ang)*r,z];
   const A=p(a,r0,z0),B=p(b,r0,z0),C=p(b,r1,z1),D=p(a,r1,z1);
   T.push([A,B,C],[A,C,D]);
  }
 }
 for(const s of [-1,1]){
  const z=s*.5;
  for(let i=0;i<n;i++){
   const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;
   const A=[Math.cos(a)*.36,Math.sin(a)*.36,z],
    B=[Math.cos(b)*.36,Math.sin(b)*.36,z];
   T.push(s>0?[[0,0,z],A,B]:[[0,0,z],B,A]);
  }
 }
 return meshFromTriangles(T);
}
function wheelAlloy(){
 const T=[],n=20,quad=(a,b,c,d)=>T.push([a,b,c],[a,c,d]);
 for(const side of [-1,1]){
  const z=side*.514;
  for(let i=0;i<n;i++){
   const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;
   const point=(ang,r)=>[Math.cos(ang)*r,Math.sin(ang)*r,z];
   quad(point(a,.245),point(b,.245),point(b,.32),point(a,.32));
  }
  for(let j=0;j<5;j++){
   const a=j*2*Math.PI/5,da=.11;
   const p=(ang,r)=>[Math.cos(ang)*r,Math.sin(ang)*r,z+side*.002];
   quad(p(a-da,.065),p(a+da,.065),p(a+.060,.28),p(a-.060,.28));
  }
  for(let i=0;i<n;i++){
   const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;
   T.push([[0,0,z+side*.012],[Math.cos(a)*.075,Math.sin(a)*.075,z],
    [Math.cos(b)*.075,Math.sin(b)*.075,z]]);
  }
 }
 return meshFromTriangles(T);
}
function wheelArch(){
 const T=[],n=12;
 for(const side of [-1,1]){
  const z=side*.505;
  for(let i=0;i<n;i++){
   const a=i*Math.PI/n,b=(i+1)*Math.PI/n;
   const pt=(ang,r)=>[Math.cos(ang)*r,Math.sin(ang)*r,z];
   T.push([pt(a,.51),pt(b,.51),pt(b,.59)],
          [pt(a,.51),pt(b,.59),pt(a,.59)]);
  }
 }
 return meshFromTriangles(T);
}

function createShader(gl,kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader: '+gl.getShaderInfoLog(s));return s}
function makeProgram(gl){const p=gl.createProgram();gl.attachShader(p,createShader(gl,gl.VERTEX_SHADER,VERT));gl.attachShader(p,createShader(gl,gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Program: '+gl.getProgramInfoLog(p));return p}
function parseColor(hex){if(Array.isArray(hex))return hex;let h=hex.replace('#','');if(h.length===3)h=[...h].map(x=>x+x).join('');const n=parseInt(h,16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
function matrix(x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){
 const cy=Math.cos(ry),syy=Math.sin(ry),cx=Math.cos(rx),sxx=Math.sin(rx),cz=Math.cos(rz),szz=Math.sin(rz);
 // R_y R_x R_z, column-major
 const a00=cy*cz+syy*sxx*szz,a01=-cy*szz+syy*sxx*cz,a02=syy*cx;
 const a10=cx*szz,a11=cx*cz,a12=-sxx;
 const a20=-syy*cz+cy*sxx*szz,a21=syy*szz+cy*sxx*cz,a22=cy*cx;
 return [a00*sx,a10*sx,a20*sx,0,a01*sy,a11*sy,a21*sy,0,a02*sz,a12*sz,a22*sz,0,x,y,z,1]
}
export const MATERIAL_IDS=Object.freeze({plain:0,grass:1,brick:2,asphalt:3,roof:4,wood:5,concrete:6,water:7,dirt:8,plaster:9,metal:10,paving:11,rubber:12});
export class Renderer{
 constructor(canvas){this.canvas=canvas;let gl=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance',depth:true,stencil:false,desynchronized:true});if(!gl)throw Error('Este dispositivo no admite WebGL2');this.gl=gl;this.program=makeProgram(gl);this.uniforms={};for(let n of ['uViewProj','uCamPos','uFogDistance','uFogColor','uOpacity','uTextureReady','uMaterialArray'])this.uniforms[n]=gl.getUniformLocation(this.program,n);
 this.meshes={};for(const [name,geom] of Object.entries({box:cube(),ball:sphere(),baseball:sphere(14,24),pole:prism(10),cone:prism(9,0,.5),hex:prism(6),field:plane(),carTire:wheelTire(),carRim:wheelAlloy(),carArch:wheelArch(),...Object.fromEntries(Object.keys(CAR_CABINS).flatMap(kind=>[['carBody_'+kind,carShell(kind)],['carGlass_'+kind,carCabin(kind,'glass')],['carRoof_'+kind,carCabin(kind,'roof')]]))})){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,geom,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);const instances=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,instances);gl.bufferData(gl.ARRAY_BUFFER,80*256,gl.DYNAMIC_DRAW);for(let i=0;i<4;i++){gl.enableVertexAttribArray(2+i);gl.vertexAttribPointer(2+i,4,gl.FLOAT,false,80,i*16);gl.vertexAttribDivisor(2+i,1)}gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,3,gl.FLOAT,false,80,64);gl.vertexAttribDivisor(6,1);gl.enableVertexAttribArray(7);gl.vertexAttribPointer(7,1,gl.FLOAT,false,80,76);gl.vertexAttribDivisor(7,1);this.meshes[name]={vao,instances,count:geom.length/6,arr:[],ghost:[],overlay:[]};}
 gl.bindVertexArray(null);this.layer='opaque';this.materialId=0;
 this.materialTexture=null;this.textureReady=false;this.anisotropy=1;
 // WebGL2 texture array: materials have independent mipmaps so no tile shimmer/bleeding.
 if(typeof gl.createTexture==='function'&&typeof gl.texImage3D==='function'&&
    typeof gl.texSubImage3D==='function'&&typeof gl.generateMipmap==='function'&&
    typeof Image!=='undefined'&&typeof document!=='undefined'){
  const atlas=new Image();
  atlas.onload=()=>{
   try{
    const size=192,layers=12,tex=gl.createTexture();
    const canvas=document.createElement('canvas');
    canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d',{willReadFrequently:false});
    if(!ctx)throw Error('Canvas de atlas no disponible');
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,tex);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,size,size,layers,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    for(let layer=0;layer<layers;layer++){
     ctx.clearRect(0,0,size,size);
     ctx.drawImage(atlas,(layer%4)*size,Math.floor(layer/4)*size,size,size,0,0,size,size);
     gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,size,size,1,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    const ext=gl.getExtension?.('EXT_texture_filter_anisotropic')||
              gl.getExtension?.('WEBKIT_EXT_texture_filter_anisotropic')||
              gl.getExtension?.('MOZ_EXT_texture_filter_anisotropic');
    if(ext&&typeof gl.texParameterf==='function'){
     const supported=gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)||1;
     this.anisotropy=Math.max(1,Math.min(4,supported));
     gl.texParameterf(gl.TEXTURE_2D_ARRAY,ext.TEXTURE_MAX_ANISOTROPY_EXT,this.anisotropy);
    }
    this.materialTexture=tex;this.textureReady=true;
   }catch(err){
    this.textureReady=false;
    console.warn('Atlas no disponible; usando colores de respaldo',err);
   }
  };
  atlas.onerror=()=>{this.textureReady=false;console.warn('Atlas de materiales no disponible; se conservan los colores base')};
  atlas.src='./assets/materials-atlas-v2.png?v=0.75.0';
 }
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);this.dpr=1.4;this.fogDistance=600;this.totalInstances=0;this.resize();}
 resize(){const dpr=Math.min(window.devicePixelRatio||1,this.dpr);const w=Math.max(1,Math.floor(this.canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(this.canvas.clientHeight*dpr));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h)}this.aspect=w/h}
 begin(){for(const m of Object.values(this.meshes)){m.arr.length=0;m.ghost.length=0;m.overlay.length=0;}this.layer='opaque';this.materialId=0;this.totalInstances=0}
 setLayer(layer='opaque'){this.layer=layer==='ghost'||layer==='overlay'?layer:'opaque'}
 setMaterial(material='plain'){this.materialId=MATERIAL_IDS[material]??0}
 add(shape,x,y,z,sx,sy,sz,color,ry=0,rx=0,rz=0,material=null){let mesh=this.meshes[shape];if(!mesh)return;const id=material===null?this.materialId:(MATERIAL_IDS[material]??0);(this.layer==='ghost'?mesh.ghost:this.layer==='overlay'?mesh.overlay:mesh.arr).push(...matrix(x,y,z,sx,sy,sz,ry,rx,rz),...parseColor(color),id);this.totalInstances++}
 box(x,y,z,sx,sy,sz,col,ry=0,rx=0,rz=0,material=null){this.add('box',x,y,z,sx,sy,sz,col,ry,rx,rz,material)}
 ball(x,y,z,s,colour){this.add('ball',x,y,z,s,s,s,colour)}
 pole(x,y,z,r,h,col,ry=0,rx=0,rz=0){this.add('pole',x,y,z,r*2,h,r*2,col,ry,rx,rz)}
 cone(x,y,z,r,h,col){this.add('cone',x,y,z,r*2,h,r*2,col)}
 field(x,y,z,sx,sz,col,ry=0,material='grass'){this.add('field',x,y,z,sx,1,sz,col,ry,0,0,material)}
 render(cam,target,zoom=60){
  const gl=this.gl;this.resize();gl.clearColor(0.48,.76,.84,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
  const view=lookAt(cam,target),p=perspective(zoom*Math.PI/180,this.aspect,.25,Math.max(2500,this.fogDistance*5)),vp=mul4(p,view);
  gl.uniformMatrix4fv(this.uniforms.uViewProj,false,vp);
  gl.uniform3f(this.uniforms.uCamPos,...cam);
  gl.uniform1f(this.uniforms.uFogDistance,this.fogDistance);
  gl.uniform3f(this.uniforms.uFogColor,.69,.84,.86);
  const useAtlas=this.textureReady&&!!this.materialTexture;
  gl.uniform1f(this.uniforms.uTextureReady,useAtlas?1:0);
  if(useAtlas){
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.materialTexture);
   gl.uniform1i(this.uniforms.uMaterialArray,0);
  }
  const order=['field','box','hex','cone','ball','baseball','pole','carBody_hatch','carBody_sedan','carBody_suv','carBody_pickup','carGlass_hatch','carGlass_sedan','carGlass_suv','carGlass_pickup','carRoof_hatch','carRoof_sedan','carRoof_suv','carRoof_pickup','carTire','carRim','carArch'];
  const draw=(layer)=>{
   for(const name of order){
    const m=this.meshes[name],data=m[layer];
    if(!data.length)continue;
    const vertices=new Float32Array(data);
    gl.bindVertexArray(m.vao);gl.bindBuffer(gl.ARRAY_BUFFER,m.instances);
    gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES,0,m.count,vertices.length/20);
   }
  };
  gl.uniform1f(this.uniforms.uOpacity,1);
  draw('arr');
  if(Object.values(this.meshes).some(m=>m.ghost.length)){
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(false);gl.uniform1f(this.uniforms.uOpacity,.18);
   draw('ghost');
   gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(this.uniforms.uOpacity,1);
  }
  if(Object.values(this.meshes).some(m=>m.overlay.length)){
   // Segunda pasada: solo se limpia profundidad, no el color del mundo.
   // La pelota y sus costuras pueden seguir ocultándose entre sí correctamente.
   gl.clear(gl.DEPTH_BUFFER_BIT);gl.uniform1f(this.uniforms.uOpacity,1);
   draw('overlay');
  }
  gl.bindVertexArray(null);
 }
 setQuality(high){this.dpr=high?Math.min(1.8,window.devicePixelRatio||1):Math.min(1.2,window.devicePixelRatio||1);this.resize()}
}

// Reserva 2D para navegadores donde WebGL2 esté bloqueado por políticas de sistema,
// incluidos entornos de pruebas sin GPU. La versión normal usa Renderer 3D.
export class CanvasRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('Canvas no disponible');this.dpr=1.25;this.fogDistance=600;this.game=null;this.resize()}
 setQuality(high){this.dpr=high?1.4:1;this.resize()}
 resize(){const w=Math.round(this.canvas.clientWidth*this.dpr),h=Math.round(this.canvas.clientHeight*this.dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}this.w=w;this.h=h}
 begin(){} setLayer(){} setMaterial(){} add(){} box(){} ball(){} pole(){} cone(){} field(){}
 render(){this.resize();const c=this.ctx,w=this.w,h=this.h,g=this.game;
 const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#70c9ee');grad.addColorStop(.47,'#b6e9e8');grad.addColorStop(1,'#f1dfa7');c.fillStyle=grad;c.fillRect(0,0,w,h);
 c.save();c.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<6;i++){let x=(i*107+w*.2)%w,y=h*(.18+(i%3)*.064);this.cloud(x,y,21+i%3*9)}
 const fly=g?.state==='flight'||g?.state==='rest';if(fly)this.flightScene(c,w,h,g);else this.stadiumScene(c,w,h,g);
 c.restore();}
 cloud(x,y,s){let c=this.ctx;c.beginPath();c.ellipse(x,y,s*1.5,s*.33,0,0,Math.PI*2);c.ellipse(x-s*.6,y-s*.25,s*.7,s*.52,0,0,Math.PI*2);c.ellipse(x+s*.4,y-s*.3,s*.9,s*.68,0,0,Math.PI*2);c.fill()}
 poly(points,color){const c=this.ctx;c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill()}
 person(x,y,s,batter,phase=0,pose=null){const c=this.ctx;c.save();c.translate(x+(pose?.shift||0)*5*s,y);c.scale(s,s);
 c.fillStyle='#2f684c';c.beginPath();c.ellipse(0,0,40,11,0,0,Math.PI*2);c.fill();
 if(pose)c.translate(0,-(pose.lift||0)*26);
 c.lineCap='round';c.strokeStyle='#f0eadb';c.lineWidth=15;for(let side of [-1,1]){c.beginPath();c.moveTo(side*10,-60);c.lineTo(side*16,-8);c.stroke()}
 this.poly([[-25,-115],[25,-115],[20,-60],[-20,-60]],batter?'#f4a144':'#f2efe8');
 c.strokeStyle='#e0a079';c.lineWidth=12;c.beginPath();c.moveTo(-22,-105);c.lineTo(-35,-78);c.moveTo(22,-105);c.lineTo(36,-76);c.stroke();
 c.fillStyle='#c58c69';c.beginPath();c.arc(0,-140,27,0,Math.PI*2);c.fill();this.poly([[-26,-153],[-12,-169],[24,-163],[27,-150]],batter?'#142e4a':'#28708b');
 c.strokeStyle=batter?(this.game?.batColor||'#e7b56e'):'#e0a078';c.lineWidth=9;c.beginPath();if(batter){c.moveTo(29,-97);c.lineTo(29+Math.sin(phase*3.3+.6)*67,-150-Math.cos(phase*3.3)*29)}else{c.moveTo(25,-92);c.lineTo(44+(pose?.side||0)*14,-87-(pose?.reach||0)*92-(pose?.throw||0)*24)}c.stroke();
 if(!batter){const gx=44+(pose?.side||0)*14,gy=-87-(pose?.reach||0)*92-(pose?.throw||0)*24;c.fillStyle='#995f32';c.beginPath();c.ellipse(gx,gy,14,18,0,0,Math.PI*2);c.fill();c.strokeStyle='#e2ad76';c.lineWidth=2;c.stroke();c.strokeStyle='#253d5e';c.lineWidth=4;c.beginPath();c.moveTo(0,-110);c.lineTo(0,-62);c.stroke();}
 c.restore()}
 stadiumScene(c,w,h,g){this.poly([[0,h*.34],[w,h*.34],[w,h],[0,h]],'#72b472');
 for(let i=0;i<10;i++){let y=h*(.35+i*.074);this.poly([[0,y],[w,y],[w,y+h*.027],[0,y+h*.027]],i%2?'#74b677':'#64aa6d')}
 this.poly([[0,h*.37],[w*.17,h*.30],[w*.83,h*.30],[w,h*.37],[w,h*.49],[0,h*.49]],'#264e6b');
 for(let i=0;i<18;i++){let x=w*(i+.3)/18,y=h*(.32+(i%3)*.019);this.poly([[x,y],[x+w*.026,y],[x+w*.025,y+h*.07],[x,y+h*.07]],['#ffd06a','#f9e8bc','#69aabd'][i%3])}
 this.poly([[w*.5,h*.50],[w*.77,h*.63],[w*.5,h*.77],[w*.23,h*.63]],'#b88356');
 this.poly([[w*.5,h*.55],[w*.72,h*.63],[w*.5,h*.72],[w*.28,h*.63]],'#7bb875');
 c.strokeStyle='#fff4da';c.lineWidth=2.5;c.beginPath();c.moveTo(w*.5,h*.75);c.lineTo(w*.73,h*.62);c.moveTo(w*.5,h*.75);c.lineTo(w*.27,h*.62);c.stroke();
 c.fillStyle='#f8ead9';c.beginPath();c.ellipse(w*.5,h*.6,w*.055,h*.016,0,0,Math.PI*2);c.fill();
 this.person(w*.50,h*.585,.39,false,g?.pitch||0,pitcherPose(g));this.person(w*.74,h*.82,.71,true,g?.swing||0);
 if(g?.state==='pitching'&&!(g?.sprites?.ballLoaded&&g?.sprites?.ctx)){let p=g.pitch||0,ballx=lerp(w*.50,w*.72,p),bally=lerp(h*.48,h*.72,p);c.fillStyle=g.ballStyleColor||'#fff';c.beginPath();c.arc(ballx,bally,Math.max(5,p*9),0,Math.PI*2);c.fill();}
 }
 flightScene(c,w,h,g){const b=g.ball||{z:0,x:0,y:0};const ratio=b.z/1300;
 this.poly([[0,h*.42],[w,h*.42],[w,h],[0,h]],'#6aaf84');
 for(let i=0;i<10;i++){let z=i*170+Math.floor(b.z/250)*250;let k=1-i/14;let bw=(13+((i*11)%12))*k,xx=((i*127-b.z*.22)% (w+160)+w+160)%(w+160)-60,by=h*(.44+i*.056),bh=20+(i*19)%80;
 this.poly([[xx,by],[xx+bw,by],[xx+bw,by-bh],[xx,by-bh]],['#d7b5a1','#d6daca','#d8c8a0','#b6cee1'][i%4]);
 this.poly([[xx,by-bh],[xx+bw*.2,by-bh-11],[xx+bw*1.2,by-bh-11],[xx+bw,by-bh]],'#db886d')}
 if(b.z<95&&b.z>=-10)this.person(w*.5,h*.61+Math.max(0,b.z-21)*1.4,.39,false,0,pitcherPose(g));
 const y=h*.65;this.poly([[0,y],[w,y-h*.16],[w,y-h*.08],[0,y+h*.12]],'#405e63');
 c.save();c.translate(w*.52,h*.48);
 if(!(g?.sprites?.ballLoaded&&g?.sprites?.ctx)){
  c.fillStyle=g.ballStyleColor||'#fff8ed';c.beginPath();c.arc(0,0,21,0,Math.PI*2);c.fill();
  c.rotate(b.spin?.angle||0);c.strokeStyle='#d75d51';c.lineWidth=2.7;c.beginPath();c.arc(-2,1,13,-.8,1.6);c.moveTo(3,-14);c.arc(3,0,13,1.8,4.6);c.stroke();
 }
 c.restore();
 }
}