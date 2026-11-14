// Exercise the real async generation/seek loop without loading a model.
// These tests validate control flow, not detector accuracy or decoder behavior.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('src/index.template.html','utf8');
const ops=source.match(/\/\/ OPERATIONS:BEGIN([\s\S]*?)\/\/ OPERATIONS:END/)[1];
const loop=source.slice(source.indexOf('      function cancelSequential(){'),source.indexOf('      function analyzeFrame('));
function fixture({hold=false,duration=255,cursor=-1}={}){
 const state={analysisGeneration:0,sequentialRunning:false,phase:'counting',sampleCursorMs:cursor,videoDurationMs:duration,frameHandle:0};
 let time=0,pending=null;const listeners=new Map(),frames=[];
 const fire=()=>{pending=null;video.seeking=false;for(const callback of [...(listeners.get('seeked')||[])])callback();};
 const video={readyState:2,seeking:false,pause(){},addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);},
  get currentTime(){return time;},set currentTime(next){time=next;video.seeking=true;pending=fire;if(!hold)queueMicrotask(fire);}};
 const context={state,video,frames,DOMException,setTimeout,clearTimeout,performance,document:{visibilityState:'visible'},
  cancelAnimationFrame(){},analyzeFrame(now,ms){frames.push(ms);},draw(){},renderVideoTime(){},$:()=>({textContent:''}),tr:()=>'{percent}',
  finishCount(){state.phase='done';},interrupt(message){state.phase='interrupted';},console};
 const api=vm.runInNewContext(`(()=>{${ops}\n${loop};return {runSequential,cancelSequential};})()`,{...context,TextEncoder,Uint8Array,DataView});
 return {api,state,frames,release(){pending?.();},listenerCount(){return [...listeners.values()].reduce((n,s)=>n+s.size,0);}};
}
const first=fixture();await first.api.runSequential();
assert.deepEqual(first.frames,[0,100,200,254]);assert.equal(first.state.phase,'done');assert.equal(first.state.sampleCursorMs,254);assert.equal(first.listenerCount(),0);
const resumed=fixture({cursor:100});await resumed.api.runSequential();assert.deepEqual(resumed.frames,[200,254]);
const paused=fixture({hold:true});const running=paused.api.runSequential();
await new Promise(r=>setTimeout(r,0)); // sample zero analyzed; sample 100 seek is held
assert.deepEqual(paused.frames,[0]);paused.state.phase='paused';paused.api.cancelSequential();paused.release();await running;
assert.deepEqual(paused.frames,[0]);assert.equal(paused.state.sampleCursorMs,0);assert.equal(paused.state.phase,'paused');assert.equal(paused.listenerCount(),0);
const replaced=fixture({hold:true,cursor:0});const obsolete=replaced.api.runSequential();
replaced.api.cancelSequential();replaced.state.phase='ready';replaced.release();await obsolete;
assert.deepEqual(replaced.frames,[]);assert.equal(replaced.state.sampleCursorMs,0);assert.equal(replaced.listenerCount(),0);
console.log('[sequential] PASS ordered samples, resume cursor, pending-seek cancellation and source replacement');
