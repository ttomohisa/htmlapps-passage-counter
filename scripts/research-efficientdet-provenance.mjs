// Research only: compare the exact pinned Google MediaPipe EfficientDet-Lite0
// int8 binary to independently Apache-2.0-labelled EfficientDet variants.
// No source assets are committed or redistributed by this script.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir, mkdtemp,rm,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,sep} from 'node:path';
import {execFileSync} from 'node:child_process';

const model=JSON.parse(await readFile('model.config.json','utf8'));
const maxBytes=40*1024*1024;
const urls=[
  {id:'kaggle-view-1',url:'https://www.kaggle.com/api/v1/models/view/tensorflow/efficientdet'},
  {id:'kaggle-view-2',url:'https://www.kaggle.com/api/v1/models/tensorflow/efficientdet'},
  {id:'kaggle-lite0-int8',url:'https://www.kaggle.com/api/v1/models/tensorflow/efficientdet/tfLite/lite0-int8/1/download'},
  {id:'kaggle-lite0-metadata',url:'https://www.kaggle.com/api/v1/models/tensorflow/efficientdet/tfLite/lite0-detection-metadata/1/download'},
  {id:'huggingface-litert-public',url:'https://huggingface.co/api/models/litert-community/efficientdet'},
  {id:'huggingface-original-hash',url:'https://huggingface.co/api/models/junjiang/GestureFace'}
];
const report={
  auditedAt:new Date().toISOString(),
  target:{url:model.url,sha256:model.sha256},
  evidence:[],
  conclusion:'RESEARCH_IN_PROGRESS',
  scope:'Public model metadata and actual downloaded candidate TFLite hashes. Different sha256 means NOT byte-identical; matching sha256 alone does not override source rights.'
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const dir=await mkdtemp(join(tmpdir(),'efficientdet-rights-'));
function selectLicenseMetadata(value){
 const output={};
 if(!value||typeof value!=='object')return output;
 for(const key of ['id','slug','title','licenseName','license','ownerSlug','url','description','modelInstanceType']){
  if(typeof value[key]==='string')output[key]=value[key].slice(0,350);
 }
 const instances=Array.isArray(value.modelInstances)?value.modelInstances:
   Array.isArray(value.instances)?value.instances:
   Array.isArray(value.modelVariations)?value.modelVariations:[];
 output.variations=instances.filter(x=>JSON.stringify(x).toLowerCase().includes('lite0')).map(x=>{
  const y={};
  for(const key of ['id','slug','licenseName','license','framework','overview']){
   if(typeof x[key]==='string'||typeof x[key]==='number')y[key]=String(x[key]).slice(0,350);
  }
  const versions=x.modelInstanceVersions||x.versions||[];
  y.versions=Array.isArray(versions)?versions.slice(0,3).map(v=>({
    number:v.versionNumber||v.version||null,license:v.licenseName||null})):null;
  return y;
 }).slice(0,10);
 const siblings=Array.isArray(value.siblings)?value.siblings:[];
 output.files=siblings.map(x=>({path:x.rfilename,sha256:x.lfs?.sha256,size:x.size}))
   .filter(x=>/efficientdet|tflite/i.test(x.path||'')).slice(0,8);
 return output;
}
async function candidateFiles(root){
 const found=[];
 async function scan(where){
  for(const ent of await readdir(where,{withFileTypes:true})){
   const path=join(where,ent.name);
   if(ent.isDirectory()){await scan(path);continue;}
   if(!ent.isFile()||!path.endsWith('.tflite'))continue;
   const data=await readFile(path);
   found.push({path:relative(root,path),bytes:data.length,
     sha256:sha(data),byteIdenticalToPassageCounter:sha(data)===model.sha256});
  }
 }
 await scan(root);
 return found;
}
try{
 for(const {id,url} of urls){
  const entry={id,url};
  const isArchive=id.startsWith('kaggle-lite');
  try{
   const res=await fetch(url,{
    redirect:'follow',
    headers:{'user-agent':'BrowserKittySourceProvenanceAudit/1.0',
     'accept':isArchive?'application/octet-stream, application/zip, application/gzip, */*':'application/json'},
    signal:AbortSignal.timeout(isArchive?60000:30000)
   });
   entry.status=res.status;
   entry.finalUrl=res.url.slice(0,550);
   entry.contentType=res.headers.get('content-type');
   entry.contentLength=res.headers.get('content-length');
   if(!res.ok){
    entry.warning='Public metadata or archive not reachable without credentials or route changed';
   }else if(isArchive){
    const len=Number(entry.contentLength)||0;
    if(len>maxBytes){entry.warning='Download too large for small research audit';}
    else{
     const buf=Buffer.from(await res.arrayBuffer());
     entry.receivedBytes=buf.length;
     if(buf.length>maxBytes){entry.warning='Exceeded size limit';}
     else{
      const file=join(dir,id+'.archive');
      await writeFile(file,buf);
      entry.archiveSha256=sha(buf);
      const kind=buf.subarray(0,2).toString('hex');
      entry.signature=kind;
      try{
       const names=execFileSync('tar',['-tf',file],{encoding:'utf8',
         timeout:20000,maxBuffer:500000}).split(/\r?\n/).filter(Boolean);
       if(names.some(n=>n.startsWith('/')||n.includes('..')||n.includes('\\')))
         throw Error('Unsafe archive member path');
       const out=join(dir,id+'-contents');await mkdir(out);
       execFileSync('tar',['-xf',file,'-C',out],{timeout:25000,maxBuffer:500000});
       entry.tfliteFiles=await candidateFiles(out);
       entry.archiveEntries=names.slice(0,24);
      }catch(error){entry.archiveError=String(error.message||error).slice(0,500);}
     }
    }
   }else{
    const text=await res.text();
    if(text.length>2e6)throw Error('Unexpected large metadata payload');
    try{entry.metadata=selectLicenseMetadata(JSON.parse(text));}
    catch{entry.warning='Not valid JSON';entry.snippet=text.slice(0,170);}
   }
  }catch(error){entry.error=String(error.message||error).slice(0,500);}
  report.evidence.push(entry);
  console.log('[provenance] '+id+' '+JSON.stringify({
    status:entry.status,type:entry.contentType,bytes:entry.receivedBytes,
    license:entry.metadata?.licenseName||entry.metadata?.license,
    variants:entry.metadata?.variations,files:entry.tfliteFiles,
    warning:entry.warning,error:entry.error,archiveError:entry.archiveError}));
 }
 report.conclusion=report.evidence.some(e=>e.tfliteFiles?.some(f=>f.byteIdenticalToPassageCounter))?
   'EXACT_BINARY_FOUND_IN_ALTERNATIVE_SOURCE_REVIEW_LICENSE_PROVENANCE':
   'NO_PROVEN_BYTE_IDENTICAL_APACHE_LICENSED_BINARY';
 console.log('[provenance] '+report.conclusion);
}finally{
 await mkdir('dist',{recursive:true});
 await writeFile('dist/efficientdet-model-provenance.json',JSON.stringify(report,null,2)+'\n');
 await rm(dir,{recursive:true,force:true});
}
