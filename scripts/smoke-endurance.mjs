// 20-second synthetic-camera endurance and lifecycle diagnostic.
// It is NOT a substitute for the required physical-device 30-minute test.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';
const html=await readFile('dist/index.html');
const server=createServer((req,res)=>{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);}
  else {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,errors=[],external=[];
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({permissions:['camera'],viewport:{width:1280,height:800}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{
  if(m.type()==='error'&&!/^INFO: Created TensorFlow Lite XNNPACK delegate for CPU\.$/.test(m.text()))
    errors.push(m.text());
 });
 page.on('request',r=>{if(/^https?:\/\//.test(r.url())&&!r.url().startsWith(origin+'/'))external.push(r.url())});
 const client=await context.newCDPSession(page);
 await client.send('Performance.enable');
 const metrics=async()=>{
  const r=await client.send('Performance.getMetrics');
  const values=Object.fromEntries(r.metrics.map(x=>[x.name,x.value]));
  return {heapUsed:Math.round(values.JSHeapUsedSize||0),
    heapTotal:Math.round(values.JSHeapTotalSize||0)};
 };
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#cameraStart').click();
 await page.waitForFunction(()=>/計測準備完了|Ready to count/.test(
  document.querySelector('#statusPill')?.textContent??''),null,{timeout:90000});
 await page.locator('#testButton').click();await page.locator('#testButton').click();
 await page.locator('#beginCount').click();
 await page.waitForFunction(()=>/計測中|Counting/.test(
  document.querySelector('#statusPill')?.textContent??''),null,{timeout:15000});
 const startMemory=await metrics();
 const since=Date.now();await page.waitForTimeout(20000);
 const endMemory=await metrics();
 const info=await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open('passage-counter-sessions-v1',1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  try{
   return await new Promise(resolve=>{
    const tx=db.transaction('sessions','readonly'),r=tx.objectStore('sessions').getAll();
    tx.oncomplete=()=>resolve({sessions:r.result.map(s=>({
      checkpoint:s.lastCheckpointAt,
      state:s.state,intervals:s.coverageIntervals.length}))});
    tx.onerror=()=>resolve(null);
   });
  }finally{db.close();}
 });
 const elapsed=await page.locator('#elapsedText').textContent();
 assert(info?.sessions?.length>=1,'No durable session in IndexedDB');
 assert(info.sessions.some(x=>x.state==='counting'&&x.intervals>=1),'Active counting was not checkpointed');
 assert(/00:00:1[5-9]|00:00:2[0-9]/.test(elapsed),'Elapsed time did not progress: '+elapsed);
 const diag=await page.locator('#detectorInfo').textContent();
 assert.match(diag,/EfficientDet-Lite0.*fps.*ms.*inference attempts deferred/);
 console.log('[endurance] elapsed='+(Date.now()-since)+'ms, '+elapsed+
   ', memory='+JSON.stringify({startMemory,endMemory})+
   ', diag='+diag.slice(0,240));

 // A backgrounded tab must NOT pretend to count while hidden. Simulate a
 // visibility change deterministically; wake lock release is a separate event.
 await page.evaluate(()=>{
   Object.defineProperty(document,'visibilityState',{get:()=> 'hidden',configurable:true});
   document.dispatchEvent(new Event('visibilitychange'));
 });
 assert.match(await page.locator('#statusPill').textContent(),/中断|Interrupted/);
 assert(await page.locator('#beginCount').isEnabled(),'Explicit resume action should remain available');
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',
   {get:()=> 'visible',configurable:true})});
 assert.match(await page.locator('#statusPill').textContent(),/中断|Interrupted/,
  'Tab returning to foreground must not auto-resume');
 console.log('[endurance] Hidden tab was stopped; foreground does not auto-resume.');

 // Orientation changes while counting can invalidate the physical line.
 await page.locator('#beginCount').click();
 await page.waitForFunction(()=>/計測中|Counting/.test(
   document.querySelector('#statusPill')?.textContent??''),null,{timeout:7000});
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>/中断|Interrupted/.test(
   document.querySelector('#statusPill')?.textContent??''),null,{timeout:7000});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 console.log('[endurance] Viewport rotation stopped counting with no mobile overflow.');

 assert.deepEqual(errors,[],'Uncaught browser/console errors');
 assert.deepEqual(external,[],'Unexpected remote HTTP requests');
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log('[endurance] PASS: short-run inference, IndexedDB checkpoint, hide, orientation and outbound HTTP zero');
