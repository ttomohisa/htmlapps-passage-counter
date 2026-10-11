// v0.9 README screenshots captured from the genuine generated application.
// Fresh camera-off contexts; never fabricate people, detection or model scores.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';

const html=await readFile('dist/index.html');
const config=JSON.parse(await readFile('app.config.json','utf8'));
assert.equal(config.version,'0.9.0');
const server=createServer((req,res)=>{
 if(req.url==='/'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(html);
 }else{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
const results=[];
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-default-browser-check']});
 await mkdir('assets',{recursive:true});
 const cases=[
  {filename:'screenshot.png',lang:'ja',width:1280,height:800,fullPage:false},
  {filename:'screenshot-en.png',lang:'en',width:1280,height:800,fullPage:false},
  {filename:'screenshot-mobile.png',lang:'ja',width:390,height:844,fullPage:true},
  {filename:'screenshot-mobile-en.png',lang:'en',width:390,height:844,fullPage:true}
 ];
 for(const entry of cases){
  const context=await browser.newContext({
    viewport:{width:entry.width,height:entry.height},
    deviceScaleFactor:1,locale:entry.lang==='ja'?'ja-JP':'en-US',
    reducedMotion:'reduce',serviceWorkers:'block'
  });
  const errors=[],network=[];
  await context.route('**/*',route=>{
    const url=route.request().url();
    if(/^https?:\/\//i.test(url)&&!url.startsWith(origin+'/')){
      network.push(url);return route.abort();
    }
    return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:30_000});
  await page.waitForFunction(()=>
    document.querySelector('#versionBadge')?.textContent==='v0.9.0' &&
    document.querySelector('#savedList .saved-empty')!==null &&
    document.querySelector('#cameraStart')?.disabled===false,
    null,{timeout:15000});
  if(await page.locator('html').getAttribute('lang')!==entry.lang)
    await page.locator('#languageButton').click();
  assert.equal(await page.locator('html').getAttribute('lang'),entry.lang);
  assert.equal(await page.locator('#countTotal').textContent(),'0',
    'README screenshot must not fake measurement counts');
  assert(!(await page.locator('#cameraFeed').evaluate(v=>Boolean(v.srcObject))),
    'No camera frames should be captured for README images');
  assert.equal(await page.locator('#helpDialog').isVisible(),false,
    'Do not capture with a modal covering content');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
    'Horizontal overflow in '+entry.filename);
  // Stable explicitly exemplary labels avoid date changes or personal input.
  await page.locator('#sessionName').fill(entry.lang==='ja'?'計測前（例）':'Before counting (example)');
  await page.locator('#outputFilename').fill('passage-counter');
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});
  await page.locator('#pageTitle').waitFor({state:'visible'});
  const dest='assets/'+entry.filename;
  await page.screenshot({path:dest,fullPage:entry.fullPage,animations:'disabled',caret:'hide'});
  const image=await readFile(dest);
  assert(image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    'Output is not PNG: '+dest);
  const record={file:dest,lang:entry.lang,width:image.readUInt32BE(16),
    height:image.readUInt32BE(20),bytes:image.length,cameraUsed:false,syntheticCounts:false};
  assert.equal(record.width,entry.width);
  assert(record.height>=entry.height,'Screenshot unexpectedly cropped');
  assert.deepEqual(errors,[],'Unhandled script errors in '+dest);
  assert.deepEqual(network,[],'External network was attempted in '+dest);
  results.push(record);
  console.log('[screenshot] '+dest+' '+record.width+'x'+record.height+' '+record.bytes+' B');
  await context.close();
 }
 await writeFile('assets/SCREENSHOTS.md',[
  '# Passage Counter README screenshot provenance','',
  'All four PNGs were captured from the real generated Passage Counter v0.9.0 interface',
  'using automated Windows Chrome (desktop viewport 1280x800, mobile 390x844 full-page).',
  'These show a **pre-count, camera-off state** with genuine 0 crossing events.',
  'The session title is marked as an example; no live camera or people were used.',
  'Capture command: node scripts/capture-release-screenshots.mjs',
  'Screenshots are generated offline with no model download, personal data or telemetry.','',
  ...results.map(x=>'- '+x.file+': '+x.width+'x'+x.height+', '+x.lang+', '+x.bytes+' bytes'),
  ''
 ].join('\n'),'utf8');
 console.log('[screenshot] PASS: 4 actual UI screenshots, two languages, desktop/mobile, no external requests');
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
