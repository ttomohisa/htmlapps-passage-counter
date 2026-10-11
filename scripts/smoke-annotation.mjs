// Developer-only annotation helper: local video, A/B labeling and offline CSV.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';
const errors=[],external=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:320,height:690},
    acceptDownloads:true,serviceWorkers:'block'});
  await context.setOffline(true);
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:\/\//.test(r.url()))external.push(r.url());});
  await page.goto(pathToFileURL(resolve('evaluation/label-passages.html')).href,
    {waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#save').isDisabled(),true);
  const encoded=await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
    const context=canvas.getContext('2d');
    const stream=canvas.captureStream(10);
    const type=['video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
    if(!type)throw Error('Synthetic Chrome cannot encode WebM');
    const recorder=new MediaRecorder(stream,{mimeType:type}),chunks=[];
    recorder.addEventListener('dataavailable',e=>{if(e.data.size)chunks.push(e.data);});
    const done=new Promise(resolve=>recorder.addEventListener('stop',resolve,{once:true}));
    recorder.start(200);
    const started=performance.now();
    await new Promise(resolve=>{
      const timer=setInterval(()=>{
        context.fillStyle='#eef3ee';context.fillRect(0,0,320,240);
        context.fillStyle='#16624f';context.fillRect(40+(performance.now()-started)*.06,60,30,110);
        if(performance.now()-started>1500){clearInterval(timer);resolve();}
      },80);
    });
    recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(chunks,{type});
    return await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);
      reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
    });
  });
  const buffer=Buffer.from(encoded,'base64');
  assert(buffer.length>900);
  await page.locator('#movieFile').setInputFiles({name:'self-test.webm',mimeType:'video/webm',buffer});
  await page.waitForFunction(()=>!document.querySelector('#addA')?.disabled,null,{timeout:20000});
  assert.equal(await page.locator('#cover').isHidden(),true);
  await page.locator('#addA').click();
  await page.locator('#addB').click();
  await page.keyboard.press('a');
  assert.match(await page.locator('#counter').textContent(),/3 件/);
  await page.keyboard.press('z');
  assert.match(await page.locator('#counter').textContent(),/2 件/);
  const handle=page.locator('.line-handle').first();
  const previousX=parseFloat(await handle.evaluate(el=>el.style.left));
  assert(await handle.evaluate(el=>getComputedStyle(el).width==='44px'),
    'Labeler line handle must have a 44px touch target');
  const bounds=await handle.boundingBox();
  assert(bounds,'Draggable endpoint not found');
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width/2+10,bounds.y+bounds.height/2+3,{steps:3});
  await page.mouse.up();
  assert(parseFloat(await handle.evaluate(el=>el.style.left))>previousX,
    'Counting line endpoint cannot be dragged on the annotation helper');
  const download=page.waitForEvent('download');
  await page.locator('#save').click();
  const exported=await readFile(await(await download).path(),'utf8');
  assert(exported.startsWith('\uFEFF'),'Ground truth CSV must include UTF-8 BOM');
  assert.match(exported,/source_time_ms/);assert.match(exported,/A_TO_B/);
  assert.match(exported,/B_TO_A/);
  assert.equal(exported.trim().split(/\r?\n/).length,3,'Expected header + 2 labeled crossings');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
    'Annotation helper overflows 320px');
  assert.deepEqual(errors,[],'Unexpected annotation script exception');
  assert.deepEqual(external,[],'Annotation helper attempted network access');
  console.log('[annotation] PASS offline file, native WebM, A/B/Undo, BOM CSV, narrow viewport and zero requests');
  await context.close();
}finally{await browser.close();}
