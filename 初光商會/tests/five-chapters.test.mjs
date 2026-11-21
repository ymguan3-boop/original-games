import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {Game} from '../js/core.js';
import {chapterObjectives} from '../js/shop-chapters.js';
import {shelvesForLevel} from '../js/furniture.js';
import {decorForLevel} from '../js/decorations.js';

const files={catalog:'shop-catalog',hirePool:'hire-pool',spirits:'spirits',evolution:'evolution',levels:'store-levels',config:'economy',management:'management'};
const data=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(new URL('../data/'+f+'.json',import.meta.url),'utf8'))]));
function storage(){const m=new Map();return {getItem:key=>m.get(key),setItem:(key,value)=>m.set(key,value)};}

test('最高經營等級為五級，末章不再提供工程，舊後期收藏皆可解鎖',()=>{
 const game=new Game({storage:storage(),data});
 assert.equal(data.levels.length,5);
 assert(game.act('trialLevel',{level:5}).ok);
 assert(!game.act('trialLevel',{level:6}).ok);
 assert(!game.act('upgrade').ok);
 const chapter=chapterObjectives(game.state,data.levels);
 assert(chapter.last);assert(!chapter.canConstruct);
 assert.deepEqual(shelvesForLevel(5).filter(r=>['royal','relic'].includes(r.id)).map(r=>r.id),['relic','royal']);
 assert(decorForLevel(5).some(o=>o.id==='sun-art'));
 assert(data.catalog.every(o=>o.unlockStoreLevel<=5));
 assert(data.management.dragon.tasks.every(o=>o.level<=5));
});

test('讀取十級舊檔可保留金幣、庫存、舊款家具，重開不重複補償',()=>{
 const db=storage(),game=new Game({storage:db,data}),s=structuredClone(game.state);
 s.level=10;s.gold=49123;s.inventory.potion=19;
 s.decorStorage=[{id:'vintage',type:'clock',tier:10,purchasePrice:713,decoration:true,rotation:0}];
 s.chapterClear={level:9,title:'舊商會'};db.setItem(game.key,JSON.stringify(s));
 for(let i=0;i<2;i++){
  const next=new Game({storage:db,key:game.key,data});
  assert.equal(next.state.level,5);assert.equal(next.state.gold,49123);
  assert.equal(next.state.inventory.potion,19);assert.equal(next.state.chapterClear,null);
  assert.deepEqual(next.state.decorStorage,s.decorStorage);
  assert.equal(JSON.parse(db.getItem(game.key)).level,5);
 }
});

test('合併舊章節時，超額貨架與架上商品回倉，超額在班員工轉為休息',()=>{
 const db=storage(),game=new Game({storage:db,data}),s=structuredClone(game.state);
 s.level=9;s.inventory.potion=11;
 s.shelves=Array.from({length:15},(_,i)=>({id:'old-'+i,tier:9,type:'apothecary',sku:'potion',stock:i===14?3:0,x:1+i%6,z:2+Math.floor(i/6),purchasePrice:400,rotation:0}));
 s.employees=data.hirePool.filter(h=>!h.evolutionOnly&&!h.recruitDisabled).slice(0,6).map(h=>game.employee(h.id,'host'));
 db.setItem(game.key,JSON.stringify(s));
 const next=new Game({storage:db,key:game.key,data}).state;
 assert.equal(next.shelves.length+next.shelfStorage.length,15);
 const excess=next.shelfStorage.find(o=>o.id==='old-14');
 assert.equal(excess.purchasePrice,400);assert.equal(excess.stock,0);
 assert.equal(next.inventory.potion,14);
 assert.equal(next.employees.length,6);assert.equal(next.employees.filter(e=>e.role!=='standby').length,5);
});
