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
 const stamp=category==='bat'&&['escoba','platano'].includes(id)?'?v=0.77.5':category==='outfit'&&['basket_negro','atletismo','tenis_blanco'].includes(id)?'?v=0.77.4':(category==='ball'&&['tenis','arcoiris'].includes(id)||category==='bat'&&['nova','paraguas'].includes(id))?'?v=0.77.3':category==='outfit'&&id==='futbol_verde'?'?v=0.77.2':id==='futbol_rojo'&&category==='outfit'?'?v=0.77.1':'?v=0.77.0';
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
 // The default outfit also uses the repaired, validated frames.
 for(const pose of OUTFIT_POSES)files.push(bakedAssetUrl('outfit',outfitId,pose,false));
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
 ready:{grip:[50/194,153/347],tip:[26/194,4/347]},
 watch:{grip:[50/177,153/347],tip:[27/177,4/347]},
 loaded:{grip:[35/207,129/355],tip:[86/207,3/355]},
 contact:{grip:[202/359,145/286],tip:[319/359,126/286]},
 follow:{grip:[108/289,83/306],tip:[3/289,80/306]}
});

// Full approved football artwork has its own hand and foot registration.
const FOOTBALL_POSES=Object.freeze({"ready":{"grip":[0.305024,0.456548],"tip":[0.166445,0.102575],"foot":0.5},"watch":{"grip":[0.291675,0.456548],"tip":[0.15177,0.102575],"foot":0.5},"loaded":{"grip":[0.202846,0.376986],"tip":[0.419326,0.041644],"foot":0.5},"contact":{"grip":[0.637114,0.445041],"tip":[0.938209,0.398466],"foot":0.34},"follow":{"grip":[0.39743,0.419068],"tip":[0.068827,0.381808],"foot":0.66}});
export const OUTFIT_WEAPON_POSES=Object.freeze({futbol_rojo:FOOTBALL_POSES,futbol_verde:FOOTBALL_POSES,basket_negro:{"ready":{"grip":[0.303356,0.449748],"tip":[0.165741,0.099063],"foot":0.5},"watch":{"grip":[0.307759,0.448955],"tip":[0.179441,0.09827],"foot":0.5},"loaded":{"grip":[0.213666,0.372283],"tip":[0.411508,0.046256],"foot":0.5},"contact":{"grip":[0.636294,0.437179],"tip":[0.937997,0.398823],"foot":0.260097},"follow":{"grip":[0.399907,0.402014],"tip":[0.069352,0.366397],"foot":0.740833}},atletismo:{"ready":{"grip":[0.327512,0.448658],"tip":[0.186667,0.097973],"foot":0.5},"watch":{"grip":[0.318914,0.448658],"tip":[0.187692,0.097973],"foot":0.5},"loaded":{"grip":[0.251843,0.371566],"tip":[0.44415,0.045539],"foot":0.5},"contact":{"grip":[0.63456,0.430591],"tip":[0.938482,0.392234],"foot":0.258676},"follow":{"grip":[0.386274,0.396083],"tip":[0.067239,0.360466],"foot":0.740751}},tenis_blanco:{"ready":{"grip":[0.315472,0.444712],"tip":[0.173962,0.094027],"foot":0.5},"watch":{"grip":[0.29963,0.444712],"tip":[0.16537,0.094027],"foot":0.5},"loaded":{"grip":[0.206634,0.376214],"tip":[0.40167,0.050187],"foot":0.5},"contact":{"grip":[0.639921,0.42128],"tip":[0.939438,0.382923],"foot":0.262319},"follow":{"grip":[0.391214,0.405384],"tip":[0.068721,0.369768],"foot":0.738862}}});
