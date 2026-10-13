// Audit the exact pinned TFLite bytes, rather than inferring license from
// MediaPipe's code license or from an unverified local model.config.json field.
// No model bytes, pictures or secrets are stored in the public repo.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';

const model=JSON.parse(await readFile('model.config.json','utf8'));
assert.match(model.sha256,/^[a-f0-9]{64}$/);
assert.equal(new URL(model.url).hostname,'storage.googleapis.com');
const response=await fetch(model.url,{redirect:'follow',signal:AbortSignal.timeout(45000)});
if(!response.ok)throw Error('Model download failed: HTTP '+response.status);
const file=Buffer.from(await response.arrayBuffer());
const digest=createHash('sha256').update(file).digest('hex');
assert.equal(digest,model.sha256,'Exact pinned model SHA-256 mismatch: fail closed');
if(file.subarray(4,8).toString('ascii')!=='TFL3')throw Error('Not a TFLite FlatBuffer');

// See tensorflow/compiler/mlir/lite/schema/schema_v3b.fbs:
// Model: buffers(field 4), metadata(field 6); Metadata: name(0), buffer(1)
// See mediapipe/tasks/metadata/metadata_schema.fbs:
// ModelMetadata: name(0), description(1), version(2), ... author(4), license(5).
// Guard every offset; this is a read-only evidence extractor, not a TFLite loader.
function safe(pos,size=4){
 if(!Number.isSafeInteger(pos)||pos<0||pos+size>file.length)throw Error('Invalid FlatBuffer offset '+pos);
 return pos;
}
const u32=pos=>file.readUInt32LE(safe(pos,4));
const u16=pos=>file.readUInt16LE(safe(pos,2));
const i32=pos=>file.readInt32LE(safe(pos,4));
function field(table,index){
 const vtable=table-i32(table);safe(vtable,4);
 const vlen=u16(vtable),entry=vtable+4+index*2;
 if(vlen<4||vlen>4096||entry+2>vtable+vlen)return null;
 const offset=u16(entry);
 return offset? safe(table+offset,4):null;
}
function refAt(pos){return pos===null?null:safe(pos+u32(pos),4);}
function tableString(table,index){
 const p=refAt(field(table,index));if(p===null)return null;
 const len=u32(p);
 if(len>4096)throw Error('Metadata string too long');
 return file.subarray(safe(p+4,len),p+4+len).toString('utf8');
}
function tableNumber(table,index){
 const p=field(table,index);return p===null?null:u32(p);
}
function vector(table,index){
 const p=refAt(field(table,index));if(p===null)return [];
 const n=u32(p);if(n>250000)throw Error('Vector length unreasonable');
 safe(p+4,n*4);
 return Array.from({length:n},(_,i)=>p+4+i*4);
}
function vectorTable(element){return safe(element+u32(element),4);}
function vectorBytes(table,index){
 const p=refAt(field(table,index));if(p===null)return Buffer.alloc(0);
 const n=u32(p);safe(p+4,n);
 return file.subarray(p+4,p+4+n);
}
const root=u32(0);safe(root);
const buffers=vector(root,4);
const entries=vector(root,6);
const discovered=entries.map(el=>{
 const table=vectorTable(el);
 return {name:tableString(table,0),bufferIndex:tableNumber(table,1)};
});
const modelMeta=discovered.find(x=>x.name==='TFLITE_METADATA');
let embeddedMetadata=null;
let parseError=null;
if(modelMeta && Number.isInteger(modelMeta.bufferIndex)&&modelMeta.bufferIndex>=0&&modelMeta.bufferIndex<buffers.length){
 try{
  const bufferTable=vectorTable(buffers[modelMeta.bufferIndex]);
  const bytes=vectorBytes(bufferTable,0);
  const start=bytes.readUInt32LE(0);
  if(start<4||start>=bytes.length)throw Error('Invalid nested metadata root');
  // Nested FlatBuffer uses its own offsets; do not read against outer file.
  // Rebind parser locally using a safe slice copied to Buffer.
  const nested=Buffer.from(bytes);
  const safeN=(p,n=4)=>{if(!Number.isInteger(p)||p<0||p+n>nested.length)throw Error('Invalid nested offset');return p};
  const i32N=p=>nested.readInt32LE(safeN(p));
  const u32N=p=>nested.readUInt32LE(safeN(p));
  const u16N=p=>nested.readUInt16LE(safeN(p,2));
  const fieldN=(table,index)=>{
   const vt=table-i32N(table);safeN(vt);
   const size=u16N(vt),entry=vt+4+index*2;
   if(size<4||size>4096||entry+2>vt+size)return null;
   const off=u16N(entry);
   return off?safeN(table+off):null;
  };
  const readStr=index=>{
   const pos=fieldN(start,index);if(pos===null)return null;
   const target=pos+u32N(pos),n=u32N(target);
   if(n>8192)throw Error('ModelMetadata text too large');
   return nested.subarray(safeN(target+4,n),target+4+n).toString('utf8');
  };
  embeddedMetadata={name:readStr(0),description:readStr(1),version:readStr(2),
    author:readStr(4),license:readStr(5)};
 }catch(e){parseError=String(e.message||e);}
}
const licenseHeader={};
for(const key of ['x-goog-meta-license','x-goog-meta-licence','x-goog-meta-attribution','x-goog-meta-copyright']){
 const value=response.headers.get(key);
 if(value)licenseHeader[key]=value.slice(0,1000);
}
const maintainerDefaults=[
 {url:'https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830',statement:'MediaPipe source and models, unless otherwise noted, are Apache 2.0'},
 {url:'https://github.com/google-ai-edge/mediapipe/issues/4906#issuecomment-1778649604',statement:'MediaPipe object detection models have Apache 2.0 commercial-use terms'}
];
const report={
 auditedAt:new Date().toISOString(),
 exactModel:{id:model.id,url:model.url,sha256:digest,bytes:file.length,format:'TFL3'},
 officialDownloadStatus:response.status,
 modelMetadata:embeddedMetadata,
 metadataEntries:discovered,
 metadataParseError:parseError,
 sourceResponseLicenseHeaders:licenseHeader,
 repositoryConfigLicense:model.license,
 upstreamMaintainerLicenseBasis:maintainerDefaults,
 licenseEvidenceScope:'Downloaded hash-verified model, TFLite embedded metadata and GCS object headers only',
 redistributionConclusion:
   embeddedMetadata?.license?.trim()?
   'MODEL_METADATA_HAS_LICENSE_TEXT_REVIEW_WITH_EXACT_TERMS':
   Object.keys(licenseHeader).length?
   'SOURCE_HAS_LICENSE_HEADER_REVIEW_WITH_EXACT_TERMS':
   'NO_EXPLICIT_MODEL_SPECIFIC_REDISTRIBUTION_LICENSE_FOUND',
 warning:'File-local model metadata does not state a license, but upstream MediaPipe maintainers state that source and models default to Apache 2.0 unless an exception is noted. The official EfficientDet int8 guide has no exception. This is a technical provenance audit, not legal advice.'
};
await mkdir('dist',{recursive:true});
await writeFile('dist/model-license-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('[model-rights] SHA256 VERIFIED '+digest+' ('+file.length+' bytes)');
console.log('[model-rights] metadata '+JSON.stringify(embeddedMetadata));
console.log('[model-rights] metadata entries '+JSON.stringify(discovered));
console.log('[model-rights] source license headers '+JSON.stringify(licenseHeader));
console.log('[model-rights] file-local evidence '+report.redistributionConclusion);
console.log('[model-rights] external upstream Apache-2.0 model policy '+JSON.stringify(maintainerDefaults));
