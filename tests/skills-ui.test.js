import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BaseballGame} from '../src/game.js';
import {initialSave} from '../src/logic.js';

test('las tres habilidades se pueden comprar durante el resultado',()=>{
  for (const key of ['power','swing','reflex']) {
    const game=Object.create(BaseballGame.prototype);
    game.state='result';
    game.save=initialSave();
    game.save.coins=218;
    game.audio={cash(){}};
    game.persist=()=>{};
    game.drawUI=()=>{};
    game.toast=()=>{};
    const oldLevel=game.save.levels[key];
    game.buyUpgrade(key);
    assert.equal(game.save.levels[key],oldLevel+1,`Falló la compra: ${key}`);
    assert.ok(game.save.coins<218);
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
