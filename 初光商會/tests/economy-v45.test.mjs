import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame} from '../js/core.js';
import {accepts,shelfTypes} from '../js/furniture.js';
import {chapterObjectives} from '../js/shop-chapters.js';
import {merchantWeaponCatalog,merchantWeaponName} from '../../幻靈奇旅/survivors/js/merchant-meadow.js';
const read=n=>JSON.parse(fs.readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8'));
const data=Object.fromEntries(Object.entries({catalog:'shop-catalog',hirePool:'hire-pool',spirits:'spirits',evolution:'evolution',levels:'store-levels',config:'economy',management:'management'}).map(([k,v])=>[k,read(v)]));
async function setup(){const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};return {g:await createGame({storage,data}),storage};}
test('達標自動打烊一次，工程費列入同一份日結，工期結束才升級',async()=>{
 const {g}=await setup(),fee=data.levels[1].cost;
 const result=g.transaction(null,s=>{s.phase='open';s.gold=5000;s.totals={sales:1,revenue:400,days:1};s.stats.revenue=400;s.stats.cogs=20;s.stats.expenses=50;s.inventory.potion=3;s.employees=[g.employee('bulbasaur','stocker')];s.employees[0].workTask={phase:'carry',sku:'potion',qty:2};});
 assert(result.ok,result.message);assert.equal(g.state.phase,'report');assert.equal(g.state.level,1);assert.equal(g.state.gold,5000-fee);assert.equal(g.state.totals.days,2);assert.equal(g.state.history.length,1);assert.equal(g.state.report.expenses,fee+50);assert.equal(g.state.report.netProfit,400-20-fee-50);assert.equal(g.state.inventory.potion,5);assert.equal(g.state.employees[0].workTask,null);
 for(let i=0;i<31;i++)g.tick(1);
 assert.equal(g.state.level,2);assert.equal(g.state.upgradeProject,null);assert.equal(g.state.history.length,1);assert.equal(g.state.totals.days,2);
});
test('預算不足不顯示全達標、不重複結算；領到足額資金後自動施工',async()=>{
 const {g}=await setup();g.transaction(null,s=>{s.phase='report';s.gold=100;s.totals={sales:1,revenue:400,days:1};s.report={...s.stats,day:1,gold:100,netProfit:0};s.history=[{...s.report}];});
 assert.equal(g.state.upgradeProject,null);assert.equal(chapterObjectives(g.state,data.levels).ready,false);
 g.transaction(null,s=>{s.gold=3000;});assert.equal(g.state.gold,1000);assert(g.state.upgradeProject);assert.equal(g.state.history.length,1);assert.equal(g.state.totals.days,1);assert.equal(g.state.history[0].expenses,2000);assert.equal(g.state.report.gold,1000);
});
test('一般與限定武器名稱統一、限定品僅進專櫃且Lv2可售',()=>{
 const catalog=merchantWeaponCatalog();assert(catalog.filter(c=>c.merchantGrade==='normal').every(c=>c.displayName==='武器商品'));
 for(const c of catalog.filter(c=>c.merchantGrade!=='normal')){assert.equal(c.displayName,'限定武器商品');assert.equal(c.unlockStoreLevel,2);for(const rack of shelfTypes)assert.equal(accepts({type:rack.id},c),rack.id==='limited-armory');assert.equal(accepts({type:'general'},c),false);}
 assert.equal(merchantWeaponName('normal'),'武器商品');assert.equal(merchantWeaponName('boss'),'限定武器商品');
});
test('限定武器櫃跨店內及收納限購一座，一般架不會自動選入限定品',async()=>{
 const {g}=await setup();g.transaction(null,s=>{s.level=2;s.gold=5000;});
 assert(g.act('purchaseShelf',{type:'limited-armory'}).ok);assert.equal(g.act('purchaseShelf',{type:'limited-armory'}).ok,false);
 assert.equal(g.act('addShelf',{type:'limited-armory',x:4,z:5}).ok,false);
 const sh=g.state.shelfStorage[0];assert(g.act('placeShelf',{shelfId:sh.id,x:4,z:5}).ok);assert.equal(g.act('purchaseShelf',{type:'limited-armory'}).ok,false);
 const normal=merchantWeaponCatalog().find(c=>c.merchantGrade==='normal'),limited=merchantWeaponCatalog().find(c=>c.merchantGrade==='elite');
 g.transaction(null,s=>{s.inventory[limited.sku]=4;s.inventory[normal.sku]=3;const plain={type:'armory',sku:normal.sku,stock:0};g.autoStock(s,plain);assert.equal(plain.sku,normal.sku);const premium=s.shelves[0];g.autoStock(s,premium);assert.equal(premium.sku,limited.sku);});
 assert.equal(g.act('restock',{shelfId:sh.id,sku:normal.sku,qty:1}).ok,false);
});
test('舊貨架上的限定武器安全退庫，保留SKU與已匯入計數且再次讀檔不複製',async()=>{
 const {g,storage}=await setup(),sku='guns-critical-merchant-elite';
 g.transaction(null,s=>{s.level=2;s.shelves=[{id:'old',type:'armory',x:4,z:5,rotation:0,sku,stock:4}];s.inventory[sku]=2;s.meadowImported={[sku]:10};});
 const reload=await createGame({storage,data});assert.equal(reload.state.inventory[sku],6);assert.equal(reload.state.shelves[0].stock,0);assert.equal(reload.state.shelves[0].sku,'sword-starter');assert.equal(reload.state.meadowImported[sku],10);
 reload.transaction(null,()=>{});const twice=await createGame({storage,data});assert.equal(twice.state.inventory[sku],6);assert.equal(twice.state.meadowImported[sku],10);
});
