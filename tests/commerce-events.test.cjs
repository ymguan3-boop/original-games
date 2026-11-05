const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../初光商會');
const text=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
function simulation(){
 const source=text('js/shop-operations.js').replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+(?=function)/g,'');
 const env={console,structuredClone,decorEffects:()=>({patience:0,premium:0}),obstacles:()=>[],findPath:(from,to)=>[{x:to.x,z:to.z}],walkable:()=>true,shelfDefinition:()=>({premium:1}),ENTRANCE:{x:6,z:10},CHECKOUT:{x:10,z:3}};
 vm.runInNewContext(source+'\n globalThis.__sim={stepCustomers,react};',env);
 return env.__sim;
}
function fixture(customer){
 const s={time:0,totalTime:10,day:1,customers:[customer],employees:[{id:'emp1',role:'cashier',fatigue:0,x:10,z:1}],shelves:[{id:'s1',sku:'potion',stock:2}],inventory:{potion:2},prices:{potion:20},averageCosts:{potion:10},satisfaction:75,stats:{sales:0,served:0,lost:0,revenue:0,cogs:0},totals:{sales:0,revenue:0},ledger:[],memories:{},log:[],cooldowns:{},buffs:{},serial:1,event:null};
 const notices=[];
 const g={data:{config:{checkoutSeconds:1},catalog:[{sku:'potion',category:'item',buyCost:10,suggestedRetail:20}]},available:(_,sh)=>sh.stock,role:(x,r)=>x.employees.find(e=>e.role===r)||null,efficiency:()=>1,notice:(_,id,message,tone)=>notices.push({id,message,tone}),xp:()=>{},safeMove:()=>{},route:(_,c,d)=>{c.path=[{x:d.x,z:d.z}];return true;},log:(_,message)=>s.log.push(message)};
 return {s,g,notices};
}
test('customers with no stock display question before becoming angry',()=>{
 const {stepCustomers}=simulation(),c={id:'c1',state:'Enter',x:6,z:9,visited:[],basket:[],path:[],personality:0,timer:0,budget:200,patience:30}, {s,g,notices}=fixture(c);
 s.shelves[0].stock=0;
 stepCustomers(g,s,.25);assert.equal(c.state,'OutOfStock');assert.equal(c.emotion,'question');
 stepCustomers(g,s,1);assert.equal(c.state,'OutOfStock');assert.equal(s.stats.lost,0);
 stepCustomers(g,s,1.5);assert.equal(c.state,'Angry');assert.equal(s.satisfaction,74);
 assert.equal(notices[0].message,'滿意 -1');assert.equal(s.event.id,'stockout');
});
test('paid customer generates satisfaction and exits safely even when path is blocked',()=>{
 const {stepCustomers}=simulation(),c={id:'c2',state:'Checkout',x:10,z:3,visited:[],basket:[{sku:'potion',shelfId:'s1',qty:1,price:20,cost:10}],path:[],personality:0,timer:0,wait:0,budget:200,patience:40};
 const {s,g,notices}=fixture(c);
 stepCustomers(g,s,1.2);
 assert.equal(c.state,'Paid');assert.equal(s.stats.sales,1);assert.equal(s.shelves[0].stock,1);assert.equal(s.satisfaction,76);assert.equal(notices[0].message,'滿意 +1');
 stepCustomers(g,s,1);assert.equal(c.state,'Leave');assert.ok(c.path.length);
 stepCustomers(g,s,20.1);assert.equal(s.customers.length,0);
});
test('a departing customer is immediately removed after reaching the actual entrance',()=>{
 const {stepCustomers}=simulation(),c={id:'c3',state:'Leave',x:6.2,z:10.1,visited:[],basket:[],path:[{x:6,z:10}],timer:0,patience:40};
 const {s,g}=fixture(c);stepCustomers(g,s,.3);assert.equal(s.customers.length,0);
});
test('event GIF resources are present, small, animated and use GIF89a',()=>{
 for(const role of ['cashier','stocker','sales','smith','warehouse','security','cleaner','host','question','angry']){
  const data=fs.readFileSync(path.join(ROOT,'assets/event-gifs',role+'.gif'));
  assert.equal(data.subarray(0,6).toString('ascii'),'GIF89a');
  assert.ok(data.length<16000);assert.ok(data.length>500);
  assert.ok(data.indexOf(Buffer.from('NETSCAPE2.0'))>0);
 }
});
test('one-time incident coach, mobile return placement and achievement notice are connected',()=>{
 assert.match(text('js/app.js'),/installEventCoach/);
 assert.match(text('js/shop-navigation.js'),/mobileBar\.append\(button\)/);
 assert.match(text('navigation.css'),/grid-area:return/);
 assert.match(text('js/core.js'),/case 'ackTutorial'/);
 assert.match(text('js/scene.js'),/floatingNotice/);
});
