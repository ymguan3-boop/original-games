const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function complaints(){
 const ctx={shelfCapacity:()=>10,ENTRANCE:{x:6,z:10}};
 vm.runInNewContext(read('js/customer-complaints.js').replace(/^import [^\n]*\n/gm,'').replace(/\bexport\s+(?=function)/g,'')+';this.exports={getCustomerComplaint,complaintKind,resolveCustomerComplaint};',ctx);
 return ctx.exports;
}
function fixture(status='OutOfStock',inventory=0){
 const c={id:'customer1',name:'測試顧客',state:status,patience:30,wait:0,timer:3,x:5,z:5,visited:[],basket:[],path:[],personality:1},s={level:1,customers:[c],shelves:[{id:'rack1',sku:'potion',stock:0}],inventory:{potion:inventory},gold:100,satisfaction:75,stats:{expenses:0,purchases:0,lost:0},memories:{},buffs:{},employees:[{id:'cash',role:'cashier',fatigue:0}],totalTime:10,day:1},notice=[];
 const g={data:{catalog:[{sku:'potion',buyCost:18,unlockStoreLevel:1}]},available:(s,sh)=>sh.stock,pay:(s,n)=>{if(s.gold<n)throw Error('金幣不足');s.gold-=n},notice:(s,id,message)=>notice.push(message),route:(s,c,target)=>{c.path=[target];return true;},log:()=>{}};
 return {c,s,g,notice};
}
test('stockout offers three horizontal options with a genuine purchase and shelf refill',()=>{
 const {getCustomerComplaint,resolveCustomerComplaint}=complaints(),{c,s,g,notice}=fixture();
 const info=getCustomerComplaint(s,c,g);assert.equal(info.kind,'stockout');assert.equal(info.options.length,3);
 assert.equal(info.options[0].cost,18);
 resolveCustomerComplaint(g,s,{customerId:c.id,choice:'restock'});
 assert.equal(s.gold,82);assert.equal(s.shelves[0].stock,1);assert.equal(s.stats.purchases,18);assert.equal(s.satisfaction,76);
 assert.equal(c.state,'Browse');assert.deepEqual(notice,['滿意 +1']);
 assert.equal(getCustomerComplaint(s,c,g),null);
});
test('restocking from existing inventory does not charge extra',()=>{
 const {resolveCustomerComplaint}=complaints(),{c,s,g}=fixture('OutOfStock',2);
 resolveCustomerComplaint(g,s,{customerId:c.id,choice:'restock'});
 assert.equal(s.gold,100);assert.equal(s.inventory.potion,1);assert.equal(s.shelves[0].stock,1);
});
test('queue waits can be eased without payment and angry losses can be recovered',()=>{
 const {getCustomerComplaint,resolveCustomerComplaint}=complaints(),{c,s,g}=fixture('Queue');
 c.wait=18;assert.equal(getCustomerComplaint(s,c,g).kind,'queue');
 resolveCustomerComplaint(g,s,{customerId:c.id,choice:'reassure'});
 assert.equal(c.wait,0);assert.equal(s.satisfaction,76);assert.equal(s.gold,100);
 c.state='Angry';c.helpedChoices=[];s.stats.lost=1;
 resolveCustomerComplaint(g,s,{customerId:c.id,choice:'retry'});
 assert.equal(c.state,'Browse');assert.equal(s.stats.lost,0);assert.equal(s.satisfaction,77);
});
test('rejects unavailable choices rather than granting free supplies',()=>{
 const {getCustomerComplaint,resolveCustomerComplaint}=complaints(),{c,s,g}=fixture();
 s.gold=0;assert.equal(getCustomerComplaint(s,c,g).options[0].disabled,true);
 assert.throws(()=>resolveCustomerComplaint(g,s,{customerId:c.id,choice:'restock'}));
 assert.equal(s.shelves[0].stock,0);
});
test('customer and employee incident windows show animation, explanation and 2/3-column choices without a scroll bar',()=>{
 const html=read('index.html'),app=read('js/app.js'),scene=read('js/scene.js'),style=read('event-layout-v12.css'),panel=read('js/customer-complaint-panel.js'),detail=read('js/incident-detail.js');
 assert.match(html,/event-layout-v12\.css/);assert.doesNotMatch(html,/class="camera-controls"/);
 assert.match(app,/showCustomerComplaint/);assert.match(app,/onComplaintClick:showCustomerComplaint/);
 assert.match(scene,/complaintId:d\.id,complaintTitle:issue\.title/);
 assert.match(panel,/incident-choices cols-/);assert.match(detail,/incident-choices cols-/);
 assert.match(panel,/incident-gif/);assert.match(detail,/incident-gif/);
 assert.match(style,/\.incident-choices\.cols-3\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(style,/overflow:hidden!important/);
 assert.match(app,/currentPanel!=='complaint'&&currentPanel!=='incident'/);
});
test('patrol stays beside settings and employee controls open as a movable detached window',()=>{
 const html=read('index.html'),staff=read('js/staff-overlay.js'),nav=read('js/shop-navigation.js');
 assert.match(html,/data-panel="settings">設定<\/button><button id="camera-mode"/);
 assert.match(staff,/function show\(id\)\{selected=id;detached=true/);
 assert.match(staff,/card\.classList\.add\('staff-card-detached'\)/);
 assert.match(nav,/target\.after\(patrol\)/);
});
