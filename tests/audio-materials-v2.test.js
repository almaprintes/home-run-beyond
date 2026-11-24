import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio,synthImpulse,soundProfile,contactProfile} from '../src/audio.js';
import {readFileSync} from 'node:fs';

test('samples de impactos poseen ataques, decaimiento y perfiles acústicos diferentes',()=>{
 const names=['bat','swing','concrete','brick','metal','roof','rubber','grass','dirt','asphalt','water','puddle','swamp'];
 const signatures=[];
 for(const name of names){
  const sound=synthImpulse(name,22050);
  assert.ok(sound.length>2000&&sound.length<16000,name);
  const peak=sound.reduce((m,x)=>Math.max(m,Math.abs(x)),0);
  assert.ok(peak>.03&&peak<=.90,'envolvente incorrecta: '+name);
  assert.ok(sound.every(Number.isFinite),'audio inválido: '+name);
  signatures.push(Math.round(sound.slice(0,700).reduce((m,v)=>m+Math.abs(v),0)*10));
 }
 assert.ok(new Set(signatures).size>=8,'los materiales no se diferencian acústicamente');
 assert.equal(soundProfile('unknown'),soundProfile('concrete'));
});

test('audio de bate y materiales usa buffers de ruido filtrado, no pitidos de oscilador',()=>{
 const previousWindow=globalThis.window;
 const played=[],allocated=[];
 class FakeContext{
  constructor(){this.sampleRate=22050;this.currentTime=1;this.state='running';this.destination={}}
  createBuffer(_channels,len){const data=new Float32Array(len);allocated.push(len);return {getChannelData:()=>data}}
  createBufferSource(){return {playbackRate:{value:1},connect(){},start(){played.push(true)}}}
  createGain(){return {gain:{value:1},connect(){}}}
 }
 globalThis.window={AudioContext:FakeContext};
 try{
  const game=new GameAudio();
  game.swing();game.hit('perfect');
  game.impact('concrete',90);game.ctx.currentTime+=.1;game.impact('water',55);
  game.ctx.currentTime+=.1;game.impact('grass',20);
  assert.ok(played.length>=5);
  assert.ok(game.buffers.has('swing')&&game.buffers.has('bat')&&game.buffers.has('water')&&game.buffers.has('grass'));
  assert.ok(allocated.every(n=>n>1000));
  const count=allocated.length;
  game.ctx.currentTime+=.1;game.hit('good');
  assert.equal(allocated.length,count,'se regeneró innecesariamente una muestra');
 }finally{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow}
});

test('mundo sin z-fighting de césped superpuesto y con las nuevas superficies',()=>{
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(world,/r\.field\(WORLD_CENTER_X,worldHeight\(WORLD_CENTER_X,zz\)-\.18,zz,WORLD_WIDTH,50\.3,/);
 assert.doesNotMatch(world,/r\.field\(0,h-\.22,mid,300,199/);
 assert.match(world,/r\.field\(0,\.15,z,285,11/);
 assert.match(world,/setMaterial\?\.\('metal'\)/);
 assert.match(world,/setMaterial\?\.\(rand\(idx\*17,row\*13\)<\.60\?'plaster':'brick'\)/);
 assert.match(world,/setMaterial\?\.\(b\.roofMaterial==='rubber'\?'rubber':'roof'\)/);
 assert.match(world,/'paving'/);
});


test('v0.47: bate con ataque corto y silencio final, no una cola de estática',()=>{
 const sample=synthImpulse('bat',22050),rate=22050;
 assert.ok(contactProfile('bat').length<=.14);
 assert.ok(sample.length<rate*.14);
 const energy=(a,b)=>sample.slice(Math.floor(a*rate),Math.floor(b*rate))
  .reduce((sum,x)=>sum+x*x,0);
 assert.ok(energy(.0,.022)>energy(.085,.13)*8,'el bate debe ser un crack seco sin cola chirriante');
 assert.ok(Math.abs(sample[sample.length-1])<.005,'final suavizado sin clic');
 const attack=energy(0,.015);
 assert.ok(attack>.02,'el golpe no puede ser inaudible');
});
test('v0.47: césped es suave y asfalto es más agudo y seco',()=>{
 const grass=contactProfile('grass'),road=contactProfile('asphalt');
 assert.ok(grass.cut<road.cut/2,'el césped debe amortiguar los agudos');
 assert.ok(grass.click>road.click,'el césped tiene ataque más blando');
 for(const key of ['bat','grass','dirt','asphalt','concrete','brick','roof','rubber']){
  const x=synthImpulse(key,48000),max=Math.max(...x);
  assert.ok(x.length>=4000&&x.length<=7700,key);
  assert.ok(max<=.76&&max>.15,key);
  assert.ok(x.every(Number.isFinite),key);
  assert.ok(Math.abs(x[x.length-1])<.005,key);
 }
});
test('v0.47: el rebote secundario no se convierte en traqueteo',()=>{
 const was=globalThis.window,gains=[],played=[],sizes=[];
 class FakeCtx{
  constructor(){this.sampleRate=22050;this.currentTime=1;this.state='running';this.destination={}}
  createBuffer(_channels,n){const d=new Float32Array(n);sizes.push(n);return {getChannelData:()=>d}}
  createBufferSource(){
   let gainNode;
   return {playbackRate:{value:1},connect(g){gainNode=g;return g},start(){played.push(gains[gains.length-1])}}
  }
  createGain(){const g={gain:{value:1},connect(){}};gains.push(g.gain);return g}
 }
 globalThis.window={AudioContext:FakeCtx};
 try{
  const audio=new GameAudio();
  audio.hit('perfect');
  const hitVolume=gains.at(-1).value;
  audio.impact('road',55);
  const firstVolume=gains.at(-1).value;
  assert.ok(firstVolume<hitVolume*.70,'el suelo no debe tapar al bate');
  audio.ctx.currentTime+=.04;
  audio.impact('road',48);
  assert.equal(played.length,2,'rebotes inmediatos no deben sonar duplicados');
  audio.ctx.currentTime+=.15;
  audio.impact('grass',9);
  assert.equal(played.length,3);
  assert.ok(gains.at(-1).value<firstVolume,'un rebote leve en hierba es más suave');
  audio.ctx.currentTime+=.15;audio.impact('grass',1.8);
  assert.equal(played.length,3,'rodadura no genera ruido de impactos');
  assert.ok(audio.buffers.has('asphalt')&&audio.buffers.has('grass'));
 }finally{if(was===undefined)delete globalThis.window;else globalThis.window=was}
});
