#!/usr/bin/env node
// Compare independent human annotations to Passage Counter's AUTO events.
// All inputs are local files; no uploads, video decoding or network requests.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fromCsv,evaluateScenes,DEFAULT_TOLERANCE_MS} from './accuracy-evaluator.mjs';

function flags(args){
  const out={file:null,json:null,md:null,requireReview:false};
  for(const arg of args){
    if(arg.startsWith('--json='))out.json=arg.slice(7);
    else if(arg.startsWith('--md='))out.md=arg.slice(5);
    else if(arg==='--require-review-candidate')out.requireReview=true;
    else if(!arg.startsWith('--')&&!out.file)out.file=arg;
    else throw Error('Unrecognized argument: '+arg);
  }
  if(!out.file)throw Error('Usage: node scripts/evaluate-accuracy.mjs <manifest.json> [--json=report.json] [--md=report.md] [--require-review-candidate]');
  return out;
}
const show=v=>v===null?'N/A':(v*100).toFixed(1)+'%';
function markdown(result,manifest){
  const text=[
    '# Passage Counter accuracy evaluation',
    '',
    '**Evaluation:** '+String(manifest.evaluationId||'unnamed'),
    '**Algorithm:** '+String(manifest.algorithmVersion||'not specified'),
    '**Model:** '+String(manifest.modelVersion||'not specified'),
    '**Tolerance:** ±'+result.toleranceMs+' ms, direction-sensitive, one-to-one',
    '**Status:** '+result.gate.status,
    '',
    '**IMPORTANT:** This report scores exported automatic events. Corrections and Undo are excluded. A manifest declaration does not independently certify that videos, annotations or devices were tested. Do not publish a 95% product-accuracy claim solely from this report.',
    '',
    '| Data subset | Scenes | TP | FP | FN | Precision | Recall |',
    '|---|---:|---:|---:|---:|---:|---:|'
  ];
  for(const [key,g] of Object.entries(result.groups))
    text.push('| '+key+' | '+g.sceneCount+' | '+g.tp+' | '+g.fp+' | '+g.fn+' | '+show(g.precision)+' | '+show(g.recall)+' |');
  text.push('','## Standard holdout by direction','','| Direction | TP | FP | FN | Precision | Recall |','|---|---:|---:|---:|---:|---:|');
  for(const [dir,g] of Object.entries(result.groups.standard_holdout.byDirection))
    text.push('| '+dir+' | '+g.tp+' | '+g.fp+' | '+g.fn+' | '+show(g.precision)+' | '+show(g.recall)+' |');
  text.push('','## Evidence gate', '',
    'Annotated standard-holdout ground-truth count: '+result.gate.standardHoldoutTruth,
    'Numerical threshold met: '+(result.gate.passedNumericalTarget?'yes':'no'),
    'Eligible for manual evidence review: '+(result.gate.eligibleForReview?'yes':'no'),'');
  for(const reason of result.gate.reasons)text.push('- '+reason);
  text.push('','## Scene-level breakdown','','| Scene | Condition | Split | Provenance | Ground truth | TP | FP | FN | Precision | Recall |',
    '|---|---|---|---|---:|---:|---:|---:|---:|---:|');
  for(const s of result.scenes)
    text.push('| '+s.id+' | '+s.condition+' | '+s.split+' | '+s.provenance+' | '+s.truthEvents+
      ' | '+s.overall.tp+' | '+s.overall.fp+' | '+s.overall.fn+' | '+show(s.overall.precision)+' | '+show(s.overall.recall)+' |');
  text.push('','## Outstanding review items','',
    '- Confirm the video origin, license/consent, independently labeled crossings and holdout separation.',
    '- Confirm fixed camera setup, line placement, direction reversal, measured fps and device/browser details.',
    '- Classify unmatched events by inspecting the original footage. Timestamp proximity alone cannot identify model, tracker or operator error.',
    '- Confirm Android Chrome / iOS Safari and real 30-minute endurance independently.',
    '');
  return text.join('\n');
}
async function main(){
  const opts=flags(process.argv.slice(2));
  const manifestPath=resolve(opts.file),base=dirname(manifestPath);
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  if(manifest.schemaVersion!==1||!Array.isArray(manifest.scenes)||manifest.scenes.length===0)
    throw Error('Accuracy manifest requires schemaVersion 1 and a nonempty scenes array');
  const scenes=[];
  for(const scene of manifest.scenes){
    if(!scene.id||typeof scene.groundTruthCsv!=='string'||typeof scene.predictedCsv!=='string')
      throw Error('Each scene needs id, groundTruthCsv and predictedCsv');
    const truthCsv=await readFile(resolve(base,scene.groundTruthCsv),'utf8');
    const predictionCsv=await readFile(resolve(base,scene.predictedCsv),'utf8');
    scenes.push({...scene,...fromCsv({
      sceneId:scene.id,truthCsv,predictionCsv,timeBasis:scene.timeBasis||'media'
    })});
  }
  const report=evaluateScenes(scenes,{toleranceMs:manifest.toleranceMs??DEFAULT_TOLERANCE_MS});
  report.evaluation={id:manifest.evaluationId||null,algorithmVersion:manifest.algorithmVersion||null,
    modelVersion:manifest.modelVersion||null,
    metadata:manifest.metadata||{},
    scenes:scenes.map(({id,condition,split,provenance,timeBasis,device,browser,
      inferenceFps,videoSha256,notes})=>({id,condition,split,provenance,timeBasis,
      device:device||null,browser:browser||null,inferenceFps:inferenceFps??null,
      videoSha256:videoSha256||null,notes:notes||null}))};
  console.log('[accuracy] '+report.gate.status+'; '+report.gate.standardHoldoutTruth+
    ' annotated standard-condition holdout events; precision '+show(report.groups.standard_holdout.precision)+
    '; recall '+show(report.groups.standard_holdout.recall));
  if(report.gate.reasons.length)console.log('[accuracy] Unmet: '+report.gate.reasons.join('; '));
  if(opts.json){
    const out=resolve(opts.json);await mkdir(dirname(out),{recursive:true});
    await writeFile(out,JSON.stringify(report,null,2)+'\n','utf8');
    console.log('[accuracy] Wrote JSON: '+out);
  }
  if(opts.md){
    const out=resolve(opts.md);await mkdir(dirname(out),{recursive:true});
    await writeFile(out,markdown(report,manifest),'utf8');
    console.log('[accuracy] Wrote Markdown: '+out);
  }
  // The optional flag means "suitable for MANUAL evidence review", not
  // "validated accurate on all devices". Never silently mark production GO.
  if(opts.requireReview&&!report.gate.eligibleForReview)process.exitCode=2;
}
main().catch(err=>{console.error('[accuracy] '+err.stack);process.exitCode=1;});
