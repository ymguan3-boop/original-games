import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildNotice} from '../js/build-notices.js';
import {shelfTypes} from '../js/furniture.js';
import {decorTypes} from '../js/decorations.js';
import {MARKET_EVENTS,tagsOf,costFactor,demandFactor,eventEffects,activeEvent,rollMarket} from '../js/economy-v2.js';
import {MERCHANT_DROP_RATES,rollMerchantWeapon,merchantWeaponCatalog} from '../../幻靈奇旅/survivors/js/merchant-meadow.js';
const raw=JSON.parse(fs.readFileSync(new URL('../data/shop-catalog.json',import.meta.url),'utf8')),catalog=[...raw.filter(c=>c.category!=='weapon'),...merchantWeaponCatalog()],g={data:{catalog}},seen=[...shelfTypes,...decorTypes].map(t=>t.id);
const state=()=>({level:3,day:1,shelves:[],decorStorage:[],shelfStorage:[]});
const market=id=>({...state(),market:{event:{id,startDay:1,endDay:3,pickedTag:'material'}}});
test('草原三階掉落率皆為舊版五分之一，臨界值不掉且保留階級',()=>{
 for(const[kind,old]of[['normal',.22],['elite',.8],['boss',1]]){const rate=MERCHANT_DROP_RATES[kind];assert.equal(rate,old/5);assert.equal(rollMerchantWeapon({kind},()=>rate),null);assert.equal(rollMerchantWeapon({kind},()=>rate-.000001).merchantGrade,kind);}
});
test('十二種市場事件全部作用到實際商品；豐收降素材進價25%，未影響補給',()=>{
 for(const event of MARKET_EVENTS){for(const tag of Object.keys({...event.cost,...event.demand}))assert(tag==='all'||catalog.some(c=>tagsOf(c.sku).includes(tag)),event.id+': '+tag);}
 const s=market('harvest');for(const sku of ['berry','shop-iron','shop-wood','shop-crystal'])assert.equal(costFactor(s,sku),.75);assert.equal(costFactor(s,'potion'),1);assert.deepEqual(eventEffects(activeEvent(s)),['素材進價 -25%']);
 assert.equal(demandFactor(market('festival'),'potion'),1.5);assert.equal(demandFactor(market('demon'),'guns-critical-merchant-boss'),1.7);
 assert(!MARKET_EVENTS.some(e=>/食品|防具/.test(e.text+e.shout)));assert(tagsOf('staff-pumpkin').includes('weapon'));
});
test('短缺事件只抽可採購分類，舊食品分類轉為素材',()=>{
 const pool=MARKET_EVENTS,total=pool.reduce((n,e)=>n+e.weight,0),before=pool.slice(0,pool.findIndex(e=>e.id==='shortage')).reduce((n,e)=>n+e.weight,0),values=[0,(before+.1)/total,.999];
 const s=state();rollMarket({...g,random:()=>values.shift(),log:()=>{}},s);assert.equal(s.market.event.id,'shortage');const tag=s.market.event.pickedTag;assert(catalog.some(c=>c.isSellable&&!c.isRestricted&&!c.lootOnly&&c.buyCost>0&&tagsOf(c.sku).includes(tag)));
 s.market.event.pickedTag='food';assert.equal(activeEvent(s).pickedTag,'material');assert.equal(costFactor(s,'berry'),1.4);
});
test('已讀且無待辦不亮燈，收納家具不構成待辦；未完成布置有明確指示',()=>{
 const s=state();s.decorStorage=[{id:'stored',type:'plant'}];assert.equal(buildNotice(g,s,seen),null);
 s.rackReminder={category:'weapon'};assert.match(buildNotice(g,s,seen).message,/武器商品.*布置 → 貨架/);s.shelves=[{type:'armory'}];assert.equal(buildNotice(g,s,seen),null);
 s.layoutPause=true;assert.equal(buildNotice(g,s,seen).kind,'resume');assert.match(buildNotice(g,s,seen).message,/恢復營業/);
 const fresh=buildNotice(g,state(),[]);assert.equal(fresh.kind,'unlock');assert(fresh.ids.length>0);assert.match(fresh.message,/新解鎖.*查看/);
});
