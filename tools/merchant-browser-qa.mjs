import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('C:/Users/ymguan/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules/playwright');
const assert=(v,m)=>{if(!v)throw Error(m);},root='http://127.0.0.1:4318';
await fs.mkdir('qa',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ymguan/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=swiftshader','--disable-gpu-watchdog']});
const result={status:'RUNNING',widths:[],errors:[],failed:[]};
try{
 for(const width of [1280,390]){
  const ctx=await browser.newContext({viewport:{width,height:900}}),p=await ctx.newPage();p.setDefaultTimeout(120000);
  p.on('pageerror',e=>result.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)result.failed.push({status:r.status(),url:r.url()});});
  await p.addInitScript(()=>{if(!localStorage.getItem('phantom_journey_v1')){localStorage.setItem('phantom_journey_v1',JSON.stringify({version:1,captureCounts:{bulbasaur:1},team:['bulbasaur'],position:[2.8,54],quests:{firstResearch:true},journeyGuide:{labExited:true,firstWildCapture:true}}));localStorage.setItem('phantom-display-quality-v1','low');}});
  const start=Date.now();await p.goto(root+'/幻靈奇旅/',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.PhantomGame?.state.ready);
  const mainLoadMs=Date.now()-start;console.log('MAIN_READY',width,mainLoadMs);
  await p.evaluate(()=>{PhantomTransition.dismiss();document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(!document.getElementById('modal').hidden)document.getElementById('closeModal').click();PhantomGame.teleport(2.8,54);});
  await p.locator('#portal').filter({hasText:'進入初光商會'}).waitFor();
  const before=await p.evaluate(()=>({count:PhantomGame.state.state.captureCounts.bulbasaur,level:PhantomGame.commerce.level,canvases:document.querySelectorAll('canvas#scene,canvas#world').length}));
  assert(before.level===1&&before.canvases===1,'主遊戲初始外觀或渲染器不符');
  let mainHandoff=false;await p.exposeFunction('qaHandoff',()=>{mainHandoff=true;});await p.evaluate(()=>{new MutationObserver(()=>{if(document.querySelector('#sceneTransition[open]'))window.qaHandoff();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});});
  const entry=Date.now();await p.locator('#portal').click();await p.waitForURL(/初光商會|%E5%88%9D%E5%85%89/);await p.waitForFunction(()=>window.shopScene?.metrics.floorFinish?.status==='ready'&&document.getElementById('loading').style.display==='none');
  const shopLoadMs=Date.now()-entry;assert(mainHandoff,'缺少進入讀取畫面');
  if(await p.locator('#start-playing').isVisible())await p.locator('#start-playing').click();
  const levelRows=[];
  for(const level of [2,3,4,5]){
   await p.evaluate(level=>{const r=shop.act('trialLevel',{level});if(!r.ok)throw Error(r.message);},level);
   const written=await p.evaluate(()=>JSON.parse(localStorage.getItem('firstlight-commerce-level-v1')).level);assert(written===level,'商會等級metadata未同步');
   const catalog=await p.evaluate(()=>({level:shop.state.level,shelves:shopScene.metrics.shelves,errors:shopScene.metrics.errors,canvases:document.querySelectorAll('canvas#scene,canvas#world').length}));
   assert(catalog.canvases===1,'商會同時執行兩個遊戲渲染器');levelRows.push({level,written});
  }
  await p.screenshot({path:`qa/shop-linked-${width}.png`});
  let returnHandoff=false;await p.exposeFunction('qaReturn',()=>{returnHandoff=true;});await p.evaluate(()=>{new MutationObserver(()=>{if(!document.getElementById('return-loading').hidden)window.qaReturn();}).observe(document.getElementById('return-loading'),{attributes:true});});
  await p.locator('#return-to-game').click();await p.waitForURL(/幻靈奇旅|%E5%B9%BB%E9%9D%88/);await p.waitForFunction(()=>window.PhantomGame?.state.ready);
  const back=await p.evaluate(()=>({level:PhantomGame.commerce.level,count:PhantomGame.state.state.captureCounts.bulbasaur,player:[PhantomGame.player.x,PhantomGame.player.z],errors:PhantomGame.state.errors,canvases:document.querySelectorAll('canvas#scene,canvas#world').length}));
  assert(returnHandoff&&back.level===5&&back.count===before.count&&back.canvases===1,'返回/等級/原主遊戲存檔驗證失敗');
  for(const level of [1,2,3,4,5]){await p.evaluate(level=>{const s=JSON.parse(localStorage.getItem('firstlight_shop_v1'));s.level=level;localStorage.setItem('firstlight_shop_v1',JSON.stringify(s));dispatchEvent(new Event('focus'));},level);await p.waitForFunction(level=>PhantomGame.commerce.level===level,level);await p.screenshot({path:`qa/building-lv${level}-${width}.png`});}
  assert((await p.evaluate(()=>PhantomGame.state.errors)).length===0,'主遊戲resource errors');
  result.widths.push({width,mainLoadMs,shopLoadMs,before,back,levelRows});await ctx.close();
 }
 assert(!result.errors.length,JSON.stringify(result.errors));assert(!result.failed.length,JSON.stringify(result.failed));result.status='PASS';console.log('MERCHANT_INTEGRATION_BROWSER_PASS');
}catch(error){result.status='FAIL';result.error=error.stack;throw error;}finally{await fs.writeFile('qa/merchant-integration-browser.json',JSON.stringify(result,null,2));await browser.close();}
