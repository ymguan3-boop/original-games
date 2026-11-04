import {createRequire} from 'node:module';import fs from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('C:/Users/ymguan/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules/playwright');
const base=process.argv[2]||'http://127.0.0.1:4321',assert=(v,m)=>{if(!v)throw Error(m);};
const b=await chromium.launch({headless:true,executablePath:'C:/Users/ymguan/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=swiftshader','--disable-gpu-watchdog']});
const report={base,status:'RUNNING',errors:[],failed:[]};
await fs.mkdir('qa',{recursive:true});
try{const c=await b.newContext({viewport:{width:390,height:900}}),p=await c.newPage();p.setDefaultTimeout(180000);p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.failed.push({url:r.url(),status:r.status()});});
 await p.addInitScript(()=>{let shared;Object.defineProperty(window,'PhantomGuestSession',{configurable:true,get:()=>shared,set:value=>{shared=value;value.local.set('phantom_journey_v1',JSON.stringify({version:1,captureCounts:{bulbasaur:1},team:['bulbasaur'],position:[2.8,54],journeyGuide:{labExited:true,firstWildCapture:true}}));value.local.set('phantom-controls-seen-v1','1');value.local.set('phantom-display-quality-v1','low');}});});
 await p.goto(base+'/guest',{waitUntil:'domcontentloaded'});
 let f;await p.waitForFunction(()=>document.querySelector('iframe'));for(let i=0;i<60;i++){f=p.frames().find(f=>f.url().includes('/game/guest'));if(f)break;await new Promise(r=>setTimeout(r,250));}
 assert(f,'找不到訪客主遊戲文件');await f.waitForFunction(()=>window.PhantomGame?.state.ready);
 await f.evaluate(()=>{PhantomTransition.dismiss();document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(!document.getElementById('modal').hidden)document.getElementById('closeModal').click();PhantomGame.teleport(2.8,54);});
 await f.locator('#portal').filter({hasText:'進入初光商會'}).click();await f.waitForURL(/\/shop\/?\?guest=1/);await f.waitForFunction(()=>window.shopScene?.metrics.floorFinish?.status==='ready'&&document.getElementById('loading').style.display==='none');
 if(await f.locator('#start-playing').isVisible())await f.locator('#start-playing').click();
 await f.evaluate(()=>{const r=shop.act('trialLevel',{level:5});if(!r.ok)throw Error(r.message);});await f.waitForFunction(()=>document.getElementById('level-quick').textContent.includes('5'));
 report.shop=await f.evaluate(()=>({level:shop.state.level,guest:PORTAL_GUEST,canvas:document.querySelectorAll('#world,#scene').length,model:shopScene.metrics.shelves['shelf-2'].model,errors:shopScene.metrics.errors}));assert(report.shop.guest&&report.shop.level===5&&report.shop.canvas===1,'訪客商會隔離或模型失敗');
 await p.screenshot({path:'qa/sites-guest-shop.png'});await f.locator('#return-to-game').click();await f.waitForURL(/\/game\/guest\/?$/, {waitUntil:'domcontentloaded'});await f.waitForFunction(()=>window.PhantomGame?.state.ready);
 report.back=await f.evaluate(()=>({level:PhantomGame.commerce.level,guest:PORTAL_GUEST,count:PhantomGame.state.state.captureCounts.bulbasaur,position:[PhantomGame.player.x,PhantomGame.player.z],errors:PhantomGame.state.errors}));assert(report.back.level===5&&report.back.guest&&report.back.count===1,'訪客返回資料遺失');
 assert(await p.evaluate(()=>localStorage.getItem('firstlight_shop_v1')===null&&localStorage.getItem('phantom_journey_v1')===null),'訪客資料不應落地');assert(!report.errors.length,JSON.stringify(report.errors));assert(!report.failed.length,JSON.stringify(report.failed));report.status='PASS';console.log('MERCHANT_SITES_GUEST_PASS');
}catch(e){report.status='FAIL';report.error=e.stack;throw e;}finally{await fs.writeFile('qa/merchant-sites-browser.json',JSON.stringify(report,null,2));await b.close();}
