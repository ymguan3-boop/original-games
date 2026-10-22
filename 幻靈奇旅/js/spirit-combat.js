/* Combat presentation uses existing creature motions; world/battle scales remain independent. */
(()=>{'use strict';
 const water=s=>s?.element==='water'||s?.type==='潮';
 const outdoorMultipliers={totodile:1.2,croconaw:1.2,typhlosion:1.2,prinplup:1.2,empoleon:1.2};
 function fishingOpponents(spirits,random=Math.random){
  const pool=spirits.filter(water);if(!pool.length)return [];
  const squad=['kyogre','groudon','rayquaza'].map(id=>pool.find(s=>s.id===id));
  if(squad.every(Boolean)&&random()<.8)return squad;
  const shuffled=pool.slice();for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const result=shuffled.slice(0,3);while(result.length<3)result.push(pool[result.length%pool.length]);return result;
 }
 const find=(available,name)=>name&&available.find(k=>k.toLowerCase()===name.toLowerCase());
 function attackPlan(species,actor,skill={},configured={}){
  const strong=(skill.cost||0)>=3,path=actor.path||species.model||'',available=Object.keys(actor.actions||{});
  // 沒有專屬攻擊動作的家族：撞擊＋同色光球（普攻約 0.55 秒）／大光球（絕招約 1.15 秒），動作由 arena-fx.js 以程序方式演出
  if(window.SpiritVfx?.keyOf?.(path)==='orb')return{mode:'Idle',duration:strong?1.15:.55,nativeFx:true,procedural:true,releaseFraction:2};
  let mode=configured.animation||configured.mode,duration=Number(configured.duration)||0,nativeFx=false;
  if(window.ReplacementSpirits?.has(path)){mode=ReplacementSpirits.attack(path,strong);duration=ReplacementSpirits.duration(path,strong);nativeFx=true;}else if(window.AvianSpirits?.has(path)){mode=AvianSpirits.attack(path,strong);duration=AvianSpirits.duration(path,strong);nativeFx=true;}else if(path.startsWith('leaf-frog://')){mode=window.FrogSpirits.attack(path,strong,skill);duration=window.FrogSpirits.duration(path,strong,skill);nativeFx=true;}
  else if(window.SpiritVfx?.has(path)){mode=strong?'Ultimate':'Attack';nativeFx=true;}
  else if(path.startsWith('robot-evolution://')){mode=window.RobotSpirits.attack(path,strong);duration=window.RobotSpirits.duration(path,strong);nativeFx=true;}
  else if(/(ahong-cowboy|starlight-mage)\.glb$/.test(path))nativeFx=!!actor.duoFx;
  else if(/guanpang\.glb$/.test(path))nativeFx=!!actor.guanpangFx;
  else if(/fire-monkey-elder\.glb$/.test(path))nativeFx=true;
  else if(/fire-bear-3\.glb$/.test(path)&&!strong)nativeFx=true;   // 大熊的霸體是自身增益，不射出投射物   // C老猴：金箍棒近身打擊，不另外射出投射物（C囝仔的火球出手由遊戲火系投射物接手）
  else if(path.startsWith('light-phoenix://')){mode=/羽|Feather/i.test(skill.name||'')?'FeatherVolley':'WingBurst';duration=mode==='FeatherVolley'?2.7:2.4;nativeFx=true;}
  else if(path.startsWith('floral-deer://')){mode='Pulse';duration=duration||2.4;nativeFx=true;}
  else if(path.startsWith('outouman://')){mode='BeamPose';duration=duration||2.0;}
  else if(path.startsWith('riceball://')){mode=configured.animation||(strong?'Wave':'Roll');duration=duration||2;nativeFx=mode==='Wave';}
  if(!actor.controller){
   const candidates=[...(configured.nativeAttack===false?[]:[mode]),...(strong?['Ultimate','Special','Attack']:['Attack']),mode,'React','Takeoff','Walk','Idle'];
   mode=candidates.map(name=>find(available,name)).find(Boolean)||available[0]||'Idle';
   const action=actor.actions?.[mode],clip=action?.getClip?.();duration=clip?.duration?clip.duration/Math.max(.01,Math.abs(action.getEffectiveTimeScale?.()||1)):duration;
  }
  return{mode:mode||'Attack',duration:Math.max(.1,duration||.65),nativeFx,releaseFraction:/guanpang\.glb$/.test(path)?(strong?.655:.50):.48};
 }

 // Arena-only target adapter. Model-room controllers keep their original authored effects.
 function presentationKind(species,skill={},plan={}){
  const n=[skill.name,plan.mode].join(' ');
  if(/回滿|治癒|回血|霸體|武裝|Armor|Restore/i.test(n))return 'self';
  if(/踢|撞|啄|斧|吉他|棍|撲|衝鋒|SkyRam|WingPounce|Peck|Guitar|Kick|Ram/i.test(n))return 'melee';
  if(/胡蘿蔔|Carrot/i.test(n))return 'carrot';
  if(/回力|迴旋|Boomerang/i.test(n))return 'boomerang';
  if(/羽|Feather|PowerFlap/i.test(n))return 'feather';
  if(/泡|Bubble/i.test(n))return 'bubble';
  if(/光束|Beam/i.test(n))return 'beam';
  if(/波|Pulse|Wave|Burst/i.test(n))return 'wave';
  return 'orb';
 }
 function targetPoint(actor,T){actor.root.updateMatrixWorld(true);return actor.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,actor.worldSize.y*.55,0));}
 function targetedPresentation(o){
  const {T,species,skill,plan,attacker:a,defender:d,group}=o,kind=presentationKind(species,skill,plan);
  if(kind==='self')return null;
  const total=plan.duration,release=Math.min(total*.7,Math.max(.1,total*(plan.releaseFraction||.48))),impactAt=total*.92;
  const hidden=[];a.object.traverse(n=>{if(n.userData?.isEffect||n.userData?.effect||/^(Effects|PooledAttackEffects|ReusableEffects|ReusableLightEffects|ReusableFloralPulse)$/.test(n.name))hidden.push([n,n.visible]);});
  // Controller updates may toggle its children; suppress the parent each frame only during arena attacks.
  hidden.forEach(([n])=>n.visible=false);
  const color=kind==='carrot'?0xff8a26:kind==='boomerang'?0x51321d:species.color||0x69cfff,mat=new T.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}),geo=kind==='carrot'?new T.ConeGeometry(.15,.65,10):kind==='boomerang'?new T.TorusGeometry(.28,.065,6,12,Math.PI):kind==='wave'?new T.TorusGeometry(.3,.045,6,24):kind==='beam'?new T.CylinderGeometry(.08,.08,1,12):new T.SphereGeometry(.18,12,8),mesh=new T.Mesh(geo,mat);mesh.visible=false;group.add(mesh);const copies=Array.from({length:kind==='feather'?((skill.cost||0)>=3?18:8):kind==='bubble'?5:0},()=>{const m=new T.Mesh(geo,mat);m.visible=false;group.add(m);return m;});
  if(kind==='feather')mesh.scale.set(.45,2.5,.15);if(kind==='bubble')mat.opacity=.5;
  const hitMat=mat.clone(),hitGeo=new T.TorusGeometry(.3,.045,6,24),hit=new T.Mesh(hitGeo,hitMat);hit.visible=false;group.add(hit);
  const attackGap=Math.max(.3,(a.worldSize.z+d.worldSize.z)*.35),attackDistance=a.root.position.distanceTo(d.root.position);
  const start=new T.Vector3();let launched=false,impacted=false,disposed=false;
  function update(sec){
   if(disposed)return;hidden.forEach(([n])=>n.visible=false);
   const end=targetPoint(d,T);if(sec<release)return;
   if(!launched){start.copy(targetPoint(a,T));launched=true;}
   const u=Math.max(0,Math.min(1,(sec-release)/Math.max(.01,impactAt-release)));
   if(kind!=='melee'){
    mesh.visible=u<1;
    if(kind==='beam'){const delta=end.clone().sub(start);mesh.position.copy(start).addScaledVector(delta,.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());mesh.scale.set(1,delta.length(),1);}
    else{mesh.position.lerpVectors(start,end,u);if(kind==='carrot'||kind==='boomerang')mesh.rotation.z=sec*18;if(kind==='wave')mesh.lookAt(end);if((skill.cost||0)>=3&&kind==='orb')mesh.scale.setScalar(2.8);}
   }
   copies.forEach((m,i)=>{const v=Math.max(0,Math.min(1,(sec-release-i*.012)/Math.max(.01,impactAt-release-i*.012)));m.visible=v>0&&v<1;m.position.lerpVectors(start,end,v);const spread=Math.sin(Math.PI*v)*.38;m.position.x+=Math.sin(i*2.4)*spread;m.position.y+=Math.cos(i*2.4)*spread;m.quaternion.copy(mesh.quaternion);m.scale.copy(mesh.scale);});if(u>=1){if(!impacted){impacted=true;o.onImpact?.({point:end.clone(),kind});}hit.visible=sec<total;hit.position.copy(end);hit.lookAt(targetPoint(a,T));hit.scale.setScalar(1+(sec-impactAt)*5);hitMat.opacity=Math.max(0,1-(sec-impactAt)/Math.max(.01,total-impactAt));}
  }
  function approach(sec){if(kind!=='melee')return 0;const u=Math.max(0,Math.min(1,sec/total));return Math.max(0,attackDistance-attackGap)*(u<.42?Math.sin(Math.PI*.5*u/.42):u<.92?1:Math.cos(Math.PI*.5*(u-.92)/.08));}
  function dispose(){if(disposed)return;disposed=true;hidden.forEach(([n,v])=>n.visible=v);group.remove(mesh,hit,...copies);geo.dispose();hitGeo.dispose();mat.dispose();hitMat.dispose();}
  return {update,approach,dispose,impactAt,kind};
 }
 window.SpiritCombat={targetPoint,presentationKind,targetedPresentation,isWater:water,fishingOpponents,outdoorScale:species=>outdoorMultipliers[species.id]||1,arenaScale:species=>species.id==='kyogre'?.5:['chimchar','monferno','infernape'].includes(species.id)?1.3:1,attackPlan};
})();
