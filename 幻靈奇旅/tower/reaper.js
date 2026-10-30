/* Tower adapter: shared presentation, scene-owned combat and save rules. */
(function(global){'use strict';
global.installReaperTower=function({Hunt,World,T,SHOP_WEAPONS,WEAPONS,costumeAttackBoost,costumeAttackRangeBoost,onSound=()=>{}}){
 const id='sword-starlight-scythe',duration=PhantomScythe.totalDuration,times=PhantomScythe.hitTimes;
 SHOP_WEAPONS.push({id,type:0,name:'死神鐮刀',label:'星冥連舞／冥月收割',category:'鐮刀',description:'使用鐮刀擊殺魔物後，普攻速度+50%，持續10秒；再次擊殺只刷新時間、不疊加。冥月收割：無須鎖定，演出結束後全場造成當時加成攻擊力5倍的基礎傷害，並回復該攻擊力3%的生命（受生命上限限制）',scythe:true,eventOnly:true,boost:1,chance:0,recipe:[]});
 const active=h=>h.equippedWeapon()?.id===id;
 const wrap=(proto,name,fn)=>{const old=proto[name];proto[name]=function(...args){return fn.call(this,old,...args);};};
 const stop=h=>{h.reaperSequence=null;h.player.attack=0;h.player.special=0;};
 wrap(Hunt.prototype,'purchase',function(old,key){if(key===id)return false;return old.call(this,key);});
 wrap(Hunt.prototype,'load',function(old,...args){const carry=this.mode==='victory'&&args[0]>this.level?this.reaperHaste||0:0;this.reaperSequence=null;this.reaperSlashes=[];const result=old.apply(this,args);this.reaperHaste=carry;return result;});
 wrap(Hunt.prototype,'switchWeapon',function(old,...args){if(this.reaperSequence)return false;return old.apply(this,args);});
 const effectiveAttack=h=>WEAPONS[0].damage*(1+h.cardBoost()/100)*(h.player.attackBoostTime>0?1.25:1)*costumeAttackBoost();
 function start(h,strong,heavy){const p=h.player,m=h.monster,cost=heavy?24:14;if(h.mode!=='battle'||h.paused||p.hp<=0||h.reaperSequence||h.ultimateSequence||p.dodge>0||(strong&&(p.ultimateCd>0||p.special>0)))return false;
  if(!strong&&(p.cooldown>0||p.stamina<cost||Math.hypot(p.x-m.x,p.z-m.z)>4.4*costumeAttackRangeBoost()))return false;
  const speed=!strong&&h.reaperHaste>0?1.5:1,span=strong?3.6:duration/speed;
  h.engaged=true;if(strong){p.ultimateCd=18;p.invulnerable=span+.2;p.special=span;h.emit('ultimate',{name:'冥月收割',weapon:0,x:p.x,z:p.z,scythe:true});}else {p.stamina-=cost;p.facing=Math.atan2(m.x-p.x,m.z-p.z);}
  p.attack=span;p.cooldown=span+.08;p.scytheAttackId=(p.scytheAttackId||0)+1;p.scytheUltimate=strong;
  h.reaperSequence={elapsed:0,index:0,strong,heavy,heading:p.facing,speed,duration:span};return true;
 }
 wrap(Hunt.prototype,'attack',function(old,heavy=false){return active(this)?start(this,false,heavy):old.call(this,heavy);});
 wrap(Hunt.prototype,'unleash',function(old){return active(this)?start(this,true,false):old.call(this);});
 wrap(Hunt.prototype,'dodge',function(old,...args){if(this.reaperSequence?.strong)return false;const ok=old.apply(this,args);if(ok&&this.reaperSequence)stop(this);return ok;});
 wrap(Hunt.prototype,'damagePlayer',function(old,...args){const hit=old.apply(this,args);if(hit&&this.reaperSequence&&!this.reaperSequence.strong)stop(this);return hit;});
 wrap(Hunt.prototype,'tryMonsterDodge',function(old,...args){return this.reaperSequence?.strong&&this.reaperSequence.resolved?false:old.apply(this,args);});
 wrap(Hunt.prototype,'damageMonster',function(old,...args){const before=this.monster.hp,result=old.apply(this,args);if(active(this)&&result&&before>0&&this.monster.hp<=0)this.reaperHaste=10;return result;});
 wrap(Hunt.prototype,'tick',function(old,dt,input){const seq=this.reaperSequence,step=this.paused?0:Math.max(0,Math.min(.05,dt));if(['battle','loot','victory'].includes(this.mode))this.reaperHaste=Math.max(0,(this.reaperHaste||0)-step);const result=old.call(this,dt,input);if(!seq||this.reaperSequence!==seq||this.paused)return result;if(this.mode!=='battle'||this.player.hp<=0){stop(this);return result;}
  seq.elapsed+=step;this.player.facing=seq.heading;const p=this.player;
  if(seq.strong){if(seq.elapsed>=seq.duration&&!seq.resolved){seq.resolved=true;const attack=effectiveAttack(this);this.damageMonster(Math.round(attack*5),true,true);const healed=Math.max(0,Math.min(150-p.hp,attack*.03));if(p.hp>0)p.hp+=healed;this.reaperWave={serial:(this.reaperWave?.serial||0)+1,x:p.x,z:p.z,healed};}}
  else while(seq.index<times.length&&seq.elapsed*seq.speed>=times[seq.index]){const i=seq.index++,m=this.monster,range=4.4*costumeAttackRangeBoost();
   (this.reaperSlashes||=[]).push({x:p.x,z:p.z,heading:p.facing,range,index:i});onSound({kind:'scythe',phase:'release'});
   if(Math.hypot(p.x-m.x,p.z-m.z)<=range)this.damageMonster(Math.round(effectiveAttack(this)*(seq.heavy?1:.8)),seq.heavy,false);
   if(this.mode!=='battle')break;
  }if(seq.elapsed>=seq.duration||this.mode!=='battle')this.reaperSequence=null;return result;
 });
 wrap(World.prototype,'loadHero',async function(old,...args){const g=await old.apply(this,args);const asset=await new Promise((resolve,reject)=>new T.GLTFLoader().load('../models/props/starlight-scythe.glb?v=20261029-reaper-v1',resolve,undefined,reject));g.scytheOptions={THREE:T,model:g.model,clips:this.heroAsset.animations,weapon:asset.scene,volume:1,sound:false};g.scythe=PhantomScythe.create(g.scytheOptions);this.reaperFx=PhantomReaperEffects.create({THREE:T,scene:this.scene,camera:this.camera,weapon:asset.scene,onSound});await this.reaperFx.ready;return g;});
 wrap(World.prototype,'render',function(old,h,dt,movement){this.reaperHunt=h;this.reaperEnabled=active(h);const c=h.reaperSequence;
  for(const ev of h.reaperSlashes||[])this.reaperFx?.slash(ev);h.reaperSlashes=[];
  this.reaperFx?.update(this.reaperEnabled&&c?.strong&&h.mode==='battle'&&h.player.hp>0?{id:h.player.scytheAttackId,elapsed:c.elapsed,hero:h.player}:null,h.paused?0:dt);
  if(this.reaperEnabled){for(const key of ['arc','slash','specialBeam'])if(this[key])this[key].visible=false;const wave=h.reaperWave;if(wave&&wave.serial!==this.reaperWaveSerial){this.reaperWaveSerial=wave.serial;this.fxRing(wave.x,wave.z,0x75deff,12,.8,.9);if(wave.healed)this.fxRing(wave.x,wave.z,0x66ffb0,2,.8,.9);this.shake=.4;}}
  return old.call(this,h,dt,movement);
 });
 wrap(World.prototype,'dispose',function(old,...args){this.reaperFx?.dispose();this.hunter?.scythe?.dispose();return old.apply(this,args);});
 wrap(World.prototype,'ultimate',function(old,...args){if(!this.reaperEnabled)return old.apply(this,args);});
 wrap(World.prototype,'animateHero',function(old,p,dt,movement){old.call(this,p,dt,movement);const g=this.hunter,h=this.reaperHunt;if(!g.scythe)return;const costume=PhantomReaperEvent.read().costume||'trainer';if(g.reaperCostume!==costume){global.PhantomTowerCostumeApply?.(g.model,costume);g.reaperCostume=costume;}
  if(this.reaperEnabled){g.weapons.forEach(w=>w.visible=false);g.offhands.forEach(w=>{if(w)w.visible=false;});}
  g.scytheOptions.volume=(global.PhantomBgm?.sfxVolume??70)/100;
  g.scythe.update(h?.paused?0:dt,{enabled:this.reaperEnabled,motion:p.hp<=0?'Death':p.dodge>0?'Roll':this.heroHurt>0&&!h.reaperSequence?'Hurt':movement?'Run':'Idle',cancel:!h?.reaperSequence||!!h.reaperSequence.strong,speed:h?.reaperSequence?.speed||1,attack:!!h?.reaperSequence&&!h.reaperSequence.strong,attackId:p.scytheAttackId,ultimate:p.scytheUltimate,sound:!global.PhantomBgm?.sfxMuted});
 });
};
})(globalThis);
