/* Stable save IDs for the approved two-stage leaf frog family. */
(()=>{'use strict';
const stages={articuno:1,moltres:2};
const stage=key=>stages[String(key).replace('leaf-frog://','')];
const has=key=>String(key).startsWith('leaf-frog://')&&!!stage(key);
const ordinary=key=>stage(key)===2?'Kick':'Bump';
const special=key=>stage(key)===2?'Boomerang':'Bubbles';
function attack(key,strong=false,skill){const name=typeof skill==='string'?skill:skill?.name||'';if(/撞擊|踢擊|側踢|Bump|Kick/i.test(name))return ordinary(key);if(/泡泡|鏢|迴旋|Bubbles|Boomerang/i.test(name))return special(key);return strong?special(key):ordinary(key);}
function labels(key){return {Idle:'待機',Walk:'行走',...(stage(key)===2?{NinjaRun:'忍者跑步'}:{Hop:'跳躍'}),Wave:stage(key)===2?'左手揮手':'招呼',[ordinary(key)]:stage(key)===2?'普通攻擊 · 側踢':'普通攻擊 · 撞擊',[special(key)]:stage(key)===2?'技能 · 半蹲轉身迴旋鏢':'技能 · 吐出泡泡'};}
function motion(key,name){const n=({Attack:ordinary(key),Throw:special(key),Special:special(key),Run:stage(key)===2?'NinjaRun':'Walk',React:'Wave',Celebrate:'Wave',Hurt:'Idle',Jump:stage(key)===2?'NinjaRun':'Hop',Hop:stage(key)===2?'NinjaRun':'Hop',Sleep:'Idle',Sit:'Idle'})[name]||name;return Object.keys(labels(key)).includes(n)?n:'Idle';}
const durations={Bump:1.45,Kick:1.9,Bubbles:4.8,Boomerang:6.6};
window.FrogSpirits={has,stage,attack,labels,motion,duration:(key,strong=false,skill)=>durations[attack(key,strong,skill)],create:key=>LeafFrogs.create({stage:stage(key),inPlace:true})};
})();
