const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'../survivors/qa');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1080,height:800},hasTouch:true}),report={checks:[],errors:[]};p.setDefaultTimeout(30000);
 p.on('pageerror',e=>report.errors.push(e.stack));p.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});
 const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:120000}),shot=n=>p.screenshot({path:path.join(out,'v23-'+n+'.png')}),stage=async(name,fn)=>{await fn();report.checks.push(name);console.log('PASS '+name);};
 const arrange=weapon=>p.evaluate(weapon=>{const w=CaveQA.world,r=w.run;Object.assign(r,{enemies:[],pickups:[],projectiles:[],targetId:null,attackTargetId:null,heroCombo:null,pendingUpgrade:0,spawnAt:1e6,weaponId:weapon});Object.assign(r.hero,{x:0,z:0,heading:0,hp:r.hero.maxHp,attackCd:1e6,ultimateCd:0,pendingAttack:null,statuses:{}});r.pets.forEach(p=>p.hp=0);r.buffs={};CaveQA.scene.resetTransient();},weapon);
 try{
  await p.goto('http://127.0.0.1:4202/幻靈奇旅/survivors/?qa=1&v=v23');await ready();assert.equal(await p.evaluate(()=>CaveDiagnostics.version),'0.23.0');
  await p.evaluate(()=>{CaveQA.store.transact('team',s=>{s.team=s.owned=['charmander','bulbasaur','squirtle'];s.starterClaimed=true;});CaveQA.enter();});await p.click('#pause');
  await stage('密碼測試重置授予5000點與四把限定武器，保底寵物可重新領取',async()=>{
   await p.click('#openTestGate');await p.fill('#testPassword','741216');await p.getByRole('button',{name:'進入測試',exact:true}).click();await p.getByRole('button',{name:'重置＋5000點＋4把武器',exact:true}).click();
   const state=await p.evaluate(()=>CaveDiagnostics.snapshot());assert.equal(state.points,5000);assert.equal(state.starterClaimed,false);for(const id of ['blades-blinkfire','knife-flamewave','guns-critical','sword-leek'])assert.ok(state.weapons.includes(id));await shot('reset');
   await p.evaluate(()=>{CaveQA.store.transact('team-again',s=>{s.team=s.owned=['charmander','bulbasaur','squirtle'];s.starterClaimed=true;});CaveQA.enter();});await p.click('#pause');
  });
  await stage('永久武器價格由上至下降冪、限定另列，0點可領巡林與雙月，手機無橫向溢出',async()=>{
   await p.evaluate(()=>CaveQA.store.transact('shop-fixture',s=>{s.points=0;s.weapons=s.weapons.filter(id=>!['knife-starter','blades-starter','guns-critical','sword-leek'].includes(id));}));
   await p.click('[data-menu="shop"]');await p.getByRole('button',{name:'永久武器',exact:true}).click();const prices=await p.locator('#weaponShop [data-price]:not([data-price="limited"])').evaluateAll(rows=>rows.map(e=>Number(e.dataset.price)));assert.ok(prices.every((v,i)=>!i||prices[i-1]>=v));assert.equal(prices.at(-1),0);
   for(const id of ['knife-starter','blades-starter']){const row=p.locator('[data-weapon="'+id+'"]');await row.getByRole('button',{name:'0 點',exact:true}).click();assert.equal(await p.evaluate(()=>CaveQA.store.state.points),0);}
   assert.equal(await p.locator('[data-weapon="guns-critical"] button').isDisabled(),true);const text=await p.locator('#weaponShop').innerText();assert.ok(text.includes('最大生命5%')&&text.includes('範圍 +30%')&&text.includes('暴擊率 +10個百分點')&&text.includes('暴擊率100%')&&text.includes('攻速 +50%'));
   await p.setViewportSize({width:390,height:844});assert.ok(await p.locator('#panelBody').evaluate(e=>e.scrollWidth<=e.clientWidth+2));await shot('shop-mobile');await p.setViewportSize({width:1080,height:800});await p.click('[data-menu="bag"]');
  });
  await stage('萬象吸取顯示200點及每10秒消耗1件，實際自動吸取後可重複而非每局一次',async()=>{
   await arrange('guns-starter');await p.evaluate(()=>{CaveQA.store.transact('vacuum-fixture',s=>{s.inventory['vacuum-orb']=3;s.autoItems={};});const r=CaveQA.world.run;r.time=0;r.nextAutoItemAt=0;r.autoItemUsed=['vacuum-orb'];r.pickups=[{id:'far1',x:30,z:30,amount:10}];CaveQA.bag();});
   const row=p.locator('.bag-item').filter({has:p.locator('[data-use-item="vacuum-orb"]')});assert.ok((await row.innerText()).includes('每10秒1次'));await row.locator('input[type="checkbox"]').check();await p.click('#closePanel');await p.waitForFunction(()=>CaveQA.store.state.inventory['vacuum-orb']===2&&CaveQA.world.run.pickups.length===0);await p.click('#pause');
   await p.evaluate(async()=>{const {runAutoItems}=await import('./js/auto-items.js?v=20261025-v23');const w=CaveQA.world,r=w.run;r.pickups=[{id:'far2',x:30,z:30,amount:10}];r.time=r.autoItemNext['vacuum-orb']-.2;r.nextAutoItemAt=0;if(runAutoItems(CaveQA.store).length)throw Error('used before ten seconds');r.time+=.8;r.nextAutoItemAt=0;if(runAutoItems(CaveQA.store)[0]!=='vacuum-orb')throw Error('did not repeat');w.collectLoot();});assert.equal(await p.evaluate(()=>CaveQA.store.state.inventory['vacuum-orb']),1);await shot('auto-vacuum');
   await p.click('[data-menu="shop"]');await p.getByRole('button',{name:'道具補給',exact:true}).click();const supply=p.locator('#itemShop .shop-row').filter({hasText:'萬象吸取'});assert.ok((await supply.innerText()).includes('200 點'));await p.click('[data-menu="bag"]');
  });
  await stage('兩把新增武器拾取後永久解鎖並各顯示一次提醒，重整保留且不重播',async()=>{
   await arrange('guns-starter');await p.evaluate(()=>CaveQA.store.transact('stop-auto',s=>{s.autoItems={};}));
   for(const id of ['guns-critical','sword-leek']){
    await p.evaluate(id=>{CaveQA.world.run.pickups=[{id:'unlock-'+id,x:0,z:0,kind:'weapon',weaponId:id,permanent:true}];},id);await p.click('#closePanel');await p.waitForFunction(()=>document.querySelector('#panel').dataset.view==='weapon-unlock');await shot('unlock-'+id);assert.ok(await p.evaluate(id=>CaveQA.store.state.weapons.includes(id),id));await p.getByRole('button',{name:'收下武器，繼續探險',exact:true}).click();await p.click('#pause');
   }
   await p.evaluate(()=>CaveQA.world.save());await p.reload();await ready();assert.equal(await p.evaluate(()=>CaveQA.store.state.weaponUnlockPending.length),0);assert.ok(await p.evaluate(()=>['guns-critical','sword-leek'].every(id=>CaveQA.store.state.weapons.includes(id))));await p.click('#resume');await p.click('#pause');
  });
  await stage('必暴雙槍的實際貫穿命中顯示暴擊；瞬燃雙刀不再瞬移且範圍增加30%',async()=>{
   await arrange('guns-critical');await p.evaluate(()=>{const w=CaveQA.world;w.spawn();const e=w.run.enemies[0];Object.assign(e,{x:0,z:-4,hp:10000,maxHp:10000,nextAttack:1e6});w.run.hero.heading=Math.PI;w.random=()=>.99;w.strike(w.run.hero,'ranged',7.56,17,1,'光');});await p.click('#closePanel');await p.waitForFunction(()=>CaveDiagnostics.metrics.lastImpact?.critical===true);await shot('guaranteed-critical');await p.click('#pause');
   await arrange('blades-blinkfire');await p.evaluate(()=>{const w=CaveQA.world;w.spawn();Object.assign(w.run.enemies[0],{x:10,z:0,nextAttack:1e6});w.run.hero.attackCd=0;w.update(.05);});assert.equal(await p.evaluate(()=>CaveQA.world.run.hero.x),0);const range=await p.evaluate(()=>CaveQA.world.refreshAttackRange());assert.ok(Math.abs(range-1.68*1.3)<1e-8);
  });
  await stage('大蔥實際替換手持大劍、掉落也呈現蔥造型；攻擊動作配合50%攻速',async()=>{
   await arrange('sword-leek');await p.evaluate(()=>{const w=CaveQA.world;w.run.pickups=[{id:'leek-drop',x:3,z:0,kind:'weapon',weaponId:'sword-leek',permanent:true}];CaveQA.scene.update(w.run,.016);CaveQA.render();document.querySelector('#panel').style.visibility='hidden';});
   await p.waitForFunction(()=>CaveDiagnostics.metrics.heroWeaponAppearance?.model==='leek');const model=await p.evaluate(()=>({held:CaveDiagnostics.metrics.heroWeaponAppearance,budget:CaveDiagnostics.metrics.leekWeapon,drop:CaveDiagnostics.metrics.lootModels.find(m=>m.id==='leek-drop')}));assert.deepEqual(model.held.visibleMounts,['leek']);assert.ok(model.budget.triangles<3000);assert.equal(model.drop.model,'procedural/leek-sword');report.leek=model.budget;await shot('leek-held-and-drop');
   await p.evaluate(()=>{document.querySelector('#panel').style.visibility='';const w=CaveQA.world;w.run.pickups=[];w.spawn();Object.assign(w.run.enemies[0],{x:1,z:0,hp:10000,maxHp:10000,nextAttack:1e6});w.run.hero.attackCd=0;});await p.click('#closePanel');await p.waitForFunction(()=>CaveDiagnostics.metrics.heroMotion?.name==='SwordCombo'&&Math.abs(CaveDiagnostics.metrics.heroMotion.duration-.76/1.5)<1e-8);assert.ok(await p.evaluate(()=>CaveDiagnostics.metrics.heroMotion.rate>0));await p.click('#pause');
  });
  assert.deepEqual(report.errors,[]);
 }catch(e){report.errors.push(e.stack);await shot('failure');throw e;}
 finally{fs.writeFileSync(path.join(out,'v23-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
