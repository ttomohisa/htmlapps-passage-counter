import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build as esbuild} from 'esbuild';

const root=resolve(import.meta.dirname,'../..'), here=resolve(import.meta.dirname);
const config=JSON.parse(await readFile(join(root,'model.config.json'),'utf8'));
const model=await readFile(join(root,'.cache','person-model-'+config.sha256+'.tflite'));
const hash=createHash('sha256').update(model).digest('hex');
if(hash!==config.sha256)throw Error('Model SHA-256 mismatch '+hash);
const result=await esbuild({
  entryPoints:[join(here,'node_modules','@litertjs','core','dist','index.js')],
  platform:'browser',format:'esm',target:['es2022'],bundle:true,minify:true,write:false,
  legalComments:'none',logLevel:'warning'
});
const wasm=join(here,'node_modules','@litertjs','core','wasm');
const files={
  'core.mjs':Buffer.from(result.outputFiles[0].contents),
  'optimized-loader.js':await readFile(join(wasm,'litert_wasm_internal.js')),
  'optimized.wasm':await readFile(join(wasm,'litert_wasm_internal.wasm')),
  'compat-loader.js':await readFile(join(wasm,'litert_wasm_compat_internal.js')),
  'compat.wasm':await readFile(join(wasm,'litert_wasm_compat_internal.wasm')),
  'model.tflite':model
};
const assets={},size={};
for(const [name,b] of Object.entries(files)){
  const gzip=gzipSync(b,{level:9,memLevel:9});
  assets[name]={base64:gzip.toString('base64'),bytes:b.length};
  size[name]={rawBytes:b.length,gzipBytes:gzip.length,sha256:createHash('sha256').update(b).digest('hex')};
}
const template=await readFile(join(here,'template.html'),'utf8');
if(template.split('__TRIAL_ASSETS__').length!==2)throw Error('Expected one embedded-asset placeholder');
const output=join(root,'dist','litert-trial.html');
await mkdir(join(root,'dist'),{recursive:true});
await writeFile(output,template.replace('__TRIAL_ASSETS__',JSON.stringify(assets)));
const bytes=(await stat(output)).size;
const report={version:1,engine:'@litertjs/core@2.5.3',modelSha256:hash,htmlBytes:bytes,assets:size,
  baselineMediaPipeBytes:13505896,containsBothWasmVariants:true};
await writeFile(join(root,'dist','litert-trial-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('[litert] model hash verified',hash);
for(const [name,item] of Object.entries(size))console.log('[litert] asset '+name+' '+JSON.stringify(item));
console.log('[litert] SINGLE HTML bytes:',bytes);
