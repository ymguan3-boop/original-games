import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {Game} from '../js/core.js';const read=n=>JSON.parse(fs.readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8')),data=Object.fromEntries(Object.entries({catalog:'shop-catalog',hirePool:'hire-pool',spirits:'spirits',evolution:'evolution',levels:'store-levels',config:'economy',management:'management'}).map(([k,v])=>[k,read(v)]));
import {applyRoom,counterPositions,STATIONS} from '../js/nav.js?v=20261117-v67';
import {stepCustomers} from '../js/shop-operations.js?v=20261117-v67';
import {accepts} from '../js/furniture.js?v=20261117-v67';
test('雙晶櫃只在第五級解鎖；購買、上架後兩座收銀台依序成交',()=>{
 const store=new Map(),g=new Game({storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},data});
 for(let level=1;level<=5;level++)assert.equal(counterPositions(level).length,level>=3?2:1);
 const sku='pet-xp-double';g.transaction(null,s=>{s.level=4;s.gold=10000;});applyRoom(4);
 assert.equal(g.act('purchaseShelf',{type:'xp-crystal'}).ok,false);
 g.transaction(null,s=>{s.level=5;s.inventory[sku]=8;});applyRoom(5);
 assert(g.act('purchaseShelf',{type:'xp-crystal'}).ok);
 const shelfId=g.state.lastPurchasedShelf;const placed=g.act('placeShelf',{shelfId,x:3,z:5});assert(placed.ok,placed.message);
 const s=g.state,sh=s.shelves.find(o=>o.id===shelfId);assert.equal(sh.stock,30);
 assert(accepts(sh,data.catalog.find(o=>o.sku===sku)));assert(!accepts(sh,data.catalog.find(o=>o.sku==='potion')));
 const staff=g.employee(data.hirePool[0].id,'cashier');s.employees=[Object.assign(staff,STATIONS[1].cashier)];s.phase='open';s.customers=STATIONS.map((st,i)=>({id:'buyer'+i,...st.pay,station:i,state:'Queue',queueSlot:-1,queueOrder:i+1,timer:0,path:[],patience:80,wait:0,budget:800,basket:[{sku,shelfId,qty:1,price:117,cost:65}],visited:[]}));
 for(let i=0;i<4;i++)stepCustomers(g,s,data.config.checkoutSeconds+1);
 assert.equal(sh.stock,28);assert.equal(s.ledger.filter(o=>o.items?.some(b=>b.sku===sku)).length,2);
});
