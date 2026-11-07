const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function helpers(){
 const ctx={};
 vm.runInNewContext(read('js/patrol-events.js').replace(/\bexport\s+(?=function)/g,'')+';this.api={eventEmployee,managerNearEmployee,sleepEvent,applyFreeEventFatigue,freeResolutionText};',ctx);
 return ctx.api;
}
function fakeState(){
 const a={id:'worker-a',name:'綻芝麻',role:'cashier',x:10,z:1,fatigue:10,mood:55,efficiency:1},
       b={id:'worker-b',name:'青螺靈',role:'stocker',x:4,z:4,fatigue:20,mood:60,efficiency:1};
 return {employees:[a,b],manager:{x:11,z:1},event:{id:'event-16',instanceId:'event-77',employeeId:a.id,title:'收銀員閒得打瞌睡',role:'cashier',cooldown:70,effect:'checkout',effectValue:25},day:2,totalTime:30,incidents:[],cooldowns:{},incidentHistory:[],serial:5};
}
test('single event selects only its assigned employee, even with multiple same-role staff',()=>{
 const {eventEmployee,managerNearEmployee}=helpers(),s=fakeState();
 s.employees.push({id:'worker-c',name:'另一位收銀員',role:'cashier',x:9,z:3,fatigue:0});
 assert.equal(eventEmployee(s,s.event).id,'worker-a');
 assert.equal(managerNearEmployee(s,s.event),true);
 assert.equal(managerNearEmployee(s,{id:'stockout',role:'stocker'}),false);
 assert.equal(managerNearEmployee(s,{id:'queue-complaint',role:'cashier'}),false);
 assert.equal(managerNearEmployee(s,{id:'no-cashier',role:'cashier'}),false);
 s.manager.x=2;s.manager.z=1;
 assert.equal(managerNearEmployee(s,s.event),false);
});
test('duplicate event banners removed while staff level/fatigue badge stays tappable and compact',()=>{
 const staff=read('js/staff-overlay.js'),scene=read('js/scene.js'),css=read('commerce-staff-v13.css');
 assert.doesNotMatch(staff,/staff-event-icon/);
 assert.match(staff,/staff-compact-fatigue/);
 assert.match(staff,/Lv\.\$\{e\.workLevel\}/);
 assert.match(scene,/eventEmployee\(s,s\.event\)\?\.id===d\.id/);
 assert.match(css,/#staff-labels \.staff-head-label/);
 assert.match(css,/width:79px!important/);
});
