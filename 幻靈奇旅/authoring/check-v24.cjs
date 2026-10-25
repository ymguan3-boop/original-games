const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'../survivors/qa'),base='http://127.0.0.1:4202/幻靈奇旅/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1080,height:800},hasTouch:true}),report={checks:[],errors:[]};p.setDefaultTimeout(30000);
 p.on('pageerror',e=>report.errors.push(e.stack));p.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});
 const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:120000}),shot=n=>p.screenshot({path:path.join(out,'v24-'+n+'.png')}),stage=async(name,fn)=>{await fn();report.checks.push(name);console.log('PASS '+name);};
 try{
  await p.goto(base+'?v=v24');await ready();
  await stage('冒險衣櫃六套皆列一般及洞穴說明，手機閱讀無水平溢出並可實際換裝',async()=>{
   await p.evaluate(()=>{const s=PhantomGame.state.state;s.unlockedCostumes=Object.keys(PhantomWardrobe.costumes);s.captureCounts={charmander:5,bulbasaur:5,squirtle:5};s.pokedexUnlocks={charmander:true,bulbasaur:true,squirtle:true};s.team=['charmander','bulbasaur','squirtle'];PhantomGame.save();PhantomGame.showMenu();});
   await p.click('[data-menu="costume"]');assert.equal(await p.locator('[data-wardrobe]').count(),6);assert.equal(await p.locator('.cave-wardrobe-effect').count(),6);const electric=p.locator('[data-wardrobe="electric"]');assert.ok((await electric.innerText()).includes('己方所有幻靈的普攻與大絕威力+20%'));await electric.locator('button').click();assert.equal(await p.evaluate(()=>PhantomGame.state.state.costume),'electric');
   await p.setViewportSize({width:390,height:844});assert.ok(await p.locator('#modalBody').evaluate(e=>e.scrollWidth<=e.clientWidth+2));await p.locator('[data-wardrobe="electric"]').scrollIntoViewIfNeeded();await shot('wardrobe-mobile');await p.setViewportSize({width:1080,height:800});
  });
  await stage('主遊戲鹹蛋超人服裝帶入洞穴，寵物普攻及大絕恰加成20%，主角不誤加成',async()=>{
   await p.goto(base+'survivors/?qa=1&v=v24');await ready();assert.equal(await p.evaluate(()=>CaveDiagnostics.version),'0.24.0');
   await p.evaluate(()=>{CaveQA.store.transact('cave-team',s=>{s.team=s.owned=['charmander','bulbasaur','squirtle'];s.starterClaimed=true;});CaveQA.enter();});await p.click('#pause');assert.equal(await p.evaluate(()=>CaveQA.world.run.costumeId),'electric');
   report.damage=await p.evaluate(()=>{const w=CaveQA.world,r=w.run;r.enemies=[];r.spawnAt=1e6;r.hero.attackCd=1e6;r.pets.forEach(p=>{p.attackCd=1e6;p.x=p.z=0;});w.spawn();Object.assign(r.enemies[0],{x:0,z:2,hp:1e6,maxHp:1e6,defense:0,nextAttack:1e6});w.random=()=>.99;const rows=[];for(const strong of [false,true]){const hit=outfit=>{w.setCostume(outfit);const e=w.run.enemies[0],hp=e.hp;w.strike(w.run.pets[0],'ranged',10,100,strong?2.5:1,'光',strong);for(let i=0;i<10&&w.run.projectiles.length;i++)w.update(.05);return hp-e.hp;};rows.push({strong,base:hit('trainer'),boost:hit('electric')});}const hitHero=outfit=>{w.setCostume(outfit);const e=w.run.enemies[0],hp=e.hp;w.damage(e,100,1,'光',1,{source:'hero'});return hp-e.hp;};const hero={base:hitHero('trainer'),boost:hitHero('electric')};CaveQA.bag();return{rows,hero,runId:w.run.id};});
   for(const row of report.damage.rows){assert.ok(row.base>0);assert.ok(Math.abs(row.boost-row.base*1.2)<=1);}assert.equal(report.damage.hero.base,report.damage.hero.boost);await p.locator('.costume-note summary').click();assert.ok((await p.locator('.costume-note').innerText()).includes('換寵後同樣生效'));await shot('cave-electric');
  });
  await stage('存檔回城換小飯團後續玩保留同局，洞穴說明與每波全隊回血一致',async()=>{
   const id=report.damage.runId;await p.click('#bagTown');await ready();await p.evaluate(()=>PhantomGame.showMenu());await p.click('[data-menu="costume"]');await p.locator('[data-wardrobe="mist"] button').click();assert.equal(await p.evaluate(()=>PhantomGame.state.state.costume),'mist');await p.goto(base+'survivors/?qa=1&v=v24');await ready();assert.equal(await p.evaluate(()=>CaveQA.world.run.id),id);await p.click('#resume');await p.click('#pause');assert.equal(await p.evaluate(()=>CaveQA.world.run.costumeId),'mist');
   report.heal=await p.evaluate(()=>{const w=CaveQA.world,r=w.run;r.enemies=[];r.spawnAt=1e6;r.pets.forEach(p=>p.hp=p.maxHp*.4);r.pets[2].hp=0;r.costumeWave=0;r.time=r.segmentStart+60;w.tickCostume(.05);CaveQA.bag();return r.pets.map(p=>p.hp/p.maxHp);});assert.ok(Math.abs(report.heal[0]-.6)<1e-8&&Math.abs(report.heal[1]-.6)<1e-8);assert.equal(report.heal[2],0);await p.locator('.costume-note summary').click();assert.ok((await p.locator('.costume-note').innerText()).includes('包含備戰幻靈'));await shot('cave-mist');
  });
  assert.deepEqual(report.errors,[]);
 }catch(e){report.errors.push(e.stack);await shot('failure');throw e;}
 finally{fs.writeFileSync(path.join(out,'v24-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
