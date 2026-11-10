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
test('a departing customer walks through the door and along the outdoor path before removal',()=>{
 const {stepCustomers}=simulation(),c={id:'c3',state:'Leave',x:6.2,z:10.1,visited:[],basket:[],path:[{x:6,z:10}],timer:0,patience:40};
 const {s,g}=fixture(c);stepCustomers(g,s,.3);assert.equal(s.customers.length,1);assert.equal(c.exitingAtDoor,true);stepCustomers(g,s,5);assert.equal(s.customers.length,0);
});
