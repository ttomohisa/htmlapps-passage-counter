// Deterministic geometry/tracker contract, extracted from actual runtime HTML.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src=readFileSync('src/index.template.html','utf8');
const start=src.indexOf('// TRACKER:BEGIN')+'// TRACKER:BEGIN'.length;
const end=src.indexOf('// TRACKER:END');
assert(start>25&&end>start,'Embedded tracker source markers are missing');
const factory=vm.runInNewContext('(()=>{'+src.slice(start,end)+';return createCrossingTracker;})()');
const line=[{x:.12,y:.5},{x:.88,y:.5}];
const box=(x,foot,w=.11,h=.23)=>({x:x-w/2,y:foot-h,w,h});
let count=0;
function run(name,frames,expected,{reverse=false,line:countLine=line}={}){
  const tracker=factory(),events=[];let now=100;
  for(const frame of frames){
    events.push(...tracker.update((frame||[]).map(p=>box(p[0],p[1])),now,countLine,reverse));
    now+=170;
  }
  assert.deepEqual(Array.from(events.map(x=>x.direction)),expected,name+' failed');
  for(const event of events){
    assert(event.crossedAt.x>=0&&event.crossedAt.x<=1&&event.crossedAt.y>=0&&event.crossedAt.y<=1,name+' crossing point invalid');
  }
  count++;
  console.log('[tracking] PASS '+name);
}
const crossing=[.15,.21,.27,.33,.39,.44,.48,.52,.57,.64,.72,.80];
run('A to B',crossing.map(y=>[[.48,y]]),['A_TO_B']);
run('B to A',[...crossing].reverse().map(y=>[[.48,y]]),['B_TO_A']);
run('direction reversal',crossing.map(y=>[[.48,y]]),['B_TO_A'],{reverse:true});
run('round trip',[...crossing,...[...crossing].reverse()].map(y=>[[.48,y]]),['A_TO_B','B_TO_A']);
run('stop before line',[.15,.2,.27,.34,.39,.41,.42,.42,.41].map(y=>[[.5,y]]),[]);
run('jitter within hysteresis',[.15,.2,.28,.35,.4,.45,.47,.48,.49,.51,.48,.5,.52,.49].map(y=>[[.5,y]]),[]);
run('outside the finite segment',crossing.map(y=>[[.96,y]]),[]);
run('brief initial appearance near line',[.43,.47,.53,.60].map(y=>[[.5,y]]),[]);
run('two simultaneous opposite crossings',
  crossing.map((y,i)=>[[.33,y],[.70,crossing[crossing.length-1-i]]]),
  ['B_TO_A','A_TO_B']);
run('one missing detection',crossing.map((y,i)=>i===6?[]:[[.5,y]]),['A_TO_B']);
run('long dropout must not guess',[
  ...crossing.slice(0,6).map(y=>[[.5,y]]),
  ...Array.from({length:7},()=>[]),
  ...crossing.slice(7).map(y=>[[.5,y]])],[]);
run('new person reappearing opposite side',[
  ...Array.from({length:5},()=>[[.5,.3]]),
  ...Array.from({length:7},()=>[]),
  ...Array.from({length:6},()=>[[.5,.7]])],[]);
{
  const tracker=factory();let now=100;
  for(const y of crossing)tracker.update([box(.5,y)],now+=170,line);
  assert.equal(tracker.update([],now+=170,line).length,0,'no events for missing frame');
  tracker.reset();
  assert.equal(tracker.inspect().length,0,'reset releases all tracking state');
  count++; console.log('[tracking] PASS reset');
}
console.log('[tracking] All '+count+' deterministic scenarios passed');
