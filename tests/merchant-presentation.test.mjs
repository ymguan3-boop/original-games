import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleStaff,rewardState,passiveDescription,chasePose} from '../初光商會/js/shop-presentation.js';
import {createHub} from '../初光商會/js/shop-hub.js';
import fs from 'node:fs';
import {Game} from '../初光商會/js/core.js';
/* 用真實遊戲引擎與資料，避免手寫假物件跟不上任務頁的新欄位 */
const J=f=>JSON.parse(fs.readFileSync(new URL('../初光商會/data/'+f+'.json',import.meta.url),'utf8'));
const realGame=()=>{const m=new Map();return new Game({storage:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},data:{catalog:J('shop-catalog'),hirePool:J('hire-pool'),spirits:J('spirits'),evolution:J('evolution'),levels:J('store-levels'),config:J('economy'),management:J('management')},seed:7});};
test('休息員工不在場景，但保留原員工清單',()=>{const team=[{id:'rest',role:'standby'},{id:'cash',role:'cashier'},{id:'unset'}];assert.deepEqual(visibleStaff(team).map(e=>e.id),['cash']);assert.equal(team.length,3);});
test('任務區別未完成、可領取、已領取',()=>{assert.equal(rewardState(false),'pending');assert.equal(rewardState(true),'ready');assert.equal(rewardState(true,true),'claimed');});
test('被動數值取實際進化階段與職務；休息不顯示生效加成',()=>{const game={data:{management:{traits:{seed:{name:'搬運',text:'補貨速度提升',preferredJob:'stocker',base:[.03,.05,.07],boosted:[.08,.12,.15]}}}}},e={baseId:'seed',role:'stocker',evolutionHistory:['one']};assert.match(passiveDescription(game,e),/12%/);assert.match(passiveDescription(game,{...e,role:'host'}),/5%/);assert.match(passiveDescription(game,{...e,role:'standby'}),/0%（休息中，未生效）/);});
test('追客慶祝有明顯起跳並於結束後回到原位',()=>{assert.ok(chasePose(.3).hop>.05);assert.equal(chasePose(2).active,false);assert.equal(chasePose(2).hop,0);assert.equal(chasePose(-1).active,false);});
test('突發委託與一般任務共存，不擠掉一鍵領獎且不超過操作上限',()=>{const oldDocument=globalThis.document,oldListener=globalThis.addEventListener;globalThis.document={getElementById:()=>({querySelector:()=>({}),addEventListener(){}})};globalThis.addEventListener=()=>{};try{const game=realGame();game.transaction(null,st=>{st.event={title:'排隊過久'};return 'x';});const hub=createHub({game,esc:String});const page=hub.pages.tasks();assert.equal(page.cards[0].status,'urgent');assert.equal(page.cards.length,4);assert.equal(page.actions[0][0],'沒有可領的獎勵','領獎按鈕仍在第一位；沒有可領時改顯示說明');assert.ok(page.actions.length<=4);}finally{globalThis.document=oldDocument;globalThis.addEventListener=oldListener;}});
