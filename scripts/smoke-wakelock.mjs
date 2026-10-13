// A synthetic Wake Lock interface verifies race and release behavior on Chrome.
// No physical wake lock or battery/thermal behavior is asserted here.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';
const html=await readFile('dist/index.html');
const server=createServer((req,res)=>{
 if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);}
 else{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,
   args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({permissions:['camera']});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   window.__pendingWakeRequests=[];
   window.__resolvedWakes=[];
   Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{
     request:()=>new Promise(resolve=>{
       window.__pendingWakeRequests.push(()=>{
         const listeners=[];
         const lock={
           released:false,
           addEventListener:(event,callback)=>{if(event==='release')listeners.push(callback)},
           release:async()=>{
             if(lock.released)return;
             lock.released=true;
             for(const fn of listeners)fn();
           }
         };
         window.__resolvedWakes.push(lock);
         resolve(lock);
       });
     })
   }});
 });
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#cameraStart').click();
 await page.waitForFunction(()=>/計測準備完了|Ready to count/.test(
   document.querySelector('#statusPill')?.textContent??''),null,{timeout:90000});
 await page.locator('#testButton').click();
 await page.waitForFunction(()=>window.__pendingWakeRequests.length>=1);
 await page.locator('#testButton').click();
 await page.evaluate(()=>window.__pendingWakeRequests.shift()());
 await page.waitForFunction(()=>window.__resolvedWakes?.[0]?.released===true);
 console.log('[wake-lock] Late-arriving test wake lock released after test ended.');
 await page.locator('#beginCount').click();
 await page.waitForFunction(()=>window.__pendingWakeRequests.length>=1);
 await page.evaluate(()=>window.__pendingWakeRequests.shift()());
 await page.waitForFunction(()=>window.__resolvedWakes.length>=2);
 await page.evaluate(()=>window.__resolvedWakes[1].release());
 await page.waitForFunction(()=>/スリープ防止|wake lock was released|Screen wake lock/i.test(
   document.querySelector('#appToastMessage')?.textContent??''));
 console.log('[wake-lock] Unexpected wake lock release warned during active counting.');
 await page.locator('#pauseCount').click();
 assert.match(await page.locator('#statusPill').textContent(),/一時停止|Paused/);
 assert.deepEqual(errors,[],'Browser Wake Lock errors occurred');
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log('[wake-lock] PASS: late resolution, release notification and paused state');
