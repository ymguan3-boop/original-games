// Shared wardrobe descriptions and cave values; reads no save and grants no unlocks.
(function(global){
 const costumes={
  reaper:{id:'reaper',name:'星冥收割者・死神套裝',collectInterval:10,lowHealthAttack:5,lowHealthCap:2.5,townDescription:'一般場景每10秒吸取全場可拾取道具與補品；主角每少1%生命，攻擊+5%，最多+250%（剩50%生命即達上限）。死神鐮刀為獨立永久武器。',description:'每10秒吸取全場點數、經驗、補品、道具、武器及技能書；主角每少1%生命，攻擊+5%，最多+250%（剩50%生命即達上限）。不增加寵物攻擊。'},
  trainer:{id:'trainer',name:'初光旅人',townDescription:'原始服裝，沒有額外能力。',description:'沒有額外能力。'},
  adventure:{id:'adventure',name:'博士贈送冒險服',collectInterval:10,townDescription:'每10秒吸收場上所有可收集補給與道具，飛向主角後入袋。',description:'每10秒吸引場上所有掉落物，飛近主角後拾取；包含點數、經驗、補給、武器與技能書，不消耗道具。'},
  electric:{id:'electric',name:'鹹蛋超人變身套裝',petAttack:1.2,basicBallMultiplier:4/3,townDescription:'幻靈競技擂台中，己方所有幻靈攻擊威力+20%；初光挑戰使用普通靈核球時，信任傷害由18提升為24。',description:'己方所有幻靈的普攻與大絕威力+20%，換寵後同樣生效；普通靈核球的基礎捕捉率乘以4/3，成功率上限仍為96%。不增加主角武器威力。'},
  mist:{id:'mist',name:'小飯團同行',speed:1.2,waveHeal:.2,townDescription:'幻靈競技擂台每個完整回合結束後，己方所有存活幻靈恢復最大生命20%；探索移動速度+20%。',description:'主角移動速度+20%；每波結束時，己方所有存活幻靈恢復最大生命20%，包含備戰幻靈；不會復活倒下的幻靈。'},
  sound:{id:'sound',name:'小山蝴蝶套裝',speed:1.2,townDescription:'移動速度+20%；蝴蝶環繞飛舞，移動時漂浮前傾。',description:'主角移動速度+20%；沿用蝴蝶環繞與移動漂浮前傾外觀。'},
  healing:{id:'healing',name:'冒險套裝',heroAttack:1.2,petAttack:1.2,reach:1.2,townDescription:'初光挑戰、幻靈競技擂台與星穹挑戰塔攻擊力+20%；捕捉幻靈距離+20%，有距離判定的攻擊範圍+20%。',description:'主角與己方所有幻靈的普攻、大絕威力+20%；主角攻擊範圍與靈核球捕捉距離+20%。'}
 };
 for(const c of Object.values(costumes))Object.freeze(c);
 function heroAttack(costume,hp,maxHp){const c=costumes[typeof costume==='string'?costume:costume?.id]||costumes.trainer;const ratio=Number.isFinite(hp)&&Number.isFinite(maxHp)&&maxHp>0?Math.max(0,Math.min(1,hp/maxHp)):1;return(c.heroAttack||1)*(1+Math.min(c.lowHealthCap||0,(1-ratio)*(c.lowHealthAttack||0)));}
 global.PhantomWardrobe=Object.freeze({costumes:Object.freeze(costumes),heroAttack});
})(globalThis);
