// v0.10 camera-first layout and actual pointer/touch line editing smoke.
// Synthetic camera proves the UI wiring, not physical phone performance/accuracy.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';

const html=await readFile('dist/index.html');
const server=createServer((req,res)=>{
 if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);}
 else{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true,
 args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--no-default-browser-check']});
const errors=[],remote=[];
const observe=(page,name)=>{
 page.on('pageerror',e=>errors.push(name+': '+e.message));
 page.on('request',r=>{
  const u=r.url();
  if(/^https?:\/\//.test(u)&&!u.startsWith(origin+'/'))remote.push(name+': '+u);
 });
};
async function ready(page){
 await page.locator('#cameraStart').click();
 await page.waitForFunction(()=>/計測準備完了|Ready to count/.test(
  document.querySelector('#statusPill')?.textContent??''),
  null,{timeout:90_000});
 await page.waitForFunction(()=>document.querySelector('#lineGestureLayer')?.hasAttribute('hidden')===false);
}
async function frame(page){
 return await page.evaluate(()=>{
  const root=document.querySelector('#lineGestureLayer'),r=root.getBoundingClientRect();
  const line=document.querySelector('#lineMoveTarget');
  const x1=+line.getAttribute('x1'),y1=+line.getAttribute('y1');
  const x2=+line.getAttribute('x2'),y2=+line.getAttribute('y2');
  return {x1,y1,x2,y2,left:r.left,top:r.top,width:r.width,height:r.height,
   mx:r.left+(x1+x2)/2,my:r.top+(y1+y2)/2,
   ex:r.left+x1,ey:r.top+y1};
 });
}
async function pointerDrag(page,source,dx,dy){
 await page.mouse.move(source.x,source.y);
 await page.mouse.down();
 await page.mouse.move(source.x+dx,source.y+dy,{steps:8});
 await page.mouse.up();
}
const close=(n,m,tolerance=1.4)=>assert(Math.abs(n-m)<=tolerance,
 'Expected '+n+' to be within '+tolerance+'px of '+m);
async function verifyCorrectionLayout(page){
  for(const key of ['A','B']){
    const {minus,plus,count,tile}=await page.locator('#count'+key).evaluate(el=>{
      const tile=el.closest('.counter');
      const [minus,plus]=tile.querySelectorAll('button');
      return Object.fromEntries(Object.entries({minus,plus,count:el,tile}).map(([k,node])=>[k,node.getBoundingClientRect().toJSON()]));
    });
    assert(minus.width>=44&&minus.height>=44&&plus.width>=44&&plus.height>=44);
    assert(minus.left>=tile.left-1&&plus.right<=tile.right+1&&minus.right<=plus.left+1);
    assert(count.right<=minus.left+1||count.bottom<=minus.top+1,'Corrections must not overlap their count');
  }
  assert(await page.locator('.total #undoCorrection').isVisible(),'Undo is beside the total');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const stress=await page.evaluate(()=>{
    const label=document.querySelector('#displayLabelA'),count=document.querySelector('#countA');
    const saved=[label.textContent,count.textContent,count.dataset.digits];
    label.textContent='A→B 長い方向名・複数の通過カウンター表示';
    count.textContent='999999';count.dataset.digits='6';
    const rect=node=>node.getBoundingClientRect();
    const digits=document.createRange();digits.selectNodeContents(count);
    const value=digits.getBoundingClientRect(),tile=rect(count.closest('.counter')),adjust=rect(document.querySelector('#minusA'));
    const fits=value.left>=tile.left-1&&value.right<=tile.right+1&&rect(label).right<=tile.right+1&&
      (value.right<=adjust.left+1||value.bottom<=adjust.top+1)&&document.documentElement.scrollWidth<=innerWidth+1;
    [label.textContent,count.textContent]=saved;
    if(saved[2]===undefined)delete count.dataset.digits;else count.dataset.digits=saved[2];
    return {fits,value:value.toJSON(),tile:tile.toJSON(),adjust:adjust.toJSON(),width:innerWidth};
  });
  assert(stress.fits,'Large counts and long direction labels fit inside the tile '+JSON.stringify(stress));
}
try{
 await mkdir('dist/screenshots',{recursive:true});
 const ctx=await browser.newContext({
  viewport:{width:1280,height:850},permissions:['camera'],serviceWorkers:'block'
 });
 const page=await ctx.newPage();observe(page,'desktop');
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#versionBadge').textContent(),'v1.1.0');
 assert.equal(await page.locator('#lineMoveTarget').count(),1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 // Initial view has one clear first action, not a disabled maze of buttons.
 assert.equal(await page.locator('#appMain').getAttribute('data-next'),'camera');
 assert(await page.locator('#cameraStart').isVisible());
 assert(await page.locator('#testCard').isHidden());
 assert(await page.locator('#beginCount').isHidden());
 await ready(page);
 assert.equal(await page.locator('#appMain').getAttribute('data-next'),'test');
 assert(await page.locator('#testCard').isVisible());
 assert(await page.locator('#testButton').isEnabled());
 assert(await page.locator('#beginCount').isHidden());
 assert(await page.locator('#counterSummary').isHidden(),'No empty counter while placing the line');
 assert(await page.locator('#lineToolsHeading').isVisible());
 assert(await page.locator('#inputOptions').isVisible());
 await page.locator('#inputOptions').click();
 assert(await page.locator('#sourceMode').isVisible(),'Input options stay reachable after connecting');
 await page.locator('#inputOptions').click();
 assert(await page.locator('#sourceMode').isHidden());
 // Starting the camera button can scroll the stage above the viewport;
 // bring the gesture target back into view before physical pointer input.
 await page.locator('#cameraStage').scrollIntoViewIfNeeded();
 assert(await page.locator('#lineMoveTarget').evaluate(el=>getComputedStyle(el).pointerEvents==='stroke'));
 const before=await frame(page);
 const target=await page.evaluate(pos=>{
   const el=document.elementFromPoint(pos.x,pos.y);
   const gesture=document.querySelector('#lineGestureLayer');
   const line=document.querySelector('#lineMoveTarget');
   window.__lineEvents=[];
   for(const name of ['pointerdown','pointermove','pointerup','lostpointercapture'])
     gesture.addEventListener(name,e=>window.__lineEvents.push({
       name,pointerId:e.pointerId,buttons:e.buttons,target:e.target?.id||e.target?.className?.baseVal||e.target?.tagName
     }),true);
   return {hit:el?.id||el?.tagName||null,hitClass:el?.getAttribute('class'),
     gestureHidden:gesture.hasAttribute('hidden'),gesturePointerEvents:getComputedStyle(gesture).pointerEvents,
     linePointerEvents:getComputedStyle(line).pointerEvents,
     lineStroke:getComputedStyle(line).stroke,lineBox:line.getBoundingClientRect().toJSON(),
     stageBox:document.querySelector('#cameraStage').getBoundingClientRect().toJSON()};
 },{x:before.mx,y:before.my});
 console.log('[v010-debug] initial centre hit '+JSON.stringify(target));
 await pointerDrag(page,{x:before.mx,y:before.my},30,20);
 const moved=await frame(page);
 const dx0=moved.x1-before.x1,dx1=moved.x2-before.x2;
 const dy0=moved.y1-before.y1,dy1=moved.y2-before.y2;
 if(!(dx0>5&&dy0>5))
  console.log('[v010-debug] pointer events '+JSON.stringify(await page.evaluate(()=>window.__lineEvents)));
 assert(dx0>5&&dy0>5,'Dragging middle of line did not move it');
 close(dx0,dx1);close(dy0,dy1);
 close(Math.hypot(before.x2-before.x1,before.y2-before.y1),
  Math.hypot(moved.x2-moved.x1,moved.y2-moved.y1));
 console.log('[v010] Desktop line-centre drag moved both endpoints with rigid segment geometry.');

 // After a successful setup test, any line edit invalidates the test. Endpoint
 // adjustment moves only the chosen handle, not the whole segment.
 await page.locator('#testButton').click();
 assert.equal(await page.locator('#appMain').getAttribute('data-next'),'testing');
 assert(await page.locator('#beginCount').isHidden());
 assert.equal(await page.locator('#countTotal').textContent(),'0','Trial events must not touch real totals');
 await page.locator('#testButton').click();
 assert.equal(await page.locator('#appMain').getAttribute('data-next'),'count');
 assert.equal(await page.locator('#beginCount').isEnabled(),true);
 assert(await page.locator('#beginCount').isVisible());
 assert.match(await page.locator('#testButton').textContent(),/もう一度|again/);
 await page.locator('#cameraStage').scrollIntoViewIfNeeded();
 const handleStart=await frame(page);
 await pointerDrag(page,{x:handleStart.ex,y:handleStart.ey},0,-26);
 const handleEnd=await frame(page);
 assert(handleEnd.y1<handleStart.y1-5,'Endpoint drag did not change line geometry');
 close(handleEnd.x2,handleStart.x2);
 close(handleEnd.y2,handleStart.y2);
 assert(await page.locator('#beginCount').isDisabled(),'Line edit must invalidate calibration test');
 assert.equal(await page.locator('#appMain').getAttribute('data-next'),'test');
 assert(await page.locator('#beginCount').isHidden());
 console.log('[v010] Endpoint edit resets calibration and brings back the check CTA.');

 // Keyboard nudges retain the angle and length, and old A/B reversal remains.
 await page.locator('#overlay').focus();
 const keyBefore=await frame(page);
 await page.keyboard.press('ArrowRight');
 const keyAfter=await frame(page);
 assert(keyAfter.x1>keyBefore.x1&&keyAfter.x2>keyBefore.x2);
 close(keyAfter.x1-keyBefore.x1,keyAfter.x2-keyBefore.x2);
 await page.locator('#reverseLine').click();
 const reverse=await frame(page);
 close(reverse.x1,keyAfter.x1);close(reverse.x2,keyAfter.x2);

 // During active counting the gesture surface is hidden; accidental taps do
 // not alter the counting line or emit a duplicate setup reset.
 await page.locator('#testButton').click();
 await page.locator('#testButton').click();
 await page.locator('#beginCount').click();
 await page.waitForFunction(()=>/計測中|Counting/.test(document.querySelector('#statusPill')?.textContent||''));
 assert.equal(await page.locator('#appMain').getAttribute('data-next'),'counting');
 assert(await page.locator('#testCard').isHidden());
 assert(await page.locator('#pauseCount').isVisible());
 assert(await page.locator('#finishCount').isVisible());
 await verifyCorrectionLayout(page);
 assert(await page.locator('#lineGestureLayer').isHidden());
 await page.locator('#cameraStage').scrollIntoViewIfNeeded();
 const locked=await frame(page);
 await pointerDrag(page,{x:locked.mx,y:locked.my},20,15);
 const afterLocked=await frame(page);
 close(locked.x1,afterLocked.x1);close(locked.y1,afterLocked.y1);
 close(locked.x2,afterLocked.x2);close(locked.y2,afterLocked.y2);
 await page.locator('#pauseCount').click();
 assert.equal(await page.locator('#lineGestureLayer').isVisible(),true);
 assert(await page.locator('#plusA').isVisible(),'Correction action must remain visible');
 assert(await page.locator('#plusA').isEnabled(),'Moved correction must be enabled for paused sessions');
 const countBefore=Number(await page.locator('#countA').textContent());
 await page.locator('#plusA').click();
 assert.equal(Number(await page.locator('#countA').textContent()),countBefore+1,
   'Relocated correction +1 must still update the count');
 await page.locator('#undoCorrection').click();
 assert.equal(Number(await page.locator('#countA').textContent()),countBefore,
   'Relocated Undo must reverse the manual correction');
 const bBefore=Number(await page.locator('#countB').textContent());
 await page.locator('#plusB').click();
 assert.equal(Number(await page.locator('#countB').textContent()),bBefore+1);
 await page.locator('#minusB').click();
 assert.equal(Number(await page.locator('#countB').textContent()),bBefore);
 console.log('[v010] Relocated correction +1 and Undo retain their ledger behavior.');
 console.log('[v010] Counting locks line edits; pause makes the line editable again.');
 await ctx.close();

 // Mobile: correct workflow order, reachable dock actions, no overflowing controls;
 // actual touch drag via Chromium input dispatch, not synthetic JS events.
 for(const width of [320,360,390,820]){
  const context=await browser.newContext({viewport:{width,height:844},
   permissions:['camera'],serviceWorkers:'block',hasTouch:true,isMobile:true});
  const mobile=await context.newPage();observe(mobile,'mobile-'+width);
  await mobile.goto(origin+'/',{waitUntil:'domcontentloaded'});
  assert(await mobile.locator('#counterSummary').isHidden(),'Source screen must not expose unused counters');
  assert(await mobile.locator('#testCard').isHidden());
  await ready(mobile);
  assert(await mobile.locator('#dockStart').isVisible(),'The primary setup action belongs in the mobile dock');
  assert(await mobile.locator('#testButton').isHidden(),'No duplicate calibration action');
  assert(await mobile.locator('#counterSummary').isHidden(),'Setup reserves the frame for the counting line');
  assert.equal(await mobile.locator('#cameraStage').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
  if(width===390){
   await mobile.locator('#cameraStage').scrollIntoViewIfNeeded();
   const original=await frame(mobile);
   const cdp=await context.newCDPSession(mobile);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:original.mx,y:original.my}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:original.mx+20,y:original.my+15}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:original.mx+24,y:original.my+18}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const after=await frame(mobile);
   assert(after.x1-original.x1>5&&after.y1-original.y1>4,'Real touch did not translate line');
   close(after.x1-original.x1,after.x2-original.x2);
   close(after.y1-original.y1,after.y2-original.y2);
   console.log('[v010] Mobile 390px actual touch drag keeps line angle and length.');
  }
  await mobile.locator('#dockStart').click();
  await mobile.locator('#dockStart').click();
  await mobile.locator('#dockStart').click();
  await mobile.waitForFunction(()=>document.querySelector('#appMain').dataset.phase==='counting');
  await verifyCorrectionLayout(mobile);
  await context.close();
  console.log('[v010] '+width+'px layout order and safe horizontal geometry passed.');
 }
 assert.deepEqual(errors,[],'Unhandled browser errors');
 assert.deepEqual(remote,[],'Unexpected HTTP requests');
 console.log('[v010] PASS: desktop/mouse/keyboard/mobile-touch line editing, locked counting, layout and network zero');
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
