const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(name,exports,extras={}){
 const code=read(name).replace(/^import [^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const))/g,'');
 const context={...extras};vm.runInNewContext(code+';this.exposed={'+exports.join(',')+'};',context);
 return context.exposed;
}
function state(){
 const q={id:'commission-1',kind:'delivery',client:'小鎮公會',sku:'potion',name:'普通靈核球',qty:7,
  reward:293,level:2,startSales:0,createdAt:20,createdDay:9,expiresAt:150,status:'active'};
 return {day:9,level:2,phase:'open',gold:3500,satisfaction:95,customers:[],inventory:{potion:3},
  totals:{sales:20,revenue:5000,days:8},commissionBoard:{clock:60,unread:true,entries:[q]},event:null};
}
const commiss=()=>load('js/commissions.js',['commissionVisibleEntries','activeCommissions','commissionProgress','commissionNotice','resetCommissionsForNewDay']);
test('new valid orders and expired orders produce exactly one consistent visible guide',()=>{
 const s=state(),c=commiss(),guide=load('js/commission-guidance.js',['commissionOverview','commissionInstruction'],c);
 assert.equal(guide.commissionOverview(s).count,1);
 assert.equal(guide.commissionOverview(s).ready.length,0);
 let hint=guide.commissionInstruction(s,s.commissionBoard.entries[0]);
 assert.equal(hint.action,'commission-buy');assert.match(hint.body,/3\/7/);
 s.inventory.potion=7;hint=guide.commissionInstruction(s,s.commissionBoard.entries[0]);
 assert.equal(hint.kind,'ready');assert.match(hint.body,/交付商品並收款/);
 s.commissionBoard.clock=151;assert.equal(guide.commissionOverview(s).count,0);
 assert.equal(guide.commissionInstruction(s,s.commissionBoard.entries[0]),null);
 assert.equal(c.commissionNotice(s),false);
});
test('when no live commission, no bottom advice, active badge or green status is rendered',()=>{
 const s=state(),c=commiss(),q=load('js/quest-view.js',['questPanel'],{...c,chapterMissionPanel:()=>''}).questPanel;
 const button=(name,action)=>'<button data-action="'+action+'">'+name+'</button>';
 s.commissionBoard.entries=[];
 const html=q({state:s,questList:()=>[],data:{}},x=>x,v=>String(v)+' G',button,'messages');
 assert.match(html,/0 件限時委託/);
 assert.doesNotMatch(html,/class="chat-footnote"/);
 assert.doesNotMatch(html,/class="commission-intro"/);
 assert.doesNotMatch(html,/class="chat-online"/);
 const app=read('js/app.js');assert.match(app,/const notice=commissionNotice\(s\)/);
 assert.match(app,/questButton\.classList\.toggle\('commission-notify',notice&&!s\.patrolFocus\)/);
});
test('an active delivery shows a targeted purchase button and auto-return destination',()=>{
 const s=state(),c=commiss(),q=load('js/quest-view.js',['questPanel'],{...c,chapterMissionPanel:()=>''}).questPanel;
 const button=(name,action,p,cls)=>'<button class="'+cls+'" data-action="'+action+'">'+name+'</button>';
 const html=q({state:s,questList:()=>[],data:{}},x=>x,v=>String(v)+' G',button,'messages','commission-1');
 assert.match(html,/data-commission-buy="potion"/);
 assert.match(html,/data-commission-id="commission-1"/);
 assert.match(html,/class="commission-message .*commission-focus"/);
 assert.match(html,/class="chat-footnote"/);
 s.inventory.potion=7;
 const ready=q({state:s,questList:()=>[],data:{}},x=>x,v=>String(v)+' G',button,'messages','commission-1');
 assert.match(ready,/交付商品並收款/);
 assert.doesNotMatch(ready,/data-commission-buy="potion"/);
});
test('sales orders show concrete in-progress instructions and return to shop CTA',()=>{
 const s=state(),c=commiss();
 Object.assign(s.commissionBoard.entries[0],{kind:'sales',sku:null,qty:3,startSales:20});
 const mission=load('js/commission-guidance.js',['commissionInstruction'],c).commissionInstruction(s,s.commissionBoard.entries[0]);
 assert.equal(mission.action,'commission');assert.match(mission.body,/成交/);
 const q=load('js/quest-view.js',['questPanel'],{...c,chapterMissionPanel:()=>''}).questPanel;
 const html=q({state:s,questList:()=>[],data:{}},x=>x,v=>String(v)+' G',()=>'<button>claim</button>','messages');
 assert.match(html,/data-commission-continue="commission-1"/);
 s.totals.sales=23;assert.equal(load('js/commission-guidance.js',['commissionInstruction'],c).commissionInstruction(s,s.commissionBoard.entries[0]).kind,'ready');
});
test('a commission context guide does not appear after expiry, next-day reset, or during dedicated patrol',()=>{
 const s=state(),c=commiss();
 const commission=load('js/commission-guidance.js',['commissionOverview','commissionInstruction'],c);
 const g=load('js/shop-event-guide.js',['describeShopIssue'],{
  ...commission,customerNeedingHelp:()=>null,chaseDistance:()=>null,requiresManagerPatrol:()=>false,patrolEventInstructions:()=>null
 }).describeShopIssue;
 const active=g(s,{patrol:false});assert.equal(active.kind,'commission');assert.equal(active.primaryAction,'commission-buy');
 s.commissionBoard.clock=160;assert.equal(g(s,{patrol:false}),null);
 s.day=10;c.resetCommissionsForNewDay(s);assert.equal(g(s,{patrol:false}),null);
 const app=read('js/app.js');assert.match(app,/if\(s\.patrolFocus\|\|document\.body\.classList\.contains\('patrol-recovering'\)\)/);
});
test('events genuinely allow one, two or three actions without duplicated amounts or fatigue hints',()=>{
 const x=load('js/incident-detail.js',['incidentDetailPanel','eventChoiceHint'],{
  eventEmployee:()=>({name:'小熊'}),incidentSketch:()=>'<span>🎬</span>',
  requiresManagerPatrol:()=>false,patrolEventInstructions:()=>null
 });
 const one={id:'capture',title:'紙箱假小偷',role:'security',description:'抓住調皮小偷',
  choices:[{id:'catch',label:'捕捉假小偷 · 免費，疲勞 +8',cost:0,mood:2,satisfaction:1,xp:3}]};
 const render=event=>x.incidentDetailPanel({state:{event,gold:1000}},v=>v,(name,act)=>'<button data-action="'+act+'">'+name+'</button>');
 const s1=render(one);assert.match(s1,/incident-choices cols-1/);
 assert.equal((s1.match(/data-action="resolveEvent"/g)||[]).length,1);
 assert.doesNotMatch(s1,/當事人疲勞 \+8、其他員工 \+2/);
 assert.match(s1,/其他員工疲勞 \+2/);
 const two={...one,choices:[one.choices[0],{id:'paid',label:'協助 · 40 G，滿意度 +4',cost:40}]};
 const s2=render(two);assert.match(s2,/incident-choices cols-2/);
 assert.equal((s2.match(/data-action="resolveEvent"/g)||[]).length,2);
 assert.doesNotMatch(s2,/費用 40 G/);
 const three={...two,choices:[...two.choices,{id:'rest',label:'調整休息 · 15 G',cost:15}]};
 const s3=render(three);assert.match(s3,/incident-choices cols-3/);
 assert.equal((s3.match(/data-action="resolveEvent"/g)||[]).length,3);
 assert.equal(x.eventChoiceHint({label:'同意 · 40 G',cost:40},50),'');
 assert.equal(x.eventChoiceHint({label:'協助 · 40 G',cost:40},20),'金幣不足');
});
test('real random event catalog contains a single-choice capture-style shop incident',()=>{
 const core=read('js/core.js');assert.match(core,/ev\.id==='event-11'/);
 assert.match(core,/捕捉紙箱假小偷/);
 assert.match(core,/choices:\[\{id:'catch'/);
});
test('ready commission auto returns to claim window, and manual evolution remains player-driven',()=>{
 const app=read('js/app.js'),core=read('js/core.js'),html=read('index.html');
 assert.match(app,/function syncCommissionCompletion\(s\)/);
 assert.match(app,/openCommissionMessage\(target\.id\)/);
 assert.match(app,/commissionClaimWindow/);
 assert.match(read('js/quest-view.js'),/data-commission-continue/);
 assert.match(app,/if\(result\?\.ok&&type==='claimCommission'\)/);
 assert.match(core,/if\(type==='evolveEmployee'\)/);
 assert.doesNotMatch(core,/while\(\(rule=this\.data\.evolution/);
 assert.match(app,/data-evolve-employee/);
 assert.match(html,/commission-flow-event-v19\.css/);
});
