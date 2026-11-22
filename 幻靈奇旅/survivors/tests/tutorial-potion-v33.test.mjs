import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createStore} from '../js/save-bridge.js';
import {setAutoItem} from '../js/auto-items.js';
import {autoPotionLearned,rememberAutoPotionLesson} from '../js/tutorial-progress.js';
function setup(){const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};return{store:createStore(storage),storage};}
function tutorial(store,meadow=false,preference={skipped:false}){const els=new Map(),events=new EventTarget();function el(){return {hidden:true,dataset:{},style:{},setAttribute(){},append(...children){for(const c of children)c.parentNode=this;},remove(){},querySelector(){return this.next||=( {disabled:false});}};}const body=el(),panel=el();panel.open=false;const document={body,createElement(){const x=el();Object.defineProperty(x,'id',{set(id){els.set(id,x);}});return x;},getElementById:id=>id==='panel'?panel:els.get(id),querySelector:()=>null,addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)};const ctx=vm.createContext({URLSearchParams,location:{search:''},document,isMerchantMeadow:meadow,autoPotionLearned,rememberAutoPotionLesson,FirstlightTutorials:{isSkipped:()=>preference.skipped,skip(){preference.skipped=true;events.dispatchEvent(new Event('firstlight:tutorials-skipped'));}},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),MutationObserver:class{observe(){}disconnect(){}}});let code=readFileSync(new URL('../js/tutorial.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace('export function','function');vm.runInContext(code,ctx);const api={store,close(){panel.open=false;},bag(){panel.open=true;},shop(){}};return{tour:ctx.createCaveTutorial(api),sheet:els.get('caveTutorial'),change:()=>events.dispatchEvent(new Event('change')),click(mode){const b={dataset:{tutorial:mode},disabled:mode==='next'&&els.get('caveTutorial').next.disabled};els.get('caveTutorial').onclick({target:{closest:()=>b}});}};}
for(const meadow of [false,true])test(`${meadow?'meadow':'cave'} checkbox success persists immediately, accepts a custom threshold and never repeats after disable/reload`,()=>{const {store,storage}=setup();store.transact('existing',s=>{s.starterClaimed=true;});const t=tutorial(store,meadow);t.tour.begin('combat');assert.equal(t.sheet.dataset.phase,'heal');t.click('next');assert.equal(t.sheet.next.disabled,true);setAutoItem(store,'potion',{enabled:true,threshold:.2});assert.equal(store.state.tutorial.autoPotionLearned,true);t.change();assert.equal(t.sheet.next.disabled,false);assert(t.sheet.innerHTML.includes('完成教學'));t.click('skip');setAutoItem(store,'potion',{enabled:false,threshold:.2});t.tour.dispose();const reload=createStore(storage),again=tutorial(reload,meadow);again.tour.begin('combat');assert.equal(again.tour.active,false);assert.equal(reload.state.autoItems.potion.threshold,.2);});
test('unchecked or skipped lesson remains eligible, with no false completion',()=>{const {store}=setup();store.transact('existing',s=>{s.starterClaimed=true;});const t=tutorial(store);t.tour.begin('combat');t.click('next');t.click('next');assert.equal(t.tour.active,true);t.click('skip');assert.equal(autoPotionLearned(store.state),false);t.tour.begin('combat');assert.equal(t.tour.active,true);});
test('previous completed lessons and already enabled potions migrate once without changing player settings',()=>{for(const prior of ['completed','enabled']){const {store,storage}=setup();store.transact('old',s=>{if(prior==='completed')s.tutorial={autoHealLessonVersion:2};else s.autoItems={potion:{enabled:true,threshold:.6}};});rememberAutoPotionLesson(store);const writes=store.state.transactions.length;rememberAutoPotionLesson(store);assert.equal(store.state.transactions.length,writes);assert.equal(createStore(storage).state.tutorial.autoPotionLearned,true);}});

test('permanent skip immediately releases the active lesson and blocks lobby, combat and manual replay in both dungeons',()=>{
 const preference={skipped:false};
 const first=tutorial(setup().store,false,preference);
 first.tour.begin('combat');
 assert(first.tour.active);
 first.click('permanent');
 assert.equal(first.tour.active,false);
 first.tour.dispose();
 for(const meadow of [true,false]){
  const reopened=tutorial(setup().store,meadow,preference);
  for(const phase of ['lobby','combat','heal'])for(const replay of [false,true]){
   reopened.tour.begin(phase,replay);
   assert.equal(reopened.tour.active,false);
  }
  reopened.tour.dispose();
 }
});
