import test from 'node:test';import assert from 'node:assert/strict';
import {rand,groundAt,roadAt,riverAt,areaAt,collideBuilding,drawWorld} from '../src/world.js';
import {lookAt,perspective,mul4} from '../src/engine.js';
test('procedural determinista entre sesiones',()=>{assert.equal(rand(331,76),rand(331,76));assert.notEqual(rand(331,76),rand(331,77))});
test('zonas de agua y suelo',()=>{assert.equal(groundAt(0,1680).type,'water');assert.ok(riverAt(1680));assert.equal(groundAt(0,50).type,'grass');assert.equal(areaAt(0),'ESTADIO');assert.equal(areaAt(900),'CIUDAD');});
test('matrices de cámara finitas',()=>{const m=mul4(perspective(1.1,390/844,.3,2000),lookAt([12,18,-42],[0,3,25]));assert.equal(m.length,16);assert.ok(m.every(Number.isFinite))});
test('mundo genera geometría para estadio, ciudad y vuelo lejano',()=>{for(const z of [0,700,2000,31000]){let count=0;const r={begin(){},add(){count++},box(){count++},field(){count++},ball(){count++},pole(){count++},cone(){count++},fogDistance:500};drawWorld(r,[0,20,z],{state:'ready',pitch:0,swing:0,batColor:'#ffbb44'});assert.ok(count>10,`sin escenario en ${z}m`);assert.ok(count<22000,`escenario excesivo en ${z}m: ${count}`)}});
test('colisiones de edificios solo dentro de sus límites',()=>{assert.equal(collideBuilding({x:0,y:500,z:400}),null);assert.equal(collideBuilding({x:9999,y:0,z:400}),null)});