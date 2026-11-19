import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game} from '../../初光商會/js/core.js';
import {stepCustomers} from '../../初光商會/js/shop-operations.js';
import {operatingReport} from '../../初光商會/js/ledger-panel.js';
import {competitionIndex,trafficFactor} from '../../初光商會/js/economy-v2.js';
import {ENTRANCE,applyRoom,dimensions,isLayoutValid,findPath,CHECKOUT} from '../../初光商會/js/nav.js';
import {resetMerchantRelease,SHOP_RESET_VERSION} from '../../初光商會/js/save-reset.js';
import {createLoadingGate} from '../../初光商會/js/loading-gate.js';
import {canStartTutorial,openingBlocker,promoterHireCost} from '../../初光商會/js/shop-entry-rules.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../../初光商會/data/'+n+'.json',import.meta.url)));
const data=()=>Object.fromEntries([['catalog','shop-catalog'],['hirePool','hire-pool'],['spirits','spirits'],['evolution','evolution'],['levels','store-levels'],['config','economy'],['management','management']].map(([k,n])=>[k,read(n)]));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};

test('empty-shop tutorial, mandatory placed shelf and promoter, and first free hire survive reload',()=>{
 const storage=memory(),g=new Game({storage,data:data()});
 assert.equal(canStartTutorial(g.state),true);assert.equal(g.act('open').ok,false);assert.match(openingBlocker(g.state),/貨架/);
 g.act('purchaseShelf',{type:'apothecary'});assert.equal(g.act('open').ok,false,'a stored shelf is not placed');
 assert.equal(g.act('placeShelf',{shelfId:g.state.lastPurchasedShelf,x:3,z:5}).ok,true);
 assert.equal(canStartTutorial(g.state),false);assert.equal(g.act('tutorialReplay').ok,false);
 assert.equal(g.act('open').ok,false);assert.match(g.lastError,/宣傳員/);
 const gold=g.state.gold,expenses=g.state.stats.expenses;
 assert.equal(g.act('hirePromoter',{id:'blissey'}).ok,false,'a rejected hire does not consume the free first hire');
 assert.equal(g.act('hirePromoter',{id:'swampert'}).ok,true);assert.equal(g.state.gold,gold);assert.equal(g.state.stats.expenses,expenses);
 assert.equal(g.state.promoterFirstHireClaimed,true);assert.equal(g.act('open').ok,true);
 const reloaded=new Game({storage,data:data()});assert.equal(promoterHireCost(reloaded.state,{cost:650}),650);
 reloaded.transaction(null,s=>{s.level=2;});const before=reloaded.state.gold;
 assert.equal(reloaded.act('hirePromoter',{id:'feraligatr'}).ok,true);assert.equal(reloaded.state.gold,before-650);
 assert.equal(g.act('hirePromoter',{id:'swampert'}).ok,false);
});

/* 舊版蓋版教學（shop-tutorial.js）已於 11/11 移除，相關 DOM 教學測試一併刪除；空店引導改由上面的 canStartTutorial／openingBlocker 規則驗證 */
test('updated front door remains reachable at every tier and reserves the actual door cell',()=>{
 for(let level=1;level<=10;level++){applyRoom(level);assert.equal(ENTRANCE.x,Math.round((dimensions(level).width-1)/2));assert.equal(ENTRANCE.z,Math.floor(dimensions(level).height)-2);assert.ok(findPath(ENTRANCE,CHECKOUT,[],level));assert.ok(isLayoutValid([],level));assert.equal(isLayoutValid([{...ENTRANCE}],level),false);}
});
test('reloading a previous schema preserves gold and inventory; stale tab cannot charge again',()=>{
 const storage=memory(),d=data(),g=new Game({storage,data:d});const old=structuredClone(g.state);old.schemaVersion=2;old.gold=7777;storage.setItem(g.key,JSON.stringify(old));
 const a=new Game({storage,data:d}),b=new Game({storage,data:d});assert.equal(a.state.schemaVersion,3);assert.equal(a.state.gold,7777);assert.deepEqual(a.state.inventory,old.inventory);
 assert.equal(a.act('purchaseShelf',{type:'apothecary'}).ok,true);assert.equal(b.act('purchaseShelf',{type:'apothecary'}).ok,false);assert.match(b.lastError,/另一分頁/);
});
test('checkout settles a customer once even if its old Checkout state is replayed after reload',()=>{
 /* 其他測試會切換房間等級，先回到 Lv.1 的收銀台座標 */applyRoom(1);
 const storage=memory(),d=data(),g=new Game({storage,data:d});const sku=d.catalog[0].sku;
 /* 顧客站在 0 號收銀台的結帳點上 */const customer={id:'c-regression',name:'旅人',x:CHECKOUT.x,z:CHECKOUT.z,budget:999,path:[],basket:[{sku,shelfId:'rack-test',qty:1,price:30,cost:10}],state:'Checkout',timer:100,personality:0,customerType:'commoner'};
 g.transaction(null,s=>{s.phase='open';s.shelves=[{id:'rack-test',type:'apothecary',sku,x:4,z:5,stock:5}];s.customers=[structuredClone(customer)];stepCustomers(g,s,.25);});
 /* 讀檔時貨架庫存可能改記在 stockBySku 或退回倉庫，所以比對這項商品的總數量 */const units=st=>(st.inventory[sku]||0)+[...st.shelves,...(st.shelfStorage||[])].reduce((n,sh)=>n+(sh.sku===sku?sh.stock||0:0)+(sh.sku!==sku?sh.stockBySku?.[sku]||0:0),0);const gold=g.state.gold,stock=units(g.state);assert.equal(g.state.stats.sales,1);assert.equal(g.state.stats.units,1);
 const reloaded=new Game({storage,data:d});reloaded.transaction(null,s=>{s.customers=[structuredClone(customer)];stepCustomers(reloaded,s,.25);});
 assert.equal(reloaded.state.gold,gold);assert.equal(units(reloaded.state),stock);assert.equal(reloaded.state.stats.sales,1);
});
test('weekly report weights average price and stockouts across days without counting report twice',()=>{
 const s={day:2,phase:'report',history:[{day:1,revenue:100,cogs:40,units:2,visitors:10,stockouts:2,visitors_commoner:10},{day:2,revenue:60,cogs:20,units:1,visitors:5,stockouts:1,visitors_mage:5}],stats:{revenue:60}};
 const r=operatingReport(s,7);assert.equal(r.revenue,160);assert.equal(r.gross,100);assert.equal(r.average,160/3);assert.equal(r.stockoutRate,.2);assert.equal(r.types.mage,5);
});
test('competition is stable within a day and a rival promotion diverts traffic',()=>{
 const s={day:1,market:{reputation:50,event:null}};assert.equal(competitionIndex(s),100);const normal=trafficFactor(s);s.day=2;s.market.event={id:'rival',startDay:2,endDay:3};assert.equal(competitionIndex(s),125);assert.ok(trafficFactor(s)<normal);s.market.reputation=0;assert.equal(competitionIndex(s),125);
});
test('employee and promoter recruitment reject occupying the same spirit',()=>{
 const g=new Game({storage:memory(),data:data()});g.transaction(null,s=>{s.level=5;s.gold=999999;s.totals.sales=999999;});
 assert.equal(g.act('hirePromoter',{id:'mewtwo'}).ok,true);assert.equal(g.act('hire',{id:'mewtwo'}).ok,false);
 /* 宣傳員進化系列不能當一般員工聘用，所以同一隻幻靈不會同時佔兩個位置 */const h=new Game({storage:memory(),data:data()});h.transaction(null,s=>{s.level=5;s.gold=999999;s.totals.sales=999999;});for(const id of ['swampert','feraligatr','empoleon','blissey','mewtwo'])if(h.data.hirePool.some(x=>x.id===id))assert.equal(h.act('hire',{id}).ok,false,id);assert.equal(h.act('hirePromoter',{id:'mewtwo'}).ok,true);
});
test('every building tier has exactly half its former floor area',()=>{
 for(let level=1;level<=5;level++){const d=dimensions(level);assert.ok(Math.abs(d.width*d.height/((13+level)*(11+level))-.5)<1e-12);}
});
test('release reset backs up only merchant progress once and preserves town and defense',()=>{
 const m=new Map([['firstlight_shop_v1','invalid old save'],['phantom_journey_v1','town'],['phantom_defense_v1','defense']]);const storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 assert.equal(resetMerchantRelease(storage),true);assert.equal(m.get('firstlight_shop_v1.before-'+SHOP_RESET_VERSION),'invalid old save');assert.equal(m.has('firstlight_shop_v1'),false);assert.equal(m.get('phantom_journey_v1'),'town');assert.equal(m.get('phantom_defense_v1'),'defense');m.set('firstlight_shop_v1','new save');assert.equal(resetMerchantRelease(storage),false);assert.equal(m.get('firstlight_shop_v1'),'new save');
});
test('placing a shelf and advancing time never opens business without a player action',()=>{
 const g=new Game({storage:memory(),data:data()});g.act('purchaseShelf',{type:'apothecary'});const r=g.act('placeShelf',{shelfId:g.state.lastPurchasedShelf,x:3,z:5});assert.equal(r.ok,true);for(let i=0;i<80;i++)g.tick(.25);assert.equal(g.state.phase,'closed');assert.equal(g.state.customers.length,0);g.act('hirePromoter',{id:'swampert'});assert.equal(g.act('open').ok,true);for(let i=0;i<40;i++)g.tick(.25);assert.ok(g.state.customers.length>0);
});
test('loading gate waits for pending actors, textures and image decoding before opening',async()=>{
 const previous=globalThis.document;let decoded=false,actors=1;globalThis.document={images:[{src:'hero.png',decode:async()=>{decoded=true;}}]};const manager={},gate=createLoadingGate({DefaultLoadingManager:manager},()=>{}),scene={metrics:{errors:[]},assetsPending:()=>actors,update(){}};
 try{manager.onStart('floor',0,1);setTimeout(()=>{actors=0;manager.onProgress('floor',1,1);manager.onLoad();},80);await gate.wait(scene);assert.equal(decoded,true);assert.equal(actors,0);}finally{gate.dispose();globalThis.document=previous;}
});
