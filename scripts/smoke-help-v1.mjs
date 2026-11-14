// Passage Counter v1.0.0 help dialog and site-width regression.
// Uses genuine generated HTML. Synthetic browser UI test, not device field QA.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';

const html=await readFile('dist/index.html');
const errors=[],network=[];
const server=createServer((req,res)=>{
  if(req.url==='/'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end(html);
  }else{
    res.writeHead(404);res.end('Not found');
  }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  await mkdir('test-results/help-copy',{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [width,height] of [[320,568],[360,720],[390,844],[820,680],[1280,850]]){
    const context=await browser.newContext({viewport:{width,height},
      locale:'ja-JP',serviceWorkers:'block',hasTouch:width<821,isMobile:width<821});
    await context.route('**/*',route=>{
      const url=route.request().url();
      if(/^https?:\/\//.test(url)&&!url.startsWith(origin+'/')){
        network.push(url);return route.abort();
      }
      return route.continue();
    });
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(width+': '+e.message));
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#versionBadge').textContent(),'v1.1.0');
    const initial=await page.evaluate(()=>{
      const h=document.querySelector('.header-inner'),m=document.querySelector('.shell.main');
      const rect=e=>e.getBoundingClientRect();
      return {h:rect(h).toJSON(),m:rect(m).toJSON(),
        hPadding:parseFloat(getComputedStyle(h).paddingLeft),
        mPadding:parseFloat(getComputedStyle(m).paddingLeft),
        overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert(!initial.overflow,'Horizontal overflow at '+width);
    assert(Math.abs(initial.h.left-initial.m.left)<1&&
      Math.abs(initial.h.right-initial.m.right)<1,
      'Header and body widths do not align at '+width);
    assert.equal(initial.hPadding,initial.mPadding,
      'Header and body gutters differ at '+width);

    await page.evaluate(()=>window.scrollTo(0,Math.min(450,
      Math.max(0,document.documentElement.scrollHeight-innerHeight-100))));
    // Help link is on sticky header and should not drag page to top.
    for(const lang of ['ja','en']){
      const actual=await page.locator('html').getAttribute('lang');
      if(actual!==lang)await page.locator('#languageButton').click();
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      const hero=await page.locator('.hero-copy').evaluate(el=>({title:el.querySelector('h1').textContent,intro:el.querySelector('p').textContent,overflow:el.scrollWidth>el.clientWidth+1}));
      assert(!hero.overflow,'Short hero stays within the page at '+width);
      assert(hero.title.length<=15&&hero.intro.length<=45,'Hero stays concise in '+lang);
      const initialY=await page.evaluate(()=>window.scrollY);
      await page.locator('#helpButton').click();
      await page.locator('#helpDialog').waitFor({state:'visible'});
      await page.locator('#helpDialogBody').evaluate(el=>el.scrollTop=0);
      if([320,1280].includes(width))await page.screenshot({path:`test-results/help-copy/help-${lang}-${width}.png`});
      const state=await page.evaluate(()=>{
        const d=document.querySelector('#helpDialog');
        const b=document.querySelector('#helpDialogBody');
        const close=document.querySelector('#helpClose');
        const rect=d.getBoundingClientRect(),closeRect=close.getBoundingClientRect();
        return {
          scrollOffset:document.body.style.getPropertyValue('--help-scroll-offset'),
          rootLocked:document.documentElement.classList.contains('help-scroll-locked'),
          bodyLocked:document.body.classList.contains('help-scroll-locked'),
          bodyPosition:getComputedStyle(document.body).position,
          dialog:rect.toJSON(),close:closeRect.toJSON(),
          closeIcon:close.querySelector('svg')!==null,
          closeLabel:close.getAttribute('aria-label'),
          bodyClientHeight:b.clientHeight,bodyScrollHeight:b.scrollHeight,
          headings:[...d.querySelectorAll('.help-dialog-body h3')].map(x=>x.textContent),
          stepCount:d.querySelectorAll('.help-dialog-body ol li').length,
          limitCount:d.querySelectorAll('.help-dialog-body ul li').length,
          buttonCount:d.querySelectorAll('.help-dialog-head button').length
        };
      });
      assert(state.rootLocked&&state.bodyLocked&&state.bodyPosition==='fixed',
        'Help must lock both html and body scrolling at '+width);
      assert.equal(state.scrollOffset,'-'+initialY+'px');
      assert(state.dialog.left>=-1&&state.dialog.right<=width+1&&
        state.dialog.top>=-1&&state.dialog.bottom<=height+1,
        'Help dialog is clipped at '+width);
      assert(state.close.width===34&&state.close.height===34&&state.closeIcon&&state.closeLabel,
        'Help close button needs a working 34px localized X at '+width);
      assert(state.close.left>=state.dialog.left&&state.close.right<=state.dialog.right+1,
        'Help close X extends beyond the dialog');
      assert.equal(state.buttonCount,1,'Help needs one close control in its header');
      assert.equal(state.headings.length,3,'Help groups starting, correcting/saving and important limits');
      assert.equal(state.stepCount,4,'Start instructions cover source, line, camera check and counting');
      assert(state.limitCount>=5,'Help must describe actual product limitations');
      assert(state.bodyScrollHeight>state.bodyClientHeight,
        'Help body must be independently scrollable at '+width);

      // The dialog body scrolls but background stays locked and retains its offset.
      await page.locator('#helpDialogBody').evaluate(el=>el.scrollTop=el.scrollHeight);
      assert(await page.locator('#helpDialogBody').evaluate(el=>el.scrollTop>0));
      const beforeWheel=await page.evaluate(()=>document.body.style.top);
      await page.locator('#helpDialogBody').hover();
      await page.mouse.wheel(0,400);
      assert.equal(await page.evaluate(()=>document.body.style.top),beforeWheel,
        'Scrolling within help shifted the background');
      const required=lang==='ja'?/まずは4ステップ|知っておきたいこと/:/Start in four steps|Before you rely on the counts/;
      assert(state.headings.some(h=>required.test(h)),'Localized help headings are wrong');
      for(const key of ['helpStep5','helpStep6','helpImportant','helpLimitInterrupt']){
        assert(await page.locator('[data-i18n="'+key+'"]').isVisible(),'Essential guidance stays expanded: '+key);
      }
      for(const topic of await page.locator('.help-topic').all()){
        assert.equal(await topic.getAttribute('open'),null);
        await topic.locator('summary').click();
        assert(await topic.locator('p').first().isVisible(),'Optional guidance opens');
        await topic.locator('summary').click();
      }
      const license=page.locator('#embeddedLicenseNotice');
      await license.locator('summary').click();
      for(const id of ['embeddedApacheLicense','embeddedEigenMplLicense','embeddedEigenBsdNotice','embeddedEigenMinpackNotice','embeddedEigenLicenseReadme','embeddedAppMitLicense']){
        assert((await page.locator('#'+id).textContent()).length>100,'Full license/notice retained: '+id);
        await page.locator('#'+id).scrollIntoViewIfNeeded();
        assert(await page.locator('#'+id).isVisible(),'License text remains reachable: '+id);
      }
      await license.locator('summary').click();

      if(lang==='ja'){
        // ESC uses native cancel->close event and must restore scroll and focus.
        await page.keyboard.press('Escape');
      }else{
        await page.locator('#helpClose').click();
      }
      await page.waitForFunction(()=>
        !document.documentElement.classList.contains('help-scroll-locked')&&
        !document.body.classList.contains('help-scroll-locked')&&
        !document.querySelector('#helpDialog').open);
      const restored=await page.evaluate(()=>({
        scrollY:window.scrollY,
        offset:document.body.style.getPropertyValue('--help-scroll-offset'),
        focus:document.activeElement?.id,
        bodyPosition:getComputedStyle(document.body).position
      }));
      assert(Math.abs(restored.scrollY-initialY)<3,
        'Background scroll position not restored at '+width+' / '+lang);
      assert.equal(restored.offset,'');
      assert.equal(restored.focus,'helpButton',
        'Closing Help should return keyboard focus to the Help button');
      assert.notEqual(restored.bodyPosition,'fixed');
    }

    // Backdrop-click pathway must also release the scroll lock.
    await page.locator('#helpButton').click();
    await page.locator('#helpDialog').waitFor({state:'visible'});
    await page.mouse.click(2,Math.round(height/2));
    // Native dialog.close() clears [open] before the asynchronous close event;
    // wait for its scroll-unlock callback, not only the attribute mutation.
    await page.waitForFunction(()=>
      !document.querySelector('#helpDialog').open&&
      !document.body.classList.contains('help-scroll-locked')&&
      !document.documentElement.classList.contains('help-scroll-locked'));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await context.close();
    console.log('[help-v1] PASS '+width+'x'+height+' aligned header/body, JA/EN, scrolling, X, ESC and backdrop');
  }
  assert.deepEqual(errors,[],'Unexpected JS browser errors');
  assert.deepEqual(network,[],'Unexpected runtime external network requests');
  console.log('[help-v1] PASS all help and layout regression checks; outbound HTTP 0');
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
