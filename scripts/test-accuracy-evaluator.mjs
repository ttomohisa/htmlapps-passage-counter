import assert from 'node:assert/strict';
import {parseCsv,fromCsv,scoreEvents,evaluateScenes} from './accuracy-evaluator.mjs';
let checks=0;
function check(name,fn){fn();checks++;console.log('[accuracy] PASS '+name);}
const ev=(id,atMs,direction='A_TO_B')=>({id,atMs,direction});
check('RFC4180 CSV with UTF-8 BOM, quoted comma, escaped quotes and newline',()=>{
  const rows=parseCsv('\uFEFF"event_id","direction","note"\r\n"e1","A_TO_B","a,b"\r\n"e2","B_TO_A","a ""quote""\nline"\r\n');
  assert.equal(rows.length,2);
  assert.equal(rows[0].note,'a,b');assert.equal(rows[1].note,'a "quote"\nline');
});
check('reject malformed CSV and duplicated headers',()=>{
  assert.throws(()=>parseCsv('"id","id"\r\n"1","2"\r\n'),/duplicate/);
  assert.throws(()=>parseCsv('id,note\n1,"unclosed'),/unterminated/);
});
check('ground truth vs automatic events excludes manual and Undo',()=>{
  const truthCsv='event_id,direction,time_ms\ntruth-1,A_TO_B,5000\n';
  const predictedCsv='"event_id","direction","kind","delta","source_time_ms","event_kind_v1"\r\n'+
    '"auto-1","A_TO_B","auto","1","5200","auto"\r\n'+
    '"manual-1","A_TO_B","correction","1","5010","manual_adjustment"\r\n'+
    '"undo-1","A_TO_B","undo","-1","5050","undo_adjustment"\r\n';
  const parsed=fromCsv({sceneId:'synthetic',truthCsv,predictionCsv:predictedCsv});
  assert.equal(parsed.predicted.length,1);
  const scored=scoreEvents(parsed.truth,parsed.predicted);
  assert.equal(scored.overall.tp,1);assert.equal(scored.overall.fp,0);
});
check('global optimal association maximizes TP, not greedy nearest-only',()=>{
  const score=scoreEvents([ev('g1',0),ev('g2',1000)],
    [ev('p1',900),ev('p2',2200)],{toleranceMs:1500});
  assert.equal(score.overall.tp,2);
  assert.equal(score.matches.length,2);
});
check('one-to-one matching counts duplicate predictions as FP',()=>{
  const s=scoreEvents([ev('g',1000)],[ev('p1',950),ev('p2',1020)]);
  assert.deepEqual([s.overall.tp,s.overall.fp,s.overall.fn],[1,1,0]);
  assert.equal(s.unmatchedPredictions.length,1);
});
check('wrong direction is FP + FN not a valid crossing',()=>{
  const s=scoreEvents([ev('g',1000,'A_TO_B')],[ev('p',1020,'B_TO_A')]);
  assert.equal(s.overall.tp,0);assert.equal(s.overall.fp,1);assert.equal(s.overall.fn,1);
  assert.equal(s.unmatchedPredictions[0].category,'possible_direction_mismatch');
});
check('events outside ±1.5s are unmatched',()=>{
  const s=scoreEvents([ev('g',1000)],[ev('p',2501)]);
  assert.deepEqual([s.overall.tp,s.overall.fp,s.overall.fn],[0,1,1]);
});
check('wall clock requires timezone, while media timestamps must be finite',()=>{
  const valid=fromCsv({sceneId:'clock',timeBasis:'wall',
    truthCsv:'id,direction,occurred_at\none,A_TO_B,2026-10-11T10:00:00+09:00\n',
    predictionCsv:'event_id,direction,occurred_at,kind\na,A_TO_B,2026-10-11T01:00:01Z,auto\n'});
  assert.equal(scoreEvents(valid.truth,valid.predicted).overall.tp,1);
  assert.throws(()=>fromCsv({sceneId:'clock',timeBasis:'wall',
    truthCsv:'id,direction,occurred_at\none,A_TO_B,2026-10-11T10:00:00\n',
    predictionCsv:'event_id,direction,occurred_at,kind\na,A_TO_B,2026-10-11T01:00:01Z,auto\n'}),/timezone/);
  assert.throws(()=>fromCsv({sceneId:'bad',
    truthCsv:'id,direction,time_ms\none,A_TO_B,NaN\n',
    predictionCsv:'event_id,direction,source_time_ms,kind\na,A_TO_B,1,auto\n'}),/invalid media time/);
});
check('no empty evaluation can fake 100% precision/recall',()=>{
  const s=scoreEvents([],[]);
  assert.equal(s.overall.precision,null);assert.equal(s.overall.recall,null);
  const report=evaluateScenes([{id:'s',condition:'standard',split:'holdout',provenance:'synthetic',
    truth:[],predicted:[]}]);
  assert.equal(report.gate.eligibleForReview,false);
});
check('100 synthetic PERFECT events never close real evidence gate',()=>{
  const truth=Array.from({length:100},(_,i)=>ev('g'+i,i*4500,i%2?'B_TO_A':'A_TO_B'));
  const predicted=truth.map((x,i)=>({...x,id:'p'+i}));
  const report=evaluateScenes([{id:'fabricated',condition:'standard',split:'holdout',
    provenance:'synthetic',truth,predicted}]);
  assert.equal(report.groups.standard_holdout.precision,1);
  assert.equal(report.gate.passedNumericalTarget,true);
  assert.equal(report.gate.eligibleForReview,false);
  assert.match(report.gate.reasons.join(),/real-video/);
});
check('annotated real holdout only becomes candidate for HUMAN review',()=>{
  const truth=Array.from({length:100},(_,i)=>ev('g'+i,i*4800,i%2?'B_TO_A':'A_TO_B'));
  const predicted=truth.map((x,i)=>({...x,id:'p'+i,atMs:x.atMs+120}));
  const report=evaluateScenes([{id:'holdout',condition:'standard',split:'holdout',
    provenance:'real_video',truth,predicted}]);
  assert.equal(report.gate.eligibleForReview,true);
  assert.equal(report.gate.status,'CANDIDATE_REQUIRES_MANUAL_EVIDENCE_REVIEW');
});
check('under-95 recall fails despite sufficient truth and good precision',()=>{
  const truth=Array.from({length:100},(_,i)=>ev('g'+i,i*5000,i%2?'B_TO_A':'A_TO_B'));
  const predicted=truth.slice(0,94).map((x,i)=>({...x,id:'p'+i}));
  const report=evaluateScenes([{id:'holdout',condition:'standard',split:'holdout',
    provenance:'real_video',truth,predicted}]);
  assert.equal(report.groups.standard_holdout.recall,0.94);
  assert.equal(report.gate.eligibleForReview,false);
});
check('difficult and calibration scenes cannot inflate standard holdout',()=>{
  const base=[{id:'s1',condition:'standard',split:'holdout',provenance:'real_video',
    truth:[ev('g',10)],predicted:[]}];
  for(let i=0;i<100;i++)base.push({
    id:'cal'+i,condition:'difficult',split:'calibration',provenance:'real_video',
    truth:[ev('gt'+i,200)],predicted:[ev('pred'+i,200)]
  });
  const report=evaluateScenes(base);
  assert.equal(report.groups.standard_holdout.fn,1);
  assert.equal(report.groups.standard_holdout.precision,null);
  assert.equal(report.gate.eligibleForReview,false);
});
check('duplicate IDs and invalid directions rejected',()=>{
  assert.throws(()=>fromCsv({sceneId:'bad',
    truthCsv:'id,direction,time_ms\ndup,A_TO_B,100\ndup,B_TO_A,200\n',
    predictionCsv:'event_id,direction,source_time_ms,kind\np,A_TO_B,100,auto\n'}),/duplicate/);
  assert.throws(()=>fromCsv({sceneId:'bad',
    truthCsv:'id,direction,time_ms\nid,X,100\n',
    predictionCsv:'event_id,direction,source_time_ms,kind\np,A_TO_B,100,auto\n'}),/invalid direction/);
});
console.log('[accuracy] '+checks+' accuracy evaluation regression checks passed; real-data gate remains open');
