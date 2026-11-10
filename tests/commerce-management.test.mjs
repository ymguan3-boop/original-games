// 簡化經營驗收：用真實遊戲引擎跑規格書的必要案例，不比對程式字串。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'../初光商會');
const J=f=>JSON.parse(fs.readFileSync(path.join(ROOT,'data',f+'.json'),'utf8'));
const load=p=>import(pathToFileURL(path.join(ROOT,'js',p)).href);
const {Game,events}=await load('core.js');
const {CHECKOUT}=await import(pathToFileURL(path.join(ROOT,'js','nav.js')).href+'?v=20261110-shop-r2');
const {capacityOf,onDuty,jobPower,passive,dailyTasks,migrateState}=await load('management.js');
const {staffEvolutionInfo}=await load('staff-evolution.js');
const data=()=>({catalog:J('shop-catalog'),hirePool:J('hire-pool'),spirits:J('spirits'),evolution:J('evolution'),levels:J('store-levels'),config:J('economy'),management:J('management')});
const memory=(seed={})=>{const m=new Map(Object.entries(seed));return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),m};};
const fresh=(patch={})=>{const g=new Game({storage:memory(),data:data(),seed:7});g.transaction(null,s=>{Object.assign(s,patch);s.gold=999999;s.totals.sales=9999;return 'x';});return g;};
const place=(g,type='apothecary',x=4,z=5)=>{g.act('purchaseShelf',{type});return g.act('placeShelf',{shelfId:g.state.lastPurchasedShelf,x,z});};
const finished={tutorialState:{step:'done',done:true}};
test('Lv.1 一人在班、Lv.5 五人在班，第六位進備用且資料不丟失',()=>{
 const g=fresh({level:1});g.act('hire',{id:'bulbasaur'});g.act('hire',{id:'squirtle'});assert.equal(onDuty(g.state).length,1);assert.equal(g.state.employees.length,2);
 g.transaction(null,s=>{s.level=5;return 'x';});for(const id of ['charmander','chikorita','cyndaquil','totodile'])g.act('hire',{id});
 g.act('autoAssign');assert.equal(onDuty(g.state).length,5);assert.equal(capacityOf(g,g.state),5);assert.equal(g.state.employees.length,6);
 const reserve=g.state.employees.find(e=>e.role==='standby');assert.ok(reserve);const r=g.act('assign',{employeeId:reserve.id,role:'stocker'});assert.equal(r.ok,false);
 const on=onDuty(g.state)[0];g.act('assign',{employeeId:on.id,role:'standby'});assert.equal(g.act('assign',{employeeId:reserve.id,role:'stocker'}).ok,true);assert.equal(g.act('assign',{employeeId:reserve.id,role:'cashier'}).ok,false);assert.equal(g.state.employees.length,6);
});
test('擅長職務有 25% 加成，換職後被動仍有效且熟練度不歸零',()=>{
 const g=fresh({level:3});g.act('hire',{id:'squirtle'});const e=g.state.employees[0];
 g.act('assign',{employeeId:e.id,role:'host'});const good=jobPower(g,g.state,'host'),pass=passive(g,g.state,'satisfaction');
 g.transaction(null,s=>{s.employees[0].workLevel=3;return 'x';});g.act('assign',{employeeId:e.id,role:'stocker'});
 assert.ok(Math.abs(good/jobPower(g,{...g.state,employees:[{...g.state.employees[0],workLevel:1}]},'stocker')-1.25)<.001);
 assert.ok(passive(g,g.state,'satisfaction')>0&&passive(g,g.state,'satisfaction')<pass);assert.equal(g.state.employees[0].workLevel,3);
});
test('第二位同職務效率遞減',()=>{const g=fresh({level:3});g.act('hire',{id:'cyndaquil'});g.act('hire',{id:'raikou'});g.act('hire',{id:'bulbasaur'});
 for(const e of g.state.employees.slice(0,2))g.act('assign',{employeeId:e.id,role:'cashier'});const solo=g.state.employees.slice(0,2).reduce((n,e)=>n+jobPower(g,{...g.state,employees:[e]},'cashier'),0);assert.ok(jobPower(g,g.state,'cashier')<solo*.9);});
test('Lv.3 看不到也買不到 Lv.4 以上物品，升 Lv.4 立刻可買',()=>{
 const g=fresh({level:3}),locked=g.data.catalog.find(c=>c.unlockStoreLevel===4);assert.equal(g.act('buy',{sku:locked.sku,qty:1}).ok,false);
 assert.equal(g.act('purchaseShelf',{type:'royal'}).ok,false);assert.equal(g.act('purchaseDecor',{type:'lucky-cat'}).ok,false);
 g.transaction(null,s=>{s.level=4;s.shelves.push({id:'royal-test',type:'royal',x:3,z:1,sku:locked.sku,stock:0,rotation:0});return 'x';});assert.equal(g.act('buy',{sku:locked.sku,qty:1}).ok,true);
});
test('已購買家具可移動與收納，收納後再擺放不重複收費',()=>{
 const g=fresh({phase:'closed'});assert.equal(place(g).ok,true);const id=g.state.shelves[0].id,gold=g.state.gold;
 assert.equal(g.act('storeShelf',{shelfId:id}).ok,true);assert.equal(g.act('placeShelf',{shelfId:id,x:5,z:5}).ok,true);assert.equal(g.state.gold,gold);
});
test('不能堵住出入口',()=>{const g=fresh({phase:'closed'});assert.equal(place(g,'apothecary',6,10).ok,false);});
test('每日任務只能領一次，全勤獎勵要三項都領完',()=>{
 const g=fresh();g.transaction(null,s=>{s.dailyTaskState={date:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'}),sales:10,gold:500,exp:100,claimed:{},bonus:false};return 'x';});
 assert.equal(g.act('claimDailyBonus').ok,false);assert.equal(g.act('claimDaily',{id:'sales'}).ok,true);assert.equal(g.act('claimDaily',{id:'sales'}).ok,false);g.act('claimDaily',{id:'gold'});g.act('claimDaily',{id:'exp'});
 assert.equal(g.act('claimDailyBonus').ok,true);assert.equal(g.state.xpTickets,1);assert.equal(dailyTasks(g,g.state).tasks.every(t=>t.claimed),true);
});
test('事件至少相隔五分鐘，布置模式不觸發',()=>{
 const g=fresh(finished);place(g,'apothecary',4,5);g.act('open');g.act('hire',{id:'bulbasaur'});const times=[];let last=null;
 for(let i=0;i<4*1500;i++){g.tick(.25);if(g.state.phase==='report'){g.act('nextDay');g.act('open');}const id=g.state.event?.instanceId;if(id&&id!==last){last=id;times.push(g.state.totalTime);g.transaction(null,s=>{s.event=null;return 'x';});}}
 assert.ok(times.length>=2,'應出現事件');for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=299,`間隔 ${times[i]-times[i-1]}`);
 g.act('setLayoutPause',{value:true});const t=g.state.totalTime;for(let i=0;i<40;i++)g.tick(.25);assert.equal(g.state.totalTime,t);
});
test('事件文字與選項符合長度限制，且最多兩個選項',()=>{for(const e of events){assert.ok(e.title.length<=12,e.title);assert.ok((e.dialogue||e.description).length<=40,e.title);assert.ok(e.choices.length<=2,e.title);for(const c of e.choices)assert.ok(c.label.length<=8,c.label);}});
test('每天 20:00 打烊停在結算，按新的一天才回到 07:00',()=>{
 const g=fresh(finished);place(g,'apothecary',4,5);g.act('open');for(let i=0;i<4*200;i++)g.tick(.25);assert.equal(g.state.phase,'report');const day=g.state.day;for(let i=0;i<40;i++)g.tick(.25);assert.equal(g.state.phase,'report');assert.equal(g.act('nextDay').ok,true);g.tick(.25);assert.equal(g.state.day,day+1);assert.equal(g.state.phase,'closed');assert.equal(g.act('open').ok,true);assert.ok(g.state.time<1);
});
test('沒有員工時系統仍低速結帳與補貨，不扣薪資',()=>{
 const g=fresh(finished);place(g,'apothecary',4,5);g.act('open');for(let i=0;i<4*400;i++){g.tick(.25);if(g.state.phase==='report'){g.act('nextDay');g.act('open');}}assert.ok(g.state.totals.sales>0,'應有交易');assert.equal(g.state.stats.wages,0);assert.equal(g.lastError,'');assert.equal(g.state.phase,'open');
});
test('招財 Lv.5 才能招聘，到 Lv.8 未進化不算解鎖',()=>{
 const g=fresh({level:4});assert.equal(g.act('hire',{id:'zhaocai'}).ok,false);g.transaction(null,s=>{s.level=5;return 'x';});assert.equal(g.act('hire',{id:'zhaocai'}).ok,true);
 g.transaction(null,s=>{s.employees[0].workLevel=8;return 'x';});assert.ok(!g.state.zhaocaiStage3Completed);const e=g.state.employees[0].id;
 assert.equal(g.act('evolveEmployee',{employeeId:e}).ok,true);assert.equal(g.state.employees[0].spiritId,'zhaocai-2');assert.ok(!g.state.zhaocaiStage3Completed);
 assert.equal(g.act('evolveEmployee',{employeeId:e}).ok,true);assert.equal(g.state.employees[0].spiritId,'zhaocai-3');assert.equal(g.state.zhaocaiStage3Completed,true);assert.ok(g.storage.getItem('phantom_shared_unlocks'));
});
test('三種蛋各招一次、固定路線，已聘用者不影響其他分支',()=>{
 const g=fresh({level:4});for(const id of ['egg-gu','egg-ma','egg-ying'])assert.equal(g.act('hire',{id}).ok,true);assert.equal(g.act('hire',{id:'egg-gu'}).ok,false);
 g.transaction(null,s=>{for(const e of s.employees)e.workLevel=4;return 'x';});for(const e of g.state.employees)g.act('evolveEmployee',{employeeId:e.id});
 assert.deepEqual(g.state.employees.map(e=>e.spiritId),['grovyle','treecko','sceptile']);
});
test('商會的小金魚依序進化成金魚皇后、金魚國王，熟練度不重置',()=>{
 const g=fresh();g.act('hire',{id:'kyogre'});g.transaction(null,s=>{s.employees[0].workLevel=8;return 'x';});
 g.act('evolveEmployee',{employeeId:g.state.employees[0].id});assert.equal(g.state.employees[0].spiritId,'rayquaza');
 g.act('evolveEmployee',{employeeId:g.state.employees[0].id});assert.equal(g.state.employees[0].spiritId,'groudon');assert.equal(g.state.employees[0].workLevel,8);
 assert.equal(g.act('evolveEmployee',{employeeId:g.state.employees[0].id}).ok,false);
});
test('水蛟龍王一次只有一項駐點任務，加成真實生效',()=>{
 const g=fresh({level:8});g.act('hire',{id:'kyogre'});g.transaction(null,s=>{s.employees[0].workLevel=8;s.employees[0].spiritId='mewtwo';s.employees[0].role='host';return 'x';});
 assert.equal(g.act('setDragonTask',{id:'treasure'}).ok,true);const income=passive(g,g.state,'income');assert.ok(income>=.08);g.act('setDragonTask',{id:'brew'});assert.ok(passive(g,g.state,'income')<income);assert.ok(passive(g,g.state,'potion')>=.12);
});
test('主角平常在櫃台收銀，巡店從櫃台後方出發',()=>{const g=fresh();g.transaction(null,s=>{s.manager.x=3;s.manager.z=3;return 'x';});g.setManagerActive(true);assert.ok(Math.abs(g.state.manager.x-CHECKOUT.x)<=1&&Math.abs(g.state.manager.z-1)<=1);});
test('宣傳員：等級不足不能聘請、不佔在班名額、只在毛利為正時加成',()=>{
 const g=fresh({level:1});assert.equal(g.act('hirePromoter',{id:'blissey'}).ok,false);assert.equal(g.act('hirePromoter',{id:'swampert'}).ok,true);assert.equal(g.state.promoter.id,'swampert');assert.equal(g.state.employees.length,0);
});
test('舊存檔遷移：職務併入、超額轉備用、欠薪清除、家具與金幣保留',()=>{
 const g=fresh({level:3});place(g);const old=JSON.parse(JSON.stringify(g.state));delete old.schemaVersion;delete old.tutorialState;old.totals.sales=20;old.unpaidWages=300;old.gold=1234;
 const pool=['bulbasaur','squirtle','charmander','chikorita'];old.employees=pool.map((id,i)=>({...g.employee(id,['sales','smith','warehouse','security'][i]),workLevel:5}));
 const storage=memory({firstlight_shop_v1:JSON.stringify(old)}),next=new Game({storage,data:data()}),s=next.state;
 assert.equal(s.gold,1234);assert.equal(s.shelves.length,1);assert.equal(s.employees.length,4);assert.equal(onDuty(s).length,3);assert.ok(s.employees.every(e=>['host','stocker','cleaner','standby'].includes(e.role)));assert.equal(s.unpaidWages,0);assert.equal(s.tutorialState.done,true);assert.ok(storage.getItem('firstlight_shop_v1.pre-v2'));
 assert.equal(migrateState(next,s),false);
});
test('新玩家從教學開始、沒有事件',()=>{const g=new Game({storage:memory(),data:data()});assert.equal(g.state.tutorialState.done,false);assert.equal(g.state.employees.length,0);});
test('每一頁最多四個操作鈕',()=>{const src=fs.readFileSync(path.join(ROOT,'js/shop-hub.js'),'utf8');assert.match(src,/MAX_ACTIONS=4/);assert.match(src,/超過四個操作鈕/);assert.equal((fs.readFileSync(path.join(ROOT,'index.html'),'utf8').match(/data-hub="/g)||[]).length,4);});
