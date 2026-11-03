// Fulfil localhost requests from disk so QA does not need external network access.
const {chromium}=require('C:/Users/ymguan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const errors=[];try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',async route=>{const u=new URL(route.request().url()),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();try{const mime={'.js':'text/javascript','.html':'text/html; charset=utf-8','.glb':'model/gltf-binary'};await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{await route.fulfill({status:404,body:'missing'});}});
 await p.goto('http://127.0.0.1:8799/authoring/scythe/hero.html?v=10');await p.waitForFunction(()=>window.__ready);
 await p.evaluate(()=>{window.requestAnimationFrame=()=>0;});await p.waitForTimeout(80);
 const report=await p.evaluate(()=>{
  const x=SCYTHE_HERO,r=x.review,T=THREE;
  const snapshot=()=>{x.hero.updateMatrixWorld(true);return ['handR','handL','propR'].flatMap(n=>{const o=x.hero.getObjectByName(n);return [...o.getWorldPosition(new T.Vector3()).toArray(),...o.getWorldQuaternion(new T.Quaternion()).toArray()];});};
  const diff=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
  r.play('Idle');r.seek(0);const ready=snapshot();let holdDrift=0;
  for(let i=0;i<240;i++){r.seek(i/60);holdDrift=Math.max(holdDrift,diff(ready,snapshot()));}
  r.strike('1');r.seek(.32);const single=snapshot();let repeatDrift=0;for(let i=0;i<240;i++){r.seek(.32);repeatDrift=Math.max(repeatDrift,diff(single,snapshot()));}
  r.strike('all');const seconds=(r.total+.2)/r.comboRate;let airVertices=0,maxStep=0,previous=null;const phases=new Set();
  for(let i=0;i<Math.ceil(seconds*60);i++){r.seek(i/60);const s=snapshot();if(previous)maxStep=Math.max(maxStep,diff(s.slice(0,3),previous.slice(0,3)));previous=s;phases.add(r.metrics.phase);airVertices=Math.max(airVertices,scene.getObjectByName('ScytheBladeAir').geometry.drawRange.count);}
  r.seek(seconds+.02);return{holdDrift,repeatDrift,airVertices,maxHandStep:maxStep,phases:[...phases],seconds,rate:r.comboRate,after:r.metrics.phase,swishes:r.metrics.swishes,weaponParent:x.weapon.parent.name};
 });
 const directions=await p.evaluate(()=>{
  const r=SCYTHE_HERO.review,clone=()=>JSON.parse(JSON.stringify(r.metrics.grip));
  r.strike('1');r.seek(.85);const down=clone();
  r.strike('3');r.seek(.65);const lowEnd=clone();
  r.strike('4');r.seek(.35);const counterMid=clone();r.seek(.70);const counterEnd=clone();
  r.strike('5');r.seek(.25);const spinStart=clone();r.seek(1.50);const spinEnd=clone(),turn=SCYTHE_HERO.actor.rotation.y;
  return{down,lowEnd,counterMid,counterEnd,spinStart,spinEnd,turn};
 });
 assert(directions.down.bladeDirection[1]<-.5,'Downstroke must finish blade-down');
 assert(directions.counterMid.shaft[0]*directions.lowEnd.shaft[0]+directions.counterMid.shaft[2]*directions.lowEnd.shaft[2]<-.95,'Countercut must point to the opposite side');
 assert(Math.abs(directions.counterMid.shaft[1])<.02,'Countercut must be horizontal');assert(Math.abs(directions.turn-4*Math.PI)<1e-6,'Spin must complete two turns');
 for(const d of Object.values(directions).filter(x=>x?.errorR!==undefined))assert(Math.max(d.errorR,d.errorL)<.008,'Two-hand grip IK error');
 assert(report.holdDrift<1e-7,'Unstable hold');assert(report.repeatDrift<1e-7,'Accumulating transform');assert(report.airVertices>0,'No blade air trail');assert(report.rate>1.5);assert(!report.phases.some(x=>x.includes('踢')));assert(report.after==='SwordReady');
 for(const [id,time,name]of [['1',.85,'v10-down'],['4',.35,'v10-counter'],['5',.75,'v10-spin']]){await p.evaluate(({id,time})=>{SCYTHE_HERO.review.strike(id);SCYTHE_HERO.review.seek(time);renderer.render(scene,camera);},{id,time});await p.screenshot({path:path.join(__dirname,name+'.png')});}
 await p.evaluate(()=>{const r=SCYTHE_HERO.review;r.strike('all');for(let i=0;i<97;i++)r.seek(i/60);renderer.render(scene,camera);});await p.screenshot({path:path.join(__dirname,'v10-trail.png')});
 await p.evaluate(()=>{SCYTHE_HERO.review.play('Idle');SCYTHE_HERO.review.seek(0);renderer.render(scene,camera);});await p.screenshot({path:path.join(__dirname,'v9-ready.png')});
 const audio=await p.evaluate(async()=>{const c=new OfflineAudioContext(1,44100,44100),b=c.createBuffer(1,16758,44100);let seed=29;const d=b.getChannelData(0);for(let i=0;i<d.length;i++){seed=(1664525*seed+1013904223)>>>0;d[i]=seed/4294967296*2-1;}const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='bandpass';f.Q.value=.65;f.frequency.setValueAtTime(900,0);f.frequency.exponentialRampToValueAtTime(4800,.065);f.frequency.exponentialRampToValueAtTime(1300,.23);g.gain.setValueAtTime(.0001,0);g.gain.exponentialRampToValueAtTime(.18,.018);g.gain.exponentialRampToValueAtTime(.0001,.25);s.connect(f);f.connect(g);g.connect(c.destination);s.start();s.stop(.29);const result=await c.startRendering(),v=result.getChannelData(0);return{peak:Math.max(...v),nonzero:v.some(x=>Math.abs(x)>.001)};});assert(audio.nonzero&&audio.peak<1,'Invalid swish');assert.equal(errors.length,0);
 fs.writeFileSync(path.join(__dirname,'v10-verification.json'),JSON.stringify({report,directions,audio,errors},null,2));console.log(JSON.stringify({report,directions,audio,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
