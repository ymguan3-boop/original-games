/* Weapon explanations and timed buffs share the live equipment rules. */
(function(global){'use strict';
 function describe(w,base){
  if(w?.scythe)return '星冥連舞：五段刀氣連斬；'+w.description;
  if(!w)return '武器特性：'+base.desc+'；無額外被動。';
  const effects={knock:'震退目標',freeze:'冰凍1.4秒（狀態冷卻3秒）',paralyze:'麻痺1.15秒（狀態冷卻2.8秒）',poison:'中毒5.5秒',lifesteal:'命中回復主角4點生命',ward:'裝備時承受傷害減少20%'};
  const bonus=Math.round(((w.boost||1)-1)*100),effect=effects[w.effect]||w.description||w.label||'無額外被動';
  return (bonus?'傷害 +'+bonus+'%；':'')+(['lifesteal','ward'].includes(w.effect)?effect:'命中 '+Math.round((w.chance||0)*100)+'% 機率'+effect);
 }
 function buffs(h){const p=h.player,result=[];if(p.attackBoostTime>0)result.push({id:'power',label:'攻擊 +25%',remaining:p.attackBoostTime});if(h.reaperHaste>0&&h.equippedWeapon()?.scythe)result.push({id:'reaper-haste',label:'攻速 +50%',remaining:h.reaperHaste});return result;}
 global.PhantomTowerWeaponDetails=Object.freeze({describe,buffs});
})(globalThis);
