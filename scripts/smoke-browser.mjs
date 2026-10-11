// CI-only browser smoke for the complete generated single HTML.
// Uses Chrome's synthetic camera; this confirms initialization, not counting accuracy.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from '../.smoke/node_modules/playwright/index.mjs';

const html = await readFile('dist/index.html');
const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(html);
  } else {
    res.writeHead(404); res.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const origin = 'http://127.0.0.1:' + address.port;
let browser;
let passed = false;
const errors = [];
const outgoing = [];
try {
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--no-default-browser-check'
    ]
  });
  const context = await browser.newContext({ permissions: ['camera'], viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = request.url();
    if (/^https?:\/\//.test(url) && !url.startsWith(origin + '/')) {
      outgoing.push(url);
    }
  });
  page.on('console', message => {
    // MediaPipe's XNNPACK native initialization emits an INFO line on console.error.
    // It is not a runtime failure, so exclude only this known informational message.
    if (message.type() === 'error' &&
        !/^INFO: Created TensorFlow Lite XNNPACK delegate for CPU\.$/.test(message.text())) {
      errors.push(message.text());
    }
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const assets = await page.evaluate(() => window.StandaloneAssets?.list?.() ?? []);
  for (const expected of [
    'mediapipe/module', 'mediapipe/simd-loader', 'mediapipe/simd-wasm', 'person-model/tflite'
  ]) {
    assert(assets.includes(expected), 'Missing asset in readable HTML: ' + expected);
  }
  for(const forbidden of ['mediapipe/baseline-loader','mediapipe/baseline-wasm']){
    assert(!assets.includes(forbidden), 'SIMD-only package must exclude '+forbidden);
  }
  console.log('[simd] No non-SIMD WASM or loader is embedded.');

  // Cryptographically assert the model bytes inside HTML really match the locked source.
  const modelSha = await page.evaluate(async () => {
    const bytes=await window.StandaloneAssets.bytesAsync('person-model','tflite');
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  });
  assert.equal(modelSha,'0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb');
  for(const key of ['simd-wasm']){
    const magic=await page.evaluate(async key=>
      Array.from((await window.StandaloneAssets.bytesAsync('mediapipe',key)).slice(0,4)),key);
    assert.deepEqual(magic,[0,97,115,109],'WASM magic mismatch for '+key);
  }
  const sectionReport=await page.evaluate(async()=>{
    function varint(a,offset){
      let value=0,shift=0;
      for(let i=0;i<5;i++){
        const b=a[offset++];value+=(b&0x7f)*2**shift;
        if(!(b&0x80))return {value,next:offset};
        shift+=7;
      }
      throw new Error('Invalid WASM section size');
    }
    const out=[];
    for(const key of ['simd-wasm']){
      const bytes=await window.StandaloneAssets.bytesAsync('mediapipe',key);
      const custom=[];
      let cursor=8;
      while(cursor<bytes.length){
        const id=bytes[cursor++];
        const chunk=varint(bytes,cursor);
        cursor=chunk.next;
        const end=cursor+chunk.value;
        if(end>bytes.length)throw new Error('Malformed WASM section');
        if(id===0){
          const nameLen=varint(bytes,cursor);
          const name=new TextDecoder().decode(bytes.subarray(nameLen.next,nameLen.next+nameLen.value));
          custom.push({name,bytes:end-(cursor-1)});
        }
        cursor=end;
      }
      out.push({key,bytes:bytes.length,custom});
    }
    return out;
  });
  for(const part of sectionReport){
    console.log('[wasm-size] '+part.key+' custom sections: '+
      JSON.stringify(part.custom.map(s=>({name:s.name,bytes:s.bytes}))));
  }
  console.log('[smoke] All bundled model, WASM, and loader assets are present.');
  const cameraStartMs=Date.now();
  await page.locator('#cameraStart').click();
  await page.waitForFunction(() => {
    return /計測準備完了|Ready to count/.test(document.querySelector('#statusPill')?.textContent ?? '');
  }, null, { timeout: 90_000 });
  assert(await page.locator('#cameraFeed').evaluate(video => video.videoWidth > 0), 'Camera should provide frames');
  await page.waitForFunction(() => /\bfps\b/.test(document.querySelector('#detectorInfo')?.textContent ?? ''), null, { timeout: 30_000 });
  assert.match(await page.locator('#detectorInfo').textContent(), /EfficientDet/);
  console.log('[perf] Synthetic Chrome camera and bundled model ready after '+(Date.now()-cameraStartMs)+'ms; not a mobile benchmark.');
  assert(await page.locator('#recognitionStatus').isVisible(),'Plain-language recognition status not shown');
  assert(await page.locator('#diagnosticDetails').count()===1,'Processing metrics details are missing');
  console.log('[smoke] MediaPipe initialized from offline HTML and fake camera is live.');

  // Verify real detectForVideo passes with the only bundled SIMD loader,
  // recording frame inference times. Fake camera tests do not measure accuracy.
  const simdBenchmark=await page.evaluate(async()=>{
    const mp=await window.StandaloneAssets.importModule('mediapipe','module');
    const urls=[
      await window.StandaloneAssets.blobUrlAsync('mediapipe','simd-loader'),
      await window.StandaloneAssets.blobUrlAsync('mediapipe','simd-wasm')
    ];
    let detector=null;
    try{
      detector=await mp.ObjectDetector.createFromOptions({
        wasmLoaderPath:urls[0],wasmBinaryPath:urls[1]
      },{
        baseOptions:{modelAssetBuffer:await window.StandaloneAssets.bytesAsync('person-model','tflite'),delegate:'CPU'},
        runningMode:'VIDEO',categoryAllowlist:['person'],scoreThreshold:0.45,maxResults:12
      });
      const video=document.querySelector('#cameraFeed');
      const durations=[];
      for(let i=0;i<10;i++){
        const started=performance.now();
        const result=detector.detectForVideo(video,started+1000*i);
        if(!Array.isArray(result?.detections))throw Error('No detector result for frame '+i);
        durations.push(performance.now()-started);
      }
      return durations;
    }finally{
      if(detector)detector.close();
      urls.forEach(url=>URL.revokeObjectURL(url));
    }
  });
  assert.equal(simdBenchmark.length,10,'SIMD inference sample count');
  const sorted=[...simdBenchmark].sort((a,b)=>a-b);
  console.log('[simd] Ten live video inference passes; median '+
    sorted[5].toFixed(1)+'ms in CI (not mobile and not a count accuracy metric).');

  // Benchmark the first on-device model/camera boot in the synthetic CI environment.
  // This is diagnostic only; desktop CI is not a substitute for mobile timing.
  // Setup test must be complete before real counting, and must never mutate totals.
  assert(await page.locator('#beginCount').isDisabled(), 'Counting cannot start before setup test');
  assert(await page.locator('#minusA').isDisabled(), 'Cannot subtract before session');
  await page.locator('#testButton').click();
  assert.match(await page.locator('#statusPill').textContent(), /設置テスト中|Testing setup/);
  assert(await page.locator('#beginCount').isDisabled(), 'Counting is disabled during calibration');
  assert(await page.locator('#plusA').isDisabled(), 'Corrections are disabled during calibration');
  await page.locator('#testButton').click(); // Explicit early finish; 30-second auto stop also exists.
  assert(await page.locator('#testResult').isVisible(), 'Trial results should be visible');
  assert.equal((await page.locator('#countTotal').textContent()).trim(),'0',
    'Trial events must never become session counts');
  await page.locator('#setupOptions > summary').click();
  await page.locator('#labelA').fill('Entry');
  await page.locator('#labelB').fill('Exit');
  assert.equal((await page.locator('#displayLabelA').textContent()).trim(),'Entry');
  assert(await page.locator('#beginCount').isEnabled(), 'Ready after setup test');

  // Switching the selected camera forces a fresh setup test.
  await page.locator('#cameraFacing').selectOption('user');
  await page.waitForFunction(() =>
    /計測準備完了|Ready to count/.test(document.querySelector('#statusPill')?.textContent ?? '') &&
    !document.querySelector('#testButton').disabled,
    null,{timeout:90_000});
  assert(await page.locator('#beginCount').isDisabled(), 'Changing camera invalidates previous test');
  await page.locator('#testButton').click();
  await page.locator('#testButton').click();

  // Moving either counting-line endpoint also invalidates the setup test.
  await page.locator('#overlay').focus();
  await page.keyboard.press('ArrowDown');
  assert(await page.locator('#beginCount').isDisabled(), 'Moving counting line invalidates calibration');
  await page.locator('#testButton').click();
  await page.locator('#testButton').click();
  assert(await page.locator('#beginCount').isEnabled(), 'New setup test clears calibration gate');

  const savedSetup=await page.evaluate(()=>JSON.parse(localStorage.getItem('passage-counter-setup-v1')));
  assert.equal(savedSetup.cameraFacing,'user');
  assert.equal(savedSetup.labelA,'Entry');
  assert.equal(savedSetup.labelB,'Exit');
  assert(savedSetup.line[0].y>.52,'Line position was not saved after keyboard move');

  await page.locator('#beginCount').click();
  assert.match(await page.locator('#statusPill').textContent(), /計測中|Counting/);
  assert(await page.locator('#testButton').isDisabled(), 'Cannot calibrate during a session');
  assert(await page.locator('#minusB').isDisabled(), 'A zero count cannot go below zero');
  await page.locator('#plusA').click();
  assert.equal((await page.locator('#countA').textContent()).trim(),'1');
  await page.locator('#undoCorrection').click();
  assert.equal((await page.locator('#countA').textContent()).trim(),'0');
  assert(await page.locator('#undoCorrection').isDisabled(), 'Undo cannot run twice');
  await page.locator('#plusB').click();
  await page.locator('#minusB').click();
  assert.equal((await page.locator('#countB').textContent()).trim(),'0');
  await page.locator('#pauseCount').click();
  assert.match(await page.locator('#statusPill').textContent(), /一時停止|Paused/);
  assert(await page.locator('#beginCount').isEnabled(), 'Can resume after calibration');
  await page.locator('#beginCount').click();
  await page.locator('#finishCount').click();
  assert(await page.locator('#report').isVisible(), 'Result should be visible after finish');
  assert.equal((await page.locator('#reportTotal').textContent()).trim(),'0');
  await page.locator('#outputFilename').fill('passage-checked');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#downloadButton').click();
  const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'passage-checked.csv');
  const csv=await readFile(await download.path(),'utf8');
  assert(csv.includes('"direction_label"') && csv.includes('"undo_of"'), 'CSV must include the audit columns');
  assert(csv.includes('"correction"') && csv.includes('"undo"'), 'CSV must include adjustments and Undo');
  assert(!csv.includes('"test"'), 'Calibration rows must never appear in session export');
  assert(csv.includes('"Entry"') && csv.includes('"Exit"'), 'CSV includes custom direction labels');

  await page.waitForFunction(()=>document.querySelectorAll('#savedList .saved-session').length>=1,
    null,{timeout:15000});
  const summaryPromise=page.waitForEvent('download');
  await page.locator('#summaryButton').click();
  const summaryCsv=await readFile(await (await summaryPromise).path(),'utf8');
  assert(summaryCsv.includes('"observed_ms"')&&summaryCsv.includes('"missing_ms"'));
  assert(summaryCsv.includes('"total_crossings"')&&summaryCsv.includes('"final_a"'));
  const intervalPromise=page.waitForEvent('download');
  await page.locator('#intervalsButton').click();
  const intervalsCsv=await readFile(await (await intervalPromise).path(),'utf8');
  assert(intervalsCsv.includes('"coverage_status"')&&intervalsCsv.includes('"bucket_minutes"'));
  assert(intervalsCsv.includes('"observed_seconds"')&&intervalsCsv.includes('"missing_seconds"'));
  assert(await page.locator('#timelineSection').isVisible(),'Time aggregation should be visible');
  await page.locator('#aggregationMinutes').selectOption('15');
  assert.equal(await page.locator('#aggregationMinutes').inputValue(),'15');

  // Completed session remains available after a fresh reload.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('#savedList .saved-session').length>=1,
    null,{timeout:15000});
  await page.locator('#savedList .saved-session').first().locator('button').first().click();
  await page.waitForFunction(()=>document.querySelector('#report')?.hidden===false,null,{timeout:15000});
  assert.equal((await page.locator('#reportTotal').textContent()).trim(),'0');
  assert(await page.locator('#timelineSection').isVisible(),'Timeline restored from IndexedDB');
  console.log('[persistence] Completed session and time aggregation survived page reload.');

  // Crash-recovery: an unfinished session must not restart live counting.
  const crashPage=await context.newPage();
  crashPage.on('pageerror',error=>errors.push('recovery: '+error.message));
  crashPage.on('request',request=>{
    const url=request.url();
    if(/^https?:\/\//.test(url)&&!url.startsWith(origin+'/'))outgoing.push('recovery: '+url);
  });
  await crashPage.goto(origin,{waitUntil:'domcontentloaded'});
  await crashPage.locator('#cameraStart').click();
  await crashPage.waitForFunction(()=>
    /計測準備完了|Ready to count/.test(document.querySelector('#statusPill')?.textContent??''),
    null,{timeout:90000});
  await crashPage.locator('#testButton').click();
  await crashPage.locator('#testButton').click();
  await crashPage.locator('#beginCount').click();
  await crashPage.locator('#plusA').click();
  assert.equal((await crashPage.locator('#countA').textContent()).trim(),'1');
  // Save queue commits session and adjustment before simulating reload.
  await crashPage.waitForFunction(async()=>{
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('passage-counter-sessions-v1',1);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    try{
      return await new Promise(resolve=>{
        const tx=db.transaction(['sessions','events'],'readonly');
        const sessions=tx.objectStore('sessions').getAll();
        const events=tx.objectStore('events').getAll();
        tx.oncomplete=()=>resolve(sessions.result?.length>=2 && events.result?.some(e=>e.kind==='manual_adjustment'&&e.delta===1));
        tx.onerror=()=>resolve(false);
      });
    }finally{db.close();}
  },null,{timeout:15000});
  await crashPage.reload({waitUntil:'domcontentloaded'});
  await crashPage.waitForFunction(()=>document.querySelectorAll('#savedList .saved-session').length>=2,
    null,{timeout:15000});
  await crashPage.locator('#savedList .saved-session').first().locator('button').first().click();
  await crashPage.waitForFunction(()=>document.querySelector('#countA')?.textContent==='1',
    null,{timeout:15000});
  assert.match(await crashPage.locator('#statusPill').textContent(),/中断|Interrupted/);
  assert(await crashPage.locator('#beginCount').isDisabled(),'Interrupted session cannot silently resume');
  assert.equal((await crashPage.locator('#countA').textContent()).trim(),'1');
  const recoveryDl=crashPage.waitForEvent('download');
  await crashPage.locator('#downloadButton').click();
  const recoveredCsv=await readFile(await (await recoveryDl).path(),'utf8');
  assert(recoveredCsv.includes('"manual_adjustment"')&&recoveredCsv.includes('"correction"'),
    'Restored manual adjustment remains in the auditable CSV');
  assert(await crashPage.locator('#coverageSummary').isVisible());
  console.log('[persistence] Interrupted session recovered stopped with saved adjustment.');

  // Deleting a finished session removes its IndexedDB record and events.
  await crashPage.locator('#savedList .saved-session').first().locator('button.danger').click();
  await crashPage.locator('#confirmReset').click();
  await crashPage.waitForFunction(()=>document.querySelectorAll('#savedList .saved-session').length===1,
    null,{timeout:15000});
  console.log('[persistence] Confirmed deletion removed saved session from the list.');
  await crashPage.close();

  // IndexedDB-disabled browsers must warn and still allow in-memory CSV rescue.
  const failedContext=await browser.newContext({permissions:['camera']});
  await failedContext.addInitScript(()=>{
    Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});
  });
  const failedPage=await failedContext.newPage();
  failedPage.on('pageerror',error=>errors.push('storage blocked: '+error.message));
  await failedPage.goto(origin,{waitUntil:'domcontentloaded'});
  await failedPage.waitForFunction(()=>/保存できません|Cannot save/.test(
    document.querySelector('#storageNotice')?.textContent??''),null,{timeout:10000});
  await failedPage.locator('#cameraStart').click();
  await failedPage.waitForFunction(()=>
    /計測準備完了|Ready to count/.test(document.querySelector('#statusPill')?.textContent??''),
    null,{timeout:90000});
  await failedPage.locator('#testButton').click();
  await failedPage.locator('#testButton').click();
  await failedPage.locator('#beginCount').click();
  await failedPage.locator('#plusB').click();
  assert.equal((await failedPage.locator('#countB').textContent()).trim(),'1');
  const rescue=failedPage.waitForEvent('download');
  await failedPage.locator('#downloadButton').click();
  const rescueCsv=await readFile(await (await rescue).path(),'utf8');
  assert(rescueCsv.includes('"correction"'),'CSV rescue unavailable when IndexedDB is blocked');
  assert(await failedPage.locator('#storageNotice').isVisible(),'Storage failure warning disappeared');
  await failedContext.close();
  console.log('[persistence] IndexedDB-disabled client retains memory counts and exports CSV.');

  if((await page.locator('html').getAttribute('lang'))!=='en')await page.locator('#languageButton').click();
  assert.match(await page.locator('#pageTitle').textContent(), /Count people/);
  assert.equal(await page.locator('#brandName').textContent(),'Passage Counter');
  assert.equal(await page.locator('#versionBadge').textContent(),'v0.9.0');
  assert.equal(await page.locator('#languageButton').textContent(),'JA');
  assert.match(await page.locator('#languageButton').getAttribute('aria-label'),/Japanese/);
  assert.match(await page.locator('.local-badge').textContent(),/local processing/i);
  assert.equal(await page.locator('#helpButton svg').count(),1);
  await page.setViewportSize({ width: 360, height: 740 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow on mobile');
  await page.setViewportSize({ width: 320, height: 640 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow at 320px');
  await page.setViewportSize({ width: 740, height: 360 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow in landscape');
  console.log('[smoke] Calibration separation, correction/Undo audit, CSV, i18n and mobile layout passed.');
  // The one-file requirement includes direct local opening, not just localhost.
  for (const filename of ['dist/index.html','dist/index.self-extract.html']) {
    const localPage=await context.newPage();
    localPage.on('pageerror', error => errors.push(filename+': '+error.message));
    localPage.on('request', request => {
      const url=request.url();
      if (/^https?:\/\//.test(url)) outgoing.push(filename+': '+url);
    });
    localPage.on('console', message => {
      if(message.type()==='error' &&
         !/^INFO: Created TensorFlow Lite XNNPACK delegate for CPU\.$/.test(message.text())) {
        errors.push(filename+': '+message.text());
      }
    });
    await localPage.goto(pathToFileURL(resolve(filename)).href,
      {waitUntil:'domcontentloaded',timeout:90_000});
    await localPage.locator('#cameraStart').waitFor({timeout:90_000});
    await localPage.locator('#cameraStart').click();
    await localPage.waitForFunction(() =>
      /計測準備完了|Ready to count/.test(document.querySelector('#statusPill')?.textContent ?? ''),
      null, {timeout:90_000});
    assert(await localPage.locator('#cameraFeed').evaluate(video=>video.videoWidth>0),
      filename+': local-file camera has no video');
    await localPage.waitForFunction(() => /\bfps\b/.test(document.querySelector('#detectorInfo')?.textContent ?? ''),null,{timeout:30_000});
    console.log('[smoke] Direct local '+filename+' launched embedded AI and camera.');
    await localPage.close();
  }
  // Unsupported browsers should never request camera permission.
  const noSimdPage=await context.newPage();
  noSimdPage.on('pageerror',err=>errors.push('No-SIMD page: '+err.message));
  await noSimdPage.addInitScript(()=>{
    Object.defineProperty(WebAssembly,'validate',{configurable:true,value:()=>false});
  });
  await noSimdPage.goto(origin,{waitUntil:'domcontentloaded'});
  assert(await noSimdPage.locator('#cameraStart').isDisabled(),
    'SIMD-unsupported clients must not start the camera');
  assert.match(await noSimdPage.locator('#statusDetails').textContent(),/ブラウザ|browser/i);
  if((await noSimdPage.locator('html').getAttribute('lang'))!=='en')await noSimdPage.locator('#languageButton').click();
  assert.match(await noSimdPage.locator('#statusDetails').textContent(),/browser lacks a feature/i);
  await noSimdPage.close();
  console.log('[simd] Unsupported browser correctly blocks camera and explains the limitation in both languages.');
  assert.deepEqual(outgoing, [], 'Unexpected external HTTP requests');
  assert.deepEqual(errors, [], 'Console or unhandled errors occurred');
  passed = true;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (!passed) process.exitCode = 1;
else console.log('[smoke] PASS: no external HTTP request during cold camera/model initialization.');
