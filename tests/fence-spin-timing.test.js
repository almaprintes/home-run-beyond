import test from 'node:test';
import assert from 'node:assert/strict';
import {stadiumFenceParts,traceStadiumFenceCollision} from '../src/world.js';
import {BaseballGame} from '../src/game.js';
import {pitchTimingGuide,pitchTimingDeltaMs,calculateShot,batSpeedMs} from '../src/logic.js';
import {initBallSpin,advanceVisualSpin,rotateQuaternion} from '../src/ball-spin.js';
test('valla: 39 postes y 38 travesaños metálicos, sin paredes invisibles altas',()=>{
 const parts=stadiumFenceParts();assert.equal(parts.length,77);
 for(const part of parts){
  const n={x:Math.sin(part.yaw),z:Math.cos(part.yaw)};
  const point=k=>({x:part.x+k*n.x,y:part.y,z:part.z+k*n.z});
  const hit=traceStadiumFenceCollision(point(-6),point(6));assert.ok(hit,part.kind);
  assert.equal(hit.material,'metal');
 }
 assert.equal(traceStadiumFenceCollision({x:0,y:20,z:100},{x:0,y:20,z:145}),null);
});
test('choque con valla invierte velocidad y usa el mismo audio metálico',()=>{
 const part=stadiumFenceParts().find(p=>p.kind==='stadium-fence-rail'&&p.id===19);
 const n={x:Math.sin(part.yaw),z:Math.cos(part.yaw)};
 const game=Object.create(BaseballGame.prototype);
 game.state='flight';game.simElapsed=0;game.save={reducedEffects:true};
 game.ball={x:part.x-6*n.x,y:2.2,z:part.z-6*n.z,vx:100*n.x,vy:0,vz:100*n.z,bounces:0,maxZ:0,encounters:{}};
 const sounds=[];game.audio={impact:m=>sounds.push(m)};game.finishShot=()=>{};
 game.simulateStep(.12);
 assert.ok(game.ball.lastCollision.includes('VALLA'));assert.ok(sounds.includes('metal'));
 assert.ok(game.ball.vx*n.x+game.ball.vz*n.z<0);
});
test('la señal verde coincide exactamente con el golpe perfecto, no cambia la dificultad',()=>{
 for(const duration of [1.2,1.52,2]){
  const center=.91*duration-batSpeedMs()/1000;
  for(const ms of [-150,-100,-49,-47,0,47,49,100]){
   const elapsed=center+ms/1000,guide=pitchTimingGuide(elapsed,duration);
   assert.equal(guide.phase==='perfect',calculateShot({power:1,swing:1},pitchTimingDeltaMs(elapsed,duration)).quality==='perfect');
   assert.equal(guide.phase==='perfect',Math.abs(ms)<48);
  }
 }
});
test('backspin visible desplaza la parte superior hacia atrás en vuelo',()=>{
 const b={vx:0,vy:10,vz:50};initBallSpin(b);advanceVisualSpin(b,.016);
 assert.ok(rotateQuaternion(b.spin.visualOrientation,[0,1,0])[2]<0);
});
