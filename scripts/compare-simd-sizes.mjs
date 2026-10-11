import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';

const [current,baseline]=await Promise.all([
  readFile('dist/build-size-report.json','utf8').then(JSON.parse),
  readFile('baseline/dist/build-size-report.json','utf8').then(JSON.parse)
]);
const keys=r=>new Set(r.assets.map(a=>a.dependency+'/'+a.key));
const ours=keys(current),full=keys(baseline);
for(const key of ['mediapipe/module','mediapipe/simd-loader','mediapipe/simd-wasm','person-model/tflite']){
  assert(ours.has(key),'SIMD-only bundle is missing '+key);
  assert(full.has(key),'Full MediaPipe bundle is missing '+key);
}
for(const key of ['mediapipe/baseline-loader','mediapipe/baseline-wasm']){
  assert(full.has(key),'Control HTML must contain '+key);
  assert(!ours.has(key),'SIMD-only HTML must not contain '+key);
}
const model=(r)=>r.assets.find(a=>a.dependency==='person-model'&&a.key==='tflite');
assert.equal(model(current).originalBytes,model(baseline).originalBytes,
  'The detector model was changed between variants');
assert.equal(model(current).storedBytes,model(baseline).storedBytes,
  'The detector model storage differs between variants');
const before=baseline.readableHtmlBytes,after=current.readableHtmlBytes;
const removed=before-after,pct=100*removed/before;
assert(Number.isInteger(before)&&Number.isInteger(after),'Invalid HTML size report');
assert(removed>3_000_000,'Removing non-SIMD WASM did not save at least 3MB');
const result={
  comparison:'exact same source revision, only WASM asset inclusion and support gating differ',
  beforeHtmlBytes:before,simdOnlyHtmlBytes:after,bytesSaved:removed,
  percentSaved:Number(pct.toFixed(2)),simdSelfExtractBytes:current.selfExtractHtmlBytes,
  baselineSelfExtractBytes:baseline.selfExtractHtmlBytes,
  includes:['model','MediaPipe JS module','SIMD loader','SIMD WASM'],
  excludes:['non-SIMD loader','non-SIMD WASM'],
  inferenceValidation:'browser smoke separate',realMobileValidation:'not yet done'
};
await writeFile('dist/simd-only-comparison.json',JSON.stringify(result,null,2)+'\n');
console.log('[simd-size] '+JSON.stringify(result));
