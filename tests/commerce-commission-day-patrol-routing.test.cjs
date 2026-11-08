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
 /* 收銀改由主角負責，收銀員打瞌睡不再需要巡店 */
 assert.equal(policy.requiresManagerPatrol({id:'cashier-idle'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'stockout'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'queue-complaint'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'cashier-rush'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'no-cashier'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'comic-1'}),false);
 assert.equal(policy.requiresManagerPatrol({id:'custom',requiresPatrol:true}),true);
 assert.match(policy.patrolEventInstructions({id:'custom',requiresPatrol:true},{patrol:true}),/已經在主管巡店/);
});
