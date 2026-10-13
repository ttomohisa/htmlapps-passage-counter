// v1.0.0 mechanical audit. This script does NOT approve field/mobile/legal gates.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {basename,join,dirname} from 'node:path';
const read=async file=>await readFile(file,'utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const config=JSON.parse(await read('app.config.json'));
const expectedVersion='1.0.0';
assert.equal(config.version,expectedVersion,'App version must be v1.0.0');
const model=JSON.parse(await read('model.config.json'));
const locked=JSON.parse(await read('dependencies.lock.json'));
const dependencies=JSON.parse(await read('dependencies.json'));
const gates=JSON.parse(await read('docs/release-gates.v1.0.0.json'));
assert.equal(gates.schemaVersion,1);
assert.equal(gates.version,expectedVersion);
assert(Array.isArray(gates.gates)&&gates.gates.length>=7);
const unresolved=gates.gates.filter(g=>g.severity==='blocker'&&
  g.status!=='verified'&&g.status!=='passed');
const futureWork=gates.gates.filter(g=>g.severity==='future_work');
const requiredBlockers=['LICENSE-STANDALONE'];
const modelLicenseGate=gates.gates.find(g=>g.id==='LICENSE-MODEL');
assert(modelLicenseGate?.status==='verified'&&modelLicenseGate?.evidence?.some(x=>x.includes('issuecomment-5997480830')),
  'Model Apache 2.0 assessment must be based on actual MediaPipe maintainer policy, not merely local config');
const deferred=['AC-04','AC-06','AC-07-WIN','AC-07-ANDROID','AC-07-IOS'];
for(const id of requiredBlockers){
 const value=gates.gates.find(g=>g.id===id);
 assert(value,'License gate '+id+' must not disappear');
 assert(value.severity==='blocker');
}
for(const id of deferred){
 const value=gates.gates.find(g=>g.id===id);
 assert(value,'Future Work gate '+id+' must not disappear');
 assert(value.severity==='future_work'&&value.status==='future_work',
   'Deferred field evidence must not be marked tested or removed: '+id);
}
assert(unresolved.length>0,'Remaining compiled runtime/standalone NOTICE blockers must stay explicit');
assert.equal(gates.decision,'NO_GO',
  'A release GO still requires complete standalone notice review and manual signoff');
const output=config.build.output;
const selfOutput=config.build.selfExtract?.output;
assert(typeof output==='string'&&typeof selfOutput==='string','Configured HTML output missing');
const htmlBytes=await readFile(output),wrapperBytes=await readFile(selfOutput);
const html=htmlBytes.toString('utf8');
assert(html.startsWith('<!doctype html>'));
const rootFilename=config.repository.name.replace(/^htmlapps-/,'')+'.html';
const rootCopy=await readFile(rootFilename);
assert.deepEqual(rootCopy,htmlBytes,'Repository root standalone must byte-match');
assert(html.includes('v'+expectedVersion),'Standalone version badge missing');
assert(!html.includes('v0.8.0'),'Stale previous version appears in distribution');
const favicon=await readFile('assets/favicon.svg');
const actualSvgSha=sha(favicon);
const expectedSvgSha='8a536f0010588eee74f3b0d800c5406b0015543cc58dcbaf3b84b411294209e9';
assert.equal(actualSvgSha,expectedSvgSha,'Supplied Passage Counter SVG changed unexpectedly');
const iconDataUri='data:image/svg+xml;base64,'+favicon.toString('base64');
assert.equal(html.split(iconDataUri).length-1,2,
  'Exactly same supplied SVG must be embedded as favicon and header icon');
assert.match(html,/connect-src blob:\s*;/,'Expected blob-only CSP connect-src');
assert(!/<script[^>]+src\s*=\s*["']https?:/i.test(html),'External script left in standalone');
const manifest=JSON.parse(await read(join(dirname(output),'dependency-manifest.json')));
const sizes=JSON.parse(await read(join(dirname(output),'build-size-report.json')));
assert.equal(manifest.app.version,config.version);
assert.equal(sizes.readableHtmlBytes,htmlBytes.length);
assert.equal(sizes.selfExtractHtmlBytes,wrapperBytes.length);
const modelAsset=manifest.dependencies.find(x=>x.id==='person-model');
assert(modelAsset,'Model missing from build manifest');
assert.equal(modelAsset.assets.find(x=>x.key==='tflite')?.sha256,model.sha256);
const runtimeAsset=manifest.dependencies.find(x=>x.id==='mediapipe');
assert(runtimeAsset,'SIMD MediaPipe missing from manifest');
assert.equal(runtimeAsset.package,'@mediapipe/tasks-vision');
assert.equal(runtimeAsset.version,dependencies.dependencies.find(x=>x.id==='mediapipe').version);
assert.equal(runtimeAsset.tarballSha256,locked.dependencies.find(x=>x.id==='mediapipe').tarballSha256);
const assetKeys=runtimeAsset.assets.map(x=>x.key);
for(const key of ['module','simd-loader','simd-wasm'])
 assert(assetKeys.includes(key),'Embedded MediaPipe asset missing: '+key);
assert(!assetKeys.some(x=>/baseline|non-simd/i.test(x)),
  'Non-SIMD asset reintroduced unexpectedly');
const licenseText=await read('licenses/Apache-2.0.txt');
assert(licenseText.includes('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION')&&
  licenseText.length>11000,'Full Apache 2.0 license text missing');
assert(html.includes('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION')&&
  html.includes('id="embeddedApacheLicense"')&&
  !html.includes('__MEDIAPIPE_APACHE_LICENSE_TEXT__'),
  'Standalone HTML must visibly carry full MediaPipe Apache 2.0 license text');
const extraLicenses=[
 ['licenses/Eigen-MPL-2.0.txt','embeddedEigenMplLicense','__EIGEN_MPL_LICENSE_TEXT__'],
 ['licenses/Eigen-COPYING.BSD.txt','embeddedEigenBsdNotice','__EIGEN_BSD_NOTICE_TEXT__'],
 ['licenses/Eigen-COPYING.MINPACK.txt','embeddedEigenMinpackNotice','__EIGEN_MINPACK_NOTICE_TEXT__'],
 ['licenses/Eigen-COPYING.README.txt','embeddedEigenLicenseReadme','__EIGEN_LICENSE_README_TEXT__'],
 ['LICENSE','embeddedAppMitLicense','__APP_MIT_LICENSE_TEXT__']
];
for(const [filepath,id,placeholder] of extraLicenses){
 const txt=await read(filepath);
 assert(txt.length>250,'Missing/incomplete offline license '+filepath);
 assert(html.includes('id="'+id+'"')&&!html.includes(placeholder),
   'Standalone HTML lacks readable notice '+filepath);
 if(filepath==='licenses/Eigen-MPL-2.0.txt')
   assert(html.includes('Mozilla Public License Version 2.0'),'Bundled MPL-2.0 full license text absent');
 if(filepath==='LICENSE')
   assert(html.includes('Permission is hereby granted'),'MIT application notice absent');
}
assert.equal(model.license,'Apache-2.0',
  'Exact model license must match upstream maintainer policy');
assert(model.licenseBasis?.evidence?.some(x=>x.includes('issuecomment-5997480830')),
  'The model license config must preserve verifiable upstream evidence');
const thirdParty=await read('THIRD_PARTY_NOTICES.md');
for(const needle of [model.sha256,runtimeAsset.tarballSha256,'UNVERIFIED','licenses/Apache-2.0.txt'])
 assert(thirdParty.includes(needle),'Third-party notice incomplete: '+needle);
const specs=[
 {name:'screenshot.png',width:1280,minHeight:800,language:'ja'},
 {name:'screenshot-en.png',width:1280,minHeight:800,language:'en'},
 {name:'screenshot-mobile.png',width:390,minHeight:844,language:'ja'},
 {name:'screenshot-mobile-en.png',width:390,minHeight:844,language:'en'}
];
const pngMagic=Buffer.from([137,80,78,71,13,10,26,10]);
const pics=[];
for(const entry of specs){
 const filepath='assets/'+entry.name;
 const bytes=await readFile(filepath);
 assert(bytes.subarray(0,8).equals(pngMagic),'Invalid PNG: '+filepath);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert.equal(width,entry.width,'Unexpected PNG width for '+filepath);
 assert(height>=entry.minHeight,'Unexpected PNG height for '+filepath);
 assert(bytes.length>3000,'Suspected blank/truncated screenshot '+filepath);
 pics.push({file:filepath,width,height,bytes:bytes.length,sha256:sha(bytes),language:entry.language});
}
const en=await read('README.md'),ja=await read('README.ja.md');
for(const name of ['screenshot.png','screenshot-en.png','screenshot-mobile.png','screenshot-mobile-en.png']){
 assert(en.includes('assets/'+name),'EN README missing screenshot link '+name);
 assert(ja.includes('assets/'+name),'JA README missing screenshot link '+name);
}
const provenance=await read('assets/SCREENSHOTS.md');
assert(provenance.includes('pre-count')&&provenance.includes('camera-off'),
  'Screenshot provenance must explain zero-count and camera-off conditions');
const docs=await read('docs/RELEASE_READINESS_v1.0.0.md');
assert(docs.includes('NO-GO')&&docs.includes('LICENSE-MODEL'),
  'Release readiness document must expose licensing and field blockers');
const report={
 schemaVersion:1,appVersion:expectedVersion,
 automatedEngineering:'PASS',releaseDecision:'NO_GO',
 auditIsNotLegalAdvice:true,
 distribution:{
  readable:{path:output,bytes:htmlBytes.length,sha256:sha(htmlBytes)},
  selfExtract:{path:selfOutput,bytes:wrapperBytes.length,sha256:sha(wrapperBytes)},
  repositoryRoot:{path:rootFilename,sha256:sha(rootCopy)}
 },
 pinnedAssets:{
  icon:{sha256:actualSvgSha,embeddedOccurrences:2},
  model:{name:model.name,version:model.version,sha256:model.sha256,licenseStatus:'Apache-2.0 upstream maintainer default unless otherwise noted'},
  mediapipe:{version:runtimeAsset.version,tarballSha256:runtimeAsset.tarballSha256,
    wasmKey:'simd-wasm'}
 },
 readmeScreenshots:pics,
 unresolvedReleaseGates:unresolved.map(g=>({id:g.id,subject:g.subject,status:g.status})),
 futureWork:futureWork.map(g=>({id:g.id,subject:g.subject,status:g.status})),
 hostedCsp:{cloudflarePreview:'verified',productionSite:'not covered by this standalone audit'},
 note:'CI verifies reproducibility only. Owner deferred physical-device and real-count accuracy to Future Work; specific model redistribution and all standalone NOTICE obligations remain unverified.'
};
await mkdir('dist',{recursive:true});
await writeFile('dist/release-audit.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log('[release-audit] PASS mechanical integrity: '+htmlBytes.length+' + '+wrapperBytes.length+' bytes');
console.log('[release-audit] PASS 4 genuine README screenshots, pinned model/SIMD, SVG/license/notices');
console.log('[release-audit] NO_GO legal: '+unresolved.map(g=>g.id).join(', '));
console.log('[release-audit] Future Work (not passed): '+futureWork.map(g=>g.id).join(', '));
console.log('[release-audit] Cloudflare Preview CSP checked; model Apache-2.0 is now grounded in upstream maintainer statements; compiled notices still pending.');
