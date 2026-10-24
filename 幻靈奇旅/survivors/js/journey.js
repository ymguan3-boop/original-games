const clone=x=>JSON.parse(JSON.stringify(x));
export function rememberJourney(state,run){
 state.journey={version:1,activePet:run.activePet,time:run.time,depth:run.depth,segmentStart:run.segmentStart,kills:run.kills,captures:run.captures,earned:run.earned,milestone:run.milestone,specialMinute:run.specialMinute,hero:{level:run.hero.level,xp:run.hero.xp,maxHp:run.hero.maxHp},pets:clone(run.pets),buffs:clone(run.buffs||{}),buffTimers:clone(run.buffTimers||{}),tempWeapons:[...run.tempWeapons],fusions:{...run.fusions},weaponId:run.weaponId,lobbyWeaponId:state.equipped[0],pendingUpgrade:run.pendingUpgrade,upgradeChoices:clone(run.upgradeChoices||[]),petXpDouble:!!run.petXpDouble};
 state.petProgress||={};for(const pet of run.pets)state.petProgress[pet.baseId]=clone(pet);
 state.journey.enemies=clone(run.enemies||[]);state.journey.pickups=clone(run.pickups||[]);state.journey.nextId=run.nextId||1;Object.assign(state.journey.hero,{x:run.hero.x||0,z:run.hero.z||0,heading:run.hero.heading||0});
 if(run.status==='depth-cleared'){state.journey.depth++;state.journey.segmentStart=run.time;state.journey.milestone=0;state.journey.enemies=[];}
 state.journeyCount=(state.journeyCount||0)+1;state.playHistory||=[];state.playHistory.unshift({...state.lastResult,at:Date.now()});state.playHistory=state.playHistory.slice(0,100);
}
export function restoreJourney(run,state,data){
 const j=state.journey;if(!j)return run;
 for(const key of['time','depth','segmentStart','kills','captures','earned','milestone','specialMinute','pendingUpgrade'])if(Number.isFinite(j[key]))run[key]=j[key];
 Object.assign(run.hero,j.hero,{hp:j.hero.maxHp});run.buffs=clone(j.buffs);run.buffTimers=clone(j.buffTimers||{});run.tempWeapons=[...j.tempWeapons];run.fusions={...j.fusions};run.petXpDouble=false;run.upgradeChoices=clone(j.upgradeChoices||[]);
 run.pets=run.pets.map(p=>{const saved=state.petProgress?.[p.baseId]||j.pets.find(old=>old.baseId===p.baseId);if(!saved)return p;const hp=Math.round(saved.maxHp*(1+(p.training?.hp||0)*.03)/(1+(saved.training?.hp||0)*.03)*(1+(p.growthLevel-1)*.02)/(1+((saved.growthLevel||1)-1)*.02));const next={...clone(saved),maxHp:hp,training:{...p.training},growthLevel:p.growthLevel,hp,x:run.hero.x+1.2,z:run.hero.z+1.2,heading:0,attackCd:0,ultimateCd:0,ultimateQueued:false,actionUntil:0,pendingSkill:null,statuses:{},knockback:null,controlImmuneUntil:0};if(!data.spirits[next.speciesId])return p;return next;});
 const selected=state.equipped?.[0];run.weaponId=selected&&selected!==j.lobbyWeaponId?selected:j.weaponId;
 if(j.pets.map(p=>p.baseId).join(',')===state.team.join(','))run.activePet=j.activePet||0;
 run.weaponId||=selected||'guns-starter';run.enemies=clone(j.enemies||[]).filter(e=>e.hp>0).map(e=>({...e,statuses:{},pendingShot:null,warning:null,controlImmuneUntil:0,knockback:null,nextAttack:run.time+2}));run.pickups=clone(j.pickups||[]);run.nextId=j.nextId||1;
 run.spawnAt=run.time+2;return run;
}
