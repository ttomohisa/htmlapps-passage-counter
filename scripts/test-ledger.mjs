// Pure correction ledger tests against the exact factory embedded in the HTML.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src=readFileSync('src/index.template.html','utf8');
const begin=src.indexOf('// LEDGER:BEGIN');
const end=src.indexOf('// LEDGER:END');
assert(begin>=0&&end>begin,'Ledger markers missing');
const factory=vm.runInNewContext('(()=>{'+
  src.slice(begin+'// LEDGER:BEGIN'.length,end)+
  ';return createCountingLedger;})()');
let checks=0;
function testCase(label,callback){callback();checks++;console.log('[ledger] PASS '+label);}
testCase('initial zero and negative guard',()=>{
  const ledger=factory();
  assert.equal(ledger.summary().a,0);
  assert.equal(ledger.correct('A_TO_B',-1,0),null);
  assert.equal(ledger.undo(0),null);
  assert.equal(ledger.history().length,0);
});
testCase('automatic event and reversal via correction',()=>{
  const ledger=factory();ledger.auto('A_TO_B',100);
  assert.equal(ledger.summary().a,1);
  const correction=ledger.correct('A_TO_B',-1,120);
  assert(correction);assert.equal(ledger.summary().a,0);
  assert.equal(ledger.summary().autoA,1);
  assert.equal(ledger.summary().manualA,-1);
  const reverted=ledger.undo(140);
  assert.equal(reverted.undoOf,correction.id);
  assert.equal(reverted.kind,'undo');assert.equal(reverted.delta,+1);
  assert.equal(ledger.summary().a,1);
  assert.equal(ledger.summary().manualA,0);
  assert.equal(ledger.history().length,3);
  assert.equal(ledger.undo(150),null);
});
testCase('Undo only applies to last un-undone correction',()=>{
  const ledger=factory();
  const first=ledger.correct('A_TO_B',+1,11);
  const second=ledger.correct('B_TO_A',+1,12);
  assert.equal(ledger.undo(20,first.id),null);
  assert.equal(ledger.undo(20,second.id).undoOf,second.id);
  assert.equal(ledger.summary().b,0);
  assert.equal(ledger.summary().a,1);
  assert.equal(ledger.summary().canUndo,false);
});
testCase('several changes, no underflow and append-only history',()=>{
  const ledger=factory();
  ledger.auto('A_TO_B',10);ledger.auto('A_TO_B',12);
  ledger.correct('A_TO_B',-1,20);
  ledger.correct('A_TO_B',-1,21);
  assert.equal(ledger.correct('A_TO_B',-1,22),null);
  const history=ledger.history();
  assert.equal(history.length,4);
  assert(history.every(x=>typeof x.occurredAt==='string'&&x.id));
  assert.equal(ledger.summary().a,0);
  assert.equal(ledger.summary().autoA,2);
  assert.equal(ledger.summary().manualA,-2);
});
testCase('reset releases session history',()=>{
  const ledger=factory();
  ledger.correct('B_TO_A',+1,0);ledger.reset();
  assert.equal(ledger.summary().hasEvents,false);
  assert.equal(ledger.summary().a+ledger.summary().b,0);
  assert.equal(ledger.history().length,0);
});
testCase('external mutation cannot edit stored records',()=>{
  const ledger=factory();ledger.auto('A_TO_B',10);
  const history=ledger.history();history[0].delta=300;
  assert.equal(ledger.history()[0].delta,1);
});
testCase('restoration preserves correction and Undo audit rows',()=>{
  const ledger=factory();ledger.auto('A_TO_B',12);
  const adjustment=ledger.correct('B_TO_A',+1,20);
  ledger.undo(35,adjustment.id);
  const saved=ledger.history();
  const second=factory();second.restore(saved);
  assert.equal(second.history().length,3);
  assert.equal(second.summary().a,1);
  assert.equal(second.summary().b,0);
  assert.equal(second.summary().manualB,0);
  assert.equal(second.summary().canUndo,false);
  second.correct('A_TO_B',+1,100);
  assert.equal(second.history().length,4);
  assert.equal(second.summary().a,2);
});
testCase('reject malformed persisted events instead of corrupting counters',()=>{
  const ledger=factory();ledger.auto('A_TO_B',10);
  const wrong=[{id:'x',direction:'A_TO_B',kind:'auto',delta:-1,
    occurredAt:new Date().toISOString(),elapsedMs:10}];
  assert.throws(()=>ledger.restore(wrong));
});
console.log('[ledger] All '+checks+' deterministic ledger checks passed');
