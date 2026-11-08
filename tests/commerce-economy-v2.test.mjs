import test from 'node:test';
import assert from 'node:assert/strict';
import {CUSTOMER_TYPES,MARKET_EVENTS,purchaseChance,rollMarket,activeEvent,ensureMarket,costFactor,settleReputation} from '../初光商會/js/economy-v2.js';
const base=(over={})=>({day:1,level:1,prices:{},stats:{},satisfaction:80,market:{event:null,lastId:null,history:[],reputation:50,loyalty:50},...over});
const rng=(seq)=>{let i=0;return {random:()=>seq[i++%seq.length],log:()=>{},data:{catalog:[]}};};

test('售價越高購買率越低，且有上下限、不會出現 NaN',()=>{
 const s=base(),p=x=>purchaseChance(s,{type:'commoner',sku:'potion',price:x,ref:30});
 assert.ok(p(15)>p(30)&&p(30)>p(60));for(const x of [0,1,30,9999])assert.ok(p(x)>=.02&&p(x)<=.98&&Number.isFinite(p(x)));
});
test('平民比富豪對價格敏感',()=>{
 const s=base(),drop=type=>purchaseChance(s,{type,sku:'sword-flame',price:300,ref:256})/purchaseChance(s,{type,sku:'sword-flame',price:256,ref:256});
 assert.ok(drop('commoner')<drop('rich'));assert.equal(CUSTOMER_TYPES.commoner.elasticity,2);assert.equal(CUSTOMER_TYPES.rich.elasticity,.5);
});
test('偏好類別提高購買率：冒險者偏好補給、魔法師偏好魔法用品',()=>{
 const s=base(),chance=(type,sku)=>purchaseChance(s,{type,sku,price:40,ref:40});
 assert.ok(chance('adventurer','potion')>chance('mage','potion'));assert.ok(chance('mage','battery')>chance('adventurer','battery'));
});
test('沒有必勝定價：預期毛利在中間價格最高',()=>{
 const s=base(),cost=16,ref=29,profit=x=>purchaseChance(s,{type:'commoner',sku:'potion',price:x,ref})*(x-cost);
 const low=profit(18),mid=profit(29),high=profit(70);assert.ok(mid>low&&mid>high,`${low} ${mid} ${high}`);
});
test('市場事件跨日有效、到期還原，同一天不重抽、不連續同一件',()=>{
 const s=base(),g=rng([.1,0]);const ev=rollMarket(g,s);assert.ok(ev);const id=ev.id,days=MARKET_EVENTS.find(e=>e.id===id).days;
 assert.equal(rollMarket(rng([.99]),s).id,id);for(let d=1;d<days;d++){s.day++;assert.equal(activeEvent(s)?.id,id);}
 s.day++;assert.equal(activeEvent(s),null);const next=rollMarket(rng([.1,0]),s);assert.notEqual(next?.id,id);
});
test('進價事件只影響對應類別',()=>{const s=base();s.market.event={id:'harvest',startDay:1,endDay:3};assert.equal(costFactor(s,'berry'),.75);assert.equal(costFactor(s,'sword-starter'),1);});
test('聲譽每天變動有上限且維持在 0 到 100',()=>{
 const g={data:{catalog:[{sku:'potion',suggestedRetail:29}]}};const s=base({prices:{potion:200},satisfaction:0,stats:{served:1,lost:20}});
 const d=settleReputation(g,s);assert.ok(d>=-4);assert.ok(s.market.reputation>=0&&s.market.reputation<=100);
 for(let i=0;i<60;i++)settleReputation(g,s);assert.ok(s.market.reputation>=0);
});
