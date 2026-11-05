const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
function load(filename,exports,env={}){
 const context={...env},script=read(filename).replace(/^import [^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const))/g,'');
 vm.runInNewContext(script+';this.exports={'+exports.join(',')+'};',context);
 return context.exports;
}
const active={id:'commission-7',client:'小鎮公會',kind:'delivery',sku:'potion',name:'普通靈核球',qty:7,reward:293,level:2,startSales:0,createdAt:90,expiresAt:170,status:'active',createdDay:7};
const claimed={id:'commission-6',client:'晨星旅團',kind:'sales',qty:4,reward:100,level:2,startSales:4,createdAt:60,expiresAt:160,status:'claimed',createdDay:7};
const expired={id:'commission-5',client:'昨日行商',kind:'delivery',sku:'potion',name:'靈核球',qty:3,reward:100,level:2,startSales:0,createdAt:15,expiresAt:90,status:'expired',createdDay:7};
const staleActive={id:'commission-4',client:'漏計逾時',kind:'delivery',sku:'potion',name:'靈核球',qty:3,reward:100,level:2,startSales:0,createdAt:25,expiresAt:99,status:'active',createdDay:7};
function state(){return {day:7,level:2,phase:'open',inventory:{potion:0},totals:{sales:8,revenue:5000,days:6},employees:[],shelves:[],gold:5300,stats:{revenue:0,cogs:0,expenses:0,rewards:0},satisfaction:93,commissionBoard:{clock:100,nextAt:155,serial:7,unread:true,entries:[active,claimed,expired,staleActive].map(x=>({...x}))},quests:{},patrols:1,chapterRewards:{},log:[],ledger:[],history:[]};}
const comm=()=>load('js/commissions.js',['commissionState','commissionVisibleEntries','activeCommissions','commissionNotice','resetCommissionsForNewDay','commissionsTick','commissionAction','validateCommissions']);
test('active count exactly matches current unexpired message, hides expired and stale tasks',()=>{
 const s=state(),c=comm(),seen=c.commissionVisibleEntries(s);
 assert.equal(c.activeCommissions(s).length,1);
 assert.equal(seen.length,2);
 assert.equal(seen[0].id,'commission-7');
 assert.equal(seen[1].id,'commission-6');
 assert.equal(c.commissionNotice(s),true);
 const quest=load('js/quest-view.js',['questPanel'],{commissionVisibleEntries:c.commissionVisibleEntries,activeCommissions:c.activeCommissions,commissionProgress:(s,q)=>q.kind==='delivery'?(s.inventory[q.sku]||0):0,chapterMissionPanel:()=>''}).questPanel;
 const html=quest({state:s,data:{},questList:()=>[]},x=>x,v=>v+' G',(label,type,p,cls,disabled)=>'<button '+(disabled?'disabled':'')+'>'+label+'</button>','messages');
 assert.match(html,/1 件限時委託/);
 assert.match(html,/普通靈核球/);assert.match(html,/data-commission-buy="potion"/);assert.doesNotMatch(html,/請開啟主管巡店/);
 assert.doesNotMatch(html,/昨日行商/);
 assert.doesNotMatch(html,/漏計逾時/);
});
test('expired commission never appears as active even before tick purges it',()=>{
 const s=state(),c=comm();s.commissionBoard.entries=[{...active,expiresAt:99,status:'active'}];
 assert.equal(c.activeCommissions(s).length,0);assert.equal(c.commissionNotice(s),false);
 assert.equal(c.commissionVisibleEntries(s).length,0);
});
test('nextDay clears all old message rows and unread markers but not ledger or unique IDs',()=>{
 const s=state(),c=comm();const oldSerial=s.commissionBoard.serial,oldClock=s.commissionBoard.clock;s.day=8;
 c.resetCommissionsForNewDay(s);
 assert.equal(s.commissionBoard.entries.length,0);assert.equal(s.commissionBoard.unread,false);
 assert.equal(s.commissionBoard.serial,oldSerial);assert.equal(s.commissionBoard.clock,oldClock);
 assert.equal(s.commissionBoard.nextAt,oldClock+12);
 assert.equal(c.activeCommissions(s).length,0);
 assert.equal(s.gold,5300);
});
test('a new commission belongs to its business day and expires correctly',()=>{
 const s=state(),c=comm();s.day=8;c.resetCommissionsForNewDay(s);const g={random:()=>.1,data:{catalog:[{sku:'potion',displayName:'普通靈核球',unlockStoreLevel:1,isSellable:true,isRestricted:false,buyCost:11}]},log:()=>{}};
 c.commissionsTick(g,s,13);
 assert.equal(s.commissionBoard.entries.length,1);
 const order=s.commissionBoard.entries[0];assert.equal(order.createdDay,8);assert.equal(order.status,'active');assert.equal(c.activeCommissions(s).length,1);
 s.day=9;assert.equal(c.activeCommissions(s).length,0);
 assert.throws(()=>c.commissionAction(g,s,'claimCommission',{id:order.id}));
});
test('old saves without createdDay still load and clear safely on the next day',()=>{
 const s=state(),c=comm();
 const legacy={...active};delete legacy.createdDay;
 s.commissionBoard.entries=[legacy];c.validateCommissions(s,[{sku:'potion'}]);
 assert.equal(c.commissionVisibleEntries(s).length,1);
 s.day=8;c.resetCommissionsForNewDay(s);assert.equal(c.commissionVisibleEntries(s).length,0);
});
test('only physical intervention events require supervisor patrol; customer complaints and staff advice do not',()=>{
 const policy=load('js/event-routing.js',['requiresManagerPatrol','patrolEventInstructions']);
 assert.equal(policy.requiresManagerPatrol({id:'cashier-idle'}),true);
 assert.equal(policy.requiresManagerPatrol({id:'stockout'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'queue-complaint'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'cashier-rush'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'no-cashier'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'comic-1'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'custom',requiresPatrol:true}),true);
 assert.match(policy.patrolEventInstructions({id:'cashier-idle'},{patrol:true}),/已經在主管巡店/);
});
test('patrol-only customer-facing guide has just one clickable choice, other incidents retain independent options',()=>{
 const policy=load('js/event-routing.js',['requiresManagerPatrol','patrolEventInstructions']);
 const guide=load('js/shop-event-guide.js',['describeShopIssue'],{requiresManagerPatrol:policy.requiresManagerPatrol,patrolEventInstructions:policy.patrolEventInstructions,customerNeedingHelp:()=>null,chaseDistance:()=>null,commissionOverview:()=>({count:0,unread:false,active:[]}),commissionInstruction:()=>null}).describeShopIssue;
 const s=state();s.customers=[];s.event={id:'cashier-idle',title:'收銀員閒得打瞌睡',role:'cashier'};
 let info=guide(s,{patrol:true});
 assert.equal(info.primary,'主管巡店');assert.equal(info.secondary,null);assert.equal(info.secondaryAction,null);
 s.event={id:'cashier-rush',title:'收銀尖峰手忙腳亂',role:'cashier'};
 info=guide(s,{patrol:false});assert.equal(info.primaryAction,'event');assert.equal(info.secondaryAction,'patrol');
 s.event={id:'stockout',title:'商品缺貨',role:'stocker'};
 info=guide(s,{patrol:false});assert.equal(info.primaryAction,'goods');assert.equal(info.secondaryAction,'event');
});
test('patrol-only event window has a single button and core rejects shortcut resolution',()=>{
 const policy=load('js/event-routing.js',['requiresManagerPatrol','patrolEventInstructions']);
 const incident=load('js/incident-detail.js',['incidentDetailPanel'],{
  incidentSketch:()=>'<i>🎬</i>',eventEmployee:()=>({name:'綻芝麻'}),freeResolutionText:()=>'',...policy
 }).incidentDetailPanel;
 const s=state();s.event={id:'cashier-idle',title:'收銀員閒得打瞌睡',role:'cashier',choices:[{id:'help',label:'花錢叫醒',cost:50},{id:'coach',label:'免費鼓勵',cost:0}]};
 const button=(text,action)=>'<button data-action="'+action+'">'+text+'</button>';
 const page=incident({state:s,managerActive:false},x=>x,button);
 assert.match(page,/id="patrol-required-go"/);
 assert.doesNotMatch(page,/data-action="resolveEvent"/);
 assert.equal((page.match(/id="patrol-required-go"/g)||[]).length,1);
 assert.match(read('js/core.js'),/assert\(!requiresManagerPatrol\(ev\)/);
});
test('message tab opens first, expired count and single choice are visible in phone UI',()=>{
 const app=read('js/app.js'),html=read('index.html'),core=read('js/core.js'),css=read('commission-patrol-v17.css');
 assert.match(app,/let questTab='messages'/);
 assert.match(app,/if\(b\.dataset\.panel==='quests'\)questTab='messages'/);
 assert.match(app,/secondary\.hidden=!info\.secondaryAction/);
 assert.match(app,/id==='patrol-required-go'/);assert.match(app,/if\(b\.dataset\.commissionBuy\)\{guidedCommissionId=b\.dataset\.commissionId/);
 assert.match(core,/resetCommissionsForNewDay\(s\)/);
 assert.match(html,/commission-patrol-v17\.css/);
 assert.match(css,/#shop-event-secondary\[hidden\]\{display:none!important\}/);
});
