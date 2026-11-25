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
 const stamp=category==='outfit'&&id==='chef'?'?v=0.77.14':category==='outfit'&&id==='luchador'?'?v=0.77.13':category==='bat'&&id==='trucha'?'?v=0.77.12':category==='ball'&&id==='playa'?'?v=0.77.11':category==='bat'&&id==='martillo'?'?v=0.77.10':category==='outfit'&&id==='basket_lila'?'?v=0.77.9':category==='ball'&&['naranja','nieve'].includes(id)?'?v=0.77.8':category==='outfit'&&['hockey_hielo','basket_rojo'].includes(id)?'?v=0.77.6':category==='bat'&&['escoba','platano'].includes(id)?'?v=0.77.5':category==='outfit'&&['basket_negro','atletismo','tenis_blanco'].includes(id)?'?v=0.77.4':(category==='ball'&&['tenis','arcoiris'].includes(id)||category==='bat'&&['nova','paraguas'].includes(id))?'?v=0.77.3':category==='outfit'&&id==='futbol_verde'?'?v=0.77.2':id==='futbol_rojo'&&category==='outfit'?'?v=0.77.1':'?v=0.77.0';
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
export const OUTFIT_WEAPON_POSES=Object.freeze({futbol_rojo:FOOTBALL_POSES,futbol_verde:FOOTBALL_POSES,basket_negro:{"ready":{"grip":[0.303356,0.449748],"tip":[0.165741,0.099063],"foot":0.5},"watch":{"grip":[0.307759,0.448955],"tip":[0.179441,0.09827],"foot":0.5},"loaded":{"grip":[0.213666,0.372283],"tip":[0.411508,0.046256],"foot":0.5},"contact":{"grip":[0.636294,0.437179],"tip":[0.937997,0.398823],"foot":0.260097},"follow":{"grip":[0.399907,0.402014],"tip":[0.069352,0.366397],"foot":0.740833}},atletismo:{"ready":{"grip":[0.327512,0.448658],"tip":[0.186667,0.097973],"foot":0.5},"watch":{"grip":[0.318914,0.448658],"tip":[0.187692,0.097973],"foot":0.5},"loaded":{"grip":[0.251843,0.371566],"tip":[0.44415,0.045539],"foot":0.5},"contact":{"grip":[0.63456,0.430591],"tip":[0.938482,0.392234],"foot":0.258676},"follow":{"grip":[0.386274,0.396083],"tip":[0.067239,0.360466],"foot":0.740751}},tenis_blanco:{"ready":{"grip":[0.315472,0.444712],"tip":[0.173962,0.094027],"foot":0.5},"watch":{"grip":[0.29963,0.444712],"tip":[0.16537,0.094027],"foot":0.5},"loaded":{"grip":[0.206634,0.376214],"tip":[0.40167,0.050187],"foot":0.5},"contact":{"grip":[0.639921,0.42128],"tip":[0.939438,0.382923],"foot":0.262319},"follow":{"grip":[0.391214,0.405384],"tip":[0.068721,0.369768],"foot":0.738862}},hockey_hielo:{"ready":{"grip":[0.288644,0.477588],"tip":[0.14723,0.126903],"foot":0.5},"watch":{"grip":[0.298957,0.476593],"tip":[0.162371,0.125908],"foot":0.5},"loaded":{"grip":[0.221166,0.409676],"tip":[0.423414,0.083649],"foot":0.5},"contact":{"grip":[0.669778,0.448735],"tip":[0.979751,0.410378],"foot":0.26},"follow":{"grip":[0.343011,0.416704],"tip":[0.023923,0.381088],"foot":0.74}},basket_rojo:{"ready":{"grip":[0.318204,0.452896],"tip":[0.181618,0.102211],"foot":0.5},"watch":{"grip":[0.281311,0.456495],"tip":[0.144725,0.10581],"foot":0.5},"loaded":{"grip":[0.218405,0.369842],"tip":[0.422951,0.043814],"foot":0.5},"contact":{"grip":[0.670083,0.42949],"tip":[0.979223,0.391134],"foot":0.26},"follow":{"grip":[0.354886,0.409034],"tip":[0.022541,0.373417],"foot":0.74}},basket_lila:{"ready":{"grip":[0.302441,0.453185],"tip":[0.174001,0.102501],"foot":0.5},"watch":{"grip":[0.288251,0.452142],"tip":[0.165444,0.101457],"foot":0.5},"loaded":{"grip":[0.213828,0.398757],"tip":[0.441769,0.072729],"foot":0.5},"contact":{"grip":[0.677255,0.432954],"tip":[0.967492,0.394598],"foot":0.26},"follow":{"grip":[0.35576,0.405292],"tip":[0.035993,0.369675],"foot":0.74}},luchador:{"ready":{"grip":[0.295282,0.447491],"tip":[0.165818,0.096806],"foot":0.5},"watch":{"grip":[0.284714,0.447491],"tip":[0.155826,0.096806],"foot":0.5},"loaded":{"grip":[0.225466,0.385814],"tip":[0.433496,0.059787],"foot":0.5},"contact":{"grip":[0.678062,0.452443],"tip":[0.967536,0.414087],"foot":0.26},"follow":{"grip":[0.349836,0.423348],"tip":[0.03555,0.387732],"foot":0.74}},chef:{"ready":{"grip":[0.316412,0.495438],"tip":[0.098402,0.144754],"foot":0.5},"watch":{"grip":[0.29609,0.498064],"tip":[0.074936,0.147379],"foot":0.5},"loaded":{"grip":[0.195448,0.408765],"tip":[0.408683,0.082737],"foot":0.5},"contact":{"grip":[0.673059,0.475818],"tip":[0.961772,0.437462],"foot":0.26},"follow":{"grip":[0.389958,0.450266],"tip":[0.077458,0.414649],"foot":0.74}}});
