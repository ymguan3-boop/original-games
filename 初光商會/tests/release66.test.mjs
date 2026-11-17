import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Game} from '../js/core.js';
import {commissionProgress,commissionAction} from '../js/commissions.js?v=20261117-v67';
import {cashierSkillBonus,cashierIncomeBonus,ON_DUTY_XP_BONUS} from '../js/management.js?v=20261117-v67';
import {spinLevelBonus,SPIN_VISITOR_REWARD,SPIN_TOPS} from '../js/spin-arena-config.js?v=20261117-v67';
import {spinState,fastForwardSpinRound} from '../js/spin-arena-core.js?v=20261117-v67';
import {SPIN_ARCHETYPES,spinSkillCooldown,steer} from '../js/spin-arena-paths.js?v=20261117-v67';
import {importMerchantCargo,merchantWeaponCatalog} from '../../幻靈奇旅/survivors/js/merchant-meadow.js?v=20261117-v67';
const read=n=>JSON.parse(fs.readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8')),data=Object.fromEntries(Object.entries({catalog:'shop-catalog',hirePool:'hire-pool',spirits:'spirits',evolution:'evolution',levels:'store-levels',config:'economy',management:'management'}).map(([k,v])=>[k,read(v)]));data.catalog=[...data.catalog.filter(c=>c.category!=='weapon'),...merchantWeaponCatalog()];
function setup(level=5){const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)},g=new Game({storage,data});g.transaction(null,s=>{s.level=level;s.gold=50000;});return {g,storage};}
const limited=sku=>/-merchant-(elite|boss)$/.test(sku);

test('限定武器委託：任一把限定武器都算數，貨架上的也算，交付時先扣倉庫再扣貨架',()=>{
 const {g}=setup(),skus=g.data.catalog.filter(c=>limited(c.sku)).map(c=>c.sku);assert(skus.length>=2);
 const q={id:'commission-x',createdDay:g.state.day,kind:'delivery',level:5,client:'測試',sku:skus[0],name:'限定武器商品',qty:5,reward:999,startSales:0,createdAt:0,expiresAt:9999,status:'active'};
 g.transaction(null,s=>{s.commissionBoard={clock:0,nextAt:9999,serial:1,unread:false,entries:[q]};s.inventory[skus[1]]=3;s.shelves.push({id:'test-shelf',type:'limited-armory',sku:skus[1],stock:2,x:1,z:6,rotation:0});});
 assert.equal(commissionProgress(g.state,g.state.commissionBoard.entries[0]),5);
 const gold=g.state.gold,reward=g.state.commissionBoard.entries[0].reward;const r=g.act('claimCommission',{id:'commission-x'});assert(r.ok,r.message);
 assert.equal(g.state.gold,gold+g.state.commissionBoard.entries[0].reward);assert.equal(g.state.commissionBoard.entries[0].status,'claimed');assert.equal(g.state.inventory[skus[1]],0);assert.equal(g.state.shelves.find(s=>s.id==='test-shelf').stock,0);
 assert.deepEqual(g.state.ledger.at(-1).items,[{sku:skus[1],qty:5}]);
});
test('一般委託仍只算指定商品；不足時不扣任何東西',()=>{
 const {g}=setup();g.transaction(null,s=>{s.inventory.potion=2;s.commissionBoard={clock:0,nextAt:9999,serial:1,unread:false,entries:[{id:'c1',createdDay:s.day,kind:'delivery',level:5,client:'測試',sku:'potion',name:'藥水',qty:3,reward:100,startSales:0,createdAt:0,expiresAt:9999,status:'active'}]};});
 assert(!g.act('claimCommission',{id:'c1'}).ok);assert.equal(g.state.inventory.potion,2);
});
test('採集袋：魔王限定武器倉庫滿也會入庫，一般武器仍受容量限制',()=>{
 const state={inventory:{potion:100},shelves:[]},boss=data.catalog.find(c=>c.merchantGrade==='boss'),normal=data.catalog.find(c=>c.lootOnly&&c.merchantGrade==='normal');
 const r=importMerchantCargo(state,{[boss.sku]:12,[normal.sku]:3},data.catalog,100);
 assert.equal(state.inventory[boss.sku],12);assert.equal(state.inventory[normal.sku]||0,0);assert.equal(r.pending,3);
});
test('Lv.4／Lv.5 招聘的收銀員：擔任收銀員時結帳收益 +30%／+50%',()=>{
 const g={data};for(const h of data.hirePool){const t=data.management.traits[h.id];const want=t?.preferredJob==='cashier'?(h.level>=5?.5:h.level>=4?.3:0):0;assert.equal(cashierSkillBonus(g,h.id),want,h.name);}
 assert.equal(cashierSkillBonus(g,'pikachu'),.3);assert.equal(cashierSkillBonus(g,'infernape'),.5);assert.equal(cashierSkillBonus(g,'cyndaquil'),0);
 assert.equal(cashierIncomeBonus(g,{baseId:'infernape',role:'cashier',fatigue:0}),.5);assert.equal(cashierIncomeBonus(g,{baseId:'infernape',role:'stocker',fatigue:0}),0);assert.equal(cashierIncomeBonus(g,{baseId:'infernape',role:'cashier',fatigue:100}),0);
});
test('上工員工的工作經驗 +50%，待命與經驗券不加成',()=>{
 const {g}=setup();assert(g.act('hire',{id:'cyndaquil'}).ok);const id=g.state.employees.at(-1).id;
 const gain=role=>{let before;g.transaction(null,s=>{const e=s.employees.find(e=>e.id===id);e.role=role;e.xpToday=0;e.workLevel=1;e.xp=0;before=e.xp;g.xp(s,e,4);});return g.state.employees.find(e=>e.id===id).xp-before;};
 const on=gain('cashier'),off=gain('standby');assert(Math.abs(on/off-(1+ON_DUTY_XP_BONUS))<1e-9);
});
test('陀螺：Lv.4／Lv.5 一般對手勝利加碼 350／600 G；外來高手固定 1500 G、聲望 +50',()=>{
 assert.equal(spinLevelBonus(3),0);assert.equal(spinLevelBonus(4),350);assert.equal(spinLevelBonus(5),600);assert.deepEqual({...SPIN_VISITOR_REWARD},{coins:1500,rep:50});
 for(const level of [4,5]){const {g}=setup(level);g.act('spinBuy',{topId:'flame'});g.act('spinRoster');const o=g.state.spinArena.roster.entries[0];g.act('spinStart',{opponentId:o.id});
  const gold=g.state.gold;g.transaction(null,s=>{const m=spinState(s).match;m.phase='result';m.won=true;m.score=[2,0];});g.act('spinSettle');assert.equal(g.state.gold,gold+o.reward+spinLevelBonus(level));}
});
test('陀螺：快轉直接算完本局，不重複結算；比賽沒有 45 秒限制',()=>{
 const {g}=setup(3);g.act('spinBuy',{topId:'flame'});g.act('spinRoster');g.act('spinStart',{opponentId:g.state.spinArena.roster.entries[0].id});g.act('spinLaunch',{strategy:'balance',round:1,expectedPhase:'strategy'});
 assert(g.act('spinFastForward').ok);const m=g.state.spinArena.match;assert(['roundResult','result'].includes(m.phase));assert(m.roundResult.cause);assert(!g.act('spinFastForward').ok);
});
test('12 顆陀螺各有動作原型與技能路徑，路徑方向有限且可重現',()=>{
 assert.equal(new Set(Object.values(SPIN_ARCHETYPES)).size,12);for(const t of SPIN_TOPS)assert(SPIN_ARCHETYPES[t.id],t.id);
 const b={x:-.5,z:.2,vx:0,vz:0,phase:1},o={x:.6,z:-.1};for(const type of Object.values(SPIN_ARCHETYPES))for(const skill of [false,true]){const p=steer(type,b,o,3.2,0,skill);assert(Number.isFinite(p.dir[0])&&Number.isFinite(p.dir[1])&&p.speed>0);assert.deepEqual(steer(type,b,o,3.2,0,skill),p);}
 assert(spinSkillCooldown(40)<spinSkillCooldown(20));
});
test('暴擊：機率 5%～25%（攻高於防與技能撞擊提高），傷害 ×1.5 上限 36；暴擊後耐久 ≤15 即爆裂敗北',async()=>{
 const {SPIN_CRIT,spinCritChance,launchSpinRound,advanceSpinMatch}=await import('../js/spin-arena-core.js?v=20261117-v67');
 assert.equal(spinCritChance(20,40,false),.05);assert(Math.abs(spinCritChance(40,20,false)-.15)<1e-12);assert.equal(spinCritChance(40,20,true),.25);assert.equal(spinCritChance(200,0,true),.25);
 assert.equal(SPIN_CRIT.mult,1.5);assert.equal(SPIN_CRIT.cap,36);assert.equal(SPIN_CRIT.normalScale,.9);
 let crits=0,bursts=0;for(let k=0;k<60;k++){const {g}=setup(3);g.act('spinBuy',{topId:'flame'});g.act('spinRoster');g.act('spinStart',{opponentId:g.state.spinArena.roster.entries[k%3].id});const m=g.state.spinArena.match;m.seed=1000+k;launchSpinRound(m,'attack');let n=0;while(m.phase==='battle'&&n++<4000)advanceSpinMatch(m,.25);
  for(const e of m.effects)if(e.kind==='hit'&&e.crit)crits++;
  if(m.roundResult.cause==='burst'){bursts++;assert.equal(m.roundResult.reason,'暴擊爆裂');assert.equal(m.bodies[m.roundResult.loser].hp,0);}}
 assert(crits>0,'應該出現暴擊');assert(bursts>0,'應該出現爆裂敗北');
});
test('場地兩倍大、陀螺縮小；倒下的陀螺依傾角抬高，不會嵌進場地',async()=>{
 const {SPIN_RULES}=await import('../js/spin-arena-config.js?v=20261117-v67');assert.equal(SPIN_RULES.radius,4.5);assert(SPIN_RULES.bodyRadius<.64);
 globalThis.document??={createElement:()=>({getContext:()=>null})};const {spinFloorY}=await import('../js/spin-arena-view.js?v=20261117-v67');
 assert(Math.abs(spinFloorY(0,0)-.34)<1e-9);assert(spinFloorY(4,0)>spinFloorY(2,0));
});
