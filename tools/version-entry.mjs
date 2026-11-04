import fs from 'node:fs';
const file=new URL('../幻靈奇旅/index.html',import.meta.url);
let s=fs.readFileSync(file,'utf8');
for(const name of ['commerce-hall','game'])s=s.replace(new RegExp('js/'+name+'\\.js\\?v=[^" ]+','g'),'js/'+name+'.js?v=20261104-merchant-entry-v1');
fs.writeFileSync(file,s);
