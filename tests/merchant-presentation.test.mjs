import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleStaff,rewardState,passiveDescription,chasePose} from '../初光商會/js/shop-presentation.js';
import {createHub} from '../初光商會/js/shop-hub.js';
test('休息員工不在場景，但保留原員工清單',()=>{const team=[{id:'rest',role:'standby'},{id:'cash',role:'cashier'},{id:'unset'}];assert.deepEqual(visibleStaff(team).map(e=>e.id),['cash']);assert.equal(team.length,3);});
test('任務區別未完成、可領取、已領取',()=>{assert.equal(rewardState(false),'pending');assert.equal(rewardState(true),'ready');assert.equal(rewardState(true,true),'claimed');});
test('被動數值取實際進化階段與職務；休息不顯示生效加成',()=>{const game={data:{management:{traits:{seed:{name:'搬運',text:'補貨速度提升',preferredJob:'stocker',base:[.03,.05,.07],boosted:[.08,.12,.15]}}}}},e={baseId:'seed',role:'stocker',evolutionHistory:['one']};assert.match(passiveDescription(game,e),/12%/);assert.match(passiveDescription(game,{...e,role:'host'}),/5%/);assert.match(passiveDescription(game,{...e,role:'standby'}),/0%（休息中，未生效）/);});
test('追客慶祝有明顯起跳並於結束後回到原位',()=>{assert.ok(chasePose(.3).hop>.05);assert.equal(chasePose(2).active,false);assert.equal(chasePose(2).hop,0);assert.equal(chasePose(-1).active,false);});
test('突發委託與一般任務共存，不擠掉一鍵領獎且不超過操作上限',()=>{const oldDocument=globalThis.document,oldListener=globalThis.addEventListener;globalThis.document={getElementById:()=>({querySelector:()=>({}),addEventListener(){}})};globalThis.addEventListener=()=>{};try{const game={state:{event:{title:'排隊過久'}},data:{}};const hub=createHub({game,esc:String});const page=hub.pages.tasks();assert.equal(page.cards[0].status,'urgent');assert.equal(page.cards.length,4);assert.equal(page.actions[0][0],'一鍵領取全部獎勵');assert.ok(page.actions.length<=4);}finally{globalThis.document=oldDocument;globalThis.addEventListener=oldListener;}});
