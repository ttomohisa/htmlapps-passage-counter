// Deterministic coverage/recovery/bucket calculations extracted from the
// actual standalone HTML. The runtime retains no camera frames in these records.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('src/index.template.html','utf8');
const b=html.indexOf('// SESSION:BEGIN'),e=html.indexOf('// SESSION:END');
assert(b>=0&&e>b,'SESSION model markers missing');
const factory=vm.runInNewContext('(()=>{'+html.slice(b+16,e)+';return createSessionTimeline;})()');
const time=factory();
let passes=0;
function pass(name,run){run();passes++;console.log('[sessions] PASS '+name);}
const at=iso=>Date.parse(iso);
const base=()=>time.create({sessionId:'fixture-1',name:'People crossings',
  createdAt:at('2026-10-11T10:00:00.000Z'),
  labels:{A_TO_B:'Entry',B_TO_A:'Exit'},
  line:[{x:.1,y:.5},{x:.9,y:.5}],appVersion:'0.4.0',modelVersion:'EfficientDet-Lite0-int8-1'});
pass('time segments and coverage',()=>{
 const s=base();
 time.transition(s,'counting',at('2026-10-11T10:00:00Z'));
 time.transition(s,'paused',at('2026-10-11T10:00:50Z'));
 time.transition(s,'counting',at('2026-10-11T10:01:10Z'));
 time.transition(s,'interrupted',at('2026-10-11T10:01:40Z'));
 time.transition(s,'done',at('2026-10-11T10:02:00Z'));
 assert.equal(s.coverageIntervals.length,4);
 assert.deepEqual(Object.assign({},time.durations(s)),{
   observedMs:80000,pausedMs:20000,missingMs:20000
 });
 assert.equal(s.state,'done');
 assert.equal(s.endedAt,'2026-10-11T10:02:00.000Z');
});
pass('crash recovery closes observed exactly at last checkpoint and creates missing interval',()=>{
 const s=base();
 time.transition(s,'counting',at('2026-10-11T10:00:00Z'));
 time.checkpoint(s,at('2026-10-11T10:00:30Z'));
 time.recover(s,at('2026-10-11T10:07:00Z'));
 assert.equal(s.state,'interrupted');
 assert.equal(s.coverageIntervals[0].endedAt,'2026-10-11T10:00:30.000Z');
 assert.equal(s.coverageIntervals[1].type,'missing');
 assert.equal(s.coverageIntervals[1].startedAt,'2026-10-11T10:00:30.000Z');
 const d=time.durations(s,at('2026-10-11T10:07:00Z'));
 assert.equal(d.observedMs,30000);
 assert.equal(d.missingMs,390000);
 time.transition(s,'counting',at('2026-10-11T10:07:20Z'));
 const continued=time.durations(s,at('2026-10-11T10:07:30Z'));
 assert.equal(continued.observedMs,40000);
 assert.equal(continued.missingMs,410000);
});
pass('recover finished and paused sessions never silently resumes',()=>{
 for(const phase of ['done','paused','interrupted']){
   const s=base();time.transition(s,'counting',at('2026-10-11T10:00:00Z'));
   time.transition(s,phase,at('2026-10-11T10:00:10Z'));
   const before=JSON.stringify(s);
   time.recover(s,at('2026-10-11T15:00:00Z'));
   assert.equal(s.state,phase);
   assert.equal(JSON.stringify(s),before);
 }
});
pass('5-minute windows mark observed, partial and missing separately',()=>{
 const s=base();
 time.transition(s,'counting',at('2026-10-11T10:00:00Z'));
 time.transition(s,'interrupted',at('2026-10-11T10:02:00Z'));
 time.transition(s,'counting',at('2026-10-11T10:06:00Z'));
 time.transition(s,'done',at('2026-10-11T10:07:00Z'));
 const events=[
   {occurredAt:'2026-10-11T10:01:00.000Z',direction:'A_TO_B',kind:'auto',delta:1},
   {occurredAt:'2026-10-11T10:06:10.000Z',direction:'B_TO_A',kind:'auto',delta:1},
   {occurredAt:'2026-10-11T10:06:12.000Z',direction:'B_TO_A',kind:'correction',delta:-1},
   {occurredAt:'2026-10-11T10:06:15.000Z',direction:'B_TO_A',kind:'undo',delta:1}
 ];
 const rows=time.aggregation(s,events,5);
 assert.equal(rows.length,2);
 assert.equal(rows[0].coverageStatus,'partial');
 assert.equal(rows[0].autoA,1);
 assert.equal(rows[0].observedMs,120000);
 assert.equal(rows[0].missingMs,180000);
 assert.equal(rows[1].coverageStatus,'partial');
 assert.equal(rows[1].autoB,1);
 assert.equal(rows[1].manualB,0);
 assert.equal(rows[1].totalB,1);
 assert.equal(rows[1].observedMs,60000);
 assert.equal(rows[1].missingMs,60000);
});
pass('fully missing bucket is not misreported as observed zero',()=>{
 const s=base();
 time.transition(s,'counting',at('2026-10-11T10:00:00Z'));
 time.transition(s,'interrupted',at('2026-10-11T10:00:30Z'));
 time.transition(s,'done',at('2026-10-11T10:18:00Z'));
 const rows=time.aggregation(s,[],5);
 assert(rows.some(r=>r.coverageStatus==='missing'&&r.observedMs===0&&r.missingMs>0));
 assert.equal(rows[1].coverageStatus,'missing');
});
pass('15-minute and 60-minute summaries have expected direction totals',()=>{
 const s=base();
 time.transition(s,'counting',at('2026-10-11T10:00:00Z'));
 time.transition(s,'done',at('2026-10-11T10:22:00Z'));
 const e=[{occurredAt:'2026-10-11T10:03:00Z',direction:'A_TO_B',kind:'auto',delta:1},
 {occurredAt:'2026-10-11T10:16:00Z',direction:'A_TO_B',kind:'correction',delta:1}];
 assert.equal(time.aggregation(s,e,15).length,2);
 assert.equal(time.aggregation(s,e,60).reduce((n,r)=>n+r.totalA,0),2);
});
pass('session never stores face, camera frame or persistent person ID',()=>{
 const s=base();const serialized=JSON.stringify(s);
 assert(!serialized.includes('imageData')&&!serialized.includes('faceVector'));
 assert.equal(s.schemaVersion,1);assert.equal(s.sourceType,'camera');
 assert(s.runtimeInfo.wasmFlavor==='simd');
});
console.log('[sessions] '+passes+' scenario tests passed');
