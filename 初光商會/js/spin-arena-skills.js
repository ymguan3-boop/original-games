// Visual cues use simulation time so pausing never advances a special attack.
export const SPIN_SKILL_SECONDS=1.2;
export const SPIN_SKILL_FRAMES=16;
export const SPIN_SKILL_IDS=['flame','wind','crystal','thunder','shield','shadow','frost','tide','thorn','terra','sun','nebula'];
export function activeSpinSkills(match){
 if(match?.phase!=='battle')return [];
 const actors=new Map();
 for(const effect of match.effects||[]){
  const age=match.time-effect.at,actor=effect.actor;
  if(effect.kind!=='skill'||(actor!==0&&actor!==1)||age<0||age>=SPIN_SKILL_SECONDS)continue;
  const topId=actor?match.opponentTopId:match.topId;
  if(!SPIN_SKILL_IDS.includes(topId))continue;
  actors.set(actor,{actor,topId,key:`${match.id}:${match.round}:${effect.id}`,frame:Math.min(15,Math.floor(age/SPIN_SKILL_SECONDS*SPIN_SKILL_FRAMES))});
 }
 return [...actors.values()];
}
export function createSpinSkillEffects(T,scene){
 const textures=new Map(),sprites=[null,null];let dead=false;
 function texture(id,actor){
  const key=`${actor}:${id}`;if(textures.has(key))return textures.get(key);
  const map=new T.TextureLoader().load(new URL(`../assets/spin-arena/skills/${id}-sheet.webp`,import.meta.url).href,()=>{if(dead)map.dispose();});
  map.encoding=T.sRGBEncoding;map.minFilter=T.LinearFilter;map.magFilter=T.LinearFilter;map.generateMipmaps=false;map.repeat.set(.25,.25);textures.set(key,map);return map;
 }
 function prepare(id,actor){return texture(id,actor);}
 function update(match){
  const cues=activeSpinSkills(match);
  for(let actor=0;actor<2;actor++){
   const cue=cues.find(c=>c.actor===actor);let sprite=sprites[actor];
   if(!cue){if(sprite)sprite.visible=false;continue;}
   if(!sprite){sprite=new T.Sprite(new T.SpriteMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));sprite.renderOrder=30+actor;sprite.scale.set(2.7,2.7,1);scene.add(sprite);sprites[actor]=sprite;}
   // Each actor owns its UV transform, including mirror matches.
   if(sprite.userData.topId!==cue.topId){sprite.material.map=texture(cue.topId,actor);sprite.userData.topId=cue.topId;}
   const map=sprite.material.map;map.offset.set(cue.frame%4/4,(3-Math.floor(cue.frame/4))/4);
   const body=match.bodies[actor];sprite.position.set(body.x,1.05,body.z);sprite.visible=true;sprite.userData.cue=cue;
  }
 }
 return {prepare,update,get active(){return sprites.filter(s=>s?.visible).map(s=>s.userData.cue);},dispose(){if(dead)return;dead=true;for(const sprite of sprites){if(!sprite)continue;scene.remove(sprite);sprite.material.dispose();}for(const map of textures.values())map.dispose();textures.clear();}};
}
