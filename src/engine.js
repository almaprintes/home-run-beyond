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
uniform mat4 uViewProj;
uniform vec3 uCamPos;
out vec3 vCol;out float vFog;out float vShade;out float vHeight;
void main(){mat4 model=mat4(m0,m1,m2,m3);vec4 world=model*vec4(aPos,1.);vec3 n=normalize(mat3(model)*aNormal);
float sun=max(0.,dot(n,normalize(vec3(-0.6,1.8,0.7))));
float fill=max(0.,dot(n,normalize(vec3(0.8,0.65,-0.3))));
vShade=0.64+sun*.31+fill*.08+clamp(world.y/900.,0.,.14);
vCol=aColor;vHeight=world.y;vFog=length(world.xyz-uCamPos);gl_Position=uViewProj*world;}
`;
const FRAG=`#version 300 es
precision highp float;
in vec3 vCol;in float vFog;in float vShade;in float vHeight;
uniform float uFogDistance;
uniform vec3 uFogColor;
uniform float uOpacity;
out vec4 fragColor;
void main(){vec3 col=vCol*vShade;col=pow(col,vec3(.96));float f=smoothstep(uFogDistance*.43,uFogDistance,vFog);fragColor=vec4(mix(col,uFogColor,f),uOpacity);}
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
export class Renderer{
 constructor(canvas){this.canvas=canvas;let gl=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance',depth:true,stencil:false,desynchronized:true});if(!gl)throw Error('Este dispositivo no admite WebGL2');this.gl=gl;this.program=makeProgram(gl);this.uniforms={};for(let n of ['uViewProj','uCamPos','uFogDistance','uFogColor','uOpacity'])this.uniforms[n]=gl.getUniformLocation(this.program,n);
 this.meshes={};for(const [name,geom] of Object.entries({box:cube(),ball:sphere(),baseball:sphere(14,24),pole:prism(10),cone:prism(9,0,.5),hex:prism(6),field:plane()})){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,geom,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);const instances=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,instances);gl.bufferData(gl.ARRAY_BUFFER,76*256,gl.DYNAMIC_DRAW);for(let i=0;i<4;i++){gl.enableVertexAttribArray(2+i);gl.vertexAttribPointer(2+i,4,gl.FLOAT,false,76,i*16);gl.vertexAttribDivisor(2+i,1)}gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,3,gl.FLOAT,false,76,64);gl.vertexAttribDivisor(6,1);this.meshes[name]={vao,instances,count:geom.length/6,arr:[],ghost:[],overlay:[]};}
 gl.bindVertexArray(null);this.layer='opaque';gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);this.dpr=1.4;this.fogDistance=600;this.totalInstances=0;this.resize();}
 resize(){const dpr=Math.min(window.devicePixelRatio||1,this.dpr);const w=Math.max(1,Math.floor(this.canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(this.canvas.clientHeight*dpr));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h)}this.aspect=w/h}
 begin(){for(const m of Object.values(this.meshes)){m.arr.length=0;m.ghost.length=0;m.overlay.length=0;}this.layer='opaque';this.totalInstances=0}
 setLayer(layer='opaque'){this.layer=layer==='ghost'||layer==='overlay'?layer:'opaque'}
 add(shape,x,y,z,sx,sy,sz,color,ry=0,rx=0,rz=0){let mesh=this.meshes[shape];if(!mesh)return;(this.layer==='ghost'?mesh.ghost:this.layer==='overlay'?mesh.overlay:mesh.arr).push(...matrix(x,y,z,sx,sy,sz,ry,rx,rz),...parseColor(color));this.totalInstances++}
 box(x,y,z,sx,sy,sz,col,ry=0,rx=0,rz=0){this.add('box',x,y,z,sx,sy,sz,col,ry,rx,rz)}
 ball(x,y,z,s,colour){this.add('ball',x,y,z,s,s,s,colour)}
 pole(x,y,z,r,h,col,ry=0,rx=0,rz=0){this.add('pole',x,y,z,r*2,h,r*2,col,ry,rx,rz)}
 cone(x,y,z,r,h,col){this.add('cone',x,y,z,r*2,h,r*2,col)}
 field(x,y,z,sx,sz,col,ry=0){this.add('field',x,y,z,sx,1,sz,col,ry)}
 render(cam,target,zoom=60){
  const gl=this.gl;this.resize();gl.clearColor(0.48,.76,.84,0);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
  const view=lookAt(cam,target),p=perspective(zoom*Math.PI/180,this.aspect,.25,Math.max(2500,this.fogDistance*5)),vp=mul4(p,view);
  gl.uniformMatrix4fv(this.uniforms.uViewProj,false,vp);
  gl.uniform3f(this.uniforms.uCamPos,...cam);
  gl.uniform1f(this.uniforms.uFogDistance,this.fogDistance);
  gl.uniform3f(this.uniforms.uFogColor,.69,.84,.86);
  const order=['field','box','hex','cone','ball','baseball','pole'];
  const draw=(layer)=>{
   for(const name of order){
    const m=this.meshes[name],data=m[layer];
    if(!data.length)continue;
    const vertices=new Float32Array(data);
    gl.bindVertexArray(m.vao);gl.bindBuffer(gl.ARRAY_BUFFER,m.instances);
    gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES,0,m.count,vertices.length/19);
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
 begin(){} setLayer(){} add(){} box(){} ball(){} pole(){} cone(){} field(){}
 render(){this.resize();const c=this.ctx,w=this.w,h=this.h,g=this.game;
 const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#70c9ee');grad.addColorStop(.47,'#b6e9e8');grad.addColorStop(1,'#f1dfa7');c.fillStyle=grad;c.fillRect(0,0,w,h);
 c.save();c.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<6;i++){let x=(i*107+w*.2)%w,y=h*(.18+(i%3)*.064);this.cloud(x,y,21+i%3*9)}
 const fly=g?.state==='flight'||g?.state==='rest';if(fly)this.flightScene(c,w,h,g);else this.stadiumScene(c,w,h,g);
 c.restore();}
 cloud(x,y,s){let c=this.ctx;c.beginPath();c.ellipse(x,y,s*1.5,s*.33,0,0,Math.PI*2);c.ellipse(x-s*.6,y-s*.25,s*.7,s*.52,0,0,Math.PI*2);c.ellipse(x+s*.4,y-s*.3,s*.9,s*.68,0,0,Math.PI*2);c.fill()}
 poly(points,color){const c=this.ctx;c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill()}
 person(x,y,s,batter,phase=0){const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);
 c.fillStyle='#2f684c';c.beginPath();c.ellipse(0,0,40,11,0,0,Math.PI*2);c.fill();
 c.lineCap='round';c.strokeStyle='#f0eadb';c.lineWidth=15;for(let side of [-1,1]){c.beginPath();c.moveTo(side*10,-60);c.lineTo(side*16,-8);c.stroke()}
 this.poly([[-25,-115],[25,-115],[20,-60],[-20,-60]],batter?'#f4a144':'#f2efe8');
 c.strokeStyle='#e0a079';c.lineWidth=12;c.beginPath();c.moveTo(-22,-105);c.lineTo(-35,-78);c.moveTo(22,-105);c.lineTo(36,-76);c.stroke();
 c.fillStyle='#c58c69';c.beginPath();c.arc(0,-140,27,0,Math.PI*2);c.fill();this.poly([[-26,-153],[-12,-169],[24,-163],[27,-150]],batter?'#142e4a':'#28708b');
 c.strokeStyle=batter?(this.game?.batColor||'#e7b56e'):'#e0a078';c.lineWidth=9;c.beginPath();if(batter){c.moveTo(29,-97);c.lineTo(29+Math.sin(phase*3.3+.6)*67,-150-Math.cos(phase*3.3)*29)}else{c.moveTo(25,-92);c.lineTo(44,-87)}c.stroke();
 c.restore()}
 stadiumScene(c,w,h,g){this.poly([[0,h*.34],[w,h*.34],[w,h],[0,h]],'#72b472');
 for(let i=0;i<10;i++){let y=h*(.35+i*.074);this.poly([[0,y],[w,y],[w,y+h*.027],[0,y+h*.027]],i%2?'#74b677':'#64aa6d')}
 this.poly([[0,h*.37],[w*.17,h*.30],[w*.83,h*.30],[w,h*.37],[w,h*.49],[0,h*.49]],'#264e6b');
 for(let i=0;i<18;i++){let x=w*(i+.3)/18,y=h*(.32+(i%3)*.019);this.poly([[x,y],[x+w*.026,y],[x+w*.025,y+h*.07],[x,y+h*.07]],['#ffd06a','#f9e8bc','#69aabd'][i%3])}
 this.poly([[w*.5,h*.50],[w*.77,h*.63],[w*.5,h*.77],[w*.23,h*.63]],'#b88356');
 this.poly([[w*.5,h*.55],[w*.72,h*.63],[w*.5,h*.72],[w*.28,h*.63]],'#7bb875');
 c.strokeStyle='#fff4da';c.lineWidth=2.5;c.beginPath();c.moveTo(w*.5,h*.75);c.lineTo(w*.73,h*.62);c.moveTo(w*.5,h*.75);c.lineTo(w*.27,h*.62);c.stroke();
 c.fillStyle='#f8ead9';c.beginPath();c.ellipse(w*.5,h*.6,w*.055,h*.016,0,0,Math.PI*2);c.fill();
 this.person(w*.50,h*.585,.39,false,g?.pitch||0);this.person(w*.74,h*.82,.71,true,g?.swing||0);
 if(g?.state==='pitching'){let p=g.pitch||0,ballx=lerp(w*.50,w*.72,p),bally=lerp(h*.48,h*.72,p);c.fillStyle='#fff';c.beginPath();c.arc(ballx,bally,Math.max(5,p*9),0,Math.PI*2);c.fill();}
 }
 flightScene(c,w,h,g){const b=g.ball||{z:0,x:0,y:0};const ratio=b.z/1300;
 this.poly([[0,h*.42],[w,h*.42],[w,h],[0,h]],'#6aaf84');
 for(let i=0;i<10;i++){let z=i*170+Math.floor(b.z/250)*250;let k=1-i/14;let bw=(13+((i*11)%12))*k,xx=((i*127-b.z*.22)% (w+160)+w+160)%(w+160)-60,by=h*(.44+i*.056),bh=20+(i*19)%80;
 this.poly([[xx,by],[xx+bw,by],[xx+bw,by-bh],[xx,by-bh]],['#d7b5a1','#d6daca','#d8c8a0','#b6cee1'][i%4]);
 this.poly([[xx,by-bh],[xx+bw*.2,by-bh-11],[xx+bw*1.2,by-bh-11],[xx+bw,by-bh]],'#db886d')}
 const y=h*.65;this.poly([[0,y],[w,y-h*.16],[w,y-h*.08],[0,y+h*.12]],'#405e63');
 c.save();c.translate(w*.52,h*.48);c.shadowColor='#f9b06a';c.shadowBlur=26;c.strokeStyle='#ffdb8b';c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(-80,50);c.lineTo(-8,6);c.stroke();c.shadowBlur=0;c.fillStyle='#fff8ed';c.beginPath();c.arc(0,0,21,0,Math.PI*2);c.fill();c.strokeStyle='#d75d51';c.lineWidth=2.7;c.beginPath();c.arc(-2,1,13,-.8,1.6);c.moveTo(3,-14);c.arc(3,0,13,1.8,4.6);c.stroke();c.restore();
 }
}