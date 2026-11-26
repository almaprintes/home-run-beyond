import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAUNCH_VIEW_SECONDS,flightTimeScale} from '../src/game.js';
import {selectBatterPose} from '../src/sprites.js';
test('launch shot holds the final batting pose until the camera cuts',()=>{
 assert.equal(LAUNCH_VIEW_SECONDS,.65);
 assert.equal(selectBatterPose({state:'flight',launchView:true,swingElapsed:.06}),'contact');
 for(const t of [.08,.2,.48,.65,.75])assert.equal(selectBatterPose({state:'flight',launchView:true,swingElapsed:t}),'follow');
 assert.equal(selectBatterPose({state:'flight',launchView:false,swingElapsed:.75}),null);
 assert.equal(selectBatterPose({state:'orbit',launchView:true,swingElapsed:.75}),null);
});
test('departure is presented at real simulation speed and existing acceleration resumes after cut',()=>{
 for(const speed of [0,58,290,1500])assert.equal(flightTimeScale(speed,true),1);
 assert.equal(flightTimeScale(290,false),5);assert.equal(flightTimeScale(1500,false),22);
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(game,/const mult=flightTimeScale\(speed,departure\)/);
 assert.match(game,/desiredCam=this.launchCamera.camera;desiredTarget=this.launchCamera.target;zoom=62/);
 assert.match(game,/const smooth=departure\|\|cutToFlight/);
 assert.match(game,/if\(cutToFlight\)this.launchCamera=null/);
 assert.match(game,/this.launchView=this.state==='flight'&&!!this.launchCamera&&this.liveSeconds<LAUNCH_VIEW_SECONDS/);
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(world,/game.state==='flight'&&game.launchView\)drawActors\(/);
 const sprites=readFileSync(new URL('../src/sprites.js',import.meta.url),'utf8');
 assert.match(sprites,/departureSize=.*Math.max\(2,Math.min\(36,radiusPx\*2\)\)/);
});

test('no frontal substitute or low camera remains; rear cut and immediate orbit retained',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.doesNotMatch(game,/launchFront|finishCloseupPose|groundTrackingPose|groundCameraBlend/);
 assert.equal(LAUNCH_VIEW_SECONDS,.65);
});
