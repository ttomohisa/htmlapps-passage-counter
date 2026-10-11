// v0.7.0 integration: Windows Chrome/Edge (desktop, synthetic camera),
// bilingual error states, real bundled inference, CSV, CSP and cold offline HTML.
// This is NOT an Android/iPhone or real 30-minute field test.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';

const html=await readFile('dist/index.html','utf8');
const csp=html.match(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]+content="([^"]+)"/i)?.[1];
assert(csp,'Built HTML must carry a CSP');
assert.match(csp,/connect-src\s+blob:\s*;/);
assert.doesNotMatch(csp,/connect-src[^;]*(?:https?:|\*)/i);
const server=createServer((req,res)=>{
  if(req.url==='/'||req.url==='/index.html'){
    res.writeHead(200,{
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'no-store',
      // Enforce the same policy via HTTP header AND the embedded meta tag.
      'Content-Security-Policy':csp
    });
    res.end(html);
  }else{res.writeHead(404);res.end('Not found');}
});
await new Promise(yes=>server.listen(0,'127.0.0.1',yes));
const origin='http://127.0.0.1:'+server.address().port;
const outgoing=[],pageErrors=[];
const observedCsp=async page=>{
  await page.addInitScript(()=>{
    window.__v07Csp=[];
    document.addEventListener('securitypolicyviolation',e=>{
      window.__v07Csp.push({directive:e.effectiveDirective,blocked:e.blockedURI});
    });
  });
};
const attach=(page,label)=>{
  page.on('pageerror',e=>pageErrors.push(label+': '+e.message));
  page.on('request',request=>{
    const url=request.url();
    if(/^https?:\/\//i.test(url)&&!url.startsWith(origin+'/'))
      outgoing.push(label+': '+url);
  });
};
async function language(page,expected){
  if((await page.locator('html').getAttribute('lang'))!==expected)
    await page.locator('#languageButton').click();
  assert.equal(await page.locator('html').getAttribute('lang'),expected);
  assert.equal(await page.locator('#brandName').textContent(),
    expected==='ja'?'通過カウンター':'Passage Counter');
  assert.equal(await page.locator('#cameraFeed').getAttribute('aria-label'),
    expected==='ja'?'カメラ・動画のプレビュー':'Camera or local video preview');
  assert.equal(await page.locator('#aggregationMinutes').getAttribute('aria-label'),
    expected==='ja'?'集計の時間間隔':'Aggregation interval');
}
async function assertCsp(page,label){
  const violations=await page.evaluate(()=>window.__v07Csp||[]);
  assert.deepEqual(violations,[],'CSP violations in '+label);
}
async function waitCamera(page){
  await page.locator('#cameraStart').click();
  await page.waitForFunction(()=>/計測準備完了|Ready to count/.test(
    document.querySelector('#statusPill')?.textContent??''),null,{timeout:90000});
  assert(await page.locator('#cameraFeed').evaluate(el=>el.videoWidth>0));
}
let tested=0;
try{
  await mkdir('dist/screenshots',{recursive:true});
  for(const channel of ['chrome','msedge']){
    const browser=await chromium.launch({
      channel,headless:true,
      args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--no-default-browser-check']
    });
    try{
      // A brand new browser context: no service worker or cached model bytes.
      const context=await browser.newContext({
        viewport:{width:390,height:844},acceptDownloads:true,
        permissions:['camera'],serviceWorkers:'block'
      });
      await context.route('**/*',route=>{
        const url=route.request().url();
        if(/^https?:\/\//i.test(url)&&!url.startsWith(origin+'/')){
          outgoing.push(channel+' blocked: '+url);
          return route.abort();
        }
        return route.continue();
      });
      const page=await context.newPage();
      await observedCsp(page);attach(page,channel+' HTTPS');
      await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('#versionBadge').textContent(),'v0.8.0');
      await language(page,'ja');
      assert.match(await page.locator('#savedList').textContent(),/保存/);
      // Modal opens at phone size, can scroll, and Escape dismisses without loss.
      await page.locator('#helpButton').click();
      assert(await page.locator('#helpDialog').isVisible());
      const dialog=await page.locator('#helpDialog').evaluate(el=>({
        bottom:el.getBoundingClientRect().bottom,
        width:el.getBoundingClientRect().width,viewport:innerHeight,
        scrollHeight:el.scrollHeight,clientHeight:el.clientHeight
      }));
      assert(dialog.width<=390&&dialog.bottom<=dialog.viewport+1,
        'Help dialog escapes the mobile viewport');
      await page.keyboard.press('Escape');
      assert(!(await page.locator('#helpDialog').isVisible()));
      // Unsupported local file: translated message survives a language switch.
      await page.locator('#sourceMode').selectOption('file');
      await page.locator('#videoFile').setInputFiles({
        name:'not-a-video.txt',mimeType:'text/plain',buffer:Buffer.from('not video')
      });
      assert.match(await page.locator('#videoFileStatus').textContent(),/動画ファイルを選んで/);
      await language(page,'en');
      assert.match(await page.locator('#videoFileStatus').textContent(),/Choose a video file/);
      await page.locator('#sourceMode').selectOption('camera');
      await page.waitForFunction(()=>!document.querySelector('#sourceMode').disabled);
      const start=Date.now();
      await waitCamera(page);
      console.log('[v07] '+channel+' first real embedded detector boot '+(Date.now()-start)+'ms on CI desktop');
      assert(await page.locator('#recognitionStatus').isVisible());
      await page.locator('#testButton').click();
      await page.locator('#testButton').click();
      await page.locator('#beginCount').click();
      await page.waitForFunction(()=>/Counting/.test(document.querySelector('#statusPill')?.textContent??''));
      await page.locator('#plusA').click();
      const count=Number(await page.locator('#countA').textContent());
      assert(count>=1,'Manual correction failed on '+channel);
      // Escape must cancel destructive reset, retaining the count.
      await page.locator('#resetButton').click();
      assert(await page.locator('#confirmDialog').isVisible());
      await page.keyboard.press('Escape');
      assert(!(await page.locator('#confirmDialog').isVisible()));
      assert.equal(Number(await page.locator('#countA').textContent()),count);
      const download=page.waitForEvent('download');
      await page.locator('#downloadButton').click();
      const csv=await readFile(await(await download).path(),'utf8');
      assert(csv.startsWith('\ufeff'),'CSV BOM lost');
      assert(csv.includes('"manual_adjustment"')||csv.includes('"correction"'),
        'Manual event missing from export');
      await page.locator('#pauseCount').click();
      await language(page,'ja');
      assert.match(await page.locator('#statusPill').textContent(),/一時停止/);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
        'Mobile horizontal overflow');
      await assertCsp(page,channel+' HTTP + meta');
      await page.screenshot({path:'dist/screenshots/v07-'+channel+'-mobile.png',fullPage:true});
      await context.close();

      // Denied camera is intentionally mocked; validates localized error UX,
      // not operating-system permissions.
      const denied=await browser.newContext({viewport:{width:320,height:640},serviceWorkers:'block'});
      await denied.addInitScript(()=>{
        const media=navigator.mediaDevices;
        if(media)Object.defineProperty(media,'getUserMedia',{configurable:true,value:async()=>{
          const error=new Error('Permission denied');error.name='NotAllowedError';throw error;
        }});
      });
      const deniedPage=await denied.newPage();
      await observedCsp(deniedPage);attach(deniedPage,channel+' denied');
      await deniedPage.goto(origin+'/',{waitUntil:'domcontentloaded'});
      await language(deniedPage,'ja');
      await deniedPage.locator('#cameraStart').click();
      await deniedPage.waitForFunction(()=>/カメラを使用できません/.test(
        document.querySelector('#statusDetails')?.textContent??''),null,{timeout:10000});
      await language(deniedPage,'en');
      assert.match(await deniedPage.locator('#statusDetails').textContent(),/Cannot use camera/);
      await assertCsp(deniedPage,channel+' denied');
      await denied.close();

      // Offline BEFORE first file open, fresh context, no service workers.
      // file:// secure-context camera behavior is OS/browser dependent:
      // run real inference only when the browser exposes the camera API.
      const standaloneNames=channel==='chrome'?
        ['dist/index.html','dist/index.self-extract.html']:['dist/index.html'];
      for(const name of standaloneNames){
        const cold=await browser.newContext({permissions:['camera'],serviceWorkers:'block'});
        await cold.setOffline(true);
        const local=await cold.newPage();
        await observedCsp(local);attach(local,channel+' cold '+name);
        await local.goto(pathToFileURL(resolve(name)).href,{waitUntil:'domcontentloaded'});
        await local.waitForFunction(()=>window.StandaloneAssets?.has?.('person-model','tflite')===true,
          null,{timeout:30000});
        const assets=await local.evaluate(()=>window.StandaloneAssets.list());
        assert(assets.includes('mediapipe/simd-wasm')&&assets.includes('mediapipe/simd-loader'));
        // Local-video mode is independent of file:// camera-permission policy.
        // The actual offline inference check is done with the bundled fake camera.
        if(await local.evaluate(()=>Boolean(navigator.mediaDevices?.getUserMedia))){
          await waitCamera(local);
          console.log('[v07] '+channel+' '+name+' cold offline file:// inference OK');
        }else{
          console.log('[v07] '+channel+' '+name+' file:// camera API unavailable; manual compatibility gate remains');
        }
        await assertCsp(local,channel+' offline '+name);
        await cold.close();
      }
      tested++;
      console.log('[v07] '+channel+' PASS: camera/CSV, i18n/errors, dual CSP, offline asset decoding');
    }finally{await browser.close();}
  }
  assert.equal(tested,2,'Chrome and Edge desktop smoke must both run');
  assert.deepEqual(outgoing,[],'Unexpected external HTTP request');
  assert.deepEqual(pageErrors,[],'Unhandled browser exceptions');
  console.log('[v07] PASS: 2 Windows desktop channels. Android and iOS physical tests remain UNVERIFIED.');
}finally{
  await new Promise(yes=>server.close(yes));
}
