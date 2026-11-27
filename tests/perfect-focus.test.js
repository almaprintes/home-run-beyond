import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceFocusTime,focusWindow,focusCue,focusSlowEnabled,drawPerfectFocus,FOCUS_RATE} from '../src/perfect-focus.js';
import {pitchTimingDeltaMs,timingQuality,initialSave} from '../src/logic.js';
import {BaseballGame} from '../src/game.js';
test('slow motion crosses boundaries exactly, is independent of FPS and never freezes the pitch',()=>{
 for(const precision of [0,.15,.25]){
  const {start,end,half}=focusWindow(1.52,precision);
  const extra=2*half*(1/FOCUS_RATE-1);
  for(const dt of [1/30,1/60,1/120]){
   let t=-.6,wall=0;
   while(wall<3-1e-9){const step=Math.min(dt,3-wall);t=advanceFocusTime(t,step,1.52,precision,true);wall+=step;}
   assert.ok(Math.abs(t-(2.4-extra))<1e-8);
  }
  assert.ok(Math.abs(advanceFocusTime(start,2*half/FOCUS_RATE,1.52,precision)-end)<1e-9);
  assert.equal(advanceFocusTime(start,.05,1.52,precision,false),start+.05);
 }
});
test('the golden cue indicates actual perfect timing and is absent before release, after aiming or when disabled',()=>{
 const save=initialSave(),g={state:'pitching',pitchDuration:1.52,save},w=focusWindow(1.52,0);
 for(let i=0;i<200;i++){
  g.pitchElapsed=w.start-.05+i*.001;
  const c=focusCue(g),q=timingQuality(pitchTimingDeltaMs(g.pitchElapsed,1.52));
  assert.equal(!!c?.perfect,q==='perfect');
 }
 g.pitchElapsed=w.center;assert.equal(focusCue(g).perfect,true);
 assert.equal(focusCue({...g,state:'aiming'}),null);
 assert.equal(focusCue({...g,pitchElapsed:-.2}),null);
 assert.equal(focusCue({...g,save:{showHints:false}}),null);
 assert.equal(focusSlowEnabled({...g,save:{reducedEffects:true}}),false);
 const arcs=[],labels=[],ctx={save(){},restore(){},beginPath(){},arc(...a){arcs.push(a)},stroke(){},fillText(...a){labels.push(a)}};
 assert.equal(drawPerfectFocus(ctx,160,320,28,g),true);assert.equal(arcs.length,5);
 assert.equal(labels[0][0],'¡AHORA!');assert.ok(arcs.every(a=>a[0]===160&&a[1]===320&&a[2]>14));
});
test('input sampling uses the same slowed clock as the visible ball; whole screen remains the input surface',()=>{
 const g=Object.create(BaseballGame.prototype),nodes=new Map(),old=globalThis.document;
 globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,{hidden:true,style:{},classList:{add(){},remove(){}}});return nodes.get(id)}};
 try{
  const w=focusWindow(1.52,0);
  Object.assign(g,{state:'pitching',pitchDuration:1.52,pitchElapsed:w.start,last:1000,save:initialSave()});
  g.freezeSwing(false,1040);
  assert.equal(g.state,'aiming');assert.equal(g.pendingShot.quality,'perfect');
  assert.ok(Math.abs(g.pitchElapsed-(w.start+.04*FOCUS_RATE))<1e-9);
  assert.ok(Math.abs(g.pendingShot.deltaMs-pitchTimingDeltaMs(g.pitchElapsed,1.52))<1e-9);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old}
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/\.pitch-surface\{[^}]*inset:0;[^}]*pointer-events:auto/);
 assert.match(css,/\.pitch-touch-label\[data-timing\]\{display:none;\}/);
 assert.doesNotMatch(css,/--pitch-progress/);
});
