// Exercise the application's write queue with deterministic transaction failures.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('src/index.template.html','utf8');
const between=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end));
const records=new Map(), snapshots=new Map();
let failuresRemaining=2;
let failDelete=false,listReads=0;
let now=Date.now();
const controls={
  sessionStore:{async write(session,events){
    if(failuresRemaining>0){failuresRemaining--;throw Error('Temporary storage failure');}
    for(const event of (Array.isArray(events)?events:events?[events]:[])){
      assert.equal(event.sessionId,session.sessionId);
      records.set(event.eventId,event);
    }
    snapshots.set(session.sessionId,session);
  },async list(){listReads++;return [...snapshots.values()];},async deleteSession(id){
    if(failDelete)throw Error('Delete failed');
    snapshots.delete(id);
    for(const [key,event] of records)if(event.sessionId===id)records.delete(key);
  }},
  state:{startTime:1},timeline:{checkpoint(){}},line:[],countName:()=>controls.label,
  label:'Entrance',$:()=>({value:'Test',dataset:{}}),tr:k=>k,
  renderSavedSessions(){},console:{warn(){}},Date:class extends Date {static now(){return ++now;}}
};
const app=vm.runInNewContext('(()=>{'+
  between('// LEDGER:BEGIN','// LEDGER:END')+
  '\nconst ledger=createCountingLedger(countName);'+
  between('let currentSession=null','function transitionSession(')+
  between('async function refreshSavedSessions(','function renderSavedSessions(')+
  between('function exportCsv(','function exportSummary(')+
  `return {start(id){currentSession={sessionId:id,sourceType:'camera'};ledger.reset();},
    auto(){return queueSnapshot(ledger.auto('A_TO_B',10));},queueSnapshot,exportCsv,deleteSessionRecord,
    refreshSavedSessions,list:()=>savedSessions};
  })()`,controls);
app.start('s1');
const first=app.auto();
controls.label='Hall';
const second=app.auto();
await Promise.all([first,second]);
assert.ok(controls.state.storageFailure);
assert.equal(records.size,0);
assert.equal(listReads,0);
await app.queueSnapshot();
await app.queueSnapshot();
assert.equal(controls.state.storageFailure,null);
assert.equal(snapshots.get('s1').counts.a,2);
assert.equal(listReads,1,'Recovery must refresh the saved list exactly once');
assert.equal(app.list()[0].counts.a,2);
assert.deepEqual([...records.values()].map(e=>[e.ordinal,e.directionLabel]),[[1,'Entrance'],[2,'Hall']]);
assert.deepEqual(Array.from(app.exportCsv(true).slice(1),r=>r[3]),['Entrance','Hall']);

failuresRemaining=1;
await app.auto();
app.start('s2');
await app.auto();
assert.equal([...records.values()].filter(e=>e.sessionId==='s1').length,2);
assert.equal([...records.values()].filter(e=>e.sessionId==='s2').length,1);
failuresRemaining=1;
await app.auto();
failDelete=true;
await assert.rejects(app.deleteSessionRecord('s2'),/Delete failed/);
assert.equal(snapshots.get('s2').counts.a,1);
await app.queueSnapshot();
assert.equal(snapshots.get('s2').counts.a,2,'A failed delete must preserve pending events');
failDelete=false;
failuresRemaining=1;
await app.auto();
const deletion=app.deleteSessionRecord('s2');
const trailingCheckpoint=app.queueSnapshot();
await Promise.all([deletion,trailingCheckpoint]);
assert.ok(!snapshots.has('s2'),'A late checkpoint must not recreate a deleted session');
assert.equal([...records.values()].filter(e=>e.sessionId==='s2').length,0);
assert.equal(controls.state.storageFailure,null,'Successful deletion cleared the warning for the discarded session');

const pendingReads=[];
controls.sessionStore.list=()=>new Promise((resolve,reject)=>pendingReads.push({resolve,reject}));
const oldRead=app.refreshSavedSessions();
const newRead=app.refreshSavedSessions();
pendingReads[1].resolve([{sessionId:'newer'}]);
await newRead;
pendingReads[0].resolve([{sessionId:'older'}]);
await oldRead;
assert.equal(app.list()[0].sessionId,'newer','Slow read must not replace a fresher list');

let opens=0;
const database={};
const store=vm.runInNewContext('(()=>{'+between('// STORE:BEGIN','// STORE:END')+
  ';return createSessionStore();})()',{
  indexedDB:{open(){
    const request={result:database};
    if(++opens===1)queueMicrotask(()=>request.onerror());
    else queueMicrotask(()=>request.onsuccess());
    return request;
  }}
});
await assert.rejects(store.open(),/open failed/);
assert.equal(await store.open(),database);
assert.equal(opens,2);
console.log('[storage] Event retries, labels, session isolation, deletion and database reconnect verified.');
