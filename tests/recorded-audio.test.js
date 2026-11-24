import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {GameAudio,synthImpulse,contactProfile} from '../src/audio.js';

test('CGEffex: el juego distribuye una grabación real, atribuida y reproducible sin red',()=>{
 const raw=readFileSync(new URL('../assets/audio/bat-cgeffex-source.wav',import.meta.url));
 assert.equal(raw.toString('ascii',0,4),'RIFF');
 assert.equal(raw.toString('ascii',8,12),'WAVE');
 assert.ok(raw.length>=4000);
 const mp3=readFileSync(new URL('../assets/audio/bat-cgeffex.wav',import.meta.url));
 assert.ok(mp3.length>=1000&&mp3.length<35000,'clip ligero para Safari/PWA');
 assert.equal(mp3.toString('ascii',0,4),'RIFF');
 assert.equal(mp3.toString('ascii',8,12),'WAVE');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const doc=readFileSync(new URL('../docs/AUDIO_CREDITS.md',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 assert.match(html,/id="audio-credits"/);
 assert.match(html,/CGEffex/);
 assert.match(html,/freesound\.org\/people\/CGEffex\/sounds\/93136/);
 assert.match(html,/creativecommons\.org\/licenses\/by\/4\.0/);
 assert.match(doc,/fragmento/i);
 assert.match(doc,/CC BY 4\.0/);
 assert.match(html,/JaenKleynhans/);
 assert.match(html,/BranRainey/);
 assert.match(sw,/OPTIONAL_AUDIO/);
 assert.match(sw,/Promise\.allSettled\(OPTIONAL_AUDIO/);
 assert.match(sw,/assets\/audio\/bat-cgeffex\.wav\?v=0\.51\.0/);
 assert.equal((workflow.match(/run: python tools\/build_impact_audio\.py/g)||[]).length,2);
});

test('un golpe usa la grabación real, no se mezclan el WAV y la síntesis',()=>{
 const played=[],volumes=[];
 const audio=new GameAudio();
 audio.ctx={
  destination:{},
  createBufferSource(){const source={buffer:null,playbackRate:{value:1},connect(){return source},start(){played.push(source.buffer)}};return source},
  createGain(){const gain={gain:{value:1},connect(){return gain}};volumes.push(gain.gain);return gain}
 };
 audio.recordedBuffers.set('bat',{name:'CGEffex'});
 audio.hit('perfect');audio.hit('good');
 assert.deepEqual(played.map(x=>x.name),['CGEffex','CGEffex']);
 assert.ok(volumes[0].value>volumes[1].value,'el perfecto es más fuerte');
 assert.equal(audio.buffers.size,0,'no se superpone el viejo bate sintético');
});

test('asfalto y fachadas tienen audio propio, con fallback distinto de hierba y metal',()=>{
 const samples=['grass','metal','asphalt','concrete','brick'].map(k=>synthImpulse(k,22050));
 const diff=(a,b)=>a.length!==b.length||a.some((v,i)=>Math.abs(v-(b[i]||0))>.002);
 assert.ok(diff(samples[2],samples[0]),'el asfalto no puede sonar como la hierba');
 assert.ok(diff(samples[3],samples[0]),'la fachada no puede sonar como la hierba');
 assert.ok(diff(samples[2],samples[4]),'asfalto y fachada requieren golpes distintos');
 const accepted={
  grass:{length:.105,click:.011,noise:.046,cut:480,body:[165,280,535],
   decay:.047,snap:.08,ring:.33,weight:.52},
  asphalt:{length:.115,click:.0047,noise:.033,cut:1650,body:[215,410,770],
   decay:.04,snap:.30,ring:.37,weight:.30}
 };
 assert.deepEqual(contactProfile('grass'),accepted.grass,'hierba aprobada no cambia');
 assert.deepEqual(contactProfile('asphalt'),accepted.asphalt,'se conserva metadata de pista');
});

test('superficies reales opcionales no desactivan los rebotes de hierba o metal',()=>{
 const played=[];
 const audio=new GameAudio();
 audio.ctx={currentTime:1,destination:{},
  createBufferSource(){const s={buffer:null,playbackRate:{value:1},connect(){return s},start(){played.push(s.buffer.name)}};return s},
  createGain(){const g={gain:{value:1},connect(){return g}};return g}
 };
 audio.recordedBuffers.set('asphalt',{name:'CC0 asphalt'});
 audio.recordedBuffers.set('facade',{name:'CC0 wall'});
 // For grass and metal we need no decoded or recorded effect.
 audio.impact('road',60);audio.ctx.currentTime+=.18;
 audio.impact('concrete',60);
 assert.deepEqual(played,['CC0 asphalt','CC0 wall']);
 assert.equal(audio.recordedBuffers.has('grass'),false);
 assert.equal(audio.recordedBuffers.has('metal'),false);
});

test('precarga sin bloquear el bateo y cae al sonido local si falla Freesound',async()=>{
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;
 globalThis.window={AudioContext:class{constructor(){this.sampleRate=22050;this.state='running';this.destination={};this.currentTime=0}decodeAudioData(){return Promise.resolve({duration:.4})}}};
 const visited=[];
 globalThis.fetch=async(url)=>{visited.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}};
 try{
  const a=new GameAudio();
  a.prepareGameEffects();
  await Promise.all([...a.recordedLoads.values()]);
  assert.deepEqual([...a.recordedBuffers.keys()].sort(),['asphalt','bat','facade']);
  assert.ok(visited.some(x=>x.includes('bat-cgeffex.mp3?v=0.51.0')));
  assert.ok(visited.some(x=>x.includes('asphalt-ball.mp3')));
  assert.ok(visited.some(x=>x.includes('wall-ball.mp3')));
 }finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
 }
});
