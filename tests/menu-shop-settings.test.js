import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialSave,sanitizeSave,equipCosmetic,SHOP_SECTIONS,OUTFITS,BALL_STYLES,COSMETICS,calculateShot,rewardForMeters} from '../src/logic.js';
import {recolorSpritePixels} from '../src/cosmetic-render.js';
import {BaseballGame} from '../src/game.js';
import {GameAudio} from '../src/audio.js';
import {BatterSprites,selectBatterPose} from '../src/sprites.js';
import {hasRewardedAds} from '../src/rewarded.js';

function domFixture(run){
 const prior=globalThis.document,els=new Map();
 globalThis.document={getElementById(id){
  if(!els.has(id)){
   const classes=new Set();
   els.set(id,{hidden:false,textContent:'',value:'',disabled:false,style:{},
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},
    setAttribute(name,v){this[name]=v},querySelector(){return {textContent:''}}});
  }
  return els.get(id);
 }};
 try{return run(els)}finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior}
}
test('los guardados anteriores conservan niveles, monedas y bates sin exigir cuentas',()=>{
 const old={version:2,coins:1311,best:1730,shots:97,levels:{power:49,swing:17,multiplier:9},owned:['classic','gold'],equipped:'gold',paidUpgrades:11,bonusClaims:1};
 const s=sanitizeSave(old);
 assert.equal(s.version,3);
 assert.equal(s.coins,1311);assert.equal(s.best,1730);assert.equal(s.shots,97);
 assert.equal(s.levels.power,49);assert.equal(s.levels.multiplier,9);
 assert.equal(s.equipped,'gold');
 assert.deepEqual(s.ownedOutfits,['red']);
 assert.deepEqual(s.ownedBalls,['classic']);
 assert.equal(s.equippedOutfit,'red');assert.equal(s.equippedBall,'classic');
 assert.equal(s.sound,true);assert.equal(s.music,false);
 assert.equal(s.voice,true);assert.equal(s.graphics,'auto');assert.equal(s.batterySaver,false);
 assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(s))),s);
});
test('ropa, pelota y bate son tres catálogos con monedas compartidas',()=>{
 const save=initialSave();save.coins=2000;
 assert.deepEqual(Object.keys(SHOP_SECTIONS),['bat','outfit','ball']);
 assert.equal(equipCosmetic(save,'outfit','blue'),'purchased');
 assert.equal(save.coins,1650);
 assert.equal(save.equippedOutfit,'blue');
 assert.equal(equipCosmetic(save,'ball','sky'),'purchased');
 assert.equal(save.coins,1370);assert.equal(save.equippedBall,'sky');
 assert.equal(equipCosmetic(save,'bat','gold'),'purchased');
 assert.equal(save.coins,1050);assert.equal(save.equipped,'gold');
 assert.equal(equipCosmetic(save,'outfit','red'),'equipped');
 assert.equal(save.coins,1050);
 assert.equal(equipCosmetic(save,'outfit','blue'),'equipped');
 assert.equal(save.coins,1050);
 assert.equal(equipCosmetic(save,'ball','invalid'),'invalid');
 const before=JSON.stringify(save);
 assert.equal(equipCosmetic(save,'outfit','gold'),'insufficient');
 assert.equal(JSON.stringify(save),before);
 assert.deepEqual(sanitizeSave(save).ownedOutfits,['red','blue']);
 assert.deepEqual(sanitizeSave(save).ownedBalls,['classic','sky']);
});
test('equipar ropa, bate y pelota no cambia física, distancia ni economía',()=>{
 const save=initialSave();save.coins=10000;
 const shot=calculateShot(save.levels,0),reward=rewardForMeters(900,save.levels);
 for(const [kind,id] of [['outfit','purple'],['ball','lilac'],['bat','nova']]){
  assert.equal(equipCosmetic(save,kind,id),'purchased');
 }
 assert.deepEqual(calculateShot(save.levels,0),shot);
 assert.equal(rewardForMeters(900,save.levels),reward);
});
test('uniforme cambia tela roja, sin recolorear la piel naranja',()=>{
 const pixels=new Uint8ClampedArray([200,54,60,255, 220,160,120,255, 110,120,140,255, 0,0,0,0]);
 recolorSpritePixels(pixels,4,1,'outfit','#3b9fde','ready');
 assert.ok(pixels[2]>pixels[0],'el rojo se vuelve azul');
 assert.deepEqual([...pixels.slice(4,8)],[220,160,120,255]);
 assert.deepEqual([...pixels.slice(8,12)],[110,120,140,255]);
});
test('color de pelota conserva costuras rojas y sombreado de cuero',()=>{
 const px=new Uint8ClampedArray([240,242,244,255,190,53,45,255,150,154,156,255]);
 recolorSpritePixels(px,3,1,'ball','#9cdafa');
 assert.ok(px[2]>px[0]&&px[0]>100);
 assert.deepEqual([...px.slice(4,8)],[190,53,45,255]);
});
test('bate se recolorea solo en región geométrica esperada',()=>{
 const p=new Uint8ClampedArray([203,145,84,255,203,145,84,255]);
 recolorSpritePixels(p,2,1,'bat','#52d1e5','ready');
 assert.ok(p[2]>p[0],'madera tintada');
 assert.equal(p[4],203,'zona fuera del bate intacta');
});
test('menú inicial no arranca partida, permite jugar con un toque y volver tras un golpe',()=>domFixture(els=>{
 const game=Object.create(BaseballGame.prototype);
 game.state='ready';game.save=initialSave();game.camera=[];game.target=[];
 game.impactFX={clear(){}};game.drawUI=()=>{};
 game.showMenu();
 assert.equal(game.state,'menu');assert.equal(els.get('main-menu').hidden,false);
 assert.equal(els.get('upgrades').hidden,true);assert.equal(els.get('controls').hidden,true);
 assert.equal(els.get('hud').hidden,true);
 let started=0;
 game.resetAndPitch=()=>{started++;game.state='pitching'};
 els.get('settings').hidden=true;els.get('shop').hidden=true;
 game.playFromMenu();
 assert.equal(started,1);assert.equal(game.state,'pitching');
 assert.equal(els.get('main-menu').hidden,true);assert.equal(els.get('hud').hidden,false);
 game.state='rest';game.showMenu();assert.equal(game.state,'menu');
 assert.equal(els.get('main-menu').hidden,false);
}));
test('ajustes conservan preferencias locales y gobiernan la calidad real',()=>domFixture(els=>{
 const game=Object.create(BaseballGame.prototype);
 game.state='menu';game.save=initialSave();game.audio={enabled:true,voiceEnabled:true,init(){}};
 const quality=[];game.renderer={setQuality(value){quality.push(value)}};
 game.persist=()=>{};game.drawUI=()=>{};game.musicClock=3;
 game.renderSettings=()=>{};
 game.toggleSetting('voice');assert.equal(game.save.voice,false);assert.equal(game.audio.voiceEnabled,false);
 game.toggleSetting('batterySaver');
 assert.equal(game.save.batterySaver,true);assert.equal(quality.at(-1),false);
 game.toggleSetting('showHints');assert.ok(els.get('app').classList.contains('hide-help'));
 game.toggleSetting('reducedEffects');assert.equal(game.save.reducedEffects,true);
 game.toggleSetting('music');assert.equal(game.save.music,true);assert.equal(game.musicClock,0);
}));
test('borrar progreso exige confirmación, nunca se ejecuta sin tocarlo',()=>domFixture(()=>{
 const previous=globalThis.window;
 let answer=false;
 globalThis.window={confirm:()=>answer};
 try{
  const g=Object.create(BaseballGame.prototype);
  g.save=initialSave();g.save.coins=5000;g.save.levels.power=49;
  g.persist=()=>{};g.applySettings=()=>{};g.renderSettings=()=>{};g.drawUI=()=>{};g.toast=()=>{};
  g.resetProgress();
  assert.equal(g.save.coins,5000);
  answer=true;g.resetProgress();
  assert.equal(g.save.coins,170);assert.equal(g.save.levels.power,1);
  assert.equal(g.save.ownedOutfits[0],'red');
 }finally{
  if(previous===undefined)delete globalThis.window;else globalThis.window=previous;
 }
}));
test('voz de Strike puede silenciarse sin desactivar sonido de golpes',()=>{
 const a=new GameAudio();a.ctx={state:'running'};a.voiceEnabled=false;
 a.enabled=true;
 assert.equal(a.prepareStrike() instanceof Promise,true);
 assert.equal(a.strike(),undefined);
 assert.equal(a.pendingStrike,false);
 assert.equal(a.enabled,true);
});
test('no aparecen controles de login, rankings ni anuncios forzados',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const style=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(html,/id="main-menu"/);
 for(const id of ['menu-play','menu-shop','menu-settings','settings','settings-graphics','menu-return','shop-tab-outfit','shop-tab-ball','settings-reset']){
  assert.ok(html.includes('id="'+id+'"'),id+' ausente');
 }
 assert.doesNotMatch(html,/id="(login|register|leaderboard|daily-quests)"/);
 assert.match(style,/\.main-menu\{/);
 assert.match(style,/\.menu-play\{/);
 assert.match(style,/\.shop-tab\.active\{/);
 assert.match(style,/\.setting-row\{/);
 const rewarded=readFileSync(new URL('../src/rewarded.js',import.meta.url),'utf8');
 assert.match(rewarded,/rewarded===true/);
 assert.equal(hasRewardedAds(),false);
});
test('pelota y uniforme se renderizan con el equipamiento seleccionado',()=>{
 const sprites=new BatterSprites({getContext:()=>null});
 sprites.images={ready:{naturalWidth:12,naturalHeight:16},ball:{naturalWidth:12,naturalHeight:12}};
 const save=initialSave();
 assert.equal(sprites.getStyledPose('ready',save),sprites.images.ready);
 assert.equal(sprites.getStyledBall(save),sprites.images.ball);
 assert.equal(selectBatterPose({state:'menu'}),'ready');
});
