// v0.8 deterministic stress regressions against the actual embedded tracker.
// These are geometrical simulations, NOT real footage or accuracy measurements.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('src/index.template.html','utf8');
const start=source.indexOf('// TRACKER:BEGIN')+'// TRACKER:BEGIN'.length;
const end=source.indexOf('// TRACKER:END');
assert(start>25&&end>start);
const factory=vm.runInNewContext('(()=>{'+source.slice(start,end)+';return createCrossingTracker;})()');
const line=[{x:.12,y:.5},{x:.88,y:.5}];
const box=(x,y,w=.11,h=.23)=>({x:x-w/2,y:y-h,w,h});
const positions=(ys,x=.5)=>ys.map(y=>({points:[[x,y]],dt:170}));
let total=0;
function run(name,frames,expected){
  const tracker=factory(),events=[];let now=100;
  for(const {points,dt} of frames){
    now+=dt;
    events.push(...tracker.update(points.map(p=>box(...p)),now,line,false));
  }
  assert.deepEqual(Array.from(events.map(e=>e.direction)),expected,name);
  assert(events.every(e=>e.crossedAt.x>=0&&e.crossedAt.x<=1),
    name+' invalid projected crossing point');
  console.log('[stress] PASS '+name+': '+events.length+' committed');
  total++;
}
run('stable destination does not repeat a committed passage',
  positions([.15,.21,.27,.33,.39,.44,.48,.52,.57,.64,.72,.80,.80,.80,.80,.80]),['A_TO_B']);
run('slow approach + prolonged near-line pause followed by real crossing',
  positions([.15,.21,.27,.33,.39,.43,.43,.43,.43,.47,.49,.53,.58,.64,.70,.77]),['A_TO_B']);
run('stop before line then retreat is not counted',
  positions([.2,.28,.34,.38,.42,.42,.42,.42,.42,.39,.38,.35]),[]);
run('long 700ms inference gap across the line must never guess a passage',
  [...positions([.15,.22,.29,.36,.41]),{points:[[.5,.60]],dt:700},...positions([.66,.73,.78])],[]);
run('legitimate crossing near finite line endpoint is kept',
  positions([.15,.22,.29,.35,.40,.44,.48,.52,.57,.62,.72,.80],.18),['A_TO_B']);
run('two overlapping same-side tracks exchanging order make no phantom passage',
  Array.from({length:12},(_,i)=>({points:i===6?[[.5,.41],[.45,.42]]:
    [[.45,.41],[.5,.42]],dt:170})),[]);
run('fast but plausible well-observed crossing is counted once',
  positions([.10,.15,.23,.32,.40,.48,.55,.64,.72,.80]),['A_TO_B']);
run('opposite-side flutter returning before stable confirmation is not counted',
  positions([.15,.20,.27,.33,.40,.44,.48,.54,.48,.44,.39,.34,.31]),[]);
console.log('[stress] '+total+' synthetic tracker stress regressions passed. Real ≥100 event accuracy remains UNVERIFIED.');
