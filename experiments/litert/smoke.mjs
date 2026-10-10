import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const html=await readFile('dist/litert-trial.html');
const server=createServer((req,res)=>{
  if(req.url.startsWith('/trial')){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);}
  else{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port+'/trial';
const results=[];let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const mode of ['optimized','compat']){
   const context=await browser.newContext(),page=await context.newPage();
   const requests=[],exceptions=[],consoleErrors=[],failedRequests=[];
   page.on('request',r=>{if(/^https?:\/\//.test(r.url())&&!r.url().startsWith(origin))requests.push(r.url());});
   page.on('pageerror',e=>exceptions.push(e.message));
   page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleErrors.push({
     type:m.type(),text:m.text(),location:m.location()});});
   page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
   await page.goto(origin+'?mode='+mode,{waitUntil:'domcontentloaded'});
   if(mode==='optimized'){
     const svg='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="#fff"/><circle cx="160" cy="85" r="40" fill="#666"/><path d="M120 140h80v110h-80Z" fill="#444"/></svg>';
     await page.locator('#photo').setInputFiles({
       name:'local-silhouette.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)
     });
   }
   await page.locator('#runButton').click();
   await page.waitForFunction(()=>window.__litertTrial?.done===true,null,{timeout:180000});
   const outcome=await page.evaluate(()=>window.__litertTrial);
   results.push({mode,...outcome,externalRequests:requests,pageErrors:exceptions,
     consoleErrors,failedRequests});
   console.log('[LiteRT] '+mode+': '+(outcome.ok?'SUCCESS':'FAILED')+', outbound='+requests.length);
   if(outcome.ok&&mode==='optimized'&&!outcome.report?.rawSignals){
     throw Error('Local image did not produce any raw classification signal diagnostics');
   }
   if(outcome.error)console.log('[LiteRT] ERROR '+outcome.error.slice(0,3500));
   if(consoleErrors.length)console.log('[LiteRT] Console diagnostics '+JSON.stringify(consoleErrors).slice(0,3500));
   if(failedRequests.length)console.log('[LiteRT] Failed requests '+JSON.stringify(failedRequests).slice(0,1500));
   await context.close();

   const localContext=await browser.newContext(),localPage=await localContext.newPage();
   const localRequests=[],localErrors=[];
   localPage.on('request',r=>{if(/^https?:\/\//.test(r.url()))localRequests.push(r.url());});
   localPage.on('pageerror',e=>localErrors.push(e.message));
   const fileUrl=pathToFileURL(resolve('dist/litert-trial.html')).href+'?mode='+mode;
   await localPage.goto(fileUrl,{waitUntil:'domcontentloaded'});
   await localPage.locator('#runButton').click();
   await localPage.waitForFunction(()=>window.__litertTrial?.done===true,null,{timeout:180000});
   const fileOutcome=await localPage.evaluate(()=>window.__litertTrial);
   results.push({mode:mode+'-file',...fileOutcome,externalRequests:localRequests,pageErrors:localErrors});
   console.log('[LiteRT] '+mode+' file:// '+(fileOutcome.ok?'SUCCESS':'FAILED')+
     ', remote='+localRequests.length);
   if(fileOutcome.error)console.log('[LiteRT] file:// ERROR '+fileOutcome.error.slice(0,3000));
   await localContext.close();
 }
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
await writeFile('dist/litert-browser-results.json',JSON.stringify(results,null,2)+'\n');
if(results.some(r=>!r.ok||r.externalRequests.length||r.pageErrors.length))process.exitCode=1;
