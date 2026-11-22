import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BaseballGame} from '../src/game.js';
import {initialSave,upgradeCost,formatInt} from '../src/logic.js';

test('las tres habilidades se pueden comprar durante el resultado',()=>{
  for (const key of ['power','swing','multiplier']) {
    const game=Object.create(BaseballGame.prototype);
    game.state='rest';
    game.save=initialSave();
    game.save.coins=1000;
    game.audio={cash(){}};
    game.persist=()=>{};
    game.drawUI=()=>{};
    game.toast=()=>{};
    const oldLevel=game.save.levels[key];
    game.buyUpgrade(key);
    assert.equal(game.save.levels[key],oldLevel+1,`Falló la compra: ${key}`);
    assert.ok(game.save.coins<1000);
  }
});

test('panel táctil de mejoras por delante de la capa de resultados',()=>{
  const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
  const result=css.match(/\.result\{([^}]*)\}/)?.[1]||'';
  const upgrades=css.match(/\.upgrades\{([^}]*)\}/)?.[1]||'';
  const button=css.match(/\.upgrade\{([^}]*)\}/)?.[1]||'';
  const z=cssText=>Number(cssText.match(/z-index:\s*(\d+)/)?.[1]||0);
  assert.ok(z(upgrades)>z(result),'el overlay impediría pulsar skills en Safari');
  assert.match(upgrades,/pointer-events:\s*auto/);
  assert.match(button,/touch-action:\s*manipulation/);
});

test('resultados compactos y los botones comprables se destacan',()=>{
  const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(css,/\.result\{top:calc\(105px/);
  assert.match(css,/\.result\{[^}]*pointer-events:none/);
  assert.match(css,/\.upgrade\.is-affordable\{/);
  assert.match(css,/\.upgrade\.is-bonus\{/);
  assert.match(html,/id="bonus-track"/);
  assert.match(html,/id="buy-label-multiplier"/);
});
test('un bono pendiente no se canjea gratis si no hay anuncios, pero permite comprar',()=>{
 const game=Object.create(BaseballGame.prototype);
 game.state='rest';game.save=initialSave();game.save.coins=2000;
 game.save.paidUpgrades=5;game.audio={cash(){}};game.persist=()=>{};
 game.drawUI=()=>{};game.toast=()=>{};
 const before=game.save.coins;
 game.buyUpgrade('multiplier');
 assert.equal(game.save.levels.multiplier,2);
 assert.ok(game.save.coins<before,'compra pagada, no recompensa fingida');
 assert.equal(game.save.bonusClaims,0,'bono pendiente no reclamado');
});
test('un proveedor de anuncios solo entrega recompensa tras confirmación real',async()=>{
 const oldWindow=globalThis.window;
 globalThis.window={HRB_REWARDED_AD:{show:async()=>({rewarded:true})}};
 try{
  const g=Object.create(BaseballGame.prototype);
  g.state='rest';g.save=initialSave();g.save.coins=500;
  g.save.paidUpgrades=5;
  g.audio={cash(){}};g.persist=()=>{};g.drawUI=()=>{};g.toast=()=>{};
  g.buyUpgrade('multiplier');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(g.save.levels.multiplier,2);
  assert.equal(g.save.coins,500,'premio por anuncio no consume monedas');
  assert.equal(g.save.bonusClaims,1);
 }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow}
});

test('la tarjeta de Multiplicador muestra el premio actual y el del siguiente nivel',()=>{
 const previous=globalThis.document;
 const nodes=new Map();
 globalThis.document={getElementById(id){
  if(!nodes.has(id))nodes.set(id,{
   textContent:'',disabled:false,
   classList:{toggle(){}},
   setAttribute(name,value){this[name]=value}
  });
  return nodes.get(id);
 }};
 try{
  const game=Object.create(BaseballGame.prototype);
  game.save=initialSave();game.save.coins=4000;
  game.save.levels.multiplier=8;game.rewardPending=false;
  game.audio={cash(){}};game.persist=()=>{};game.toast=()=>{};
  game.drawUI();
  assert.equal(nodes.get('level-multiplier').textContent,'NIV. 8');
  assert.equal(nodes.get('multiplier-current').textContent,'×1,28');
  assert.equal(nodes.get('multiplier-next').textContent,'SIG. ×1,32');
  assert.equal(nodes.get('cost-multiplier').textContent,formatInt(upgradeCost(8,'multiplier')));
  assert.match(nodes.get('up-multiplier')['aria-label'],/nivel 8, multiplicador actual por 1\.28, siguiente por 1\.32/);
  game.buyUpgrade('multiplier');
  assert.equal(game.save.levels.multiplier,9);
  assert.equal(nodes.get('multiplier-current').textContent,'×1,32');
  assert.equal(nodes.get('multiplier-next').textContent,'SIG. ×1,36');
  assert.equal(nodes.get('level-multiplier').textContent,'NIV. 9');
  assert.equal(nodes.get('cost-multiplier').textContent,formatInt(upgradeCost(9,'multiplier')));
 }finally{
  if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
 }
});

test('la tarjeta de multiplicador es compacta y enseña ambos valores sin alterar la recompensa',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(html,/id="multiplier-current"/);
 assert.match(html,/id="multiplier-next"/);
 assert.match(css,/#up-multiplier \.upgrade-multiplier/);
 assert.match(css,/font-variant-numeric:tabular-nums/);
 assert.match(html,/id="cost-multiplier"/);
});
