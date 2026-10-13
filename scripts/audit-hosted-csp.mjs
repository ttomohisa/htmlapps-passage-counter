// Probe an actual Cloudflare Preview HTTP response and the effective browser
// CSP while initializing Passage Counter's exact bundled model with a fake
// camera. Page content and input data are not uploaded by this audit.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '../.smoke/node_modules/playwright/index.mjs';

const source={
  label:'Cloudflare PR #10 Preview',
  url:process.env.PASSAGE_COUNTER_CLOUDFLARE_URL ||
    'https://r1413462956-pr-10-bk-previews.ttomohisa.workers.dev/'
};
const pages={
  label:'GitHub Pages (not a v1 candidate deployment)',
  url:'https://ttomohisa.github.io/htmlapps-passage-counter/'
};
const results=[];
const forbidden=['http:','https:','ws:','wss:'];
const getDirective=(text,key)=>{
 const items=String(text||'').split(';').map(x=>x.trim()).filter(Boolean);
 const found=items.find(x=>x.toLowerCase().split(/\s+/)[0]===key);
 return found||null;
};
const timeout=65000;
for(const site of [source,pages]){
 const entry={site:site.label,url:site.url};
 try{
  const response=await fetch(site.url,{redirect:'follow',
    headers:{'user-agent':'BrowserKittyReleaseAudit/1.0','accept':'text/html'},
    signal:AbortSignal.timeout(timeout)});
  entry.httpStatus=response.status;
  entry.finalUrl=response.url;
  entry.contentType=response.headers.get('content-type');
  entry.contentSecurityPolicyHeader=response.headers.get('content-security-policy');
  entry.contentSecurityPolicyReportOnly=response.headers.get('content-security-policy-report-only');
  entry.otherHeaders={
    xContentTypeOptions:response.headers.get('x-content-type-options'),
    crossOriginOpenerPolicy:response.headers.get('cross-origin-opener-policy'),
    crossOriginEmbedderPolicy:response.headers.get('cross-origin-embedder-policy'),
    permissionsPolicy:response.headers.get('permissions-policy')
  };
  const html=await response.text();
  const match=html.match(/<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=["']([^"']+)["']/i);
  entry.metaCsp=match?.[1]||null;
  entry.documentVersion=(html.match(/id=["']versionBadge["'][^>]*>\s*(v\d+(?:\.\d+){2})/)||[])[1]||null;
  entry.hasRuntimeInlineHtml=/<main[\s>]/i.test(html)&&/<script[\s>]/i.test(html);
  entry.htmlBytes=Buffer.byteLength(html);
  entry.probeInterpretation=response.status!==200?'NOT_HTTP_200':
    entry.documentVersion!=='v1.0.0'?'NON_CANDIDATE_OR_STALE':
    entry.metaCsp?'META_CSP_OBSERVED':'NO_META_CSP';
  entry.cspDirectives={
    headerConnectSrc:getDirective(entry.contentSecurityPolicyHeader,'connect-src'),
    metaConnectSrc:getDirective(entry.metaCsp,'connect-src'),
    headerScriptSrc:getDirective(entry.contentSecurityPolicyHeader,'script-src'),
    metaScriptSrc:getDirective(entry.metaCsp,'script-src'),
    metaWorkerSrc:getDirective(entry.metaCsp,'worker-src')
  };
 }catch(error){entry.probeError=String(error.message||error);}
 results.push(entry);
 console.log('[host-csp] '+site.label+' HTTP '+(entry.httpStatus??'unavailable')+
   ' version='+(entry.documentVersion??'unknown')+' headerCSP='+
   (entry.contentSecurityPolicyHeader?'present':'absent')+' metaCSP='+
   (entry.metaCsp?'present':'absent'));
}
const main=results[0];
if(main.httpStatus!==200)throw Error('Cloudflare Preview did not return HTTP 200');
assert.equal(main.documentVersion,'v1.0.0',
 'Cloudflare Preview is not serving the current Passage Counter v1.0.0');
assert(main.metaCsp,'Hosted HTML lacks inline CSP meta tag');
assert(/connect-src\s+blob:\s*(;|$)/.test(main.metaCsp),'Missing outbound-network-blocking connect-src');
assert(/worker-src\b[^;]*blob:/.test(main.metaCsp),'Embedded loader blob worker CSP missing');
assert(/script-src\b[^;]*wasm-unsafe-eval/.test(main.metaCsp),'WASM CSP missing');
const violations=[],externalRequests=[],pageErrors=[];
let browser;
let modelInitialization='NOT_CHECKED';
let actualPageVersion=null;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
    '--no-default-browser-check']});
 const origin=new URL(source.url).origin;
 const context=await browser.newContext({viewport:{width:1100,height:850},
   permissions:['camera'],serviceWorkers:'block'});
 const page=await context.newPage();
 await page.addInitScript(()=>{
  window.__auditedCsp=[];
  document.addEventListener('securitypolicyviolation',event=>{
   window.__auditedCsp.push({
    violatedDirective:event.violatedDirective,
    effectiveDirective:event.effectiveDirective,
    blockedURI:event.blockedURI,
    disposition:event.disposition,
    sourceFile:event.sourceFile
   });
  });
 });
 page.on('pageerror',e=>pageErrors.push(e.message));
 page.on('request',req=>{
  const u=req.url();
  if((u.startsWith('http://')||u.startsWith('https://'))&&!u.startsWith(origin+'/'))
   externalRequests.push(u);
 });
 const res=await page.goto(source.url,{waitUntil:'domcontentloaded',timeout});
 assert.equal(res?.status(),200);
 actualPageVersion=await page.locator('#versionBadge').textContent();
 assert.equal(actualPageVersion,'v1.0.0');
 await page.locator('#cameraStart').click();
 await page.waitForFunction(()=>{
  const phase=document.querySelector('#appMain')?.dataset.phase;
  return phase==='ready'||phase==='error';
 },null,{timeout:90000});
 modelInitialization=await page.locator('#appMain').getAttribute('data-phase');
 violations.push(...(await page.evaluate(()=>window.__auditedCsp||[])));
 await context.close();
}catch(e){
 modelInitialization='FAILED: '+String(e.message||e).slice(0,2500);
}finally{
 if(browser)await browser.close();
}
const report={
 auditedAt:new Date().toISOString(),
 scope:'External HTTP response headers from hosted URLs, plus actual Chrome camera/model initialization with current Cloudflare Preview.',
 origins:results,
 actualBrowser:{version:actualPageVersion,modelInitialization,securityPolicyViolations:violations,
   unexpectedExternalRequests:externalRequests,pageErrors},
 effectiveCloudflareCspResult:!main.metaCsp?'FAIL_NO_META':
   violations.length||pageErrors.length||externalRequests.length||
   modelInitialization!=='ready'?'FAIL_BROWSER_OR_CSP':
   'PASS_META_ENFORCED_NO_CSP_VIOLATIONS_IN_TESTED_PATHS',
 notes:[
  'Absent HTTP CSP header does not mean absent CSP when an enforcing HTML meta CSP is present.',
  'HTTP CSP header and meta CSP are cumulative: a restrictive header can break the app even when its meta looks valid.',
  'No QA here establishes every possible browser/device/feature; mobile physical tests are future work.',
  'GitHub Pages may be 404 or show a different main version; do not claim current v1.0.0 validation for stale pages.',
  'Cloudflare PR Preview is separate from Browser Kitty main production site, which is not being changed.'
 ]
};
await mkdir('dist',{recursive:true});
await writeFile('dist/host-csp-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('[host-csp] Cloudflare HTTP CSP='+JSON.stringify(main.contentSecurityPolicyHeader));
console.log('[host-csp] Cloudflare meta CSP='+JSON.stringify(main.metaCsp));
console.log('[host-csp] browser='+modelInitialization+
  ' CSP violations='+violations.length+' pageErrors='+pageErrors.length+
  ' unexpectedHTTP='+externalRequests.length);
console.log('[host-csp] RESULT '+report.effectiveCloudflareCspResult);
if(report.effectiveCloudflareCspResult!=='PASS_META_ENFORCED_NO_CSP_VIOLATIONS_IN_TESTED_PATHS')
 throw Error('Hosted CSP audit did not pass: '+report.effectiveCloudflareCspResult);
