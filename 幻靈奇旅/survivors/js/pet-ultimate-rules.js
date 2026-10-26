import {STATUS,immobilized} from './combat-status.js?v=20261025-v22';
const inFamily=(id,ids)=>ids.includes(id),rank=s=>Math.max(1,Math.min(3,s?.stage||1));
export function petUltimateRule(s){
 const id=s?.id,n=rank(s);
 if(inFamily(id,['squirtle','wartortle','blastoise','piplup','prinplup','empoleon']))return{replace:true,regen:n*.01,duration:10};
 if(inFamily(id,['treecko','chikorita','bayleef','meganium']))return{replace:true,heal:[.2,.3,.4][n-1]};
 if(inFamily(id,['grovyle','bulbasaur','ivysaur','venusaur']))return{replace:true,reduction:[.6,.7,.8][n-1],duration:10};
 if(inFamily(id,['sceptile','palkia','totodile','croconaw','feraligatr']))return{block:true,noTarget:true};
 if(inFamily(id,['turtwig','grotle','torterra']))return{blink:true,hitStatus:{type:'poison',chance:1,duration:4,power:2}};
 if(id==='zapdos')return{fieldStatus:'burn',duration:4,noTarget:true};
 if(id==='suicune')return{fieldStatus:'slow',duration:4,noTarget:true};
 if(id==='moltres')return{heal:.3,selfHeal:.3,noTarget:true};
 if(inFamily(id,['chimchar','raichu']))return{crit:.3,duration:10,fieldStatus:'paralysis',statusDuration:.9,noTarget:true};
 if(id==='blissey')return{heal:.5,noTarget:true};
 if(id==='mew')return{regen:.04,duration:10,fieldStatus:'poison',statusDuration:10,noTarget:true};
 if(id==='pikachu')return{fieldStatus:'paralysis',duration:.9,noTarget:true};
 if(id==='monferno')return{fieldStatus:'freeze',duration:2.4,noTarget:true};
 return null;
}
export function ultimateEffectDescription(s){const u=petUltimateRule(s);if(!u)return'';const text=[];
 if(u.regen)text.push('主角每秒恢復最大生命'+Math.round(u.regen*100)+'%，持續10秒');
 if(u.heal)text.push('立即恢復主角最大生命'+Math.round(u.heal*100)+'%');
 if(u.selfHeal)text.push('同時恢復自身最大生命'+Math.round(u.selfHeal*100)+'%');
 if(u.reduction)text.push('主角減傷護盾'+Math.round(u.reduction*100)+'%，持續10秒');
 if(u.block)text.push('主角獲得1次傷害無效護盾，不疊加次數');
 if(u.blink)text.push('瞬移至視野內目標前方，命中附加中毒4秒');
 if(u.crit)text.push('主角暴擊率+30個百分點，持續10秒');
 if(u.fieldStatus)text.push('全場現存敵人'+STATUS[u.fieldStatus].name+(u.statusDuration||u.duration)+'秒'+(u.fieldStatus==='freeze'?'（冰凍時減傷80%）':''));
 return text.join('；');
}
// Called once at the authored release, never when merely queued or warming up.
export function applyPetUltimate(w,p){const r=w.run,h=r.hero,u=petUltimateRule(w.data.spirits[p.speciesId]);if(!u)return false;
 if(u.heal)w.heal(h,h.maxHp*u.heal);if(u.selfHeal)w.heal(p,p.maxHp*u.selfHeal);
 if(u.regen){const old=h.skillRegen;h.skillRegen={ratio:Math.max(u.regen,old?.until>r.time?old.ratio:0),until:r.time+10,next:old?.until>r.time?old.next:r.time+1};}
 if(u.reduction)h.damageShield={reduction:Math.max(u.reduction,h.damageShield?.until>r.time?h.damageShield.reduction:0),until:r.time+10};
 if(u.block)h.shieldCharges=1;
 if(u.crit){h.skillCritBonus=u.crit;h.skillCritUntil=r.time+10;}
 if(u.fieldStatus)for(const e of r.enemies)if(e.hp>0&&!e.rewarded&&!e.capturePending)w.status(e,u.fieldStatus,{duration:u.statusDuration||u.duration,attack:w.petAttack(p)*.3,element:u.fieldStatus==='burn'?'焰':u.fieldStatus==='poison'?'森':'潮',from:p});
 w.emit('supportCast',{sourceActor:'pet:'+r.pets.indexOf(p),speciesId:p.speciesId,x:p.x,z:p.z,hero:{x:h.x,z:h.z},support:!!(u.heal||u.regen||u.reduction||u.block||u.crit),statusWave:u.fieldStatus,shield:!!(u.block||u.reduction),element:u.fieldStatus==='burn'?'焰':'森',strong:true});
 return !!u.replace;
}
export function tickHeroSupport(w){const h=w.run.hero,t=w.run.time,a=h.skillRegen;if(a){while(a.next<=Math.min(t,a.until)){w.heal(h,h.maxHp*a.ratio);a.next+=1;}if(t>=a.until)delete h.skillRegen;}if(h.damageShield?.until<=t)delete h.damageShield;if(h.skillCritUntil<=t){delete h.skillCritUntil;delete h.skillCritBonus;}}
export function heroSupportStates(h,t){const states=[];if(h.skillRegen?.until>t)states.push({type:'regen',name:'每秒回血'+Math.round(h.skillRegen.ratio*100)+'%',symbol:'✚',color:'#80ffc1',remaining:h.skillRegen.until-t});if(h.damageShield?.until>t)states.push({type:'guard',name:'減傷'+Math.round(h.damageShield.reduction*100)+'%',symbol:'⬡',color:'#83d6ff',remaining:h.damageShield.until-t});if(h.shieldCharges>0)states.push({type:'barrier',name:'傷害無效',symbol:'◈',color:'#ffe09b',remaining:null});if(h.skillCritUntil>t)states.push({type:'critical',name:'暴擊+30%',symbol:'✧',color:'#ffb86a',remaining:h.skillCritUntil-t});return states;}
export function queueAutoUltimate(w){const r=w.run;for(const p of r.pets){if(p.hp<=0){p.ultimateQueued=false;p.autoQueued=false;p.pendingSkill=null;}else if(p.autoQueued&&!w.petProfile(p,true).noTarget&&!['self','global'].includes(w.petProfile(p,true).type)&&!w.petTarget(r.hero,Infinity)){p.ultimateQueued=false;p.autoQueued=false;}}const active=r.pets[r.activePet];if(r.pets.some(p=>p.pendingSkill||p.ultimateQueued)||active&&(active.actionUntil>r.time||active.globalCombo||active.chainAura))return;
 for(let step=1;step<=r.pets.length;step++){const i=((r.autoUltCursor??-1)+step)%r.pets.length,p=r.pets[i];if(!w.store.state.autoPetUltimates?.[i]||p.hp<=0||p.ultimateCd>0||immobilized(p,r.time))continue;const profile=w.petProfile(p,true);if(!profile.noTarget&&!['self','global'].includes(profile.type)&&!w.petTarget(r.hero,Infinity))continue;
  if(i!==r.activePet){w.activateAutoPet(i);}
  p.ultimateQueued=true;p.autoQueued=true;return;
 }
}
