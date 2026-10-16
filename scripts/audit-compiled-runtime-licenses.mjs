// Research-grade audit of the actual pinned npm archive: package license,
// embedded JS+WASM SHA256, LICENSE/NOTICE files, and v0.10.35 source mapping.
// Does NOT claim legal clearance for compiled third-party dependencies.
// Run in Windows CI only; downloaded archive and binaries are never committed.
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const hash=x=>createHash('sha256').update(x).digest('hex');
const dep=JSON.parse(await readFile('dependencies.json','utf8')).dependencies.find(x=>x.id==='mediapipe');
const lock=JSON.parse(await readFile('dependencies.lock.json','utf8')).dependencies.find(x=>x.id==='mediapipe');
if(!dep||!lock||dep.version!=='0.10.35'||dep.version!==lock.version)throw Error('Pinned npm package version mismatch');
const archiveUrl='https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-'+dep.version+'.tgz';
const response=await fetch(archiveUrl,{redirect:'follow',signal:AbortSignal.timeout(45000)});
if(!response.ok)throw Error('Could not fetch pinned npm archive: '+response.status);
const archive=Buffer.from(await response.arrayBuffer());
const digest=hash(archive);
if(digest!==lock.tarballSha256)throw Error('npm archive hash does not match checked-in lock: '+digest);
const tar=gunzipSync(archive);
const members=[];
const errors=[];
function text(buf){return buf.toString('utf8').replace(/\0.*$/s,'').trim();}
for(let pos=0;pos+512<=tar.length;){
 const header=tar.subarray(pos,pos+512);
 if(header.every(v=>v===0))break;
 const name=text(header.subarray(0,100));
 const prefix=text(header.subarray(345,500));
 const fullName=prefix?prefix+'/'+name:name;
 const mode=text(header.subarray(100,108));
 const size=parseInt(text(header.subarray(124,136)).trim()||'0',8);
 const type=header.subarray(156,157).toString('ascii');
 if(!fullName||!Number.isSafeInteger(size)||size<0||
    fullName.includes('..')||fullName.startsWith('/')||fullName.includes('\\'))
  throw Error('Unsafe npm archive path/header');
 const start=pos+512;
 if(start+size>tar.length)throw Error('Truncated npm archive member: '+fullName);
 if(type==='0'||type==='\0'||type===''){
  const bytes=tar.subarray(start,start+size);
  members.push({name:fullName,bytes});
 }
 pos=start+512*Math.ceil(size/512);
}
const get=name=>members.find(m=>m.name===name)?.bytes;
const pkgBuf=get('package/package.json');
if(!pkgBuf)throw Error('Actual published package.json missing');
const packageJson=JSON.parse(pkgBuf.toString('utf8'));
if(packageJson.version!==dep.version||packageJson.license!=='Apache-2.0')
 throw Error('Published package metadata does not match pinned version/license');
const noticeMatches=members.filter(m=>/(^|\/)(LICEN[CS]E|NOTICE|COPYING|AUTHORS|THIRD_PARTY|THIRDPARTY)(?:$|[._-])/i.test(m.name))
 .map(m=>({path:m.name,bytes:m.bytes.length,sha256:hash(m.bytes),preview:m.bytes.toString('utf8').slice(0,180)}));
const publishedMembers=members.filter(m=>m.name.startsWith('package/wasm/')||m.name==='package/vision_bundle.mjs')
 .map(m=>({path:m.name,bytes:m.bytes.length,sha256:hash(m.bytes)}));
const wasmEntry=publishedMembers.find(x=>x.path==='package/wasm/vision_wasm_internal.wasm');
const moduleEntry=publishedMembers.find(x=>x.path==='package/vision_bundle.mjs');
if(!wasmEntry||!moduleEntry)throw Error('Actual distribution binary entries were not found in tarball');
const releaseGates=JSON.parse(await readFile('docs/release-gates.v1.0.0.json','utf8'));
const accepted=releaseGates.gates.find(x=>x.id==='LICENSE-STANDALONE');
if(releaseGates.decision!=='GO'||accepted?.status!=='risk_accepted'||
 accepted?.severity!=='release_exception'||accepted?.releaseAcceptance?.notLegalClearance!==true)
 throw Error('Risk-managed GO must disclose explicit owner acceptance');
if(digest!==accepted.expectedNpmTarballSha256||wasmEntry.sha256!==accepted.expectedWasmSha256||
 wasmEntry.bytes!==accepted.expectedWasmBytes)
 throw Error('Pinned MediaPipe bytes differ from the release acceptance; re-review required');
const upstream={
 repo:'google-ai-edge/mediapipe',
 sourceTag:'v0.10.35',
 sourceCommit:'f8ef212d5c962c0e853db7e59d217056b187084b',
 workspace:'https://github.com/google-ai-edge/mediapipe/blob/v0.10.35/WORKSPACE',
 sourceFiles:'https://github.com/google-ai-edge/mediapipe/tree/v0.10.35/mediapipe/tasks/web/vision',
 eigenCommit:'4c38131a16803130b66266a912029504f2cf23cd',
 eigenTarballSha256:'1a432ccbd597ea7b9faa1557b1752328d6adc1a3db8969f6fe793ff704be3bf0',
 eigenSource:'https://gitlab.com/libeigen/eigen/-/tree/4c38131a16803130b66266a912029504f2cf23cd',
 eigenLicense:'MPL-2.0 and BSD components, per mediapipe/third_party/eigen.BUILD at v0.10.35',
 bazelVisionWasmSha256:'e17fc0c480b79a16ad1756bb81ebd9a6c117b1ec4cad6084c6d6a417a6f426b7',
 bazelVisionWasmUrl:'https://github.com/google-ai-edge/mediapipe/blob/v0.10.35/third_party/wasm_files.bzl'
};
const matchingTagWasm=wasmEntry.sha256===upstream.bazelVisionWasmSha256;
if(upstream.bazelVisionWasmSha256!==accepted.expectedTaggedBazelWasmSha256)
 throw Error('Tagged reference SHA changed; re-review provenance');
const report={
 auditedAt:new Date().toISOString(),
 package:{name:dep.package,version:dep.version,declaredLicense:packageJson.license,
  lockSha256:lock.tarballSha256,verifiedTarballSha256:digest,archiveBytes:archive.length,
  packageDependencies:packageJson.dependencies||{},fileCount:members.length},
 licenseNoticeFiles:noticeMatches,
 shippedRuntimeFiles:publishedMembers,
 upstream,
 sourceCorrelation:{wasmByteIdenticalToReleaseTagBazelArtifact:matchingTagWasm,
   actualNpmWasmSha256:wasmEntry.sha256,
   releaseTagBazelWasmSha256:upstream.bazelVisionWasmSha256,
   sourceMappingStatus:matchingTagWasm?'TAG_WASM_HASH_MATCHES':
     'TAG_WASM_HASH_DIFFERS_EXACT_WASM_SOURCE_REVISION_NOT_ESTABLISHED',
   exactCorrespondingSourceVerified:false,completeBinaryThirdPartyNoticeSetVerified:false,
   releaseDisposition:'GO_BY_OWNER_RISK_ACCEPTANCE_NOT_LEGAL_CLEARANCE'},
 notes:[
  '0.10.35 npm package declares Apache-2.0, but the package-level declaration is not a dependency-by-dependency SBOM.',
  'MediaPipe tag v0.10.35 WORKSPACE pins Eigen (MPL-2.0 + BSD) with the source revision listed above; code presence in the precise npm wasm has not been independently decompiled or provenance-confirmed.',
  'If the compiled npm wasm hash differs from the Bazel wasm hash at the tag, do not misrepresent the tag as the exact provenance for this binary.',
  'MPL-2.0 Section 3.2 may require notice and corresponding covered source availability for included Eigen code; separate attribution for third-party BSD notices may apply.',
  'An npm tarball without NOTICE or LICENSE is not proof that there are no applicable notice obligations.',
  'This inventory deliberately leaves legal clearance to human review of each actual compiled component.'
 ]
};
await mkdir('dist',{recursive:true});
await writeFile('dist/compiled-runtime-license-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('[runtime-license] npm tarball SHA256 verified '+digest);
console.log('[runtime-license] published tarball files='+members.length+
 ' LICENSE/NOTICE candidates='+JSON.stringify(noticeMatches));
console.log('[runtime-license] pinned WASM '+JSON.stringify(wasmEntry));
console.log('[runtime-license] tag provenance '+report.sourceCorrelation.sourceMappingStatus);
console.log('[runtime-license] Exact npm source/NOTICE mapping remains unverified; GO exception accepted for unchanged hashes');
console.log('[runtime-license] Eigen upstream pinned '+upstream.eigenCommit);
