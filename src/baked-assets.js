// Immutable addresses of real, complete pre-rendered cosmetic assets.
// Generated from the five original poses by tools/build_cosmetics.py.
export const OUTFIT_POSES=Object.freeze(['ready','watch','loaded','contact','follow']);
export const BAKED_ASSET_COUNT=397;
export const BASEBALL_SKIN_IDS=new Set(['classic','sky','sun','mint','lilac','negra','dorada','rosa']);
export function ballRenderMode(item){return item?.design==='baseball'?'baseball':'special'}
export function bakedAssetUrl(category,id,pose='ready',withoutBat=false){
 if(!/^[a-z0-9_]+$/.test(String(id)))throw Error('Invalid cosmetic id');
 // Versionar también los WEBP horneados: Safari/PWA no debe conservar
 // ni la pelota de tenis lisa ni poses con restos del bate anterior.
 const stamp='?v=0.52.0';
 if(category==='outfit'){
  if(!OUTFIT_POSES.includes(pose))throw Error('Invalid pose');
  return './assets/baked/outfits/'+id+'/'+pose+(withoutBat?'-nobat':'')+'.webp'+stamp;
 }
 if(category==='bat')return './assets/baked/bats/'+id+'.webp'+stamp;
 if(category==='ball')return './assets/baked/balls/'+id+'.webp'+stamp;
 throw Error('Unknown cosmetic category');
}
export function equippedAssetPaths(outfitId,batId,ballId){
 const files=[];
 if(outfitId!=='red'||batId!=='classic'){
  for(const pose of OUTFIT_POSES)files.push(bakedAssetUrl('outfit',outfitId,pose,false));
 }
 if(batId!=='classic'){
  for(const pose of OUTFIT_POSES)files.push(bakedAssetUrl('outfit',outfitId,pose,true));
  files.push(bakedAssetUrl('bat',batId));
 }
 files.push(bakedAssetUrl('ball',ballId));
 return [...new Set(files)];
}

// Sólo metadatos de dibujo: sin capas de ropa ni generadores de rectángulos.
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
