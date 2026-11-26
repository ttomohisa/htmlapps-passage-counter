import assert from 'node:assert/strict';
import chooseVideo from './choose-video.cjs';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';
const html=await readFile('dist/index.html');
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],external=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin))external.push(r.url());});
 await page.goto(origin);
 assert.equal(await page.locator('#analysisMode').count(),1,'Sequential mode selector must exist');
 // Encode an actual local file in the browser; this tests decoding + real WASM,
 // not detection accuracy (the test pattern is not a real person).
 const buffer=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=320;c.height=240;const x=c.getContext('2d');
  const stream=c.captureStream(15),r=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
  const done=new Promise(resolve=>r.onstop=resolve);r.ondataavailable=e=>chunks.push(e.data);
  r.start();let i=0;const t=setInterval(()=>{
   x.fillStyle='#eff3ef';x.fillRect(0,0,320,240);x.fillStyle='#d7dfd8';x.fillRect(0,190,320,50);
   const px=40+(i++%20)*11;x.fillStyle='#16624f';x.beginPath();x.arc(px,60,16,0,Math.PI*2);x.fill();x.fillRect(px-16,80,32,70);
   x.fillRect(px-15,150,10,40);x.fillRect(px+5,150,10,40);
  },66);
  await new Promise(resolve=>setTimeout(resolve,1600));clearInterval(t);r.stop();await done;stream.getTracks().forEach(t=>t.stop());
  return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
 });
 await chooseVideo(page,{name:'sample.webm',mimeType:'video/webm',buffer:Buffer.from(buffer)});
 await page.waitForFunction(()=>!document.querySelector('#beginCount').disabled,null,{timeout:40000});
 await page.locator('#cameraFeed').evaluate(v=>{v.play=()=>Promise.reject(new DOMException('Controlled preview rejection','NotAllowedError'));});
 await page.locator('#previewVideo').click();
 assert(await page.locator('#statusDetails').isVisible(),'Explicit preview playback errors must remain visible');
 assert.match(await page.locator('#statusDetails').textContent(),/動画を再生できません|Cannot play this video/);
 await page.locator('#cameraFeed').evaluate(v=>{delete v.play;});
 assert.equal(await page.locator('#analysisMode').inputValue(),'sequential');
 assert.equal(await page.locator('#videoSourceBox').getAttribute('open'),null,'Loaded file settings collapse beside the preview');
 await page.locator('#lineVertical').click();
 await page.locator('#setupOptions').evaluate(e=>e.open=true);
 await page.locator('#labelA').fill('入場 <test>');await page.locator('#labelA').dispatchEvent('input');
 await page.locator('#roiEnabled').check();await page.locator('#roiLeft').fill('20');await page.locator('#roiLeft').dispatchEvent('change');
 await page.locator('#roiRight').fill('80');await page.locator('#roiRight').dispatchEvent('change');
 await page.locator('#dockStart').click();
 assert(await page.locator('#lineVertical').isDisabled());assert(await page.locator('#roiEnabled').isDisabled());
 assert.equal(await page.locator('#appMain').getAttribute('data-focused'),'true');
 await page.waitForFunction(()=>Number(document.querySelector('#videoSeek').value)>0);
 await page.locator('#dockPause').click();
 assert(await page.locator('#analysisMode').isDisabled(),'Changing mode mid-session would replay and duplicate earlier passages');
 const time=await page.locator('#cameraFeed').evaluate(v=>v.currentTime);
 await page.waitForTimeout(250);assert.equal(await page.locator('#cameraFeed').evaluate(v=>v.currentTime),time);
 await page.locator('#dockResume').click();
 await page.waitForFunction(()=>!document.querySelector('#report').hidden,null,{timeout:25000});
 assert.equal(await page.locator('#appMain').getAttribute('data-screen'),'result');
 assert(await page.locator('#bundleButton').isVisible());
 assert(await page.locator('#newSession').isVisible());
 assert(await page.locator('#timelineRows').isHidden());
 await page.locator('#plusA').click();
 assert.equal(await page.locator('#reportFinalA').textContent(),'1');
 await page.waitForFunction(()=>document.querySelector('#savedList .saved-session small')?.textContent.includes('A→B 1'),null,{timeout:10000});
 await mkdir('test-results/improvements',{recursive:true});
 await page.waitForFunction(()=>document.querySelector('#appToast').hidden);
 await page.locator('#resultExportDetails > summary').click();
 await page.locator('#sessionName').fill('Sample video · manual correction +1');
 await page.locator('#resultExportDetails > summary').click();
 for(const lang of ['ja','en']){
  if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#languageButton').click();
  for(const width of [390,1360]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`test-results/improvements/${lang}-${width}.png`,fullPage:true});
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#resultExportDetails > summary').click();
 await page.locator('#outputFilename').fill('trial/日本語.csv');
 const download=page.waitForEvent('download');await page.locator('#bundleButton').click();
 const file=await download;assert.equal(file.suggestedFilename(),'trial-日本語.zip');
 const zip=await readFile(await file.path());assert.equal(zip.readUInt32LE(0),0x04034b50);
 assert(zip.includes(Buffer.from('manual_adjustment')));assert(zip.includes(Buffer.from('trial-日本語-summary.csv')));
 assert.equal(await page.locator('#timeBasis').inputValue(),'media');
 await page.locator('#resultTimelineDetails > summary').click();
 assert.match(await page.locator('#timelineRows strong').first().textContent(),/^00:00:00 – /);
 assert(zip.includes(Buffer.from('"source_start_ms","source_end_ms"')));
 await page.locator('#timeBasis').selectOption('wall');
 await page.locator('#aggregationMinutes').selectOption('15');
 assert.match(await page.locator('#timelineHeading').textContent(),/analysis time/i);
 const wallDownload=page.waitForEvent('download');await page.locator('#intervalsButton').click();
 const clockCsv=await readFile(await (await wallDownload).path(),'utf8');
 const expectedHeader=['session_id','bucket_start','bucket_end','bucket_minutes','observed_seconds','paused_seconds',
   'missing_seconds','auto_a','manual_a','total_a','auto_b','manual_b','total_b','coverage_status','timezone'];
 assert.equal(clockCsv.replace(/^\uFEFF/,'').split('\r\n')[0],expectedHeader.map(name=>'"'+name+'"').join(','));
 assert.match(clockCsv.split('\r\n')[1],/^"[^"]+","[^"]+","[^"]+","15",/);
 await page.locator('#timeBasis').selectOption('media');
 await page.locator('#copyResult').click();
 assert(await page.locator('#resultText').inputValue().then(s=>s.includes('入場 <test>')&&s.includes('1')));
 for(const width of [320,390,820,1360]){
  await page.setViewportSize({width,height:740});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+width);
 }
 await page.reload();await page.locator('#savedList button').first().click();
 assert.equal(await page.locator('#roiEnabled').isChecked(),true);
 assert.equal(await page.locator('#roiLeft').inputValue(),'20');
 assert.equal(await page.locator('#cameraFeed').getAttribute('src'),null);
 assert.match(await page.locator('#timelineRows strong').first().textContent(),/^00:00:00 – /);
 await page.locator('#plusB').click();
 assert.match(await page.locator('#timelineRows').textContent(),/Unknown video position|動画内時刻不明/);
 await page.locator('#resultExportDetails > summary').click();
 await page.locator('#resultTimelineDetails > summary').click();
 const mediaDownload=page.waitForEvent('download');await page.locator('#intervalsButton').click();
 assert.match(await readFile(await (await mediaDownload).path(),'utf8'),/"video","unknown_position","",""/);
 if(await page.locator('html').getAttribute('lang')!=='en')await page.locator('#languageButton').click();
 assert.match(await page.locator('#bundleButton').textContent(),/ZIP/);
 await page.locator('#timeBasis').selectOption('wall');
 await page.locator('#newSession').click();
 await page.waitForFunction(()=>document.querySelector('#appMain').dataset.screen==='source');
 await page.waitForFunction(()=>document.activeElement?.id==='entryIntro');
 assert(await page.locator('#confirmDialog').isHidden(),'A saved result can be left in one step');
 await page.locator('#timelineSection').waitFor({state:'hidden'});
 assert(await page.locator('#timeBasisField').evaluate(el=>el.hidden),'Inactive timeline should hide the axis selector');
 await page.locator('#savedList button').first().click();
 assert.equal(await page.locator('#timeBasis').inputValue(),'media','Reopened video starts from its own clock');
 for(const variant of ['index.html','index.self-extract.html']){
  const local=await context.newPage();local.on('pageerror',e=>errors.push(variant+': '+e.message));
  local.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await local.goto(pathToFileURL(resolve('dist',variant)).href);
  await chooseVideo(local,{name:'sample.webm',mimeType:'video/webm',buffer:Buffer.from(buffer)});
  await local.waitForFunction(()=>!document.querySelector('#beginCount').disabled,null,{timeout:40000});
  await local.locator('#dockStart').click();
  await local.waitForFunction(()=>!document.querySelector('#report').hidden,null,{timeout:25000});
  assert.equal(await local.locator('#analysisMode').inputValue(),'sequential');
  await local.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('[improvements] PASS sequential decode/pause/resume/finish, area freeze/restore, ZIP/copy, JA/EN and widths');
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
