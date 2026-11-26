import test from 'node:test';
import assert from 'node:assert/strict';
import {groundAt,terrainParcels,buildingAt} from '../src/world.js';
import {BaseballGame,groundRollRetention} from '../src/game.js';
import {WORLD_CENTER_X} from '../src/biomes.js';
import {GameAudio} from '../src/audio.js';
import {materialEffect} from '../src/impact-fx.js';

const building=buildingAt(0,1),sampleX=building.x+building.w/2+5,sampleZ=building.z;
test('urban paving matches drawn parcels, with road, water and dirt overlays retaining priority',()=>{
 const x=sampleX;
 assert.ok(terrainParcels(1).some(p=>p.material==='paving'&&Math.abs(x-p.x)<=p.w/2&&Math.abs(sampleZ-p.z)<=p.d/2));
 assert.equal(groundAt(x,sampleZ).type,'paving');
 assert.equal(groundAt(x,265).type,'road');
 assert.equal(groundAt(0,287).type,'grass');
 assert.equal(groundAt(0,1680).type,'water');
 assert.equal(groundAt(0,50).type,'grass');
});
test('cobblestone bounce and rolling retain more speed than grass but less than road',()=>{
 const g=Object.create(BaseballGame.prototype);
 const x=sampleX,z=sampleZ,dt=1/60;
 const sounds=[];
 g.state='flight';g.simElapsed=0;
 g.audio={impact:(mat)=>sounds.push(mat)};
 g.finishShot=()=>{g.state='rest'};
 g.ball={x,y:groundAt(x,z).y+1.48,z,vx:2,vy:-12,vz:8,bounces:0,maxZ:z};
 g.simulateStep(dt);
 assert.equal(g.ball.impactMaterial,'paving');
 assert.equal(g.ball.lastCollision,'ADOQUINES');
 assert.ok(Math.abs(g.ball.vy-(12+9.81*dt)*.74)<1e-8);
 assert.ok(Math.abs(g.ball.vz-8*.89)<1e-8);
 assert.ok(Math.abs(g.ball.vx-2*.89)<1e-8);
 assert.deepEqual(sounds,['paving']);
 assert.ok(!g.ball.encounters?.road,'paving is not a road discovery');
 assert.ok(groundRollRetention('grass',1)<groundRollRetention('paving',1));
 assert.ok(groundRollRetention('paving',1)<groundRollRetention('road',1));
 assert.ok(Math.abs(groundRollRetention('paving',1)-groundRollRetention('paving',.5)**2)<1e-12);
});
test('paving uses the approved hard-surface sound and stone effects',()=>{
 const audio=new GameAudio();audio.ctx={currentTime:1};audio.init=()=>{};
 const played=[];audio.playRecorded=(kind)=>{played.push(kind);return true};
 audio.impact('paving',30);
 assert.deepEqual(played,['asphalt']);
 assert.notEqual(materialEffect('paving').kind,materialEffect('grass').kind);
});
