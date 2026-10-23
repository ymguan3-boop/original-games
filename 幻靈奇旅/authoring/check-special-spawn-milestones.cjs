/* Run: node authoring/check-special-spawn-milestones.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const game=load('js/game.js'),spirits=JSON.parse(load('data/spirits.json'));
const all=Array.isArray(spirits)?spirits:spirits.spirits;
const bosses=['chimchar','monferno','infernape'];
const regular=()=>all.filter(s=>s.category!=='tower'&&!bosses.includes(s.id));
const byId=Object.fromEntries(all.map(s=>[s.id,s]));
const S={state:{pokedexUnlocks:{raikou:true},captureCounts:{},worldFlags:{},dreamLabLegendClaimed:true,dreamLabLegendChoice:'raikou',wins:0}};
const owned=id=>!!(S.state.pokedexUnlocks[id]||S.state.captureCounts[id]>0);
function section(start,end){
 const a=game.indexOf(start),b=game.indexOf(end,a);
 assert(a!==-1&&b>a,'Missing logic block '+start);
 return game.slice(a,b);
}
const context={spirits:all,regularSpirits:regular,owned,S,byId,
 LAB_LEGENDS:['articuno','raikou','entei'].map(id=>({id})),labClaimed:()=>S.state.dreamLabLegendClaimed,
 BOSS_CARD_IDS:bosses,WATER_EVENT_ONLY:['kyogre','groudon','rayquaza','mewtwo'],
 isBook:s=>s?.family==='book-spirit',isGymGuardian:s=>['pikachu','mew','wigglytuff','blissey'].includes(s?.id),
 Date};
vm.runInNewContext(section('// 新手教學、圖鑑 HUD','function isAirborne(s)')+'\n'+
 section('const POND_RESPAWN_MS=','let pondSpawnBusy=')+
 '\nthis.rules={dexStats,dexReached,dexComplete,milestoneTargets,eligible,pondRespawnAllowed,recordPondCapture,MILESTONE_SPECIALS};',context);
const x=context.rules;
const observed=()=>x.dexStats().owned;
function unlockUntil(n,skipSpecial=true){
 for(const s of regular()){
  if(observed()>=n)break;
  if(skipSpecial&&['articuno','entei','giratina','dialga'].includes(s.id))continue;
  S.state.pokedexUnlocks[s.id]=true;
 }
 assert.equal(observed(),n,'Fixture cannot reach '+n);
}
assert.equal(x.dexStats().total,58);
assert.equal(JSON.stringify(x.MILESTONE_SPECIALS.map(v=>v.percent)),JSON.stringify([.45,.75]));
unlockUntil(14);assert.equal(x.dexReached(.25),false);assert.equal(x.eligible(byId.raikou),false);
unlockUntil(15);assert.equal(x.dexReached(.25),true);assert.equal(x.eligible(byId.raikou),true);
assert.equal(JSON.stringify(x.milestoneTargets().filter(v=>v.percent===.25).map(v=>v.id).sort()),JSON.stringify(['articuno','entei']));
unlockUntil(26);assert.equal(x.dexReached(.45),false);assert.equal(x.eligible(byId.giratina),false);
unlockUntil(27);assert.equal(x.dexReached(.45),true);assert.equal(x.eligible(byId.giratina),true);
unlockUntil(43);assert.equal(x.dexReached(.75),false);assert.equal(x.eligible(byId.dialga),false);
unlockUntil(44);assert.equal(x.dexReached(.75),true);assert.equal(x.eligible(byId.dialga),true);
x.recordPondCapture({species:{id:'articuno'},pondJump:{active:true}});
x.recordPondCapture({species:{id:'entei'},pondSwim:{phase:0}});
assert.equal(x.pondRespawnAllowed('articuno'),false);
assert.equal(x.pondRespawnAllowed('entei'),false);
S.state.worldFlags.pondRespawnAt.articuno=Date.now()-7200000;
S.state.worldFlags.pondRespawnAt.entei=Date.now()-7200000;
assert.equal(x.pondRespawnAllowed('articuno'),false,'Past cooldown must not bypass incomplete Pokedex');
assert.equal(x.pondRespawnAllowed('entei'),false,'Past cooldown must not bypass incomplete Pokedex');
unlockUntil(58,false);assert.equal(x.dexComplete(),true);
assert.equal(x.pondRespawnAllowed('articuno'),true);assert.equal(x.pondRespawnAllowed('entei'),true);
S.state.worldFlags.pondRespawnAt.entei=Date.now()+3600000;
assert.equal(x.pondRespawnAllowed('entei'),false,'Completed Pokedex still respects 1-hour cooldown');
assert.equal(x.eligible(byId.dialga),true);assert.equal(x.eligible(byId.giratina),true);
assert.equal(x.milestoneTargets().length,0);
assert(game.includes('progress:()=>dexStats()'),'Tutorial must reuse same denominator');
assert(game.includes('S.state.worldFlags.labLegendWildCaught[who.species.id]=true'),'One-time chosen starter wild capture must persist');
assert(load('index.html').includes('js/game.js?v=20261023-special-25-45-75-v1'));
console.log('PASS: special unlocks 15/27/44 of 58; once-only before 100%; hourly post-100% pond return; tutorial shares 58-species denominator.');
