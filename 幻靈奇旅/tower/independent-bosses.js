/* Independent tower guardians. Installed inside the existing tower's closure. */
globalThis.installIndependentTowerBosses=function({LEVELS,SHOP_WEAPONS,Hunt,World,T,labels}){
 const defs=[
  {id:'chimchar',model:'ahong-cowboy',castRate:1.4,name:'落日決鬥場',en:'SUNSET SHOWDOWN',monster:'阿宏牛仔',hp:1250,kind:'cowboy',color:'#ffce8a',loot:['決鬥彈殼','牛仔徽章','落日火藥'],brief:'雙槍鎖定你的站位後不再追蹤；橫向移動避開彈道，彈雨後有反擊空檔。',patterns:['duel','barrage']},
  {id:'monferno',model:'starlight-mage',castRate:1.4,name:'星輝觀測台',en:'ASTRAL OBSERVATORY',monster:'藍金星輝法師',hp:1500,kind:'astral',color:'#91cfff',loot:['星輝碎晶','星軌核心','月光粉塵'],brief:'星彈鎖定後離開光圈；星殞依序落下，沿空白處移動，大絕後法師會露出破綻。',patterns:['starbolt','meteor']},
  {id:'infernape',model:'guanpang',castRate:1.4,name:'金印鎮守殿',en:'GOLDEN SEAL HALL',monster:'官胖',hp:1800,kind:'seal',color:'#f1d27f',loot:['金印碎片','守殿綬帶','護心玉'],brief:'金印先標出落點；震殿金印由近至遠爆發，拉開距離或翻滾穿過光圈。',patterns:['seal','decree']}
 ];
 LEVELS.push(...defs);
 SHOP_WEAPONS.push(
  {id:'duelist_recoil',type:2,name:'落日震退雙槍',effect:'knock',label:'命中 35% 擊退・傷害 +12%',chance:.35,boost:1.12,recipe:[['決鬥彈殼',120],['牛仔徽章',40]]},
  {id:'starlight_siphon',type:3,name:'星輝回生長刀',effect:'lifesteal',label:'命中回復 4 生命・傷害 +10%',chance:1,boost:1.10,recipe:[['星輝碎晶',120],['星軌核心',40]]},
  {id:'golden_ward',type:0,name:'金印護身重劍',effect:'ward',label:'所受傷害 -20%・攻擊 +15%',chance:1,boost:1.15,recipe:[['金印碎片',120],['護心玉',40]]}
 );
 Object.assign(labels,{duel:'交叉速射 · 離開鎖定圓圈',barrage:'曙光彈雨 · 沿空白處移動',starbolt:'星輝連彈 · 光圈鎖定後閃開',meteor:'天穹星殞 · 避開連續星軌',seal:'鎮守金印 · 離開金印',decree:'震殿敕令 · 光圈依序爆發'});
 const proto=Hunt.prototype,oldStart=proto.startPattern,oldResolve=proto.resolvePattern,oldClaim=proto.claimRewards,oldEffect=proto.applyWeaponEffect,oldDamage=proto.damagePlayer,oldTick=proto.tick,oldUnleash=proto.unleash;
 proto.tick=function(dt,input){if(!LEVELS[this.level].id||this.mode!=='battle')return oldTick.call(this,dt,input);const m=this.monster,base=m.moveMultiplier;if(m.state==='idle')m.moveMultiplier*=1.35;try{return oldTick.call(this,dt,input);}finally{m.moveMultiplier=base;}};
 proto.startPattern=function(){const l=LEVELS[this.level];if(!l.id)return oldStart.call(this);const m=this.monster,p=this.player;m.phase++;m.pattern=l.patterns[(m.phase-1)%2];m.state='windup';m.timer=(m.phase%2?1.05:1.7)/l.castRate;m.target={x:p.x,z:p.z};m.origin={x:m.x,z:m.z};m.dir={x:(p.x-m.x)/(Math.hypot(p.x-m.x,p.z-m.z)||1),z:(p.z-m.z)/(Math.hypot(p.x-m.x,p.z-m.z)||1)};m.facing=Math.atan2(m.dir.x,m.dir.z);m.attackElapsed=0;this.emit('warning',{pattern:m.pattern});
  const count=m.phase%2?3:6;
  for(let i=0;i<count;i++){let x,z,r=2.2;if(m.pattern==='duel'||m.pattern==='barrage'){x=p.x+(i%3-1)*3.8;z=p.z+Math.floor(i/3)*4-2;}else if(m.pattern==='meteor'){const a=i*Math.PI/3;x=p.x+Math.sin(a)*5;z=p.z+Math.cos(a)*5;r=2.7;}else if(m.pattern==='decree'){const a=i*Math.PI/3;x=m.x+Math.sin(a)*6;z=m.z+Math.cos(a)*6;r=3.4;}else{x=p.x+(i-1)*3.5;z=p.z;r=m.pattern==='seal'?2.8:2;}
   this.hazards.push({x:Math.max(-19,Math.min(19,x)),z:Math.max(-19,Math.min(19,z)),radius:r,timer:m.timer+(.2+i*.23)/l.castRate,life:.5,active:false,hit:false,type:m.pattern,phase:m.phase});}
 };
 proto.resolvePattern=function(){if(!LEVELS[this.level].id)return oldResolve.call(this);for(const hazard of this.hazards)if(hazard.phase===this.monster.phase)hazard.released=true;this.emit('impact',{pattern:this.monster.pattern});this.monster.state='recover';this.monster.timer=(this.monster.phase%2?2.0:3.2)/LEVELS[this.level].castRate;};

 // Player finishers may cancel a warning, but cannot erase attacks already emitted.
 proto.unleash=function(...args){if(!LEVELS[this.level].id)return oldUnleash.apply(this,args);const released=this.hazards.filter(hazard=>hazard.released),used=oldUnleash.apply(this,args);if(used)for(const hazard of released)if(!this.hazards.includes(hazard))this.hazards.push(hazard);return used;};
 proto.claimRewards=function(){
 const l=LEVELS[this.level];
 if(!l.id)return oldClaim.call(this);
 if(this.rewarded||this.mode!=='loot')return false;
 this.rewarded=true;this.guardianRewardGranted=false;
 const m=this.monster;
 const rewards=[{name:l.monster+'卡片',count:1,card:true},{name:l.loot[0],count:3,card:false},{name:l.loot[1],count:1,card:false},{name:l.loot[2],count:1,card:false}];
 this.loot=rewards.map((item,i)=>{
  const angle=i*Math.PI*2/rewards.length+.28,radius=2.8+(i%2)*.9;
  let x=m.x+Math.cos(angle)*radius,z=m.z+Math.sin(angle)*radius;
  const distance=Math.hypot(x,z)||1,k=Math.min(1,19.3/distance);
  return {...item,id:this.save.kills*32+i+1,x:x*k,z:z*k};
 });
 if(!this.save.cleared.includes(this.level))this.save.cleared.push(this.level);
 this.save.kills++;
 this.save.defeatedCounts[this.level]=this.bossPriorWins()+1;
 this.emit('lootSpawn',{drops:this.loot.map(drop=>({...drop}))});
 return true;
 };
 const oldCollectLoot=proto.collectLoot;
 proto.collectLoot=function(dt,input){
  const wasLoot=this.mode==='loot',level=this.level;
  const result=oldCollectLoot.call(this,dt,input);
  if(wasLoot&&this.mode==='victory'&&LEVELS[level].id&&!this.guardianRewardGranted){
   this.guardianRewardGranted=true;this.save.spiritGrants||={};
   const id=LEVELS[level].id;
   this.save.spiritGrants[id]=(this.save.spiritGrants[id]||0)+1;
  }
  return result;
 };
 proto.applyWeaponEffect=function(){const w=this.equippedWeapon();if(w?.effect==='lifesteal'&&this.mode==='battle'){this.player.hp=Math.min(150,this.player.hp+4);return;}if(w?.effect==='ward')return;return oldEffect.call(this);};
 proto.damagePlayer=function(n){return oldDamage.call(this,n*(this.equippedWeapon()?.effect==='ward'?.8:1));};
 const oldMake=World.prototype.makeMonster,oldRender=World.prototype.render,oldLoad=World.prototype.load,oldImpact=World.prototype.bossImpact;
 World.prototype.bossImpact=function(pattern,m,hazards){if(!LEVELS[this.level].id)return oldImpact.call(this,pattern,m,hazards);const color=this.level===3?0xffd36b:this.level===4?0x75bbff:0xffda62;for(const hz of hazards){this.fxRing(hz.x,hz.z,color,hz.radius,.5,.8);this.fxBurst(hz.x,hz.z,color,pattern==='meteor'?18:9,5);}if(this.level===3){this.fxBurst(m.x,m.z,0xffce65,16,7);for(const hz of hazards)this.fxShard(hz.x,hz.z,0xffe9a1,{arrow:true});}else if(this.level===4){this.fxRing(m.x,m.z,0x9582ff,5.5,1,.8);this.fxBurst(m.x,m.z,0xb0e9ff,24,9);}else{this.fxRing(m.x,m.z,0xffd170,8,.8,.8);this.shake=Math.max(this.shake,.55);}};
 World.prototype.makeMonster=function(level){const l=LEVELS[level];if(!l.id)return oldMake.call(this,level);const g=this.group(this.root);g.body=this.group(g);g.head=this.group(g);g.tail=this.group(g);g.legs=[];g.wings=[];g.userData.modelSource='models/spirits/'+l.model+'.glb';this.bossLoading=true;
  const token=this.bossToken=(this.bossToken||0)+1;
  this.bossReady=new Promise((resolve,reject)=>{new T.GLTFLoader().load('../'+g.userData.modelSource+'?v=independent-tower-v1',asset=>{if(token!==this.bossToken)return;const o=asset.scene;o.updateMatrixWorld(true);const box=new T.Box3().setFromObject(o),s=(level===5?5.1:3.4)/(box.max.y-box.min.y);o.scale.multiplyScalar(s);o.position.y-=box.min.y*s;g.add(o);g.nativeMixer=new T.AnimationMixer(o);g.nativeActions={};for(const c of asset.animations)g.nativeActions[c.name]=g.nativeMixer.clipAction(c);// Match actions provided by each GLB at runtime; avoid relying on invented clip names.
 const nativeNames=Object.keys(g.nativeActions);
 const exact=names=>names.map(n=>nativeNames.find(k=>k.toLowerCase()===n.toLowerCase())).find(Boolean);
 const roleClip=role=>{
  const aliases={
   Idle:['Idle','Idle_01','Stand','Breath','Rest'],
   Run:['Run','Running','Sprint','Jog','RunCycle','Walk','Walking','Move'],
   Attack:['Attack','Attack_01','NormalAttack','BasicAttack','Attack1','Shoot','Fire','Punch','Slash','普攻'],
   Ultimate:['Ultimate','UltimateAttack','Special','SpecialAttack','Skill','SkillAttack','Finisher','Burst','大絕'],
   Hurt:['Hurt','Hit','HitReact','Damage','TakeDamage','Injured','受擊'],
   Death:['Death','Die','Dying','Defeat','Fall','死亡']
  };
  const pattern={Idle:/idle|stand|rest|breath/i,Run:/run|sprint|jog|walk|move|跑|走/i,Attack:/attack|shoot|fire|slash|punch|normal|basic|普攻|攻擊/i,Ultimate:/ultimate|special|skill|burst|finisher|大絕|必殺/i,Hurt:/hurt|hit|damage|react|受擊/i,Death:/death|dying|defeat|fall|死亡/i}[role];
  return exact(aliases[role]||[role])||nativeNames.find(name=>pattern?.test(name))||(role==='Run'?roleClip('Idle'):role==='Ultimate'?roleClip('Attack'):role==='Death'?roleClip('Hurt'):role==='Hurt'?roleClip('Idle'):nativeNames[0]);
 };
 g.nativeClipFor=role=>roleClip(role);
 g.userData.nativeClips=nativeNames.slice();
 g.playNative=(role,{duration,force=false,resume=false}={})=>{
  const chosen=roleClip(role);
  if(!chosen||(!force&&g.nativeMotion===chosen))return;
  const action=g.nativeActions[chosen],single=['Attack','Ultimate','Hurt','Death'].includes(role);
  Object.values(g.nativeActions).forEach(other=>{if(other!==action)other.fadeOut(.12);});
  if(!resume)action.reset();action.enabled=true;action.paused=false;action.fadeIn(.12);
  action.setLoop(single?T.LoopOnce:T.LoopRepeat,single?1:Infinity);
  action.clampWhenFinished=single;
  const clipTime=action.getClip()?.duration||1;
  const rate=['Attack','Ultimate'].includes(role)?l.castRate:duration&&single?Math.max(.55,Math.min(2.2,clipTime/Math.max(.3,duration))):role==='Run'&&/walk|move/i.test(chosen)?1.65:1;
  action.setEffectiveTimeScale(rate).play();
  g.nativeMotion=chosen;
 };this.bossLoading=false;resolve(g);},undefined,e=>{if(token!==this.bossToken)return;this.bossLoading=false;g.userData.loadError=true;console.error('挑戰者模型載入失敗',e);document.getElementById('objectiveHint').textContent='模型載入失敗，請返回選關重新載入。';reject(e instanceof Error?e:Error('挑戰者模型載入失敗'));});});return g;};
 World.prototype.load=function(level){this.bossToken=(this.bossToken||0)+1;this.bossLoading=false;this.bossReady=null;oldLoad.call(this,level);if(level<3)return;const color=[0xa56f3d,0x3b659d,0x8f783b][level-3];for(let i=0;i<12;i++){const a=i*Math.PI/6,r=24,x=Math.sin(a)*r,z=Math.cos(a)*r;if(level===3){this.part(this.root,'box',0x70482d,x,1.3,z,1,2.6,.3,0,-a);this.part(this.root,'box',0xb78551,x,2.7,z,2.6,.3,.7,0,-a);}else{this.part(this.root,'cyl',color,x,2.5,z,.6,5,.6);this.part(this.root,'ball',level===4?0x69baff:0xffd471,x,5.2,z,.7,.7,.7);}}
  const ring=this.disc(15,level===4?0x64b7ff:0xffce71,.38);ring.position.y=.06;
 };
 // `dt` is the frame delta from World.render, never an absolute clock.
 // Update the rig BEFORE base render submits the scene to WebGL.
 World.prototype.render=function(h,dt,...rest){
  const b=this.beast,l=LEVELS[h.level];
  if(l?.id&&b){
   if(b.userData.loadError)h.paused=true;
   else if(b.nativeMixer){
    const step=h.paused?0:Math.max(0,Math.min(.1,Number(dt)||0));
    const m=h.monster,state=b.userData.nativePlayback||(b.userData.nativePlayback={phase:null,attack:null,hurtRemaining:0,wasFlashing:false,deathElapsed:0,dead:false});
    const dead=h.mode==='loot'||h.mode==='victory'||m.state==='dead';
    const px=b.userData.previousX??m.x,pz=b.userData.previousZ??m.z;
    const moving=Math.hypot(m.x-px,m.z-pz)>.0001;
    b.userData.previousX=m.x;b.userData.previousZ=m.z;
    if(dead){
     if(!state.dead){state.dead=true;state.deathElapsed=0;state.attack=null;b.playNative('Death',{force:true});}
     const clip=b.nativeActions[b.nativeClipFor('Death')];
     const duration=clip?.getClip().duration||.8;
     if(state.deathElapsed<duration){b.nativeMixer.update(step);state.deathElapsed+=step;}
    }else{
     state.dead=false;
     // A started cast owns its animation until completion. Queue reactions instead of fading it out.
     const casting=()=>state.attack?.started&&state.attack.elapsed<state.attack.duration;
     if(m.state==='windup'&&state.phase!==m.phase){
      state.phase=m.phase;const role=m.phase%2?'Attack':'Ultimate';
      const clip=b.nativeActions[b.nativeClipFor(role)];
      const cast={role,elapsed:0,duration:(clip?.getClip().duration||1)/l.castRate,rate:l.castRate,started:false};
      if(casting())state.nextAttack=cast;else state.attack=cast;
     }
     const flashing=m.flash>0;
     if(flashing&&!state.wasFlashing){
      if(casting())state.hurtPending=true;
      else{
       const clip=b.nativeActions[b.nativeClipFor('Hurt')];
       state.hurtPending=false;state.hurtRemaining=clip?.getClip().duration||.75;
       b.playNative('Hurt',{force:true});
      }
     }
     if(state.attack&&state.attack.elapsed>=state.attack.duration)state.attack=null;
     if(!state.attack&&state.hurtPending&&state.hurtRemaining<=0){
      state.hurtPending=false;state.hurtRemaining=b.nativeActions[b.nativeClipFor('Hurt')]?.getClip().duration||.75;
      b.playNative('Hurt',{force:true});
     }
     if(!state.attack&&state.hurtRemaining<=0&&state.nextAttack){state.attack=state.nextAttack;state.nextAttack=null;}
     state.wasFlashing=flashing;
     if(state.hurtRemaining>0){
      state.hurtRemaining=Math.max(0,state.hurtRemaining-step);
      b.nativeMixer.update(step);
     }else if(state.attack&&state.attack.elapsed<state.attack.duration){
      const cast=state.attack;
      b.playNative(cast.role,{force:!cast.started,resume:cast.started});
      cast.started=true;cast.elapsed+=step;b.nativeMixer.update(step);
     }else{
      state.attack=null;
      const role=m.state==='idle'&&moving?'Run':'Idle';
      b.playNative(role);b.nativeMixer.update(step);
     }
    }
    const current=b.nativeActions[b.nativeMotion];
    b.userData.nativeAnimation={role:b.nativeMotion,time:current?.time||0,phase:state.phase,castElapsed:state.attack?.elapsed||0,castRate:l.castRate,castDuration:state.attack?.duration||0,castLocked:!!state.attack?.started,hurtPending:!!state.hurtPending,hurtRemaining:state.hurtRemaining,delta:step};
   }
  }
  return oldRender.call(this,h,dt,...rest);
 };
 return defs;
};
