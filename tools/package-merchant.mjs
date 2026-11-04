#!/usr/bin/env node
// Runtime-only closure. Source art and prior deliveries are never deleted.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const worktree=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const source=path.resolve(option('--source',path.join(worktree,'../original-games/初光商會')));
try{await fs.access(path.join(source,'runtime-manifest.json'));throw Error('This is a packaged runtime. Pass --source pointing to the preserved authoring project.');}catch(error){if(error.code!=='ENOENT')throw error;}
const destination=path.resolve(option('--dest',path.join(worktree,'初光商會')));
const mainPath=option('--main-path','../幻靈奇旅/').replace(/\/?$/,'/');
const dryRun=args.includes('--dry-run');
const compress=!args.includes('--no-compress');
if(source===destination||destination.startsWith(source+path.sep))throw Error('Destination must be outside authoring source');
if(!/^\.\.\/[^?#]+\/$/.test(mainPath))throw Error('--main-path must be a relative sibling path such as ../game/');
const files=new Map(),external=new Map(),missing=[],queue=[];
const normalized=s=>s.replaceAll('\\','/');
const forbidden=/(^|\/)(docs|qa|tests|node_modules|evidence|buildtools)(\/|$)|\.(blend\d*|py|psd)$/i;
async function add(rel,reason){
 rel=normalized(path.posix.normalize(rel.replace(/^@shop\//,'').replace(/^\.\//,''))).split(/[?#]/)[0];
 if(rel.startsWith('../幻靈奇旅/'))return addExternal(rel.slice('../幻靈奇旅/'.length),reason);
 if(rel.startsWith('../')||path.isAbsolute(rel)||forbidden.test(rel))throw Error('Invalid runtime dependency '+rel);
 if(files.has(rel)){files.get(rel).reasons.add(reason);return;}
 try{const stat=await fs.stat(path.join(source,rel));if(!stat.isFile())return;files.set(rel,{reasons:new Set([reason])});queue.push(rel);}catch{missing.push({path:rel,reason});}
}
async function addExternal(rel,reason){
 rel=normalized(path.posix.normalize(rel));if(external.has(rel))return;
 const location=path.resolve(source,'../幻靈奇旅',rel);let exists=true;try{await fs.access(location);}catch{exists=false;}
 external.set(rel,{path:mainPath+rel,sourcePath:rel,exists,reason});
 if(!exists)missing.push({path:mainPath+rel,reason,external:true});
}
const moduleFrom=name=>import(pathToFileURL(path.join(source,'js',name)).href);
await add('index.html','entry');
// Dynamic adapters: enumerate live registries, not historical asset directories.
const {shelfTypes,shelfModel}=await moduleFrom('furniture.js');
const {decorTypes,decorModel}=await moduleFrom('decorations.js');
const {productPath}=await moduleFrom('shelf-products.js');
const {productPreview}=await moduleFrom('goods-panel.js');
const {wallSkins}=await moduleFrom('wall-finish-v7.js');
for(const shelf of shelfTypes){await add(shelfModel(shelf.id),'shelf registry');await add(shelf.id==='orbs'?'assets/art-v9/previews/rack-orbs-v3.png':`assets/art-v7/previews/rack-${shelf.id}.png`,'shelf preview');}
for(const decor of decorTypes)for(const level of decor.id==='carpet'?[1,2,3,4,5]:[1]){await add(decorModel(decor.id,level),'decor registry');await add(`assets/art-v7/previews/decor-${decor.id}${decor.id==='carpet'?'-l'+level:''}.png`,'decor preview');}
for(const name of ['shop-catalog','hire-pool','spirits','evolution','store-levels','economy'])await add(`data/${name}.json`,'core dynamic data loader');
const catalog=JSON.parse(await fs.readFile(path.join(source,'data/shop-catalog.json'),'utf8'));
for(const item of catalog){const model=productPath(item.sku);if(model.startsWith('@shop/'))await add(model,'catalog product');else await addExternal(model,'catalog product');await add(productPreview(item.sku),'catalog preview');}
for(const skin of wallSkins.filter(Boolean))await add('assets/art-v7/'+skin.file,'wall registry');
for(const name of ['floor','royal-floor','marble'])await add(`assets/art-v6/${name}.png`,'floor level variants');
for(const name of ['cash-counter','sesame-chair'])await add(`assets/art-v5/interior/${name}.glb`,'interior loader');
for(const name of ['patrol','trade','ledger','prestige'])await add(`assets/art-v5/quest-${name}.png`,'quest icons');
const html=await fs.readFile(path.join(source,'index.html'),'utf8');
for(const match of html.matchAll(/data-icon=["']([^"']+)/g))await add(`assets/ui-generated/icon-${match[1]}.png`,'HTML icon registry');
for(const name of ['queue','boxes','praise','magic','shoplift','cleaning'])await add(`assets/ui-generated/event-${name}.webp`,'patrol role events');
// Native actor loaders are lazy and cannot be inferred from an import graph.
for(const name of ['birds-blueprint','elephants-blueprint','families','tricolor-egg','small-birds','little-eagle','dapeng','avian-spirits','replacement-spirits','leaf-frogs','frog-spirits','floral-deer','light-phoenix','riceball','xiaoshan'])await addExternal(`models/native/${name}.js`,'native actor adapter');
await addExternal('survivors/js/robot-evolution-v08.js','native actor adapter');await addExternal('js/hero-costumes.js','hero costumes');
for(const json of ['spirits','card-art']){
 await addExternal(`data/${json}.json`,'actor/card registry');
 const data=JSON.parse(await fs.readFile(path.resolve(source,`../幻靈奇旅/data/${json}.json`),'utf8'));
 const walk=async value=>{if(typeof value==='string'&&/^(models|assets)\/.+\.(glb|png|webp|jpg)$/i.test(value))await addExternal(value,`${json} registry`);else if(value&&typeof value==='object')for(const v of Object.values(value))await walk(v);};await walk(data);
}
for(let i=0;i<queue.length;i++){
 const rel=queue[i],ext=path.extname(rel),buf=await fs.readFile(path.join(source,rel));
 if(ext==='.glb'){
  const json=JSON.parse(buf.subarray(20,20+buf.readUInt32LE(12)).toString('utf8').trim());
  for(const item of [...json.buffers||[],...json.images||[]])if(item.uri&&!item.uri.startsWith('data:'))await add(path.posix.join(path.posix.dirname(rel),item.uri),rel+' GLB resource');
 }
 if(!['.html','.css','.js','.json'].includes(ext))continue;
 const text=buf.toString('utf8');
 if(ext==='.html')for(const m of text.matchAll(/(?:src|href)=["']([^"']+)["']/g))if(!/^(#|https?:|data:)/.test(m[1]))await add(m[1],rel);
 if(ext==='.css')for(const m of text.matchAll(/url\(["']?([^"')]+)["']?\)/g))if(!/^(data:|https?:)/.test(m[1]))await add(path.posix.join(path.posix.dirname(rel),m[1]),rel);
 if(ext==='.js'){
  for(const m of text.matchAll(/(?:from\s*|import\s*\(?)["'](\.[^"']+\.js)["']/g))await add(path.posix.join(path.posix.dirname(rel),m[1]),rel+' import');
  // Literal asset URLs are document-relative, unlike ES imports.
  for(const m of text.matchAll(/["'`]((?:\.\/|@shop\/|\.\.\/幻靈奇旅\/)?(?:assets|data)\/[^"'`$<>]+?\.(?:png|webp|jpg|glb|json))["'`]/g))await add(m[1],rel+' asset');
  for(const m of text.matchAll(/["'](models\/[^"']+\.(?:glb|js))["']/g))await addExternal(m[1],rel+' external literal');
 }
}
const converted=new Map();
let conversionDirectory;
if(compress){
 conversionDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'merchant-runtime-'));
 const jobs=[...files.keys()].filter(rel=>/\.(png|glb)$/.test(rel)).map((rel,index)=>({source:path.join(source,rel),output:path.join(conversionDirectory,index+(rel.endsWith('.glb')?'.glb':'.webp')),rel,limit:rel.includes('/previews/')?512:1024}));
 const python=spawnSync('python',['-X','utf8',path.join(worktree,'tools/package-merchant-images.py')],{input:JSON.stringify(jobs),encoding:'utf8',maxBuffer:1024*1024});
 if(python.status!==0)throw Error('Pillow conversion failed: '+python.stderr);
 const results=JSON.parse(python.stdout);for(const item of results)converted.set(item.rel,item);
}
const manifest={schema:1,createdAt:new Date().toISOString(),mainPath,compression:{enabled:compress,format:'WebP',quality:88,method:6,maxTextureDimension:1024,maxPreviewDimension:512,glb:'PNG optimized to max 1024; all non-image buffer bytes verified unchanged'},files:[],externalDependencies:[...external.values()].sort((a,b)=>a.path.localeCompare(b.path)),unresolvedDependencies:missing,dynamicAdapters:['live shelf/decor registries','catalog productPath/productPreview','wallSkins','core data','floor/interior/quest/event variants','HTML icon registry','main actor/card registries and native dispatch'],externalScope:'Sibling main game is delivered separately. Listed direct dependencies are validated against authoring sibling; its own transitive dependencies remain owned by the main-game bundle.'};
let originalTotalBytes=0;
for(const [rel,entry]of [...files].sort(([a],[b])=>a.localeCompare(b))){
 let content=await fs.readFile(path.join(source,rel));
 originalTotalBytes+=content.length;
 const conversion=converted.get(rel),outputRel=conversion?rel.replace(/\.png$/,'.webp'):rel;
 if(conversion)content=await fs.readFile(conversion.output);
 if(['.html','.css','.js','.json'].includes(path.extname(rel))){
  let text=content.toString('utf8').replaceAll('../幻靈奇旅/',mainPath);
  for(const input of converted.keys())text=text.replaceAll(input,input.replace(/\.png$/,'.webp'));
  if(compress&&['js/app.js','js/furnishing-panel.js','js/goods-panel.js','js/quest-view.js','js/architecture-v6.js'].includes(rel))text=text.replaceAll('.png','.webp');
  content=Buffer.from(text);
 }
 manifest.files.push({path:outputRel,sourcePath:rel,bytes:content.length,sha256:createHash('sha256').update(content).digest('hex'),reasons:[...entry.reasons].sort(),...(conversion?.glb?{glbConversion:{changedImages:conversion.changedImages,nonImageBufferSha256:conversion.nonImageBufferSha256,savedBytes:conversion.savedBytes}}:conversion?{image: {originalSize:conversion.originalSize,size:conversion.size}}:{})});
 if(!dryRun){const target=path.join(destination,outputRel);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,content);}
}
manifest.fileCount=manifest.files.length;manifest.totalBytes=manifest.files.reduce((sum,f)=>sum+f.bytes,0);
manifest.originalTotalBytes=originalTotalBytes;manifest.savedBytes=originalTotalBytes-manifest.totalBytes;
// Only prune files owned by the previous manifest, never arbitrary authoring files.
if(!dryRun){try{const old=JSON.parse(await fs.readFile(path.join(destination,'runtime-manifest.json'),'utf8')),keep=new Set(manifest.files.map(f=>f.path));for(const oldFile of old.files){const resolved=path.resolve(destination,oldFile.path);if(!resolved.startsWith(destination+path.sep))throw Error('Unsafe old manifest path');if(!keep.has(oldFile.path))await fs.unlink(resolved).catch(error=>{if(error.code!=='ENOENT')throw error;});}}catch(error){if(error.code!=='ENOENT')throw error;}}
if(!dryRun)await fs.writeFile(path.join(destination,'runtime-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
if(conversionDirectory){const target=path.resolve(conversionDirectory);if(path.dirname(target)!==path.resolve(os.tmpdir())||!path.basename(target).startsWith('merchant-runtime-'))throw Error('Unsafe temporary directory');await fs.rm(target,{recursive:true,force:true});}
console.log(JSON.stringify({destination,dryRun,fileCount:manifest.fileCount,totalBytes:manifest.totalBytes,originalTotalBytes,savedBytes:manifest.savedBytes,MiB:Number((manifest.totalBytes/1048576).toFixed(2)),externalDependencies:external.size,unresolvedDependencies:missing,manifest:dryRun?null:path.join(destination,'runtime-manifest.json')},null,2));
if(missing.length)process.exitCode=1;
