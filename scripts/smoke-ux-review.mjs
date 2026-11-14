// Product UX regressions: real embedded camera, visible geometry and ordinary controls.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';
const html=await readFile('dist/index.html');
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
try{
 await mkdir('test-results/ux-review',{recursive:true});
 for(const width of [1360,390,320]){
  const mobile=width<=820,context=await browser.newContext({viewport:{width,height:740},locale:'ja-JP',permissions:['camera']});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin))requests.push(r.url());});
  await page.addInitScript(()=>{
   window.__canvasLabels=[];const fill=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__canvasLabels.push(String(text));if(window.__canvasLabels.length>100)window.__canvasLabels.shift();return fill.call(this,text,...args);};
  });
  await page.goto(origin);
  assert.equal(await page.locator('.local-badge').isVisible(),!mobile,'Local badge visibility at '+width);
  assert.equal(await page.getByText('処理の詳細',{exact:true}).count(),0,'No developer diagnostics control');
  await page.locator('#cameraStart').click();await page.waitForFunction(()=>!document.querySelector('#testButton').disabled,null,{timeout:60000});
  if(mobile){
   await page.locator('#cameraStage').scrollIntoViewIfNeeded();
   const endpoints=await page.locator('#lineMoveTarget').evaluate(el=>{
    const r=document.querySelector('#lineGestureLayer').getBoundingClientRect();
    return {x1:r.left+Number(el.getAttribute('x1')),y1:r.top+Number(el.getAttribute('y1')),x2:r.left+Number(el.getAttribute('x2')),y2:r.top+Number(el.getAttribute('y2'))};
   });
   await page.mouse.move(endpoints.x2,endpoints.y2);await page.mouse.down();await page.mouse.move(endpoints.x1+3,endpoints.y1,{steps:6});await page.mouse.up();
   assert(await page.locator('#dockStart').isDisabled(),'Dock must reject an invalid short counting line');
   await page.locator('#lineHorizontal').click();
   assert(await page.locator('#dockStart').isVisible());await page.locator('#dockStart').click();await page.locator('#dockStart').click();await page.locator('#dockStart').click();}
  else{await page.locator('#testButton').click();await page.locator('#testButton').click();await page.locator('#beginCount').click();}
  await page.waitForFunction(()=>document.querySelector('#appMain').dataset.phase==='counting');
  await page.waitForFunction(()=>/^\d+(\.\d+)? fps$/.test(document.querySelector('#detectorInfo').textContent));
  const labels=await page.evaluate(()=>window.__canvasLabels);
  assert(labels.includes('A')&&labels.includes('B'));assert(!labels.some(t=>/A\s*→\s*B.*A\s*→\s*B|B\s*→\s*A.*B\s*→\s*A/.test(t)),'No repeated direction labels');
  assert(!/EfficientDet|SIMD|\bms\b|boxes|deferred|gaps/.test(await page.locator('.video-footer').textContent()));
  assert(await page.locator('#latestCrossing').isHidden(),'Do not fill the measurement view with empty-history text');
  if(mobile){
   const geometry=await page.evaluate(()=>{const r=id=>document.querySelector(id).getBoundingClientRect().toJSON();return {summary:r('#counterSummary'),stage:r('#cameraStage'),dock:r('#liveDock'),viewport:innerHeight};});
   assert(geometry.summary.bottom<=geometry.stage.top+1,'Counts immediately above preview');
   assert(geometry.stage.bottom<=geometry.dock.top-4,'Preview not hidden by fixed actions '+JSON.stringify(geometry));
   assert(await page.locator('.measure-console').isHidden(),'No empty duplicate count panel during measurement');
   assert(await page.locator('#dockPause').isVisible());assert(await page.locator('#dockResume').isHidden());
   await page.locator('#dockPause').click();assert(await page.locator('#dockPause').isHidden());assert(await page.locator('#dockResume').isVisible());
   await page.locator('#overlay').focus();await page.keyboard.press('ArrowRight');
   assert(await page.locator('#dockResume').isHidden(),'Re-check replaces resume after moving the line');
   assert(await page.locator('#dockStart').isVisible());await page.locator('#dockStart').click();await page.locator('#dockStart').click();
   assert(await page.locator('#dockResume').isVisible());
   await page.locator('#dockResume').click();await page.locator('#dockSettings').click();
   assert(await page.locator('#setupOptions').isVisible());await page.locator('#dockSettings').click();
   assert.equal(await page.locator('#appMain').getAttribute('data-focused'),'true');
  }else{
   const geometry=await page.evaluate(()=>({frame:document.querySelector('#cameraStage').getBoundingClientRect().toJSON(),console:document.querySelector('.measure-console').getBoundingClientRect().toJSON()}));
   assert(geometry.console.left>=geometry.frame.right,'PC counts/actions adjacent to frame');
   await page.locator('#pauseCount').click();await page.locator('#beginCount').click();
   const top=await page.locator('#counterHeading').boundingBox();
   assert(top.y>=65&&top.y<150,'PC counting heading remains below the header after start/resume');
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`test-results/ux-review/counting-${width}.png`,fullPage:false});
  await page.locator(mobile?'#dockFinish':'#finishCount').click();
  assert(await page.locator('#report').isVisible());assert(await page.locator('#bundleButton').isEnabled());
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();
  console.log('[UX] PASS '+width+'px: simple labels/fps, counts/preview/actions, pause/resume/settings/result');
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
