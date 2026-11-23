// Variantes cosméticas locales: no descargan modelos ni modifican las físicas.
// El sprite original conserva sus sombras, contornos y aspecto low-poly.
const clampByte=v=>Math.max(0,Math.min(255,Math.round(v)));
function toRgb(hex){
 if(!/^#[0-9a-f]{6}$/i.test(hex||''))return null;
 return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
}
export function recolorSpritePixels(pixels,width,height,kind,color,pose='ready'){
 const rgb=toRgb(color);
 if(!rgb||!pixels||!width||!height)return pixels;
 for(let y=0;y<height;y++){
  for(let x=0;x<width;x++){
   const i=(y*width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],alpha=pixels[i+3];
   if(alpha<10)continue;
   if(kind==='outfit'){
    // Solo los tejidos y casco originalmente rojos; piel, guantes y
    // zonas blancas permanecen intactas.
    if(!(r>g*1.26&&r>b*1.20&&g<=b*1.14+6&&r>38))continue;
    const shade=Math.max(.28,Math.min(1.42,(r*.30+g*.53+b*.17)/100));
    for(let c=0;c<3;c++)pixels[i+c]=clampByte(rgb[c]*shade);
   }else if(kind==='bat'){
    const u=x/width,v=y/height;
    const region=pose==='contact'?u>.53&&v>.20&&v<.58:
                 pose==='follow'?u<.52&&v>.12&&v<.42:
                 pose==='loaded'?u<.54&&v<.36:
                 u<.39&&v<.45;
    if(!region||!(r>g*1.12&&g>b*1.15&&g>72&&b>34))continue;
    const shade=Math.max(.36,Math.min(1.38,(r*.35+g*.5+b*.15)/150));
    for(let c=0;c<3;c++)pixels[i+c]=clampByte(rgb[c]*shade);
   }else if(kind==='ball'){
    // Pintar únicamente el cuero blanco: conservar las costuras rojas.
    if(!(r>130&&g>130&&b>130&&Math.max(r,g,b)-Math.min(r,g,b)<52))continue;
    const shade=Math.max(.45,Math.min(1.20,(r+g+b)/720));
    for(let c=0;c<3;c++)pixels[i+c]=clampByte(rgb[c]*shade);
   }
  }
 }
 return pixels;
}
export function makeCosmeticCanvas(image,options){
 if(typeof document==='undefined'||!image)return image;
 const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
 if(!(width>0&&height>0))return image;
 try{
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx?.getImageData||!ctx?.putImageData)return image;
  ctx.drawImage(image,0,0,width,height);
  const data=ctx.getImageData(0,0,width,height);
  recolorSpritePixels(data.data,width,height,options.kind,options.color,options.pose);
  ctx.putImageData(data,0,0);
  return canvas;
 }catch(error){
  console.warn('Variante cosmética no disponible',error);
  return image;
 }
}
