// Catálogo de 101 cosméticos. Bonificaciones únicamente del equipo activo.
// Cada entrada tiene un diseño visible y una identidad visual (no etiquetas vacías).
// Campos: id|nombre|precio|diseño|color principal|acento|emblema
export const RARITY_BONUSES=Object.freeze({
 'COMÚN':Object.freeze({bat:0,outfit:0,ball:0}),
 'POCO COMÚN':Object.freeze({bat:2,outfit:5,ball:5}),
 'RARO':Object.freeze({bat:4,outfit:10,ball:10}),
 'ÉPICO':Object.freeze({bat:7,outfit:15,ball:20}),
 'LEYENDA':Object.freeze({bat:10,outfit:25,ball:35})
});
function parse(rows,category){
 const entries=rows.trim().split('\n').filter(Boolean).map(row=>{
  const [id,name,price,design,color,accent,emoji]=row.split('|');
  if(!id||!name||!Number.isFinite(Number(price)))throw Error('Cosmético incorrecto: '+row);
  const p=Number(price);
  const rarity=p>=12000?'LEYENDA':p>=4200?'ÉPICO':p>=1500?'RARO':p>=500?'POCO COMÚN':'COMÚN';
  const bonus=RARITY_BONUSES[rarity][category];
  const label=category==='bat'?'velocidad de salida':category==='outfit'?'amplitud del punto dulce':'monedas por batazo';
  return Object.freeze({id,name,price:p,design,color,accent,emoji,rarity,bonus,
   description:bonus?'+'+bonus+'% '+label:'Sin bonificación · equipamiento básico'});
 });
 const ids=new Set(entries.map(x=>x.id));
 if(ids.size!==entries.length)throw Error('ID cosmético repetido en '+category);
 return Object.freeze(entries);
}
export const BAT_CATALOG=parse(`
classic|Bate clásico|0|classic|#e7b56e|#b67941|🏏
gold|Bate dorado|320|wood|#ffc85b|#fff1a1|✨
ocean|Bate oceánico|850|wood|#52d1e5|#b8f4ff|🌊
ruby|Bate rubí|850|wood|#ee5265|#ffbdc4|❤️
nova|Bate Nova|3400|nebula|#ab8dff|#69dafa|🚀
carbono|Fibra de carbono|1100|carbon|#2e3d51|#a8b5c4|🏏
neon|Neón eléctrico|1800|neon|#48f6b6|#152d5b|⚡
titanio|Titanio pulido|2600|metal|#c5d3de|#657a88|🔩
hielo|Bate glaciar|3900|ice|#9be2f6|#e4ffff|❄️
fuego|Bate volcánico|4200|flame|#fa8437|#ffdc5c|🔥
escoba|Escoba de barrendero|2600|broom|#c4985e|#ffd366|🧹
trucha|Trucha gigante|4200|trout|#62a6b8|#d3f3e2|🐟
alambre|Bate con alambre|4600|wire|#ab8759|#c6c7c9|🪢
baguette|Baguette crujiente|2900|bread|#e9b76e|#fff1bb|🥖
platano|Plátano de Canarias|3100|banana|#f9d84a|#fff09a|🍌
remo|Remo de regata|3300|paddle|#bb8555|#e7ce9a|🚣
guitarra|Guitarra rockera|5900|guitar|#d6647e|#ffe0ac|🎸
llave|Llave inglesa|5400|wrench|#a9bdc9|#e3f0f5|🔧
martillo|Martillo gigante|6500|hammer|#878e98|#e2c392|🔨
hockey|Palo de hockey|4400|hockey|#e8c69b|#26374e|🏒
paraguas|Paraguas cerrado|3500|umbrella|#5c8fce|#c9e8ff|☂️
cactus|Cactus bateador|7100|cactus|#51b77b|#b5e88d|🌵
varita|Varita astral|9200|wand|#9276ce|#fbe3a1|🪄
microfono|Micrófono de concierto|4900|mic|#c6c7d6|#4d6070|🎤
sarten|Sartén antiadherente|5700|pan|#52616c|#e0a86b|🍳
pezespada|Pez espada|9700|swordfish|#628da7|#b1eff3|🐠
piruleta|Piruleta XL|5900|lollipop|#fc6bb0|#ffffff|🍭
espuma|Espada de espuma|6100|foam|#5ebfed|#ffe478|🗡️
tentaculo|Tentáculo alienígena|11000|tentacle|#aa70d5|#7ee8ca|🐙
hueso|Hueso cavernícola|8200|bone|#e5d6a9|#a98f6a|🦴
maza|Maza medieval|12500|mace|#89919b|#e4ab59|⚔️
pala|Pala de jardín|4300|shovel|#92a2a6|#ce8659|🪏
rastrillo|Rastrillo de campo|4800|rake|#b89464|#decb9f|🧹
zanahoria|Zanahoria descomunal|9600|carrot|#f59647|#5cb77b|🥕
antorcha|Antorcha ancestral|15000|torch|#a6784c|#ffc45a|🔥
pata_de_palo|Bate pata de palo|5900|pegleg|#a86c36|#d8a847|🏴‍☠️
`,'bat');
export const OUTFIT_CATALOG=parse(`
red|Clásico rojo|0|classic|#bd454c|#fff5e9|👕
blue|Clásico azul|350|classic|#3b9fde|#e5f9ff|👕
green|Clásico verde|780|classic|#4dc496|#f1ffe2|👕
purple|Clásico violeta|780|classic|#a785fa|#f9dcff|👕
gold|Dorado campeón|2400|classic|#f3be4c|#fff7db|👕
futbol_azulgrana|Fútbol Blaugrana|2700|stripes|#245ebf|#9d2340|⚽
futbol_blanco|Fútbol blanco total|2600|shoulders|#e9edf2|#cbb77c|⚽
futbol_rojo|Fútbol Athletic|2900|stripes|#e15550|#f7f4e9|⚽
futbol_amarillo|Fútbol amarillo|3000|hoops|#f6c83f|#233b5a|⚽
futbol_verde|Fútbol Betis|3100|stripes|#168346|#f5f5f5|⚽
basket_negro|Baloncesto Canarias|3600|basket|#27303e|#f4c357|🏀
basket_rojo|Baloncesto Baskonia|3800|basket|#d75c54|#f6f3e9|🏀
basket_lila|Baloncesto LA|3900|basket|#9369d3|#ffe39d|🏀
hockey_hielo|Hockey sobre hielo|4400|hockey|#7cc9eb|#1b3455|🏒
tenis_blanco|Tenista Wimbledon|3100|polo|#f7f8ed|#56ba83|🎾
rugby_verde|Rugby verde|4700|hoops|#327a4e|#e9bc74|🏉
ciclismo|Maillot ciclista|4800|cycling|#35bfc2|#f8dd57|🚴
atletismo|Velocista neón|4000|running|#f67f4a|#6cead6|🏃
boxeo|Boxeador rojo|5200|boxing|#c7454e|#f8cf69|🥊
karate|Karateka blanco|5600|kimono|#f4f0e5|#282e3b|🥋
luchador|Lucha libre|6900|wrestling|#df5ab8|#ffe68d|🤼
golfista|Golfista clásico|4700|polo|#a6d7b4|#ffffff|⛳
retro|Béisbol retro|3500|pinstripes|#e6dfcf|#c54d47|⚾
cricket|Críquet crema|4200|polo|#f3ecd6|#b0a37f|🏏
portero|Guardameta naranja|4800|jersey|#f08027|#253f78|🥅
chef|Chef de campeonato|7300|chef|#f5f3e5|#e45750|👨‍🍳
pescador|Pescador del muelle|7900|fisher|#5e9db2|#f8dc92|🎣
pirata|Pirata del home|9100|pirate|#303e54|#d2a365|🏴‍☠️
vaquero|Vaquero del oeste|9700|cowboy|#b98960|#dfba81|🤠
astronauta|Astronauta orbital|13000|astronaut|#dfeaf0|#78b5e0|👨‍🚀
ninja|Ninja del diamante|11200|ninja|#303946|#b85665|🥷
bombero|Bombero valiente|11400|fireman|#d7a142|#f4e7a1|🚒
robot|Jugador robótico|16000|robot|#91bac6|#435b73|🤖
`,'outfit');
export const BALL_CATALOG=parse(`
classic|Pelota clásica|0|baseball|#ffffff|#dd3f45|⚾
sky|Pelota azul|280|baseball|#9cdafa|#e35b52|⚾
sun|Pelota amarilla|620|baseball|#ffd26c|#d65b4d|⚾
mint|Pelota verde menta|620|baseball|#a1f0c4|#d95659|⚾
lilac|Pelota lavanda|620|baseball|#ccb0fc|#d85b6a|⚾
negra|Pelota negra|720|baseball|#343744|#e8a259|⚾
dorada|Pelota dorada|2300|baseball|#d9a52e|#8b5010|⚾
rosa|Pelota rosa|620|baseball|#f5a6cc|#ffffff|⚾
arcoiris|Pelota arcoíris|3500|rainbow|#f7d973|#76dcea|🌈
sol|Mini Sol|4300|sun|#ffb835|#ffea79|☀️
luna|Mini Luna|4900|moon|#c6cbd4|#8a929e|🌕
tierra|Planeta Tierra|5800|earth|#397ecc|#61c489|🌍
marte|Planeta Marte|5900|mars|#cf7963|#a35349|🪐
saturno|Mini Saturno|8100|saturn|#dbc59a|#d9b16a|🪐
billar8|Bola 8 de billar|6700|billiard|#292e37|#ffffff|🎱
tenis|Pelota de tenis|3200|tennis|#c9e64e|#ffffff|🎾
golf|Pelota de golf|3700|golf|#f1f2ec|#aebac2|⛳
playa|Pelota de playa|4100|beach|#f8e7af|#e95152|🏖️
sandia|Sandía redonda|4500|watermelon|#5ab369|#ea5f64|🍉
naranja|Naranja gigante|4800|orange|#f5a037|#417c4c|🍊
ojo|Ojo que todo lo ve|6800|eyeball|#f4ebe5|#4fb8b0|👁️
meteorito|Meteorito|8200|meteor|#847568|#f1a453|☄️
disco|Bola de discoteca|8800|disco|#c1d2e6|#8aa9d0|🪩
bomba|Bomba de dibujos|9500|bomb|#454450|#ffb556|💣
calabaza|Mini calabaza|5600|pumpkin|#e88d38|#4c9f5e|🎃
nieve|Bola de nieve|5500|snow|#eff8ff|#8cbfe1|❄️
bolos|Bola de bolos|7200|bowling|#70499e|#2b253d|🎳
dado|Dado cúbico|7500|dice|#f1e6cb|#d65b4f|🎲
donut|Dónut glaseado|9100|donut|#dc9a6c|#ff99b9|🍩
caramelo|Caramelo redondo|9400|candy|#f980c0|#e8edfa|🍬
cristal|Cristal encantado|12500|crystal|#8bd9ea|#e3ffff|💎
futbol|Balón de fútbol|6800|soccer|#f6f5f0|#26323e|⚽
`,'ball');
export const ALL_COSMETIC_COUNT=BAT_CATALOG.length+OUTFIT_CATALOG.length+BALL_CATALOG.length;
if(ALL_COSMETIC_COUNT!==101)throw Error('Se esperaban 101 cosméticos, hay '+ALL_COSMETIC_COUNT);
export function cosmeticItem(category,id){
 const list=category==='bat'?BAT_CATALOG:category==='outfit'?OUTFIT_CATALOG:category==='ball'?BALL_CATALOG:null;
 return list?.find(x=>x.id===id)||null;
}

// Never grant bonuses for inventory alone, or for an unowned equipped ID.
export function equipmentBonuses(save){
 const active=(category,owned,id)=>Array.isArray(owned)&&owned.includes(id)?(cosmeticItem(category,id)?.bonus||0)/100:0;
 return {power:active('bat',save?.owned,save?.equipped),precision:active('outfit',save?.ownedOutfits,save?.equippedOutfit),coins:active('ball',save?.ownedBalls,save?.equippedBall)};
}
