import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BaseballGame} from '../src/game.js';

const markup=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');

test('el lanzamiento utiliza superficie transparente y toque de pantalla completa',()=>{
 assert.match(markup,/id="pitch-surface"[^>]*hidden/);
 assert.match(css,/\.pitch-surface\{[^}]*inset:0;[^}]*background:transparent/);
 assert.match(game,/el\('pitch-surface'\)\.addEventListener\('pointerdown'/);
 assert.match(game,/startPitch\(\)\{[^}]*el\('pitch-surface'\)\.hidden=false/);
 assert.match(game,/startPitch\(\)\{[^}]*el\('controls'\)\.hidden=true/);
 assert.match(game,/swingBat\([^)]*\)\{[^}]*el\('pitch-surface'\)\.hidden=true/);
});

test('descanso persistente con mejoras y volver a batear fuera del resultado',()=>{
 const panel=markup.match(/<section class="layer result"[^]*?<\/section>/)?.[0]||'';
 const shop=markup.match(/<div class="layer upgrades"[^]*?<\/div>\s*<section class="layer modal-shell"/)?.[0]||'';
 assert.doesNotMatch(panel,/id="again"/);
 assert.match(shop,/id="again" class="rest-again" hidden/);
 assert.match(game,/this\.state='rest'/);
 assert.match(game,/el\('again'\)\.hidden=false/);
 assert.match(game,/el\('again'\)\.hidden=true/);
 assert.match(game,/this\.state==='rest'/);
 assert.match(markup,/DESCANSO · MEJORA/);
});

test('el botón grande inicial permanece disponible solo antes de iniciar',()=>{
 assert.match(markup,/id="action" class="hit-button"/);
 assert.match(game,/if\(this\.state==='ready'\)this\.startPitch\(\)/);
});

test('tras iniciar el vuelo, los toques repetidos no generan otro golpe',()=>{
 const g=Object.create(BaseballGame.prototype);
 let n=0;
 g.state='pitching';g.audio={init(){}};
 g.freezeSwing=()=>{n++;g.state='aiming';};
 const previous=globalThis.document;
 try{
  globalThis.document={getElementById:()=>({hidden:true})};
  g.onAction();g.onAction();
  assert.equal(n,1);
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});
