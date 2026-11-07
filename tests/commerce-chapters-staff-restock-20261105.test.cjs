const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const modules=(file,expression,context={})=>{vm.runInNewContext(read(file).replace(/^import [^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const))/g,'')+';this.output='+expression,context);return context.output;};
const levels=[{level:1,cost:0},{level:2,cost:2000,revenue:400,satisfaction:75,days:1,upgradeSeconds:30},{level:3,cost:8000,revenue:4000,satisfaction:80,days:2,upgradeSeconds:60},{level:4,cost:25000,revenue:16000,satisfaction:82,days:3,upgradeSeconds:90},{level:5,cost:60000,revenue:45000,satisfaction:85,days:5,upgradeSeconds:150}];
const helpers=()=>modules('js/shop-chapters.js','({chapterObjectives,autoChapterConstruction,awardSideChapter,finishChapterConstruction})');
const state=()=>({level:1,phase:'closed',day:2,gold:4000,stats:{expenses:0,rewards:0},totals:{sales:1,revenue:450,days:1},satisfaction:76,patrols:1,inventory:{potion:40},employees:[{id:'a',role:'cashier',workLevel:1,x:10,z:1,fatigue:1},{id:'b',role:'stocker',workLevel:1,x:3,z:3,fatigue:2}],incidentHistory:[]});
const game=()=>({data:{levels},pay:(s,c)=>{if(s.gold<c)throw Error('金幣不足');s.gold-=c},log:()=>{}});
test('one main quest per store grade tracks sales, revenue, satisfaction and completed days',()=>{
 const {chapterObjectives}=helpers(),s=state();
 for(let lv=1;lv<=5;lv++){s.level=lv;const ch=chapterObjectives(s,levels);assert.equal(ch.goals.length,4);assert.ok(ch.side.length>=2);assert.equal(ch.last,lv===5);assert.equal(ch.level,lv);}
 s.level=1;assert.equal(chapterObjectives(s,levels).ready,true);
 s.totals.sales=0;assert.equal(chapterObjectives(s,levels).ready,false);
});
test('ready chapter spends the existing upgrade price exactly once and records an animated victory',()=>{
 const {autoChapterConstruction,finishChapterConstruction}=helpers(),s=state(),g=game();
 assert.equal(autoChapterConstruction(g,s),true);
 assert.equal(s.gold,2000);assert.equal(s.upgradeProject.to,2);assert.equal(s.upgradeProject.remaining,30);
 assert.equal(autoChapterConstruction(g,s),false);assert.equal(s.gold,2000);
 s.level=2;finishChapterConstruction(g,s,1);
 assert.equal(s.chapterClear.level,2);assert.equal(s.chapterClear.from,1);
});
test('side missions pay only once, do not gate store progression',()=>{
 const {chapterObjectives,awardSideChapter}=helpers(),s=state(),g=game();
 assert.equal(chapterObjectives(s,levels).ready,true);
 awardSideChapter(g,s,'lv1-patrol');
 assert.equal(s.gold,4120);assert.equal(s.chapterRewards['lv1-patrol'],true);
 assert.throws(()=>awardSideChapter(g,s,'lv1-patrol'));
});
