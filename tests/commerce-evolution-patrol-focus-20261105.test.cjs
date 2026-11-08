const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function helper(filename,entries){
 const ctx={};const s=read(filename).replace(/^import [^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const|class))/g,'');
 vm.runInNewContext(s+';this.result={'+entries.join(',')+'};',ctx);return ctx.result;
}
function setup(){
 const data={evolution:{'spirit-a':{level:4,next:['spirit-b']},'spirit-b':{level:8,next:['spirit-c']},'spirit-c':{level:12,next:[]}},
 spirits:[{id:'spirit-a',name:'原形',stage:1},{id:'spirit-b',name:'進化型',stage:2},{id:'spirit-c',name:'最終型',stage:3}]};
 const employee={id:'emp-spirit-a',baseId:'spirit-a',spiritId:'spirit-a',name:'原形',rarity:'yellow',role:'host',workLevel:4,xp:0,xpToday:0,fatigue:25,mood:92,efficiency:1,wage:25,evolutionHistory:[]};
 const s={day:9,seed:15,totalTime:36,employees:[employee],event:null,incidents:[],incidentHistory:[],cooldowns:{},manager:{x:10,z:1}};
 const game={data,random:()=>.99,efficiency:e=>Math.round(e.workLevel*.2),log:(s,msg)=>{(s.log??=[]).push(msg)},notice:(s,id,msg)=>{(s.notices??=[]).push({id,msg})}};
 return {data,employee,s,game};
}
test('evolution readiness respects the original thresholds, real next species, and final form',()=>{
 const {staffEvolutionInfo,readyStaffEvolutions}=helper('js/staff-evolution.js',['staffEvolutionInfo','readyStaffEvolutions']),{data,employee,s}=setup();
 employee.workLevel=3;assert.equal(staffEvolutionInfo(data,employee).eligible,false);
 employee.workLevel=4;assert.equal(staffEvolutionInfo(data,employee).eligible,true);
 assert.equal(readyStaffEvolutions(data,s.employees).length,1);
 employee.spiritId='spirit-b';assert.equal(staffEvolutionInfo(data,employee).eligible,false);
 employee.workLevel=8;assert.equal(staffEvolutionInfo(data,employee).eligible,true);
 employee.spiritId='spirit-c';employee.workLevel=50;assert.equal(staffEvolutionInfo(data,employee).eligible,false);
});
test('one card click evolves exactly one stage, preserves the employee identity, skill and old save information',()=>{
 const {evolveStaffOnce,staffEvolutionInfo}=helper('js/staff-evolution.js',['evolveStaffOnce','staffEvolutionInfo']);
 const {data,employee,s,game}=setup();
 const oldId=employee.id,oldBase=employee.baseId,oldXp=employee.xp,oldLevel=employee.workLevel,oldMood=employee.mood,oldGold=1500;
 s.gold=oldGold;
 const message=evolveStaffOnce(game,s,employee);
 assert.match(message,/進化成/);assert.equal(employee.spiritId,'spirit-b');
 assert.equal(employee.name,'進化型');assert.equal(employee.id,oldId);assert.equal(employee.baseId,oldBase);
 assert.equal(employee.workLevel,oldLevel);assert.equal(employee.xp,oldXp);assert.equal(employee.mood,oldMood);
 assert.equal(s.gold,oldGold);assert.equal(employee.evolutionHistory.length,1);
 assert.equal(employee.evolutionHistory[0].from,'spirit-a');assert.equal(employee.evolutionHistory[0].to,'spirit-b');
 assert.equal(staffEvolutionInfo(data,employee).eligible,false);
 assert.throws(()=>evolveStaffOnce(game,s,employee));
 employee.workLevel=8;evolveStaffOnce(game,s,employee);assert.equal(employee.spiritId,'spirit-c');
 assert.equal(employee.evolutionHistory.length,2);
});
test('patrol completion is impossible for required events before the selected focus, and auto-clears when nearby',()=>{
 const {requiresManagerPatrol}=helper('js/event-routing.js',['requiresManagerPatrol']);
 const {eventEmployee,managerNearEmployee,sleepEvent,applyFreeEventFatigue}=helper('js/patrol-events.js',['eventEmployee','managerNearEmployee','sleepEvent','applyFreeEventFatigue']);
 const core=read('js/core.js'),start=core.indexOf('resolveNearbyEvent(s){'),end=core.indexOf('setManagerActive(active)',start);
 const method=core.slice(start,end);
 const react=(s,e,kind)=>{e.reaction=kind};
 const resolve=new Function('eventEmployee','managerNearEmployee','sleepEvent','applyFreeEventFatigue','react','requiresManagerPatrol','return ({'+method+'}).resolveNearbyEvent;')
 (eventEmployee,managerNearEmployee,sleepEvent,applyFreeEventFatigue,react,requiresManagerPatrol);
 const {s,employee}=setup();employee.x=10;employee.z=1;s.event={id:'idle-sleep',requiresPatrol:true,instanceId:'focused-1',title:'收銀員閒得打瞌睡',employeeId:employee.id,role:'host',cooldown:45,effect:'clean'};
 const g={applyEventEffect:()=>{},efficiency:()=>1,notice:()=>{},log:()=>{}};
 assert.equal(resolve.call(g,s),false);
 s.patrolFocus={eventId:'focused-1',employeeId:employee.id,title:s.event.title};
 assert.equal(resolve.call(g,s),true);
 assert.equal(s.event,null);assert.equal(s.patrolFocus,null);
 assert.equal(s.recentPatrolResolution.focused,true);
 assert.equal(s.incidentHistory.length,1);
 assert.equal(resolve.call(g,s),false);
});
