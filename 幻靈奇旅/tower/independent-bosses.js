/* Independent tower guardians. Installed inside the existing tower's closure. */
globalThis.installIndependentTowerBosses=function({LEVELS,SHOP_WEAPONS,Hunt,World,T,labels}){
 const defs=[
  {id:'chimchar',model:'ahong-cowboy',name:'落日決鬥場',en:'SUNSET SHOWDOWN',monster:'阿宏牛仔',hp:1250,kind:'cowboy',color:'#ffce8a',loot:['決鬥彈殼','牛仔徽章','落日火藥'],brief:'雙槍鎖定你的站位後不再追蹤；橫向移動避開彈道，彈雨後有反擊空檔。',patterns:['duel','barrage']},
  {id:'monferno',model:'starlight-mage',name:'星輝觀測台',en:'ASTRAL OBSERVATORY',monster:'藍金星輝法師',hp:1500,kind:'astral',color:'#91cfff',loot:['星輝碎晶','星軌核心','月光粉塵'],brief:'星彈鎖定後離開光圈；星殞依序落下，沿空白處移動，大絕後法師會露出破綻。',patterns:['starbolt','meteor']},
  {id:'infernape',model:'guanpang',name:'金印鎮守殿',en:'GOLDEN SEAL HALL',monster:'官胖',hp:1800,kind:'seal',color:'#f1d27f',loot:['金印碎片','守殿綬帶','護心玉'],brief:'金印先標出落點；震殿金印由近至遠爆發，拉開距離或翻滾穿過光圈。',patterns:['seal','decree']}
 ];
 LEVELS.push(...defs);
 SHOP_WEAPONS.push(
  {id:'duelist_recoil',type:2,name:'落日震退雙槍',effect:'knock',label:'命中 35% 擊退・傷害 +12%',chance:.35,boost:1.12,recipe:[['決鬥彈殼',6],['牛仔徽章',2]]},
  {id:'starlight_siphon',type:3,name:'星輝回生長刀',effect:'lifesteal',label:'命中回復 4 生命・傷害 +10%',chance:1,boost:1.10,recipe:[['星輝碎晶',6],['星軌核心',2]]},
  {id:'golden_ward',type:0,name:'金印護身重劍',effect:'ward',label:'所受傷害 -20%・攻擊 +15%',chance:1,boost:1.15,recipe:[['金印碎片',6],['護心玉',2]]}
 );
 Object.assign(labels,{duel:'交叉速射 · 離開鎖定圓圈',barrage:'曙光彈雨 · 沿空白處移動',starbolt:'星輝連彈 · 光圈鎖定後閃開',meteor:'天穹星殞 · 避開連續星軌',seal:'鎮守金印 · 離開金印',decree:'震殿敕令 · 光圈依序爆發'});
 const proto=Hunt.prototype,oldStart=proto.startPattern,oldResolve=proto.resolvePattern,oldClaim=proto.claimRewards,oldEffect=proto.applyWeaponEffect,oldDamage=proto.damagePlayer,oldTick=proto.tick;
 proto.tick=function(dt,input){if(!LEVELS[this.level].id||this.mode!=='battle')return oldTick.call(this,dt,input);const m=this.monster,base=m.moveMultiplier;if(m.state==='idle')m.moveMultiplier*=1.35;try{return oldTick.call(this,dt,input);}finally{m.moveMultiplier=base;}};
 proto.startPattern=function(){const l=LEVELS[this.level];if(!l.id)return oldStart.call(this);const m=this.monster,p=this.player;m.phase++;m.pattern=l.patterns[(m.phase-1)%2];m.state='windup';m.timer=m.phase%2?1.05:1.7;m.target={x:p.x,z:p.z};m.origin={x:m.x,z:m.z};m.dir={x:(p.x-m.x)/(Math.hypot(p.x-m.x,p.z-m.z)||1),z:(p.z-m.z)/(Math.hypot(p.x-m.x,p.z-m.z)||1)};m.facing=Math.atan2(m.dir.x,m.dir.z);m.attackElapsed=0;this.emit('warning',{pattern:m.pattern});
  const count=m.phase%2?3:6;
  for(let i=0;i<count;i++){let x,z,r=2.2;if(m.pattern==='duel'||m.pattern==='barrage'){x=p.x+(i%3-1)*3.8;z=p.z+Math.floor(i/3)*4-2;}else if(m.pattern==='meteor'){const a=i*Math.PI/3;x=p.x+Math.sin(a)*5;z=p.z+Math.cos(a)*5;r=2.7;}else if(m.pattern==='decree'){const a=i*Math.PI/3;x=m.x+Math.sin(a)*6;z=m.z+Math.cos(a)*6;r=3.4;}else{x=p.x+(i-1)*3.5;z=p.z;r=m.pattern==='seal'?2.8:2;}
   this.hazards.push({x:Math.max(-19,Math.min(19,x)),z:Math.max(-19,Math.min(19,z)),radius:r,timer:m.timer+.2+i*.23,life:.5,active:false,hit:false,type:m.pattern});}
 };
 proto.resolvePattern=function(){if(!LEVELS[this.level].id)return oldResolve.call(this);this.emit('impact',{pattern:this.monster.pattern});this.monster.state='recover';this.monster.timer=this.monster.phase%2?2.0:3.2;};
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
  new T.GLTFLoader().load('../'+g.userData.modelSource+'?v=independent-tower-v1',asset=>{if(token!==this.bossToken)return;const o=asset.scene;o.updateMatrixWorld(true);const box=new T.Box3().setFromObject(o),s=(level===5?5.1:3.4)/(box.max.y-box.min.y);o.scale.multiplyScalar(s);o.position.y-=box.min.y*s;g.add(o);g.nativeMixer=new T.AnimationMixer(o);g.nativeActions={};for(const c of asset.animations)g.nativeActions[c.name]=g.nativeMixer.clipAction(c);g.playNative=name=>{const options=name==='Run'?['Run','Running','Sprint','Jog','Walk','Move','Idle']:name==='Hurt'?['Hurt','Hit','Death','Idle']:[name,'Idle'];const actual=options.find(k=>g.nativeActions[k]);if(!actual||g.nativeMotion===actual)return;const anim=g.nativeActions[actual];Object.values(g.nativeActions).forEach(v=>v.fadeOut(.12));anim.reset().fadeIn(.12).play();anim.setEffectiveTimeScale(name==='Run'&&actual!=='Run'?1.55:1);g.nativeMotion=actual;};this.bossLoading=false;},undefined,e=>{if(token!==this.bossToken)return;this.bossLoading=false;g.userData.loadError=true;console.error('挑戰者模型載入失敗',e);document.getElementById('objectiveHint').textContent='模型載入失敗，請返回選關重新載入。';});return g;};
 World.prototype.load=function(level){this.bossToken=(this.bossToken||0)+1;this.bossLoading=false;oldLoad.call(this,level);if(level<3)return;const color=[0xa56f3d,0x3b659d,0x8f783b][level-3];for(let i=0;i<12;i++){const a=i*Math.PI/6,r=24,x=Math.sin(a)*r,z=Math.cos(a)*r;if(level===3){this.part(this.root,'box',0x70482d,x,1.3,z,1,2.6,.3,0,-a);this.part(this.root,'box',0xb78551,x,2.7,z,2.6,.3,.7,0,-a);}else{this.part(this.root,'cyl',color,x,2.5,z,.6,5,.6);this.part(this.root,'ball',level===4?0x69baff:0xffd471,x,5.2,z,.7,.7,.7);}}
  const ring=this.disc(15,level===4?0x64b7ff:0xffce71,.38);ring.position.y=.06;
 };
 World.prototype.render=function(h,time,...rest){oldRender.call(this,h,time,...rest);const b=this.beast;if(!LEVELS[h.level].id)return;if(b.userData.loadError){h.paused=true;return;}if(!b.nativeMixer)return;const m=h.monster,dead=h.mode!=='battle'||m.state==='dead';if(dead){b.playNative('Idle');b.nativeLastTime=time;return;}const px=b.userData.previousX??m.x,pz=b.userData.previousZ??m.z,moving=Math.hypot(m.x-px,m.z-pz)>.008;b.userData.previousX=m.x;b.userData.previousZ=m.z;const name=m.flash>0?'Hurt':m.state==='windup'||m.state==='recover'&&m.timer>1.6?(m.phase%2?'Attack':'Ultimate'):moving?'Run':'Idle';b.playNative(name);const dt=Math.max(0,Math.min(.05,time-(b.nativeLastTime??time)));b.nativeLastTime=time;if(!h.paused)b.nativeMixer.update(dt);};
 return defs;
};
