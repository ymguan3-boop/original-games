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

test('manual staff evolution updates species only after an explicit action; white-flash animation remains installed',()=>{
 const evo=load('js/staff-evolution.js',['staffEvolutionInfo','readyStaffEvolutions','evolveStaffOnce']);
 const data={evolution:{tiny:{level:3,next:['big'],branch:'linear'},big:{level:9,next:[],branch:'terminal'}},
  spirits:[{id:'tiny',name:'小幻靈',stage:1},{id:'big',name:'大幻靈',stage:2}]};
 const employee={id:'worker-1',name:'小幻靈',spiritId:'tiny',workLevel:2,evolutionHistory:[],fatigue:8,rarity:'yellow'};
 const game={data,random:()=>0,efficiency:()=>1.5,log:()=>{},notice:()=>{}},state={day:9,seed:1200};
 assert.equal(evo.staffEvolutionInfo(data,employee).eligible,false);
 assert.equal(employee.spiritId,'tiny');
 assert.throws(()=>evo.evolveStaffOnce(game,state,employee));
 employee.workLevel=3;
 assert.equal(evo.staffEvolutionInfo(data,employee).eligible,true);
 assert.equal(evo.readyStaffEvolutions(data,[employee]).length,1);
 assert.equal(employee.spiritId,'tiny'); // level-up is only eligibility
 const message=evo.evolveStaffOnce(game,state,employee);
 assert.match(message,/進化成/);
 assert.equal(employee.spiritId,'big');
 assert.equal(employee.workLevel,3);
 assert.equal(employee.evolutionHistory.length,1);
 assert.equal(evo.staffEvolutionInfo(data,employee).eligible,false);
 const animation=read('commerce-evolution-patrol-v18.css');
 assert.match(animation,/@keyframes staff-evo-spin/);
 assert.match(animation,/@keyframes staff-evo-flash/);
});
