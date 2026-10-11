// v0.5.0 Chrome E2E: true browser-encoded local WebM, not a mocked file.
// Tests deterministic source/seek/count invariants and no movie persistence.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';

const html=await readFile('dist/index.html');
const server=createServer((req,res)=>{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'});res.end(html);}
  else {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const incomingErrors=[],external=[];
let browser;
function observe(page,label){
  page.on('pageerror',e=>incomingErrors.push(label+': '+e.message));
  page.on('request',r=>{
    if(/^https?:\/\//.test(r.url())&&!r.url().startsWith(origin+'/'))
      external.push(label+': '+r.url());
  });
  page.on('console',m=>{
    if(m.type()==='error'&&!/^INFO: Created TensorFlow Lite XNNPACK delegate for CPU\.$/.test(m.text()))
      incomingErrors.push(label+' console: '+m.text());
  });
}
async function awaitLoaded(page){
  try{
    await page.waitForFunction(()=>/動画準備完了|Video ready/.test(
      document.querySelector('#statusPill')?.textContent??'') &&
      !document.querySelector('#beginCount')?.disabled,
      null,{timeout:30000});
  }catch(error){
    const info=await page.evaluate(()=>{
      const v=document.querySelector('#cameraFeed');
      return {pill:document.querySelector('#statusPill')?.textContent,
        details:document.querySelector('#statusDetails')?.textContent,
        file:document.querySelector('#videoFileStatus')?.textContent,
        videoReadyState:v?.readyState,videoError:v?.error?.code,
        videoDuration:v?.duration,videoCurrentTime:v?.currentTime,
        sourceMode:document.querySelector('#sourceMode')?.value,
        fileSource:v?.currentSrc?.slice(0,100),
        countDisabled:document.querySelector('#beginCount')?.disabled};
    });
    console.log('[video-diagnostic] '+JSON.stringify(info));
    throw error;
  }
}
async function startAnalysis(page){
  await page.locator('#beginCount').click();
  await page.waitForFunction(()=>/計測中|Counting/.test(
    document.querySelector('#statusPill')?.textContent??''),
    null,{timeout:15000});
}
async function triggerSeek(page,milli){
  await page.locator('#videoSeek').evaluate((el,value)=>{
    el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}));
  },milli);
}
async function waitSaved(page,count=1){
  await page.waitForFunction(n=>document.querySelectorAll('#savedList .saved-session').length>=n,
    count,{timeout:15000});
}
try{
  browser=await chromium.launch({channel:'chrome',headless:true,
    args:['--no-default-browser-check']});
  const context=await browser.newContext({viewport:{width:850,height:780},acceptDownloads:true});
  const page=await context.newPage();observe(page,'http');
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  const base64=await page.evaluate(async()=>{
    if(!('MediaRecorder' in window))throw Error('MediaRecorder missing in synthetic Chrome');
    const options=['video/webm;codecs=vp8','video/webm;codecs=vp9','video/webm'];
    const codec=options.find(x=>MediaRecorder.isTypeSupported(x));
    if(!codec)throw Error('MediaRecorder WebM not supported');
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
    const ctx=canvas.getContext('2d');
    const stream=canvas.captureStream(15);
    const recorder=new MediaRecorder(stream,{mimeType:codec});
    const chunks=[];
    recorder.addEventListener('dataavailable',e=>{if(e.data.size)chunks.push(e.data)});
    const done=new Promise((resolve,reject)=>{
      recorder.addEventListener('stop',resolve,{once:true});
      recorder.addEventListener('error',e=>reject(e.error||Error('Video recording failed')),{once:true});
    });
    let f=0;
    function frame(){
      ctx.fillStyle='#e8f0ea';ctx.fillRect(0,0,320,240);
      ctx.fillStyle='#244a3a';
      ctx.beginPath();ctx.arc(40+(f%65)*3,48,21,0,Math.PI*2);ctx.fill();
      ctx.fillRect(20+(f%65)*3,69,40,90);
      ctx.fillStyle='#679c81';ctx.fillRect(0,197,320,43);
      f++;
    }
    frame();recorder.start(250);
    const timer=setInterval(frame,66);
    await new Promise(resolve=>setTimeout(resolve,3200));
    clearInterval(timer);recorder.stop();
    await done;stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(chunks,{type:'video/webm'});
    if(blob.size<1000)throw Error('Synthetic WebM has no media bytes');
    const url=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return String(url).split(',')[1];
  });
  const fixture=Buffer.from(base64,'base64');
  console.log('[video] Browser-encoded WebM fixture bytes '+fixture.length);
  assert(fixture.length>1000);
  await page.locator('#sourceMode').selectOption('file');
  await page.locator('#videoSourceBox').waitFor({state:'visible'});
  await page.locator('#videoFile').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('#videoFile').disabled,null,{timeout:8000});
  assert(await page.locator('#cameraStart').isHidden(),'Camera action must disappear for local video');
  await page.locator('#videoFile').setInputFiles({name:'synthetic-local.webm',mimeType:'video/webm',buffer:fixture});
  await awaitLoaded(page);
  assert(await page.locator('#videoSeek').isEnabled());
  assert(await page.locator('#testCard').isHidden(),'Camera calibration must not be required for recorded video');
  assert(await page.locator('#videoFileStatus').textContent().then(t=>t.includes('synthetic-local.webm')));
  assert(await page.locator('#cameraFeed').evaluate(v=>v.videoWidth===320 && v.videoHeight===240),
    'Browser did not decode local WebM dimensions');
  console.log('[video] Decoded local file, camera permission not required.');
  // Seeking during setup previews a frame, and starting analysis always
  // resets to t=0. The local file is not retained in IndexedDB.
  await triggerSeek(page,400);
  await page.waitForFunction(()=>document.querySelector('#cameraFeed')?.currentTime>.5,
    null,{timeout:15000});
  await startAnalysis(page);
  await page.locator('#plusA').click();
  assert(Number(await page.locator('#countA').textContent())>=1);
  // Moving the position during analysis pauses and asks before discarding data.
  await triggerSeek(page,700);
  await page.locator('#confirmDialog').waitFor({state:'visible',timeout:10000});
  await page.locator('#cancelReset').click();
  assert(Number(await page.locator('#countA').textContent())>=1,
    'Rejected seek should retain recorded counts');
  await triggerSeek(page,800);
  await page.locator('#confirmDialog').waitFor({state:'visible',timeout:10000});
  await page.locator('#confirmReset').click();
  await page.waitForFunction(()=>document.querySelector('#countTotal')?.textContent==='0',
    null,{timeout:12000});
  assert(await page.locator('#beginCount').isEnabled(),'Counting should be ready for a fresh analysis');
  console.log('[video] Seek after counting requires confirmation and clears previous history.');
  await startAnalysis(page);
  await page.locator('#plusB').click();
  assert(Number(await page.locator('#countB').textContent())>=1);
  await page.locator('#pauseCount').click();
  const evtDownload=page.waitForEvent('download');
  await page.locator('#downloadButton').click();
  const csv=await readFile(await(await evtDownload).path(),'utf8');
  assert(csv.startsWith('\ufeff'),'CSV should have UTF-8 BOM');
  assert(csv.includes('"source_time_ms"'),'Source media timestamp column absent');
  assert(csv.includes('"manual_adjustment"'),'Video correction audit row absent');
  const summaryDownload=page.waitForEvent('download');
  await page.locator('#summaryButton').click();
  const summary=await readFile(await(await summaryDownload).path(),'utf8');
  assert(summary.includes('"file"'),'File-based session sourceType absent from summary CSV');
  await waitSaved(page);
  const stored=await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{
      const r=indexedDB.open('passage-counter-sessions-v1',1);
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
    try{return await new Promise(resolve=>{
      const tx=db.transaction(['sessions','events'],'readonly');
      const sessions=tx.objectStore('sessions').getAll();
      const events=tx.objectStore('events').getAll();
      tx.oncomplete=()=>resolve({sessions:sessions.result,events:events.result});
      tx.onerror=()=>resolve(null);
    });}finally{db.close();}
  });
  assert(stored?.sessions?.some(s=>s.sourceType==='file'),
    'File-mode session was not persisted');
  assert(stored?.events?.some(e=>Number.isFinite(e.sourceTimeMs)),
    'Media timestamps missing from saved video events');
  assert(!JSON.stringify(stored).includes('synthetic-local.webm'),
    'Video filename should not be persisted');
  assert(!JSON.stringify(stored).includes('data:video/')&&!JSON.stringify(stored).includes('blob:'),
    'File bytes or Blob URLs must not be persisted');
  // A video session can be reviewed after reload, but the video itself must
  // not be present or play without a fresh explicit file selection.
  await page.reload({waitUntil:'domcontentloaded'});
  await waitSaved(page);
  await page.locator('#savedList .saved-session').first().locator('button').first().click();
  await page.waitForFunction(()=>document.querySelector('#countB')?.textContent==='1',
    null,{timeout:15000}).catch(async()=>{
      assert(Number(await page.locator('#countB').textContent())>=1);
    });
  assert(await page.locator('#videoPlayback').isHidden(),'Video persisted across reload');
  assert(await page.locator('#beginCount').isDisabled(),'Video session must never auto-restart');
  assert(await page.locator('#videoSourceBox').isVisible());
  console.log('[video] IndexedDB restores counts and timestamps, without retaining video.');
  await page.setViewportSize({width:320,height:640});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
    'Horizontal overflow on phone layout');
  await page.locator('#languageSelect').selectOption('en');
  assert.match(await page.locator('#savedHeading').textContent(),/Saved sessions/);
  await page.close();

  // Local file HTML: actual model/WASM/video decoding with no HTTP requests.
  const local=await context.newPage();observe(local,'file');
  await local.goto(pathToFileURL(resolve('dist/index.html')).href,{waitUntil:'domcontentloaded'});
  await local.locator('#sourceMode').selectOption('file');
  await local.locator('#videoSourceBox').waitFor({state:'visible'});
  await local.waitForFunction(()=>!document.querySelector('#videoFile').disabled,null,{timeout:8000});
  await local.locator('#videoFile').setInputFiles({name:'local-file-webm.webm',mimeType:'video/webm',buffer:fixture});
  await awaitLoaded(local);
  await startAnalysis(local);
  await local.locator('#plusA').click();
  assert(Number(await local.locator('#countA').textContent())>=1);
  console.log('[video] file:// HTML decoded local WebM and initialized the embedded SIMD detector.');
  await local.close();
  assert.deepEqual(external,[],'Unexpected external HTTP requests');
  assert.deepEqual(incomingErrors,[],'Unhandled browser or console errors');
  console.log('[video] PASS: local decode, seek/reset, persistence, CSV, file:// and HTTP zero');
  await context.close();
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
