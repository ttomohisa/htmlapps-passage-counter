import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
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
   const requests=[],exceptions=[];
   page.on('request',r=>{if(/^https?:\/\//.test(r.url())&&!r.url().startsWith(origin))requests.push(r.url());});
   page.on('pageerror',e=>exceptions.push(e.message));
   await page.goto(origin+'?mode='+mode,{waitUntil:'domcontentloaded'});
   await page.locator('#runButton').click();
   await page.waitForFunction(()=>window.__litertTrial?.done===true,null,{timeout:180000});
   const outcome=await page.evaluate(()=>window.__litertTrial);
   results.push({mode,...outcome,externalRequests:requests,pageErrors:exceptions});
   console.log('[LiteRT] '+mode+': '+(outcome.ok?'SUCCESS':'FAILED')+', outbound='+requests.length);
   if(outcome.error)console.log('[LiteRT] ERROR '+outcome.error.slice(0,3500));
   await context.close();
 }
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
await writeFile('dist/litert-browser-results.json',JSON.stringify(results,null,2)+'\n');
if(results.some(r=>!r.ok||r.externalRequests.length||r.pageErrors.length))process.exitCode=1;
