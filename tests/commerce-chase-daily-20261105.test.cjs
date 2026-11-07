const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(file,keys,vars={}){
 const code=read(file).replace(/^import [^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const))/g,'');
 const context={...vars};
 vm.runInNewContext(code+';this.result={'+keys.join(',')+'};',context);
 return context.result;
}
function state(){
 const customer={id:'c-1',name:'購物蛙',state:'OutOfStock',x:8,z:7,timer:2,patience:30,wait:0,path:[],visited:[],emotion:'question'};
 return {day:3,level:2,phase:'open',totalTime:20,time:55,paused:false,serial:5,
  manager:{x:4,z:7,path:[]},customers:[customer],
  employees:[{id:'e-1',name:'店員',role:'stocker',fatigue:20}],stats:{sales:2,revenue:300,cogs:100,wages:60,expenses:35,served:2,lost:0},
  totals:{sales:13,revenue:2700,days:2},satisfaction:80,inventory:{potion:10},shelves:[],gold:850,
  event:null,incidentHistory:[],cooldowns:{},dailyGoals:null};
}
test('chase requires in-store customer and manager patrol; when caught resolves complaint without free sale',()=>{
 const getCustomerComplaint=()=>({options:[{id:'alternate',disabled:false},{id:'apologize',disabled:false}]}),
  resolveCustomerComplaint=(g,s,p)=>{const c=s.customers.find(c=>c.id===p.customerId);c.state='Browse';c.path=[];s.satisfaction++;return '已推薦現貨'};
 const {startCustomerChase,tickCustomerChase,chaseableCustomer}=load('js/customer-chase.js',
 ['startCustomerChase','tickCustomerChase','chaseableCustomer'],
 {getCustomerComplaint,resolveCustomerComplaint,ENTRANCE:{x:6,z:10}});
 const s=state(),logs=[],g={managerActive:false,log:(s,m)=>logs.push(m),route:(s,c,p)=>{c.path=[p];return true}};
 assert.throws(()=>startCustomerChase(g,s,'c-1'),/主管巡店/);
 g.managerActive=true;startCustomerChase(g,s,'c-1');
 assert.equal(s.customerChase.customerId,'c-1');assert.equal(s.customers[0].chaseProtected,true);
 assert.equal(chaseableCustomer(s.customers[0]),true);
 s.manager.x=s.customers[0].x;s.manager.z=s.customers[0].z;
 assert.equal(tickCustomerChase(g,s,.3),true);
 assert.equal(s.customerChase,null);assert.equal(s.customerChaseResult.success,true);
 assert.equal(s.customers[0].state,'Browse');assert.equal(s.customers[0].chaseProtected,false);
 assert.equal(s.stats.sales,2);assert.equal(s.gold,850);assert.equal(s.satisfaction,81);
});
test('chase timeout exits safely, with no fabricated goods or revenue',()=>{
 const getCustomerComplaint=()=>null,resolveCustomerComplaint=()=>{throw Error('unexpected resolution')};
 const {startCustomerChase,tickCustomerChase}=load('js/customer-chase.js',
 ['startCustomerChase','tickCustomerChase'],{getCustomerComplaint,resolveCustomerComplaint,ENTRANCE:{x:6,z:10}});
 const s=state(),g={managerActive:true,log:()=>{},route:()=>true};
 startCustomerChase(g,s,'c-1');s.customerChase.remaining=.2;
 tickCustomerChase(g,s,1);
 assert.equal(s.customerChase,null);assert.equal(s.customerChaseResult.success,false);
 assert.equal(s.stats.revenue,300);assert.equal(s.satisfaction,80);assert.equal(s.customers[0].chaseProtected,false);
});
test('opening goals persist by day and closing receipt exactly reflects ledger values',()=>{
 const chapterObjectives=()=>({title:'冒險者的採購站'});
 const {generateDailyGoals,ensureDailyGoals,dailyProgress,dailyClosing}=load('js/daily-objectives.js',
 ['generateDailyGoals','ensureDailyGoals','dailyProgress','dailyClosing'],{chapterObjectives});
 const s=state(),levels=[];
 const goal=ensureDailyGoals(s,levels);assert.equal(goal.day,3);assert.equal(goal.level,2);
 assert.equal(ensureDailyGoals(s,levels),goal);
 const p=dailyProgress(s,levels);assert.equal(p.metrics.length,3);assert.equal(p.metrics[0].value,2);
 s.phase='report';s.report={...s.stats,day:s.day,netProfit:105,unpaid:0,satisfaction:80};
 const close=dailyClosing(s,levels);assert.equal(close.netProfit,105);
 assert.equal(close.figures.find(x=>x.label==='商品成本').value,-100);
 assert.equal(close.figures.find(x=>x.label==='員工薪資').value,-60);
 assert.equal(close.figures.find(x=>x.label==='其他費用').value,-35);
 s.day++;assert.notEqual(ensureDailyGoals(s,levels).day,goal.day);
});
