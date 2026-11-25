import test from 'node:test';
import assert from 'node:assert/strict';
import {BaseballGame} from '../src/game.js';
import {forwardDistance} from '../src/logic.js';
import {readFileSync} from 'node:fs';

test('el contador vivo y la recompensa final no usan maxZ',()=>{
 const source=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(source,/this\.distance=forwardDistance\(this\.ball\)/);
 assert.match(source,/settleShot\(this\.save,forwardDistance\(b\),\{/);
 assert.doesNotMatch(source,/this\.distance=this\.ball\?\.maxZ/);
});

test('rebote fuerte hacia atrás reduce la distancia sin tocar el máximo de diagnóstico',()=>{
 const game=Object.create(BaseballGame.prototype);
 game.state='flight';
 game.ball={x:0,y:12,z:1880,vx:0,vy:0,vz:-70,maxZ:1950,bounces:1};
 game.simElapsed=0;game.audio={land(){}};
 game.finishShot=()=>{game.state='rest'};
 const before=forwardDistance(game.ball);
 game.simulateStep(.2);
 assert.ok(forwardDistance(game.ball)<before,'debe descontar metros si retrocede');
 assert.equal(game.ball.maxZ,1950);
 assert.ok(forwardDistance(game.ball)>=0);
});
