/* Tower adapter: shared presentation, scene-owned combat and save rules. */
(function(global){'use strict';
global.installReaperTower=function({Hunt,World,T,SHOP_WEAPONS,WEAPONS,costumeAttackBoost,costumeAttackRangeBoost}){
 const id='sword-starlight-scythe',duration=PhantomScythe.totalDuration,times=PhantomScythe.hitTimes;
 SHOP_WEAPONS.push({id,type:0,name:'星輝鐮刀',label:'星冥連舞／冥月收割',scythe:true,eventOnly:true,boost:1,chance:0,recipe:[]});
 const active=h=>h.equippedWeapon()?.id===id;
 const wrap=(proto,name,fn)=>{const old=proto[name];proto[name]=function(...args){return fn.call(this,old,...args);};};
 const stop=h=>{h.reaperSequence=null;h.player.attack=0;h.player.special=0;};
 wrap(Hunt.prototype,'purchase',function(old,key){if(key===id)return false;return old.call(this,key);});
 wrap(Hunt.prototype,'load',function(old,...args){this.reaperSequence=null;return old.apply(this,args);});
 wrap(Hunt.prototype,'switchWeapon',function(old,...args){if(this.reaperSequence)return false;return old.apply(this,args);});
 function start(h,strong,heavy){const p=h.player,m=h.monster,cost=heavy?24:14;if(h.mode!=='battle'||h.paused||h.reaperSequence||h.ultimateSequence||p.dodge>0||(strong&&(p.ultimateCd>0||p.special>0)))return false;
  if(!strong&&(p.cooldown>0||p.stamina<cost))return false;
  if(Math.hypot(p.x-m.x,p.z-m.z)>(strong?6.2:4.4)*costumeAttackRangeBoost())return false;
  h.engaged=true;if(strong){p.ultimateCd=18;p.invulnerable=duration+.2;p.special=duration;h.emit('ultimate',{name:'冥月收割',weapon:0,x:p.x,z:p.z,scythe:true});}else p.stamina-=cost;
  p.attack=duration;p.cooldown=duration+.08;p.facing=Math.atan2(m.x-p.x,m.z-p.z);p.scytheAttackId=(p.scytheAttackId||0)+1;p.scytheUltimate=strong;
  h.reaperSequence={elapsed:0,index:0,strong,heavy,heading:p.facing};return true;
 }
 wrap(Hunt.prototype,'attack',function(old,heavy=false){return active(this)?start(this,false,heavy):old.call(this,heavy);});
 wrap(Hunt.prototype,'unleash',function(old){return active(this)?start(this,true,false):old.call(this);});
 wrap(Hunt.prototype,'dodge',function(old,...args){if(this.reaperSequence?.strong)return false;const ok=old.apply(this,args);if(ok&&this.reaperSequence)stop(this);return ok;});
 wrap(Hunt.prototype,'damagePlayer',function(old,...args){const hit=old.apply(this,args);if(hit&&this.reaperSequence)stop(this);return hit;});
 wrap(Hunt.prototype,'tick',function(old,dt,input){const seq=this.reaperSequence;const result=old.call(this,dt,input);if(!seq||this.reaperSequence!==seq||this.paused)return result;if(this.mode!=='battle'||this.player.hp<=0){stop(this);return result;}
  seq.elapsed+=Math.max(0,Math.min(.05,dt));this.player.facing=seq.heading;
  while(seq.index<times.length&&seq.elapsed>=times[seq.index]){const i=seq.index++,final=i===4,p=this.player,m=this.monster,range=(final&&seq.strong?6.2:4.4)*costumeAttackRangeBoost();
   if(Math.hypot(p.x-m.x,p.z-m.z)<=range){const amount=Math.round(WEAPONS[0].damage*(seq.strong?(final?2.6:1.6):seq.heavy?1:.8)*(1+this.cardBoost()/100)*(p.attackBoostTime>0?1.25:1)*costumeAttackBoost());this.damageMonster(amount,seq.heavy||seq.strong,seq.strong);}
   if(final&&seq.strong)this.reaperWave={serial:(this.reaperWave?.serial||0)+1,x:p.x,z:p.z};if(this.mode!=='battle')break;
  }if(seq.elapsed>=duration||this.mode!=='battle')this.reaperSequence=null;return result;
 });
 wrap(World.prototype,'loadHero',async function(old,...args){const g=await old.apply(this,args);const asset=await new Promise((resolve,reject)=>new T.GLTFLoader().load('../models/props/starlight-scythe.glb?v=20261029-reaper-v1',resolve,undefined,reject));g.scytheOptions={THREE:T,model:g.model,clips:this.heroAsset.animations,weapon:asset.scene,volume:1};g.scythe=PhantomScythe.create(g.scytheOptions);return g;});
 wrap(World.prototype,'render',function(old,h,dt,movement){this.reaperHunt=h;this.reaperEnabled=active(h);const result=old.call(this,h,dt,movement);if(this.reaperEnabled){for(const key of ['arc','slash','specialBeam'])if(this[key])this[key].visible=false;const wave=h.reaperWave;if(wave&&wave.serial!==this.reaperWaveSerial){this.reaperWaveSerial=wave.serial;this.fxRing(wave.x,wave.z,0x75deff,6.2,.8,.9);this.fxBurst(wave.x,wave.z,0xb4eaff,24,7);this.shake=.4;}}return result;});
 wrap(World.prototype,'ultimate',function(old,...args){if(!this.reaperEnabled)return old.apply(this,args);});
 wrap(World.prototype,'animateHero',function(old,p,dt,movement){old.call(this,p,dt,movement);const g=this.hunter,h=this.reaperHunt;if(!g.scythe)return;const costume=PhantomReaperEvent.read().costume||'trainer';if(g.reaperCostume!==costume){global.PhantomTowerCostumeApply?.(g.model,costume);g.reaperCostume=costume;}
  if(this.reaperEnabled){g.weapons.forEach(w=>w.visible=false);g.offhands.forEach(w=>{if(w)w.visible=false;});}
  g.scytheOptions.volume=(global.PhantomBgm?.sfxVolume??70)/100;
  g.scythe.update(h?.paused?0:dt,{enabled:this.reaperEnabled,motion:p.hp<=0?'Death':p.dodge>0?'Roll':this.heroHurt>0&&!h.reaperSequence?'Hurt':movement?'Run':'Idle',cancel:!h?.reaperSequence,attack:!!h?.reaperSequence,attackId:p.scytheAttackId,ultimate:p.scytheUltimate,sound:!global.PhantomBgm?.sfxMuted});
 });
};
})(globalThis);
