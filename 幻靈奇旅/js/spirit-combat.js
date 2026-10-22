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
 window.SpiritCombat={isWater:water,fishingOpponents,outdoorScale:species=>outdoorMultipliers[species.id]||1,arenaScale:species=>species.id==='kyogre'?.5:1,attackPlan};
})();
