import test from 'node:test';
import assert from 'node:assert/strict';
import {BaseballGame} from '../src/game.js';
import {GameAudio} from '../src/audio.js';
import {initialSave} from '../src/logic.js';
import {selectBatterPose} from '../src/sprites.js';
import {pitcherBallPosition} from '../src/world.js';
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
 assert.ok(pitcherBallPosition(1.2).z< -4.7,'bola detrás de home');
 assert.equal(pitcherBallPosition(1.26),null,'el lanzamiento acaba fuera del home');
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


test('archivo de voz Strike incluido, legible y MP3 local',()=>{
 const clip=readFileSync(new URL('../assets/strike.mp3',import.meta.url));
 assert.equal(clip.toString('ascii',0,3),'ID3');
 assert.ok(clip.length>1200,'el clip de voz no puede estar vacío');
 const audio=readFileSync(new URL('../src/audio.js',import.meta.url),'utf8');
 assert.doesNotMatch(audio,/speechSynthesis|SpeechSynthesisUtterance/);
 assert.ok(audio.includes('assets/strike.mp3?v=0.54.0'));
});

test('preparar voz carga y decodifica una vez, y Strike reproduce el audio con WebAudio',async()=>{
 const originalFetch=globalThis.fetch;
 const fetched=[],played=[],decoded=[];
 globalThis.fetch=async url=>{
  fetched.push(url);
  return {ok:true,arrayBuffer:async()=>new ArrayBuffer(400)};
 };
 try{
  const audio=new GameAudio();
  audio.ctx={
   state:'running',destination:{},
   decodeAudioData:async data=>{decoded.push(data.byteLength);return {duration:.55}},
   createBufferSource:()=>({connect(){return this},start(){played.push('strike')}}),
   createGain:()=>({gain:{value:0},connect(){return this}})
  };
  assert.equal(await audio.prepareStrike(),true);
  assert.equal(await audio.prepareStrike(),true);
  assert.equal(fetched.length,1);
  assert.ok(fetched[0].includes('strike.mp3'));
  assert.equal(decoded.length,1);
  audio.strike();
  assert.deepEqual(played,['strike']);
  audio.enabled=false;audio.strike();
  assert.deepEqual(played,['strike'],'el silencio del jugador se respeta');
 }finally{
  if(originalFetch===undefined)delete globalThis.fetch;else globalThis.fetch=originalFetch;
 }
});

test('si la voz se carga tarde, el strike pendiente suena tras la decodificación',async()=>{
 const oldFetch=globalThis.fetch;
 let finishFetch;
 globalThis.fetch=()=>new Promise(resolve=>{finishFetch=resolve});
 try{
  const played=[];
  const audio=new GameAudio();
  audio.ctx={
   state:'running',destination:{},
   decodeAudioData:async()=>({duration:.55}),
   createBufferSource:()=>({connect(){return this},start(){played.push(1)}}),
   createGain:()=>({gain:{value:0},connect(){return this}})
  };
  audio.strike();
  assert.equal(audio.pendingStrike,true);
  assert.equal(played.length,0);
  finishFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(20)});
  await audio.strikeLoad;
  assert.deepEqual(played,[1],'debe decir Strike incluso con carga tardía');
  assert.equal(audio.pendingStrike,false);
 }finally{
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
 }
});
