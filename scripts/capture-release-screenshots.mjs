// Capture genuine UI with a browser-encoded synthetic local video and an audited
// manual correction. No camera, injected counts or detector scores are used.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';
const html=await readFile('dist/index.html');
const config=JSON.parse(await readFile('app.config.json','utf8'));
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'});res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
try{
 await mkdir('assets',{recursive:true});
 for(const lang of ['ja','en'])for(const width of [1360,390]){
  const context=await browser.newContext({viewport:{width,height:900},locale:lang==='ja'?'ja-JP':'en-US',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin))requests.push(r.url());});
  await page.goto(origin);
  if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#languageButton').click();
  const bytes=await page.evaluate(async()=>{
   const c=document.createElement('canvas');c.width=480;c.height=320;const ctx=c.getContext('2d');
   const stream=c.captureStream(12),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
   const done=new Promise(r=>recorder.onstop=r);recorder.ondataavailable=e=>chunks.push(e.data);
   let i=0;function draw(){
    ctx.fillStyle='#eaf0eb';ctx.fillRect(0,0,480,320);ctx.fillStyle='#d0dbd2';ctx.fillRect(0,270,480,50);
    const x=70+(i++%15)*22;ctx.fillStyle='#16624f';ctx.beginPath();ctx.arc(x,90,22,0,Math.PI*2);ctx.fill();
    ctx.fillRect(x-20,120,40,100);ctx.fillRect(x-18,220,12,50);ctx.fillRect(x+6,220,12,50);
    ctx.fillStyle='#536b5e';ctx.font='14px system-ui';ctx.fillText('SAMPLE VIDEO',16,28);
   }
   draw();recorder.start();const timer=setInterval(draw,83);
   await new Promise(r=>setTimeout(r,1300));clearInterval(timer);recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
   return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  await page.locator('#sourceMode').selectOption('file');
  await page.locator('#videoFile').setInputFiles({name:'sample-video.webm',mimeType:'video/webm',buffer:Buffer.from(bytes)});
  await page.waitForFunction(()=>!document.querySelector('#beginCount').disabled,null,{timeout:40000});
  await page.locator('#lineVertical').click();
  await page.locator('#setupOptions').evaluate(e=>e.open=true);
  await page.locator('#labelA').fill(lang==='ja'?'入場':'Entry');await page.locator('#labelB').fill(lang==='ja'?'退場':'Exit');
  await page.locator('#roiEnabled').check();
  await page.locator('#sessionName').fill(lang==='ja'?'サンプル動画・手動補正 +1':'Sample video · manual correction +1');
  await page.locator('#setupOptions').evaluate(e=>e.open=false);
  await page.locator('#beginCount').click();
  await page.waitForFunction(()=>!document.querySelector('#report').hidden,null,{timeout:25000});
  await page.locator('#plusA').click();await page.waitForFunction(()=>document.querySelector('#appToast').hidden);
  await page.waitForFunction(()=>document.querySelector('#savedList .saved-session small')?.textContent.includes('A→B 1'));
  await page.locator('#outputFilename').fill('passage-counter-sample');
  await page.locator('#outputFilename').press('Tab');
  await page.evaluate(()=>document.activeElement?.blur());
  await page.evaluate(()=>scrollTo(0,0));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  const filename=width===390?(lang==='ja'?'screenshot-mobile.png':'screenshot-mobile-en.png'):(lang==='ja'?'screenshot.png':'screenshot-en.png');
  const file='assets/'+filename;await page.screenshot({path:file,fullPage:width===390,animations:'disabled'});
  const image=await readFile(file);records.push({file,lang,width:image.readUInt32BE(16),height:image.readUInt32BE(20),bytes:image.length});
  console.log('[screenshots] '+file+' '+records.at(-1).width+'x'+records.at(-1).height);
  await context.close();
 }
 await writeFile('assets/SCREENSHOTS.md',[
  '# Passage Counter screenshot provenance','',
  `Captured from the genuine generated v${config.version} UI using Windows Chrome.`,
  'These are camera-off screenshots of a local synthetic video encoded with MediaRecorder.',
  'The illustrated input says SAMPLE VIDEO. The +1 is a manual correction made with the app button and recorded in the event ledger.',
  'No counts, detection boxes, model scores or runtime states are injected. Any automatic inference is the embedded model processing the sample.',
  'This demonstrates the video/result workflow and is not evidence of real-person accuracy.',
  'Capture command: node scripts/capture-release-screenshots.mjs','',
  ...records.map(r=>`- ${r.file}: ${r.width}x${r.height}, ${r.lang}, ${r.bytes} bytes`),''
 ].join('\n'));
}finally{await browser.close();await new Promise(r=>server.close(r));}
