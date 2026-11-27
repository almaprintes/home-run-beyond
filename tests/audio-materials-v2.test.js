import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio,synthImpulse,soundProfile,contactProfile} from '../src/audio.js';
import {readFileSync} from 'node:fs';
import {buildingAt,buildingBoxes,drawWorld} from '../src/world.js';

test('samples de impactos poseen ataques, decaimiento y perfiles acústicos diferentes',()=>{
 const names=['swing','concrete','brick','metal','roof','rubber','grass','dirt','asphalt','water','puddle','swamp'];
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
  game.init();game.recordedBuffers.set('bat',{name:'CGEffex'});
  game.swing();game.hit('perfect');
  game.impact('concrete',90);game.ctx.currentTime+=.15;game.impact('water',55);
  game.ctx.currentTime+=.15;game.impact('grass',20);
  assert.equal(played.length,4,'solo impacto real y tres superficies; swing silencioso');
  assert.ok(!game.buffers.has('swing')&&!game.buffers.has('bat')&&game.buffers.has('water')&&game.buffers.has('grass'));
  assert.ok(allocated.every(n=>n>1000));
  const count=allocated.length;
  game.ctx.currentTime+=.15;game.hit('good');
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
 // Check actual renderer output for every roof volume, including the new stepped buildings.
 let material;const calls=[];
 const r={begin(){},setLayer(){},setMaterial(m){material=m},box(...a){calls.push({material,a})},field(){},ball(){},pole(){},cone(){},add(){}};
 for(const z of [330,630,930,1230,1530])drawWorld(r,[0,20,z],{state:'ready',clock:0});
 let count=0;const seen=new Set();
 for(let j=0;j<=24;j++)for(let i=-4;i<=4;i++){
  const b=buildingAt(i,j);if(!b)continue;
  for(const p of buildingBoxes(b).filter(p=>p.kind==='roof')){
   const [a,c,d]=p.min,[e,g,h]=p.max,expected=p.material==='rubber'?'rubber':'roof';
   assert.ok(calls.some(q=>q.material===expected&&Math.abs(q.a[0]-(a+e)/2)<1e-6&&Math.abs(q.a[1]-(c+g)/2)<1e-6&&Math.abs(q.a[2]-(d+h)/2)<1e-6&&Math.abs(q.a[3]-(e-a))<1e-6&&Math.abs(q.a[4]-(g-c))<1e-6&&Math.abs(q.a[5]-(h-d))<1e-6),b.i+':'+b.j+' '+expected);
   count++;seen.add(expected);
  }
 }
 assert.ok(count>92);assert.equal(seen.size,2);
 assert.match(world,/'paving'/);
});


test('bate procedural eliminado: no se sintetiza ni se almacena',()=>{
 assert.equal(contactProfile('bat'),null);
 assert.throws(()=>synthImpulse('bat',22050),/grabación CGEffex/);
});
test('v0.48: los perfiles de botes aprobados siguen idénticos',()=>{
 assert.deepEqual(contactProfile('grass'),{
  length:.105,click:.011,noise:.046,cut:480,body:[165,280,535],
  decay:.047,snap:.08,ring:.33,weight:.52
 });
 assert.deepEqual(contactProfile('asphalt'),{
  length:.115,click:.0047,noise:.033,cut:1650,body:[215,410,770],
  decay:.040,snap:.30,ring:.37,weight:.30
 });
 assert.deepEqual(contactProfile('dirt'),{
  length:.109,click:.009,noise:.048,cut:790,body:[175,310,610],
  decay:.047,snap:.14,ring:.34,weight:.46
 });
});
test('v0.47: césped es suave y asfalto es más agudo y seco',()=>{
 const grass=contactProfile('grass'),road=contactProfile('asphalt');
 assert.ok(grass.cut<road.cut/2,'el césped debe amortiguar los agudos');
 assert.ok(grass.click>road.click,'el césped tiene ataque más blando');
 for(const key of ['grass','dirt','asphalt','concrete','brick','roof','rubber']){
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
  audio.init();audio.recordedBuffers.set('bat',{name:'CGEffex'});
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
