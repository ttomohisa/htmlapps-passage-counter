// Offline, dependency-free evaluator. No images/video files are read or transmitted.
// Human ground truth and app-exported AUTO events are matched one-to-one by direction
// within a fixed time tolerance. Manual corrections must never inflate precision.
export const DEFAULT_TOLERANCE_MS=1500;
export const TARGET_RATE=0.95;

export function parseCsv(input){
  const text=String(input).replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){
      if(char==='"'){
        if(text[i+1]==='"'){field+='"';i++;}
        else{quoted=false;closed=true;}
      }else field+=char;
    }else if(char===','||char==='\r'||char==='\n'){
      row.push(field);field='';closed=false;
      if(char===',' )continue;
      if(char==='\r'&&text[i+1]==='\n')i++;
      if(row.length>1||row[0]!==''||rows.length===0)rows.push(row);
      row=[];
    }else if(char==='"'&&field===''&&!closed){
      quoted=true;
    }else if(char==='"'){
      throw Error('Malformed CSV: quote outside a quoted field at byte '+i);
    }else{
      if(closed)throw Error('Malformed CSV: characters after closing quote');
      field+=char;
    }
  }
  if(quoted)throw Error('Malformed CSV: unterminated quote');
  if(row.length||field!==''||closed){
    row.push(field);rows.push(row);
  }
  if(!rows.length||rows[0].length===0)throw Error('Empty CSV header');
  const headers=rows.shift();
  if(headers.some(h=>h==='')||new Set(headers).size!==headers.length)
    throw Error('CSV has empty or duplicate column names');
  return rows.filter(r=>r.length>1||r[0]!=='').map((values,i)=>{
    if(values.length!==headers.length)throw Error('CSV row '+(i+2)+' has '+values.length+' fields instead of '+headers.length);
    return Object.fromEntries(headers.map((h,index)=>[h,values[index]]));
  });
}

function parseTime(row,basis,description){
  if(basis==='media'){
    const raw=row.source_time_ms??row.time_ms;
    if(raw===undefined||String(raw).trim()==='')
      throw Error(description+': missing source_time_ms / time_ms');
    const value=Number(raw);
    if(!Number.isFinite(value)||value<0)throw Error(description+': invalid media time');
    return value;
  }
  if(basis==='wall'){
    const raw=row.occurred_at;
    if(!raw||!/^\d{4}-\d{2}-\d{2}T/.test(raw)||!/Z|[+-]\d\d:\d\d$/.test(raw))
      throw Error(description+': occurred_at requires ISO 8601 and timezone');
    const value=Date.parse(raw);
    if(!Number.isFinite(value))throw Error(description+': invalid occurred_at');
    return value;
  }
  throw Error('Invalid time basis: '+basis);
}
function parseDirection(value,description){
  if(value!=='A_TO_B'&&value!=='B_TO_A')throw Error(description+': invalid direction '+value);
  return value;
}
function normalize(rows,basis,kind,sceneId){
  if(!Array.isArray(rows))throw Error('Expected CSV rows for '+sceneId);
  const filtered=kind==='prediction'?rows.filter(row=>{
    const value=row.event_kind_v1||row.kind;
    if(!['auto','correction','undo','manual_adjustment','undo_adjustment'].includes(value))
      throw Error(sceneId+': unknown event kind '+value);
    return value==='auto';
  }):rows;
  const seen=new Set();
  return filtered.map((row,index)=>{
    const id=String(row.event_id||row.id||kind+'-'+index);
    if(seen.has(id))throw Error(sceneId+': duplicate '+kind+' event ID: '+id);
    seen.add(id);
    if(kind==='prediction'&&row.delta!==undefined&&row.delta!=='1'&&row.delta!=='+1')
      throw Error(sceneId+': auto event delta must be +1');
    return {id,direction:parseDirection(row.direction,sceneId+' event '+id),
      atMs:parseTime(row,basis,sceneId+' event '+id),
      subjectId:kind==='truth'?String(row.subject_id||''):undefined};
  }).sort((a,b)=>a.atMs-b.atMs||a.id.localeCompare(b.id));
}
export function fromCsv({sceneId='scene',truthCsv,predictionCsv,timeBasis='media'}){
  return {
    truth:normalize(parseCsv(truthCsv),timeBasis,'truth',sceneId),
    predicted:normalize(parseCsv(predictionCsv),timeBasis,'prediction',sceneId)
  };
}

function pairDirection(truth,predicted,toleranceMs){
  const a=truth.length,b=predicted.length,stride=b+1;
  // Maximum true positives first, then minimum total time discrepancy.
  // Backtrace matrix uses one byte/cell; rolling rows avoid quadratic float memory.
  if((a+1)*(b+1)>20_000_000)
    throw Error('Too many events for one evaluation scene; split into independent clips');
  const trace=new Uint8Array((a+1)*stride);
  const oldCount=new Int32Array(stride),oldCost=new Float64Array(stride);
  let pc=oldCount,pe=oldCost;
  for(let j=1;j<=b;j++)trace[j]=2;
  for(let i=1;i<=a;i++){
    const nc=new Int32Array(stride),ne=new Float64Array(stride);
    trace[i*stride]=1;
    for(let j=1;j<=b;j++){
      let count=pc[j],cost=pe[j],choice=1; // skip an unmatched truth
      if(nc[j-1]>count||(nc[j-1]===count&&ne[j-1]<cost)){
        count=nc[j-1];cost=ne[j-1];choice=2; // unmatched prediction
      }
      const deviation=Math.abs(truth[i-1].atMs-predicted[j-1].atMs);
      if(deviation<=toleranceMs){
        const matchedCount=pc[j-1]+1,matchedCost=pe[j-1]+deviation;
        if(matchedCount>count||(matchedCount===count&&matchedCost<=cost)){
          count=matchedCount;cost=matchedCost;choice=3;
        }
      }
      nc[j]=count;ne[j]=cost;trace[i*stride+j]=choice;
    }
    pc=nc;pe=ne;
  }
  let i=a,j=b;const matches=[];
  while(i>0&&j>0){
    const choice=trace[i*stride+j];
    if(choice===3){matches.push({truth:truth[i-1],predicted:predicted[j-1],
      timeErrorMs:predicted[j-1].atMs-truth[i-1].atMs});i--;j--;}
    else if(choice===1)i--;
    else if(choice===2)j--;
    else throw Error('Invalid matching traceback');
  }
  return matches.reverse();
}
function metrics(tp,fp,fn){
  const p=tp+fp,rec=tp+fn;
  return {tp,fp,fn,precision:p?tp/p:null,recall:rec?tp/rec:null};
}
const directions=['A_TO_B','B_TO_A'];
export function scoreEvents(truth,predicted,{toleranceMs=DEFAULT_TOLERANCE_MS}={}){
  if(!Number.isFinite(toleranceMs)||toleranceMs<=0||toleranceMs>10000)
    throw Error('Tolerance must be positive and at most 10000 ms');
  const allMatches=[];
  for(const direction of directions)
    allMatches.push(...pairDirection(
      truth.filter(e=>e.direction===direction),predicted.filter(e=>e.direction===direction),toleranceMs));
  const usedTruth=new Set(allMatches.map(m=>m.truth.id));
  const usedPred=new Set(allMatches.map(m=>m.predicted.id));
  const unmatchedTruth=truth.filter(e=>!usedTruth.has(e.id));
  const unmatchedPred=predicted.filter(e=>!usedPred.has(e.id));
  const byDirection={};
  for(const direction of directions){
    const t=truth.filter(e=>e.direction===direction),p=predicted.filter(e=>e.direction===direction);
    const tp=allMatches.filter(m=>m.truth.direction===direction).length;
    byDirection[direction]=metrics(tp,p.length-tp,t.length-tp);
  }
  // Diagnostic categories are observations from event timestamps, NOT proof
  // of a root cause such as an ID-switch or model failure.
  function classify(unmatched,others,reference){
    return unmatched.map(event=>{
      const nearest=(items)=>items.reduce((best,item)=>{
        const delta=Math.abs(item.atMs-event.atMs);
        return delta<=toleranceMs&&(!best||delta<best.ms)?{ms:delta,id:item.id}:best;
      },null);
      const opposite=nearest(others.filter(e=>e.direction!==event.direction));
      const same=nearest(reference.filter(e=>e.direction===event.direction));
      const label=opposite?'possible_direction_mismatch':same?'possible_duplicate_or_missed_match':'unmatched';
      return {id:event.id,direction:event.direction,timeMs:event.atMs,category:label};
    });
  }
  return {overall:metrics(allMatches.length,unmatchedPred.length,unmatchedTruth.length),
    byDirection,matches:allMatches,unmatchedGroundTruth:classify(unmatchedTruth,predicted,predicted),
    unmatchedPredictions:classify(unmatchedPred,truth,truth)};
}
function addMetrics(entries){
  return entries.reduce((a,e)=>({
    tp:a.tp+e.tp,fp:a.fp+e.fp,fn:a.fn+e.fn
  }),{tp:0,fp:0,fn:0});
}
const success=m=>m.precision!==null&&m.recall!==null&&
  m.precision>=TARGET_RATE&&m.recall>=TARGET_RATE;
export function evaluateScenes(scenes,{toleranceMs=DEFAULT_TOLERANCE_MS}={}){
  if(!Array.isArray(scenes)||!scenes.length)throw Error('At least one scene is required');
  const sceneIds=new Set();
  const evaluated=scenes.map(scene=>{
    if(!scene.id||sceneIds.has(scene.id))throw Error('Missing or duplicate scene id: '+scene.id);
    sceneIds.add(scene.id);
    if(!['standard','difficult'].includes(scene.condition))throw Error('Invalid condition for '+scene.id);
    if(!['calibration','holdout'].includes(scene.split))throw Error('Invalid evaluation split for '+scene.id);
    if(!['real_video','synthetic'].includes(scene.provenance))throw Error('Explicit provenance required for '+scene.id);
    const scores=scoreEvents(scene.truth,scene.predicted,{toleranceMs});
    return {id:scene.id,condition:scene.condition,split:scene.split,
      provenance:scene.provenance,truthEvents:scene.truth.length,
      predictions:scene.predicted.length,...scores};
  });
  const groups={};
  for(const condition of ['standard','difficult'])
    for(const split of ['calibration','holdout']){
      const key=condition+'_'+split;
      const list=evaluated.filter(x=>x.condition===condition&&x.split===split);
      const total=addMetrics(list.map(x=>x.overall));
      groups[key]={sceneCount:list.length,...metrics(total.tp,total.fp,total.fn),byDirection:{}};
      for(const dir of directions){
        const stats=addMetrics(list.map(x=>x.byDirection[dir]));
        groups[key].byDirection[dir]=metrics(stats.tp,stats.fp,stats.fn);
      }
    }
  const standard=groups.standard_holdout;
  const scoredReal=evaluated.filter(x=>x.condition==='standard'&&x.split==='holdout');
  const realOnly=scoredReal.length>0&&scoredReal.every(x=>x.provenance==='real_video');
  const truthEvents=standard.tp+standard.fn;
  const reasons=[];
  if(truthEvents<100)reasons.push('Independent standard-condition holdout must have at least 100 annotated real crossing events');
  if(!realOnly)reasons.push('Holdout must explicitly consist of real-video scenes, not synthetic or unverified samples');
  if(standard.byDirection.A_TO_B.tp+standard.byDirection.A_TO_B.fn===0||
    standard.byDirection.B_TO_A.tp+standard.byDirection.B_TO_A.fn===0)
      reasons.push('Both directions must appear in standard holdout ground truth');
  if(!success(standard)||!directions.every(dir=>success(standard.byDirection[dir])))
    reasons.push('Directional and overall Precision and Recall must each reach 95%');
  return {schemaVersion:1,toleranceMs,target:TARGET_RATE,
    scenes:evaluated,groups,
    gate:{
      status:reasons.length?'NO_GO_OR_INSUFFICIENT_EVIDENCE':'CANDIDATE_REQUIRES_MANUAL_EVIDENCE_REVIEW',
      passedNumericalTarget:success(standard)&&directions.every(dir=>success(standard.byDirection[dir])),
      eligibleForReview:reasons.length===0,standardHoldoutTruth:truthEvents,
      reasons,
      note:'A manifest declaration cannot independently verify annotations, camera setup, video provenance or result integrity. Human review is mandatory.'
    }};
}
