/* Encounter-local egg changes and turn-based non-damaging skills. No save mutation. */
(()=>{'use strict';
 const line=['jigglypuff','treecko','grovyle','sceptile'];
 function captureChance(actor,type,normal){return actor.species?.id==='jigglypuff'?(type==='master'?1:.05):normal;}
 function nextFailure(encounter){const failures=(Number(encounter?.failures)||0)+1;return{origin:'jigglypuff',failures,speciesId:line[Math.min(3,failures)]};}
 const isRecover=skill=>skill?.effect==='eggRecover';
 function evolutionCost(spirit){return spirit?.id==='sceptile'?3:['jigglypuff','treecko','grovyle'].includes(spirit?.id)?Infinity:null;}
 function canUse(entry,skill,turn){return !isRecover(skill)||(Number(turn)||1)>=(entry.eggRecoverReadyTurn||0);}
 function apply(entry,opponent,skill,turn){if(skill?.effect==='eggArmour'){opponent.attackMultiplier=.5;return{kind:'armour',text:opponent.s.name+'的攻擊力減半（本場不疊加）。'};}if(isRecover(skill)){if(!canUse(entry,skill,turn))return null;const maximum=entry.maxHp||entry.s.hp,before=entry.hp;entry.hp=Math.min(maximum,entry.hp+Math.round(maximum*.90));entry.eggRecoverReadyTurn=(Number(turn)||1)+2;return{kind:'recover',healed:entry.hp-before,text:entry.s.name+'恢復 '+(entry.hp-before)+' HP；回滿每 2 回合可使用 1 次。'};}return null;}
 window.AvianRules={line,captureChance,nextFailure,evolutionCost,canUse,apply};
})();
