const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function complaints(){
 const ctx={shelfCapacity:()=>10,ENTRANCE:{x:6,z:10}};
 vm.runInNewContext(read('js/patrol-events.js').replace(/\bexport\s+(?=function)/g,'')+';this.applyFreeEventFatigue=applyFreeEventFatigue;',ctx);
 vm.runInNewContext(read('js/customer-complaints.js').replace(/^import [^\n]*\n/gm,'').replace(/\bexport\s+(?=function)/g,'')+';this.exports={getCustomerComplaint,complaintKind,resolveCustomerComplaint};',ctx);
 return ctx.exports;
}
function fixture(status='OutOfStock',inventory=0){
 const c={id:'customer1',name:'測試顧客',state:status,patience:30,wait:0,timer:3,x:5,z:5,visited:[],basket:[],path:[],personality:1},s={level:1,customers:[c],shelves:[{id:'rack1',sku:'potion',stock:0}],inventory:{potion:inventory},gold:100,satisfaction:75,stats:{expenses:0,purchases:0,lost:0},memories:{},buffs:{},employees:[{id:'cash',role:'cashier',fatigue:0}],totalTime:10,day:1},notice=[];
 const g={data:{catalog:[{sku:'potion',buyCost:18,unlockStoreLevel:1}]},available:(s,sh)=>sh.stock,pay:(s,n)=>{if(s.gold<n)throw Error('金幣不足');s.gold-=n},notice:(s,id,message)=>notice.push(message),route:(s,c,target)=>{c.path=[target];return true;},log:()=>{}};
 return {c,s,g,notice};
}
test('restocking from existing inventory does not charge extra',()=>{
 const {resolveCustomerComplaint}=complaints(),{c,s,g}=fixture('OutOfStock',2);
 resolveCustomerComplaint(g,s,{customerId:c.id,choice:'restock'});
 assert.equal(s.gold,100);assert.equal(s.inventory.potion,1);assert.equal(s.shelves[0].stock,1);
});
