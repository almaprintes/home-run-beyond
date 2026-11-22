import test from 'node:test';
import assert from 'node:assert/strict';
import {BaseballGame} from '../src/game.js';
import {GameAudio} from '../src/audio.js';
import {initialSave} from '../src/logic.js';
import {selectBatterPose} from '../src/sprites.js';
import {readFileSync} from 'node:fs';

function withDOM(run){
 const previous=globalThis.document,els=new Map();
 globalThis.document={getElementById(id){
  if(!els.has(id))els.set(id,{hidden:false,textContent:'',style:{},classList:{add(){},remove(){}}});
  return els.get(id);
 }};
 try{return run(els)}finally{
  if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
 }
}
function fixture(){
 const g=Object.create(BaseballGame.prototype);
 g.state='pitching';g.pitchDuration=1.52;g.pitchElapsed=0;g.pitch=0;g.activePointer=null;
 g.aimAngle=0;g.aimElapsed=0;g.swingElapsed=0;g.strikeCalled=false;g.distance=0;
 g.save=initialSave();
 let spoken=0,hit=0;
 g.audio={strike(){spoken++},swing(){},hit(){hit++}};
 g.drawUI=()=>{};
 g.launch=()=>{hit++;g.state='flight'};
 return {g,spoken:()=>spoken,hit:()=>hit};
}

test('sin tocar, bola pasa por detrás y canta STRIKE una sola vez sin dar monedas',()=>withDOM(els=>{
 const {g,spoken,hit}=fixture();
 const before=JSON.stringify(g.save);
 for(let n=0;n<100&&g.state==='pitching';n++)g.advancePitch(.02);
 assert.equal(g.state,'rest');
 assert.equal(spoken(),1);assert.equal(hit(),0);
 assert.equal(els.get('result-quality').textContent,'¡STRIKE!');
 assert.equal(els.get('result-coins').textContent,'+0');
 assert.equal(els.get('result-meters').textContent,'0');
 assert.equal(els.get('again').hidden,false);
 assert.equal(selectBatterPose({state:'rest',ball:null}),'ready','el jugador no desaparece al fallar');
 assert.equal(JSON.stringify(g.save),before,'una bola no bateada no altera el progreso');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(world,/throwProgress<1\.26/);
 assert.ok((20.5-25.4*1.2)<-4.7,'bola detrás de home');
}));

test('swing muy temprano falla de verdad y nunca lanza una bola débil',()=>withDOM(els=>{
 const {g,spoken,hit}=fixture();
 g.pitchElapsed=.1;
 g.freezeSwing(false);
 assert.equal(g.pendingShot.quality,'miss');
 g.swingBat(false);assert.equal(g.state,'swinging');
 g.resolveSwing();
 assert.equal(g.state,'whiff');assert.equal(hit(),0);
 assert.equal(selectBatterPose({state:'whiff',swingElapsed:.2}),'follow');
 for(let n=0;n<100&&g.state==='whiff';n++)g.advancePitch(.02);
 assert.equal(g.state,'rest');
 assert.equal(hit(),0);assert.equal(spoken(),1);
 assert.equal(els.get('result-coins').textContent,'+0');
 assert.equal(g.save.shots,0);
}));

test('contacto bien sincronizado conserva el batazo',()=>withDOM(()=>{
 const {g,hit}=fixture();
 g.pitchElapsed=.91*g.pitchDuration-.165;
 g.freezeSwing(false);
 assert.equal(g.pendingShot.quality,'perfect');
 g.swingBat(false);g.resolveSwing();
 assert.equal(g.state,'flight');assert.equal(hit(),1);
}));

test('voz de Strike en inglés, respetando modo silencio',()=>{
 const prevSynth=globalThis.speechSynthesis,prevSpeech=globalThis.SpeechSynthesisUtterance;
 const heard=[],synth={getVoices:()=>[{lang:'en-US'}],cancel(){},speak:call=>heard.push(call)};
 globalThis.speechSynthesis=synth;
 globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 try{
  const audio=new GameAudio();audio.strike();
  assert.equal(heard.length,1);assert.equal(heard[0].text,'Strike!');
  assert.equal(heard[0].lang,'en-US');
  audio.enabled=false;audio.strike();assert.equal(heard.length,1);
 }finally{
  if(prevSynth===undefined)delete globalThis.speechSynthesis;else globalThis.speechSynthesis=prevSynth;
  if(prevSpeech===undefined)delete globalThis.SpeechSynthesisUtterance;else globalThis.SpeechSynthesisUtterance=prevSpeech;
 }
});
