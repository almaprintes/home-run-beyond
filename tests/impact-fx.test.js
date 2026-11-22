import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ImpactEffects,EFFECT_MATERIALS,materialEffect,hitStopDuration,fxStrength} from '../src/impact-fx.js';
import {BaseballGame} from '../src/game.js';
import {buildingAt,groundAt} from '../src/world.js';

test('cada superficie recibe efectos y timbre propios',()=>{
 for(const type of ['solid','concrete','brick','rubber','roof','grass','dirt','road','water','puddle','swamp','bat']){
  assert.ok(materialEffect(type).count>=3,'sin material '+type);
 }
 assert.notEqual(materialEffect('solid').kind,materialEffect('water').kind);
 assert.notEqual(materialEffect('grass').color,materialEffect('road').color);
 assert.equal(materialEffect('desconocido'),EFFECT_MATERIALS.concrete);
 assert.ok(fxStrength(100)>fxStrength(10));
 assert.equal(fxStrength(-100),0);
});

test('hit-stop se aplica por calidad sin cambiar la física',()=>{
 assert.equal(hitStopDuration('perfect'),.060);
 assert.equal(hitStopDuration('excellent'),.038);
 assert.equal(hitStopDuration('good'),.018);
 assert.equal(hitStopDuration('miss'),0);
 const js=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(js,/this\.contactHold=hitStopDuration\(this\.pendingShot\.quality\)/);
 assert.match(js,/this\.visualSwingElapsed=this\.swingElapsed/);
 assert.match(js,/if\(this\.visualSwingElapsed>=\.12\)this\.launch\(\)/);
});

test('100 colisiones seguidas no exceden los límites y desaparecen al terminar',()=>{
 const fx=new ImpactEffects();
 for(let i=0;i<100;i++)fx.spawn({x:i,y:2,z:100,material:i%2?'concrete':'water',strength:90});
 assert.ok(fx.particles.length<=90);
 assert.ok(fx.rings.length<=8);
 assert.ok(fx.particles.every(p=>Number.isFinite(p.vx)&&Number.isFinite(p.vy)&&Number.isFinite(p.vz)));
 for(let i=0;i<90;i++)fx.update(1/60);
 assert.equal(fx.particles.length,0);
 assert.equal(fx.rings.length,0);
 fx.spawnBat({quality:'perfect'});assert.ok(fx.particles.length>0);
 fx.clear();assert.equal(fx.particles.length,0);
});

test('render FX es visible y situado en el espacio del balón',()=>{
 const fx=new ImpactEffects();
 fx.spawn({x:0,y:4,z:40,material:'road',strength:80,normal:{x:0,y:1,z:0}});
 let ellipses=0,arcs=0;
 const ctx={save(){},restore(){},beginPath(){},stroke(){},fill(){},
  ellipse(){ellipses++},arc(){arcs++}};
 fx.draw(ctx,[5,13,-20],[0,2,40],390,844,58);
 assert.ok(ellipses>=1,'falta anillo de impacto');
 assert.ok(arcs>=1,'faltan partículas');
});

test('golpe contra fachada produce sonido y partículas sin terminar la carrera',()=>{
 const building=buildingAt(0,1);assert.ok(building);
 const game=Object.create(BaseballGame.prototype);
 game.state='flight';game.simElapsed=0;game.shake=0;
 game.ball={x:building.x,y:5,z:building.z-building.d/2-5,
  vx:0,vy:0,vz:70,bounces:0,maxZ:0};
 game.impactFX=new ImpactEffects();
 const hits=[];game.audio={impact:(mat,v)=>hits.push({mat,v})};
 game.finishShot=()=>{game.state='rest'};
 game.simulateStep(.15);
 assert.equal(game.state,'flight');
 assert.equal(hits.length,1);
 assert.ok(hits[0].v>1);
 assert.ok(game.impactFX.particles.length>0);
 assert.ok(game.ball.vz<0);
});

test('charco genera salpicadura una vez y no se confunde con piedra',()=>{
 const ground=groundAt(-95,2520);assert.equal(ground.type,'puddle');
 const game=Object.create(BaseballGame.prototype);
 game.state='flight';game.simElapsed=0;game.shake=0;
 game.ball={x:-95,y:ground.y+1.47,z:2520,vx:0,vy:-8,vz:20,bounces:0,maxZ:0};
 game.impactFX=new ImpactEffects();
 const hits=[];game.audio={impact:(mat)=>hits.push(mat)};
 game.finishShot=()=>{game.state='rest'};
 game.simulateStep(1/60);
 assert.equal(hits[0],'puddle');
 assert.ok(game.impactFX.rings.length>0);
 assert.equal(game.impactFX.rings[0].material,'puddle');
});

test('sacudida visual no modifica las coordenadas persistentes de cámara',()=>{
 const source=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(source,/const cameraFrame=\[\.\.\.this\.camera\]/);
 assert.match(source,/this\.renderer\.render\(cameraFrame,this\.target,zoom\)/);
 assert.doesNotMatch(source,/this\.camera\[0\]\+=Math\.sin/);
 const sprites=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 assert.match(sprites,/game\.fxCamera\|\|game\.camera/);
 assert.match(sprites,/game\.impactFX\?\.draw\?\./);
});
