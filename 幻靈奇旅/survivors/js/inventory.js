export const BUFF_CAPS={attack:1,skill:1,range:0.4,cooldown:0.3,damageReduction:0.5,capture:0.3,speed:0.3,crit:0.3,pickup:1.5};
const item=(name,kind,price,extra={})=>({name,kind,price,rarity:'一般',stackLimit:999999,duration:0,...extra});
export const ITEMS={
 'vacuum-orb':item('萬象吸取','vacuum',200,{description:'立即吸取場上所有掉落物，包含點數、經驗、補給、武器與技能書；場上無物品時不消耗；自動使用間隔10秒，每次消耗1件'}),
 'pet-xp-double':item('幻靈經驗雙倍晶','pet-xp',100,{description:'本局所有存活幻靈獲得2倍戰鬥經驗；不疊加，結束本局後失效'}),
 'buff-pickup':item('拾取範圍增幅','buff',60,{effectId:'pickup',effectValue:.25,description:'本局拾取半徑 +25%，總上限 +150%'}),
  potion:item('治療藥水','heal',30,{value:0.4,description:'由主角使用，同步恢復主角與所有存活幻靈40%最大生命，可受治療被動強化'}),
  revive:item('緊急復甦藥','revive',100,{value:0.5,description:'主角施用，自動復甦一隻倒下幻靈至50%生命，優先出戰者'}),
  battery:item('幻靈大絕電池','battery',70,{description:'主角施用，重置出戰幻靈的大絕冷卻'}),
  'ball-basic':item('普通靈核球','ball',10,{captureMultiplier:1,description:'標準捕捉球；投球命中判定前消耗'}),
  'ball-great':item('高階靈核球','ball',30,{captureMultiplier:1.4,description:'捕捉成功率乘以 1.4'}),
  'ball-ultra':item('星耀靈核球','ball',70,{captureMultiplier:1.8,description:'捕捉成功率乘以 1.8'}),
  'buff-attack':item('攻擊增幅','buff',80,{effectId:'attack',effectValue:0.1,description:'本局攻擊 +10%，總上限 +100%'}),
  'buff-skill':item('技能增幅','buff',80,{effectId:'skill',effectValue:0.1,description:'本局技能傷害 +10%，總上限 +100%'}),
  'buff-range':item('範圍增幅','buff',80,{effectId:'range',effectValue:0.1,description:'本局攻擊範圍 +10%，總上限 +40%'}),
  'buff-cooldown':item('冷卻增幅','buff',80,{effectId:'cooldown',effectValue:0.05,description:'本局冷卻縮減 5%，總上限 30%'}),
  'buff-defense':item('防禦增幅','buff',80,{effectId:'damageReduction',effectValue:0.1,description:'本局減傷 +10%，總上限 50%'}),
  'buff-capture':item('捕捉增幅','buff',80,{effectId:'capture',effectValue:0.05,description:'本局捕捉率 +5 個百分點，總上限 +30%'}),
};
export const BOSS_WEAPONS=['blades-blinkfire','knife-flamewave','guns-critical','sword-leek'];
export const WEAPONS={
 'sword-starlight-scythe':{name:'星輝鐮刀',type:'sword',damage:28,interval:2.79,range:3.4,price:0,element:'念',eventOnly:true,scythe:true},
 'staff-pumpkin':{name:'南瓜魔杖',type:'guns',damage:28,interval:.6,range:12,price:0,element:'森',eventOnly:true,pumpkinStaff:true},
 'guns-critical':{name:'必暴雙槍',type:'guns',damage:17,interval:.45,range:12,price:0,element:'光',bossOnly:true,forceCrit:true,onHit:{type:'knockback',chance:.4}},
 'sword-leek':{name:'大蔥',type:'sword',damage:28,interval:.9,range:3.4,price:0,element:'森',bossOnly:true,attackSpeed:.5,appearance:'leek',onHit:{type:'paralysis',chance:.5,duration:.9}},
 'blades-blinkfire':{name:'瞬燃雙刀',type:'blades',damage:18,interval:.3,range:2.7,price:0,element:'焰',bossOnly:true,rangeBonus:.6,lowHealthAttack:true,onHit:{type:'burn',chance:1,power:2}},
 'knife-flamewave':{name:'幻燃單刃',type:'knife',damage:48,interval:.55,range:12,price:0,element:'焰',bossOnly:true,swordWave:true,onHit:{type:'burn',chance:1,power:2}},
 'blades-venom':{name:'蝕毒雙刃',type:'blades',damage:13,interval:.3,range:2.7,price:1000,element:'森',shopOnly:true,onHit:{type:'poison',chance:.35}},
 'guns-paralysis':{name:'霹靂雙槍',type:'guns',damage:16,interval:.45,range:12,price:1000,element:'雷',shopOnly:true,onHit:{type:'paralysis',chance:.25}},
 'knife-slow':{name:'流沙單刀',type:'knife',damage:54,interval:.55,range:3,price:1000,element:'念',shopOnly:true,onHit:{type:'slow',chance:.4}},
 'guns-freeze':{name:'霜晶雙槍',type:'guns',damage:16,interval:.45,range:12,price:1000,element:'潮',shopOnly:true,onHit:{type:'freeze',chance:.2}},
 'sword-knockback':{name:'震嶽大劍',type:'sword',damage:30,interval:.9,range:3.4,price:1000,element:'光',shopOnly:true,onHit:{type:'knockback',chance:.35}},
  'sword-starter':{name:'初光大劍',type:'sword',damage:24,interval:0.9,range:3.4,price:0,element:null},
  'knife-starter':{name:'巡林單刀',type:'knife',damage:38,interval:0.55,range:3,price:0,element:null},
  'blades-starter':{name:'雙月刃',type:'blades',damage:10,interval:0.3,range:2.7,price:0,element:null},
  'guns-starter':{name:'晨星雙槍',type:'guns',damage:12,interval:0.45,range:12,price:300,element:null},
  'sword-flame':{name:'焰紋大劍',type:'sword',damage:26,interval:0.9,range:3.4,price:600,element:'焰',onHit:{type:'burn',chance:.35,power:2}},
  'knife-tide':{name:'潮流單刀',type:'knife',damage:46,interval:0.55,range:3,price:600,element:'潮',noKnockback:true,onHit:{type:'slow',chance:.4}},
  'blades-forest':{name:'森影雙刃',type:'blades',damage:11,interval:0.3,range:2.7,price:600,element:'森',killHeal:.05},
  'guns-thunder':{name:'雷鳴雙槍',type:'guns',damage:14,interval:0.45,range:12,price:650,element:'雷',critChance:.1},
};
export function addBuff(run,key,value) {
  if (!(key in BUFF_CAPS) || !Number.isFinite(value) || value<=0) throw new Error('未知增幅。');
  run.buffs ||= {};
  const old=run.buffs[key]||0;
  if (old>=BUFF_CAPS[key]-1e-9) throw new Error('此能力已達上限，未消耗道具。');
  run.buffs[key]=Math.min(BUFF_CAPS[key],Math.round((old+value)*1e8)/1e8);
  return run.buffs[key]-old;
}
export function addInventory(state,id,count=1) {
  const config=ITEMS[id];
  if (!config || !Number.isInteger(count) || count<1) throw new Error('未知道具或數量。');
  const next=(state.inventory[id]||0)+count;
  if(next>config.stackLimit) throw new Error('背包道具已達堆疊上限。');
  state.inventory[id]=next;
}
function active(state) {
  if (!state.run || state.run.status!=='active' || state.run.hero.hp<=0) throw new Error('必須在主角存活的戰局中使用。');
  return state.run;
}
export function useItem(store,itemId,txId=store.newId('item'),targetIndex,options={}) {
  return store.transact(txId,state=> {
    const config=ITEMS[itemId], run=active(state);
    if (!config || !(state.inventory[itemId]>0)) throw new Error('沒有此道具。');
    let target=targetIndex===undefined || targetIndex===-1 ? run.hero : run.pets[targetIndex];
    if (!target) throw new Error('使用目標無效。');if(target===run.hero&&config.kind==='revive')target=run.pets[run.activePet]?.hp<=0?run.pets[run.activePet]:run.pets.find(p=>p.hp<=0);if(target===run.hero&&config.kind==='battery')target=run.pets[run.activePet];
    if(config.kind==='buff') {
      const delta=addBuff(run,config.effectId,config.effectValue);
      if(config.duration>0) {run.buffTimers ||= {}; (run.buffTimers[config.effectId] ||= []).push({expires:(run.time||0)+config.duration,value:delta});}
    } else if(config.kind==='vacuum') {
      if(options.automatic&&(run.autoItemNext?.[itemId]||0)>run.time)throw Error('自動吸取冷卻中，未消耗道具');if(!run.pickups.length||run.vacuumRequested)throw Error('場上沒有可吸取的掉落物，未消耗道具');run.vacuumRequested=true;
    } else if(config.kind==='pet-xp') {
      if(run.petXpDouble)throw Error('本局幻靈經驗已為2倍，未消耗道具');run.petXpDouble=true;
    } else if(config.kind==='heal') {
      const party=[run.hero,...run.pets].filter(p=>p.hp>0&&p.hp<p.maxHp);if(!party.length)throw Error('主角與存活幻靈生命已滿。');for(const member of party){member.hp=Math.min(member.maxHp,member.hp+Math.round(member.maxHp*config.value*(1+(member.passiveHealing||0))));member.healUntil=run.time+.9;}
    } else if(config.kind==='revive') {
      if (!target || target===run.hero || target.hp>0) throw new Error('請指定倒下的幻靈。');
      target.hp=Math.max(1,Math.round(target.maxHp*config.value));target.healUntil=run.time+.9;
    } else if(config.kind==='battery') {
      if (!target || target===run.hero || target.hp<=0 || !(target.ultimateCd>0)) throw new Error('請指定大絕冷卻中的存活幻靈。');
      target.ultimateCd=0;
    } else if(config.kind==='ball') {
      throw new Error('請在戰場鎖定有效目標後按投球。');
    }
    if(options.automatic&&config.kind==='vacuum'){run.autoItemNext||={};run.autoItemNext[itemId]=run.time+10;}
    if(options.automatic&&!['heal','revive','vacuum'].includes(config.kind)){run.autoItemUsed||=[];if(!run.autoItemUsed.includes(itemId))run.autoItemUsed.push(itemId);}
    if (--state.inventory[itemId]===0) delete state.inventory[itemId];
    return {itemId,targetIndex:targetIndex??-1,message:`${config.name}已使用`};
  });
}
/** Caller must validate the capture target and put throw outcome in this same transaction. */
export function consumeBall(state,id) {
  active(state);
  if(ITEMS[id]?.kind!=='ball' || !(state.inventory[id]>0)) throw new Error('捕捉球不足。');
  if(--state.inventory[id]===0) delete state.inventory[id];
  return ITEMS[id].captureMultiplier;
}
export function buyItem(store,id,txId=store.newId('buy-item')) {
  return store.transact(txId,s=> {
    const item=ITEMS[id];
    if(!item || s.points<item.price) throw new Error('道具不存在或點數不足。');
    addInventory(s,id); s.points-=item.price;
    return {itemId:id,message:'已入背包，可於戰鬥中使用'};
  });
}
export function buyWeapon(store,id,txId=store.newId('buy-weapon')) {
  return store.transact(txId,s=> {
    const weapon=WEAPONS[id];
    if(!weapon || weapon.bossOnly || weapon.eventOnly || s.weapons.includes(id) || s.points<weapon.price) throw new Error('已持有、武器不存在或點數不足。');
    s.points-=weapon.price; s.weapons.push(id);
    s.equipped=[id,...s.equipped.filter(x=>x!==id)].slice(0,4);if(s.run?.status==='active'){s.run.weaponId=id;s.run.hero.pendingAttack=null;s.run.heroCombo=null;}
    return {weaponId:id,message:'已永久取得（洞穴專用）'};
  });
}
export function addTemporaryWeapon(run,id,permanentWeapons) {
  if(!WEAPONS[id] || run.status!=='active') throw new Error('臨時武器無效。');
  run.fusions ||= {}; run.tempWeapons ||= [];
  if(permanentWeapons.includes(id)||run.tempWeapons.includes(id)) {
    const current=run.fusions[id]||0;
    run.fusions[id]=Math.min(3,current+1);
    return {weaponId:id,fusion:run.fusions[id],changed:current<3};
  }
  if(!run.tempWeapons.includes(id)) run.tempWeapons.push(id);
  return {weaponId:id,temporary:true};
}
export function weaponStats(run,id,upgrades={}) {
  const weapon=WEAPONS[id];
  if(!weapon) throw new Error('未知武器。');
  const stacks=Math.min(3,run.fusions?.[id]||0);
  const baseDamage=weapon.damage*(1+stacks*0.15)+(upgrades?.[id]||0);
  const h=run?.hero, hpRatio=h&&Number.isFinite(h.hp)&&Number.isFinite(h.maxHp)&&h.maxHp>0?Math.max(0,Math.min(1,h.hp/h.maxHp)):1;
  const lowHealthBonus=weapon.lowHealthAttack?Math.min(4,(1-hpRatio)*8):0;
  return {...weapon,damage:baseDamage*(1+lowHealthBonus),lowHealthBonus,statusChance:stacks*0.05};
}
export function expireBuffs(run) {
  for(const [key,timers] of Object.entries(run.buffTimers||{})) {
    const expired=timers.filter(t=>t.expires<=run.time);
    if(expired.length) run.buffs[key]=Math.max(0,(run.buffs[key]||0)-expired.reduce((n,t)=>n+t.value,0));
    run.buffTimers[key]=timers.filter(t=>t.expires>run.time);
  }
}
