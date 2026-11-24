import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BaseballGame} from '../src/game.js';
import {initialSave} from '../src/logic.js';

function withFakeDOM(run){
 const before=globalThis.document,nodes=new Map();
 globalThis.document={getElementById(id){
  if(!nodes.has(id)){
   const classes=new Set();
   nodes.set(id,{
    textContent:'',hidden:true,style:{},classList:{
     add(...values){values.forEach(v=>classes.add(v))},
     remove(...values){values.forEach(v=>classes.delete(v))},
     contains(v){return classes.has(v)},
     toggle(v,on){if(on)classes.add(v);else classes.delete(v)}
    }
   });
  }
  return nodes.get(id);
 }};
 try{return run(nodes)}finally{
  if(before===undefined)delete globalThis.document;else globalThis.document=before;
 }
}

test('no quedan avisos anteriores detrás del resultado al terminar un batazo',()=>withFakeDOM(els=>{
 const g=Object.create(BaseballGame.prototype);
 g.state='ready';g.toastTimer=0;g.save=initialSave();
 g.audio={cash(){},record(){}};g.persist=()=>{};g.drawUI=()=>{};
 g.showDiscoveries=()=>{};g.pendingShot={quality:'good'};g.ball={z:45,maxZ:45,encounters:{}};
 g.toast('¡MÁS POTENCIA!');
 assert.ok(els.get('toast').classList.contains('show'),'aviso visible antes del resultado');
 g.state='flight';g.finishShot();
 assert.equal(g.state,'rest');
 assert.equal(els.get('result').hidden,false);
 assert.equal(els.get('toast').classList.contains('show'),false);
 assert.equal(els.get('toast').textContent,'');
 assert.equal(g.toastTimer,0);
 assert.equal(els.get('upgrades-subtitle').textContent,'Sube habilidades antes del siguiente batazo');
}));

test('las mejoras durante descanso dan feedback dentro de mejoras, nunca tras resultados',()=>withFakeDOM(els=>{
 const g=Object.create(BaseballGame.prototype);g.state='rest';
 g.toast('¡MÁS POTENCIA!');
 assert.equal(els.get('toast').classList.contains('show'),false);
 assert.equal(els.get('upgrades-subtitle').textContent,'¡MÁS POTENCIA!');
 assert.ok(els.get('upgrades-subtitle').classList.contains('is-feedback'));
 assert.equal(g.toastPlacement,'upgrades');
 g.clearTransientToast();
 assert.equal(els.get('upgrades-subtitle').textContent,'Sube habilidades antes del siguiente batazo');
 assert.equal(els.get('upgrades-subtitle').classList.contains('is-feedback'),false);
 assert.equal(g.toastTimer,0);
}));

test('strike y reinicio también eliminan el feedback flotante',()=>withFakeDOM(els=>{
 const g=Object.create(BaseballGame.prototype);
 g.save=initialSave();g.state='pitching';g.audio={};g.drawUI=()=>{};
 g.showDiscoveries=()=>{};
 g.toast('¡MÁS POTENCIA!');
 g.finishStrike();
 assert.equal(g.state,'rest');
 assert.equal(els.get('toast').classList.contains('show'),false);
 assert.equal(els.get('result').hidden,false);
 g.toast('🏅 PRIMER LOGRO');
 assert.equal(els.get('upgrades-subtitle').textContent,'🏅 PRIMER LOGRO');
 g.audio={prepareStrike(){}};g.impactFX={clear(){}};
 // El menú tiene que seguir limpio al cambiar de pantalla.
 g.camera=[];g.target=[];
 g.showMenu();
 assert.equal(g.state,'menu');
 assert.equal(els.get('toast').classList.contains('show'),false);
 assert.equal(els.get('upgrades-subtitle').classList.contains('is-feedback'),false);
}));

test('el resultado nunca comparte capa visible con toast, en Safari o WebKit',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(css,/#app\.resting #toast\s*\{display:none!important\}/);
 assert.match(html,/id="upgrades-subtitle" aria-live="polite"/);
 assert.match(js,/finishShot\(\)\{if\(this\.state!=='flight'\)return;this\.clearTransientToast\(\)/);
 assert.match(js,/finishStrike\(\)[\s\S]*?this\.clearTransientToast\(\)/);
 assert.match(js,/if\(this\.state==='rest'\)\{[\s\S]*?this\.toastPlacement='upgrades'/);
});
