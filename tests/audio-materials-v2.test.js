import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio,synthImpulse,soundProfile} from '../src/audio.js';
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
 assert.match(world,/r\.field\(0,h-\.18,mid,2500,202,g\)/);
 assert.doesNotMatch(world,/r\.field\(0,h-\.22,mid,300,199/);
 assert.match(world,/r\.field\(0,\.15,z,285,11/);
 assert.match(world,/setMaterial\?\.\('metal'\)/);
 assert.match(world,/setMaterial\?\.\(rand\(idx\*17,row\*13\)<\.60\?'plaster':'brick'\)/);
 assert.match(world,/setMaterial\?\.\(b\.roofMaterial==='rubber'\?'rubber':'roof'\)/);
 assert.match(world,/'paving'/);
});
