// Fulfil localhost requests from disk so QA does not need external network access.
const {chromium}=require('C:/Users/ymguan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const errors=[];try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',async route=>{const u=new URL(route.request().url()),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();try{const mime={'.js':'text/javascript','.html':'text/html; charset=utf-8','.glb':'model/gltf-binary'};await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{await route.fulfill({status:404,body:'missing'});}});
 await p.goto('http://127.0.0.1:8799/authoring/scythe/hero.html?v=10');await p.waitForFunction(()=>window.__ready);
 await p.evaluate(()=>{window.requestAnimationFrame=()=>0;});await p.waitForTimeout(80);

 await p.evaluate(()=>{SCYTHE_HERO.review.play('Idle');SCYTHE_HERO.review.seek(0);});
 for(const view of ['front','side','back']){await p.locator('[data-view="'+view+'"]').click();await p.evaluate(()=>{SCYTHE_HERO.review.seek(0);tick(performance.now());});await p.screenshot({path:path.join(__dirname,'v19-'+view+'.png')});}
 const report=await p.evaluate(()=>{const T=THREE,h=SCYTHE_HERO.hero,r=SCYTHE_HERO.review;let scales={},maxGrip=0;for(const action of ['Idle','Walk','Run']){r.play(action);for(let i=0;i<90;i++){r.seek(i/45);maxGrip=Math.max(maxGrip,r.metrics.grip.errorR);const a=h.getObjectByName('handR').getWorldScale(new T.Vector3()),b=h.getObjectByName('handL').getWorldScale(new T.Vector3());scales[action]=[a.toArray(),b.toArray()];}}return {profile:h.userData.heroCostumeFit.profile,scales,maxGrip,hood:!!h.getObjectByName('死神兜帽'),wrists:['L','R'].map(s=>!!h.getObjectByName('ConnectedWrist'+s))};});
 console.log(JSON.stringify({report,errors},null,2));assert.equal(errors.length,0);for(const pair of Object.values(report.scales))for(let i=0;i<3;i++)assert(Math.abs(pair[0][i]-pair[1][i])<1e-6);assert(report.maxGrip<.008);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
