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
test('wake events recognize dozing while free choices impose tangible fatigue cost',()=>{
 const {sleepEvent,applyFreeEventFatigue,freeResolutionText}=helpers(),s=fakeState();
 assert.equal(sleepEvent(s.event),true);
 assert.equal(sleepEvent({title:'紙箱山滑倒'}),false);
 const charges=applyFreeEventFatigue(s,s.employees[0]);
 assert.deepEqual(Array.from(charges,x=>x.delta),[8,2]);
 assert.equal(s.employees[0].fatigue,18);assert.equal(s.employees[1].fatigue,22);
 assert.match(freeResolutionText({cost:0}),/疲勞 \+8/);
 assert.equal(freeResolutionText({cost:40}),'');
});
test('proximity method completes the active event once and persists resolved record',()=>{
 const {eventEmployee,managerNearEmployee,sleepEvent,applyFreeEventFatigue}=helpers(),
  code=read('js/core.js'),start=code.indexOf('resolveNearbyEvent(s){'),end=code.indexOf('setManagerActive(active)',start);
 assert.ok(start>0&&end>start);
 const method=code.slice(start,end).trim();
 const make=new Function('eventEmployee','managerNearEmployee','sleepEvent','applyFreeEventFatigue','react','requiresManagerPatrol',`return ({${method}}).resolveNearbyEvent;`);
 const reactions=[],resolved=make(eventEmployee,managerNearEmployee,sleepEvent,applyFreeEventFatigue,(s,e,kind,seconds)=>{reactions.push(kind);e.feedbackKind=kind;e.reactionUntil=s.totalTime+seconds;},()=>false);
 const s=fakeState(),notices=[],logs=[],g={managerActive:true,
  applyEventEffect:(s,ev)=>{s.effectApplied=(s.effectApplied||0)+1},
  efficiency:e=>1-e.fatigue/200,
  notice:(s,id,text)=>notices.push({id,text}),
  log:(s,text)=>logs.push(text)
 };
 assert.equal(resolved.call(g,s),true);
 assert.equal(s.event,null);
 assert.equal(s.recentPatrolResolution.id,'event-77');
 assert.equal(s.incidentHistory.length,1);
 assert.equal(s.incidentHistory[0].method,'nearby');
 assert.deepEqual(reactions,['wake']);
 assert.equal(s.employees[0].fatigue,16);
 assert.equal(s.employees[1].fatigue,21);
 assert.equal(s.effectApplied,1);
 assert.equal(resolved.call(g,s),false);
 assert.equal(s.incidentHistory.length,1);
 assert.ok(notices.some(n=>n.text.includes('驚醒')));
 assert.equal(logs.length,1);
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
test('manager proximity event result appears after wake and does not replay old saves',()=>{
 const html=read('index.html'),app=read('js/app.js'),scene=read('js/scene.js');
 assert.match(html,/id="patrol-solved"/);
 assert.match(app,/seenPatrolResolution=game\.state\.recentPatrolResolution\?\.id\|\|null/);
 assert.match(app,/patrolResolutionDelay=setTimeout/);
 assert.match(app,/問題已解決/);
 assert.match(scene,/feedback==='wake'/);
 assert.match(read('js/actor-visuals.js'),/wake:\['‼'/);
});
test('free event choices disclose extra fatigue and existing rewards still work',()=>{
 const source=read('js/core.js'),detail=read('js/incident-detail.js');
 assert.match(source,/if\(ch\.cost===0\)\{for\(const change of applyFreeEventFatigue\(s,e\)/);
 assert.match(source,/this\.applyEventEffect\(s,ev\)/);
 assert.match(detail,/freeResolutionText\(c\)/);
 assert.match(detail,/疲勞 \+8/);
});
