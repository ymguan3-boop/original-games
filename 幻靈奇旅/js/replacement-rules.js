/* Pure gameplay rules shared by the main game and integration checks. */
(()=>{'use strict';const count=v=>Math.min(3,Math.max(0,Math.floor(Number(v)||0)));
function arenaProgress(state,b,abort=false){if(b?.kind!=='arena'||b.ending||abort||!b.allies?.some(a=>a.s?.id==='giratina'))return count(state.rabbitArenaParticipations);return state.rabbitArenaParticipations=Math.min(3,count(state.rabbitArenaParticipations)+1);}
function rabbitReady(state){return count(state.rabbitArenaParticipations)>=3;}
function poison(defender,skill){if(skill?.status?.type!=='poison'||defender.hp<=0)return false;defender.status||={};defender.status.poison=Math.max(1,Number(skill.status.turns)||3);defender.poisonDamageRatio=Number(skill.status.damageRatio)||.04;return true;}
function poisonRound(entry){if(entry.hp<=0||!(entry.status?.poison>0))return 0;const damage=Math.min(entry.hp,Math.ceil((entry.maxHp||entry.s.hp)*(entry.poisonDamageRatio||.04)));entry.hp-=damage;if(--entry.status.poison<=0){delete entry.status.poison;delete entry.poisonDamageRatio;}return damage;}
window.SpiritReplacementRules={arenaProgress,rabbitReady,poison,poisonRound};})();
