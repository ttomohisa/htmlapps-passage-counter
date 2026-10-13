// Test the exact frame-pacing factory extracted from the single HTML.
// No browser mocking of the detector: operational CI also executes the real WASM.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const s=readFileSync('src/index.template.html','utf8');
const a=s.indexOf('// PERF:BEGIN'),b=s.indexOf('// PERF:END');
assert(a>=0&&b>a,'Embedded performance logic markers missing');
const make=vm.runInNewContext('(()=>{'+s.slice(a+'// PERF:BEGIN'.length,b)+
';return createInferencePacer;})()');
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('[performance] PASS '+name)};
test('first frame allowed and fast devices can update ~9 times a second',()=>{
 const p=make();
 assert.equal(p.shouldInfer(100),true);
 p.record(100,50);
 assert.equal(p.shouldInfer(150),false);
 assert.equal(p.shouldInfer(210),true);
 p.record(210,52);
 assert.equal(p.snapshot().samples,2);
 assert(p.snapshot().intervalMs<=110);
});
test('heavy inference stretches the interval but does not enqueue frames',()=>{
 const p=make();
 for(let i=0;i<8;i++){
   const tick=100+i*220;
   assert.equal(p.shouldInfer(tick),true);
   p.record(tick,195);
 }
 assert(p.snapshot().intervalMs>=200);
 assert(p.snapshot().intervalMs<=225);
 assert(p.snapshot().skipped===0);
});
test('brief startup FPS fluctuations do not trigger a slow warning',()=>{
 const p=make();
 for(let i=0;i<4;i++)p.record(i*150,100);
 assert.equal(p.snapshot().slow,false);
 assert.equal(p.snapshot().mustInterrupt,false);
});
test('sustained very low fps produces an interruption signal',()=>{
 const p=make();
 for(let i=0;i<25;i++)p.record(i*550,430);
 const state=p.snapshot(13500);
 assert(state.slow&&state.critical);
 assert(state.criticalForMs>=8000);
 assert(state.mustInterrupt);
 assert(state.fps<3);
});
test('long camera gaps counted and reset clears adaptive state',()=>{
 const p=make();
 p.record(100,150);p.record(1400,190);
 assert.equal(p.snapshot().gaps,1);
 p.reset();
 const r=p.snapshot();
 assert.equal(r.samples,0);
 assert.equal(r.slow,false);
 assert.equal(r.skipped,0);
 assert.equal(p.shouldInfer(0),true);
});
test('invalid wall timestamps never pass, and record ignores NaN',()=>{
 const p=make();
 assert.equal(p.shouldInfer(NaN),false);
 p.record(NaN,40);
 assert.equal(p.snapshot().samples,0);
});
console.log('[performance] All '+passed+' deterministic pacing/slow-session cases passed');
