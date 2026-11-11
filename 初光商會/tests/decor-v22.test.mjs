import {stepCustomers} from '../js/shop-operations.js';
import {dimensions,applyRoom,customerDisplayPoint} from '../js/nav.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game} from '../js/core.js';
import {wallSlots,gardenSlots} from '../js/decor-zones.js';
import {obstacles} from '../js/decorations.js';
const read=n=>JSON.parse(fs.readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8'));
const data=Object.fromEntries(Object.entries({catalog:'shop-catalog',hirePool:'hire-pool',spirits:'spirits',evolution:'evolution',levels:'store-levels',config:'economy',management:'management'}).map(([k,v])=>[k,read(v)]));
function setup(level=1){const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)},g=new Game({storage,data});assert(g.transaction(null,s=>{s.gold=100000;s.level=level;s.tutorialState.done=true;}).ok);return {g,storage};}
const buy=(g,type)=>{const r=g.act('purchaseDecor',{type});assert(r.ok,r.message);return g.state.lastPurchasedDecor;};
test('五階牆面均可掛放、避開門窗掛點，不阻擋通路；重讀與升級保留',()=>{
 for(let level=1;level<=5;level++){const {g,storage}=setup(level),slots=wallSlots(level);for(const side of ['back','front','left','right'])assert(slots.some(s=>s.side===side));const id=buy(g,'clock'),slot=slots.find(s=>s.side==='left');assert(g.act('placeDecor',{decorId:id,mount:slot.mount}).ok);const id2=buy(g,'couplet'),before=JSON.stringify(g.state);assert.equal(g.act('placeDecor',{decorId:id2,mount:slot.mount}).ok,false);assert.equal(JSON.stringify(g.state),before);assert.equal(g.act('placeDecor',{decorId:id2,mount:'window-0'}).ok,false);g.validate(g.state);const reloaded=new Game({storage,data});assert.equal(reloaded.state.decorations[0].mount,slot.mount);assert.equal(obstacles(reloaded.state).length,0);if(level<5){assert(g.transaction(null,s=>{s.level++;}).ok);g.validate(g.state);assert(g.state.decorations.some(d=>d.id===id)||g.state.decorStorage.some(d=>d.id===id));}}
});
test('室外植栽留通道、同位拒絕、收納與改放室內後重讀有效',()=>{
 const {g,storage}=setup(3),slots=gardenSlots(3);assert.equal(slots.length,4);const id=buy(g,'citrus'),p=slots[0];assert(g.act('placeDecor',{decorId:id,garden:p.garden}).ok);assert.equal(obstacles(g.state).length,0);const id2=buy(g,'fern');assert.equal(g.act('placeDecor',{decorId:id2,garden:p.garden}).ok,false);assert(g.act('placeDecor',{decorId:id2,garden:slots[1].garden}).ok);assert.equal(new Game({storage,data}).state.decorations.length,2);assert(g.act('storeDecor',{decorId:id}).ok);assert(!g.state.decorStorage.find(x=>x.id===id).garden);assert(g.act('placeDecor',{decorId:id,x:3,z:4}).ok);assert.equal(obstacles(g.state).length,1);g.validate(g.state);assert(new Game({storage,data}).state.decorations.some(d=>d.id===id&&!d.garden));
});

test('地毯可通行、半格靠牆、實際尺寸不重疊並保留存檔',()=>{const {g,storage}=setup(),id=buy(g,'carpet');assert(g.act('placeDecor',{decorId:id,x:3.5,z:.5}).ok);assert.equal(obstacles(g.state).length,0);const id2=buy(g,'carpet');assert.equal(g.act('placeDecor',{decorId:id2,x:5.5,z:.5}).ok,false);assert.equal(new Game({storage,data}).state.decorations[0].z,.5);g.validate(g.state);});
test('顧客走到門口當次即接續室內路徑，外部補間持續前進',()=>{const {g}=setup();assert(g.act('purchaseShelf',{type:'apothecary'}).ok);assert(g.act('placeShelf',{shelfId:g.state.lastPurchasedShelf,x:3,z:4}).ok);applyRoom(1);const {width,height}=dimensions(1),x=Math.round((width-1)/2),z=Math.floor(height)-2;const result=g.transaction(null,s=>{s.shelves[0].stock=10;s.customers=[{id:'entry',x,z,name:'來客',state:'Enter',arrivalRemaining:.1,path:[],basket:[],visited:[],personality:0,budget:100,patience:30,timer:0}];stepCustomers(g,s,.25);});assert(result.ok,result.message);const c=g.state.customers[0];assert(c.arrivingNow&&c.state==='Evaluate'&&c.path.length>0);assert(customerDisplayPoint(c,0).z>customerDisplayPoint(c,1).z);});
