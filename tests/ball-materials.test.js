import test from 'node:test';
import assert from 'node:assert/strict';
import {ballSpriteDiameter,ballShadowOpacity,ballImpactOpacity} from '../src/ball-visuals.js';
import {buildingAt,surfaceBelowBall,groundAt} from '../src/world.js';
import {readFileSync} from 'node:fs';

test('la pelota nunca se convierte en una esfera gigante al volver hacia cámara',()=>{
 const sizes=[0,1,5,15,35,80,300,1200,100000].map(v=>ballSpriteDiameter(v,390));
 assert.ok(sizes.every(s=>s>=16&&s<=46));
 assert.ok(sizes.every((s,i)=>i===0||s>=sizes[i-1]));
 assert.ok(ballSpriteDiameter(10000,430)<=46);
 assert.ok(ballSpriteDiameter(200,320)<=46);
 assert.ok(ballSpriteDiameter(Infinity)<=46);
});

test('sombra se desvanece con la altura y destello de golpe es temporal',()=>{
 assert.ok(ballShadowOpacity(1)>ballShadowOpacity(20));
 assert.ok(ballShadowOpacity(20)>ballShadowOpacity(200));
 assert.ok(ballImpactOpacity(0)>ballImpactOpacity(.2));
 assert.equal(ballImpactOpacity(.4),0);
 assert.equal(ballImpactOpacity(-1),0);
});

test('la sombra usa el tejado cuando la pelota vuela encima de un edificio',()=>{
 let building=null;
 for(let j=0;j<=24&&!building;j++)for(let i=-5;i<=5&&!building;i++)building=buildingAt(i,j);
 assert.ok(building);
 const b=building,x=b.x+b.w*.33,z=b.z;
 const surface=surfaceBelowBall({x,y:b.h+12,z});
 assert.equal(surface.type,'roof');
 assert.ok(Math.abs(surface.y-(b.h+1.4))<.02);
 const floor=surfaceBelowBall({x,y:1.5,z});
 assert.ok(floor.y<=surface.y);
 const grass=surfaceBelowBall({x:999,y:60,z:60});
 assert.equal(grass.type,groundAt(999,60).type);
});

test('el sprite dibuja sombra, estela tenue y anillo de contacto sin alterar físicas',()=>{
 const code=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(code,/const size=ballSpriteDiameter\(radiusPx,width\)/);
 assert.match(code,/const surface=surfaceBelowBall\(b\)/);
 assert.doesNotMatch(code,/const impact=ballImpactOpacity\(b\.impactAge\)/);
 assert.doesNotMatch(code,/createLinearGradient/);
 assert.match(game,/b\.impactAge=0/);
 assert.doesNotMatch(code,/Math\.min\(118/);
});
