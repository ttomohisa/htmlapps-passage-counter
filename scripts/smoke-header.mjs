// Browser Kitty header/hero contract, grounded in the current PDF Fill & Sign
// and Wi-Fi Share pages: compact sticky header, brand/version, language toggle,
// SVG help, single local badge and a responsive intro.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';
const html=await readFile('dist/index.html');
const server=createServer((req,res)=>{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}
  else{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const http='http://127.0.0.1:'+server.address().port;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 await mkdir('dist/screenshots',{recursive:true});
 for(const width of [320,360,390,820,1280]){
  const context=await browser.newContext({viewport:{width,height:750}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(http+'/',{waitUntil:'domcontentloaded'});
  const design=await page.evaluate(()=>{
    const header=document.querySelector('.app-header');
    const inner=document.querySelector('.header-inner');
    const hero=document.querySelector('.page-intro');
    const badge=document.querySelector('.local-badge');
    const brand=document.querySelector('.brand-name');
    const action=document.querySelector('.header-actions');
    const rect=element=>element.getBoundingClientRect().toJSON();
    return {
      viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      header:rect(header),inner:rect(inner),hero:rect(hero),badge:rect(badge),
      brand:rect(brand),actions:rect(action),
      sticky:getComputedStyle(header).position,
      iconMatches:document.querySelector('#appBrandIcon').src===document.querySelector('link[rel="icon"]').href,
      helpSvg:document.querySelectorAll('#helpButton svg').length,
      version:document.querySelector('#versionBadge').textContent,
      text:document.querySelector('#pageTitle').textContent
    };
  });
  assert.equal(design.sticky,'sticky','Non-sticky BK header at '+width);
  assert.equal(design.iconMatches,true,'Favicon/header icon mismatch');
  assert.equal(design.helpSvg,1,'Header help icon is missing');
  assert.equal(design.version,'v0.6.0');
  assert(design.scrollWidth<=width+1,'Horizontal overflow at '+width+'px');
  assert(design.brand.right<=design.actions.left+2,'Header action overlaps app name at '+width);
  assert(design.badge.top>=design.hero.top-1 &&
    design.badge.right<=design.hero.right+1 &&
    design.badge.bottom<=design.hero.bottom+1,
    'Local processing badge escapes the introductory block at '+width);
  for(const lang of ['en','ja']){
    if((await page.locator('html').getAttribute('lang'))!==lang)await page.locator('#languageButton').click();
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert.equal(await page.locator('#brandName').textContent(),lang==='en'?'Passage Counter':'通過カウンター');
    assert.equal(await page.locator('#languageButton').textContent(),lang==='en'?'JA':'EN');
    assert.match(await page.locator('.local-badge').textContent(),lang==='en'?/local processing/i:/完全ローカル処理/);
    assert((await page.locator('#pageTitle').textContent()).trim().length>8);
    assert(await page.locator('#helpButton').getAttribute('aria-label'));
    assert(await page.locator('#languageButton').getAttribute('aria-label'));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
      'Language switch caused overflow at '+width);
    if(width===320||width===1280)
      await page.screenshot({path:'dist/screenshots/'+lang+'-'+width+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[],'Browser errors at width '+width);
  console.log('[header] '+width+'px bilingual/brand/help/hero/overflow passed');
  await context.close();
 }
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log('[header] PASS: Browser Kitty header and hero responsive visual geometry');
