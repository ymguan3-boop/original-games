import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),release='20261107-fixes-r1';
for(const folder of ['初光商會/js','幻靈奇旅/defense/js'])for(const name of fs.readdirSync(path.join(root,folder))){if(!name.endsWith('.js'))continue;const p=path.join(root,folder,name),old=fs.readFileSync(p,'utf8'),next=old.replace(/((?:from\s+|import\s*\(?\s*)['"])(\.{1,2}\/[^'"?]+\.js)(?:\?v=[^'"]+)?(['"])/g,`$1$2?v=${release}$3`);if(next!==old)fs.writeFileSync(p,next);}
for(const [entry,script]of [['初光商會/index.html','./js/app.js'],['幻靈奇旅/defense/index.html','js/main.js']]){const p=path.join(root,entry);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(new RegExp(script.replaceAll('.','\\.')+'\\?v=[^" ]+','g'),script+'?v='+release));}
