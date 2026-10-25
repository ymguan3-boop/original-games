const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'../survivors/qa');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1080,height:800},hasTouch:true});
 const report={checks:[],errors:[]};page.setDefaultTimeout(30000);
 page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});
 const shot=n=>page.screenshot({path:path.join(out,'v22-'+n+'.png')});
 const stage=async(name,fn)=>{await fn();report.checks.push(name);console.log('PASS '+name);};
 const ready=()=>page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:120000});
 const arrange=async weapon=>page.evaluate(weapon=>{const q=CaveQA,w=q.world,r=w.run;r.enemies=[];r.pickups=[];r.projectiles=[];r.targetId=r.attackTargetId=null;r.heroCombo=null;r.spawnAt=1e6;r.pendingUpgrade=0;r.hero.x=r.hero.z=0;r.hero.heading=0;r.hero.hp=r.hero.maxHp;r.hero.attackCd=1e6;r.hero.ultimateCd=0;r.hero.pendingAttack=null;r.hero.statuses={};r.weaponId=weapon;r.pets.forEach(p=>{p.hp=0;p.pendingSkill=null;});r.buffs={};q.scene.resetTransient();},weapon);
 try{
  await page.goto('http://127.0.0.1:4202/幻靈奇旅/survivors/?qa=1&v=v22');await ready();
  assert.equal(await page.evaluate(()=>CaveDiagnostics.version),'0.22.0');
  await page.evaluate(()=>{CaveQA.store.transact('fixture-team',s=>{s.team=s.owned=['charmander','bulbasaur','squirtle'];s.starterClaimed=true;});CaveQA.enter();});await page.click('#pause');
  await stage('密碼測試入口重置為5000點與兩把永久武器，無寵物且首次保底可重新領取',async()=>{
   await page.click('#openTestGate');await page.fill('#testPassword','000000');await page.getByRole('button',{name:'進入測試',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#testGateError')?.textContent.includes('不正確'));
   await page.fill('#testPassword','741216');await page.getByRole('button',{name:'進入測試',exact:true}).click();await page.getByRole('button',{name:'重置＋5000點＋2把武器',exact:true}).click();
   const s=await page.evaluate(()=>CaveDiagnostics.snapshot());assert.equal(s.points,5000);assert.equal(s.starterClaimed,false);assert.equal(s.owned.length,0);assert.ok(s.weapons.includes('blades-blinkfire')&&s.weapons.includes('knife-flamewave'));await shot('reset');
   await page.evaluate(()=>{CaveQA.store.transact('fixture-team2',s=>{s.team=s.owned=['charmander','bulbasaur','squirtle'];s.starterClaimed=true;});CaveQA.enter();});await page.click('#pause');
  });
  await stage('商店顯示焰紋燃燒、潮流緩速及魔王限定武器說明，手機無橫向溢出',async()=>{
   await page.click('[data-menu="shop"]');await page.getByRole('button',{name:'永久武器',exact:true}).click();const text=await page.locator('#weaponShop').innerText();assert.ok(text.includes('燃燒')&&text.includes('移速減半')&&text.includes('小魔王5%／大魔王10%'));
   await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('#panelBody').evaluate(e=>e.scrollWidth<=e.clientWidth+2));await shot('shop-mobile');await page.setViewportSize({width:1080,height:800});await page.click('#closePanel');await page.click('#pause');
  });
  await stage('燃燒呈現可動的Three.js立體火焰，離開視野釋放特效且無圖片請求',async()=>{
   await arrange('sword-flame');await page.evaluate(()=>{const w=CaveQA.world;w.spawn();const e=w.run.enemies[0];Object.assign(e,{x:2,z:-1,hp:10000,maxHp:10000,nextAttack:1e6});w.status(e,'burn',{duration:10,attack:30,element:'焰'});});
   await page.click('#closePanel');await page.waitForFunction(()=>CaveDiagnostics.metrics.statusVisuals?.burn===1);await page.waitForTimeout(350);await page.click('#pause');
   await page.evaluate(()=>{document.querySelector('#panel').style.visibility='hidden';CaveQA.scene.update(CaveQA.world.run,.016);});const first=await page.evaluate(()=>CaveDiagnostics.metrics.statusArt.details.find(d=>d.type==='burn'));assert.equal(first.renderer,'three-procedural');assert.equal(first.parts,6);await shot('burn');
   await page.evaluate(()=>{const r=CaveQA.world.run;r.time+=.3;CaveQA.scene.update(r,.016);});assert.notEqual(await page.evaluate(()=>CaveDiagnostics.metrics.statusArt.details.find(d=>d.type==='burn').phase),first.phase);
   await page.evaluate(()=>{const r=CaveQA.world.run;r.enemies[0].x=34;r.enemies[0].z=34;CaveQA.scene.update(r,.016);});assert.equal(await page.evaluate(()=>CaveDiagnostics.metrics.statusVisuals.burn||0),0);
   await page.evaluate(()=>document.querySelector('#panel').style.visibility='');
  });
  await stage('單刀大絕瞬移至最近魔物前方並施放連斬，期間仍禁止翻滾',async()=>{
   await arrange('knife-starter');await page.evaluate(()=>{const w=CaveQA.world;for(const x of [8,20]){w.spawn();Object.assign(w.run.enemies.at(-1),{x,z:0,hp:10000,maxHp:10000,nextAttack:1e6});}w.run.targetId=w.run.enemies[1].id;});await page.click('#closePanel');await page.click('#ultimate');
   await page.waitForFunction(()=>!!CaveDiagnostics.metrics.lastHeroBlink);const v=await page.evaluate(()=>({h:CaveQA.world.run.hero,c:CaveQA.world.run.heroCombo,e:CaveQA.world.run.enemies[0],roll:CaveQA.world.roll(1,0)}));assert.ok(Math.hypot(v.h.x-v.e.x,v.h.z-v.e.z)<1.5);assert.equal(v.roll,false);await shot('knife-blink');await page.click('#pause');
  });
  await stage('瞬燃雙刀普攻從遠處自動接近最近魔物並燃燒，幻燃劍氣為獨立貫穿彈道',async()=>{
   await arrange('blades-blinkfire');await page.evaluate(()=>{const w=CaveQA.world;w.spawn();Object.assign(w.run.enemies[0],{x:6,z:0,hp:10000,maxHp:10000,nextAttack:1e6});w.run.hero.attackCd=0;});await page.click('#closePanel');await page.waitForFunction(()=>!!CaveQA.world.run.enemies[0]?.statuses?.burn);assert.ok(await page.evaluate(()=>Math.hypot(CaveQA.world.run.hero.x-6,CaveQA.world.run.hero.z)<2));await page.click('#pause');
   await arrange('knife-flamewave');await page.evaluate(()=>{const w=CaveQA.world;for(const z of [5,7]){w.spawn();Object.assign(w.run.enemies.at(-1),{x:0,z,hp:10000,maxHp:10000,nextAttack:1e6});}w.strike(w.run.hero,'ranged',7.56,48,1,'焰');w.update(.1);CaveQA.scene.update(w.run,.016);document.querySelector('#panel').style.visibility='hidden';});
   const wave=await page.evaluate(()=>CaveDiagnostics.metrics.swordWave);assert.equal(wave.mode,'piercing-crescent');await shot('sword-wave');await page.evaluate(()=>{const w=CaveQA.world;for(let i=0;i<12;i++)w.update(.025);CaveQA.scene.update(w.run,.016);});assert.ok(await page.evaluate(()=>CaveQA.world.run.enemies.every(e=>e.hp<10000&&!!e.statuses.burn)));await page.evaluate(()=>document.querySelector('#panel').style.visibility='');
  });
  await stage('魔王武器須拾取才永久解鎖，一次性彈窗確認後重整及重複拾取不再提醒',async()=>{
   await arrange('guns-starter');await page.evaluate(()=>{const q=CaveQA;q.store.transact('remove-fixture-weapons',s=>{s.weapons=s.weapons.filter(id=>!['blades-blinkfire','knife-flamewave'].includes(id));s.weaponUnlockPending=[];});const w=q.world;w.spawn('elite',2,false,5);const e=w.run.enemies[0];e.x=8;e.z=0;w.random=()=>0;w.reward(e);w.random=()=>.99;w.run.enemies=[];w.run.pickups=w.run.pickups.filter(p=>p.permanent);});
   assert.equal(await page.evaluate(()=>CaveQA.store.state.weapons.includes('blades-blinkfire')),false);await page.evaluate(()=>{CaveQA.world.run.pickups[0].x=0;CaveQA.world.run.pickups[0].z=0;});await page.click('#closePanel');await page.waitForFunction(()=>document.querySelector('#panel').dataset.view==='weapon-unlock');await shot('unlock');assert.ok(await page.evaluate(()=>CaveQA.store.state.weapons.includes('blades-blinkfire')));
   await page.getByRole('button',{name:'收下武器，繼續探險',exact:true}).click();await page.click('#pause');await page.evaluate(()=>{const w=CaveQA.world;w.run.pickups=[{id:'duplicate',x:0,z:0,kind:'weapon',weaponId:'blades-blinkfire',permanent:true}];w.collectLoot();w.save();});assert.equal(await page.evaluate(()=>CaveQA.store.state.weaponUnlockPending.length),0);assert.equal(await page.evaluate(()=>CaveQA.world.run.fusions['blades-blinkfire']),1);
   await page.reload();await ready();assert.ok(await page.evaluate(()=>CaveQA.store.state.weapons.includes('blades-blinkfire')));assert.equal(await page.evaluate(()=>CaveQA.store.state.weaponUnlockPending.length),0);
  });
  assert.deepEqual(report.errors,[]);
 }catch(e){report.errors.push(e.stack);await shot('failure');throw e;}
 finally{fs.writeFileSync(path.join(out,'v22-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
