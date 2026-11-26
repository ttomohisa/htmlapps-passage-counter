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
pass('post-finish manual correction stays in last bucket',()=>{
  const s=base();
  time.transition(s,'counting',at('2026-10-11T10:00:00Z'));
  time.transition(s,'done',at('2026-10-11T10:07:00Z'));
  const e=[
    {occurredAt:'2026-10-11T10:06:58Z',direction:'A_TO_B',kind:'auto',delta:1},
    {occurredAt:'2026-10-11T10:08:00Z',direction:'A_TO_B',kind:'correction',delta:-1},
    {occurredAt:'2026-10-11T10:08:04Z',direction:'A_TO_B',kind:'undo',delta:+1}
  ];
  const buckets=time.aggregation(s,e,5);
  assert.equal(buckets.length,2);
  assert.equal(buckets.at(-1).manualA,0);
  assert.equal(buckets.reduce((n,r)=>n+r.totalA,0),1);
});
pass('boundary finish does not generate a zero-duration bucket',()=>{
  const s=base();
  time.transition(s,'counting',at('2026-10-11T10:00:00Z'));
  time.transition(s,'done',at('2026-10-11T10:05:00Z'));
  assert.equal(time.aggregation(s,[],5).length,1);
});
pass('session never stores face, camera frame or persistent person ID',()=>{
 const s=base();const serialized=JSON.stringify(s);
 assert(!serialized.includes('imageData')&&!serialized.includes('faceVector'));
 assert.equal(s.schemaVersion,1);assert.equal(s.sourceType,'camera');
 assert(s.runtimeInfo.wasmFlavor==='simd');
});
pass('video positions use the same buckets at different analysis speeds',()=>{
  const events=[
    {id:'a',direction:'A_TO_B',kind:'auto',delta:1,sourceTimeMs:0},
    {id:'b',direction:'B_TO_A',kind:'auto',delta:1,sourceTimeMs:300000},
    {id:'end',direction:'A_TO_B',kind:'correction',delta:1,sourceTimeMs:600000}
  ];
  const run=speed=>time.mediaAggregation(events.map((event,i)=>({
    ...event,occurredAt:new Date(Date.UTC(2026,0,1)+speed*i).toISOString()
  })),5,600000);
  const fast=run(100),slow=run(400000);
  assert.deepEqual(fast,slow);
  assert.deepEqual(Array.from(fast,r=>[r.startMs,r.endMs,r.totalA,r.totalB]),
    [[0,300000,1,0],[300000,600000,1,1]]);
});
pass('video buckets preserve unknown timestamps, reverse corrections in place and omit unobserved gaps',()=>{
  const events=[
    {id:'edit',kind:'correction',direction:'A_TO_B',delta:1,sourceTimeMs:303000},
    {id:'undo',kind:'undo',undoOf:'edit',direction:'A_TO_B',delta:-1,sourceTimeMs:1080000},
    {id:'legacy',kind:'auto',direction:'B_TO_A',delta:1},
    {id:'unknown',kind:'correction',direction:'A_TO_B',delta:1,sourceTimeMs:null},
    {id:'undo-unknown',kind:'undo',undoOf:'unknown',direction:'A_TO_B',delta:-1,sourceTimeMs:0},
    {id:'later',kind:'auto',direction:'A_TO_B',delta:1,sourceTimeMs:1080000}
  ];
  const rows=time.mediaAggregation(events,5,1090312);
  assert.deepEqual(Array.from(rows,r=>[r.startMs,r.endMs,r.totalA,r.totalB]),
    [[300000,600000,0,0],[900000,1090312,1,0],[null,null,0,1]]);
  assert.equal(time.mediaAggregation([],5,1090312).length,0);
  assert.equal(time.mediaAggregation([events.at(-1)],15,null)[0].startMs,900000);
  assert.equal(time.mediaAggregation([events.at(-1)],60,null)[0].endMs,3600000);
});
pass('interval export places EOF in the last interval and preserves wall clock exports for cameras and saved videos',()=>{
  const session=base(),started=at('2026-10-11T10:00:00Z');
  session.sourceType='file';session.runtimeInfo.sourceDurationMs=600000;
  time.transition(session,'counting',started);
  time.transition(session,'done',started+1200000);
  const events=[{kind:'correction',direction:'A_TO_B',delta:1,sourceTimeMs:600000,
    occurredAt:new Date(started+1190000).toISOString()}];
  const fields={'#aggregationMinutes':{value:'5'},'#timeBasis':{value:'media'}};
  const code=html.slice(html.indexOf('function usesMediaBuckets()'),html.indexOf('function mediaBoundaryText('))+
    html.slice(html.indexOf('function exportIntervals('),html.indexOf('function exportBundle('));
  const rows=vm.runInNewContext(code+';()=>exportIntervals(true)',{
    currentSession:session,state:{startTime:started},$:id=>fields[id],timeline:time,ledger:{history:()=>events}
  });
  const media=rows();
  assert.equal(media.length,2);
  assert.deepEqual(Array.from(media[1]).slice(1,6),['video','interval',300000,600000,5]);
  fields['#timeBasis'].value='wall';fields['#aggregationMinutes'].value='15';
  const wall=rows(),counted=wall.find(r=>r[8]===1);
  assert.equal(counted[3],15);assert.equal(counted[1],new Date(started+900000).toISOString());
  session.sourceType='camera';fields['#timeBasis'].value='media';
  assert.deepEqual(rows(),wall);
});
console.log('[sessions] '+passes+' scenario tests passed');
