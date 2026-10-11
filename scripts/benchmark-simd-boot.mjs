import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';

const [baseline,simd]=await Promise.all([
 readFile('baseline/dist/index.html'),readFile('dist/index.html')
]);
const srv=createServer((req,res)=>{
 const body=req.url==='/full'?baseline:req.url==='/simd'?simd:null;
 if(!body){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'});
 res.end(body);
});
await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+srv.address().port;
let browser;
const samples=[];
try{
 browser=await chromium.launch({
  channel:'chrome',headless:true,
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--no-default-browser-check']
 });
 for(const variant of ['full','simd']){
  const context=await browser.newContext({permissions:['camera'],viewport:{width:1280,height:800}});
  const page=await context.newPage();
  const external=[],errors=[];
  page.on('request',r=>{if(/^https?:\/\//.test(r.url())&&!r.url().startsWith(origin+'/'))external.push(r.url());});
  page.on('pageerror',err=>errors.push(err.message));
  const startLoad=Date.now();
  await page.goto(origin+'/'+variant,{waitUntil:'domcontentloaded',timeout:90000});
  const parsedMs=Date.now()-startLoad;
  const startCamera=Date.now();
  await page.locator('#cameraStart').click();
  await page.waitForFunction(()=>
    /計測準備完了|Ready to count/.test(document.querySelector('#statusPill')?.textContent??''),null,{timeout:90000});
  const readyMs=Date.now()-startCamera;
  await page.waitForFunction(()=>/\bfps\b/.test(document.querySelector('#detectorInfo')?.textContent??''),null,{timeout:30000});
  // Both variants should use SIMD in this Chrome environment.
  const mp=await page.evaluate(()=>window.StandaloneAssets?.list?.()??[]);
  assert(mp.includes('mediapipe/simd-wasm'));
  assert.equal(external.length,0,'Unexpected remote request in '+variant);
  assert.deepEqual(errors,[],'Browser errors in '+variant);
  samples.push({variant,htmlBytes:variant==='full'?baseline.length:simd.length,
    loadToDomContentLoadedMs:parsedMs,cameraClickToReadyMs:readyMs,
    sameDetector:true,wasmFlavor:'simd',externalHttpRequests:external.length});
  console.log('[simd-boot] '+variant+' '+JSON.stringify(samples.at(-1)));
  await context.close();
 }
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>srv.close(resolve));
}
await writeFile('dist/simd-boot-comparison.json',JSON.stringify({
  note:'Single-run Windows Chrome fake-camera diagnostics; no mobile inference FPS or precision evidence',
  samples
},null,2)+'\n');
