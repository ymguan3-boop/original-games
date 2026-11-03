// Fulfil localhost requests from disk so QA does not need external network access.
const {chromium}=require('C:/Users/ymguan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const errors=[];try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',async route=>{const u=new URL(route.request().url()),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();try{const mime={'.js':'text/javascript','.html':'text/html; charset=utf-8','.glb':'model/gltf-binary'};await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{await route.fulfill({status:404,body:'missing'});}});
 await p.goto('http://127.0.0.1:8799/authoring/scythe/hero.html?v=20');await p.waitForFunction(()=>window.__ready);
 await p.evaluate(()=>{window.requestAnimationFrame=()=>0;});await p.waitForTimeout(80);


 const report=await p.evaluate(()=>{
 const x=SCYTHE_HERO,T=THREE,r=x.review,h=x.hero,chest=h.getObjectByName('chest');let worst={depth:0},minElbowSide=10,minFold=180,maxFold=0,maxWrist=0,worstWrist=null,maxStep=0,previous={};
 r.strike('all');for(let i=0;i<=300;i++){const time=(r.total/r.comboRate)*i/300;r.seek(time);h.updateMatrixWorld(true);const inv=chest.matrixWorld.clone().invert();
 for(const side of ['R','L']){const s=h.getObjectByName('upperArm'+side).getWorldPosition(new T.Vector3()),e=h.getObjectByName('forearm'+side).getWorldPosition(new T.Vector3()),w=h.getObjectByName('hand'+side).getWorldPosition(new T.Vector3());const fold=s.clone().sub(e).angleTo(w.clone().sub(e))*180/Math.PI,axis=new T.Vector3(0,-1,0).applyQuaternion(h.getObjectByName('hand'+side).getWorldQuaternion(new T.Quaternion())),wristBend=axis.angleTo(w.clone().sub(e))*180/Math.PI;minFold=Math.min(minFold,fold);maxFold=Math.max(maxFold,fold);if(wristBend>maxWrist){maxWrist=wristBend;worstWrist={time,side,fore:e.clone().applyMatrix4(inv).toArray(),wrist:w.clone().applyMatrix4(inv).toArray(),palmDir:axis.clone().transformDirection(inv).toArray(),handShaft:new T.Vector3(0,0,1).applyQuaternion(h.getObjectByName("hand"+side).getWorldQuaternion(new T.Quaternion())).transformDirection(inv).toArray(),shaft:r.metrics.grip.shaft};}if(previous[side])maxStep=Math.max(maxStep,previous[side].distanceTo(e));previous[side]=e.clone();
 const el=e.clone().applyMatrix4(inv);minElbowSide=Math.min(minElbowSide,(side==='R'?-1:1)*el.x);
 for(const [label,a,b,from]of [['upper',s,e,.5],['fore',e,w,0]])for(let j=0;j<=8;j++){let t=from+(1-from)*j/8,q=a.clone().lerp(b,t).applyMatrix4(inv);if(q.y<-.06||q.y>.55)continue;const profile=h.userData.heroCostumeFit.profile;let radius=profile[0][0];for(let k=1;k<profile.length;k++){const [rad,y]=profile[k],[prev,py]=profile[k-1];if(q.y<=y){radius=prev+(rad-prev)*Math.max(0,Math.min(1,(q.y-py)/(y-py)));break;}}const pad=label==='upper'?.075:.108;let value=Math.sqrt((q.x/(radius+pad))**2+(q.z/(radius*.68+pad))**2),depth=Math.max(0,1-value);if(depth>worst.depth)worst={depth,time,side,label,point:q.toArray(),elbow:el.toArray(),shoulder:s.clone().applyMatrix4(inv).toArray(),wrist:w.clone().applyMatrix4(inv).toArray(),l1:s.distanceTo(e),l2:e.distanceTo(w),chest:new T.Euler().setFromQuaternion(chest.getWorldQuaternion(new T.Quaternion())).toArray()};}
 }
 }
 return {worst,minElbowSide,minFold,maxFold,maxWrist,worstWrist,maxStep};});console.log(JSON.stringify(report,null,2));
 for(const [time,view,name] of [[.3,'three','down'],[.95,'side','sweep'],[1.4,'three','counter'],[2.1,'three','spin']]){await p.evaluate(t=>{SCYTHE_HERO.review.strike('all');SCYTHE_HERO.review.seek(t);},time);await p.locator('[data-view="'+view+'"]').click();await p.evaluate(t=>{tick(performance.now());SCYTHE_HERO.review.strike('all');SCYTHE_HERO.review.seek(t);renderer.render(scene,camera);},time);await p.screenshot({path:path.join(__dirname,'v20-'+name+'.png')});}
 assert(report.worst.depth<.01,'Arm or sleeve intersects the torso');assert(report.minElbowSide>.20,'Elbow crosses the torso center');assert(report.maxWrist<50,'Excessive wrist bend');assert(report.minFold>45&&report.maxFold<165,'Excessive elbow fold');

}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});


