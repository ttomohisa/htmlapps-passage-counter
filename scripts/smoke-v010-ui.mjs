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
try{
 await mkdir('dist/screenshots',{recursive:true});
 const ctx=await browser.newContext({
  viewport:{width:1280,height:850},permissions:['camera'],serviceWorkers:'block'
 });
 const page=await ctx.newPage();observe(page,'desktop');
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#versionBadge').textContent(),'v0.10.0');
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
 const geometryDesktop=await page.evaluate(()=>{
   const rect=selector=>document.querySelector(selector).getBoundingClientRect();
   const measure=rect('.measure-console'),correction=rect('#correctionPanel');
   const controls=rect('#sessionControls'),exportCard=rect('.support-panel');
   return {preview:rect('#cameraStage').left,measurement:measure.left,
     measureTop:measure.top,stageTop:rect('#cameraStage').top,
     countBottom:rect('#countTotal').bottom,
     controlsBottom:controls.bottom,correctionTop:correction.top,
     correctionBottom:correction.bottom,correctionLeft:correction.left,
     correctionRight:correction.right,measureRight:measure.right,
     measureBottom:measure.bottom,exportLeft:exportCard.left};
 });
 assert(geometryDesktop.preview<geometryDesktop.measurement&&
   geometryDesktop.measureTop<=geometryDesktop.stageTop,
   'Desktop live counter must be immediately beside the camera');
 assert(geometryDesktop.countBottom<geometryDesktop.correctionTop&&
   geometryDesktop.controlsBottom<=geometryDesktop.correctionTop+1&&
   geometryDesktop.correctionLeft>=geometryDesktop.measurement-1&&
   geometryDesktop.correctionRight<=geometryDesktop.measureRight+1&&
   geometryDesktop.correctionBottom<=geometryDesktop.measureBottom+1,
   'Correction and Undo must be below the controls, inside the counting card');
 assert(await page.evaluate(()=>
   document.querySelector('#correctionPanel').closest('.measure-console')!==null&&
   document.querySelector('.export-panel').closest('.support-panel')!==null&&
   document.querySelector('.support-panel').getAttribute('aria-labelledby')==='exportHeading'
 ),'Moved correction/export container or accessible label is wrong');
 console.log('[v010] Desktop counting totals and correction/Undo share a card; CSV export remains separate.');
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
 console.log('[v010] Relocated correction +1 and Undo retain their ledger behavior.');
 console.log('[v010] Counting locks line edits; pause makes the line editable again.');
 await ctx.close();

 // Mobile: correct workflow order, no fixed overlay, no overflowing controls;
 // actual touch drag via Chromium input dispatch, not synthetic JS events.
 for(const width of [320,360,390,820]){
  const context=await browser.newContext({viewport:{width,height:844},
   permissions:['camera'],serviceWorkers:'block',hasTouch:true,isMobile:true});
  const mobile=await context.newPage();observe(mobile,'mobile-'+width);
  await mobile.goto(origin+'/',{waitUntil:'domcontentloaded'});
  const geometry=await mobile.evaluate(()=>{
   const rect=sel=>document.querySelector(sel).getBoundingClientRect();
   const panel=rect('.measure-console'),correction=rect('#correctionPanel');
   const plus=rect('#plusA'),minus=rect('#minusA'),undo=rect('#undoCorrection');
   return {stage:rect('#cameraStage').top,measure:panel.top,
     measureBottom:panel.bottom,measureRight:panel.right,measureLeft:panel.left,
     count:rect('#countA').top,countBottom:rect('#countTotal').bottom,
     correction:correction.top,correctionBottom:correction.bottom,
     correctionLeft:correction.left,correctionRight:correction.right,
     plus:plus.toJSON(),minus:minus.toJSON(),undo:undo.toJSON(),
     extras:rect('.setup-extras').top,exports:rect('.support-panel').top,
     exportRight:rect('.support-panel').right,
     scrollWidth:document.documentElement.scrollWidth,viewWidth:innerWidth,
     touchAction:getComputedStyle(document.querySelector('#cameraStage')).touchAction};
  });
  assert(geometry.scrollWidth<=geometry.viewWidth+1,'Mobile overflow at '+width);
  assert(geometry.stage<geometry.measure&&geometry.measure<geometry.count&&
    geometry.countBottom<geometry.correction&&
    geometry.correctionBottom<=geometry.measureBottom+1&&
    geometry.measureBottom<geometry.extras&&geometry.extras<geometry.exports,
    'Correction must follow the count within the same card, above settings and exports at '+width);
  assert(geometry.correctionLeft>=geometry.measureLeft-1&&
    geometry.correctionRight<=geometry.measureRight+1,
    'Correction panel escapes the count card at '+width);
  assert(geometry.plus.width>=44&&geometry.minus.width>=44&&
    geometry.plus.height>=44&&geometry.minus.height>=44&&
    geometry.undo.height>=44,
    'Correction and Undo tap targets must remain at least 44px at '+width);
  assert(geometry.plus.left>=geometry.minus.right-1&&
    geometry.plus.right<=geometry.correctionRight+1&&
    geometry.undo.right<=geometry.correctionRight+1&&
    geometry.exportRight<=geometry.viewWidth+1,
    'Correction button row / export overflows at '+width);
  assert(await mobile.locator('#testCard').isHidden(),
    'Setup check must remain hidden until a camera is ready');
  assert(geometry.measureRight<=geometry.viewWidth+1,
    'Mobile count panel overflows horizontally at '+width);
  assert((await mobile.locator('#appMain').getAttribute('data-next'))==='camera',
    'Initial state should make Start camera the next action');
  assert.equal(geometry.touchAction,'pan-y','Blank video area should allow phone page scrolling');
  if(width===390){
   await ready(mobile);
   assert(await mobile.locator('#testCard').isVisible());
   assert(await mobile.evaluate(()=>{
     const c=document.querySelector('#countA').getBoundingClientRect();
     const t=document.querySelector('#testCard').getBoundingClientRect();
     const b=document.querySelector('#beginCount');
     return c.top<t.top&&b.getBoundingClientRect().height===0;
   }),'Test CTA should appear below visible count but before real-count action');
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
