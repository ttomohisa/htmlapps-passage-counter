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
     // Use the browser's own PNG encoder for a valid, entirely local image.
     // createImageBitmap(file) is not consistently supported for SVG blobs.
     await page.evaluate(async()=>{
       const canvas=document.createElement('canvas');
       canvas.width=320;canvas.height=320;
       const ctx=canvas.getContext('2d');
       ctx.fillStyle='#fff';ctx.fillRect(0,0,320,320);
       ctx.fillStyle='#555';ctx.beginPath();ctx.arc(160,85,40,0,Math.PI*2);ctx.fill();
       ctx.fillRect(120,140,80,110);
       const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
       if(!blob)throw Error('PNG fixture generation failed');
       const transfer=new DataTransfer();
       transfer.items.add(new File([blob],'local-silhouette.png',{type:'image/png'}));
       document.querySelector('#photo').files=transfer.files;
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
