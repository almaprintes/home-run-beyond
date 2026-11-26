import test from 'node:test';
import assert from 'node:assert/strict';
import {cinematicIntensity,drawCinematicAccents} from '../src/impact-fx.js';
import {GameAudio} from '../src/audio.js';
test('anime accents scale with quality and speed, end automatically, respect reduced effects',()=>{
 const p=cinematicIntensity('perfect',200,.03,true);
 assert.ok(p.burst>cinematicIntensity('excellent',200,.03,true).burst);
 assert.equal(p.wind,0);
 assert.equal(cinematicIntensity('good',200,.03,true).burst,0);
 assert.equal(cinematicIntensity('perfect',200,.25,true).burst,0);
 assert.ok(cinematicIntensity('good',180,1,false).wind>cinematicIntensity('good',90,1,false).wind);
 assert.equal(cinematicIntensity('perfect',200,5,false).wind,0);
 assert.deepEqual(cinematicIntensity('perfect',200,.1,true,true),{burst:0,wind:0});
 let strokes=0,fills=0;const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},arc(){},fill(){fills++},stroke(){strokes++}};
 const game={state:'flight',ball:{vx:0,vy:20,vz:200},pendingShot:{quality:'perfect'},liveSeconds:.04,launchView:true,save:{}};
 drawCinematicAccents(ctx,game,[-6.7,7.5,-20.5],[-.8,3.5,12],390,844,62);
 assert.equal(fills,13);assert.equal(strokes,0);
 game.launchView=false;game.liveSeconds=1;
 drawCinematicAccents(ctx,game,[-6.7,7.5,-20.5],[-.8,3.5,12],390,844,62);
 assert.equal(strokes,16);
 game.save.reducedEffects=true;drawCinematicAccents(ctx,game,[-6.7,7.5,-20.5],[-.8,3.5,12],390,844,62);
 assert.equal(strokes,16);
});
test('wind reuses one source and stops when disabled or flight finishes',()=>{
 const a=new GameAudio(),calls={start:0,stop:0};
 const param=()=>({value:0,setTargetAtTime(){}});
 a.ctx={state:'running',sampleRate:100,currentTime:1,destination:{},
 createBuffer(){return {getChannelData(){return new Float32Array(200)}}},
 createBufferSource(){return {connect(){},start(){calls.start++},stop(){calls.stop++}}},
 createBiquadFilter(){return {Q:param(),frequency:param(),connect(){}}},
 createGain(){return {gain:param(),connect(){}}}};
 a.flightWind(140);a.flightWind(190);assert.equal(calls.start,1);
 a.stopFlightWind();assert.equal(calls.stop,1);assert.equal(a.wind,null);
 a.enabled=false;a.flightWind(200);assert.equal(calls.start,1);
});
