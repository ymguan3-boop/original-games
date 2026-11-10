import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game} from '../../初光商會/js/core.js';
import {stepCustomers} from '../../初光商會/js/shop-operations.js';
import {operatingReport} from '../../初光商會/js/ledger-panel.js';
import {competitionIndex,trafficFactor} from '../../初光商會/js/economy-v2.js';
import {ENTRANCE,applyRoom,dimensions,isLayoutValid,findPath,CHECKOUT} from '../../初光商會/js/nav.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../../初光商會/data/'+n+'.json',import.meta.url)));
const data=()=>Object.fromEntries([['catalog','shop-catalog'],['hirePool','hire-pool'],['spirits','spirits'],['evolution','evolution'],['levels','store-levels'],['config','economy'],['management','management']].map(([k,n])=>[k,read(n)]));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('left door remains reachable at every tier and reserves the actual door cell',()=>{
 for(let level=1;level<=10;level++){applyRoom(level);assert.equal(ENTRANCE.x,1);assert.equal(ENTRANCE.z,dimensions(level).height-4);assert.ok(findPath(ENTRANCE,CHECKOUT,[],level));assert.ok(isLayoutValid([],level));assert.equal(isLayoutValid([{...ENTRANCE}],level),false);}
});
test('reloading a previous schema preserves gold and inventory; stale tab cannot charge again',()=>{
 const storage=memory(),d=data(),g=new Game({storage,data:d});const old=structuredClone(g.state);old.schemaVersion=2;old.gold=7777;storage.setItem(g.key,JSON.stringify(old));
 const a=new Game({storage,data:d}),b=new Game({storage,data:d});assert.equal(a.state.schemaVersion,3);assert.equal(a.state.gold,7777);assert.deepEqual(a.state.inventory,old.inventory);
 assert.equal(a.act('purchaseShelf',{type:'apothecary'}).ok,true);assert.equal(b.act('purchaseShelf',{type:'apothecary'}).ok,false);assert.match(b.lastError,/另一分頁/);
});
test('checkout settles a customer once even if its old Checkout state is replayed after reload',()=>{
 const storage=memory(),d=data(),g=new Game({storage,data:d});const sku=d.catalog[0].sku;
 const customer={id:'c-regression',name:'旅人',x:10,z:3,budget:999,path:[],basket:[{sku,shelfId:'rack-test',qty:1,price:30,cost:10}],state:'Checkout',timer:100,personality:0,customerType:'commoner'};
 g.transaction(null,s=>{s.phase='open';s.shelves=[{id:'rack-test',type:'apothecary',sku,x:4,z:5,stock:5}];s.customers=[structuredClone(customer)];stepCustomers(g,s,.25);});
 const gold=g.state.gold,stock=g.state.shelves[0].stock;assert.equal(g.state.stats.sales,1);assert.equal(g.state.stats.units,1);
 const reloaded=new Game({storage,data:d});reloaded.transaction(null,s=>{s.customers=[structuredClone(customer)];stepCustomers(reloaded,s,.25);});
 assert.equal(reloaded.state.gold,gold);assert.equal(reloaded.state.shelves[0].stock,stock);assert.equal(reloaded.state.stats.sales,1);
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
 const h=new Game({storage:memory(),data:data()});h.transaction(null,s=>{s.level=5;s.gold=999999;s.totals.sales=999999;});assert.equal(h.act('hire',{id:'mewtwo'}).ok,true);assert.equal(h.act('hirePromoter',{id:'mewtwo'}).ok,false);
});
