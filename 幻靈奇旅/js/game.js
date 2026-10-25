/* 幻靈奇旅 — Blender GLB assets and user-supplied native Three.js character families. */
(() => {
'use strict';
// 三色蛋：武裝（金色護盾＋對手攻擊減半）與回滿（治癒光柱）的誇張特效
function eggSkillFx(kind,owner,opponent){
 const g=new T.Group(),disposables=[],add=(geo,mat)=>{const m=new T.Mesh(geo,mat);disposables.push(geo,mat);g.add(m);return m;};
 const glow=(color,opacity=.8)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
 const at=owner.actor.root.position.clone(),h=Math.max(1.6,owner.actor.height||1.6),foe=opponent.actor.root.position.clone();
 g.position.set(0,0,0);battleGroup.add(g);
 const rings=[0,1,2].map(i=>{const r=add(new T.RingGeometry(.86,1,64),glow(kind==='armour'?0xffd34d:0x7dffb0,.9));r.rotation.x=-Math.PI/2;r.position.set(at.x,.08+i*.01,at.z);return r;});
 const sparks=Array.from({length:46},(_,i)=>{const m=add(kind==='armour'?new T.OctahedronGeometry(.12,0):new T.SphereGeometry(.09,6,4),glow(i%3?(kind==='armour'?0xffe27a:0x9dffc7):0xffffff,.95));const a=i/46*Math.PI*2*3,r=.6+Math.random()*1.3;m.userData={a,r,v:2.5+Math.random()*3,d:Math.random()*.3};m.position.copy(at);return m;});
 let dome,pillar,core,chevrons=[];
 if(kind==='armour'){
  dome=add(new T.IcosahedronGeometry(h*.85,1),new T.MeshBasicMaterial({color:0xffd34d,wireframe:true,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending}));
  core=add(new T.SphereGeometry(h*.82,32,20),glow(0xffc93a,.25));dome.position.copy(at).setY(h*.5);core.position.copy(dome.position);
  chevrons=Array.from({length:10},(_,i)=>{const c=add(new T.ConeGeometry(.22,.5,4),glow(0xb06bff,.95));c.rotation.x=Math.PI;const a=i/10*Math.PI*2;c.userData={a};c.position.set(foe.x+Math.cos(a)*1.1,3.5,foe.z+Math.sin(a)*1.1);return c;});
 }else{
  pillar=add(new T.CylinderGeometry(1,1.2,1,40,1,true),new T.MeshBasicMaterial({color:0x2fcf74,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide}));core=add(new T.CylinderGeometry(.4,.5,1,24,1,true),new T.MeshBasicMaterial({color:0xb8ffd2,transparent:true,opacity:.55,depthWrite:false,side:T.DoubleSide}));
  for(const m of [pillar,core]){m.position.copy(at);}
 }
 const duration=kind==='armour'?2.4:2.6,ease=v=>1-Math.pow(1-Math.min(1,Math.max(0,v)),3);
 addEffect({object:g,start:elapsed,duration,update:t=>{
  rings.forEach((r,i)=>{const u=Math.max(0,t*1.6-i*.18);r.scale.setScalar(.2+ease(u)*(kind==='armour'?4.2:3.4));r.material.opacity=.9*Math.max(0,1-u);});
  sparks.forEach(m=>{const u=Math.max(0,t-m.userData.d),a=m.userData.a+u*(kind==='armour'?4:7),r=m.userData.r*(kind==='armour'?1+u*.8:1-u*.5);m.position.set(at.x+Math.cos(a)*r,.2+u*m.userData.v*(kind==='armour'?.8:1.4),at.z+Math.sin(a)*r);m.material.opacity=.95*Math.max(0,1-u*1.1);m.rotation.y+=.2;});
  if(kind==='armour'){
   const pop=t<.25?ease(t/.25)*1.35:1.35-.35*ease((t-.25)/.25);dome.scale.setScalar(Math.max(.01,pop));core.scale.setScalar(Math.max(.01,pop));dome.rotation.y=t*3;dome.rotation.x=t*1.3;
   const fade=t>.75?1-(t-.75)/.25:1;dome.material.opacity=.9*fade;core.material.opacity=(.25+.2*Math.sin(t*30))*fade;
   chevrons.forEach((c,i)=>{const u=Math.max(0,t*1.4-.25-i*.03);c.position.y=Math.max(.3,3.5-u*5);c.position.x=foe.x+Math.cos(c.userData.a+u*2)*1.1;c.position.z=foe.z+Math.sin(c.userData.a+u*2)*1.1;c.material.opacity=.95*Math.max(0,1-u*.9);});
  }else{
   const grow=ease(t/.3),fade=t>.7?1-(t-.7)/.3:1,H=7*grow;
   pillar.scale.set(1.3+.15*Math.sin(t*20),Math.max(.01,H),1.3+.15*Math.sin(t*20));pillar.position.y=H/2;pillar.material.opacity=.42*fade;
   core.scale.set(1,Math.max(.01,H*1.05),1);core.position.y=H/2;core.material.opacity=.55*fade;
  }
 },done:()=>{for(const d of disposables)d.dispose();}});
 combatSound?.(kind==='armour'?'electric':'fairy',true);
}
function detach(object){if(object.parent)object.parent.remove(object);}
const townWriter=PhantomCaveBridge.createTownWriter();
const T=THREE,$=id=>document.getElementById(id),KEY='phantom_journey_v1',OLD_KEYS=['pokemon3d_v5_preview','pokemon3d_v5','pokemon3d_pallet_v1','pokemon3d_sinnoh_summer_v16','pokemon3d_gen3_v4_winter'];
PhantomLoading.install();const loader=new T.GLTFLoader(),cache=new Map(),actors=[],wild=[],npcs=[],labels=[],effects=[];
let towerMonsters=[];
let river=null,fishingBusy=false;
let spiritCatalog=null;
let spirits=[],byId={},world,npcData,hero,town,interior,place=null,battle=null,target=null,modal=false,dialog=null,viewer=null,elapsed=0,ballType='normal',throwing=false,portalAction=null,companion=null,roll=null,rollReady=0;
// Arena simulation only: preserve authored species playback rates and town/gym time.
const ARENA_SPEED=1.3;
function arenaSpeed(b=battle){return b&&!b.gym?ARENA_SPEED:1;}
function arenaTime(b=battle){return b&&!b.gym?(b.arenaClock??elapsed):elapsed;}
function arenaDelay(ms,b=battle){return delay(ms/arenaSpeed(b));}
function addEffect(effect){
 const speed=arenaSpeed();
 if(speed!==1&&Number.isFinite(effect.duration)&&effect.duration>0){effect.duration/=speed;effect.arenaSpeed=speed;}
 return effects.push(effect);
}

const pickups=[];let modelSizeOverrides={},adventureCollectAt=10,pickupCostume=null,guideBroadcastAt=20,guideBroadcastIndex=0;
let navigation=null,navRoute=[],navReplan=0,spawnPending=0,locked=false,lockLabel=null,cardArt={};let petFollower=null,petEquipGeneration=0,petChangeGeneration=0,petLoadingId=null;
const cameraOrbit={yaw:0,zoom:1,pitch:.68},WILD_LIMIT=8;
// 河道釣魚獎勵及水蛟龍王不計入一般野外 8 隻上限，避免連勝後獎勵魚被擠掉。
const outdoorWildCount=()=>wild.reduce((n,w)=>n+(w.riverSwim?0:1),0);
// A session has one treasure encounter, separate from the eight outdoor spirits.
let chestEncounter=null,chestSpawnPromise=null,chestNextAt=0,enterBusy=false;
// Dream Laboratory three-ball selection; all selections share the normal save.
const LAB_LEGENDS=[{id:'articuno',color:0x97e4ac},{id:'raikou',color:0xf2c64c},{id:'entei',color:0x80c9ff}];
// Historical third gift must stay valid in existing browser saves.
const validLabClaimId=id=>id==='suicune'||LAB_LEGENDS.some(x=>x.id===id);
const LAB_CENTER=new T.Vector3(-4,0,0);
const LAB_PROFESSOR_POSITION=new T.Vector3(-1.7,0,-1.55);
const LAB_START_POSITION=new T.Vector3(-3.7,0,3.35);
let labDisplay=null,labEvent=null,labClaimBusy=false;
const labClaimed=()=>!!S.state?.dreamLabLegendClaimed&&!!S.state?.dreamLabLegendChoice;
const isChest=s=>s?.family==='chest-spirit';
const isBook=s=>s?.family==='book-spirit'||['weedle','kakuna','beedrill'].includes(s?.id);
let bookshelfData={shelves:{},reach:2.15},bookEncounter=null,bookChallengeBusy=false;
function validThreeSpiritTeam(){return S.state.team.length===Rules.arena.partySize&&[...new Set(S.state.team)].filter(id=>byId[id]&&owned(id)).length===Rules.arena.partySize;}
function validBookTeam(){return validThreeSpiritTeam();}
function nearbyBookshelf(){if(!place||!interior)return null;return(bookshelfData.shelves[place.id]||[]).find(p=>Math.hypot(S.player.x-p[0],S.player.z-p[1])<=bookshelfData.reach)||null;}
function syncBookRoom(){const a=bookEncounter?.actor;if(a)a.root.visible=place?.id===bookEncounter.roomId&&!battle;}
function bookRewardPoint(room){const b=normalizeBounds(room.bounds);for(let i=0;i<80;i++){const x=b.minX+1+Math.random()*(b.maxX-b.minX-2),z=b.minZ+1+Math.random()*(b.maxZ-b.minZ-2);if(!roomBlocked(room,x,z,.85))return new T.Vector3(x,0,z);}const p=room.spawn||[0,4];return new T.Vector3(p[0],0,p.length===3?p[2]:p[1]);}
async function ensureBookActor(){const e=bookEncounter;if(!e||e.actor||e.loading||place?.id!==e.roomId)return;e.loading=true;let a;try{const s=byId[e.speciesId];a=await actor(s.model,Math.min(1.6,Number(sizeRule(s).desiredWorldHeight)||1.3),insideGroup);if(bookEncounter!==e){removeActor(a);return;}const ratio=Math.min(1,1.8/Math.max(a.worldSize.x,a.worldSize.z,.001));a.object.scale.multiplyScalar(ratio);a.object.position.multiplyScalar(ratio);a.height*=ratio;a.species=s;a.bookEncounter=e;a.berry=false;a.root.position.copy(e.position);e.actor=a;syncBookRoom();}catch(error){if(a)removeActor(a);e.retryAt=elapsed+8;S.errors.push('書本載入：'+error.message);}finally{e.loading=false;}}
function finishBook(who){if(bookEncounter?.actor!==who)return false;clearTarget();removeActor(who);bookEncounter=null;return true;}
async function readBookshelf(){if(bookChallengeBusy||battle||throwing||enterBusy||modal||dialog||!nearbyBookshelf())return;if(!validBookTeam())return toast('隊伍需有 3 位已締約的有效幻靈，才能翻書挑戰。');if(bookEncounter)return toast('還有一本書等待締約，請先完成先前的書本奇遇。');bookChallengeBusy=true;try{await startBattle('book');}finally{bookChallengeBusy=false;}}
function tickBookEncounter(){syncBookRoom();if(bookEncounter&&!bookEncounter.actor&&elapsed>=(bookEncounter.retryAt||0)&&!battle)void ensureBookActor();}

function roomBlocked(room,x,z,margin=.42){const b=normalizeBounds(room.bounds);if(x<b.minX+margin||x>b.maxX-margin||z<b.minZ+margin||z>b.maxZ-margin)return true;return(room.collisions||[]).some(c=>Math.abs(x-(c.x??c.position?.[0]??0))<(c.w??c.width??c.size?.[0]??0)/2+margin&&Math.abs(z-(c.z??c.position?.[2]??0))<(c.d??c.depth??c.size?.[2]??0)/2+margin);}
function planChestEncounter(excludedRoomId=null){if(chestEncounter||elapsed<chestNextAt)return;const species=spirits.filter(isChest),rooms=(world.buildings||[]).filter(b=>{const r=normalizeBounds(b.bounds);return b.interiorModel&&npcData.some(n=>n.buildingId===b.id)&&!roomBlocked(b,(r.minX+r.maxX)/2,(r.minZ+r.maxZ)/2,.85);});if(!species.length||!rooms.length)return;const choices=rooms.length>1?rooms.filter(b=>b.id!==excludedRoomId):rooms,room=choices[Math.floor(Math.random()*choices.length)],s=species[Math.floor(Math.random()*species.length)];chestEncounter={roomId:room.id,speciesId:s.id,actor:null,awakened:false};}
function syncChestRoom(){const e=chestEncounter;if(e?.actor)e.actor.root.visible=place?.id===e.roomId;}
async function ensureChestActor(){planChestEncounter();const e=chestEncounter;if(!e||place?.id!==e.roomId)return;if(e.actor){syncChestRoom();return;}if(chestSpawnPromise)return chestSpawnPromise;chestSpawnPromise=(async()=>{let a;try{const room=world.buildings.find(b=>b.id===e.roomId),s=byId[e.speciesId],b=normalizeBounds(room.bounds);a=await actor(s.model,Math.min(1.65,Number(sizeRule(s).desiredWorldHeight)||1.3),insideGroup);if(chestEncounter!==e){removeActor(a);return;}const span=Math.max(a.worldSize.x,a.worldSize.z),ratio=Math.min(1,1.8/Math.max(.001,span));a.object.scale.multiplyScalar(ratio);a.object.position.multiplyScalar(ratio);a.height*=ratio;a.species=s;a.root.position.set((b.minX+b.maxX)/2,0,(b.minZ+b.maxZ)/2);a.home=a.root.position.clone();a.goal=a.home.clone();a.timer=0;a.berry=false;a.chestEncounter=e;e.actor=a;syncChestRoom();}catch(error){if(a)removeActor(a);S.errors.push('寶箱載入：'+error.message);chestNextAt=elapsed+10;}finally{chestSpawnPromise=null;}})();return chestSpawnPromise;}
function chestHint(n){return chestEncounter&&n.data.buildingId===chestEncounter.roomId?'建築物裡面好像出現了寶箱！':'';}
function emphasizeChestHints(){const el=$('npcText'),text=el.textContent,pattern=/(?:建築物(?:裡面|內|中)?|屋內|房間(?:裡面|內)?)[^\n。！？!?]{0,45}(?:寶箱怪?|寶箱|寶物)[^\n。！？!?]*[。！？!?]*/g,fragment=document.createDocumentFragment();let last=0,match;while((match=pattern.exec(text))){fragment.append(document.createTextNode(text.slice(last,match.index)));const strong=document.createElement('strong');strong.className='npcTreasureHint';strong.textContent=match[0];fragment.append(strong);last=pattern.lastIndex;}if(!last)return;fragment.append(document.createTextNode(text.slice(last)));el.replaceChildren(fragment);}
function playChestDing(){const ctx=appearanceAudio.context;if(!ctx||ctx.state!=='running')return;const osc=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime;osc.type='sine';osc.frequency.setValueAtTime(1046.5,at);osc.frequency.exponentialRampToValueAtTime(1568,at+.08);gain.gain.setValueAtTime(.065,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.65);osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+.7);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
function chestSymbol(a,text,duration){const escape=text==='✧',label=addLabel(a,'','encounterSymbol'),el=label.el;el.style.cssText='position:absolute;pointer-events:none;transform:translate(-50%,-100%);width:72px;height:72px;z-index:30;background:none;border:0;box-shadow:none;padding:0;';const fallback=document.createElement('span');fallback.className='chestSymbolFallback';fallback.textContent=escape?'✧':'！';el.append(fallback);const image=document.createElement('img');image.alt='';image.setAttribute('aria-hidden','true');image.style.cssText='display:none;width:100%;height:100%;object-fit:contain;';image.onload=()=>{if(!el.isConnected)return;image.style.display='block';fallback.style.display='none';};image.src='assets/encounter/'+(escape?'escape':'surprise')+'.webp?v=20261017-chest-alert-v2';el.append(image);addEffect({start:elapsed,duration,update:t=>{el.style.opacity=String(Math.min(1,(1-t)*5));},done:()=>{removeLabel(label);if(a.label===label)a.label=null;}});}
function finishChest(who,escaped=false){const e=chestEncounter;if(!e||e.actor!==who)return false;if(escaped){captureBurst(who.root.position.clone().add(new T.Vector3(0,.5,0)),0xd6b9ff,false);const marker={root:new T.Group(),height:who.height};marker.root.position.copy(who.root.position);insideGroup.add(marker.root);chestSymbol(marker,'✧',1);addEffect({start:elapsed,duration:1,update:t=>{marker.root.position.y=t;},done:()=>detach(marker.root)});toast(who.species.name+'逃跑了!!');}clearTarget();removeActor(who);chestEncounter=null;chestNextAt=escaped?elapsed:elapsed+180;if(escaped)planChestEncounter(e.roomId);return true;}
function phoenixWildGrounded(a){
 if(!isLightPhoenix(a?.path))return true;
 const phase=a.phoenixWander?.phase,motion=a.controller?.getMotionState?.();
 return (phase==='walk'||phase==='rest')&&!!motion&&motion.altitude<.08&&motion.grounding>.92;
}
function nearbyFlyingPhoenix(){
 return !place&&wild.some(w=>w.species?.id==='blissey'&&!phoenixWildGrounded(w)&&
  w.root.visible&&w.root.parent===townGroup&&Math.hypot(w.root.position.x-S.player.x,w.root.position.z-S.player.z)<12);
}
// Event-only species stay out of random spawning; actual river encounters are capturable.
function authorizedRiverActor(w){return !!(river&&w?.riverSwim&&SpiritCombat.isWater(w.species)&&WATER_EVENT_ONLY.includes(w.species?.id)&&river.inWaterZone(w.root.position.x,w.root.position.z));}
// Habitat authorization belongs to a real outdoor encounter, never to an entire rarity.
function authorizedPondActor(w){return !!(((w?.pondSwim&&w.species?.id==='entei'&&SpiritCombat.isWater(w.species))||(w?.pondJump&&w.species?.id==='articuno'))&&w.root.parent===townGroup&&wild.includes(w)&&inPond(w.root.position.x,w.root.position.z,0));}
function waterCaptureSurface(w){return authorizedPondActor(w)?pondBounds().surfaceY:authorizedRiverActor(w)?river.config.surfaceY:null;}
function captureDistance(w){return waterCaptureSurface(w)!==null?Math.hypot(w.root.position.x-S.player.x,w.root.position.z-S.player.z):w.root.position.distanceTo(S.player);}
function captureAim(w,position){const aim=position.clone().add(new T.Vector3(0,w.height*.5,0)),surface=waterCaptureSurface(w);if(surface!==null)aim.y=Math.max(aim.y,surface+Math.min(.3,w.height*.2));return aim;}
function captureCandidates(){if(place){const e=chestEncounter,a=e?.actor,k=bookEncounter,r=k?.actor;return [...(e?.awakened&&elapsed>=(e.captureReadyAt||0)&&e.roomId===place.id&&a?.root.visible&&a.root.parent===insideGroup?[a]:[]),...(k?.roomId===place.id&&r?.root.visible&&r.root.parent===insideGroup?[r]:[])];}return wild.filter(w=>w.root.visible&&w.root.parent===townGroup&&((w.pondSwim||w.pondJump||w.riverSwim)?authorizedPondActor(w)||authorizedRiverActor(w):w.eggEncounter||w.eggTransformed||eligible(w.species)||authorizedGuardianActor(w))&&phoenixWildGrounded(w));}
function tickChestEncounter(dt){if(!chestEncounter&&elapsed>=chestNextAt)planChestEncounter();const e=chestEncounter;if(!e||place?.id!==e.roomId||enterBusy||battle||modal||dialog)return;if(!e.actor){if(elapsed>=chestNextAt)void ensureChestActor();return;}const a=e.actor;if(a.capturing)return;if(!e.awakened){a.play('Idle');if(a.root.position.distanceTo(S.player)>4.6)return;e.awakened=true;e.captureReadyAt=elapsed+.4;chestSymbol(a,'！',1.6);playChestDing();a.timer=0;}a.timer-=dt;if(a.timer<=0){a.timer=.6+Math.random()*.9;const room=place,b=normalizeBounds(room.bounds);for(let i=0;i<24;i++){const x=b.minX+.9+Math.random()*(b.maxX-b.minX-1.8),z=b.minZ+.9+Math.random()*(b.maxZ-b.minZ-1.8);if(!roomBlocked(room,x,z,.85)){a.goal.set(x,0,z);break;}}}const d=a.goal.clone().sub(a.root.position);d.y=0;let moving=false;if(d.length()>.12){d.normalize();const nx=a.root.position.x+d.x*dt*2.15,nz=a.root.position.z+d.z*dt*2.15;if(!roomBlocked(place,nx,nz,.85)){a.root.position.set(nx,0,nz);a.root.rotation.y=Math.atan2(d.x,d.z);moving=true;}else a.timer=0;}a.play(moving?'Walk':'Idle');}
const BOSS_CARD_IDS=['chimchar','monferno','infernape'];
const Rules=window.PhantomGameRules;
const regularSpirits=()=>spirits.filter(s=>s.category!=='tower'&&!BOSS_CARD_IDS.includes(s.id));
const TOWER_KEY='phantom-starspire-tower-v1';const TOWER_PETS=[{id:'forest',card:'森棘龍卡片',name:'青螺幼靈',model:'bulbasaur',cost:3},{id:'ice',card:'霜牙獸卡片',name:'小芝麻',model:'squirtle',cost:3},{id:'fire',card:'熔冠翼龍卡片',name:'椒香小雞',model:'charmander',cost:3}];
function towerProgress(){try{const v=JSON.parse(localStorage.getItem(TOWER_KEY)||'{}');return {...v,inventory:{...(v.inventory||{})},cards:{...(v.cards||{})},pets:{...(v.pets||{})}};}catch{return {inventory:{},cards:{},pets:{}};}}
function saveTowerProgress(v){try{localStorage.setItem(TOWER_KEY,JSON.stringify(v));return true;}catch{return false;}}
let broadcastAt=90+Math.random()*90;
const itemNames={potion:"初光回復藥",armorBreak:"裂甲粉",attackBoost:"勇氣結晶",fishFood:"魚飼料"};
// 水系幻靈：小金魚→金魚國王／金魚皇后、水蛟龍王只透過河道活動出現，不在一般野外隨機出現
const WATER_EVENT_ONLY=['kyogre','groudon','rayquaza','mewtwo'];
const S={state:null,ready:false,errors:[],assetLoads:0,player:new T.Vector3(),keys:{},stick:{x:0,y:0},input:false};
const mobileGraphics=Math.min(innerWidth,innerHeight)<760;
const GRAPHICS_SETTING_KEY='phantom-display-quality-v1';
const GRAPHICS_LEVELS=['low','medium','high'];
function readGraphicsPreset(){try{const value=localStorage.getItem(GRAPHICS_SETTING_KEY);return GRAPHICS_LEVELS.includes(value)?value:'medium';}catch{return 'medium';}}
function graphicsPixelRatio(preset){return Math.min(devicePixelRatio||1,({low:.9,medium:1.4,high:2})[preset]||1.4);}
const graphicsQuality={preset:readGraphicsPreset(),dpr:1,smoothed:1/60};graphicsQuality.dpr=graphicsPixelRatio(graphicsQuality.preset);
const renderer=new T.WebGLRenderer({canvas:$('scene'),antialias:!mobileGraphics,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(graphicsQuality.dpr);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;renderer.shadowMap.enabled=graphicsQuality.preset!=='low';renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#c9e2dc');scene.fog=new T.Fog('#c9e2dc',30,85);const camera=new T.PerspectiveCamera(39,1,.1,130);const light=new T.DirectionalLight(0xffeccb,1.5);light.position.set(-12,25,15);light.castShadow=true;light.shadow.mapSize.set(graphicsQuality.preset==='high'?1024:512,graphicsQuality.preset==='high'?1024:512);light.shadow.camera.left=-30;light.shadow.camera.right=30;light.shadow.camera.top=30;light.shadow.camera.bottom=-30;light.shadow.normalBias=.065;light.shadow.bias=-.0003;light.shadow.camera.near=1;light.shadow.camera.far=75;scene.add(light,new T.HemisphereLight(0xd5efff,0xa7ab7e,.95));
const townGroup=new T.Group(),insideGroup=new T.Group(),battleGroup=new T.Group();scene.add(townGroup,insideGroup,battleGroup);insideGroup.visible=false;battleGroup.visible=false;const arenaFeedback=PhantomArenaFeedback.create(T,battleGroup);
const number=(v,d=0)=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):d,delay=ms=>new Promise(r=>setTimeout(r,ms));
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function layoutWorldNotifications(){const toastEl=$('toast'),broadcast=$('broadcast'),guardian=$('guardianBroadcast'),radarEl=$('radar'),radarButton=$('radarToggle'),menu=$('menuBtn'),cancel=$('navCancelBtn');let top=Math.max(124,menu.getBoundingClientRect().bottom+12,radarEl.getBoundingClientRect().top+(radarButton.getAttribute('aria-expanded')==='true'?106:50)+12);if(cancel&&!cancel.hidden)top=Math.max(top,cancel.getBoundingClientRect().bottom+12);if(toastEl.dataset.kind!=='absorb')toastEl.style.top=top+'px';else toastEl.style.removeProperty('top');const normalTop=top+(toastEl.classList.contains('visible')&&toastEl.dataset.kind!=='absorb'?toastEl.offsetHeight+8:0);broadcast.style.top=normalTop+'px';if(guardian)guardian.style.top=(normalTop+(!broadcast.hidden?broadcast.offsetHeight+8:0))+'px';}
addEventListener('resize',()=>{if(S.ready)layoutWorldNotifications();});
function toast(t){const el=$('toast'),absorb=/^冒險服吸收補給/.test(t);if(!absorb&&!$('broadcast').hidden&&$('broadcast').textContent===t)return;el.dataset.kind=absorb?'absorb':'notice';el.textContent=absorb?'冒險服吸收\n'+t.split('｜').slice(1).join('｜').split('、').filter(Boolean).length+' 項補給':t;el.title=t;el.setAttribute('aria-label',t);el.classList.add('visible');layoutWorldNotifications();clearTimeout(toast.timer);toast.timer=setTimeout(()=>{el.classList.remove('visible');layoutWorldNotifications();},absorb?4200:3500);}
function migrate(raw={}){const s={...raw,version:1,brand:'phantom-journey',captureCounts:{...raw.captureCounts},pokedexUnlocks:{...raw.pokedexUnlocks},items:{...raw.items},quests:{...raw.quests},npcRewards:{...raw.npcRewards},gyms:{...raw.gyms},specialAppearances:{...raw.specialAppearances},worldFlags:{...raw.worldFlags},equip:{...raw.equip},adventureClaimed:!!raw.adventureClaimed,petActive:raw.petActive||null,dreamLabLegendChoice:validLabClaimId(raw.dreamLabLegendChoice)?raw.dreamLabLegendChoice:null,dreamLabLegendClaimed:!!raw.dreamLabLegendClaimed&&validLabClaimId(raw.dreamLabLegendChoice)};s.pokeballs=number(raw.pokeballs,30);s.greatBallCount=number(raw.greatBallCount,5);s.masterBallCount=number(raw.masterBallCount);s.berryCount=number(raw.berryCount,12);s.wins=number(raw.wins,number(raw.cardWins));s.cMonkeyArenaStreak=Math.min(3,number(raw.cMonkeyArenaStreak));s.waterBugArenaStreak=Math.min(3,number(raw.waterBugArenaStreak));s.frogArenaStreak=raw.frogArenaPending?0:Math.min(3,number(raw.frogArenaStreak));s.frogArenaPending=false;s.rabbitArenaParticipations=Math.min(3,number(raw.rabbitArenaParticipations));delete s.items.thunderStone;delete s.worldFlags.raichuSpawnUnlocked;s.team=Array.isArray(raw.team)?raw.team.filter(x=>typeof x==='string').slice(0,3):[];s.costume=raw.costume||'trainer';s.unlockedCostumes=Array.from(new Set(['trainer',...(raw.unlockedCostumes||[])]));s.tower={towerEnabled:false,towerFloors:[],towerProgress:0,towerBestRecord:0,towerRewardClaimed:false,towerChallengeState:null,towerMarks:0,...raw.tower};
 // 舊版任務領的是高階靈核球 3 顆：一次性補差額，不重置既有完成紀錄。
 if(s.quests.firstResearch&&!s.quests.patrolRewardV2){const amount=Rules.quest.eachBallReward;s.pokeballs=number(s.pokeballs)+amount;s.greatBallCount=number(s.greatBallCount)+Math.max(0,amount-3);s.masterBallCount=number(s.masterBallCount)+amount;s.quests.patrolRewardV2=true;s.quests.patrolRewardMigrated=true;}
 return s;}
function loadSave(){try{const own=localStorage.getItem(KEY);if(own)return migrate(JSON.parse(own));for(const key of OLD_KEYS){const value=localStorage.getItem(key);if(value){const s=migrate(JSON.parse(value));s.migratedFrom=key;return s;}}}catch(e){S.errors.push('存檔讀取：'+e.message);}return migrate();}
function save(){if(!S.state)return;try{const pos=battle?battle.previous.position:S.player;S.state.position=[pos.x,pos.z];S.state.buildingId=(battle?battle.previous.place:place)?.id||null;townWriter.save(S.state);}catch(e){toast('此瀏覽器無法儲存進度，請檢查網站儲存權限。');}hud();}
function hudBallCount(id,quantity,label){
 const el=$(id);if(!el)return;
 const result=Rules.ballHudValue(quantity);
 el.textContent=String(result.display);
 el.classList.toggle('ballOver99',result.overflow);
 el.setAttribute('aria-label',label+'實際持有 '+result.actual+' 顆');
 const holder=el.closest('.supply');
 if(holder)holder.title=label+'：實際持有 '+result.actual+' 顆（庫存無上限）';
}
function hud(){
 if(!S.state)return;
 const dexProgress=`${regularSpirits().filter(s=>owned(s.id)).length} / ${regularSpirits().length}`;
 $('dexCount').textContent=dexProgress.replace(/\s*\/\s*/,'/');
 $('dexBtn').setAttribute('aria-label','開啟幻靈圖鑑，已收錄 '+dexProgress+' 種');
 hudBallCount('ballCount',S.state.pokeballs,'普通靈核球');
 hudBallCount('greatCount',S.state.greatBallCount,'高階靈核球');
 hudBallCount('masterCount',S.state.masterBallCount,'星耀靈核球');
 hudBallCount('berryCount',S.state.berryCount,'星露果');
 const berry=$('berryBadge');if(berry)berry.textContent=S.state.berryCount;
}
function owned(id){return !!(S.state.pokedexUnlocks[id]||S.state.captureCounts[id]>0);}
function grant(id,count=1){
 S.state.captureCounts[id]=number(S.state.captureCounts[id])+count;
 S.state.pokedexUnlocks[id]=true;
 if(MILESTONE_SPECIALS.some(x=>x.id===id)&&dexReached(MILESTONE_SPECIALS.find(x=>x.id===id).percent)||labClaimed()&&id!==S.state.dreamLabLegendChoice&&LAB_LEGENDS.some(x=>x.id===id)&&labLegendMilestoneReached()){
  S.state.worldFlags.labLegendWildCaught||={};
  S.state.worldFlags.labLegendWildCaught[id]=true;
 }
 if(S.state.team.length<3&&!S.state.team.includes(id))S.state.team.push(id);
 save();
 if(id==='mewtwo')caveEvent('dragon-caught','dragon-capture:'+S.state.captureCounts.mewtwo);
}
const RICEBALL_MODEL='riceball://mew',XIAOSHAN_MODEL='xiaoshan://wigglytuff',OUTOUMAN_MODEL='outouman://pikachu';
const isOutouman=path=>path===OUTOUMAN_MODEL;
const isAvian=path=>window.AvianSpirits.has(path);
const isFrog=path=>window.FrogSpirits.has(path);
const isRobot=path=>window.RobotSpirits.has(path);
const isReplacement=path=>window.ReplacementSpirits.has(path);
const isFloralDeer=path=>['floral-deer://chikorita','floral-deer://bayleef','floral-deer://meganium'].includes(path);
const floralDeerStage=path=>path==='floral-deer://meganium'?3:path==='floral-deer://bayleef'?2:1;
const isLightPhoenix=path=>path==='light-phoenix://blissey';
const isXiaoshan=path=>path===XIAOSHAN_MODEL;
const isGuanpang=path=>/guanpang\.glb$/.test(path);
function controllerBounds(path,controller){if(isReplacement(path)||isAvian(path)||isFrog(path)||isRobot(path)||isFloralDeer(path)||isLightPhoenix(path)){const cached=actorBaseBounds.get(path);if(cached)return cached.clone();const bounds=controller?.getState?.().bounds;if(bounds?.min?.length===3&&bounds?.max?.length===3){const box=new T.Box3(new T.Vector3().fromArray(bounds.min),new T.Vector3().fromArray(bounds.max));actorBaseBounds.set(path,box.clone());return box;}throw Error('原生模型缺少固定尺寸：'+path);}return isOutouman(path)?new T.Box3(new T.Vector3(-1.4,0,-1.1),new T.Vector3(1.4,4.53,1.1)):isXiaoshan(path)?new T.Box3(new T.Vector3(-1.6,0,-1.15),new T.Vector3(1.6,2.85,1.15)):new T.Box3(new T.Vector3(-1.35,0,-.75),new T.Vector3(1.35,2.7,.75));}
function isRiceball(path){return path===RICEBALL_MODEL;}
async function asset(path){if(isReplacement(path)){if(!cache.has(path))cache.set(path,ReplacementSpirits.load(path).then(g=>{S.assetLoads++;return g;}).catch(e=>{cache.delete(path);throw e;}));return cache.get(path);}if(isAvian(path)){if(!cache.has(path)){cache.set(path,AvianSpirits.load(path).then(g=>{S.assetLoads++;return g;}).catch(e=>{cache.delete(path);throw e;}));}return cache.get(path);}if(isFrog(path)){if(!cache.has(path)){cache.set(path,Promise.resolve({create:()=>FrogSpirits.create(path),animations:[]}));S.assetLoads++;}return cache.get(path);}if(isRobot(path)){if(!cache.has(path)){cache.set(path,Promise.resolve({create:()=>RobotSpirits.create(path),animations:[]}));S.assetLoads++;}return cache.get(path);}if(isFloralDeer(path)||isLightPhoenix(path)){if(!cache.has(path)){const create=isFloralDeer(path)?()=>window.FloralDeer.create({stage:floralDeerStage(path),inPlace:true}):()=>window.LightPhoenix.create({inPlace:true});cache.set(path,Promise.resolve({create,animations:[]}));S.assetLoads++;}return cache.get(path);}if(isOutouman(path)){if(!cache.has(path)){cache.set(path,Promise.resolve({create:()=>OutoumanSpirit.create({inPlace:true}),animations:[]}));S.assetLoads++;}return cache.get(path);}if(isXiaoshan(path)){if(!cache.has(path)){cache.set(path,Promise.resolve({create:()=>XiaoshanSpirit.create({inPlace:true}),animations:[]}));S.assetLoads++;}return cache.get(path);}if(isRiceball(path)){if(!cache.has(path)){cache.set(path,Promise.resolve({create:()=>RiceballSpirit.create({inPlace:true}),animations:[]}));S.assetLoads++;}return cache.get(path);}if(!path)throw Error('模型路徑未設定');if(window.NativeFamilies?.has(path)){if(!cache.has(path)){cache.set(path,Promise.resolve(NativeFamilies.build(path)));S.assetLoads++;}return cache.get(path);}if(!cache.has(path)){cache.set(path,new Promise((resolve,reject)=>loader.load(path+(path.includes("?")?"&":"?")+"v=20261023-starspire-v1",g=>{S.assetLoads++;resolve(g)},undefined,e=>{cache.delete(path);reject(Error('無法載入 '+path))})));}return cache.get(path);}
function cloneSkin(source){const clone=source.clone(true),a=new Map(),b=new Map();const pair=(x,y)=>{a.set(y,x);b.set(x,y);x.children.forEach((ch,i)=>pair(ch,y.children[i]));};pair(source,clone);clone.traverse(n=>{if(n.isSkinnedMesh){const original=a.get(n);n.skeleton=original.skeleton.clone();n.bindMatrix.copy(original.bindMatrix);n.skeleton.bones=original.skeleton.bones.map(bone=>b.get(bone));n.bind(n.skeleton,n.bindMatrix);}});return clone;}
function posedBounds(root,baseOnly=false){const b=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);root.traverse(n=>{if(!n.isMesh)return;if(baseOnly){let p=n;while(p){if(p.userData.costume)return;p=p.parent;}}if(n.isSkinnedMesh)n.skeleton.update();const points=n.geometry.attributes.position;for(let i=0;i<points.count;i++){v.fromBufferAttribute(points,i);if(n.isSkinnedMesh)n.boneTransform(i,v);b.expandByPoint(v.applyMatrix4(n.matrixWorld));}});return b;}
async function runtimeActorBounds(root,path){
 if(!/(ahong-cowboy|starlight-mage|guanpang)\.glb$/.test(path))return posedBounds(root,path.includes('hero.glb'));
 const b=new T.Box3(),v=new T.Vector3(),meshes=[];root.updateMatrixWorld(true);root.traverse(n=>{if(n.isMesh)meshes.push(n);});
 let batch=performance.now();
 for(const n of meshes){if(n.isSkinnedMesh)n.skeleton.update();const points=n.geometry.attributes.position;for(let i=0;i<points.count;i++){v.fromBufferAttribute(points,i);if(n.isSkinnedMesh)n.boneTransform(i,v);b.expandByPoint(v.applyMatrix4(n.matrixWorld));if((i&1023)===0&&performance.now()-batch>5){await new Promise(resolve=>setTimeout(resolve,0));batch=performance.now();}}}
 return b;
}
function migrateTowerCardCollection(){
 const t=towerProgress();t.registeredCards={...t.registeredCards};let changed=false;
 for(const id of BOSS_CARD_IDS){const name=byId[id]?.name+'卡片';if(owned(id)&&!t.registeredCards[name]){t.registeredCards[name]=true;changed=true;}if(owned(id)&&!Object.prototype.hasOwnProperty.call(t.cards,name)){t.cards[name]=number(S.state.captureCounts[id]);changed=true;}}
 if(changed)saveTowerProgress(t);
}
function consumeTowerBossGrants(){
 const totals=towerProgress().spiritGrants||{},claims=S.state.towerBossClaims||{},next={...claims};let changed=false;
 for(const id of ['chimchar','monferno','infernape']){const total=Math.max(0,Math.floor(Number(totals[id])||0)),claimed=Math.max(0,Math.floor(Number(claims[id])||0));if(total>claimed){grant(id,total-claimed);next[id]=total;changed=true;}}
 if(changed){S.state.towerBossClaims=next;try{townWriter.save(S.state);}catch(error){S.errors.push('挑戰塔卡牌儲存：'+error.message);}}
 return changed;
}

const actorBaseBounds=new Map();
async function actor(path,height,parent=townGroup){const g=await asset(path),controller=g.create?.(),object=controller?controller.root:cloneSkin(g.scene),root=new T.Group();root.add(object);object.updateMatrixWorld(true);let box=actorBaseBounds.get(path);if(!box){box=controller?controllerBounds(path,controller):await runtimeActorBounds(object,path);actorBaseBounds.set(path,box.clone());}else box=box.clone();const guanpangFx=isGuanpang(path)?createGuanpangCombatVFX(T,root,object,g.animations):null;const duoFx=/(ahong-cowboy|starlight-mage)\.glb$/.test(path)?createDuoCombatVFX(T,root,object,path):null;const size=box.getSize(new T.Vector3());if(height){const ratio=height/Math.max(size.y,.001);object.scale.multiplyScalar(ratio);object.position.y-=box.min.y*ratio;}else object.position.y-=box.min.y;object.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.frustumCulled=mobileGraphics&&!n.isSkinnedMesh;}});const mixer=new T.AnimationMixer(object),actions={};g.animations.forEach(c=>{const name=c.name.replace(/.*[|]/,'');actions[name]=mixer.clipAction(c);});const a={root,object,mixer,actions,mode:null,height:height||size.y,path,worldSize:new T.Vector3(size.x*(height?height/Math.max(size.y,.001):1),height||size.y,size.z*(height?height/Math.max(size.y,.001):1))};a.controller=controller;a.guanpangFx=guanpangFx;a.duoFx=duoFx;a.motionSpeed=1.42;a.play=(name,once=false)=>{if(controller){if(isReplacement(path)){const mode=ReplacementSpirits.motion(path,name);if(a.mode===mode&&!once)return;controller.setMode(mode);a.mode=mode;return;}if(isAvian(path)){const mode=AvianSpirits.motion(path,name);if(a.mode===mode&&!once)return;controller.setMode(mode);a.mode=mode;return;}if(isFrog(path)){const mode=FrogSpirits.motion(path,name);if(a.mode===mode&&!once)return;controller.setMode(mode);a.mode=mode;return;}if(isRobot(path)){const mode=RobotSpirits.motion(path,name);if(a.mode===mode&&!once)return;controller.setMode(mode);a.mode=mode;return;}if(isFloralDeer(path)){const mode=({Attack:'Pulse',Throw:'Pulse',React:'Greet',Hurt:'Greet',Wave:'Greet',Celebrate:'Greet',Sleep:'Rest'})[name]||name;controller.setMode(['Idle','Walk','Run','Greet','Rest','Pulse'].includes(mode)?mode:'Idle');a.mode=mode;return;}if(isLightPhoenix(path)){const mode=({Run:'Walk',Attack:'WingBurst',Throw:'WingBurst',React:'Idle',Hurt:'Idle',Wave:'Idle',Landing:'Land'})[name]||name;controller.setMode(['Idle','Walk','Takeoff','Fly','Land','WingBurst','FeatherVolley'].includes(mode)?mode:'Idle');a.mode=mode;return;}if(isOutouman(path)){const mode=({Run:'Walk',Attack:'BeamPose',Throw:'BeamPose',React:'Wave',Hurt:'Hurt'})[name]||name;controller.setMode(['Idle','Walk','Wave','Beam','BeamPose','Roll','Jump','Hurt'].includes(mode)?mode:'Idle');a.mode=mode;return;}if(isXiaoshan(path)){const mode=({Run:'Walk',Attack:'React',Hurt:'Scared',Wave:'React'})[name]||name;controller.setMode(['Idle','Walk','Sleep','Wake','Jump','Scared','React'].includes(mode)?mode:'Idle');a.mode=mode;return;}const mode=({Walk:'Roll',Run:'Roll',Attack:'Wave',React:'Wave',Hurt:'Stuck'})[name]||name;controller.setMotionSpeed?.(name==='Run'||name==='Walk'||mode==='Roll'?Math.min(6,Math.max(.5,a.motionSpeed||1.42)):0);controller.setMode(['Idle','Roll','Stuck','Wave','Auto'].includes(mode)?mode:'Idle');a.mode=mode;return;}if(NativeFamilies.has(path)&&['Attack','Hurt','React','Run'].includes(name)&&!Object.keys(actions).some(k=>k.toLowerCase()===name.toLowerCase()))name=name==='Hurt'?'Sit':name==='Run'?'Walk':'Takeoff';if(/pepper-chick-|sesame-spirit-|chest-spirit-|book-spirit-/.test(path)&&['Attack','Hurt'].includes(name)&&!Object.keys(actions).some(k=>k.toLowerCase()===name.toLowerCase()))name='React';const key=Object.keys(actions).find(k=>k.toLowerCase()===name.toLowerCase())||Object.keys(actions).find(k=>k.toLowerCase().includes(name.toLowerCase()))||Object.keys(actions)[0];if(!key||a.mode===key&&!once)return;const fade=isGuanpang(path)?.04:NativeFamilies.has(path)?.65:.16;Object.values(actions).forEach(x=>x.fadeOut(fade));const action=actions[key];action.reset().fadeIn(fade);action.setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);action.clampWhenFinished=once;action.play();a.mode=key;};a.play('Idle');parent.add(root);actors.push(a);return a;}
function removeActor(a){if(!a)return;a.waterPuddle?.dispose();a.guanpangFx?.dispose();a.duoFx?.dispose();if(a.fadeMats)for(const f of a.fadeMats)f.m.dispose();detach(a.root);a.mixer.stopAllAction();a.mixer.uncacheRoot(a.object);const skeletons=new Set();a.object.traverse(n=>{if(n.isSkinnedMesh)skeletons.add(n.skeleton);});for(const skeleton of skeletons){if(skeleton.dispose)skeleton.dispose();else skeleton.boneTexture?.dispose();}a.controller?.dispose();const i=actors.indexOf(a);if(i>=0)actors.splice(i,1);if(a.label)removeLabel(a.label);}
function addLabel(a,text,kind='nameLabel'){const el=document.createElement('div');el.className=kind;el.textContent=text;$('labels').append(el);const l={a,el};labels.push(l);a.label=l;return l;}
function removeLabel(l){l.el.remove();const i=labels.indexOf(l);if(i>=0)labels.splice(i,1);}
// Project each gym guardian's trust bar from its actual head, not the wing span
// or a world-space model height. Keep the icon position linked to the bar.
function gymGuardianHeadPoint(a){
 const anchors={
  'outouman://pikachu':['HelmetPivot',1.26],
  'xiaoshan://wigglytuff':['BodyAndFace',2.65],
  'light-phoenix://blissey':['Head',.53]
 };
 const def=anchors[a.path],head=def&&a.object.getObjectByName(def[0]);
 if(head)return head.localToWorld(new T.Vector3(0,def[1],0));
 const p=a.root.getWorldPosition(new T.Vector3());
 p.y+=(a.height||2)*.94; // Riceball and any future guardian without a named head
 return p;
}
function gymTrialSymbol(l){
 return !!battle?.gym&&(
  l.el.classList.contains('phoenixSurprise')||
  l.el.classList.contains('outoumanMiss')||
  l.el.classList.contains('encounterSymbol')
 );
}
function updateLabels(){
 // Position ordinary labels and the boss trust bar before drawing any trial icon.
 for(const l of labels){
  if(gymTrialSymbol(l))continue;
  const ally=!!(battle&&!battle.gym&&l.el.classList.contains('arenaAllyHp'));
  const enemy=!!(battle&&!battle.gym&&l.el.classList.contains('arenaEnemyHp'));
  const gymTrust=!!(battle?.gym&&l.el.classList.contains('gymTrustLabel'));
  if(ally||enemy){
   // Diagonal 3v3 placement: opponent upper-left, player lower-right.
   // Keep cards fixed in screen space and clear of the skill/action panel.
   const active=l.a.root.visible&&l.a.root.parent?.visible!==false;
   l.el.hidden=!active;
   if(!active)continue;
   const titleBottom=$('battleTitle')?.getBoundingClientRect().bottom||130;
   const actionTop=$('battleActions')?.getBoundingClientRect().top??innerHeight-175;
   const cardHeight=l.el.offsetHeight||58;
   const enemyTop=titleBottom+18;
   const allyTop=Math.max(titleBottom+cardHeight+44,Math.min(actionTop-cardHeight-28,innerHeight-cardHeight-24));
   l.el.style.left=(enemy?innerWidth*.205:innerWidth*.79)+'px';
   l.el.style.top=(enemy?enemyTop:allyTop)+'px';
   continue;
  }
  const p=gymTrust?gymGuardianHeadPoint(l.a):l.a.root.getWorldPosition(new T.Vector3());
  if(!gymTrust)p.y+=ally?.15:(l.a.height||2)+.25;
  p.project(camera);
  const visible=(!l.a.data||l.a.root.position.distanceTo(S.player)<7)&&l.a.root.visible&&l.a.root.parent?.visible!==false&&p.z<1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.1;
  l.el.hidden=!visible;
  if(!visible)continue;
  l.el.style.left=(p.x*.5+.5)*innerWidth+'px';
  let top=(-p.y*.5+.5)*innerHeight;
  if(ally){
   const h=l.el.offsetHeight||60,panel=$('battleActions')?.getBoundingClientRect().top??innerHeight-170,intended=top+20;
   top=Math.min(intended,panel-h-10);
   if(top<intended-10){l.el.hidden=true;continue;}
  }else if(enemy){
   const titleBottom=$('battleTitle')?.getBoundingClientRect().bottom||0;
   top=Math.max(top-8,titleBottom+(l.el.offsetHeight||52)+9);
  }
  l.el.style.top=top+'px';
 }
 if(!battle?.gym)return;
 // All trial labels were projected. Keep narration tied to the player's
 // existing name/status label for every gym except Xiaoshan.
 positionGymPlayerNarration();
 const bar=battle.enemies[0]?.label?.el;
 for(const l of labels){
  if(!gymTrialSymbol(l))continue;
  const active=!!bar&&!bar.hidden&&l.el.style.display!=='none'&&l.a.root.visible;
  l.el.hidden=!active;
  if(!active)continue;
  const rect=bar.getBoundingClientRect();
  // The symbol's bottom is 9px above the TRUST CARD's top, never over its text/progress.
  l.el.style.left=(rect.left+rect.width/2)+'px';
  l.el.style.top=(rect.top-9)+'px';
 }
}

// Put the text above the player name/status panel and move it with the camera.
// Xiaoshan deliberately retains the full-width narration at the screen top.
function positionGymPlayerNarration(){
 if(!battle?.gym||battle.gym.spirit==='wigglytuff')return;
 const panel=$('battleLog'),heroPanel=battle.heroLabel?.el;
 if(!panel||!heroPanel||heroPanel.hidden||!hero.root.visible||!panel.textContent.trim()){
  if(panel)panel.hidden=true;
  return;
 }
 panel.hidden=false;
 // Read dimensions after the latest narration text has been applied.
 const heroRect=heroPanel.getBoundingClientRect(),narratorWidth=panel.offsetWidth;
 const narratorHeight=panel.offsetHeight,sideInset=12;
 const centerX=Math.max(narratorWidth/2+sideInset,Math.min(innerWidth-narratorWidth/2-sideInset,heroRect.left+heroRect.width/2));
 const headerBottom=Math.max($('battleTitle')?.getBoundingClientRect().bottom||0,130);
 const positionY=Math.max(headerBottom+narratorHeight+8,heroRect.top-9);
 panel.style.left=centerX+'px';
 panel.style.top=positionY+'px';
}

function normalizeBounds(b){if(Array.isArray(b))return{minX:b[0],maxX:b[1],minZ:b[2],maxZ:b[3]};return b||{minX:-36,maxX:36,minZ:-36,maxZ:36};}
function blocked(x,z,margin=.42){const b=normalizeBounds(place?place.bounds:world.bounds);if(x<b.minX+margin||x>b.maxX-margin||z<b.minZ+margin||z>b.maxZ-margin)return true;if(!place&&river?.blocked(x,z,margin))return true;return((place?place.collisions:world.collisions)||[]).some(c=>{const cx=c.x??c.position?.[0]??0,cz=c.z??c.position?.[2]??0,w=c.w??c.width??c.size?.[0]??0,d=c.d??c.depth??c.size?.[2]??0;return Math.abs(x-cx)<w/2+margin&&Math.abs(z-cz)<d/2+margin;});}
// Water caterpillar is exclusive to the visible town pond (NOT the north river).
// The pool is described by the public map config, so no coordinates are guessed
// from the camera: world.landscape.lake.center/radii.
function pondBounds(){const l=world?.landscape?.lake;if(!l?.center||!l?.radii)return null;return{cx:l.center[0],cz:l.center[1],rx:l.radii[0],rz:l.radii[1],surfaceY:Number.isFinite(l.surfaceY)?l.surfaceY:-.06};}
function inPond(x,z,inset=.55){
 const p=pondBounds();if(!p)return false;
 const rx=Math.max(.3,p.rx-inset),rz=Math.max(.3,p.rz-inset);
 return Math.pow((x-p.cx)/rx,2)+Math.pow((z-p.cz)/rz,2)<=1;
}
function pondPoint(){
 const p=pondBounds();if(!p)return randomPoint();
 const t=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*.72;
 return new T.Vector3(p.cx+Math.cos(t)*r*(p.rx-.65),0,p.cz+Math.sin(t)*r*(p.rz-.65));
}
// Keep the pond caterpillar entirely above water; foot/base remains at or above the surface.
function pondSurfaceY(a){const p=pondBounds(),height=Math.max(.001,a.height||a.worldSize?.y||1);return p.surfaceY+.012+(1+Math.sin(elapsed*2+(a.pondSwim?.phase||0)))*Math.min(.013,height*.012);}
function swimPond(a,dt,speed){
 const p=pondBounds();if(!p)return;
 a.timer-=dt;
 if(a.timer<=0||!a.goal||!inPond(a.goal.x,a.goal.z,.72)){a.timer=2+Math.random()*3;a.goal=pondPoint();}
 const dx=a.goal.x-a.root.position.x,dz=a.goal.z-a.root.position.z,dist=Math.hypot(dx,dz);
 if(dist>.12){
  const step=Math.min(dist,dt*Math.max(.2,speed*.65));
  const x=a.root.position.x+dx/dist*step,z=a.root.position.z+dz/dist*step;
  if(inPond(x,z,.65)){a.root.position.x=x;a.root.position.z=z;a.root.rotation.y=Math.atan2(dx,dz);a.play('Walk');}
  else {a.timer=0;a.goal=pondPoint();a.play('Idle');}
 }else a.play('Idle');
 // The full caterpillar body stays above the pond; gentle bobbing never dips below the surface.
 a.root.position.y=pondSurfaceY(a);
}

// Big-Eyed Frog (articuno) owns a separate pond-hopping routine. It never swims,
// glides or walks on land. At rest its whole body stays at or above the water.
function pondFrogRestY(a){
 const p=pondBounds();
 return p?p.surfaceY+.015:0;
}
function emitPondFrogBubbles(a){
 if(!a?.root.parent||a.capturing)return;
 const group=new T.Group(),forward=a.root.rotation.y,scale=Math.max(.45,Math.min(1.6,a.height));
 group.position.copy(a.root.position);
 group.position.x+=Math.sin(forward)*scale*.26;
 group.position.z+=Math.cos(forward)*scale*.26;
 group.position.y+=a.height*.65;
 const droplets=[];
 const count=4+Math.floor(Math.random()*3);
 for(let i=0;i<count;i++){
  const radius=(.055+Math.random()*.045)*scale;
  const material=new T.MeshBasicMaterial({
   color:i%2?0xb9f8ff:0xe5fdff,transparent:true,opacity:.42,
   depthWrite:false,side:T.DoubleSide
  });
  const mesh=new T.Mesh(new T.SphereGeometry(radius,9,7),material);
  const angle=Math.random()*Math.PI*2,drift=.07+Math.random()*.23;
  mesh.position.set(Math.cos(angle)*drift,Math.random()*.12,Math.sin(angle)*drift);
  mesh.userData.origin=mesh.position.clone();
  mesh.userData.drift=new T.Vector3(Math.cos(angle)*(.14+Math.random()*.23),0,Math.sin(angle)*(.14+Math.random()*.23));
  droplets.push(mesh);
  group.add(mesh);
 }
 scene.add(group);
 addEffect({object:group,start:elapsed,duration:1.35,update:t=>{
  for(let i=0;i<droplets.length;i++){
   const m=droplets[i],rise=(.75+i*.11)*t;
   m.position.copy(m.userData.origin).addScaledVector(m.userData.drift,t);
   m.position.y+=rise;
   m.material.opacity=.42*(1-t);
   m.scale.setScalar(1+.25*t);
  }
 },done:()=>disposeCaptureFx(group)});
}
function hopPondFrog(a,dt){
 const p=pondBounds();if(!p)return;
 const q=a.pondJump,base=pondFrogRestY(a);
 if(!q.active){
  a.root.position.y=base;
  a.motionSpeed=0;
  a.play('Idle');
  // Finish the entire bubble-blowing pose while stationary. Never start the
  // next leap until the bubbles have appeared and the pose has ended.
  if(q.bubblingUntil){
   if(elapsed<q.bubblingUntil)return;
   q.bubblingUntil=0;
   q.bubbleNextAt=elapsed+5+Math.random()*7;
   q.wait=.35+Math.random()*.55;
   return;
  }
  // If the bubble timer expires mid-leap, wait until the frog has landed.
  if(elapsed>=q.bubbleNextAt){
   q.bubblingUntil=elapsed+1.45;
   q.wait=0;
   emitPondFrogBubbles(a);
   return;
  }
  q.wait-=dt;
  if(q.wait>0)return;
  // Choose a fresh destination strictly inside the pool at every leap.
  let destination=pondPoint();
  if(!inPond(destination.x,destination.z,.72))destination=pondPoint();
  q.start=a.root.position.clone();
  q.end=destination;
  // Wide per-leap height variation: small, medium and very high jumps,
  // measured relative to the newly enlarged wild model.
  q.peak=a.height*(.9+Math.random()*1.8);
  q.duration=.7+.4*(q.peak/Math.max(.001,a.height)/2.7);
  q.time=0;
  q.active=true;
  const dx=q.end.x-q.start.x,dz=q.end.z-q.start.z;
  if(Math.hypot(dx,dz)>.02)a.root.rotation.y=Math.atan2(dx,dz);
  if(Object.keys(a.actions||{}).some(k=>/jump|hop/i.test(k)))a.play('Jump',true);
  return;
 }
 q.time+=dt;
 const t=Math.min(1,q.time/q.duration),e=t*t*(3-2*t);
 const x=q.start.x+(q.end.x-q.start.x)*e,z=q.start.z+(q.end.z-q.start.z)*e;
 if(inPond(x,z,.55)){a.root.position.x=x;a.root.position.z=z;}
 a.root.position.y=base+q.peak*Math.sin(Math.PI*t);
 a.motionSpeed=Math.hypot(q.end.x-q.start.x,q.end.z-q.start.z)/q.duration;
 if(t>=1){
  a.root.position.set(q.end.x,base,q.end.z);
  q.active=false;
  q.wait=1+Math.random()*2.1;
  a.motionSpeed=0;
  a.play('Idle');
 }
}
// The bird's full world-space flight height increases with its scaled body size.
// Each individual has a different base and a slow, non-repeating cruising wave.
function wildFlightProfile(a,minimum=0){
 if(!a.flightProfile){
  const h=Math.max(.6,a.height||1.2);
  a.flightProfile={
   base:Math.max(minimum,1.35+h*1.28+(Math.random()-.5)*.65),
   variance:.17+Math.min(.5,h*.14),
   phase:Math.random()*Math.PI*2,cycle:23+Math.random()*14
  };
 }
 return a.flightProfile;
}
function wildFlightTarget(a,minimum=0){
 const f=wildFlightProfile(a,minimum);
 return f.base+f.variance*Math.sin(elapsed*2*Math.PI/f.cycle+f.phase);
}
function updateNativeFlightLayer(a,dt,phase){
 const bird=a.species?.form==='bird'||a.species?.form==='phoenix'||isAvian(a.path);
 const robot=a.species?.id==='typhlosion';
 if(!bird&&!robot)return;
 const airborne=phase==='fly',takingOff=phase==='takeoff',landing=phase==='landing';
 // Preserve each Blender/Three controller's native wing and takeoff animation.
 // Only lift the wild-world anchor for extra clearance.
 const baseline=Number(a.controller?.getMotionState?.()?.altitude??a.controller?.getState?.()?.altitude)||0;
 const target=(airborne||takingOff)?Math.max(0,wildFlightTarget(a,robot?4.25:0)-Math.max(0,baseline)):0;
 const smooth=1-Math.exp(-(landing?2.4:takingOff?1.25:airborne?1.5:5)*dt);
 a.root.position.y+=(target-a.root.position.y)*smooth;
 if(!airborne&&!takingOff&&!landing&&Math.abs(a.root.position.y)<.025)a.root.position.y=0;
}
function randomPoint(){for(let i=0;i<120;i++){const near=i<95,r=6+Math.random()*14,t=Math.random()*Math.PI*2,x=near?S.player.x+Math.cos(t)*r:(Math.random()-.5)*64,z=near?S.player.z+Math.sin(t)*r:(Math.random()-.5)*64;if(!blocked(x,z,1.5)&&!npcs.some(n=>n.root.position.distanceTo(new T.Vector3(x,0,z))<2))return new T.Vector3(x,0,z);}return new T.Vector3(9,0,5);}
let gymScenePromise=null,appearanceSpawnBusy=false;const appearanceAudio={context:null,eventId:null,timer:null,nodes:[],unlocked:false};
// Gym guardians are one-off post-victory encounters, NEVER part of the random wild pool.
function isGymGuardian(s){return !!s&&gyms.some(g=>g.spirit===s.id);}
function guardianEncounterAuthorized(s,event){
 if(!isGymGuardian(s)||!event?.eventId)return false;
 const gym=gyms.find(g=>g.id===event.gymId&&g.spirit===s.id&&g.spirit===event.speciesId);
 return !!gym&&!!S.state?.gyms?.[gym.id]?.cleared&&S.state?.specialAppearances?.[gym.id]?.eventId===event.eventId;
}
function specialEvents(){return Object.values(S.state?.specialAppearances||{}).filter(e=>guardianEncounterAuthorized(byId[e?.speciesId],e));}
function authorizedGuardianActor(a){
 if(!a?.specialEventId||!isGymGuardian(a.species))return false;
 const gym=gyms.find(g=>g.spirit===a.species.id),event=S.state?.specialAppearances?.[gym?.id];
 return !!event&&event.eventId===a.specialEventId&&guardianEncounterAuthorized(a.species,event);
}
async function gymSceneConfig(key){gymScenePromise||=fetch('data/gym-scenes.json?v=20261023-starspire-v1').then(r=>{if(!r.ok)throw Error('道館場景資料未就緒');return r.json();}).catch(e=>{gymScenePromise=null;throw e;});const config=(await gymScenePromise)[key];if(!config?.model)throw Error('道館場景未設定：'+key);return config;}
function gymBoundsBlocked(x,z,margin=.5){const b=battle?.sceneConfig?.bounds||{minX:-14,maxX:14,minZ:-14,maxZ:14};return x<b.minX+margin||x>b.maxX-margin||z<b.minZ+margin||z>b.maxZ-margin;}
function guardianPoint(){for(let i=0;i<24;i++){const angle=i/24*Math.PI*2,r=5.5+(i%3)*.7,x=S.player.x+Math.sin(angle)*r,z=S.player.z+Math.cos(angle)*r;if(!blocked(x,z,1.2))return new T.Vector3(x,0,z);}return randomPoint();}
// Scale only Xiaoshan summoned into the outdoor map after the third gym victory.
function sizeGuardianAppearance(a,event){
 if(!event.gymId||!event.speciesId||a.guardianSizeApplied)return;
 // Every post-trial guardian becomes 3x its previously displayed size.
 // Xiaoshan already had a 2.5x special boost; multiply that by 3.
 const factor=event.gymId==='gym_3'&&event.speciesId==='wigglytuff'?7.5:3;
 a.object.scale.multiplyScalar(factor);
 a.object.position.multiplyScalar(factor);
 a.height*=factor;
 a.worldSize.multiplyScalar(factor);
 a.guardianSizeApplied=true;
}
function enqueueGuardianAppearance(gym){S.state.specialAppearances||={};const previous=S.state.specialAppearances[gym.id];if(previous){const old=wild.find(w=>w.specialEventId===previous.eventId);if(old){if(old===target)clearTarget();if(old.specialLabel)removeLabel(old.specialLabel);wild.splice(wild.indexOf(old),1);removeActor(old);}}const event={eventId:gym.id+'-'+Date.now()+'-'+Math.floor(Math.random()*100000),gymId:gym.id,speciesId:gym.spirit,nextIn:0};S.state.specialAppearances[gym.id]=event;save();return event;}
async function ensureSpecialAppearances(){
 if(appearanceSpawnBusy||place||battle||!S.state)return;
 appearanceSpawnBusy=true;
 try{
  for(const event of specialEvents()){
   if(wild.some(w=>w.specialEventId===event.eventId))continue;
   while(outdoorWildCount()+spawnPending>=WILD_LIMIT){
    const old=wild.find(w=>!w.specialEventId&&!w.riverSwim&&w!==target)||wild.find(w=>!w.specialEventId&&!w.riverSwim);
    if(!old)break;
    if(old===target)clearTarget();
    wild.splice(wild.indexOf(old),1);removeActor(old);
   }
   if(outdoorWildCount()+spawnPending>=WILD_LIMIT)continue;
   spawnPending++;
   let a;
   try{a=await spawnWild(byId[event.speciesId],guardianPoint(),event);}
   finally{spawnPending--;}
   if(!a)continue;
   if(!guardianEncounterAuthorized(a.species,event)){
    wild.splice(wild.indexOf(a),1);removeActor(a);continue;
   }
   a.specialEventId=event.eventId;
   sizeGuardianAppearance(a,event);
   a.specialLabel=addLabel(a,'✦ 守護神獸 · '+a.species.name,'nameLabel guardianLabel');
  }
 }catch(e){S.errors.push(e.message);}
 finally{appearanceSpawnBusy=false;}
}
function completeGuardianAppearance(who){if(!who.specialEventId)return;for(const [key,event]of Object.entries(S.state.specialAppearances||{}))if(event.eventId===who.specialEventId)delete S.state.specialAppearances[key];if(who.specialLabel){removeLabel(who.specialLabel);who.specialLabel=null;}stopAppearanceBgm();save();}
function stopAppearanceBgm(){if(appearanceAudio.timer)clearInterval(appearanceAudio.timer);appearanceAudio.timer=null;appearanceAudio.eventId=null;for(const node of appearanceAudio.nodes){try{node.osc.stop();}catch(e){}node.osc.disconnect();node.gain.disconnect();}appearanceAudio.nodes=[];}
function playAppearancePhrase(event){const ctx=appearanceAudio.context;if(!ctx||ctx.state!=='running')return;const s=byId[event.speciesId],base=({electric:392,psychic:261.63,fairy:329.63,normal:293.66})[s.element]||293.66,notes=({electric:[1,1.5,2,1.25,1.5,2],psychic:[1,1.25,1.5,2,1.5,1.25],fairy:[1,1.5,1.25,2,1.5,1.25],normal:[1,1.25,1.5,1.25,2,1.5]})[s.element]||[1,1.25,1.5,2,1.5,1.25],now=ctx.currentTime;for(const [i,note]of notes.entries()){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=s.element==='electric'?'triangle':'sine';osc.frequency.value=base*note;osc.connect(gain);gain.connect(ctx.destination);const at=now+i*.36;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.025,at+.04);gain.gain.exponentialRampToValueAtTime(.0001,at+.62);osc.start(at);osc.stop(at+.65);const item={osc,gain};appearanceAudio.nodes.push(item);osc.onended=()=>{osc.disconnect();gain.disconnect();const j=appearanceAudio.nodes.indexOf(item);if(j>=0)appearanceAudio.nodes.splice(j,1);};}}
function syncAppearanceBgm(){window.PhantomBgm?.setScene(battle?(battle.gym?'challenge':'arena'):'general');window.PhantomBgm?.setDucked(!!appearanceAudio.eventId);if(document.hidden){if(appearanceAudio.eventId)stopAppearanceBgm();return;}const event=(!place&&!battle&&!modal&&!dialog)?(specialEvents().find(e=>target?.specialEventId===e.eventId)||specialEvents().find(e=>wild.some(w=>w.specialEventId===e.eventId))):null;if(!event||!appearanceAudio.unlocked||appearanceAudio.context?.state!=='running'){if(appearanceAudio.eventId)stopAppearanceBgm();return;}if(appearanceAudio.eventId===event.eventId)return;stopAppearanceBgm();appearanceAudio.eventId=event.eventId;playAppearancePhrase(event);appearanceAudio.timer=setInterval(()=>{if(appearanceAudio.eventId===event.eventId)playAppearancePhrase(event);},2400);}
function unlockAppearanceAudio(){try{if(!appearanceAudio.context){const Constructor=window.AudioContext||window.webkitAudioContext;if(!Constructor)return;appearanceAudio.context=new Constructor();}appearanceAudio.unlocked=true;appearanceAudio.context.resume().then(syncAppearanceBgm).catch(()=>{});}catch(e){}}
addEventListener('pointerdown',unlockAppearanceAudio,{passive:true});addEventListener('keydown',unlockAppearanceAudio);addEventListener('pagehide',stopAppearanceBgm);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAppearanceBgm();});
function tickSpecialAppearances(dt){if(!S.state)return;const due=[];for(const event of specialEvents()){event.nextIn=Math.max(0,(Number.isFinite(event.nextIn)?event.nextIn:180)-dt);if(event.nextIn<=0&&!place&&!battle&&!modal&&!dialog&&wild.some(w=>w.specialEventId===event.eventId))due.push(event);}if(due.length){showWorldBroadcast('守護神獸「'+due.map(e=>byId[e.speciesId].name).join('、')+'」出現於場景中！'+(!appearanceAudio.unlocked?' 點一下畫面啟用牠們的旋律。':''),'guardian');for(const event of due)event.nextIn=180;save();}if(!place&&!battle&&specialEvents().some(e=>!wild.some(w=>w.specialEventId===e.eventId)))ensureSpecialAppearances();syncAppearanceBgm();}
async function showGymVictory(){const el=document.createElement('div');el.className='gymVictory';el.textContent='勝利!!';el.style.opacity='0';document.body.append(el);playHeroOutcome(true);try{await captureTween(.85,t=>{el.style.opacity=String(t);el.style.transform='scale('+(.94+t*.06)+')';});await captureTween(.8,()=>{});await captureTween(.35,t=>el.style.opacity=String(1-t));}finally{el.remove();}}
// 新手教學、圖鑑 HUD 與特殊幻靈共享 58 種一般幻靈的收錄分母；挑戰塔首領卡牌獨立計算。
// 25% 三選一未領取的兩隻（包含 C囝仔）、45% 小黃、75% 綠眼蝙怪。
const LAB_WILD_THRESHOLD=Rules.thresholds.lab;
const MILESTONE_SPECIALS=[{id:'giratina',percent:Rules.thresholds.yellow},{id:'dialga',percent:Rules.thresholds.greenBat}];
function dexStats(){return Rules.progress(spirits,owned);}
function dexReached(percent){const p=dexStats();return p.total>0&&p.owned>=Rules.countAt(p.total,percent);}
function dexComplete(){const p=dexStats();return p.total>0&&p.owned===p.total;}
function isOneTimeSpecial(id){return LAB_LEGENDS.some(e=>e.id===id)||MILESTONE_SPECIALS.some(e=>e.id===id);}
function milestoneTargets(){
 if(dexComplete())return [];
 const caught=S.state.worldFlags?.labLegendWildCaught||{},list=[];
 if(labClaimed()&&labLegendMilestoneReached())for(const e of LAB_LEGENDS)if(e.id!==S.state.dreamLabLegendChoice&&!caught[e.id]&&pondRespawnAllowed(e.id))list.push({id:e.id,percent:LAB_WILD_THRESHOLD});
 for(const e of MILESTONE_SPECIALS)if(dexReached(e.percent)&&!caught[e.id]&&!owned(e.id))list.push(e);
 return list;
}
function labLegendMilestoneReached(){return dexReached(LAB_WILD_THRESHOLD);}
function eligible(s){
 if(s.acquisition==='tower'||BOSS_CARD_IDS.includes(s.id))return false;
 if(s.captureEvolutionOnly||s.evolutionOnly||Rules.evolutionOnlyWild.includes(s.id))return false;
 const special=MILESTONE_SPECIALS.find(e=>e.id===s.id);
 if(special)return dexReached(special.percent)&&(dexComplete()||!owned(s.id));
 if(isBook(s)||isGymGuardian(s))return false;
 if(LAB_LEGENDS.some(e=>e.id===s.id)){
  if(!labClaimed())return false;
  if(!labLegendMilestoneReached())return false;
  if((s.id==='articuno'||s.id==='entei')&&!pondRespawnAllowed(s.id))return false;
  if(s.id==='raikou'){
   const flags=S.state.worldFlags||{},caught=!!flags.labLegendWildCaught?.raikou;
   if(!dexComplete())return !caught;
   return Date.now()>=(Number(flags.labLegendRespawnAt?.raikou)||0);
  }
  return dexComplete()||!S.state.worldFlags?.labLegendWildCaught?.[s.id];
 }
 if(WATER_EVENT_ONLY.includes(s.id))return false;
 if(s.id==='jigglypuff')return S.state.wins>0;
 if(s.previous&&!owned(s.previous))return false;
 if(s.role==='legendary'||s.rarity==='傳說'){
  const list=regularSpirits().filter(x=>(x.role==='legendary'||x.rarity==='傳說')&&!['mew','wigglytuff','pikachu'].includes(x.id));
  const index=list.indexOf(s),threshold=index<4?.25:index<8?.5:.75;
  return dexReached(threshold);
 }
 return true;
}
function isAirborne(s){return /^(fly|flying|float|hover)$/.test(s.motionType||'')||/^(bird|owl|phoenix|manta|moth|dragonfly|serpent|griffin)$/.test(s.form||'');}
function captureTween(duration,update){return new Promise(resolve=>addEffect({start:elapsed,duration,update,done:resolve}));}
function disposeCaptureFx(root){detach(root);root.traverse(n=>{if(n.geometry)n.geometry.dispose();const materials=Array.isArray(n.material)?n.material:[n.material];materials.forEach(m=>{if(m)m.dispose();});});}
async function transformEggEncounter(who){if(who.species?.id!=='jigglypuff'||!who.eggEncounter)return who;const state=AvianRules.nextFailure(who.eggEncounter),next=byId[state.speciesId];if(!next)return;
 // A failed capture evolves this one encounter; do not grant a card or change its
 // capture-failure count until the cinematic has completed. Reuse exactly the
 // same accelerating white-flash 3D sequence as collection-card evolution.
 // Preload the next form before starting so its wild actor can be swapped
 // immediately after the screen-white finale without showing an empty frame.
 await asset(next.model);
 document.body.classList.add('evolution-playing');
 try{await playEvolutionSequence(who.species,next);}
 finally{document.body.classList.remove('evolution-playing');}
 const replacement=await actor(next.model,Number(sizeRule(next).desiredWorldHeight)||next.height,who.root.parent||townGroup);replacement.species=next;replacement.eggEncounter=null;replacement.eggTransformed=true;replacement.root.position.copy(who.root.position);replacement.root.rotation.copy(who.root.rotation);replacement.root.scale.set(1,1,1);replacement.home=replacement.root.position.clone();replacement.goal=replacement.home.clone();replacement.timer=0;replacement.berry=false;const index=wild.indexOf(who),wasTarget=target===who,wasLocked=locked;if(index>=0)wild[index]=replacement;if(wasTarget)clearTarget();removeActor(who);if(wasTarget){target=replacement;locked=wasLocked;if(locked)showLockMarker(replacement);}captureBurst(replacement.root.position.clone().add(new T.Vector3(0,replacement.height*.5,0)),0xffe0ac,false);toast('三色蛋掙脫靈核球，隨機進化成 '+next.name+'！');return replacement;}
function showLockMarker(who){const group=new T.Group(),ring=new T.Mesh(new T.RingGeometry(.7,.86,48),new T.MeshBasicMaterial({color:0xffe36c,side:T.DoubleSide,transparent:true,opacity:.95,depthTest:false,depthWrite:false})),arrow=new T.Mesh(new T.ConeGeometry(.22,.5,3),new T.MeshBasicMaterial({color:0xffed95,depthTest:false,depthWrite:false}));ring.rotation.x=-Math.PI/2;arrow.rotation.z=Math.PI;group.add(ring,arrow);scene.add(group);const e={object:group,start:elapsed,duration:1e8,update:()=>{if(target!==who||!locked||!who.root.parent){e.duration=0;group.visible=false;return;}group.visible=!who.capturing;group.position.copy(who.root.position);const surface=waterCaptureSurface(who);ring.position.y=(surface===null?0:surface-who.root.position.y)+.04;ring.rotation.z=elapsed*.8;ring.scale.setScalar(1+Math.sin(elapsed*4)*.08);arrow.position.y=who.height+.65+Math.sin(elapsed*4)*.12;},done:()=>disposeCaptureFx(group)};addEffect(e);}
function captureBurst(position,color,success){const group=new T.Group(),ring=new T.Mesh(new T.RingGeometry(.48,.56,48),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:1,depthWrite:false}));ring.rotation.x=-Math.PI/2;group.position.copy(position);group.add(ring);const stars=[];for(let i=0;i<(success?20:10);i++){const star=new T.Mesh(new T.OctahedronGeometry(success?.105:.065),new T.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));star.userData.direction=new T.Vector3(Math.cos(i*2.4),.2+Math.sin(i*1.7)*.6,Math.sin(i*2.4));group.add(star);stars.push(star);}scene.add(group);addEffect({object:group,start:elapsed,duration:success?1.25:.6,update:t=>{ring.scale.setScalar(.5+t*(success?5:2));ring.material.opacity=1-t;stars.forEach((s,i)=>{s.position.copy(s.userData.direction).multiplyScalar(t*(success?2.3:1.1));s.rotation.set(t*8,i+t*6,t*4);s.material.opacity=Math.sin(Math.PI*t);});},done:()=>disposeCaptureFx(group)});}
function sizeRule(species){const rule=modelSizeOverrides[species.id]||modelSizeOverrides[species.model]||{};return typeof rule==='number'?{desiredWorldHeight:rule}:rule;}
function updateFlight(a,dt){
 if(!a.airborne)return;
 a.flightRemaining-=dt;
 if(a.flightRemaining<=0){
  a.flightState=a.flightState==='air'?'ground':'air';
  a.flightRemaining=a.flightState==='air'?20+Math.random()*20:6+Math.random()*6;
  if(a.flightState==='air')a.flightProfile=null; // different altitude each new flight
 }
 const height=a.flightState==='air'?wildFlightTarget(a):0;
 a.flightBase=height;
 a.root.position.y+=(height-a.root.position.y)*(1-Math.exp(-1.8*dt));
 if(!height&&a.root.position.y<.025)a.root.position.y=0;
}
function collectPickup(a){const k=a.pickupKey,amount=k==='core'?5:k==='berry'?3:1;if(k==='core')S.state.pokeballs+=amount;else if(k==='great_core')S.state.greatBallCount+=amount;else if(k==='berry')S.state.berryCount+=amount;else S.state.items.potion=number(S.state.items.potion)+amount;a.root.visible=false;a.respawn=elapsed+90;a.root.position.copy(randomPoint());return({core:'靈核球',great_core:'高階靈核球',berry:'星露果',potion:'初光藥劑',evolutionStone:'雷光結晶'})[k]+' +'+amount;}
function showWorldBroadcast(text,channel='general'){const el=$(channel==='guardian'?'guardianBroadcast':'broadcast');if(el){clearTimeout(el.dismissTimer);el.textContent=text;el.hidden=false;layoutWorldNotifications();el.dismissTimer=setTimeout(()=>{el.hidden=true;layoutWorldNotifications();},12000);}}
function guideTips(){const q=S.state.caveQuest||{},allOwned=ids=>ids.every(id=>owned(id));return PhantomTownRewards.pendingTips([
 {text:'第六步任務｜到河邊進行3對3釣魚擂台，累積3勝可得無盡洞穴1000點！沿北側橋梁抵達探索山洞即可進入副本。',done:()=>q.fishingWins>=3||q.claims?.['cave-fishing']},
 {text:'洞穴攻略｜用金魚國王與皇后卡片各3張向釣魚郎交換魚飼料，河畔召喚並締約水蛟龍王，再得1000點。',done:()=>q.claims?.['cave-dragon']||q.dragonCaught},
 {text:'尚未收錄的特殊幻靈：'+[...LAB_LEGENDS,...MILESTONE_SPECIALS].filter(x=>!owned(x.id)).map(x=>byId[x.id]?.name).join('、')+'，請依圖鑑條件完成探索。',done:()=>allOwned([...LAB_LEGENDS,...MILESTONE_SPECIALS].map(s=>s.id))},
 {text:'池塘尚未收錄：'+['articuno','entei'].filter(id=>!owned(id)).map(id=>byId[id]?.name).join('、')+'，請依原出現條件探索。',done:()=>allOwned(['articuno','entei'])},
 {text:Rules.towerDropNotice(),done:()=>!!towerProgress().towerRewardClaimed},
 {text:'尚未完成的初光挑戰：'+gyms.filter(g=>!S.state.gyms[g.id]?.cleared).map(g=>g.name||byId[g.spirit]?.name).join('、')+'；勝利可解鎖服裝。',done:()=>gyms.every(g=>S.state.gyms[g.id]?.cleared)},
 {text:'圖鑑委託｜收錄 '+Rules.quest.requiredSpecies+' 種不同一般幻靈，找巡護員領三種靈核球各 '+Rules.quest.eachBallReward+' 顆。',done:()=>!!S.state.quests.firstResearch},
 {text:'河畔釣魚3對3可連戰；每勝一場於連戰結束時新增2隻小金魚。國王與皇后卡片各3張可換魚飼料。',done:()=>q.claims?.['cave-dragon']||q.dragonCaught},
 {text:'特殊進階待完成：'+['raikou','entei','articuno','giratina'].filter(id=>{const next=byId[id]?.evolvesTo||byId[id]?.next;return next&&!owned(next);}).map(id=>byId[id]?.name+(id==='giratina'?'（累計參戰3場）':'（連續完成3場擂台）')).join('、'),done:()=>['raikou','entei','articuno','giratina'].every(id=>{const next=byId[id]?.evolvesTo||byId[id]?.next;return !next||owned(next);})},
 {text:'三色蛋在戰鬥獲勝後可能現身；固定締約成功率30%，失敗時可能變成小麻、咕咕或小鷹。',done:()=>owned('jigglypuff')},
 {text:'找大夢博士領取冒險服，穿著後每10秒吸收場上可收集的補給和道具。',done:()=>!!S.state.adventureClaimed||S.state.unlockedCostumes.includes('healing')}
 ],S.state);}
function tickGuideBroadcast(){if(elapsed<guideBroadcastAt||place||battle||dialog||modal)return;guideBroadcastAt=elapsed+300;const tips=guideTips();if(tips.length)showWorldBroadcast('旅人攻略｜'+tips[guideBroadcastIndex++%tips.length]);}

async function spawnWild(species,position,guardianEvent=null){
 if(!species||isChest(species)||isBook(species))return null;
 // C囝仔可在陸地隨機出現，但同時只保留一隻等待締約；避免全圖鑑後繞過冷卻。
 if(species.id==='raikou'&&wild.some(w=>w.species.id==='raikou'))return null;
 if(!dexComplete()&&isOneTimeSpecial(species.id)&&wild.some(w=>w.species.id===species.id))return null;
 if(isGymGuardian(species)&&!guardianEncounterAuthorized(species,guardianEvent))return null;
 if((species.id==='articuno'||species.id==='entei')&&!pondRespawnAllowed(species.id))return null;
 const rule=sizeRule(species),height=Number(rule.desiredWorldHeight||rule.height)||1.275*Math.pow(1.3,Math.min(2,(species.stage||1)-1)),a=await actor(species.model,height);
 if(isGymGuardian(species)&&!guardianEncounterAuthorized(species,guardianEvent)){removeActor(a);return null;}
 if((species.id==='articuno'||species.id==='entei')&&!pondRespawnAllowed(species.id)){removeActor(a);return null;}
 if(!dexComplete()&&isOneTimeSpecial(species.id)&&wild.some(w=>w.species.id===species.id)){removeActor(a);return null;}
 const dimensions=a.worldSize||posedBounds(a.object).getSize(new T.Vector3()),maxSpan=Math.min(6,Number(rule.maxSpan)||6),ratio=Math.min(1,maxSpan/Math.max(dimensions.x,dimensions.z,.001));if(ratio<1){a.object.scale.multiplyScalar(ratio);a.object.position.multiplyScalar(ratio);a.height*=ratio;a.worldSize.multiplyScalar(ratio);}
 // Outdoor capturable instances only; gym/arena/collection visuals keep their own sizes.
 const wildFactor=(species.id==='pikachu'?2.55/Math.max(.001,a.height):species.id==='wigglytuff'?4/3:species.id==='blissey'?2/3:(species.id==='meganium'?1.95:['chikorita','bayleef'].includes(species.id)?1.5:['mew','feraligatr'].includes(species.id)?2:1)*SpiritCombat.outdoorScale(species))*(species.id==='articuno'?3/4:species.id==='giratina'?2/3:1)*Rules.wildScaleFor(species)*Rules.guardianOverworldScale(species);if(Math.abs(wildFactor-1)>.001){a.object.scale.multiplyScalar(wildFactor);a.object.position.multiplyScalar(wildFactor);a.height*=wildFactor;a.worldSize.multiplyScalar(wildFactor);}a.species=species;
 if(species.id==='jigglypuff')a.eggEncounter={origin:'jigglypuff',failures:0};
 if(species.id==='blissey')a.controller?.setFlightHeight?.(4.6);
 // Every wild water caterpillar, including a lab milestone spawn, belongs to
 // the pond. Never select a terrain point outside the water collider.
 const spawnPosition=(species.id==='entei'||species.id==='articuno')&&pondBounds()
  ?(position&&inPond(position.x,position.z,.8)?position:pondPoint())
  :(position||randomPoint());
 a.root.position.copy(spawnPosition);a.airborne=!isReplacement(species.model)&&!isAvian(species.model)&&!isFrog(species.model)&&!isRobot(species.model)&&!isLightPhoenix(species.model)&&!isFloralDeer(species.model)&&!isOutouman(species.model)&&!isRiceball(species.model)&&!NativeFamilies.has(species.model)&&isAirborne(species);a.flightState=a.airborne?'air':'ground';a.flightAltitude=1.8+Math.random()*1.2;a.flightRemaining=20+Math.random()*20;a.flightBase=a.airborne?a.flightAltitude:0;a.flightPhase=Math.random()*Math.PI*2;a.root.position.y=a.flightBase;a.home=a.root.position.clone();a.goal=a.home.clone();a.timer=Math.random()*3;a.berry=false;
 if(species.id==='entei'&&pondBounds()){
  a.pondSwim={phase:Math.random()*Math.PI*2};
  a.airborne=false;a.flightState='ground';a.flightBase=0;
  a.root.position.y=pondSurfaceY(a);
  a.home=a.root.position.clone();a.goal=pondPoint();
 }
 if(species.id==='articuno'&&pondBounds()){
  a.pondJump={active:false,wait:1+Math.random()*1.8,bubbleNextAt:elapsed+3+Math.random()*6};
  a.airborne=false;a.flightState='ground';a.flightBase=0;
  a.root.position.y=pondFrogRestY(a);
  a.home=a.root.position.clone();a.goal=pondPoint();
 }
 wild.push(a);return a;}
// ---- 河道水系幻靈：只在 river.waterSpiritZone 內游動，身體約 2/3 露出水面
function riverSurfaceY(a){return river.config.surfaceY-a.height*(a.riverSwim.sink??1/3);}
// 河道上的點，但避開橋下（side：-1 橋西、1 橋東；不給就隨機）
function riverPoint(side){const C=river.config,p=river.randomWaterPoint(),gap=C.bridgeHalfWidth+2.6;side=side||(Math.random()<.5?-1:1);if((p.x-C.bridgeX)*side<gap)p.x=C.bridgeX+side*(gap+Math.random()*Math.max(1,C.waterSpiritZone.maxX-C.bridgeX-gap));return p;}
function swimRiver(a,dt){
 a.timer-=dt;
 if(a.timer<0||!a.goal){a.timer=3+Math.random()*4;a.goal=riverPoint(Math.sign(a.root.position.x-river.config.bridgeX)||1);}
 const d=a.goal.clone().sub(a.root.position);d.y=0;
 if(d.length()>.25){d.normalize();a.root.position.x+=d.x*a.riverSwim.speed*dt;a.root.position.z+=d.z*a.riverSwim.speed*dt;a.root.rotation.y=Math.atan2(d.x,d.z);a.play('Walk');}else a.play('Idle');
 a.root.position.y=riverSurfaceY(a)+Math.sin(elapsed*2.2+a.riverSwim.phase)*.06;
}
async function spawnOnRiver(species,point,opts={}){
 if(!river||!species)return null;
 // 河道魚不占一般野生名額，也不從河裡移除先前連戰已發放的魚。
 const w=await spawnWild(species,point||riverPoint());if(!w)return null;
 w.airborne=false;w.flightState='ground';w.flightBase=0;
 w.riverSwim={sink:opts.sink??1/3,speed:opts.speed??.9,phase:Math.random()*6};
 w.root.position.y=riverSurfaceY(w);w.goal=riverPoint(Math.sign(w.root.position.x-river.config.bridgeX)||1);
 river.jump?.(w.root.position.x,w.root.position.z);
 return w;
}
async function spawnRiverGoldfish(wins=0){
 // 同一次釣魚連戰結束時才依累計勝場結算；每獲勝一場新增兩隻小金魚。
 const victories=Math.max(0,Math.floor(Number(wins)||0)),required=victories*2,list=[];
 if(!river||!byId.kyogre||required===0)return list;
 for(let i=0;i<required;i++){const w=await spawnOnRiver(byId.kyogre);if(w){w.fishingReward=true;list.push(w);}}
 if(list.length){
  showWorldBroadcast('釣魚連戰獲勝 '+victories+' 場｜河道新增 '+list.length+' 隻小金魚，請靠近河岸鎖定締約！');
  toast('連戰結束｜獲勝 '+victories+' 場，小金魚 ×'+list.length);
 }
 if(list.length!==required)S.errors.push('釣魚連戰獎勵不足：預計 '+required+' 隻，實際 '+list.length+' 隻');
 return list;
}
// 魚飼料：靠近河邊召喚水蛟龍王（每次消耗 1 份）
async function summonWaterDragon(){
 if(!river||number(S.state.items.fishFood)<1||battle||modal||dialog)return;
 if(wild.some(w=>w.species.id==='mewtwo'))return toast('水蛟龍王已經在河道上了！');
 S.state.items.fishFood=number(S.state.items.fishFood)-1;save();
 const side=Math.sign(S.player.x-river.config.bridgeX)||1,p=riverPoint(side);p.x=side*Math.max(river.config.bridgeHalfWidth+4,Math.abs(S.player.x-river.config.bridgeX))+river.config.bridgeX;p.x=Math.max(river.config.waterSpiritZone.minX+3,Math.min(river.config.waterSpiritZone.maxX-3,p.x));
 const w=await spawnOnRiver(byId.mewtwo,p,{sink:.18,speed:.6});
 if(w){for(let i=0;i<3;i++)setTimeout(()=>river.jump?.(p.x+(Math.random()-.5)*3,p.z),i*350);showWorldBroadcast('魚飼料灑入河中……水蛟龍王破浪而出！');toast('水蛟龍王出現了！快鎖定締約。');}
 else{S.state.items.fishFood=number(S.state.items.fishFood)+1;save();}
}
let labWildSpawnBusy=false;
function labLegendWildPoint(){
 for(let i=0;i<32;i++){
  const angle=Math.PI*2*i/32,r=6.5+(i%4)*1.1,x=S.player.x+Math.sin(angle)*r,z=S.player.z+Math.cos(angle)*r;
  if(!blocked(x,z,1.4)&&!wild.some(w=>Math.hypot(w.root.position.x-x,w.root.position.z-z)<3))
   return new T.Vector3(x,0,z);
 }
 return randomPoint();
}
async function ensureLabLegendWilds(){
 if(labWildSpawnBusy||!S.ready||place||battle)return;
 const targets=milestoneTargets();if(!targets.length)return;
 labWildSpawnBusy=true;
 const appeared=[];
 try{
  for(const entry of targets){
   if(wild.some(w=>w.species.id===entry.id))continue;
   if(place||battle)break;
   if(outdoorWildCount()>=WILD_LIMIT){
    const victim=wild.find(w=>w!==target&&!w.specialEventId&&!w.labLegendStarter&&!w.riverSwim&&!w.pondSwim&&!w.pondJump);
    if(!victim)break;
    wild.splice(wild.indexOf(victim),1);removeActor(victim);
   }
   const spirit=byId[entry.id];if(!spirit)continue;
   const w=await spawnWild(spirit,(spirit.id==='articuno'||spirit.id==='entei')?pondPoint():labLegendWildPoint());
   if(!w)continue;
   if(place||battle){wild.splice(wild.indexOf(w),1);removeActor(w);break;}
   w.labLegendStarter=true;
   appeared.push({name:spirit.name,percent:entry.percent});
  }
  for(const percent of [LAB_WILD_THRESHOLD,...MILESTONE_SPECIALS.map(e=>e.percent)]){
   const names=appeared.filter(a=>a.percent===percent).map(a=>a.name);if(!names.length)continue;
   const label='圖鑑達 '+Math.round(percent*100)+'%';
   showWorldBroadcast(label+'｜'+(percent===LAB_WILD_THRESHOLD?'大夢研究所傳說幻靈':'特殊幻靈')+'：'+names.join('、')+'出現在初光鎮，快去締約！','guardian');
   toast(label+'｜'+names.join('、')+'已出現在初光鎮！');
  }
 }catch(error){S.errors.push('圖鑑進度特殊幻靈出現：'+error.message);}
 finally{labWildSpawnBusy=false;}
}
const POND_RESPAWN_MS=Rules.pond.respawnMs;
function pondRespawnAllowed(id){
 if(id!=='entei'&&id!=='articuno')return true;
 const flags=S.state?.worldFlags||{},caught=!!flags.pondCapturedOnce?.[id]||Number(flags.pondRespawnAt?.[id])>0||!!flags.labLegendWildCaught?.[id];
 // 未集齊 58 種前只能在水池捕捉一次；舊存檔的 pondRespawnAt 亦視為已捕捉。
 if(!dexComplete())return !caught;
 // 全圖鑑完成後才恢復一小時重生機制；既有時間戳延續，不重置存檔。
 return Date.now()>=(Number(flags.pondRespawnAt?.[id])||0);
}
function recordPondCapture(who){
 if(!who||(who.species?.id!=='entei'&&who.species?.id!=='articuno')||!(who.pondSwim||who.pondJump))return;
 S.state.worldFlags||={};
 S.state.worldFlags.pondCapturedOnce||={};
 S.state.worldFlags.pondRespawnAt||={};
 S.state.worldFlags.pondCapturedOnce[who.species.id]=true;
 S.state.worldFlags.pondRespawnAt[who.species.id]=Date.now()+POND_RESPAWN_MS;
}
let pondSpawnBusy=false,pondFrogSpawnBusy=false;
function pondCaterpillarAvailable(){return !!byId.entei&&eligible(byId.entei);}
async function ensurePondCaterpillar(){
 if(pondSpawnBusy||!S.ready||place||battle||!pondBounds()||!pondCaterpillarAvailable()||!pondRespawnAllowed('entei')||wild.some(a=>a.species.id==='entei'))return;
 pondSpawnBusy=true;
 try{
  while(outdoorWildCount()+spawnPending>=WILD_LIMIT){
   const old=wild.find(w=>!w.specialEventId&&!w.labLegendStarter&&!w.riverSwim&&!w.pondSwim&&w!==target);
   if(!old)break;wild.splice(wild.indexOf(old),1);removeActor(old);
  }
  if(outdoorWildCount()+spawnPending<WILD_LIMIT){
   spawnPending++;
   try{await spawnWild(byId.entei,pondPoint());}
   finally{spawnPending--;}
  }
 }catch(e){S.errors.push('水池水毛蟲：'+e.message);}
 finally{pondSpawnBusy=false;}
}
async function ensurePondFrog(){
 if(pondFrogSpawnBusy||!S.ready||place||battle||!pondBounds()||!byId.articuno||!eligible(byId.articuno)||!pondRespawnAllowed('articuno')||wild.some(a=>a.species.id==='articuno'))return;
 pondFrogSpawnBusy=true;
 try{
  while(outdoorWildCount()+spawnPending>=WILD_LIMIT){
   const old=wild.find(w=>!w.specialEventId&&!w.labLegendStarter&&!w.riverSwim&&!w.pondSwim&&!w.pondJump&&w!==target);
   if(!old)break;
   wild.splice(wild.indexOf(old),1);removeActor(old);
  }
  if(outdoorWildCount()+spawnPending<WILD_LIMIT){
   spawnPending++;
   try{await spawnWild(byId.articuno,pondPoint());}
   finally{spawnPending--;}
  }
 }catch(e){S.errors.push('水池大眼蛙：'+e.message);}
 finally{pondFrogSpawnBusy=false;}
}
async function populate(){
 await ensureSpecialAppearances();
 await ensurePondCaterpillar();
 await ensurePondFrog();
 while(outdoorWildCount()+spawnPending<WILD_LIMIT){const s=chooseWild();if(!s)break;await spawnWild(s);}
}
async function replenish(){
 if(!S.ready)return;
 await ensureSpecialAppearances();await ensureLabLegendWilds();await ensurePondCaterpillar();await ensurePondFrog();
 if(outdoorWildCount()+spawnPending>=WILD_LIMIT)return;
 spawnPending++;
 try{const s=chooseWild();if(s)await spawnWild(s);}
 catch(e){S.errors.push(e.message);}
 finally{spawnPending--;}
}
async function spawnSupplies(){const keys=['core','great_core','berry','potion'],colors={core:0xe3ac18,great_core:0x13d8e0,berry:0xf04eab,potion:0x51e478,evolutionStone:0xc27cff};await Promise.all(keys.map(async(key,i)=>{if(!world.props?.[key])return;const a=await actor(world.props[key],.55),clones=new Map();a.object.traverse(n=>{if(!n.isMesh)return;const list=(Array.isArray(n.material)?n.material:[n.material]).map(original=>{if(!clones.has(original)){const m=original.clone();const hsl={};m.color?.getHSL(hsl);if(m.color)m.color.setHSL(hsl.h,Math.max(.7,hsl.s),Math.max(.3,Math.min(.72,hsl.l)));m.emissive?.setHex(colors[key]);m.emissiveIntensity=.4;if(m.roughness!==undefined)m.roughness=.28;clones.set(original,m);}return clones.get(original)});n.material=Array.isArray(n.material)?list:list[0];});const halo=new T.Mesh(new T.RingGeometry(.31,.43,32),new T.MeshBasicMaterial({color:colors[key],transparent:true,opacity:.62,side:T.DoubleSide,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.y=-.22;a.root.add(halo);a.pickupHalo=halo;a.pickupKey=key;a.root.position.copy(randomPoint());a.root.position.y=.35;a.home=a.root.position.clone();a.respawn=0;pickups.push(a);}));}
// Pickup objects remain in the world until the absorption animation arrives
// at the traveler. Ordinary proximity pickup still works without a delay.
function startAdventureAbsorption(items){
 const pending=items.filter(a=>a&&!a.absorbing&&a.respawn<=elapsed&&a.root.visible&&a.root.parent);
 if(!pending.length)return;
 const rewards=[];
 const batch={remaining:pending.length};
 pending.forEach((a,i)=>{
  const origin=a.root.position.clone(),startTime=elapsed;
  const duration=.65+i*.105;
  a.absorbing=true;
  addEffect({
   start:startTime,duration,
   update:t=>{
    if(!a.absorbing)return;
    const eased=t*t*(3-2*t);
    const destination=hero.root.position.clone().add(new T.Vector3(0,1.25,0));
    a.root.position.lerpVectors(origin,destination,eased);
    a.root.position.y+=Math.sin(t*Math.PI)*(.95+(i%3)*.13);
    a.root.rotation.y+=.055;
    const pulse=.75+.25*Math.sin(t*Math.PI*5);
    a.root.scale.setScalar(Math.max(.10,1-eased*.75)*pulse);
    if(a.pickupHalo)a.pickupHalo.material.opacity=Math.max(.12,1-t);
   },
   done:()=>{
    // Switching to an interior or battle cancels the pending pickup safely.
    const canCollect=a.absorbing&&!place&&!battle;
    a.absorbing=false;
    a.root.scale.setScalar(1);
    if(canCollect){rewards.push(collectPickup(a));}
    else {a.root.position.copy(origin);a.root.visible=a.respawn<=elapsed;}
    batch.remaining--;
    if(batch.remaining===0&&rewards.length){
     save();
     toast('冒險服自動吸收｜'+rewards.join('、'));
    }
   }
  });
 });
}
function collectSupplies(){
 if(pickupCostume!==S.state.costume){
  pickupCostume=S.state.costume;
  adventureCollectAt=elapsed+10;
 }
 if(place||battle||modal||dialog)return;
 const automatic=S.state.costume==='adventure'&&elapsed>=adventureCollectAt;
 if(automatic)adventureCollectAt=elapsed+10;
 const candidates=[],received=[];
 for(const a of pickups){
  if(a.absorbing)continue;
  if(a.respawn>elapsed){a.root.visible=false;continue;}
  a.root.visible=true;
  a.root.position.y=.4+Math.sin(elapsed*2)*.12;
  a.root.rotation.y+=.015;
  if(a.pickupHalo)a.pickupHalo.material.opacity=.45+Math.sin(elapsed*3)*.16;
  if(automatic)candidates.push(a);
  else if(a.root.position.distanceTo(S.player)<1.3)received.push(collectPickup(a));
 }
 if(candidates.length)startAdventureAbsorption(candidates);
 if(received.length){save();toast('取得補給｜'+received.join('、'));}
}
const heroCostumes=HeroCostumes.create(T);
function applyHeroCostumeLook(root,id){heroCostumes.apply(root,id);}
const soundCostumeMotion={previousX:null,previousZ:null,hover:0,lean:0};
function ensureSoundCostume(){
 if(!hero)return;
 if(!hero.soundHoverAnchor){
  // A shoulder-height pivot preserves the original GLTF ground anchor while
  // allowing a natural lean during mid-air motion.
  const anchor=new T.Group(),pivot=new T.Group(),centerY=1.10;
  anchor.name='小山蝴蝶套裝・主角漂浮';
  pivot.name='主角前傾支點';pivot.position.y=centerY;
  hero.root.add(anchor);anchor.add(pivot);
  hero.object.position.y-=centerY;
  pivot.add(hero.object);
  hero.soundHoverAnchor=anchor;hero.soundTiltPivot=pivot;
 }
 if(!hero.soundBackpack)hero.soundBackpack=heroCostumes.ensureSound(hero.object);
}

function updateSoundCostume(dt){
 if(!hero||!S.state)return;
 const active=S.state.costume==='sound',motion=soundCostumeMotion;
 const x=S.player.x,z=S.player.z;
 if(motion.previousX===null){motion.previousX=x;motion.previousZ=z;}
 const travelled=Math.hypot(x-motion.previousX,z-motion.previousZ);
 motion.previousX=x;motion.previousZ=z;
 const moving=active&&!riding()&&!roll&&!throwing&&!modal&&!dialog&&travelled>Math.max(.003,dt*.35);
 if(riding()){motion.hover=0;motion.lean=0;}
 if(hero.soundHoverAnchor){
  const ease=1-Math.exp(-Math.max(0,dt)*(moving?6:9));
  const lift=moving?.48+.055*Math.sin(elapsed*6.2):0;
  const lean=moving?.24:0;
  motion.hover+=(lift-motion.hover)*ease;
  motion.lean+=(lean-motion.lean)*ease;
  hero.soundHoverAnchor.position.y=motion.hover;
  hero.soundTiltPivot.rotation.x=motion.lean;
  hero.soundTiltPivot.rotation.z=moving?.025*Math.sin(elapsed*6):0;
 }
 heroCostumes.update(hero.object,dt);
}

function setCostume(id){
 S.state.costume=id;
 if(id==='sound')ensureSoundCostume();
 if(id!=='sound'){
  soundCostumeMotion.hover=0;soundCostumeMotion.lean=0;
  if(hero.soundHoverAnchor)hero.soundHoverAnchor.position.y=0;
  if(hero.soundTiltPivot)hero.soundTiltPivot.rotation.set(0,0,0);
 }
 if(hero.soundBackpack)hero.soundBackpack.root.visible=id==='sound';
 applyHeroCostumeLook(hero.object,id);
 if(companion)companion.root.visible=id==='mist'&&!battle;
 window.PhantomJourneyGuide?.onCostume?.(id);
 save();
}
// 主角 Throw 動作：2.4 倍速播放，第 48% 出手（球在出手前跟著右手，模型的 ball 節點）
const HERO_THROW_SPEED=2.4,HERO_THROW_RELEASE=.48;
function heroThrowRelease(){const a=hero?.actions?.Throw;return a?Math.round(a.getClip().duration*HERO_THROW_RELEASE/HERO_THROW_SPEED*1000):250;}
function playHeroThrow(){hero.play('Throw',true);hero.actions.Throw?.setEffectiveTimeScale(HERO_THROW_SPEED);}
const heldBallModels={};
function holdHeroBall(type){
 const node=hero?.object?.getObjectByName('ball');if(!node)return;
 const path=(type==='great'?world.props?.great_core:type==='master'?world.props?.master_core:world.props?.core)||'models/props/core.glb',key=typeof path==='string'?path:path.model;
 const show=w=>{node.clear();node.add(w);};
 if(heldBallModels[key])return show(heldBallModels[key]);
 asset(key).then(g=>{const o=cloneSkin(g.scene),box=new T.Box3().setFromObject(o),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),k=.15/Math.max(size.x,size.y,size.z,.001),w=new T.Group();
  o.scale.setScalar(k);o.position.copy(center).multiplyScalar(-k);o.traverse(n=>{if(n.isMesh)n.castShadow=true;});w.add(o);heldBallModels[key]=w;show(w);}).catch(()=>{});
}
function heroBallOrigin(){const n=hero?.object?.getObjectByName('ball');if(n){const p=n.getWorldPosition(new T.Vector3());if(p.distanceTo(S.player)<(riding()?8:3))return p;}return S.player.clone().add(new T.Vector3(0,1.35,0));}

const npcLoadPromises=new Map();
async function loadNpc(n){
 if(!n)throw Error('NPC 資料不存在');
 const existing=npcs.find(a=>a.data?.id===n.id);
 if(existing)return existing;
 if(npcLoadPromises.has(n.id))return npcLoadPromises.get(n.id);
 const pending=(async()=>{
  const a=await actor(n.model,n.height||2.3,townGroup);
  a.data=n;a.root.position.fromArray(n.position||[0,0,0]);
  a.home=a.root.position.clone();a.goal=a.home.clone();a.timer=Math.random()*3;a.cooldown=0;
  addLabel(a,n.name+' · NPC');npcs.push(a);return a;
 })();
 npcLoadPromises.set(n.id,pending);
 try{return await pending;}finally{npcLoadPromises.delete(n.id);}
}
function setNpcPlace(){for(const n of npcs){const match=place?n.data.buildingId===place.id:true;n.root.visible=match;(place?insideGroup:townGroup).add(n.root);if(match){const p=place?.id==='dream_lab'&&n.data.id==='prof_daydream'?[LAB_PROFESSOR_POSITION.x,LAB_PROFESSOR_POSITION.z]:(place?(n.data.interiorPosition||n.data.position):n.data.position);n.root.position.fromArray(p.length===2?[p[0],0,p[1]]:p);n.home.copy(n.root.position);n.goal.copy(n.home);if(place?.id==='dream_lab'&&n.data.id==='prof_daydream'){n.contactLock=false;n.cooldown=0;n.play('Idle');n.root.rotation.y=-1.1;}}}}
// The three original mint-colored vials are triangles in a single GLB mesh.
// Remove only the glass triangles within their tabletop footprint, leaving
// the counter display, bookshelves, and all other glass geometry untouched.
function removeLabVials(root){
 root.traverse(mesh=>{
  if(!mesh.isMesh||!['glass','gold'].includes(mesh.material?.name))return;
  const geometry=mesh.geometry,position=geometry.attributes?.position,index=geometry.index;
  if(!position)return;
  const kept=[];
  for(let i=0;i<(index?index.count:position.count);i+=3){
   const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
   const x=(position.getX(a)+position.getX(b)+position.getX(c))/3;
   const y=(position.getY(a)+position.getY(b)+position.getY(c))/3;
   const z=(position.getZ(a)+position.getZ(b)+position.getZ(c))/3;
   if(x>-5.13&&x<-2.87&&y>1.04&&y<1.87&&Math.abs(z)<.36)continue;
   kept.push(a,b,c);
  }
  if(kept.length!==(index?index.count:position.count)){
   mesh.geometry=geometry.clone();
   mesh.geometry.setIndex(kept);
   mesh.geometry.computeBoundingSphere();
  }
 });
}
async function buildLabBall(entry,i){
 // Match the exact GLB mesh used when the player throws a normal spirit ball.
 const source=await asset(world.props?.core||'models/props/core.glb');
 const g=new T.Group(),o=cloneSkin(source.scene);
 o.traverse(n=>{
  if(!n.isMesh)return;
  n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();
  const materials=Array.isArray(n.material)?n.material:[n.material];
  for(const m of materials){
   if(m.name==='sky'||m.name==='purple'){
    m.color.setHex(entry.color);
    if(m.emissive){m.emissive.setHex(entry.color);m.emissiveIntensity=.25;}
   }
   m.roughness=.3;
  }
  n.castShadow=true;
  n.userData.labLegendId=entry.id;
 });
 const bounds=new T.Box3().setFromObject(o),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=.64/Math.max(size.x,size.y,size.z,.001);
 o.scale.setScalar(scale);
 o.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 g.add(o);
 g.position.set(-4.82+i*.82,1.17,0);
 g.userData.labLegendId=entry.id;
 return g;
}
async function decorateLabInterior(root){
 removeLabVials(root);
 const group=new T.Group();
 group.name='大夢研究所・傳說幻靈三選一球桌';
 const tabletop=new T.Mesh(new T.BoxGeometry(3.02,.16,1.36),new T.MeshStandardMaterial({color:0xc49b70,roughness:.68}));
 tabletop.name='加長研究桌桌面';
 tabletop.position.set(-4,1.05,0);
 tabletop.receiveShadow=true;group.add(tabletop);
 root.add(group);
 const balls=await Promise.all(LAB_LEGENDS.map((item,i)=>buildLabBall(item,i)));
 if(root!==interior)return;
 for(const ball of balls)group.add(ball);
 labDisplay={group,balls};
 syncLabBallDisplay();
}
function syncLabBallDisplay(){
 if(!labDisplay)return;
 const picked=labClaimed()?S.state.dreamLabLegendChoice:null;
 LAB_LEGENDS.forEach((item,i)=>{labDisplay.balls[i].visible=!picked||item.id===picked;});
}
function labProfessor(){return npcs.find(n=>n.data?.id==='prof_daydream'&&n.root.visible);}
function showLabProfessorDialogue(n){
 if(labClaimed()||modal||dialog||battle||place?.id!=='dream_lab')return;
 cancelNavigation();dialog=n;
 S.stick.x=S.stick.y=0;$('stick').style.transform='';
 n.play('Idle');$('npcName').textContent='大夢博士';
 $('npcText').textContent='新旅程從這三位可進化的幻靈開始：大眼蛙、C囝仔、水毛蟲。請選擇一位同行。';
 $('portrait').src=n.data.portraits?.normal||'';$('portrait').alt='大夢博士';
 $('npcActions').innerHTML='<button data-npc="lab_select">挑選幻靈球</button><button data-npc="lab_later">稍後再選</button>';
 $('dialogue').hidden=false;
 if(labEvent)labEvent.phase='dialogue';
}
function updateLabGuide(){
 // 教學已收納到雷達下方的任務清單，不再顯示遮住 3D 畫面的研究所中央提示。
 document.getElementById('labNewPlayerGuide')?.remove();
}
function tickLabEvent(dt){
 updateLabGuide();
 if(place?.id!=='dream_lab'||labClaimed()||!labDisplay||battle||modal||dialog||enterBusy)return;
 const n=labProfessor();if(!n)return;
 // The professor stays in this collision-safe spot beside the desk.
 n.root.position.copy(LAB_PROFESSOR_POSITION);
 n.home.copy(LAB_PROFESSOR_POSITION);
 n.play('Idle');
 if(labEvent?.phase==='deferred'){
  const distance=n.root.position.distanceTo(S.player);
  if(distance>=2.8)labEvent.rearm=true;
  if(labEvent.rearm&&distance<=2.2){
   labEvent.phase='ready';n.contactLock=true;n.cooldown=elapsed+60;
   showLabProfessorDialogue(n);
  }
  return;
 }
 if(!labEvent&&S.player.distanceTo(LAB_CENTER)<3.2){
  labEvent={phase:'ready'};
  n.contactLock=true;n.cooldown=elapsed+60;
  showLabProfessorDialogue(n);
 }
}
function showLabSelection(){
 if(place?.id!=='dream_lab'||labClaimed()||labClaimBusy||!labEvent||labEvent.phase==='walking')return;
 const options=LAB_LEGENDS.map((entry,i)=>{
  const s=byId[entry.id];
  return `<button class="labOption" type="button" data-lab-pick="${entry.id}"><span class="labOptionOrb" style="--lab-ball:${'#'+entry.color.toString(16).padStart(6,'0')}"></span><span><strong>${esc(s?.name||entry.id)}</strong><small>${esc(s?.type||'一般')}屬性 · 初始幻靈</small></span></button>`;
 }).join('');
 openModal('大夢研究所 · 選擇初始幻靈',`<div class="labChoice"><p>請從桌上的三顆幻靈球選出一顆。選擇後會立即收錄圖鑑，<strong>只能領取一次</strong>。</p>${options}<p class="muted">其他兩顆幻靈球將無法再領取。</p><button type="button" data-lab-close="1">先不選擇</button></div>`);
}
function claimLabLegend(id){
 if(place?.id!=='dream_lab'||labClaimed()||labClaimBusy||!LAB_LEGENDS.some(b=>b.id===id))return;
 const spirit=byId[id];if(!spirit)return toast('該傳說幻靈資料尚未載入');
 labClaimBusy=true;
 try{
  // Mark the one-time reward before grant(), which persists the save.
  S.state.dreamLabLegendChoice=id;S.state.dreamLabLegendClaimed=true;
  grant(id);
  syncLabBallDisplay();updateLabGuide();
  if(labEvent)labEvent.phase='claimed';
  showDetail(id);
  toast('大夢博士贈送了 '+spirit.name+'！已收錄圖鑑。');window.PhantomJourneyGuide?.refresh?.();
 }finally{labClaimBusy=false;}
}
function tapLabBall(e){
 if(place?.id!=='dream_lab'||labClaimed()||modal||dialog||battle||!labDisplay||!labEvent||labEvent.phase==='walking')return;
 if(S.player.distanceTo(LAB_CENTER)>3.8)return;
 const point=new T.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);
 const ray=new T.Raycaster();ray.setFromCamera(point,camera);
 const hit=ray.intersectObjects(labDisplay.balls,true).find(x=>x.object.visible&&x.object.parent?.visible);
 if(hit)showLabSelection();
}
async function enterBuilding(b){if(battle||throwing||enterBusy)return;enterBusy=true;cancelNavigation();clearTarget();closeDialog();PhantomLoading.begin('走進'+b.name);$('loadText').textContent='走進'+b.name+'…';$('load').hidden=false;try{if(interior)insideGroup.remove(interior);const g=await asset(b.interiorModel);interior=g.scene.clone(true);insideGroup.add(interior);labDisplay=null;labEvent=null;if(b.id==='dream_lab')await decorateLabInterior(interior);interior.traverse(n=>{if(n.isMesh){n.receiveShadow=true;n.castShadow=true;}});place=b;townGroup.visible=false;insideGroup.visible=true;detach(hero.root);insideGroup.add(hero.root);const p=b.spawn||[0,4];S.player.set(p[0],0,p.length===3?p[2]:p[1]);hero.root.position.copy(S.player);setNpcPlace();if(b.id==='dream_lab'&&!npcs.some(n=>n.data?.id==='prof_daydream')){await loadNpc(npcData.find(n=>n.id==='prof_daydream'));setNpcPlace();}syncChestRoom();syncBookRoom();await ensureChestActor();await ensureBookActor();$('location').textContent=b.name;scene.fog.near=30;scene.fog.far=85;target=null;save();}catch(e){toast(e.message);S.errors.push(e.message);}finally{enterBusy=false;$('load').hidden=true;PhantomLoading.end();}}
function leaveBuilding(){if(!place||throwing||enterBusy||battle)return;const leavingDreamLab=place.id==='dream_lab';clearTarget();labEvent=null;labDisplay=null;const p=place.entrance;S.player.set(p[0],0,p.length===3?p[2]:p[1]+2);place=null;syncChestRoom();syncBookRoom();insideGroup.visible=false;townGroup.visible=true;townGroup.add(hero.root);hero.root.position.copy(S.player);setNpcPlace();$('location').textContent='初光鎮';closeDialog();save();if(leavingDreamLab)window.PhantomJourneyGuide?.onLabExit?.();}
function portalCheck(){portalAction=null;if(battle||dialog||modal||throwing||enterBusy||fishingBusy){$('portal').hidden=true;return;}if(place){const e=place.exit||[0,5];if(Math.hypot(S.player.x-e[0],S.player.z-(e.length===3?e[2]:e[1]))<2.1){portalAction=leaveBuilding;$('portal').textContent='離開'+place.name+' ↗';}}else for(const b of world.buildings){const p=b.entrance;if(Math.hypot(S.player.x-p[0],S.player.z-(p.length===3?p[2]:p[1]))<2.8){portalAction=()=>enterBuilding(b);$('portal').textContent='進入'+b.name+' ↗';break;}}if(!portalAction&&nearbyBookshelf()&&validBookTeam()&&!bookEncounter&&!bookChallengeBusy){portalAction=readBookshelf;$('portal').textContent='翻書 · 書本幻靈 3 對 3 挑戰';}if(!portalAction&&!place&&river){if(river.canFish(S.player)){if(number(S.state.items.fishFood)>0&&!wild.some(w=>w.species.id==='mewtwo')){portalAction=summonWaterDragon;$('portal').textContent='🐉 召喚 · 水蛟龍王（魚飼料 ×'+number(S.state.items.fishFood)+'）';}else{portalAction=startFishing;$('portal').textContent='🎣 河畔釣魚 · 3 對 3 擂台';}}else if(river.atTunnel(S.player)){portalAction=enterEndlessCave;$('portal').textContent='探索山洞 ↗';}}$('portal').hidden=!portalAction;}
// Fishing at the river railing: a bite pulls a water-type squad into a 3v3 arena battle.
function enterEndlessCave(){if(battle||throwing||enterBusy)return;save();PhantomLoading.begin('前往初光無盡洞穴');requestAnimationFrame(()=>{location.href='survivors/?fromTown=1&v=20261025-v22';});}
function caveEvent(type,id){const result=PhantomCaveBridge.event(type,id);townWriter.adopt(S.state,result.state);if(result.paid.length){toast('無盡洞穴任務完成！點數 +'+result.paid.length*1000+'，已存入洞穴錢包。');S.caveMissionNotice=result.paid.at(-1);}return result;}
function caveMissionAction(id){const q=S.state.caveQuest||{};if(id==='cave-fishing'&&number(q.fishingWins)<3){beginNavigation('waypoint','fishing');return;}if(id==='cave-dragon'){if(number(S.state.items.fishFood)>0){beginNavigation('waypoint','fishing');return;}if(number(S.state.captureCounts.groudon)>=3&&number(S.state.captureCounts.rayquaza)>=3){beginNavigation('npc','fisher_lang');return;}if(number(S.state.captureCounts.kyogre)>=3){closeModal();closeDialog();showDetail('kyogre');return;}beginNavigation('npc','fisher_lang');return;}beginNavigation('waypoint','cave');}
function startFishing(){if(fishingBusy||battle||throwing||enterBusy||modal||dialog||!river?.canFish(S.player))return;if(!validThreeSpiritTeam())return toast('河畔釣魚採 3 對 3 對戰，請先在圖鑑編入 3 位不同的已締約幻靈。');cancelNavigation();clearTarget();fishingBusy=true;$('portal').hidden=true;hero.play('Idle');toast('拋出釣線……靜候水面的動靜。');river.startFishing(hero,async()=>{toast('上鉤了！水系幻靈小隊躍出水面，3 對 3 擂台開戰！');await delay(650);fishingBusy=false;await startBattle('fishing');});}
let modalBack=null;
// 開啟下一頁並記住怎麼回到目前這一頁；右上 × 會回上一頁而不是直接關閉
function goModal(open,reopenCurrent){const prev=modalBack;open();if(reopenCurrent)modalBack=()=>{reopenCurrent();modalBack=prev;};}
function modalReopen(){const q=$('dexSearch');if(q){const value=q.value,filter=$('dexFilter')?.value;return()=>{showDex();$('dexSearch').value=value;if(filter&&$('dexFilter'))$('dexFilter').value=filter;renderCards();};}return null;}
function modalBackOrClose(){if(modalBack&&!evolutionBusy){const back=modalBack;modalBack=null;back();}else closeModal();}
function openModal(title,html){closeDialog();stopViewer();modal=true;modalBack=null;S.stick.x=S.stick.y=0;$('stick').style.transform='';$('modalTitle').textContent=title;$('modalBody').innerHTML=html;document.body.classList.toggle('quest-shortcut-modal',['旅人手冊','幻靈圖鑑'].includes(title));$('modal').hidden=false;window.PhantomJourneyGuide?.refresh?.();}
function closeModal(){if(evolutionBusy)return;if($('modalTitle')?.textContent==='大夢研究所 · 選擇初始幻靈')deferLabChoice();stopViewer();modal=false;$('modal').hidden=true;document.body.classList.remove('quest-shortcut-modal');window.PhantomJourneyGuide?.refresh?.();}
function deferLabChoice(){
 if(place?.id!=='dream_lab'||labClaimed())return;
 labEvent={...(labEvent||{}),phase:'deferred',rearm:false};
}
function closeDialog(){if(labEvent?.phase==='dialogue')labEvent.phase='ready';if(dialog){dialog.cooldown=elapsed+5;dialog.contactLock=true;}dialog=null;$('dialogue').hidden=true;}
function talk(n){if(modal||battle||dialog||throwing||enterBusy)return;cancelNavigation();dialog=n;S.stick.x=S.stick.y=0;$('stick').style.transform='';n.play('Idle');$('npcName').textContent=n.data.name;const lines=n.data.dialogue||['歡迎來到初光鎮！'];$('npcText').textContent=lines.map(line=>Rules.formatNpcText(typeof line==='string'?line:line?.text||'')).filter(Boolean).join('\n\n')||'祝你的旅途充滿新發現。';$('portrait').src=n.data.portraits?.normal||n.data.portrait||'';$('portrait').alt=n.data.name+'半身立繪';$('dialogue').hidden=false;const funcs=n.data.functions||[];let buttons='';if(n.data.id==='shop_vendor')buttons+='<button data-npc="pets">卡片兌換</button>';if(funcs.some(f=>/heal|care|restore|回復/.test(f)))buttons+='<button data-npc="heal">休息與補給</button>';if(funcs.some(f=>/team|隊伍/.test(f)))buttons+='<button data-npc="team">整理隊伍</button>';if(funcs.some(f=>/quest|patrol|task|任務/.test(f)))buttons+='<button data-npc="quest">接受委託</button>';if(n.data.id==='prof_daydream'&&!S.state.adventureClaimed)buttons+='<button data-npc="adventure">領取冒險服</button>';else if(n.data.id!=='prof_daydream'&&funcs.some(f=>/research|dex|starter|研究/.test(f)))buttons+='<button data-npc="research">生態研究</button>';if(funcs.some(f=>/battle|arena|challenge|gym|對戰/.test(f))&&!funcs.some(f=>/tower/.test(f)))buttons+='<button data-npc="battle">3 對 3 對戰</button>';if(funcs.some(f=>/tower/.test(f))||n.data.buildingId==='tower_starspire')buttons+='<button data-npc="tower">開始星穹挑戰</button>';if(n.data.buildingId==='gym_light')buttons+='<button data-npc="gym">道館挑戰</button>';if(funcs.includes('fishTrade'))buttons+='<button data-npc="fishTrade">交換魚飼料</button>';buttons+='<button data-npc="gift">對話</button><button data-npc="close">離開</button>';$('npcActions').innerHTML=buttons;if(n.data.id==='prof_daydream'&&S.state.adventureClaimed)$('npcText').textContent+='\n\n已領得冒險服：穿著後每 10 秒自動吸收場上所有可收集補給與道具。';const hint=chestHint(n);if(hint)$('npcText').textContent+='\n\n'+hint;emphasizeChestHints();}
function npcAction(action){const n=dialog;if(!n)return;if(action==='lab_select'){closeDialog();return showLabSelection();}if(action==='lab_later'){closeDialog();deferLabChoice();return toast('稍後再選｜離開博士附近，再走近博士即可重新挑選幻靈球。');}const s=S.state;if(action==='close')return closeDialog();if(action==='pets'){closeDialog();return showPetShop();}if(action==='adventure'&&n.data.id==='prof_daydream'){if(!s.adventureClaimed){s.adventureClaimed=true;if(!s.unlockedCostumes.includes('adventure'))s.unlockedCostumes.push('adventure');$('npcText').textContent='已領得冒險服！在旅人手冊 → 冒險衣櫃穿上後，每 10 秒自動收集場上所有可收集補給與道具，不必逐一走近。';$('npcActions').querySelector('[data-npc="adventure"]')?.remove();toast('已領得冒險服｜每 10 秒自動吸收場上可收集補給');save();window.PhantomJourneyGuide?.refresh?.();}return;}if(action==='fishTrade'){const king=number(s.captureCounts.groudon),queen=number(s.captureCounts.rayquaza);if(king>=3&&queen>=3){s.captureCounts.groudon=king-3;s.captureCounts.rayquaza=queen-3;s.items.fishFood=number(s.items.fishFood)+1;$('npcText').textContent='好樣的！這是我特製的魚飼料，帶著它靠近河邊，就能召喚河裡的水蛟龍王。（魚飼料 ×'+s.items.fishFood+'）';toast('獲得魚飼料 ×1');save();}else $('npcText').textContent='想要魚飼料嗎？拿金魚國王卡片 3 張、金魚皇后卡片 3 張來換。目前：金魚國王 '+king+'/3、金魚皇后 '+queen+'/3。小金魚集滿 3 張卡片就能進化成國王或皇后喔！';return;}if(action==='team'){closeDialog();return showTeam();}if(action==='battle'){closeDialog();return startBattle('arena');}if(action==='gym'){closeDialog();return showGyms();}if(action==='tower'){save();location.href='tower/?v=20261023-rules-sync-v2';return;}if(action==='heal'){const key=n.data.id+'-care',last=number(s.npcRewards[key]);if(Date.now()-last>=120000){s.npcRewards[key]=Date.now();s.items.potion=number(s.items.potion)+2;s.pokeballs=Math.max(s.pokeballs,15);$('npcText').textContent='夥伴已恢復精神！靈核球補足至 15 顆，並領取 2 份初光藥劑。';}else $('npcText').textContent='夥伴已恢復精神！補給每兩分鐘準備一次，請稍後再來。';}if(action==='quest'){const count=dexStats().owned,need=Rules.quest.requiredSpecies,reward=Rules.quest.eachBallReward;if(count>=need&&!s.quests.firstResearch){s.quests.firstResearch=true;s.quests.patrolRewardV2=true;s.pokeballs=number(s.pokeballs)+reward;s.greatBallCount=number(s.greatBallCount)+reward;s.masterBallCount=number(s.masterBallCount)+reward;$('npcText').textContent='巡護委託完成！已收錄 '+count+' 種一般幻靈（目標 '+need+' 種）。獲得普通靈核球、高階靈核球、星耀幻靈球各 '+reward+' 顆！';}else $('npcText').textContent=s.quests.firstResearch?'巡護委託已完成，三種靈核球各 '+reward+' 顆的一次性獎勵已領取（舊存檔按差額補發）。一起守護初光鎮吧！':'巡護委託：收錄 '+need+' 種不同的一般幻靈（目前 '+count+'/'+need+'）；完成後可領取普通、高階、星耀靈核球各 '+reward+' 顆。';}if(action==='research'){$('npcText').textContent='御靈的第一步是觀察。重複締約可累積進階所需的羈絆；在圖鑑中選擇夥伴，查看進階鏈。';}if(action==='gift'){
 const dialogue=n.data.dialogue||[];
 const lines=dialogue.map(line=>Rules.formatNpcText(typeof line==='string'?line:line?.text||'')).filter(Boolean);
 const line=lines[Math.floor(Math.random()*Math.max(lines.length,1))]||'祝你的旅途一路順利！';
 const gift=maybeNpcGift(n,true);
 $('npcText').textContent=line+(gift?'\n\n'+gift:'');
}if(action==='gift'&&chestHint(n))$('npcText').textContent+='\n\n'+chestHint(n);if(n.data.portraits?.happy)$('portrait').src=n.data.portraits.happy;emphasizeChestHints();save();}
function showDisplaySettings(){
 const preset=graphicsQuality.preset;
 const card=(id,title,summary)=>`<button type="button" class="graphicsPreset ${preset===id?'selected':''}" data-graphics-quality="${id}" aria-pressed="${preset===id}"><strong>${title}</strong><small>${summary}</small></button>`;
 openModal('顯示設定',`<div class="displaySettings"><p class="muted">選擇 3D 畫面細緻度。設定會自動保存，並套用於探索、初光挑戰和星穹挑戰塔。畫質越高，手機可能越耗電或較容易卡頓。</p><div class="graphicsPresets">${card('low','低畫質','省電、適合效能較弱的手機')}${card('medium','中畫質','畫面清晰與流暢度平衡（建議）')}${card('high','高畫質','高解析度及精細陰影')}</div><button class="displayAudioEntry" type="button" data-display-audio="open">♫ 背景音樂　<span>${window.PhantomBgm?.muted?'已關閉':'音量 '+(window.PhantomBgm?.volume??27)+'%'}</span></button><button type="button" data-menu="home" class="displayBack">← 返回旅人手冊</button></div>`);
}
function showBgmSettings(){const bgm=PhantomBgm;openModal('音樂與音效',`<div class="displaySettings"><p class="muted">音樂與戰鬥音效可分開調整，設定於主遊戲與洞穴共用並自動保存。</p><label class="bgmRangeLabel">背景音樂 <output id="bgmVolumeValue">${bgm.volume}%</output></label><input id="bgmVolumeRange" type="range" min="0" max="100" value="${bgm.volume}" aria-label="背景音樂音量" class="bgmVolumeRange"><button data-bgm-toggle="1">${bgm.muted?'開啟音樂':'關閉音樂'}</button><label class="bgmRangeLabel">戰鬥音效 <output id="sfxVolumeValue">${bgm.sfxVolume}%</output></label><input id="sfxVolumeRange" type="range" min="0" max="100" value="${bgm.sfxVolume}" aria-label="戰鬥音效音量" class="bgmVolumeRange"><button data-sfx-toggle="1">${bgm.sfxMuted?'開啟音效':'關閉音效'}</button><button data-menu="display" class="displayBack">← 返回顯示設定</button></div>`);}
function showMenu(){openModal('旅人手冊',`${window.PhantomJourneyGuide?.menuHelpHtml?.()||''}<div class="menuGrid"><button data-menu="team">☷ 幻靈隊伍</button><button data-menu="display">⚙ 顯示設定</button><button data-menu="costume">◇ 冒險衣櫃</button><button data-menu="gym">⚑ 初光挑戰</button><button data-menu="tower">✧ 星穹挑戰塔</button><button data-menu="pets">♧ 寵物商人</button><button data-menu="bag">◈ 旅人背包</button><button data-menu="guide">⌖ 建物與居民</button><button data-menu="help">？旅行指南</button><button data-menu="studio">↗ Blender 模型室</button><button data-menu="reset" class="danger">重置遊戲</button></div><p class="muted">進度自動保存在此瀏覽器，重新整理或回到同一網址可繼續遊玩。清除網站資料或更換裝置不會保留紀錄。</p>`);window.PhantomJourneyGuide?.onMenuOpened?.();}

// Regular spirit cards are the duplicate capture/bond counts already stored in
// phantom_journey_v1. Trading consumes quantities, NEVER Pokedex unlock flags.
const spiritCardTradeDraft=Object.create(null);
let spiritTradeSelectedId=null;
function spiritCardTradeTotal(){return Object.values(spiritCardTradeDraft).reduce((sum,v)=>sum+v,0);}
function spiritCardTradeEntries(){
 return regularSpirits().filter(spirit=>owned(spirit.id)&&number(S.state.captureCounts[spirit.id])>0);
}
function showSpiritCardTrade(t){
 const total=spiritCardTradeTotal(),candidates=spiritCardTradeEntries();
 const available=candidates.filter(sp=>number(S.state.captureCounts[sp.id])>number(spiritCardTradeDraft[sp.id]));
 if(!available.some(sp=>sp.id===spiritTradeSelectedId))spiritTradeSelectedId=available[0]?.id||null;
 const options=available.map(sp=>`<option value="${esc(sp.id)}" ${spiritTradeSelectedId===sp.id?'selected':''}>${esc(sp.name)}（可用 ${number(S.state.captureCounts[sp.id])-number(spiritCardTradeDraft[sp.id])} 張）</option>`).join('');
 const chosen=Object.entries(spiritCardTradeDraft).filter(([id,count])=>count>0&&byId[id]).map(([id,count])=>`<div class="spiritTradeSelected"><span>${esc(byId[id].name)} ×${count}</span><button type="button" data-spirit-trade-remove="${esc(id)}" aria-label="移除一張${esc(byId[id].name)}卡片">－ 移除</button></div>`).join('');
 return `<section class="spiritCardTrade"><h3>一般幻靈卡片兌換星耀幻靈球</h3><p class="muted">任意 <strong>3 張</strong>一般幻靈卡片，可換 <strong>1 顆星耀幻靈球</strong>。可混搭不同種類，也可使用相同種類的多張卡片。消耗的是圖鑑卡片上顯示的羈絆張數，不影響已解鎖的圖鑑或已加入的隊伍。</p><div class="spiritTradePicker"><label for="spiritTradeSelect">選擇幻靈卡片</label><select id="spiritTradeSelect" aria-label="選擇欲兌換的幻靈卡片" ${!options||total>=3?'disabled':''}>${options||'<option>目前沒有可用的幻靈卡片</option>'}</select><button type="button" data-spirit-trade-add="1" ${!options||total>=3?'disabled':''}>加入一張</button></div><div class="spiritTradeProgress">已選 ${total}／3 張　｜　星耀幻靈球目前 ${number(S.state.masterBallCount)} 顆</div><div class="spiritTradeChosen">${chosen||'<span class="muted">尚未選擇卡片</span>'}</div><button type="button" class="spiritTradeConfirm" data-spirit-trade-confirm="1" ${total!==3?'disabled':''}>確認兌換 3 張卡片 → 1 顆星耀幻靈球</button></section>`;
}
function addSpiritTradeCard(){
 if(spiritCardTradeTotal()>=3)return;
 const id=document.getElementById('spiritTradeSelect')?.value;
 if(!id||!byId[id]||!owned(id))return;
 const used=number(spiritCardTradeDraft[id]),stock=number(S.state.captureCounts[id]);
 if(used>=stock)return toast('這種幻靈卡片可用數量不足。');
 spiritCardTradeDraft[id]=used+1;
 spiritTradeSelectedId=id;showPetShop();
}
function removeSpiritTradeCard(id){
 if(!byId[id]||!number(spiritCardTradeDraft[id]))return;
 spiritCardTradeDraft[id]--;
 if(!spiritCardTradeDraft[id])delete spiritCardTradeDraft[id];
 spiritTradeSelectedId=id;showPetShop();
}
function exchangeSpiritCardsForMasterBall(){
 const selections=Object.entries(spiritCardTradeDraft).filter(([,n])=>n>0);
 if(spiritCardTradeTotal()!==3)return toast('請先選滿 3 張一般幻靈卡片。');
 const nextCounts={...S.state.captureCounts};
 for(const [id,n] of selections){
  if(!byId[id]||BOSS_CARD_IDS.includes(id)||!owned(id)||!Number.isInteger(n)||n<1||n>number(nextCounts[id]))return toast('卡片數量已變動，請重新檢查。');
  nextCounts[id]=number(nextCounts[id])-n;
 }
 // A single save write commits the 3-card deduction and the master-ball reward
 // together. If storage fails, the live game state and all cards are unchanged.
 const pos=battle?battle.previous.position:S.player;
 const newMaster=number(S.state.masterBallCount)+1;
 const snapshot={...S.state,captureCounts:nextCounts,masterBallCount:newMaster,
  position:[pos.x,pos.z],buildingId:(battle?battle.previous.place:place)?.id||null};
 try{townWriter.save(snapshot);Object.assign(S.state,snapshot);}
 catch(error){return toast('無法儲存兌換，卡片尚未扣除，請確認瀏覽器儲存權限。');}
 for(const id of Object.keys(spiritCardTradeDraft))delete spiritCardTradeDraft[id];
 spiritTradeSelectedId=null;hud();showPetShop();
 toast('兌換成功！已扣除 3 張一般幻靈卡片，星耀幻靈球 +1。');
}

let overworldMount=null,mountSelection=null,mountOwnership={};
addEventListener('storage',event=>{if(event.key===TOWER_KEY){mountOwnership=towerProgress().mounts||{};if(S.ready){consumeTowerBossGrants();hud();}}});
addEventListener('pageshow',event=>{if(event.persisted&&S.ready){townWriter.refresh(S.state);try{const latest=JSON.parse(localStorage.getItem(KEY)||'{}');if(latest.journeyGuide?.towerEntered&&S.state.journeyGuide)S.state.journeyGuide.towerEntered=true;}catch{}consumeTowerBossGrants();migrateTowerCardCollection();mountOwnership={...towerProgress().mounts};hud();window.PhantomJourneyGuide?.refresh?.();}});
addEventListener('pagehide',event=>{if(!event.persisted)overworldMount?.dispose();});
const mountAllowed=()=>!!hero&&!place&&!battle&&!arenaCarry&&!enterBusy;
const riding=()=>mountAllowed()&&!!S.state?.mountActive&&!!mountOwnership[S.state.mountActive];
function mountOffers(t){mountOwnership={...t.mounts};return '<section><h3>一般場景騎乘</h3><p class="muted">每個坐騎需三位首領卡片各 3 張（合計 9 張），永久持有。一般場景移動速度 +50%，可投球及變裝；進入室內、擂台與挑戰時自動下車。</p>'+MountEconomy.mounts.map(m=>{const has=!!t.mounts?.[m.id],active=S.state.mountActive===m.id,can=MountEconomy.recipe.every(([name,n])=>number(t.cards[name])>=n);return '<div class="mountOffer"><div><strong>'+m.icon+' '+m.name+'</strong><small>'+MountEconomy.recipe.map(([name,n])=>name+' '+number(t.cards[name])+'/'+n).join(' · ')+'</small><small>'+(has?'已永久取得':'兌換後不重複扣卡')+'</small></div><button data-mount="'+m.id+'" '+(!has&&!can?'disabled':'')+'>'+(active?'取消騎乘':has?'選擇騎乘':'兌換坐騎')+'</button></div>';}).join('')+'</section>';}
function changeMount(id){
 if(!MountEconomy.mounts.some(m=>m.id===id))return;
 const purchase=MountEconomy.purchase(towerProgress(),id);
 if(!purchase.ok)return toast('三位首領的卡片都需要各 3 張。');
 if(!purchase.owned&&!saveTowerProgress(purchase.progress))return toast('坐騎兌換無法儲存，尚未扣卡。');
 mountOwnership={...purchase.progress.mounts};S.state.mountActive=S.state.mountActive===id?null:id;S.state.mountLast=id;save();
 if(modal&&$('modalTitle').textContent.includes('寵物商人'))showPetShop();
 toast(S.state.mountActive?'已選擇'+MountEconomy.mounts.find(m=>m.id===id).name+'，一般場景移動速度 +50%。':'已取消騎乘。');
}
// Read the joystick's *rendered* rectangle, including mobile breakpoints,
// so the mount/dismount control stays centred directly above it on every screen.
function alignMountButton(){
 const button=$('mountBtn'),stick=$('joystick');
 if(!button||!stick||button.hidden)return;
 const rect=stick.getBoundingClientRect(),parent=$('controls')?.getBoundingClientRect();
 if(!parent||!rect.width||!rect.height)return;
 const centre=rect.left+rect.width/2-parent.left;
 const desiredBottom=rect.top-parent.top-12;
 button.style.position='absolute';
 button.style.left=centre+'px';
 button.style.top='auto';
 button.style.bottom='auto';
 button.style.transform='translateX(-50%)';
 // Measure after clearing fixed-position CSS; keep whole button above joystick.
 button.style.top=Math.max(8,desiredBottom-button.getBoundingClientRect().height)+'px';
}
addEventListener('resize',alignMountButton);
addEventListener('orientationchange',alignMountButton);
function tickMount(dt){
 if(!overworldMount||!hero)return;
 const selected=mountOwnership[S.state.mountActive]?S.state.mountActive:null;
 if(mountSelection!==selected){overworldMount.setMount(selected);mountSelection=selected;}
 const allowed=mountAllowed()&&!roll;
 overworldMount.update(dt,{position:S.player,yaw:hero.root.rotation.y,moving:tickMount.previous?.distanceToSquared(S.player)>.000001,speed:tickMount.previous?Math.sqrt(tickMount.previous.distanceToSquared(S.player))/Math.max(.001,dt):0,allowed,action:throwing?'Throw':hero.mode});
 (tickMount.previous||=new T.Vector3()).copy(S.player);
 const button=$('mountBtn');if(button){const wasHidden=button.hidden,oldText=button.textContent;button.hidden=!mountAllowed()||!Object.values(mountOwnership).some(Boolean);button.textContent=riding()?'下車 · '+MountEconomy.mounts.find(m=>m.id===selected)?.name:'選擇騎乘';button.setAttribute('aria-pressed',String(riding()));if(!button.hidden&&(wasHidden||oldText!==button.textContent))alignMountButton();}
}
let merchantTab='points',merchantCardId='',merchantTradeBusy=false;
function showPetShop(){
 const t=towerProgress();
 const rows=TOWER_PETS.map(p=>{
  const count=number(t.cards[p.card]),owned=!!t.pets[p.id],active=S.state.petActive===p.id;
  const loading=active&&petLoadingId===p.id;
  const label=loading?'切換中…':active?'取消隨行':owned?'設為隨行':'兌換寵物';
  return '<div class="row pet-exchange-row"><span><strong><span class="pet-exchange-icon" aria-hidden="true">'+({forest:'🐌',ice:'🍄',fire:'🐥'}[p.id]||'✦')+'</span> '+p.name+'</strong><small style="display:block">需要 '+p.card+' ×'+p.cost+' ｜目前 '+count+' 張'+(active?' ｜目前設定隨行':'')+'</small></span><button data-pet="'+p.id+'" '+(!owned&&count<p.cost?'disabled':'')+'>'+(loading?'◌ ':'')+label+'</button></div>';
 }).join('');
 const groups=PhantomCaveBridge.groups(spiritCatalog.sort(regularSpirits()),S.state.captureCounts);if(!groups.some(g=>g.id===merchantCardId&&g.stock))merchantCardId=groups.find(g=>g.stock)?.id||'';
 openModal('寵物商人・卡片兌換',CaveMerchant.render({tab:merchantTab,groups,selected:merchantCardId,wallet:PhantomCaveBridge.wallet(),content:merchantTab==='pets'?rows:merchantTab==='mounts'?mountOffers(t):showSpiritCardTrade(t)}));
 // Start cache warming when visiting the merchant so switching can finish quickly.
 // Only owned pets are warmed, and failures never interrupt the current scene.
 for(const p of TOWER_PETS){
  if(t.pets[p.id]&&byId[p.model]?.model)void asset(byId[p.model].model).catch(e=>console.warn('預載隨行寵物失敗',e));
 }
}

function disposePetGlow(pet){
 const fx=pet?.footGlow;if(!fx)return;
 fx.group.removeFromParent();
 for(const mesh of [fx.disc,fx.ring,fx.wave]){mesh.geometry.dispose();mesh.material.dispose();}
 pet.footGlow=null;
}
function createPetGlow(pet){
 if(!pet||pet.footGlow)return;
 const group=new T.Group();
 const mat=(color,opacity)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 const disc=new T.Mesh(new T.CircleGeometry(.63,48),mat(0xf34e9e,.25));
 const ring=new T.Mesh(new T.RingGeometry(.43,.55,48),mat(0xfb64b3,.56));
 const wave=new T.Mesh(new T.RingGeometry(.49,.61,48),mat(0xe9439b,.62));
 for(const [i,m] of [disc,ring,wave].entries()){m.rotation.x=-Math.PI/2;m.position.y=.052+i*.007;m.renderOrder=4+i;group.add(m);}
 pet.root.add(group);
 pet.footGlow={group,disc,ring,wave,time:0,burst:0,nextBurst:2+Math.random()*3};
}
function tickPetGlow(pet,dt){
 const g=pet?.footGlow;if(!g)return;
 g.time+=dt;g.nextBurst-=dt;
 if(g.nextBurst<=0){g.burst=.8;g.nextBurst=2.4+Math.random()*3.5;}
 g.burst=Math.max(0,g.burst-dt);
 const beat=.5+.5*Math.sin(g.time*Math.PI*3.2);
 const spread=g.time*.82%1;
 const flash=g.burst>0?Math.sin((1-g.burst/.8)*Math.PI):0;
 g.disc.scale.setScalar(.92+.23*beat+.16*flash);
 g.disc.material.opacity=.20+.15*beat+.08*flash;
 g.ring.scale.setScalar(.92+.15*beat);
 g.ring.material.opacity=.48+.21*beat;
 g.wave.scale.setScalar(.65+spread*1.55);
 g.wave.material.opacity=.68*Math.pow(1-spread,1.3);
}
function tickPetFollower(dt){
 const pet=petFollower;if(!pet||!hero)return;
 const face=hero.root.rotation.y,x=S.player.x,z=S.player.z,p=pet.root.position;
 const targetGroup=place?insideGroup:townGroup;
 const state=pet.followState||={lastX:x,lastZ:z,still:0,side:Math.random()<.5?-1:1,
  orbit:null,activity:null,phase:'approaching',scene:targetGroup};
 // Only a scene change may relocate the pet: local coordinates from the previous
 // room are unrelated. All ordinary following and activity cancellation interpolate.
 if(pet.root.parent!==targetGroup||state.scene!==targetGroup){
  targetGroup.add(pet.root);state.scene=targetGroup;
  p.x=x-Math.sin(face)*1.13;p.y=0;p.z=z-Math.cos(face)*1.13;
  state.still=0;state.orbit=null;state.activity=null;state.phase='approaching';
  state.lastX=x;state.lastZ=z;
 }
 const moving=Math.hypot(x-state.lastX,z-state.lastZ)>.0005;
 state.lastX=x;state.lastZ=z;
 const blocked=!!(modal||dialog||navigation||roll||throwing||battle);
 pet.root.visible=!battle;
 if(moving||blocked){
  state.still=0;state.orbit=null;state.activity=null;
  state.phase=blocked?'blocked':'following';
 }
 if(battle){pet.play('Idle');return;}
 if(!pet.footGlow)createPetGlow(pet);
 let heading=face;
 if(!moving&&!blocked&&state.orbit){
  const orbit=state.orbit;
  orbit.progress=Math.min(1,orbit.progress+dt/orbit.duration);
  const phase=orbit.direction*orbit.progress*Math.PI*2,c=Math.cos(phase),sn=Math.sin(phase);
  p.x=orbit.centerX+orbit.offsetX*c-orbit.offsetZ*sn;
  p.z=orbit.centerZ+orbit.offsetX*sn+orbit.offsetZ*c;
  heading=Math.atan2((-orbit.offsetX*sn-orbit.offsetZ*c)*orbit.direction,
   (orbit.offsetX*c-orbit.offsetZ*sn)*orbit.direction);
  if(orbit.progress>=1){
   state.orbit=null;state.still=0;state.phase='waiting';pet.play('Idle');heading=face;
  }else pet.play('Walk');
 }else if(!moving&&!blocked&&state.activity){
  state.activity.remaining-=dt;
  if(state.activity.remaining<=0){
   state.activity=null;state.still=0;state.phase='waiting';pet.play('Idle');
  }
 }else{
  const angle=moving||blocked?Math.PI:state.side*Math.PI/2;
  const tx=x+Math.sin(face+angle)*1.13,tz=z+Math.cos(face+angle)*1.13;
  const dx=tx-p.x,dz=tz-p.z,gap=Math.hypot(dx,dz);
  // Stop within the arrival radius. Travel time never contributes to the two
  // seconds of rest, and the stopped position is also the exact orbit anchor.
  if(gap>.035){
   const step=Math.min(gap*(1-Math.exp(-dt*(moving?8.3:4.5))),dt*(moving?6.2:3.2));
   p.x+=dx/gap*step;p.z+=dz/gap*step;
   heading=Math.atan2(dx,dz);state.still=0;
   state.phase=blocked?'blocked':moving?'following':'approaching';pet.play('Walk');
  }else{
   pet.play('Idle');
   if(!moving&&!blocked){
    state.phase='waiting';state.still+=dt;
    if(state.still>=2){
     state.still=0;
     {
      state.orbit={centerX:x,centerZ:z,offsetX:p.x-x,offsetZ:p.z-z,
       progress:0,direction:Math.random()<.5?-1:1,duration:4.6};
      state.phase='orbit';pet.play('Walk');
     }
    }
   }
  }
 }
 const turn=Math.atan2(Math.sin(heading-pet.root.rotation.y),Math.cos(heading-pet.root.rotation.y));
 pet.root.rotation.y+=turn*(1-Math.exp(-dt*10));
 tickPetGlow(pet,dt);
}

async function createPetFallbackActor(path,height,parent){
 // If the full actor initializer fails for an otherwise valid GLB, preserve
 // the visible mesh and its animations without the expensive posedBounds pass.
 const gltf=await asset(path);
 const object=cloneSkin(gltf.scene);
 const root=new T.Group();root.add(object);
 object.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(object);
 const size=bounds.getSize(new T.Vector3());
 const scale=Number.isFinite(size.y)&&size.y>.001?height/size.y:1;
 object.scale.multiplyScalar(scale);
 if(Number.isFinite(bounds.min.y))object.position.y-=bounds.min.y*scale;
 object.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;}});
 const mixer=new T.AnimationMixer(object),actions={};
 for(const clip of gltf.animations||[]){
  const name=clip.name.replace(/.*[|]/,'');
  try{actions[name]=mixer.clipAction(clip);}catch(error){console.warn('寵物動畫片段略過',name,error);}
 }
 const pet={root,object,mixer,actions,mode:null,path,height};
 pet.play=(name)=>{
  const key=Object.keys(actions).find(k=>k.toLowerCase()===name.toLowerCase())
   ||Object.keys(actions).find(k=>k.toLowerCase().includes(name.toLowerCase()))
   ||Object.keys(actions)[0];
  if(!key||pet.mode===key)return;
  for(const a of Object.values(actions))a.fadeOut(.15);
  const action=actions[key];action.reset().fadeIn(.15).setLoop(T.LoopRepeat,Infinity).play();
  pet.mode=key;
 };
 parent.add(root);actors.push(pet);
 pet.play('Idle');
 return pet;
}
async function equipPet(id){
 const version=++petEquipGeneration;
 if(!id){
  const previous=petFollower;petFollower=null;
  if(previous){
   try{disposePetGlow(previous);}catch(error){console.warn('寵物光效清理略過',error);}
   removeActor(previous);
  }
  return true;
 }
 const petConfig=TOWER_PETS.find(p=>p.id===id);
 const spirit=petConfig&&byId[petConfig.model];
 if(!spirit?.model){
  console.warn('寵物沒有對應的模型資料',id,petConfig?.model);
  toast('找不到這隻寵物的模型資料，已保留原有寵物。');
  return false;
 }
 let next=null;
 try{
  const parent=place?insideGroup:townGroup;
  try{
   next=await actor(spirit.model,.88,parent);
  }catch(originalError){
   console.warn('寵物完整模型建立失敗，改用簡化模型載入',id,originalError);
   next=await createPetFallbackActor(spirit.model,.88,parent);
  }
  // Older asynchronous requests may finish after the player has switched again.
  if(version!==petEquipGeneration||S.state.petActive!==id){
   removeActor(next);
   return false;
  }
  const targetParent=place?insideGroup:townGroup;
  if(next.root.parent!==targetParent)targetParent.add(next.root);
  next.petId=id;
  const face=hero?.root.rotation.y||0;
  next.root.position.set(S.player.x-Math.sin(face)*1.14,0,S.player.z-Math.cos(face)*1.14);
  next.root.visible=!battle;
  // Optional presentation effects must never cause a successful model swap to fail.
  try{createPetGlow(next);}catch(error){console.warn('寵物粉紅光效暫時略過',id,error);}
  try{next.play('Idle');}catch(error){console.warn('寵物待機動畫暫時略過',id,error);}
  const previous=petFollower;petFollower=next;
  if(previous&&previous!==next){
   try{disposePetGlow(previous);}catch(error){console.warn('舊寵物光效清理略過',error);}
   try{removeActor(previous);}catch(error){
    console.warn('舊寵物清理略過',error);
    detach(previous.root);
    const idx=actors.indexOf(previous);if(idx>=0)actors.splice(idx,1);
   }
  }
  return true;
 }catch(error){
  if(next&&petFollower!==next){
   try{removeActor(next);}catch(cleanupError){console.warn('寵物載入失敗清理略過',cleanupError);}
  }
  if(version===petEquipGeneration){
   console.error('隨行寵物切換失敗',id,'model:',spirit.model,error);
   S.errors.push('隨行寵物 '+id+'：'+(error?.message||String(error)));
   toast('隨行寵物切換失敗，已保留原有寵物。請查看遊戲診斷資訊。');
  }
  return false;
 }
}

async function changePet(id){
 const p=TOWER_PETS.find(x=>x.id===id);if(!p)return;
 const t=towerProgress(),count=number(t.cards[p.card]);
 if(!t.pets[p.id]){
  if(count<p.cost)return toast('卡片不足，請先挑戰魔物。');
  t.cards[p.card]=count-p.cost;t.pets[p.id]=true;
  if(!saveTowerProgress(t))return toast('無法儲存寵物兌換，請檢查網站儲存權限。');
 }
 const previousId=S.state.petActive;
 const nextId=previousId===p.id?null:p.id;
 const version=++petChangeGeneration;
 S.state.petActive=nextId;
 petLoadingId=nextId;
 save();
 showPetShop();
 const ok=await equipPet(nextId);
 if(version!==petChangeGeneration)return;
 petLoadingId=null;
 if(!ok){
  // Undo only this unsuccessful selection, without touching purchased pets.
  S.state.petActive=previousId;
  save();
 }else toast(nextId?'已立即切換隨行寵物：'+p.name:'已取消隨行寵物');
 if(modal&&$('modalTitle').textContent.includes('寵物商人'))showPetShop();
}

function towerCardCounts(){const t=towerProgress();return Object.fromEntries(towerMonsters.map(s=>[s.id,number(t.cards[s.name+'卡片'])]));}
function towerCardOwned(id){const t=towerProgress(),s=towerMonsters.find(s=>s.id===id);return !!s&&(!!t.registeredCards?.[s.name+'卡片']||number(t.cards[s.name+'卡片'])>0||!!s.speciesId&&owned(s.speciesId));}
function monsterCard(s,detail=false){const n=number(towerCardCounts()[s.id]),registered=towerCardOwned(s.id),color=s.cardFrame||(s.id==='fire'?'red':'purple'),moves=s.skills?.map(k=>[k.name,k.damage||k.power||0])||{forest:[['衝鋒突進',32],['古林震地',34]],ice:[['霜牙衝刺',32],['冰圈爆破',29]],fire:[['烈焰吐息',38],['熔岩爆發',29]]}[s.id]||[];const card=`<article class="collectionCard towerMonsterCard" data-frame="${color}" data-locked="${!registered}"><span class="collectionNumber">No.${spiritCatalog.towerNumber(s.id)}</span><img class="collectionArt" src="${esc(s.portrait)}" alt="${esc(s.name)}肖像" loading="lazy" decoding="async"><img class="collectionFrame" src="assets/cards/frame.png" alt="" decoding="async"><h3 class="collectionName">${registered?esc(s.name):'未知魔物'}</h3><div class="collectionInfo"><div class="collectionType">${registered?esc(s.type||s.element):'???'} · 挑戰塔魔物</div><div class="collectionStats"><span>HP ${registered?s.hp:'???'}</span><span>攻擊 ${registered?s.attack:'???'}</span><span class="collectionBond">卡牌 ×${n}</span></div><ul class="collectionSkills">${moves.map(([name,power])=>`<li><span>${name}</span><b>${power}／傷害</b></li>`).join('')}</ul><div class="collectionSynopsis">${esc(s.description.slice(0,28))}…</div></div></article>`;return detail?card:`<button class="collectionThumb towerMonsterThumb" data-monster="${s.id}" ${registered?'':'disabled'} aria-label="${registered?'查看'+esc(s.name)+'卡牌':'未取得魔物卡牌，取得卡牌後解鎖'}">${card}</button>`;}
function showMonsterDex(){openModal('挑戰塔魔物圖鑑',`<div class="toolbar"><button data-menu="dex">← 幻靈圖鑑</button><button data-menu="tower">前往挑戰塔</button></div><p class="muted">六位挑戰塔魔物與獨立首領以挑戰塔戰鬥取得收藏卡。${Rules.towerDropNotice()}靠近卡牌手動拾取後收錄，素材與卡片會自動儲存。</p><div class="towerMonsterGrid">${towerMonsters.map(s=>monsterCard(s)).join('')||'<p>魔物卡牌尚未載入，請重新整理。</p>'}</div>`);}
function showMonsterDetail(id){const s=towerMonsters.find(s=>s.id===id);if(!s)return;if(!towerCardOwned(id))return toast('拾取這隻魔物的收藏卡後，才能解鎖圖鑑。');openModal(s.name+' · 魔物收藏卡',`<div class="collectionDetail towerMonsterDetail">${monsterCard(s,true)}<p class="collectionDescription">${esc(s.description)}</p><p class="collectionEvolution">${towerCardOwned(s.id)?'已登錄圖鑑':'拾取魔物卡牌後收錄'} · 攻擊欄為憤怒狀態最高傷害</p></div><div class="towerMonsterButtonGrid">${s.speciesId?`<button data-view="${s.speciesId}">查看立體模型</button><button data-add="${s.speciesId}">加入競技隊伍</button>`:''}<button data-menu="monsters">返回魔物圖鑑</button><button data-menu="tower">前往挑戰塔</button></div>`);}
function towerDexHtml(){return `<section class="towerDex"><h3>星穹挑戰塔 · 魔物卡牌</h3><div class="towerMonsterGrid">${towerMonsters.map(s=>monsterCard(s)).join('')}</div></section>`;}
function showBag(){openModal('旅人背包',`<div class="row">靈核球 <b>${S.state.pokeballs}</b></div><div class="row">高階靈核球 <b>${S.state.greatBallCount}</b></div><div class="row">星耀幻靈球 <b>${S.state.masterBallCount}</b></div><div class="row">星露果 <b>${S.state.berryCount}</b></div>${Object.entries(itemNames).map(([k,n])=>`<div class="row">${n}<b>${number(S.state.items[k])}</b></div>`).join('')}<p class="muted">回復藥恢復生命；裂甲粉降低敵方防禦；勇氣結晶提升我方攻擊。可從居民對話及不定時補給廣播獲得。</p>`);}
function exportSave(){showReset();}
function showHelp(){openModal('旅行指南',['<h3>第六步・初光無盡洞穴</h3><p>在河邊進行3對3釣魚擂台，累積獲勝3場可得洞穴1000點。任務按鈕直接導航至河畔對戰處；沿北側橋梁前往「探索山洞」可進入副本。</p><p>小金魚集滿3張卡片可進化為金魚國王或皇后；國王、皇后卡片各3張向釣魚郎交換<strong>魚飼料</strong>，再到河邊召喚並締約<strong>水蛟龍王</strong>，可再得1000點，兩筆任務均限領一次。</p><p>寵物商人按黃卡1至3階、紫卡1至2階、紅卡分類兌換洞穴點數，單張點數與副本捕捉相同。兌換消耗羈絆，不刪除圖鑑與編組；保留進化及換飼料所需卡片。</p><p>副本首次進入有操作教學：免費召喚三位夥伴、購物、設定40%自動補血、長按靈核球自動捕捉、長按武器選擇。普通、高階、星耀靈核球與城鎮共用；可存檔返回初光鎮，再繼續同局。</p><h3>城鎮旅行與操作</h3>',"<p>左側搖桿移動，右側「鎖定」選擇可締約幻靈，按「締約」投出靈核球；星露果提高締約率，長按締約按鈕可換普通、高階及星耀球。</p>","<p>三種靈核球與星露果（樹果）均無持有數量上限。頂部工具列各自超過 99 顆時，只顯示紅色 99（剛好 99 仍維持原色）；旅人背包保留並顯示實際持有數量。</p>","<p>電腦 WASD／方向鍵移動，空白鍵締約、E 進出、Tab 鎖定、Shift 翻滾；翻滾完成後即可再次使用。拖曳旋轉視角，雙指捏合或滑鼠滾輪縮放。旅人手冊「建物與居民」可導航。</p>","<p>NPC「對話」補給每人每 2 分鐘最多領一次，當次有 5% 機率得到星耀靈核球；城鎮定期補給廣播是另一種獎勵，星耀球機率 2.5%。寵物商人可用任意三張一般幻靈卡片兌換一顆星耀球，扣除的是持有卡片張數，不會清除圖鑑解鎖紀錄。</p>",'<p>巡護員的委託：收錄 '+Rules.quest.requiredSpecies+' 種不同的一般幻靈，回報後一次獲得普通、高階、星耀靈核球各 '+Rules.quest.eachBallReward+' 顆。舊版已領過高階球 3 顆的任務，升級後會一次性補發普通球 30 顆、高階球 27 顆、星耀球 30 顆，與新版獎勵總量一致。</p>',"<p>野外同時維持最多 8 隻幻靈。已捕捉同一種類的卡牌越多、場上已有該種越多，該種的隨機生成權重就越低。一般幻靈一階到二階消耗 5 份羈絆，二階到三階消耗 10 份，特殊進階以圖鑑標示條件為準。</p>",'<p>幻靈競技擂台、河畔釣魚擂台、書櫃挑戰採 3 對 3 制，必須編入 3 位不同且已締約的幻靈。C囝仔、水毛蟲、大眼蛙須各自加入隊伍連續完成 3 場競技擂台對戰才可進階；小黃則為累計參戰 3 場（勝敗均計）。三色蛋在任一戰鬥獲勝後可於野外出現，捕捉率 30%，捕捉失敗有機會化為小麻、咕咕或小鷹。</p>','<p>圖鑑百分比統一按 '+dexStats().total+' 種一般幻靈計算，不包含三名挑戰塔獨立首領卡片。'+Rules.specialNotice()+' '+Rules.pondNotice()+'</p>',"<p>初光道館四大守護者完成試煉後可解鎖對應服裝，守護幻靈會在初光鎮出現；未捕捉前每三分鐘公告，捕捉後該事件結束。冒險服每 10 秒吸收場上所有可收集補給；鹹蛋超人套裝在擂台己方幻靈攻擊 +20%，且道館普通靈核球信任傷害由 18 提升為 24。</p>",'<p>星穹挑戰塔有三種一般魔物及阿宏牛仔、藍金星輝法師、官胖三位獨立首領。'+Rules.towerDropNotice()+'挑戰塔採自動攻擊、換武器、翻滾與大絕機制。</p>',"<p>屬性相剋：光 → 焰 → 森 → 潮 → 雷 → 念 → 光，剋制傷害 ×1.5，被剋傷害 ×0.75。一般絕招消耗 3 能量，普通招式消耗 1 能量。存檔保存在本機瀏覽器，重置需兩次確認；更換裝置不會自動同步。</p>"].join(''));}
const artCache=new Map(),artQueue=[];let artBusy=false;
const decodedCardImages=new Map();
function decodeCardImage(src){if(!src)return Promise.resolve(null);if(decodedCardImages.has(src)){const cached=decodedCardImages.get(src);decodedCardImages.delete(src);decodedCardImages.set(src,cached);return cached.promise;}const image=new Image();image.decoding='async';image.src=src;const entry={image,ready:false,promise:null};entry.promise=(image.decode?image.decode():new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject})).then(()=>{entry.ready=true;return image}).catch(()=>null);decodedCardImages.set(src,entry);while(decodedCardImages.size>8){const oldest=Array.from(decodedCardImages.keys()).find(key=>key!=='assets/cards/frame.png');if(!oldest)break;decodedCardImages.delete(oldest);}return entry.promise;}
function cardArtSource(s){const entry=cardArt[s.id];return entry?(typeof entry==='string'?entry:entry.path||entry.image||entry.src):artCache.get(s.id);}
function warmCollectionArt(s){if(!s)return;decodeCardImage('assets/cards/frame.png');const src=cardArtSource(s);if(src)decodeCardImage(src);}
setInterval(()=>{if(!S.ready||modal||battle||document.hidden)return;const current=target?.species||wild.filter(w=>w.root.visible).sort((a,b)=>a.root.position.distanceToSquared(S.player)-b.root.position.distanceToSquared(S.player))[0]?.species;warmCollectionArt(current);},1200);
function requestArt(s,img){if(!s||!img)return;img.decoding='async';img.alt=s.name+' · 2D 動感插畫';const src=cardArtSource(s);if(src){if(img.closest('.collectionThumb')){img.loading='lazy';img.src=src;return;}const start=performance.now(),cached=decodedCardImages.get(src);img.dataset.predecoded=String(!!cached?.ready);const show=image=>{if(!img.isConnected)return;img.src=src;img.dataset.decodeMs=(performance.now()-start).toFixed(1);if(image)img.dataset.decodedSize=image.naturalWidth+'×'+image.naturalHeight;const card=img.closest('.collectionCard');if(card)card.dataset.artReadyMs=(performance.now()-Number(card.dataset.openStarted||start)).toFixed(1);};if(cached?.ready)show(cached.image);else decodeCardImage(src).then(show);return;}artQueue.push({s,img});processArt();}
async function processArt(){if(artBusy)return;artBusy=true;while(artQueue.length){const {s,img}=artQueue.shift();if(!img.isConnected)continue;try{if(!artCache.has(s.id))artCache.set(s.id,await snapshot(s));if(img.isConnected)img.src=artCache.get(s.id);}catch(e){S.errors.push(e.message);img.alt=s.name+'模型圖載入失敗';}}artBusy=false;}
let artRenderer;
async function snapshot(s){const g=await asset(s.model);if(!artRenderer){artRenderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});artRenderer.setSize(320,320);artRenderer.outputEncoding=T.sRGBEncoding;artRenderer.toneMapping=T.ACESFilmicToneMapping;artRenderer.toneMappingExposure=1.05;}const st=new T.Scene();st.add(new T.HemisphereLight(0xe0f4ff,0xabaa87,1));const key=new T.DirectionalLight(0xffedda,1.5);key.position.set(-3,5,4);st.add(key);const controller=g.create?.(),o=controller?controller.root:cloneSkin(g.scene);st.add(o);o.rotation.y=.35;o.updateMatrixWorld(true);const b=posedBounds(o),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3());const c=new T.PerspectiveCamera(33,1,.01,100),r=Math.max(size.y,size.x,size.z)*1.9;c.position.set(center.x+r*.28,center.y+r*.18,center.z+r);c.lookAt(center);artRenderer.render(st,c);const image=artRenderer.domElement.toDataURL('image/png');controller?.dispose();return image;}
function showDex(){openModal('幻靈圖鑑',`<div class="toolbar"><input id="dexSearch" placeholder="搜尋已締約幻靈或卡牌編號" aria-label="搜尋幻靈"><select id="dexFilter"><option value="all">全部 ${regularSpirits().length} 種</option><option value="owned">已締約</option><option value="guardian">守護者</option><option value="1">第一階段</option><option value="2">第二階段</option><option value="3">第三階段</option>${['光','焰','森','潮','雷','念'].map(t=>'<option value="t:'+t+'">'+t+'屬性</option>').join('')}</select></div><div class="cards" id="cardGrid"></div>${towerDexHtml()}`);renderCards();$('dexSearch').oninput=renderCards;$('dexFilter').onchange=renderCards;}
const heroOutcomeNames=['Celebrate','JumpCelebrate','Disappointed','GroundPoundDisappointed'],townGrassMeshes=[];let townGrassMetadata=null;
function prepareHeroOutcomeActions(){if(!hero)return;for(const name of heroOutcomeNames)if(hero.actions[name])hero.actions[name].setEffectiveTimeScale(2.5);}
function playHeroOutcome(success){prepareHeroOutcomeActions();const candidates=(success?['Celebrate','JumpCelebrate']:['Disappointed','GroundPoundDisappointed']).filter(name=>hero.actions[name]),name=candidates[Math.random()<.5?0:candidates.length-1]||'Idle';hero.play(name,true);const action=hero.actions[name];return {name,duration:action?Math.max(.05,action.getClip().duration/(heroOutcomeNames.includes(name)?2.5:1)):.1};}
async function loadTownGrass(){const r=await fetch('data/grass-patches.json?v=20261017-outouman-v1');if(!r.ok)throw Error('短草配置未就緒');const data=await r.json(),g=await asset(data.model),source=g.scene;source.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(source),baseHeight=Math.max(.001,bounds.max.y-bounds.min.y),patches=data.patches||[],range=data.heightRange||[.08,.22];townGrassMetadata=data;source.traverse(node=>{if(!node.isMesh)return;const materials=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone(),mesh=new T.InstancedMesh(node.geometry,materials,patches.length);mesh.name='短草・可穿越';mesh.userData.townGrass=true;mesh.userData.collision=false;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;for(let i=0;i<patches.length;i++){const patch=patches[i],pos=patch.position||[0,0,0],scale=patch.scale||[1,1,1],height=range[0]+(range[1]-range[0])*(((i*73+19)%101)/100),matrix=new T.Matrix4().compose(new T.Vector3(pos[0],(pos[1]||0)+.005,pos[2]),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),patch.yaw||0),new T.Vector3(scale[0],height/baseHeight,scale[2]));matrix.multiply(node.matrixWorld);mesh.setMatrixAt(i,matrix);}mesh.instanceMatrix.needsUpdate=true;townGroup.add(mesh);townGrassMeshes.push(mesh);});}
function collectionCardHtml(s){return `<article class="collectionCard" data-collection="${esc(s.id)}"${s.cardFrame?` data-frame="${esc(s.cardFrame)}"`:""}><span class="collectionNumber">No.${esc(spiritCatalog.number(s))}</span><img class="collectionArt" data-art="${esc(s.id)}" decoding="async" alt="${esc(s.name)}的原創插畫"><img class="collectionFrame" src="assets/cards/frame.png" decoding="async" alt=""><h3 class="collectionName">${esc(s.name)}</h3><div class="collectionInfo"><div class="collectionType">${esc(s.type||s.element)} · ${esc(s.rarity||'普通')} · ${esc(s.stageLabel||'第 '+(s.stage||1)+' 階段')}</div><div class="collectionStats"><span>HP ${s.hp}</span><span>攻擊 ${s.attack}</span><span class="collectionBond">羈絆 ×${number(S.state.captureCounts[s.id])}</span></div><ul class="collectionSkills">${(s.skills||[]).slice(0,2).map(k=>`<li><span>${esc(k.name)}</span><b>${k.effect==='eggArmour'?'攻擊減半':k.effect==='eggRecover'?'回復90%HP':k.power}／${k.cost||1}能量</b></li>`).join('')}</ul><div class="collectionSynopsis">${esc((s.description||'初光鎮的原創幻靈夥伴。').slice(0,30))}${(s.description||'').length>30?'…':''}</div></div></article>`;}
async function collectDuplicateCard(s,worldPosition){const node=document.createElement('div');node.className='collectionPickup';node.dataset.spirit=s.id;node.innerHTML=collectionCardHtml(s);document.body.append(node);requestArt(s,node.querySelector('[data-art]'));const p=worldPosition.clone().project(camera),sx=(p.x*.5+.5)*innerWidth,sy=(-p.y*.5+.5)*innerHeight;node.style.left=(sx-35)+'px';node.style.top=(sy-49)+'px';try{await captureTween(.45,t=>{node.style.transform=`translateY(${-t*28}px) rotateY(${t*360}deg) scale(${.75+t*.25})`;});const r=$('dexBtn').getBoundingClientRect(),ex=r.x+r.width/2,ey=r.y+r.height/2,cx=sx+(ex-sx)*.35,cy=Math.max(20,Math.min(sy,ey)-120);await captureTween(.95,t=>{const u=1-t,x=u*u*sx+2*u*t*cx+t*t*ex,y=u*u*(sy-28)+2*u*t*cy+t*t*ey;node.style.left=(x-35)+'px';node.style.top=(y-49)+'px';node.style.transform=`rotate(${t*18}deg) scale(${1-t*.8})`;node.style.opacity=String(1-Math.max(0,t-.8)*5);});$('dexBtn').animate([{filter:'brightness(1)'},{filter:'brightness(2)',transform:'scale(1.12)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:500});}finally{node.remove();}}
function renderCards(){const q=$('dexSearch').value.trim(),filter=$('dexFilter').value,list=spiritCatalog.sort(regularSpirits()).filter(s=>(!q||spiritCatalog.number(s).includes(q)||owned(s.id)&&s.name.includes(q))&&(filter==='all'||filter==='owned'&&owned(s.id)||filter==='guardian'&&s.stageLabel==='守護者'||String(s.stage)===filter||filter.startsWith('t:')&&s.type===filter.slice(2)));$('cardGrid').innerHTML=list.map(s=>owned(s.id)?`<button class="collectionThumb" data-detail="${s.id}" data-catalog-number="${spiritCatalog.number(s)}" data-family="${esc(spiritCatalog.get(s).group)}" aria-label="查看 No.${spiritCatalog.number(s)} ${esc(s.name)}收藏卡">${collectionCardHtml(s)}</button>`:`<div class="card locked" data-catalog-number="${spiritCatalog.number(s)}"><small>No.${spiritCatalog.number(s)} · 未締約</small><div class="seal">◇</div><strong>未知幻靈</strong><p class="muted">等待旅途中的相遇</p></div>`).join('');$('cardGrid').querySelectorAll('.collectionFrame').forEach(img=>img.loading='lazy');$('cardGrid').querySelectorAll('[data-art]').forEach(img=>requestArt(byId[img.dataset.art],img));}
const ARENA_EVOLVERS={raikou:'cMonkeyArenaStreak',entei:'waterBugArenaStreak',articuno:'frogArenaStreak',giratina:'rabbitArenaParticipations'};
function evolutionStreakKey(spirit){return ARENA_EVOLVERS[spirit?.id]||null;}
function evolutionCost(spirit){const avian=AvianRules.evolutionCost(spirit);if(avian!==null)return avian;return spirit?.id==='kyogre'?3:Number(spirit?.stage)===1?5:Number(spirit?.stage)===2?10:Infinity;}
function evolutionReady(spirit){const streak=ARENA_EVOLVERS[spirit?.id];return streak?number(S.state[streak])>=3:number(S.state.captureCounts[spirit.id])>=evolutionCost(spirit);}
function evolutionRequirement(spirit){const streak=ARENA_EVOLVERS[spirit?.id];return spirit?.id==='sceptile'?'小鷹卡片 3 張':!Number.isFinite(evolutionCost(spirit))?'同一次三色蛋遭遇捕捉失敗時變化':streak?(spirit.id==='giratina'?'累計擂台參戰 ':'連續擂台參戰 ')+Math.min(3,number(S.state[streak]))+'/3 場':spirit?.id==='kyogre'?'小金魚卡片 3 張（隨機成為國王或皇后）':evolutionCost(spirit)+' 份羈絆';}
let evolutionBusy=false;
function showDetail(id){const s=byId[id];if(!s||!owned(id))return;const next=byId[s.evolvesTo],openStarted=performance.now();warmCollectionArt(s);openModal(s.name,`<div class="collectionDetail">${collectionCardHtml(s)}<div class="collectionDetailActions"><button data-view="${id}" class="primary">查看 3D 模型</button><button data-add="${id}">加入隊伍</button>${next?`<button data-evolve="${id}" ${evolutionReady(s)?'':'disabled'}>進階 · ${evolutionRequirement(s)}</button>`:''}</div><p class="collectionDescription">${esc(s.description||'初光鎮的原創幻靈夥伴。')}</p><p class="collectionEvolution">屬性 ${esc(s.type)}｜剋制 ${esc(TYPE_BEATS[s.type]||'—')}・被 ${esc(Object.keys(TYPE_BEATS).find(k=>TYPE_BEATS[k]===s.type)||'—')} 剋制<br>普攻 ${esc(s.skills?.[0]?.name||'—')}・絕招 ${esc(s.skills?.[1]?.name||'—')}</p><p class="collectionEvolution">${s.acquisition==='tower'?esc(s.acquisitionText||'星穹挑戰塔擊敗此首領取得；獨立幻靈，沒有進階關係。'):`${esc(byId[s.previous]?.name||'起始')} → ${esc(s.name)}${next?' → '+esc(next.name):''}`}</p></div>`);const card=$('modalBody').querySelector('.collectionCard');card.dataset.openStarted=String(openStarted);card.dataset.structureMs=(performance.now()-openStarted).toFixed(1);requestArt(s,card.querySelector('[data-art]'));}
async function evolve(id){
 if(evolutionBusy)return;
 const s=byId[id],next=s&&byId[id==='kyogre'?(Math.random()<.5?'groudon':'rayquaza'):(s.evolvesTo||s.next)],cost=evolutionCost(s),streak=ARENA_EVOLVERS[id];
 if(!next||(!streak&&!Number.isFinite(cost)))return;
 if(streak&&!evolutionReady(s))return toast(s.name+'需加入隊伍，'+(id==='giratina'?'累計':'連續')+'完成 3 場幻靈競技擂台戰鬥（勝敗皆計）才能進階，目前 '+number(S.state[streak])+'/3 場。');
 if(!streak&&!evolutionReady(s))return toast(id==='kyogre'?'小金魚卡片不足：需要 3 張才能進階。':'羈絆不足：'+s.name+'需要 '+cost+' 份羈絆才能進階。');
 evolutionBusy=true;
 document.body.classList.add('evolution-playing');
 try{
  // Never spend a bond before both real models and the cinematic succeed.
  await playEvolutionSequence(s,next);
  if(streak){
   if(!evolutionReady(s))throw Error(id==='giratina'?'尚未累計完成 3 場幻靈競技擂台戰鬥':'尚未連續完成 3 場幻靈競技擂台戰鬥');
   S.state[streak]=0;
  }else{
   if(number(S.state.captureCounts[id])<cost)throw Error('進階所需羈絆不足');
   S.state.captureCounts[id]-=cost;
  }
  grant(next.id);
  hud();
  showDetail(next.id);
  toast('進階成功！'+next.name+'已加入旅途。');
 }catch(error){
  S.errors.push('3D進階：'+error.message);
  toast('進階未完成，羈絆未扣除。'+error.message);
 }finally{
  evolutionBusy=false;
  document.body.classList.remove('evolution-playing');
 }
}
async function playEvolutionSequence(before,after){
 const overlay=document.createElement('section');
 overlay.className='evolutionOverlay';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label',before.name+'進階至'+after.name);
 overlay.tabIndex=-1;
 overlay.innerHTML='<div class="evolutionPanel"><div class="evolutionHeading">幻靈進階</div><div class="evolutionSubtitle"></div><div class="evolutionStage"></div><div class="evolutionWhiteFlash"></div><div class="evolutionMessage" aria-live="polite">正在凝聚羈絆，準備 3D 模型…</div></div>';
 document.body.append(overlay);overlay.focus({preventScroll:true});
 const host=overlay.querySelector('.evolutionStage'),flash=overlay.querySelector('.evolutionWhiteFlash'),message=overlay.querySelector('.evolutionMessage'),subtitle=overlay.querySelector('.evolutionSubtitle');
 subtitle.textContent=before.name+'  →  '+after.name;
 let renderer,oldModel,newModel,rafId=0;
 const white=new T.Color(0xffffff);
 const stage=new T.Scene();
 const camera=new T.PerspectiveCamera(34,1,.1,90);
 stage.add(new T.HemisphereLight(0xffffff,0x8481ac,2));
 const keyLight=new T.DirectionalLight(0xffffff,2.3);keyLight.position.set(-3,5,7);stage.add(keyLight);
 const rimLight=new T.DirectionalLight(0xaad9ff,1.1);rimLight.position.set(4,4,-5);stage.add(rimLight);
 function buildModel(spirit,assetData){
  const controller=assetData.create?.(),object=controller?controller.root:cloneSkin(assetData.scene);
  const bounds=controller?controllerBounds(spirit.model,controller):(actorBaseBounds.get(spirit.model)?.clone()||posedBounds(object));
  const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const root=new T.Group();
  object.position.sub(center);
  root.scale.setScalar(Math.min(3/Math.max(.01,size.y),mobileGraphics?2.5/Math.max(.01,size.x):3.8/Math.max(.01,size.x),2.9/Math.max(.01,size.z)));
  root.add(object);
  const materialCache=new Map(),materials=[];
  function ownMaterial(material){
   if(materialCache.has(material))return materialCache.get(material);
   const copy=material.clone();materialCache.set(material,copy);
   materials.push({material:copy,color:copy.color?.clone(),emissive:copy.emissive?.clone(),intensity:copy.emissiveIntensity||0});
   return copy;
  }
  object.traverse(n=>{if(n.isMesh&&n.material)n.material=Array.isArray(n.material)?n.material.map(ownMaterial):ownMaterial(n.material);});
  const mixer=new T.AnimationMixer(object);
  if(!controller){
   const clips=assetData.animations||[],idle=clips.find(clip=>/idle|待機/i.test(clip.name))||clips[0];
   if(idle)mixer.clipAction(idle).play();
  }else controller.setMode?.('Idle');
  return {root,controller,mixer,materials,dispose(){mixer.stopAllAction();controller?.dispose();for(const x of materials)x.material.dispose();}};
 }
 function whiten(model,intensity){
  const value=Math.max(0,Math.min(1,intensity));
  for(const x of model.materials){
   const m=x.material;
   if(x.color)m.color.copy(x.color).lerp(white,value*.94);
   if(x.emissive){m.emissive.copy(x.emissive).lerp(white,value);m.emissiveIntensity=x.intensity+value*2.5;}
  }
 }
 try{
  const [previousData,nextData]=await Promise.all([asset(before.model),asset(after.model)]);
  if(!overlay.isConnected)throw Error('進階畫面已關閉');
  oldModel=buildModel(before,previousData);
  newModel=buildModel(after,nextData);
  renderer=new T.WebGLRenderer({alpha:true,antialias:!mobileGraphics,powerPreference:'high-performance'});
  renderer.setPixelRatio(graphicsPixelRatio(graphicsQuality.preset));
  const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
  renderer.setSize(width,height,false);renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  camera.aspect=width/height;camera.position.set(0,.25,7.8);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  host.append(renderer.domElement);
  stage.add(oldModel.root);
  message.textContent=before.name+' 正在凝聚白光…';
  await new Promise((resolve,reject)=>{
   let elapsedTime=0,lastTime=0,lastDraw=0,rotation=0,swapped=false;
   const animate=(now)=>{
    try{
     if(!lastTime)lastTime=now;
     const dt=document.hidden?0:Math.min(.07,Math.max(0,(now-lastTime)/1000));lastTime=now;
     elapsedTime+=dt;
     const warmup=Math.min(1,elapsedTime/3.02);
     rotation+=(0.4+warmup*warmup*12)*dt;
     if(!swapped&&elapsedTime>=3.02){
      swapped=true;stage.remove(oldModel.root);stage.add(newModel.root);
      message.textContent=after.name+' 進階成功！';
     }
     const model=swapped?newModel:oldModel;
     model.root.rotation.y=rotation;
     model.mixer.update(dt);model.controller?.update?.(dt);
     if(!swapped){
      const phase=Math.PI*2*(1.05*elapsedTime+.95*elapsedTime*elapsedTime);
      const brightness=Math.min(1,(elapsedTime/.85))*Math.pow(.5+.5*Math.sin(phase),1.2);
      whiten(oldModel,Math.min(1,brightness*.78+Math.max(0,(elapsedTime-2.72)/.3)*.35));
      flash.style.opacity=String(Math.max(0,(elapsedTime-2.82)/.2)*.99);
     }else{
      const fade=Math.max(0,1-(elapsedTime-3.02)/.75);
      whiten(newModel,fade);
      flash.style.opacity=String(Math.max(0,1-(elapsedTime-3.02)/.52)*.99);
     }
     if(now-lastDraw>=28){renderer.render(stage,camera);lastDraw=now;}
     if(elapsedTime>=4.28){resolve();return;}
     rafId=requestAnimationFrame(animate);
    }catch(e){reject(e);}
   };
   rafId=requestAnimationFrame(animate);
  });
 }finally{
  if(rafId)cancelAnimationFrame(rafId);
  oldModel?.dispose();newModel?.dispose();
  if(renderer){renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove();}
  overlay.remove();
 }
}
function showTeam(){openModal('幻靈隊伍 · 3 對 3',`<p class="muted">上場順序由上至下。最多三位夥伴；在圖鑑中加入已締約幻靈。</p>${S.state.team.map((id,i)=>`<div class="row"><span>${i+1}. ${esc(byId[id]?.name||id)}</span><button data-remove="${id}">移出</button></div>`).join('')||'<p>尚未加入夥伴，先去探索締約吧。</p>'}<div class="toolbar" style="margin-top:18px"><button data-menu="dex">前往圖鑑</button><button data-arena="arena" class="primary" ${validThreeSpiritTeam()?'':'disabled'}>與擂台旅人切磋</button></div>`);}
// 冒險套裝（光鳳鷹治癒套裝欄位）被動：初光挑戰、幻靈競技擂台、星穹挑戰塔攻擊力 +20%（挑戰塔讀取同一個存檔的 costume）
function heroAttackBoost(){return S.state?.costume==='healing'?1.2:1;}
// Wild capture/reach extension applies only while the healing adventure suit is worn.
function playerCaptureRange(){return 12*(S.state?.costume==='healing'?1.2:1);}
function showCostumes(){
 const names={trainer:'初光旅人',adventure:'博士贈送冒險服',electric:'鹹蛋超人變身套裝',mist:'小飯團同行',sound:'小山蝴蝶套裝',healing:'冒險套裝'};
 const passives={
  adventure:'被動｜每 10 秒吸收場上所有可收集補給與道具；物品會飛向主角後入袋。',
  electric:'被動｜幻靈競技擂台中，己方所有幻靈攻擊威力 +20%；初光挑戰使用普通靈核球時，信任傷害由 18 提升為 24。',
  healing:'被動｜所有場景（初光挑戰、星穹挑戰塔、幻靈競技擂台）攻擊力 +20%；可捕捉幻靈距離 +20%，攻擊範圍 +20%（適用於有距離判定的戰鬥）。',
  mist:'被動｜幻靈競技擂台每個完整回合結束後，己方所有存活幻靈恢復最大生命 20%；探索移動速度 +20%。',
  sound:'被動｜蝴蝶環繞飛舞・移動漂浮前傾・速度 +20%。'
 };
 openModal('冒險衣櫃','<p class="muted">穿著效果也適用無盡洞穴：冒險服每10秒吸取掉落物；小飯團每波恢復存活寵物生命；其他攻擊、移速與距離加成沿用。副本「服裝效果」可查看詳細換算。</p>'+Object.entries(names).map(([id,name])=>`<div class="row"><span>${name}${passives[id]?`<small style="display:block;color:#647987;font-size:12px;line-height:1.5;margin-top:4px">${passives[id]}</small>`:''}</span><button data-costume="${id}" ${S.state.unlockedCostumes.includes(id)?'':'disabled'}>${S.state.costume===id?'穿著中':S.state.unlockedCostumes.includes(id)?'換裝':id==='adventure'?'向大夢博士領取':'道館解鎖'}</button></div>`).join(''));
}
const gyms=[{id:'gym_1',spirit:'pikachu',costume:'electric'},{id:'gym_2',spirit:'mew',costume:'mist'},{id:'gym_3',spirit:'wigglytuff',costume:'sound'},{id:'gym_4',spirit:'blissey',costume:'healing'}];
function showGyms(){openModal('初光挑戰 · 四大守護者',`<p class="muted">親自走進 3D 試煉場，移動與翻滾避開推離和短暫干擾，投擲靈核球累積守護者的信任。旅人不會受到傷害；完成試煉解鎖專屬變裝，守護神獸將出現於初光鎮等待正式締約。幻靈競技則保留獨立 3 對 3 對決。</p><div class="cards">${gyms.map((g,i)=>`<button class="card" data-arena="${g.id}"><small>試煉 ${i+1} · ${['雷電奔襲','紫波滾動','木頭人驚跳','光鳳破綻'][i]}</small><img data-art="${g.spirit}" alt="${esc(byId[g.spirit]?.name)}"><strong>${esc(byId[g.spirit]?.name)}</strong><div class="stats">${S.state.gyms[g.id]?.cleared?'✓ 已完成':'進入試煉 · 解鎖專屬裝備'}</div></button>`).join('')}</div>`);$('modalBody').querySelectorAll('[data-art]').forEach(img=>requestArt(byId[img.dataset.art],img));}
// 圖鑑 3D 檢視只提供四種動作：待機、移動、普攻、絕招（對應各模型自己的動作）
function viewerControllerMode(path,name){if(isReplacement(path))return ReplacementSpirits.motion(path,name);if(isAvian(path))return AvianSpirits.motion(path,name);if(isFrog(path))return FrogSpirits.motion(path,name);if(isRobot(path))return RobotSpirits.motion(path,name);if(isRiceball(path))return name==='Walk'?'Roll':name;return name;}
function viewerMotionMap(s,controller,acts){const names=Object.keys(acts||{}),actor={path:s.model,actions:acts,controller};const plan=i=>{try{return SpiritCombat.attackPlan(s,actor,s.skills?.[i]||{cost:i?3:1},spiritCatalog.skill(s.id,i)||{}).mode;}catch(e){return i?'Ultimate':'Attack';}};const walk=controller?viewerControllerMode(s.model,'Walk'):['Walk','Fly','Roll','Hop'].find(n=>names.some(k=>k.toLowerCase().includes(n.toLowerCase())))||'Idle';return{Idle:controller?viewerControllerMode(s.model,'Idle'):'Idle',Walk:walk,Attack:plan(0),Ultimate:plan(1)};}
async function showViewer(id){const s=byId[id];if(!s)return;const sk=i=>esc(s.skills?.[i]?.name||(i?'絕招':'普攻'));openModal(s.name+' · 3D 模型','<div class="viewer" id="viewer"></div><p class="viewerNote">拖曳旋轉 · 滾輪縮放 · 右上 × 返回收藏卡</p><div class="toolbar viewerMoves"><button data-vmotion="Idle" class="active">待機</button><button data-vmotion="Walk">移動</button><button data-vmotion="Attack">普攻 · '+sk(0)+'</button><button data-vmotion="Ultimate">絕招 · '+sk(1)+'</button></div>');const host=$('viewer'),g=await asset(s.model);if(!host.isConnected)return;const r=new T.WebGLRenderer({antialias:true,alpha:false});r.setPixelRatio(graphicsPixelRatio(graphicsQuality.preset));r.setSize(host.clientWidth,host.clientHeight);r.outputEncoding=T.sRGBEncoding;r.toneMapping=T.ACESFilmicToneMapping;host.append(r.domElement);const st=new T.Scene();st.background=new T.Color('#192c42');st.add(new T.HemisphereLight(0xd8eeff,0x7c7183,1.3));const l=new T.DirectionalLight(0xffe6ca,2);l.position.set(-3,5,4);st.add(l);const controller=g.create?.(),o=controller?controller.root:cloneSkin(g.scene);st.add(o);const box=controller?controllerBounds(s.model,controller):posedBounds(o),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),cam=new T.PerspectiveCamera(36,host.clientWidth/host.clientHeight,.01,100),mix=new T.AnimationMixer(o),acts={};g.animations.forEach(c=>acts[c.name]=mix.clipAction(c));viewer={r,st,cam,o,mix,acts,controller,center,distance:Math.max(size.x,size.y,size.z)*2,yaw:.3,pitch:.15};viewer.map=viewerMotionMap(s,controller,acts);viewerMotion('Idle');let last=null;host.onpointerdown=e=>{last=[e.clientX,e.clientY];host.setPointerCapture(e.pointerId)};host.onpointermove=e=>{if(last&&viewer){viewer.yaw-=(e.clientX-last[0])*.012;viewer.pitch=Math.max(-.35,Math.min(.8,viewer.pitch+(e.clientY-last[1])*.009));last=[e.clientX,e.clientY];}};host.onpointerup=()=>last=null;host.onwheel=e=>{e.preventDefault();viewer.distance*=e.deltaY>0?1.1:.9;},{passive:false};}
function viewerMotion(n){if(!viewer)return;document.querySelectorAll('.viewerMoves [data-vmotion]').forEach(b=>b.classList.toggle('active',b.dataset.vmotion===n));n=viewer.map?.[n]||n;if(viewer.controller){viewer.controller.setMode(n);return;}const native=!!viewer.o.userData.nativeFamily;Object.values(viewer.acts).forEach(a=>native?a.fadeOut(.65):a.stop());const requested=['Attack','Hurt'].includes(n)&&!viewer.acts[n]&&viewer.acts.React?'React':n;const name=Object.keys(viewer.acts).find(k=>k.toLowerCase().includes(requested.toLowerCase()));if(name){const action=viewer.acts[name];action.reset().setLoop(n==='Landing'?T.LoopOnce:T.LoopRepeat,n==='Landing'?1:Infinity);action.clampWhenFinished=n==='Landing';if(native)action.fadeIn(.65);action.play();}}
function stopViewer(){if(viewer){viewer.mix.stopAllAction();viewer.controller?.dispose();viewer.r.dispose();viewer.r.domElement.remove();viewer=null;}}
function selectTarget(cycle=false){if(battle||throwing||modal||dialog)return;const nearby=captureCandidates().sort((a,b)=>captureDistance(a)-captureDistance(b));if(!nearby.length){clearTarget();if(cycle)toast(nearbyFlyingPhoenix()?'光鳳鷹還在飛行，請等待牠落地行走後再鎖定捕捉。':'目前沒有可締約的幻靈。');return;}if(!target||!nearby.includes(target))target=nearby[0];else if(cycle)target=nearby[(nearby.indexOf(target)+1)%nearby.length];if(cycle){locked=true;$('lockBtn').setAttribute('aria-pressed','true');$('lockBtn').setAttribute('aria-label','解除幻靈鎖定');$('lockBtn').title='解除鎖定';const dx=target.root.position.x-S.player.x,dz=target.root.position.z-S.player.z;hero.root.rotation.y=Math.atan2(dx,dz);cameraOrbit.yaw=Math.atan2(-dx,-dz);if(lockLabel)removeLabel(lockLabel);lockLabel=addLabel(target,'▼ '+target.species.name+' · 已鎖定','nameLabel targetLabel');showLockMarker(target);toast('已鎖定 '+target.species.name+(captureDistance(target)>playerCaptureRange()?'，請再靠近投擲。':''));}}
function useBerry(){if(throwing||battle||modal||dialog)return;if(target&&!captureCandidates().includes(target))clearTarget();if(!target)return toast('先靠近幻靈並鎖定牠。');if(S.state.berryCount<1)return toast('星露果不足，可以向居民詢問補給。');if(target.berry)return toast('牠已經吃過星露果了。');S.state.berryCount--;target.berry=true;save();toast(target.species.name+'放下戒心，下次締約更容易成功！');}
function attachBallOutline(ball){
 // Inverted black silhouette shell around the existing GLB; keeps the original colors.
 // Individual scaled mesh geometry follows the model's local transforms.
 const meshes=[];ball.traverse(n=>{if(n.isMesh&&!n.isSkinnedMesh)meshes.push(n);});
 for(const n of meshes){
  const black=new T.Mesh(n.geometry,new T.MeshBasicMaterial({color:0x080b13,side:T.BackSide,depthWrite:true}));
  black.name='幻靈球_黑色輪廓';black.scale.setScalar(1.075);
  black.renderOrder=1;black.castShadow=false;black.receiveShadow=false;n.add(black);
 }
}
async function throwBall(){if(battle?.gym)return throwGymBall();if(throwing||roll||battle||modal||dialog||enterBusy)return;if(target&&!captureCandidates().includes(target)){const airbornePhoenix=target.species?.id==='blissey'&&!phoenixWildGrounded(target);clearTarget();if(airbornePhoenix)return toast('光鳳鷹起飛了，必須等待落地才能捕捉！');}if(!target)selectTarget();if(!target&&!place&&nearbyFlyingPhoenix())return toast('光鳳鷹飛行期間無法捕捉，請等待牠落地行走。');if(!target&&place&&chestEncounter?.roomId===place.id&&chestEncounter.actor?.root.position.distanceTo(S.player)<=4.6&&elapsed<(chestEncounter.captureReadyAt||0))return toast('寶箱怪已出現驚嘆號，請稍等片刻再投球！');if(!target)return toast('附近沒有可締約的幻靈。');const who=target,type=ballType,key=type==='great'?'greatBallCount':type==='master'?'masterBallCount':'pokeballs';if(S.state[key]<1)return toast('這種靈核球不足，請切換球種或找居民補給。');if(captureDistance(who)>playerCaptureRange())return toast('再靠近一點，讓幻靈看見你。');const ownedBefore=owned(who.species.id),original={position:who.root.position.clone(),scale:who.root.scale.clone(),rotation:who.root.rotation.clone()},fx=new T.Group();let success=false,escaped=false;throwing=true;who.capturing=true;S.state[key]--;save();holdHeroBall(type);playHeroThrow();hero.root.rotation.y=Math.atan2(original.position.x-S.player.x,original.position.z-S.player.z);try{await delay(heroThrowRelease());const path=(type==='great'?world.props?.great_core:type==='master'?world.props?.master_core:world.props?.core)||world.props?.spiritBall||'models/props/core.glb',g=await asset(typeof path==='string'?path:path.model),o=cloneSkin(g.scene),b=new T.Box3().setFromObject(o),sz=b.getSize(new T.Vector3());o.traverse(n=>{if(n.isMesh){n.geometry=n.geometry.clone();n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();}});o.scale.setScalar(.65/Math.max(sz.x,sz.y,sz.z));fx.add(o);scene.add(fx);attachBallOutline(o);const color=type==='master'?0xffb6ff:type==='great'?0x7cffff:0xffe879,from=heroBallOrigin(),to=captureAim(who,original.position),trail=[];o.traverse(n=>{if(!n.isMesh)return;const mats=Array.isArray(n.material)?n.material:[n.material];for(const m of mats){if(m.emissive){m.emissive.setHex(color);m.emissiveIntensity=.55;}if(m.roughness!==undefined)m.roughness=.25;}});for(let i=0;i<12;i++){const p=new T.Mesh(new T.SphereGeometry(.11,8,6),new T.MeshBasicMaterial({color,transparent:true,opacity:1-i/12,depthWrite:false}));fx.add(p);trail.push(p);}await captureTween(.72,t=>{o.position.lerpVectors(from,to,t);o.position.y+=Math.sin(t*Math.PI)*1.65;o.rotation.x=t*8;trail.forEach((p,i)=>{const u=Math.max(0,t-i*.022);p.position.lerpVectors(from,to,u);p.position.y+=Math.sin(u*Math.PI)*1.65;p.scale.setScalar(1-i/15);});});trail.forEach(p=>p.visible=false);captureBurst(to,color,false);await captureTween(.6,t=>{const ease=t*t;who.root.scale.copy(original.scale).multiplyScalar(Math.max(.015,1-ease));who.root.position.lerpVectors(original.position,to,ease);who.root.rotation.y=original.rotation.y+t*6;});who.root.visible=false;await captureTween(.6,t=>{o.rotation.z=Math.sin(t*Math.PI*6)*.22*(1-t);o.scale.multiplyScalar(1+Math.sin(t*Math.PI*2)*.002);});const chance=AvianRules.captureChance(who,type,type==='master'?1:Math.min(.95,.64-(who.species.stage-1)*.13+(who.berry?.22:0)+(type==='great'?.2:0)));if(Math.random()<chance){success=true;const landing=to.clone();const waterSurface=waterCaptureSurface(who);landing.y=waterSurface!==null?waterSurface+.12:.35;await captureTween(.42,t=>{o.position.lerpVectors(to,landing,t);o.rotation.z=Math.sin(t*Math.PI)*.15;});captureBurst(landing,color,true);await captureTween(.5,t=>{o.position.y=landing.y+Math.sin(t*Math.PI)*.15;});recordPondCapture(who);if(labClaimed()&&LAB_LEGENDS.some(e=>e.id===who.species.id)){S.state.worldFlags.labLegendWildCaught||={};S.state.worldFlags.labLegendWildCaught[who.species.id]=true;if(who.species.id==='raikou'){S.state.worldFlags.labLegendRespawnAt||={};S.state.worldFlags.labLegendRespawnAt.raikou=Date.now()+Rules.pond.respawnMs;}}grant(who.species.id);if((!dexComplete()||who.species.id==='raikou')&&isOneTimeSpecial(who.species.id))for(const duplicate of [...wild])if(duplicate!==who&&duplicate.species.id===who.species.id){if(duplicate===target)clearTarget();if(duplicate.specialLabel)removeLabel(duplicate.specialLabel);wild.splice(wild.indexOf(duplicate),1);removeActor(duplicate);}window.PhantomJourneyGuide?.onWildCapture?.();completeGuardianAppearance(who);clearTarget();const i=wild.indexOf(who);if(i>=0)wild.splice(i,1);if(!finishChest(who)&&!finishBook(who)) {removeActor(who);replenish();}toast(ownedBefore?'羈絆增加！'+who.species.name+'的收藏卡已收入圖鑑。':'首次締約！'+who.species.name+'成為你的夥伴。');if(ownedBefore){const outcome=playHeroOutcome(true);await Promise.all([collectDuplicateCard(who.species,landing),captureTween(outcome.duration,()=>{})]);}else{const outcome=playHeroOutcome(true);await captureTween(outcome.duration,()=>{});showDetail(who.species.id);}}else if(who.chestEncounter){who.root.position.copy(original.position);escaped=finishChest(who,true);const outcome=playHeroOutcome(false);await captureTween(outcome.duration,()=>{});}else{who.root.visible=true;captureBurst(to,0xffa37a,false);await captureTween(.32,t=>{who.root.scale.copy(original.scale).multiplyScalar(.02+.98*t);who.root.position.lerpVectors(to,original.position,t);});who.berry=false;who.play('Hurt',true);toast(who.species.name+'掙脫靈核球，再試一次吧。');const outcome=playHeroOutcome(false);await captureTween(outcome.duration,()=>{});if(who.species.id==='jigglypuff'&&who.eggEncounter){try{await transformEggEncounter(who);}catch(error){S.errors.push('三色蛋隨機進化：'+error.message);}}}}catch(e){S.state[key]++;save();toast('締約未能完成，已退還道具。');S.errors.push(e.message);}finally{disposeCaptureFx(fx);if(!success&&!escaped){who.root.position.copy(original.position);who.root.scale.copy(original.scale);who.root.rotation.copy(original.rotation);who.root.visible=true;}who.capturing=false;throwing=false;hero.play('Idle');}}
// Separate real-time guardian trials and three-on-three companion battles.
const combatPalette={fire:0xff873f,water:0x57dfff,grass:0x75ef92,electric:0xffdc53,ice:0xb0efff,psychic:0xc89bff,dark:0xae93ff,fairy:0xfff0a0,normal:0xffd9ac,dragon:0x9baaff,ground:0xd8b77b};
const combatStatusNames={poison:'中毒',burn:'燒傷',freeze:'冰凍',stun:'暈眩',defDown:'減防',attackUp:'加攻',heal:'再生',armor:'霸體'};
const combatStatusFor={fire:'burn',water:'defDown',grass:'heal',electric:'stun',ice:'freeze',psychic:'defDown',fairy:'stun',normal:'attackUp',dark:'defDown',dragon:'burn',ground:'defDown'};
const battleAudio=PhantomCombatAudio.create({assetBase:null});
addEventListener('pointerdown',()=>void battleAudio.unlock(),{capture:true,passive:true});addEventListener('keydown',()=>void battleAudio.unlock(),true);addEventListener('pagehide',()=>battleAudio.stop());
function combatSound(element,strong=false){if(battle&&!battle.gym)return;return battleAudio.play({pet:true,element,strong,phase:'release'});}
// Little Goldfish (kyogre): mirror the original GLB's authored Attack/Ultimate choreography.
// From authoring/water-spirits/spirits.js: bullet at 0.6s; backflip 0.25–1.15s;
// thin water column 1.3–3.2s and ripples at 0.2/3.2s. Never replace its native clips.
function littleGoldfishArenaFx(attacker,defender,strong){
 const a=attacker.actor,d=defender.actor,group=new T.Group(),created=[];
 const material=(color,opacity)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
 const make=(geometry,shade,opacity)=>{const mesh=new T.Mesh(geometry,material(shade,opacity));mesh.visible=false;group.add(mesh);created.push(mesh);return mesh;};
 const ball=make(new T.SphereGeometry(.15,12,10),0x7fd2ff,.95);
 const glow=make(new T.SphereGeometry(.23,12,10),0xc9f5ff,.35);
 const column=strong?make(new T.CylinderGeometry(.075,.095,1,12,1,true),0x7fd2ff,.82):null;
 const halo=strong?make(new T.CylinderGeometry(.14,.18,1,12,1,true),0xdbf9ff,.28):null;
 const ringA=make(new T.RingGeometry(.26,.34,28),0x8adfff,.78);
 const ringB=strong?make(new T.RingGeometry(.38,.49,28),0xb9f2ff,.78):null;
 ringA.rotation.x=-Math.PI/2;
 if(ringB)ringB.rotation.x=-Math.PI/2;
 battleGroup.add(group);
 let released=false,source=null,sounded=false,disposed=false;
 const mouth=()=>{
  a.object.updateMatrixWorld(true);
  const body=a.object.getObjectByName('body');
  if(body)return body.localToWorld(new T.Vector3(0,.88,.62));
  const start=a.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,a.worldSize.y*.55,0));
  const delta=d.root.position.clone().sub(a.root.position).setY(0);
  if(delta.lengthSq()>.0001)start.addScaledVector(delta.normalize(),a.worldSize.z*.28);
  return start;
 };
 const target=()=>d.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,d.worldSize.y*.54,0));
 const ripple=(mesh,position,t,start,duration,maxSize)=>{
  if(!mesh)return;
  const u=(t-start)/duration;
  mesh.visible=u>=0&&u<=1;
  if(!mesh.visible)return;
  mesh.position.copy(position);
  mesh.position.y=Math.max(.07,mesh.position.y);
  mesh.scale.setScalar(.4+maxSize*u);
  mesh.material.opacity=.78*(1-u);
 };
 const update=seconds=>{
  if(disposed)return;
  const t=Math.max(0,seconds);
  const start=a.root.getWorldPosition(new T.Vector3()).setY(.09);
  if(strong){
   ripple(ringA,start,t,.2,.7,2.4);
   const end=d.root.getWorldPosition(new T.Vector3()).setY(.09);
   ripple(ringB,end,t,3.2,.58,3.0);
   const active=t>=1.3&&t<=3.2;
   ball.visible=glow.visible=column.visible=halo.visible=active;
   if(!active)return;
   if(!sounded){combatSound('water',true);sounded=true;}
   const from=mouth(),to=target(),delta=to.clone().sub(from),length=delta.length(),dir=delta.clone().normalize();
   if(length<.01)return;
   const rise=Math.min(1,(t-1.3)/.16),fade=Math.min(1,(3.2-t)/.24),opacity=Math.max(0,Math.min(rise,fade)),distance=length*rise;
   for(const beam of [column,halo]){
    beam.position.copy(from).addScaledVector(dir,distance*.5);
    beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);
    beam.scale.set(1,Math.max(.02,distance),1);
    beam.material.opacity=(beam===column?.82:.28)*opacity*(.91+.09*Math.sin(t*22));
   }
   ball.position.copy(from).addScaledVector(dir,distance);
   glow.position.copy(ball.position);
   ball.material.opacity=.82*opacity;
   glow.material.opacity=.35*opacity;
  }else{
   const end=d.root.getWorldPosition(new T.Vector3()).setY(.09);
   ripple(ringA,end,t,1.05,.43,1.7); // source animation releases its bullet at 0.6s; impact splash follows
   const active=t>=.6&&t<=1.2;
   ball.visible=glow.visible=active;
   if(!active)return;
   if(!released){source=mouth();released=true;combatSound('water',false);}
   const to=target(),u=Math.min(1,(t-.6)/.6);
   ball.position.lerpVectors(source,to,u);
   ball.position.y+=Math.sin(u*Math.PI)*.22;
   glow.position.copy(ball.position);
   ball.material.opacity=.95*(1-.25*u);
   glow.material.opacity=.35*(1-.45*u);
  }
 };
 const dispose=()=>{
  if(disposed)return;disposed=true;battleGroup.remove(group);
  for(const mesh of created){mesh.geometry.dispose();mesh.material.dispose();}
 };
 return {update,approach:()=>0,dispose}; // arena strike() expects script.approach() for every native FX
}
// Goldfish King / Queen: use the model's authored Attack/Ultimate pose,
// then launch a water orb or luminous water cannon from the facing mouth.
// This effect is arena-only and is timed to SpiritCatalog's native clip release.
function royalGoldfishAttackFx(attacker,defender,strong,wholeDuration){
 const king=attacker.s.id==='groudon',color=king?0x6de0ff:0x9deaff,accent=king?0xffd478:0xefdbff;
 const start=attacker.actor.root.position.clone().add(new T.Vector3(0,attacker.actor.worldSize.y*.55,0));
 const end=defender.actor.root.position.clone().add(new T.Vector3(0,defender.actor.worldSize.y*.54,0));
 const forward=end.clone().sub(start).setY(0).normalize();
 start.addScaledVector(forward,Math.min(.75,attacker.actor.worldSize.z*.30));
 const group=new T.Group(),balls=[];
 const makeBall=(radius,shade,opacity)=>{
  const mesh=new T.Mesh(new T.SphereGeometry(radius,16,12),
    new T.MeshBasicMaterial({color:shade,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending}));
  group.add(mesh);balls.push(mesh);return mesh;
 };
 const core=makeBall(strong?.23:.34,color,.85);
 const glow=makeBall(strong?.39:.47,accent,.24);
 const sparkles=[];
 for(let i=0;i<(strong?12:7);i++){
  const a=i*Math.PI*2/(strong?12:7),m=makeBall(.045+(i%3)*.012,i%2?accent:0xffffff,.7);
  sparkles.push({m,a});
 }
 let beam=null,outer=null;
 if(strong){
  const geometry=new T.CylinderGeometry(.12,.16,1,12,1,true);
  beam=new T.Mesh(geometry,new T.MeshBasicMaterial({color,transparent:true,opacity:.90,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));
  outer=new T.Mesh(new T.CylinderGeometry(.22,.27,1,12,1,true),
   new T.MeshBasicMaterial({color:accent,transparent:true,opacity:.31,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));
  group.add(beam,outer);
 }
 battleGroup.add(group);
 combatSound('water',strong);
 const duration=Math.max(.28,Math.min(strong?1.45:.85,wholeDuration*(1-.48)));
 addEffect({object:group,start:elapsed,duration,update:t=>{
  const delta=end.clone().sub(start),distance=delta.length(),head=delta.clone().normalize();
  if(!strong){
   const progress=Math.min(1,t*1.15),pos=start.clone().lerp(end,progress).add(new T.Vector3(0,Math.sin(progress*Math.PI)*.3,0));
   core.position.copy(pos);glow.position.copy(pos);core.scale.setScalar(1+.10*Math.sin(t*17));glow.scale.setScalar(1.08+.12*Math.sin(t*19));
  }else{
   const expand=Math.min(1,t*3.5),length=distance*expand;
   for(const part of [beam,outer]){
    part.position.copy(start).addScaledVector(head,length*.5);
    part.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),head);
    part.scale.set(1,Math.max(.02,length),1);
    part.material.opacity=(part===beam?.90:.31)*(1-.3*t);
   }
   core.position.copy(start).addScaledVector(head,length);
   glow.position.copy(core.position);
  }
  sparkles.forEach(({m,a},i)=>{
   const base=strong?start.clone().lerp(end,Math.min(1,t*(1.15+i*.025))):core.position;
   m.position.copy(base).add(new T.Vector3(Math.cos(a+t*9)*(.24+.2*t),Math.sin(a*2+t*10)*(.25+.12*t),Math.sin(a+t*8)*(.24+.15*t)));
   m.material.opacity=.7*(1-t);
  });
  if(t>.78){const fade=(1-t)/.22;core.material.opacity=.85*fade;glow.material.opacity=.24*fade;}
 },done:()=>{
  for(const node of group.children){node.geometry?.dispose();node.material?.dispose();}
 }});
 if(strong)combatRing(defender.actor.root.position,1.5,'water',.85);
}
function combatFx(from,to,element,strong=false,duration=.65){const group=new T.Group(),color=combatPalette[element]||0xd1eaff,count=strong?28:12;for(let i=0;i<count;i++){let geometry;if(element==='electric')geometry=new T.BoxGeometry(.055,.36,.06);else if(element==='ice'||element==='psychic'||element==='dark')geometry=new T.OctahedronGeometry(.14,0);else if(element==='grass')geometry=new T.SphereGeometry(.12,6,4);else if(element==='fire'||element==='dragon')geometry=new T.ConeGeometry(.13,.35,6);else if(element==='fairy')geometry=new T.TorusGeometry(.11,.03,4,8);else geometry=new T.SphereGeometry(.12,6,4);const m=new T.Mesh(geometry,new T.MeshBasicMaterial({color,transparent:true,opacity:.95,blending:T.AdditiveBlending}));if(element==='grass')m.scale.set(.5,1.8,.45);group.add(m);}battleGroup.add(group);combatSound(element,strong);addEffect({object:group,start:elapsed,duration,update:t=>{group.children.forEach((m,i)=>{const phase=i/count*Math.PI*2,spread=(strong?1.15:.35)*Math.sin(t*Math.PI)*(1-Math.min(1,t*1.2)),travel=Math.min(1,t*(element==='electric'?1.8:1.2));m.position.lerpVectors(from,to,travel);m.position.x+=Math.cos(phase+t*(element==='psychic'?15:7))*spread;m.position.y+=Math.sin(phase+t*9)*spread+Math.sin(Math.min(1,t*1.2)*Math.PI)*.55;m.position.z+=Math.sin(phase)*spread;m.rotation.set(t*7+phase,t*9,phase);m.material.opacity=Math.max(0,1-t);});},done:()=>group.children.forEach(m=>{m.geometry.dispose();m.material.dispose();})});if(strong)combatRing(to.clone().setY(.05),1.9,element,duration);}
function combatRing(pos,radius,element,duration=1){const m=new T.Mesh(new T.RingGeometry(radius-.09,radius,64),new T.MeshBasicMaterial({color:combatPalette[element]||0xd1eaff,transparent:true,opacity:.85,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.copy(pos);m.position.y=.08;battleGroup.add(m);addEffect({object:m,start:elapsed,duration,update:t=>{m.scale.setScalar(.3+t*.7);m.material.opacity=.9*(1-t*.65);},done:()=>{m.geometry.dispose();m.material.dispose();}});}
function statusSet(entry,key,turns=2){entry.status||={};entry.status[key]=turns;updateHp(entry);}
// 霸體：身體微微發光、毛色變亮（複製材質，不影響同種幻靈）；狀態結束時還原
function setArmorGlow(entry,on){const a=entry?.actor;if(!a?.object)return;a.object.traverse(n=>{if(!n.isMesh)return;if(on){if(n.userData.glowOrig||!n.material?.emissive)return;n.userData.glowOrig=n.material;const m=n.material.clone();m.emissive=m.emissive.clone().lerp(new T.Color(0xffb347),.22);m.emissiveIntensity=Math.max(.5,m.emissiveIntensity||0);n.material=m;}else if(n.userData.glowOrig){n.material.dispose?.();n.material=n.userData.glowOrig;delete n.userData.glowOrig;}});}
function applyBuff(entry,buff){const turns=Number(buff.turns)||2;statusSet(entry,'armor',turns+1);setArmorGlow(entry,true);if(entry.actor)combatRing(entry.actor.root.position,1.5,'normal',.9);battleLog(entry.s.name+'發動霸體！攻擊、防禦各提升 '+Math.round((buff.atk||.3)*100)+'%，持續 '+turns+' 回合。');}
function statusTick(entry){entry.status||={};if(entry.status.burn)entry.hp=Math.max(0,entry.hp-10);if(entry.status.heal)entry.hp=Math.min(entry.s.hp,entry.hp+8);const stopped=!!(entry.status.freeze||entry.status.stun);const hadArmor=!!entry.status.armor;for(const k of Object.keys(entry.status))if(k!=='poison'&&--entry.status[k]<=0)delete entry.status[k];if(hadArmor&&!entry.status.armor)setArmorGlow(entry,false);updateHp(entry);return stopped;}
// 原生水蛟龍王：保留 GLB 攻擊與螺旋起身動畫，只在原設計的時間點疊加水彈／龍息。
function waterDragonArenaFx(attacker,defender,strong,plan){
 const group=battleGroup,body=attacker.actor.object,rate=plan.playbackRate||1;
 const blue=new T.MeshBasicMaterial({color:0x51c8ff,transparent:true,opacity:.82,depthWrite:false,side:T.DoubleSide});
 const foam=new T.MeshBasicMaterial({color:0xd8f8ff,transparent:true,opacity:.60,depthWrite:false,side:T.DoubleSide});
 const bullet=new T.Mesh(new T.SphereGeometry(.3,16,12),blue);
 const jet=new T.Mesh(new T.CylinderGeometry(.25,.34,1,16,1,true),blue);
 const core=new T.Mesh(new T.CylinderGeometry(.09,.14,1,12,1,true),foam);
 const wave=new T.Mesh(new T.TorusGeometry(.65,.07,8,24),foam);
 const hit=new T.Mesh(new T.TorusGeometry(.55,.10,8,24),blue);
 for(const m of [bullet,jet,core,wave,hit]){m.visible=false;group.add(m);}
 wave.rotation.x=hit.rotation.x=-Math.PI/2;
 const launchedFrom=new T.Vector3(),up=new T.Vector3(0,1,0);
 let launched=false,disposed=false;
 const mouth=()=>{body.updateMatrixWorld(true);const head=body.getObjectByName('head');return head?head.localToWorld(new T.Vector3(0,0,.55)):attacker.actor.root.position.clone().add(new T.Vector3(0,attacker.actor.worldSize.y*.68,0));};
 const destination=()=>defender.actor.root.position.clone().add(new T.Vector3(0,defender.actor.worldSize.y*.55,0));
 const connect=(mesh,from,to)=>{const d=to.clone().sub(from),len=Math.max(.01,d.length());mesh.position.copy(from).addScaledVector(d,.5);mesh.quaternion.setFromUnitVectors(up,d.multiplyScalar(1/len));mesh.scale.set(1,len,1);};
 return{
  update(sec){
   if(disposed)return;
   const t=sec*rate,end=destination();
   bullet.visible=jet.visible=core.visible=wave.visible=hit.visible=false;
   if(!strong){
    if(t>=.75&&!launched){launched=true;launchedFrom.copy(mouth());}
    if(t>=.75&&t<1.32){const p=Math.min(1,(t-.75)/.57);bullet.visible=p<1;bullet.position.lerpVectors(launchedFrom,end,p);bullet.scale.setScalar(1+.35*p);}
    if(t>=1.13&&t<1.72){hit.visible=true;hit.position.copy(end);hit.position.y=Math.max(.08,end.y-.35);hit.scale.setScalar(.4+2.2*(t-1.13));blue.opacity=Math.max(.12,.82*(1-(t-1.13)/.59));}
   }else if(t>=2.9&&t<=5.2){
    const from=mouth(),energy=Math.max(.1,Math.min(1,(t-2.9)/.28,(5.2-t)/.3));
    jet.visible=core.visible=wave.visible=hit.visible=true;
    connect(jet,from,end);connect(core,from,end);
    jet.scale.x=jet.scale.z=.7+.45*energy;core.scale.x=core.scale.z=.6+.25*energy;
    wave.position.copy(attacker.actor.root.position);wave.position.y=.12;wave.scale.setScalar(1.2+((t-2.9)*2.4)%2.6);
    hit.position.copy(defender.actor.root.position);hit.position.y=.14;hit.scale.setScalar(1.15+.4*Math.sin(t*18));
    blue.opacity=.55+.22*energy;
   }
  },
  dispose(){if(disposed)return;disposed=true;for(const m of [bullet,jet,core,wave,hit]){group.remove(m);m.geometry.dispose();}blue.dispose();foam.dispose();}
 };
}
async function startBattle(kind,carry){const bookRoom=kind==='book'?place:null;if(kind==='book'&&(!bookRoom||!nearbyBookshelf()||!validBookTeam()||bookEncounter))return;const gym=gyms.find(g=>g.id===kind);if(!gym&&!validThreeSpiritTeam())return toast('此挑戰採 3 對 3 對戰，請先於圖鑑編入 3 位不同的已締約幻靈。');if(battle||throwing||enterBusy)return;if(kind==='fishing'&&!spirits.some(SpiritCombat.isWater))return toast('水系對手資料尚未就緒，請稍後再試。');if(gym?.spirit==='wigglytuff'){try{window.speechSynthesis?.resume();if(window.SpeechSynthesisUtterance){const intro=new SpeechSynthesisUtterance('小山，木頭人試煉');intro.lang='zh-TW';window.speechSynthesis?.speak(intro);}}catch(e){}}cancelNavigation();clearTarget();closeModal();closeDialog();document.body.classList.add('battle-active');$('toast').classList.remove('visible');clearTimeout(toast.timer);stopAppearanceBgm();const previous=carry?.previous||{position:S.player.clone(),place,background:scene.background.clone(),fog:scene.fog};const pool=spirits.filter(s=>!isChest(s)&&!isBook(s)&&s.acquisition!=='tower'&&!BOSS_CARD_IDS.includes(s.id)&&s.stage<=2&&!['mewtwo','jigglypuff'].includes(s.id)),enemies=bookRoom?['weedle','kakuna','beedrill'].map(id=>byId[id]):gym?[byId[gym.spirit]]:kind==='fishing'?(carry?['kyogre','groudon','rayquaza'].map(id=>byId[id]):SpiritCombat.fishingOpponents(spirits)):[...pool].sort(()=>Math.random()-.5).slice(0,3);battle={caveBattleId:crypto.randomUUID(),kind,gym,bookRoom,previous,arenaClock:elapsed,simulationSpeed:gym?1:ARENA_SPEED,carryWon:!!carry?.won,fishingWins:kind==='fishing'?Math.max(0,Math.floor(Number(carry?.fishingWins)||0)):0,allies:S.state.team.filter(id=>byId[id]).map(id=>({s:byId[id],hp:byId[id].hp,energy:2,status:{}})),enemies:enemies.map(s=>({s,hp:gym?s.hp*3:s.hp,energy:2,status:{},maxHp:gym?s.hp*3:s.hp})),ai:0,ei:0,busy:true,turn:1,actors:[],heroHp:100,nextAttack:elapsed+3,heroStatus:{},throwAt:0};if(kind==='arena'){S.state.frogArenaPending=true;save();}townGroup.visible=false;insideGroup.visible=false;battleGroup.visible=true;hero.root.visible=!!gym;if(companion)companion.root.visible=false;target=null;if(!carry)scene.background=new T.Color(gym?0x17273b:0x536a79);scene.fog=null;$('controls').hidden=!gym;$('battleHud').hidden=false;$('portal').hidden=true;$('battleTitle').textContent=gym?'初光挑戰 · '+byId[gym.spirit].name:bookRoom?'書櫃奇遇 · 書本幻靈 3 對 3':kind==='fishing'?'河畔釣魚 · 水系幻靈 3 對 3':'幻靈競技擂台 · 3 對 3';PhantomLoading.begin(kind==='fishing'?'正在準備河畔釣魚對戰':'正在準備挑戰場景');$('battleLog').textContent='進場中…';$('battleLog').hidden=!!gym&&gym.spirit!=='wigglytuff';$('battleLog').style.removeProperty('top');$('battleLog').style.removeProperty('left');try{const sceneConfig=gym?await gymSceneConfig(gym.costume):null;if(battle)battle.sceneConfig=sceneConfig;const arena=kind==='fishing'?await FishingArena.build(T):(await asset(sceneConfig?.model||world.battleModel||'models/world/arena.glb')).scene.clone(true);if(!gym&&kind!=='fishing')arena.traverse(o=>{if(o.isMesh&&o.material){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.color?.multiplyScalar(.76);m.emissive?.set(0x243540);m.emissiveIntensity=.12;m.roughness=.78;}}});if(carry)battleGroup.clear();battleGroup.add(arena);battle.arena=arena;if(!gym&&kind!=='fishing'){shiftArenaRings(arena);applyGrassArena(arena);}if(gym){battleGroup.add(hero.root);battle.heroLabel=addLabel(hero,'','nameLabel hpLabel');document.body.classList.add('gym-active');document.body.classList.toggle('gym-player-narration',gym.spirit!=='wigglytuff');S.player.fromArray(sceneConfig.spawn||[0,0,6]);hero.root.position.copy(S.player);hero.root.rotation.y=Math.PI;await battleActors();}else await battleActors();if(!gym){const portrait=innerWidth<600;camera.position.set(0,portrait?11.3:9.9,portrait?23.5:18);camera.lookAt(0,portrait?-.8:-.2,0);}battle.busy=false;battleLog(gym?.spirit==='wigglytuff'?'小山正在打瞌睡。旁白數完後會驚跳，落地後驚恐的 3 秒才可累積信任！':gym?'首領只會推離或短暫干擾；移動與翻滾閃避光圈，投球完成試煉。':'選擇你的行動。');if(gym?.spirit==='pikachu'){outoumanTrialState(battle,battle.enemies[0].actor);battleLog('歐頭慢每 5 秒發出持續 2 秒的加粗彩虹光束，側移或翻滾閃避！命中麻痺 2 秒，期間無法投球；投球另有 30% 機率被翻滾閃避。');}if(gym?.spirit==='wigglytuff')xiaoshanTrialState(battle,battle.enemies[0].actor);if(gym?.spirit==='blissey'){phoenixTrialState(battle,battle.enemies[0].actor);battleLog('旁白：光鳳鷹蓄光時無敵，請在攻擊命中瞬間翻滾！成功打斷後有 3 秒破綻，可投球累積信任。');}battleButtons();PhantomLoading.end();}catch(e){PhantomLoading.end();S.errors.push(e.message);toast('對戰場地載入失敗，已返回探索。');endBattle(false,true);}}
let grassTexture=null,grassGeo=null,grassMat=null;
function applyGrassArena(arena){
 if(!grassTexture){
  const size=mobileGraphics?512:1024,c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),R=Math.random,pick=a=>a[(R()*a.length)|0];
  g.fillStyle='#58a445';g.fillRect(0,0,size,size);
  const stripes=10;for(let i=0;i<stripes;i++){g.fillStyle=i%2?'rgba(255,255,220,.06)':'rgba(0,50,0,.07)';g.fillRect(0,i*size/stripes,size,size/stripes);}
  const greens=['#3f8c34','#4c9a3c','#6bb74d','#7cc558','#8bcf5f','#2f7a2f'],yellows=['#c8c94a','#dccf56','#b9bf45','#e6dc6a'];
  for(let i=0;i<90;i++){const x=R()*size,y=R()*size,r=size*(.03+R()*.11),col=R()<.24?pick(yellows):pick(greens),gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col+'d0');gr.addColorStop(1,col+'00');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
  const blades=mobileGraphics?5000:11000,bc=['#3a8030','#4f9d3e','#79c455','#9ad36a','#c9cf52','#2d6f2b'];
  for(let i=0;i<blades;i++){const x=R()*size,y=R()*size,len=3+R()*9,ang=-Math.PI/2+(R()-.5)*1.0;g.strokeStyle=pick(bc);g.globalAlpha=.55+R()*.4;g.lineWidth=1+R();g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(ang)*len,y+Math.sin(ang)*len);g.stroke();}
  g.globalAlpha=1;
  grassTexture=new T.CanvasTexture(c);grassTexture.encoding=T.sRGBEncoding;grassTexture.anisotropy=4;
  grassGeo=new T.PlaneGeometry(20.8,24.8);grassMat=new T.MeshLambertMaterial({map:grassTexture});
 }
 arena.traverse(mesh=>{if(!mesh.isMesh)return;for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])if((m?.name||'').toLowerCase()==='cream')m.visible=false;});
 const floor=new T.Mesh(grassGeo,grassMat);floor.rotation.x=-Math.PI/2;floor.position.y=.052;floor.receiveShadow=true;floor.name='GrassFloor';arena.add(floor);
}
function shiftArenaRings(arena){
 // The original GLB has three circles merged into one multi-material mesh.
 // The sky/purple floor discs and white edge lines are separate primitives.
 // Move both the disc and its edge vertices together; keep the gold centre ring intact.
 arena.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry||!mesh.material)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const geometry=mesh.geometry,attribute=geometry.getAttribute('position');
  if(!attribute)return;
  const index=geometry.index;
  const groups=geometry.groups.length?geometry.groups:[{start:0,count:index?index.count:attribute.count,materialIndex:0}];
  const movable=new Set();
  for(const group of groups){
   const material=materials[group.materialIndex]||materials[0];
   if(!['sky','purple','white'].includes((material?.name||'').toLowerCase()))continue;
   for(let i=group.start;i<group.start+group.count;i++){
    movable.add(index?index.getX(i):i);
   }
  }
  if(!movable.size)return;
  // GLTFLoader caches geometry; editing a private clone prevents later battles shifting twice.
  mesh.geometry=geometry.clone();
  const points=mesh.geometry.getAttribute('position');
  let changed=0;
  for(const i of movable){
   const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
   if(Math.abs(x)>3.55||y<.25||y>.85)continue;
   const dx=z< -3.35&&z> -9?1.75:z>3.35&&z<9?-1.75:0;
   if(dx){points.setX(i,x+dx);changed++;}
  }
  if(changed){
   points.needsUpdate=true;
   mesh.geometry.computeBoundingBox();
   mesh.geometry.computeBoundingSphere();
   arena.userData.diagonalRingVertices=(arena.userData.diagonalRingVertices||0)+changed;
  }
 });
}

async function battleActors(side){const b=battle;if(!b)return;let entries=b.gym?[[b.enemies[0],0,-3.2,0]]:[[b.allies[b.ai],-1.75,6,Math.PI*.75],[b.enemies[b.ei],1.75,-6,-Math.PI*.25]];if(side&&!b.gym){const keep=side==='ally'?b.enemies[b.ei]:b.allies[b.ai],gone=side==='ally'?b.allies[b.ai]:b.enemies[b.ei];for(const old of [...b.actors])if(old===keep.actor)continue;else{removeActor(old);b.actors.splice(b.actors.indexOf(old),1);}if(gone.label&&gone.label.el.isConnected)removeLabel(gone.label);entries=entries.filter(e=>e[0]!==keep);}else{for(const a of b.actors)removeActor(a);b.actors=[];}for(const [entry,x,z,ry]of entries){// Arena-only appearance multipliers; preserve the existing Initial Light gym guardian size.
const baseHeight=b.gym?3.05:(entry===b.enemies[b.ei]?2.55:2.05),arenaScale=b.gym?1:SpiritCombat.arenaScale(entry.s)*({blissey:2,zapdos:1.5,pikachu:1.5,chikorita:1,bayleef:1.5,meganium:1.95,torterra:1.5,mudkip:1.3,marshtomp:1.3,swampert:1.3}[entry.s.id]||1),height=b.gym&&entry.s.id==='blissey'?baseHeight*2.5:baseHeight*arenaScale;const a=await actor(entry.s.model,height,battleGroup);a.arenaSpeciesId=entry.s.id;a.root.position.set(x,0,z);if(!b.gym){a.arenaGroundLift=({moltres:.23,quilava:.32,typhlosion:.38})[a.arenaSpeciesId]||0;a.root.position.y=a.arenaGroundLift;}if(b.gym&&b.sceneConfig?.enemySpawn)a.root.position.fromArray(b.sceneConfig.enemySpawn);a.root.rotation.y=ry;FishingArena.attachPuddle(T,a,entry.s);entry.actor=a;b.actors.push(a);entry.label=addLabel(a,'','nameLabel hpLabel');if(side){a.root.visible=false;}if(b.gym)entry.label.el.classList.add('gymTrustLabel');else entry.label.el.classList.add(entry===b.allies[b.ai]?'arenaAllyHp':'arenaEnemyHp');updateHp(entry);if(side)await fadeActor(a,0,1,.45);}}
function updateHp(e){if(!e?.label)return;if(battle?.gym){const max=e.maxHp||e.s.hp,progress=max-e.hp;e.label.el.innerHTML='<b>'+esc(e.s.name)+'</b><div class="hp"><i style="width:'+Math.max(0,progress)/max*100+'%"></i></div><small>信任 '+Math.round(progress/max*100)+'% · 締約試煉</small>';return;}const max=e.maxHp||e.s.hp,status=Object.keys(e.status||{}).filter(k=>e.status[k]>0).map(k=>combatStatusNames[k]||k);if(e.attackMultiplier===.5)status.push('攻擊減半');e.label.el.innerHTML=`<b>${esc(e.s.name)}</b><div class="hp"><i style="width:${Math.max(0,e.hp)/max*100}%"></i></div><small>${Math.max(0,e.hp)} / ${max}${battle?.gym?'':' · 能量 '+e.energy}</small>${status.length?`<small style="display:block;color:#fff3a7">${status.map(esc).join(' · ')}</small>`:''}`;}
function battleLog(t){$('battleLog').textContent=t;}
function battleItems(){const b=battle;if(!b||b.busy)return;const defs=[['potion',itemNames.potion,'回復 45 HP'],['armorBreak',itemNames.armorBreak,b.gym?'敵方減防 6 秒':'敵方減防 3 回合'],['attackBoost',itemNames.attackBoost,b.gym?'旅人加攻 12 秒':'己方加攻 3 回合']];$('battleActions').innerHTML=defs.map(([key,name,desc])=>`<button data-battle="item:${key}" ${number(S.state.items[key])<1?'disabled':''}>${name}<small>${desc} · ${number(S.state.items[key])} 份</small></button>`).join('')+'<button data-battle="itemsBack">返回戰鬥</button>'; }
function battleButtons(){if(!battle)return;const b=battle;if(b.gym){$('battleActions').innerHTML='<button data-battle="retreat" class="gymExitOnly">離開挑戰</button>';return;}const p=b.allies[b.ai],skills=p.s.skills?.length?p.s.skills:[{name:'靈光衝擊',power:p.s.attack,cost:1},{name:'全力一擊',power:p.s.attack*1.6,cost:3}];$('battleActions').innerHTML=skills.slice(0,isFrog(p.s.model)?3:2).map((s,i)=>`<button data-skill="${i}" ${b.busy||p.energy<(s.cost||1)||!AvianRules.canUse(p,s,b.turn)?'disabled':''}>${esc(s.name)}<small>${s.effect==='eggArmour'?'對手攻擊減半':s.effect==='eggRecover'?'恢復最大 HP 90%':s.power+' 威力'} · ${s.cost||1} 能量${s.effect==='eggRecover'?' · 每2回合': ''}${(s.cost||0)>=3&&!s.effect?' · '+(s.status?.type==='poison'?'中毒':combatStatusNames[combatStatusFor[p.s.element]]||'共鳴'):''}</small></button>`).join('')+`<button data-battle="switch" ${b.busy?'disabled':''}>換位<small>其餘 ${b.allies.filter((a,i)=>a.hp>0&&i!==b.ai).length} 位夥伴</small></button><button data-battle="items" ${b.busy?'disabled':''}>道具<small>回血 / 減防 / 加攻</small></button><button data-battle="retreat" style="grid-column:1/-1;min-height:24px;padding:5px;font-size:10px">結束切磋，返回探索</button>`;}
// Both arena techniques use their own visual identity. Other spirits keep normal combat effects.
// The two arena skills share the original forward beam animation, with
// independent coloring and thickness. No other spirit uses these materials.
function outoumanSkillFx(from,to,skillName){
 const rainbow=skillName==='彩虹光束',duration=.7,group=new T.Group();
 const delta=to.clone().sub(from),distance=Math.max(.01,delta.length());
 const forward=delta.lengthSq()<1e-6?new T.Vector3(0,0,1):delta.normalize();
 // Keep the seven colors separated across the camera-facing width of the beam.
 const side=new T.Vector3().crossVectors(forward,camera.getWorldDirection(new T.Vector3()));
 if(side.lengthSq()<.01)side.set(1,0,0);else side.normalize();
 const orientation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),forward);
 const colors=rainbow?[0xff3b46,0xffa236,0xfff35a,0x55ff8a,0x44dfff,0x527cff,0xc879ff]:Array(7).fill(0xffffff);
 // Avoid heavily overlapping seven cylinders: additive overlap clipped into white.
 const radius=rainbow?.125:.115,spacing=rainbow?.265:.085;
 const geometry=new T.CylinderGeometry(1,1,1,12,1,true),beams=[];
 for(let i=0;i<colors.length;i++){
  const material=new T.MeshBasicMaterial({color:colors[i],transparent:true,opacity:1,depthWrite:false,blending:rainbow?T.NormalBlending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:!rainbow});
  const mesh=new T.Mesh(geometry,material);
  mesh.quaternion.copy(orientation);
  mesh.scale.set(radius,.01,radius);
  mesh.position.copy(from).addScaledVector(side,(i-3)*spacing);
  group.add(mesh);beams.push({mesh,material,i});
 }
 // Never overlay an additive white halo on the rainbow strips: it washes out the colors.
 battleGroup.add(group);
 combatSound('electric',rainbow);
 const middle=from.clone(),distanceOffset=distance*.5;
 addEffect({object:group,start:elapsed,duration,
  update:t=>{
   const reach=Math.min(1,t*2.6),beamLength=Math.max(.01,distance*reach);
   middle.copy(from).addScaledVector(forward,distanceOffset*reach);
   for(const {mesh,material,i} of beams){
    mesh.position.copy(middle).addScaledVector(side,(i-3)*spacing);
    mesh.scale.y=beamLength;
    material.opacity=rainbow?(t<.76?1:Math.max(0,(1-t)/.24)):Math.max(0,(1-t)*(.69+.13*Math.sin(t*32+i)));
   }
     },
  done:()=>{geometry.dispose();for(const v of beams)v.material.dispose();}
 });
}
let arenaCarry=null;   // 接續擂台時，保留場景（不回到一般場景）的暫存資料
function actorHasClip(a,name){return !a.controller&&Object.keys(a.actions||{}).some(k=>k.toLowerCase()===name);}
// 受擊：有受擊動作就播放，沒有就以左右晃動代替；回傳動作結束的 Promise
function hitReact(a,long=false){
 return new Promise(resolve=>{
  const clip=actorHasClip(a,'hurt');let dur=long?.8:.42;
  if(clip){const key=Object.keys(a.actions).find(k=>k.toLowerCase()==='hurt');dur=Math.min(1.1,a.actions[key].getClip().duration||dur);a.play('Hurt',true);}
  const base=a.root.position.clone(),rz=a.root.rotation.z,amp=long?.17:.1;
  addEffect({start:elapsed,duration:dur,update:t=>{if(!clip){const k=(1-t)*amp;a.root.position.x=base.x+Math.sin(t*64)*k;a.root.rotation.z=rz+Math.sin(t*46)*k*.55;}},done:()=>{a.root.position.copy(base);a.root.rotation.z=rz;resolve();}});
 });
}
function actorFadeMaterials(a){
 if(a.fadeMats)return a.fadeMats;const list=[];
 a.root.traverse(n=>{if(!n.isMesh||!n.material)return;const many=Array.isArray(n.material),clones=(many?n.material:[n.material]).map(m=>m.clone());n.material=many?clones:clones[0];for(const c of clones)list.push({m:c,o:c.opacity,t:c.transparent,w:c.depthWrite});});
 return a.fadeMats=list;
}
function fadeActor(a,from,to,dur,lift=0){
 return new Promise(resolve=>{
  const list=actorFadeMaterials(a),y0=a.root.position.y;a.root.visible=true;
  const apply=v=>{for(const f of list){f.m.transparent=true;f.m.depthWrite=v>.98?f.w:false;f.m.opacity=f.o*v;}};apply(from);
  addEffect({start:elapsed,duration:dur,update:t=>{const v=from+(to-from)*t;apply(v);a.root.position.y=y0+lift*(to<from?t:0);},done:()=>{apply(to);if(to<=0)a.root.visible=false;a.root.position.y=y0;resolve();}});
 });
}
// 倒下：受擊動作（或晃動）→ 身影淡出消失
async function defeatSequence(entry){
 const a=entry?.actor;if(!a||!battle)return;
 if(entry.label?.el)entry.label.el.style.opacity='.35';
 await hitReact(a,true);if(!battle)return;
 combatRing(a.root.position,1.4,entry.s.element,.7);
 await fadeActor(a,1,0,.7,.35);
 if(entry.label?.el)entry.label.el.style.display='none';
}
// 六屬性相剋：光 > 焰 > 森 > 潮 > 雷 > 念 > 光；剋制 ×1.5、被剋 ×0.75
const TYPE_BEATS={光:'焰',焰:'森',森:'潮',潮:'雷',雷:'念',念:'光'};
function typeMultiplier(attackType,defendType){return TYPE_BEATS[attackType]===defendType?1.5:TYPE_BEATS[defendType]===attackType?.75:1;}
// 冒險蛙專屬擂台落點特效：與原生 Boomerang 時間軸同步，不隱藏模型自己的飛鏢。
function adventureFrogArenaFx(attacker,defender,plan){
 const group=new T.Group(),material=new T.MeshBasicMaterial({color:0xa7f65b,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending}),flashMat=new T.MeshBasicMaterial({color:0xe9ffd0,transparent:true,opacity:.74,depthWrite:false,blending:T.AdditiveBlending});
 const trail=new T.Mesh(new T.SphereGeometry(.13,12,8),material);
 const ring=new T.Mesh(new T.TorusGeometry(.55,.075,8,30),flashMat);
 const ground=new T.Mesh(new T.TorusGeometry(.7,.055,8,30),material);
 const leaves=Array.from({length:9},(_,i)=>{const m=new T.Mesh(new T.ConeGeometry(.085,.31,5),i%2?flashMat:material);group.add(m);return m;});
 group.add(trail,ring,ground);battleGroup.add(group);ring.rotation.x=-.25;ground.rotation.x=-Math.PI/2;
 let sounded=false,disposed=false;
 return{
  update(sec){
   if(disposed)return;
   const age=sec*(plan.playbackRate||1),start=attacker.actor.root.position.clone().add(new T.Vector3(0,attacker.actor.worldSize.y*.65,0)),end=defender.actor.root.position.clone().add(new T.Vector3(0,defender.actor.worldSize.y*.60,0));
   const flight=Math.max(0,Math.min(1,(age-2.38)/1.63)),impact=age>=4.01&&age<4.95,u=Math.max(0,(age-4.01)/.94);
   trail.visible=age>=2.38&&age<4.01;
   if(trail.visible){trail.position.lerpVectors(start,end,flight);trail.position.y+=Math.sin(flight*Math.PI)*.38;trail.scale.setScalar(1+.4*Math.sin(age*12));}
   ring.visible=ground.visible=impact;
   if(impact){
    if(!sounded){sounded=true;combatSound('grass',true);}
    ring.position.copy(end);ring.scale.setScalar(.35+u*2.5);flashMat.opacity=Math.max(0,.85*(1-u));
    ground.position.copy(defender.actor.root.position);ground.position.y=.12;ground.scale.setScalar(.4+u*1.7);
    for(let i=0;i<leaves.length;i++){const p=leaves[i],angle=i*Math.PI*2/leaves.length,dist=.22+u*(.85+i%3*.11);p.visible=true;p.position.copy(end).add(new T.Vector3(Math.cos(angle)*dist,.2+u*(i%3-.5),Math.sin(angle)*dist));p.rotation.set(age*2,angle,age*5);p.scale.setScalar((1-u)*(.8+i%3*.15));}
   }else for(const leaf of leaves)leaf.visible=false;
  },
  approach:()=>0,
  dispose(){if(disposed)return;disposed=true;battleGroup.remove(group);group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});material.dispose();flashMat.dispose();}
 };
}
async function strike(attacker,defender,skill){if(!battle)return;const activeBattle=battle;if(statusTick(attacker)){attacker.actor.play('Hurt',true);battleLog(attacker.s.name+'受狀態影響，暫停一次行動。');await arenaDelay(600);return;}const strong=(skill.cost||0)>=3,binding=spiritCatalog.skill(attacker.s.id,skill),plan=SpiritCombat.attackPlan(attacker.s,attacker.actor,skill,binding||{}),p=attacker.actor.root.position.clone(),to=defender.actor.root.position.clone().add(new T.Vector3(0,defender.actor.worldSize.y*.55,0)),dir=to.clone().sub(p).setY(0).normalize();attacker.actor.root.rotation.y=Math.atan2(dir.x,dir.z);if(isReplacement(attacker.s.model))attacker.actor.controller?.setTargetDistance?.(p.distanceTo(defender.actor.root.position)/Math.max(.001,attacker.actor.object.scale.x));if(!plan.procedural)attacker.actor.play(plan.mode,true);if(plan.playbackRate)attacker.actor.actions[attacker.actor.mode]?.setEffectiveTimeScale(plan.playbackRate);attacker.actor.arenaPlaybackRate=plan.playbackRate||1;battleAudio.play({pet:true,speciesId:attacker.s.id,sourceActor:attacker.actor.root.uuid,element:attacker.s.element,strong,phase:'start'});battleLog(attacker.s.name+'使用'+skill.name+'！');const baseScale=attacker.actor.object.scale.clone(),baseY=attacker.actor.root.position.y,royalGoldfish=attacker.s.id==='groudon'||attacker.s.id==='rayquaza',littleGoldfish=attacker.s.id==='kyogre';const script=attacker.s.id==='moltres'&&strong?adventureFrogArenaFx(attacker,defender,plan):attacker.s.id==='entei'?AmphibianArenaFx.caterpillar({T,attacker,defender,group:battleGroup,plan:{...plan,strong},sound:combatSound}):attacker.s.id==='articuno'?AmphibianArenaFx.frog({actor:attacker.actor,plan}):attacker.s.id==='mewtwo'?waterDragonArenaFx(attacker,defender,strong,plan):littleGoldfish?littleGoldfishArenaFx(attacker,defender,strong):plan.nativeFx&&window.SpiritVfx?.has(attacker.actor.path||attacker.s.model)?SpiritVfx.script({T,path:attacker.actor.path||attacker.s.model,strong,attacker:attacker.actor,defender:defender.actor,group:battleGroup,now:()=>arenaTime(activeBattle),add:(dur,fn,done)=>addEffect({start:elapsed,duration:dur,update:t=>fn(t,t*dur),done}),sound:(el,big)=>combatSound(el,big),color:attacker.s.color,element:attacker.s.element}):null;const punkCombo=attacker.s.id==='raichu'&&strong,melee=SpiritCombat.presentationKind(attacker.s,skill,plan)==='melee',targeted=!punkCombo&&!script&&(attacker.actor.controller||melee)?SpiritCombat.targetedPresentation({T,species:attacker.s,skill,plan,attacker:attacker.actor,defender:defender.actor,group:battleGroup}):null;if(targeted)plan.nativeFx=true;attacker.actor.duoFx?.setTarget?.(to);let fxReleased=false,secondGuitarHit=false;const releaseFx=()=>{if(fxReleased)return;fxReleased=true;battleAudio.play({pet:true,speciesId:attacker.s.id,sourceActor:attacker.actor.root.uuid,element:attacker.s.element,strong,phase:'release'});if(royalGoldfish)royalGoldfishAttackFx(attacker,defender,strong,plan.duration);else if(attacker.s.id==='pikachu'&&['白色光波','彩虹光束'].includes(skill.name))outoumanSkillFx(p.clone().add(new T.Vector3(0,1,0)),to,skill.name);else if(melee)combatRing(defender.actor.root.position,1.05,attacker.s.element,.3);else if(!plan.nativeFx)combatFx(p.clone().add(new T.Vector3(0,attacker.actor.worldSize.y*.55,0)),to,attacker.s.element,strong,Math.max(.1,plan.duration*(1-plan.releaseFraction)));if(strong&&!plan.nativeFx&&!royalGoldfish)combatRing(defender.actor.root.position,1.7,attacker.s.element,.8);};await new Promise(resolve=>addEffect({start:elapsed,duration:plan.duration,update:t=>{if(script)script.update(t*plan.duration);targeted?.update(t*plan.duration);if(t>=Math.min(.95,plan.releaseFraction))releaseFx();if(punkCombo&&!secondGuitarHit&&t>=2.90/5.25){secondGuitarHit=true;combatRing(defender.actor.root.position,1.20,'electric',.40);combatSound('electric',true);}const gap=Math.max(1.2,Math.min(3.2,.3*attacker.actor.worldSize.y+.35*defender.actor.worldSize.y+.6)),meleeReach=Math.max(0,p.distanceTo(defender.actor.root.position)-gap),meleeTravel=Math.max(0,Math.min(1,(t-.04)/.28)),meleeRetreat=Math.max(0,Math.min(1,(t-.80)/.18)),meleeStep=meleeReach*(meleeTravel*meleeTravel*(3-2*meleeTravel))*(1-meleeRetreat*meleeRetreat*(3-2*meleeRetreat)),approach=melee?meleeStep:script?Math.max(0,p.distanceTo(defender.actor.root.position)-gap)*(script.approach?.(t*plan.duration)||0):targeted?targeted.approach(t*plan.duration):isReplacement(attacker.s.model)&&attacker.s.id==='raichu'&&strong?Math.max(0,p.distanceTo(defender.actor.root.position)-1.52*attacker.actor.object.scale.x):0;const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};attacker.actor.root.position.copy(p).addScaledVector(dir,script||targeted?approach:approach?approach*ease(t/.32)*(1-ease((t-.68)/.32)):Math.sin(t*Math.PI)*(binding?.nativeAttack===false?.35:0));const ps=script?.pose?.(t*plan.duration);if(ps){attacker.actor.root.position.y=baseY+ps.y;attacker.actor.object.scale.set(baseScale.x*(1+ps.sq),baseScale.y*(1-ps.sq),baseScale.z*(1+ps.sq));}if(melee)attacker.actor.root.position.y+=Math.sin(Math.PI*Math.min(1,t/.32))*.7;},done:()=>{script?.dispose?.();targeted?.dispose();attacker.actor.arenaPlaybackRate=1;if(plan.playbackRate)attacker.actor.actions[attacker.actor.mode]?.setEffectiveTimeScale(1);attacker.actor.duoFx?.setTarget?.(null);attacker.actor.root.position.copy(p);attacker.actor.object.scale.copy(baseScale);attacker.actor.root.position.y=baseY;resolve();}}));if(battle!==activeBattle)return;const eggResult=AvianRules.apply(attacker,defender,skill,battle.turn);if(eggResult){eggSkillFx(eggResult.kind,attacker,defender);attacker.energy=Math.max(0,attacker.energy-(skill.cost||1));updateHp(attacker);updateHp(defender);battleLog(eggResult.text);await arenaDelay(1600);attacker.actor.play('Idle');return;}const costumeBoost=battle?.kind==='arena'&&battle.allies.includes(attacker)?(S.state.costume==='electric'?1.2:1)*heroAttackBoost():1;
 const damage=Math.max(8,Math.round((skill.power||attacker.s.attack)*(attacker.attackMultiplier??1)*costumeBoost*(attacker.status?.attackUp?1.45:1)*(defender.status?.defDown?1.4:1)*(attacker.status?.armor?1.3:1)/(defender.status?.armor?1.3:1)*typeMultiplier(attacker.s.type,defender.s.type)*(.88+Math.random()*.24)));const typeNote=({1.5:'屬性剋制，效果絕佳！',0.75:'屬性被剋，效果減弱。'})[typeMultiplier(attacker.s.type,defender.s.type)]||'';const hpBefore=defender.hp;defender.hp=Math.max(0,defender.hp-damage);if(defender.hp<hpBefore){const ev={pet:true,speciesId:attacker.s.id,sourceActor:attacker.actor.root.uuid,element:attacker.s.element,strong,phase:'impact'};battleAudio.play(ev);arenaFeedback.impact(defender.actor.root.position.clone().add(new T.Vector3(0,defender.actor.worldSize.y*.55,0)),ev);}defender.actor.play('Hurt',true);if(!actorHasClip(defender.actor,'hurt'))void hitReact(defender.actor);attacker.energy=Math.max(0,attacker.energy-(skill.cost||1));if(SpiritReplacementRules.poison(defender,skill))updateHp(defender);else if(strong){const status=combatStatusFor[attacker.s.element]||'defDown';statusSet(['heal','attackUp'].includes(status)?attacker:defender,status,3);}updateHp(attacker);updateHp(defender);if(skill.buff)applyBuff(attacker,skill.buff);battleLog(defender.s.name+'受到 '+damage+' 點傷害。'+typeNote+(strong?'絕招效果已發動！':''));await arenaDelay(['entei','articuno','mewtwo','moltres','raichu','cyndaquil','quilava','typhlosion'].includes(attacker.s.id)?240:plan.procedural?260:600);attacker.actor.play('Idle');defender.actor.play('Idle');}
function arenaCostumeHealing(b){
 if(!b||b.kind!=='arena'||S.state.costume!=='mist')return false;
 let healed=false;
 for(const ally of b.allies){
  if(ally.hp<=0)continue; // Do not revive fallen spirits.
  const maximum=ally.maxHp||ally.s.hp;
  const newHp=Math.min(maximum,ally.hp+Math.ceil(maximum*.20));
  if(newHp>ally.hp){ally.hp=newHp;healed=true;updateHp(ally);}
 }
 return healed;
}
async function playerTurn(action,index){const b=battle;if(!b)return;if(action==='retreat')return endBattle(false,true);if(b.busy)return;if(action==='items')return battleItems();if(action==='itemsBack')return battleButtons();if(action==='retreat')return endBattle(false,true);if(action==='potion')action='item:potion';if(b.gym){if(action.startsWith('item:')){const key=action.slice(5);if(number(S.state.items[key])<1)return;S.state.items[key]--;if(key==='potion')for(const k of Object.keys(b.heroStatus))if(k!=='attackUp')delete b.heroStatus[k];if(key==='armorBreak'){statusSet(b.enemies[0],'defDown',6);b.defDownUntil=elapsed+6;}if(key==='attackBoost')b.heroStatus.attackUp=elapsed+12;save();battleLog('使用道具 · 回復藥解除短暫干擾。');battleButtons();}return;}b.busy=true;battleButtons();try{let p=b.allies[b.ai],e=b.enemies[b.ei];if(action==='skill'){const skill=p.s.skills?.[index]||{name:'靈光衝擊',power:p.s.attack,cost:1};if(p.energy<(skill.cost||1)||!AvianRules.canUse(p,skill,b.turn)){b.busy=false;return battleButtons();}await strike(p,e,skill);}else if(action.startsWith('item:')){const key=action.slice(5);if(number(S.state.items[key])<1){b.busy=false;return battleButtons();}S.state.items[key]--;if(key==='potion')p.hp=Math.min(p.s.hp,p.hp+45);if(key==='armorBreak')statusSet(e,'defDown',3);if(key==='attackBoost')statusSet(p,'attackUp',3);save();updateHp(p);battleLog('道具生效！');await arenaDelay(350);}else if(action==='switch'){const i=b.allies.findIndex((x,i)=>x.hp>0&&i!==b.ai);if(i<0){b.busy=false;return battleButtons();}b.ai=i;await battleActors('ally');p=b.allies[b.ai];e=b.enemies[b.ei];}if(!battle)return;if(e.hp<=0){await defeatSequence(e);if(!battle)return;const next=b.enemies.findIndex(x=>x.hp>0);if(next<0)return endBattle(true);b.ei=next;await battleActors('enemy');e=b.enemies[b.ei];}e.energy=Math.min(5,e.energy+1);const skills=e.s.skills||[{name:'靈光衝擊',power:e.s.attack,cost:1}],choice=skills.filter(s=>(s.cost||1)<=e.energy&&AvianRules.canUse(e,s,b.turn)).slice(-1)[0]||{name:'蓄力輕擊',power:12,cost:0};await strike(e,p,choice);if(!battle)return;for(const entry of [p,e]){if(SpiritReplacementRules.poisonRound(entry))updateHp(entry);}if(e.hp<=0){await defeatSequence(e);if(!battle)return;const next=b.enemies.findIndex(x=>x.hp>0);if(next<0)return endBattle(true);b.ei=next;await battleActors('enemy');e=b.enemies[b.ei];}if(p.hp<=0){await defeatSequence(p);if(!battle)return;const next=b.allies.findIndex(x=>x.hp>0);if(next<0)return endBattle(false);b.ai=next;await battleActors('ally');p=b.allies[b.ai];}p.energy=Math.min(5,p.energy+2);const riceballRecovered=arenaCostumeHealing(b);b.turn++;updateHp(p);updateHp(b.enemies[b.ei]);b.busy=false;battleLog('第 '+b.turn+' 回合 · 選擇行動'+(riceballRecovered?' · 小飯團護佑：己方存活幻靈恢復最大 HP 20%':''));battleButtons();}catch(error){S.errors.push('擂台動作：'+error.message);console.error(error);battleAudio.stop();arenaFeedback.clear();if(battle===b){b.busy=false;for(const a of b.actors){a.play('Idle');a.arenaPlaybackRate=1;}battleLog('招式播放未完成，已恢復操作，請再試一次。');battleButtons();}}}
function gymCamera(){if(!battle?.enemies[0]?.actor)return;const middle=S.player.clone().lerp(battle.enemies[0].actor.root.position,.4),distance=(battle.sceneConfig?.cameraDistance||18)*(innerWidth<600?1.3:1);camera.position.lerp(middle.clone().add(new T.Vector3(0,distance*.75,distance)),.12);const q=battle.xiaoshanTrial;if(q?.shakeUntil>elapsed){const fade=(q.shakeUntil-elapsed)/.65;camera.position.x+=Math.sin(elapsed*79)*.30*fade;camera.position.y+=Math.cos(elapsed*94)*.22*fade;camera.position.z+=Math.sin(elapsed*61)*.18*fade;}camera.lookAt(middle.x,1,middle.z);}

// Four reusable rings bound the trial's effects; each ring can touch the player once.
function riceTrialState(b,a){
 if(b.riceTrial)return b.riceTrial;
 const geometry=new T.RingGeometry(.985,1,48),rings=Array.from({length:4},()=>{const material=new T.MeshBasicMaterial({color:0xb85aff,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.NormalBlending,depthTest:true}),mesh=new T.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.visible=false;battleGroup.add(mesh);return {mesh,age:99,radius:0,hit:false,center:new T.Vector3()};});
 return b.riceTrial={phase:'roll',remaining:3.8,waveClock:0,wavesEmitted:0,waveHits:0,goal:a.root.position.clone(),goalIn:0,rings,geometry};
}
function disposeRiceTrial(b){const q=b.riceTrial;if(!q)return;for(const w of q.rings){detach(w.mesh);w.mesh.material.dispose();}q.geometry.dispose();b.riceTrial=null;}
function pushByRiceWave(b,center){
 b.heroStatus.throwBlock=Math.max(b.heroStatus.throwBlock||0,elapsed+1.35);const away=S.player.clone().sub(center).setY(0);if(away.length()<.01)away.set(0,0,1);away.normalize();let previous=0;
 addEffect({start:elapsed,duration:.24,update:t=>{if(battle!==b||b.ending)return;const progress=1-Math.pow(1-t,2),distance=(progress-previous)*3.5;previous=progress;const nx=S.player.x+away.x*distance,nz=S.player.z+away.z*distance;if(!gymBoundsBlocked(nx,nz,.35)){S.player.set(nx,0,nz);hero.root.position.copy(S.player);}}});
 hero.play('Hurt',true);battleLog('紫波連環：被光波推開！配合波紋翻滾閃避。');
}
function tickRiceTrial(b,a,dt){
 const q=riceTrialState(b,a);q.remaining-=dt;q.goalIn-=dt;
 const startStuck=()=>{q.phase='stuck';q.remaining=3.6;q.waveClock=-.35;a.motionSpeed=0;a.play('Stuck');b.evadeAI={moving:false,goal:a.root.position.clone()};battleLog('小飯團卡住了 >_<！即將連續釋放紫色光波，留意波紋並翻滾閃避！');};
 if(q.remaining<=0){if(q.phase==='roll')startStuck();else{q.phase='roll';q.remaining=3.6+Math.random()*1.1;q.goalIn=0;battleLog('小飯團恢復快速滾動，追上它並投出靈核球！');}}
 if(q.phase==='roll'){
  if(q.goalIn<=0||q.goal.distanceTo(a.root.position)<.35){const angle=Math.random()*Math.PI*2;q.goal.set(Math.sin(angle)*(5+Math.random()*5),0,Math.cos(angle)*(5+Math.random()*5));q.goalIn=.7+Math.random()*.65;}
  const delta=q.goal.clone().sub(a.root.position).setY(0),distance=delta.length(),speed=9.2,step=Math.min(distance,speed*dt);if(distance>1e-6)delta.normalize();else delta.set(0,0,0);const nx=a.root.position.x+delta.x*step,nz=a.root.position.z+delta.z*step;
  if(!gymBoundsBlocked(nx,nz,1.2)){a.root.position.set(nx,0,nz);a.root.rotation.y=Math.atan2(-delta.z,delta.x);a.motionSpeed=speed;a.play('Run');b.evadeAI={moving:distance>.1,goal:q.goal};}else startStuck();
 }else{
  a.motionSpeed=0;a.play('Stuck');q.waveClock+=dt;
  if(q.waveClock>=.62){q.waveClock-=.62;const w=q.rings.find(x=>x.age>=1.7);if(w){w.age=0;w.radius=0;w.hit=false;w.center.copy(a.root.position);w.mesh.position.copy(w.center).add(new T.Vector3(0,.13,0));w.mesh.scale.setScalar(.12);w.mesh.visible=true;q.wavesEmitted++;}}
 }
 for(const w of q.rings){if(w.age>=1.7)continue;const previous=w.radius;w.age+=dt;const t=Math.min(1,w.age/1.7);w.radius=.12+t*9.5;w.mesh.scale.setScalar(w.radius);w.mesh.material.opacity=Math.sin(Math.PI*t)*.55;w.mesh.visible=t<1;
  const distance=Math.hypot(S.player.x-w.center.x,S.player.z-w.center.z);
  if(!w.hit&&distance>=Math.max(0,previous-.65)&&distance<=w.radius+.65){w.hit=true;if(!roll&&!b.ending){q.waveHits++;pushByRiceWave(b,w.center);}}
 }
}

// Timed wooden-person trial; speech is optional and never drives phase transitions.
function xiaoshanTrialState(b,a){
 if(b.xiaoshanTrial)return b.xiaoshanTrial;
 a.root.position.set(0,0,0);a.motionSpeed=0;a.play('Sleep');
 const geometry=new T.RingGeometry(.92,1,64),material=new T.MeshBasicMaterial({color:0xe5c06d,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}),ring=new T.Mesh(geometry,material);ring.rotation.x=-Math.PI/2;ring.position.set(0,.07,0);ring.visible=false;battleGroup.add(ring);
 return b.xiaoshanTrial={phase:'sleep',phaseStart:elapsed,vulnerableUntil:0,landings:0,blockedHits:0,successfulHits:0,lastCount:-1,ring,geometry,material,quakeStart:-99,shakeUntil:0,utterance:null};
}
function xiaoshanCanHit(b){const q=b?.xiaoshanTrial;return !!q&&q.phase==='scared'&&elapsed<q.vulnerableUntil&&!b.ending;}
function xiaoshanNarrate(q,text){
 try{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;const voice=new SpeechSynthesisUtterance(text);voice.lang='zh-TW';voice.rate=.9;voice.volume=.85;q.utterance=voice;window.speechSynthesis.speak(voice);}catch(e){/* Visible countdown remains available without browser speech. */}
}
function disposeXiaoshanTrial(b){const q=b?.xiaoshanTrial;if(!q)return;try{if(q.utterance)window.speechSynthesis?.cancel();}catch(e){}detach(q.ring);q.geometry.dispose();q.material.dispose();if(b.arena)b.arena.position.set(0,0,0);q.shakeUntil=0;q.disposed=true;}
function tickXiaoshanTrial(b,a,dt){
 const q=xiaoshanTrialState(b,a);if(q.disposed)return;let age=elapsed-q.phaseStart;
 const enter=(phase)=>{q.phase=phase;q.phaseStart=elapsed;age=0;};
 if(q.phase==='sleep'&&age>=2.4){enter('countdown');q.lastCount=-1;}
 if(q.phase==='countdown'){
  const count=Math.min(3,Math.floor(age/.85));if(count!==q.lastCount){q.lastCount=count;const word=['1','2','3','木頭人！'][count];battleLog('旁白：'+word+' · 小山仍在打瞌睡');xiaoshanNarrate(q,word);}
  if(age>=3.4){enter('wake');a.play('Wake');battleLog('木頭人！小山醒來了，即將向上一大跳！');}
 }else if(q.phase==='wake'&&age>=.55){enter('jump');a.play('Jump');}
 else if(q.phase==='jump'){
  const t=Math.min(1,age/1.25);a.root.position.y=6*4*t*(1-t);
  if(t>=1){a.root.position.y=0;q.landings++;q.quakeStart=elapsed;q.shakeUntil=elapsed+.65;q.vulnerableUntil=elapsed+3;enter('scared');a.play('Scared');q.ring.visible=true;battleLog('轟！小山受到驚嚇，現在有 3 秒可投球累積信任！');}
 }else if(q.phase==='scared'&&elapsed>=q.vulnerableUntil){q.vulnerableUntil=0;enter('sleep');a.play('Sleep');battleLog('小山又睡著了，等待下一次「1、2、3、木頭人」！');}
 a.root.position.x=0;a.root.position.z=0;a.root.rotation.y=Math.atan2(S.player.x,S.player.z);
 const quakeAge=elapsed-q.quakeStart;if(quakeAge>=0&&quakeAge<.85){q.ring.visible=true;q.ring.scale.setScalar(.3+quakeAge*24);q.material.opacity=(1-quakeAge/.85)*.8;}else q.ring.visible=false;
 if(b.arena){if(q.shakeUntil>elapsed){const fade=(q.shakeUntil-elapsed)/.65;b.arena.position.x=Math.sin(elapsed*79)*.09*fade;b.arena.position.y=Math.cos(elapsed*94)*.07*fade;}else b.arena.position.set(0,0,0);}
}


function outoumanTrialState(b,a){
 if(b.outoumanTrial)return b.outoumanTrial;
 const beamLength=42,beamRadius=1.1,geometry=new T.CylinderGeometry(1,1,1,18,1,true),group=new T.Group(),colors=[0xff3838,0xff9c27,0xffeb3b,0x62f359,0x32d6ff,0x5679ff,0xce5cff],materials=[];
 // Seven overlapping strips span the complete collision radius without a costly particle stream.
 for(let i=0;i<7;i++){const material=new T.MeshBasicMaterial({color:colors[i],transparent:true,opacity:.56,depthWrite:false,side:T.DoubleSide});materials.push(material);const mesh=new T.Mesh(geometry,material);mesh.rotation.x=Math.PI/2;mesh.scale.set(beamRadius*.38,beamLength,beamRadius*.38);mesh.position.set((i-3)*beamRadius*.23,0,beamLength*.5);group.add(mesh);}
 const glowMaterial=new T.MeshBasicMaterial({color:0xe9d2ff,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide}),glow=new T.Mesh(geometry,glowMaterial);materials.push(glowMaterial);glow.rotation.x=Math.PI/2;glow.scale.set(beamRadius,beamLength,beamRadius);glow.position.z=beamLength*.5;group.add(glow);group.visible=false;battleGroup.add(group);
 const marker={root:a.root,height:a.height+.75},missLabel=addLabel(marker,'MISS!!','outoumanMiss');missLabel.el.style.cssText='position:absolute;transform:translate(-50%,-100%);background:none;border:0;color:#ff293e;font:900 30px Arial,sans-serif;-webkit-text-stroke:1px #fff1ef;text-shadow:0 2px 1px #7d0016;pointer-events:none;';missLabel.el.hidden=true;
 return b.outoumanTrial={beamLength,beamRadius,beamActive:false,beamStartedAt:0,beamUntil:0,nextBeamAt:elapsed+5,beamHits:0,misses:0,rolls:0,hitThisBeam:false,aim:new T.Vector3(0,0,1),origin:new T.Vector3(),group,geometry,materials,missLabel,missUntil:0,roll:null,disposed:false};
}
function disposeOutoumanTrial(b){const q=b?.outoumanTrial;if(!q||q.disposed)return;q.disposed=true;detach(q.group);q.geometry.dispose();q.materials.forEach(m=>m.dispose());removeLabel(q.missLabel);}
function outoumanEvade(b,a){
 const q=outoumanTrialState(b,a);q.misses++;q.rolls++;q.missUntil=elapsed+.95;
 const start=a.root.position.clone(),away=start.clone().sub(S.player).setY(0).normalize(),side=new T.Vector3(away.z,0,-away.x);if(side.lengthSq()<.1)side.set(1,0,0);if(Math.random()<.5)side.negate();let end=start.clone();
 for(const direction of [side,side.clone().negate(),away]){const candidate=start.clone().addScaledVector(direction,3);if(!gymBoundsBlocked(candidate.x,candidate.z,1.2)){end=candidate;break;}}
 q.roll={start,end,at:elapsed,duration:.6};a.root.rotation.y=Math.atan2(end.x-start.x,end.z-start.z);a.play('Roll',true);battleLog('MISS!! 歐頭慢翻滾閃避了靈核球！（30% 機率）');
}
function tickOutoumanTrial(b,a,dt){
 const q=outoumanTrialState(b,a);if(q.disposed)return;
 q.missLabel.el.style.display=elapsed<q.missUntil?'':'none';
 if(q.roll){const t=Math.min(1,(elapsed-q.roll.at)/q.roll.duration),ease=t*t*(3-2*t);a.root.position.lerpVectors(q.roll.start,q.roll.end,ease);if(t>=1){q.roll=null;a.play(q.beamActive?'BeamPose':'Idle');}}
 const startBeam=()=>{q.beamActive=true;q.beamStartedAt=elapsed;q.beamUntil=elapsed+2;q.nextBeamAt+=5;q.hitThisBeam=false;q.aim.copy(S.player).sub(a.root.position).setY(0).normalize();if(q.aim.lengthSq()<.01)q.aim.set(0,0,1);if(!q.roll)a.play('BeamPose');battleLog('彩虹光束！持續 2 秒，立即側移或翻滾閃避。');};
 if(!q.beamActive&&elapsed>=q.nextBeamAt)startBeam();
 if(q.beamActive&&elapsed>=q.beamUntil){q.beamActive=false;q.group.visible=false;if(!q.roll)a.play('Idle');}
 if(q.beamActive){
  // Lock aim for this two-second burst. Sideways movement or rolling can escape the visibly broad beam.
  q.origin.copy(a.root.position).add(new T.Vector3(0,1.35,0));q.origin.addScaledVector(q.aim,.62);q.group.position.copy(q.origin);q.group.rotation.y=Math.atan2(q.aim.x,q.aim.z);q.group.visible=true;if(!q.roll)a.root.rotation.y=q.group.rotation.y;
  for(let i=0;i<7;i++)q.materials[i].opacity=.48+.12*Math.sin(elapsed*23+i*.7);
  const dx=S.player.x-q.origin.x,dz=S.player.z-q.origin.z,along=dx*q.aim.x+dz*q.aim.z,across=Math.abs(dx*q.aim.z-dz*q.aim.x),vertical=Math.abs(1.2-q.origin.y);
  if(!q.hitThisBeam&&!roll&&along>=0&&along<=q.beamLength&&Math.hypot(across,vertical)<=q.beamRadius+.35){q.hitThisBeam=true;q.beamHits++;b.heroStatus.paralyze=elapsed+2;b.heroStatus.stun=elapsed+2;b.heroStatus.throwBlock=elapsed+2;hero.play('Hurt',true);battleLog('被彩虹光束照到了！麻痺 2 秒，期間無法移動或投擲靈核球。');}
 }else if(!q.roll){a.root.rotation.y=Math.atan2(S.player.x-a.root.position.x,S.player.z-a.root.position.z);a.play(elapsed>q.nextBeamAt-.5?'BeamPose':'Idle');}
}

// Light-phoenix trial: each release is a whole-arena hit, independent of distance.
// Pools are allocated once; the native rig owns and clears its own smaller effects.
function phoenixTrialState(b,a){
 if(b.phoenixTrial)return b.phoenixTrial;
 const bounds=b.sceneConfig?.bounds||{minX:-14,maxX:14,minZ:-14,maxZ:14},anchor=new T.Vector3(0,0,0),fieldRadius=Math.max(...[bounds.minX,bounds.maxX].flatMap(x=>[bounds.minZ,bounds.maxZ].map(z=>Math.hypot(x,z))))+.75;
 a.root.position.copy(anchor);a.motionSpeed=0;a.play('Idle');
 const group=new T.Group(),ringGeometry=new T.RingGeometry(.985,1,72),shape=new T.Shape();shape.moveTo(0,-.5);shape.quadraticCurveTo(-.23,.02,0,.5);shape.quadraticCurveTo(.23,.02,0,-.5);
 const featherGeometry=new T.ShapeGeometry(shape),materials=[],waves=[];
 for(let wave=0;wave<3;wave++){
  const ringMaterial=new T.MeshBasicMaterial({color:0xffd65f,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}),featherMaterial=new T.MeshBasicMaterial({color:0xffefb5,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false});materials.push(ringMaterial,featherMaterial);
  const rings=[],feathers=[];
  for(let i=0;i<6;i++){const mesh=new T.Mesh(ringGeometry,ringMaterial);mesh.rotation.x=-Math.PI/2;mesh.position.y=.10+wave*.018;mesh.visible=false;group.add(mesh);rings.push(mesh);}
  // Eighteen feather markers per release cover all six columns and three rows.
  for(let i=0;i<18;i++){const mesh=new T.Mesh(featherGeometry,featherMaterial),column=i%6,row=Math.floor(i/6);mesh.position.set(bounds.minX+(column+.5)/6*(bounds.maxX-bounds.minX),4,bounds.minZ+(row+.5)/3*(bounds.maxZ-bounds.minZ));mesh.rotation.set(-.30,0,(i%2?1:-1)*.5);mesh.visible=false;group.add(mesh);feathers.push(mesh);}
  waves.push({rings,feathers,ringMaterial,featherMaterial});
 }
 const borderMaterial=new T.MeshBasicMaterial({color:0xffc85c,transparent:true,opacity:.15,side:T.DoubleSide,depthWrite:false}),border=new T.Mesh(ringGeometry,borderMaterial);materials.push(borderMaterial);border.rotation.x=-Math.PI/2;border.position.y=.085;border.scale.setScalar(fieldRadius);group.add(border);
 const hitMaterial=new T.MeshBasicMaterial({color:0xffbe65,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}),hitMarker=new T.Mesh(ringGeometry,hitMaterial);materials.push(hitMaterial);hitMarker.rotation.x=-Math.PI/2;hitMarker.visible=false;group.add(hitMarker);battleGroup.add(group);
 // Anchor the surprise icon to the animated head, not the enlarged wings' overall bounds.
 const headAnchor=a.object.getObjectByName('Head');
 const marker={root:headAnchor||a.root,height:headAnchor?.64:a.height*.48},surpriseLabel=addLabel(marker,'','phoenixSurprise');surpriseLabel.el.style.cssText='position:absolute;transform:translate(-50%,-100%);display:none;width:76px;height:76px;background:none;border:0;box-shadow:none;padding:0;pointer-events:none;';
 const image=document.createElement('img');image.src='assets/encounter/surprise.webp';image.alt='光鳳鷹受到驚嚇，破綻中';image.style.cssText='width:100%;height:100%;object-fit:contain;';surpriseLabel.el.append(image);
 return b.phoenixTrial={phase:'intro',activeAt:elapsed,introUntil:elapsed+6,nextAttack:'WingBurst',attack:null,attackStartedAt:0,attackUntil:0,attackSerial:0,impactTimes:[],impactCursor:0,impacts:[],interrupts:0,interruptHistory:[],vulnerableUntil:0,invulnerableHits:0,successfulHits:0,attackHistory:[],anchor,fieldRadius,lastRollAt:-Infinity,lastImpactAt:-Infinity,hitFlashUntil:0,nextAttackAt:elapsed+6,group,ringGeometry,featherGeometry,materials,waves,border,borderMaterial,hitMarker,hitMaterial,surpriseLabel,disposed:false};
}
function phoenixCanHit(b){const q=b?.phoenixTrial;return !!q&&!q.disposed&&!b.ending&&q.phase==='vulnerable'&&elapsed<q.vulnerableUntil;}
function clearPhoenixTrialFx(q){for(const w of q.waves){w.rings.forEach(m=>m.visible=false);w.feathers.forEach(m=>m.visible=false);}q.hitMarker.visible=false;q.hitFlashUntil=0;}
function interruptPhoenixTrial(b,impact,rollAt){
 const q=b.phoenixTrial,a=b.enemies[0]?.actor;if(!q||q.disposed||q.phase!=='attack'||b.ending||!a)return false;
 // Only an actual processed release can grant a vulnerability window.
 if(impact.attackSerial!==q.attackSerial||rollAt<impact.at-.16||rollAt>impact.at+.22)return false;
 impact.interrupted=true;impact.rollAt=rollAt;q.interrupts++;q.interruptHistory.push({at:elapsed,impactAt:impact.at,rollAt,delta:rollAt-impact.at,attack:q.attack,attackSerial:q.attackSerial});if(q.interruptHistory.length>32)q.interruptHistory.shift();
 const history=q.attackHistory[q.attackHistory.length-1];if(history){history.interruptedAt=elapsed;history.endedAt=elapsed;}
 q.phase='vulnerable';q.vulnerableUntil=elapsed+3;q.nextAttackAt=q.vulnerableUntil;q.lastRollAt=-Infinity;a.play('Idle');a.controller.update(.25);a.nativePaused=true;a.motionSpeed=0;clearPhoenixTrialFx(q);q.surpriseLabel.el.style.display='';
 if(b.heroLabel)b.heroLabel.el.style.filter='';battleLog('旁白：完美翻滾！光鳳鷹的攻擊已打斷，快在 3 秒破綻內投球！');return true;
}
function phoenixRollPressed(b,at){
 const q=b.phoenixTrial;if(!q||q.disposed||q.phase!=='attack'||b.ending)return;
 q.lastRollAt=at;
 // Post-hit grace never stuns the player, so this successful roll can still interrupt.
 for(let i=q.impacts.length-1;i>=0;i--){const impact=q.impacts[i];if(impact.attackSerial!==q.attackSerial||at-impact.at>.22)break;if(interruptPhoenixTrial(b,impact,at))break;}
}
function startPhoenixAttack(b,a,q){
 a.nativePaused=false;q.phase='attack';q.attack=q.nextAttack;q.nextAttack=q.attack==='WingBurst'?'FeatherVolley':'WingBurst';q.attackSerial++;q.attackStartedAt=elapsed;q.attackUntil=elapsed+(q.attack==='WingBurst'?2.4:2.7);q.impactTimes=(q.attack==='WingBurst'?[.90,1.06,1.22]:[.75,1.25,1.75]).map(t=>elapsed+t);q.impactCursor=0;q.lastRollAt=-Infinity;clearPhoenixTrialFx(q);a.play(q.attack,true);
 q.attackHistory.push({attack:q.attack,attackSerial:q.attackSerial,startedAt:elapsed,impactTimes:q.impactTimes.slice()});if(q.attackHistory.length>32)q.attackHistory.shift();battleLog('旁白：'+(q.attack==='WingBurst'?'振翼光波 · 三重光環':'羽芒齊射 · 三波羽芒')+'覆蓋全場！請抓準命中時機翻滾打斷。');
}
function tickPhoenixTrial(b,a,dt){
 const q=phoenixTrialState(b,a);if(q.disposed||b.ending)return;a.root.position.copy(q.anchor);if(q.phase!=='vulnerable')a.root.rotation.y=Math.atan2(S.player.x-q.anchor.x,S.player.z-q.anchor.z);a.motionSpeed=0;
 if(q.phase==='intro'&&elapsed>=q.introUntil)startPhoenixAttack(b,a,q);
 else if(q.phase==='vulnerable'&&elapsed>=q.vulnerableUntil){q.vulnerableUntil=0;q.surpriseLabel.el.style.display='none';startPhoenixAttack(b,a,q);}
 else if(q.phase==='interval'&&elapsed>=q.nextAttackAt)startPhoenixAttack(b,a,q);
 if(q.phase==='attack'){
  while(q.impactCursor<q.impactTimes.length&&elapsed>=q.impactTimes[q.impactCursor]){
   const index=q.impactCursor++,at=q.impactTimes[index],impact={attack:q.attack,attackSerial:q.attackSerial,index,at,processedAt:elapsed,allField:true,interrupted:false,rollAt:null};q.impacts.push(impact);if(q.impacts.length>48)q.impacts.shift();q.lastImpactAt=at;
   if(interruptPhoenixTrial(b,impact,q.lastRollAt))break;
   q.hitFlashUntil=elapsed+.18;combatSound('fairy',false);if(!roll)hero.play('Hurt',true);battleLog('旁白：全場'+(q.attack==='WingBurst'?'光波':'羽芒')+'第 '+(index+1)+' 波命中！立即翻滾可打斷並開啟 3 秒破綻。');
  }
  if(q.phase==='attack'&&elapsed>=q.attackUntil){const history=q.attackHistory[q.attackHistory.length-1];if(history)history.endedAt=elapsed;q.phase='interval';q.nextAttackAt=elapsed+.85;a.play('Idle');clearPhoenixTrialFx(q);battleLog('旁白：光鳳鷹重新蓄光，仍然無敵；下一招'+(q.nextAttack==='WingBurst'?'振翼光波':'羽芒齊射')+'即將開始。');}
 }
 q.surpriseLabel.el.style.display=q.phase==='vulnerable'?'':'none';q.borderMaterial.opacity=q.phase==='attack'?.18+.10*Math.sin(elapsed*5):.12;
 if(q.phase==='attack')for(let i=0;i<q.waves.length;i++){
  const w=q.waves[i],age=elapsed-q.impactTimes[i],active=age>=-.34&&age<.48;
  for(let j=0;j<w.rings.length;j++){const mesh=w.rings[j];mesh.visible=active;if(active)mesh.scale.setScalar(q.fieldRadius*(j+1)/6*(age<0?.92+.08*(1+age/.34):1+age*.08));}
  w.ringMaterial.opacity=active?(age<0?.14+.2*(1+age/.34):.55*(1-age/.48)):0;
  for(let j=0;j<w.feathers.length;j++){const mesh=w.feathers[j];mesh.visible=active&&q.attack==='FeatherVolley';if(mesh.visible){mesh.position.y=age<0?.18+(-age/.34)*4:.18+age*.45;mesh.rotation.z=(j%2?1:-1)*(.5+age*.5);}}
  w.featherMaterial.opacity=active?(age<0?.58:.8*(1-age/.48)):0;
 }
 const flash=Math.max(0,(q.hitFlashUntil-elapsed)/.18);q.hitMarker.visible=flash>0;if(flash>0){q.hitMarker.position.set(S.player.x,.12,S.player.z);q.hitMarker.scale.setScalar(.65+(1-flash)*.8);q.hitMaterial.opacity=flash*.8;}if(b.heroLabel)b.heroLabel.el.style.filter=flash>0?'drop-shadow(0 0 8px #ffcb67)':'';

}
function disposePhoenixTrial(b){const q=b?.phoenixTrial;if(!q||q.disposed)return;q.disposed=true;clearPhoenixTrialFx(q);b.enemies[0]?.actor?.play('Idle');detach(q.group);q.ringGeometry.dispose();q.featherGeometry.dispose();q.materials.forEach(m=>m.dispose());removeLabel(q.surpriseLabel);if(b.heroLabel)b.heroLabel.el.style.filter='';}

function moveGymGuardian(dt){
 const b=battle;if(!b?.gym||b.busy||b.ending)return;
 if(b.gym.spirit==='blissey'){const a=b.enemies[0]?.actor;if(a)tickPhoenixTrial(b,a,dt);return;}if(b.gym.spirit==='wigglytuff'){const a=b.enemies[0]?.actor;if(a)tickXiaoshanTrial(b,a,dt);return;}if(b.gym.spirit==='pikachu'){const a=b.enemies[0]?.actor;if(a)tickOutoumanTrial(b,a,dt);return;}if(b.throwing)return;
 const foe=b.enemies[0]?.actor;if(!foe)return;if(b.gym.spirit==='mew'){tickRiceTrial(b,foe,dt);return;}
 if(!b.evadeAI)b.evadeAI={next:elapsed+.4,goal:foe.root.position.clone(),dir:1};
 const ai=b.evadeAI,position=foe.root.position,delta=position.clone().sub(S.player);delta.y=0;
 const dist=delta.length();
 if(elapsed>=ai.next){
  const angle=Math.random()*Math.PI*2,escape=dist<8&&Math.random()<.8;
  const direction=escape?Math.atan2(delta.x,delta.z)+(Math.random()-.5)*1.5:angle;
  const step=escape?4.5+Math.random()*3.0:2.5+Math.random()*4;
  const x=position.x+Math.sin(direction)*step,z=position.z+Math.cos(direction)*step;
  if(!gymBoundsBlocked(x,z,1.5)){ai.goal.set(x,0,z);}
  else ai.goal.set(Math.max(-11,Math.min(11,position.x-Math.sin(direction)*step)),0,Math.max(-11,Math.min(11,position.z-Math.cos(direction)*step)));
  ai.next=elapsed+.55+Math.random()*.6;
 }
 const move=ai.goal.clone().sub(position);move.y=0;ai.moving=false;
 if(move.length()>.25){move.normalize();const speed=7.4;
  const nx=position.x+move.x*speed*dt,nz=position.z+move.z*speed*dt;
  if(!gymBoundsBlocked(nx,nz,1.2)){
   position.x=nx;position.z=nz;ai.moving=true;foe.root.rotation.y=Math.atan2(-move.x,-move.z);foe.play('Run');
  }else ai.next=0;
 }else foe.play('Idle');
}
async function throwGymBall(){const b=battle;if(b?.heroStatus.throwBlock>elapsed)return battleLog('投擲受阻，稍候或繼續移動閃避。');if(!b?.gym||b.busy||b.throwing||roll||b.heroStatus.freeze>elapsed||b.heroStatus.stun>elapsed)return;const key=ballType==='great'?'greatBallCount':ballType==='master'?'masterBallCount':'pokeballs';if(S.state[key]<1)return toast('靈核球不足，請換球或先領取補給。');b.throwing=true;S.state[key]--;save();const e=b.enemies[0];holdHeroBall(ballType);playHeroThrow();hero.root.rotation.y=Math.atan2(e.actor.root.position.x-S.player.x,e.actor.root.position.z-S.player.z);try{await delay(heroThrowRelease());if(battle!==b)return;const path=world.props[ballType==='great'?'great_core':ballType==='master'?'master_core':'core'],g=await asset(path),o=cloneSkin(g.scene),box=new T.Box3().setFromObject(o);o.scale.setScalar(.35/Math.max(...box.getSize(new T.Vector3()).toArray()));battleGroup.add(o);attachBallOutline(o);const from=heroBallOrigin(),to=e.actor.root.position.clone().add(new T.Vector3(0,1.5,0));await new Promise(resolve=>addEffect({object:o,start:elapsed,duration:.36,update:t=>{o.position.lerpVectors(from,to,t);o.position.y+=Math.sin(t*Math.PI)*1.5;o.rotation.y+=.3;},done:resolve}));if(battle!==b)return;if(b.heroStatus.throwBlock>elapsed){battleLog(b.gym.spirit==='pikachu'?'彩虹光束麻痺中，暫時無法投擲靈核球！':'紫色光波干擾中，靈核球無法命中小飯團！');return;}if(b.gym.spirit==='pikachu'&&Math.random()<.30){outoumanEvade(b,e.actor);return;}combatFx(to,to,e.s.element,false,.35);// Immunity is evaluated at impact, including master balls and shots thrown before a phase change.
 if(b.gym.spirit==='wigglytuff'&&!xiaoshanCanHit(b)){b.xiaoshanTrial.blockedHits++;battleLog('小山目前無敵！落地後驚恐的 3 秒內命中才有效。');return;}if(b.gym.spirit==='wigglytuff')b.xiaoshanTrial.successfulHits++;if(b.gym.spirit==='blissey'){const q=phoenixTrialState(b,e.actor);if(!phoenixCanHit(b)){q.invulnerableHits++;battleLog('光鳳鷹目前無敵！在攻擊命中時按翻滾，打斷後的 3 秒內投球才有效。');return;}q.successfulHits++;}
 // Mobile moving target has a 20% evasive reaction at ball impact.
 if(!['pikachu','mew','wigglytuff','blissey'].includes(b.gym.spirit)&&(b.evadeAI?.moving||b.evadeAI?.goal?.distanceTo(e.actor.root.position)>.25)&&Math.random()<.20){e.actor.play('Run',true);const offset=new T.Vector3((Math.random()<.5?-1:1)*2.8,0,(Math.random()-.5)*2);
  const candidate=e.actor.root.position.clone().add(offset);
  if(!gymBoundsBlocked(candidate.x,candidate.z,1.2))e.actor.root.position.copy(candidate);
  combatFx(to,to,e.s.element,false,.25);battleLog(e.s.name+'快速閃避了締約！成功迴避（20% 機率）');
  return;
 }
 const damage=Math.round((ballType==='master'?60:ballType==='great'?30:S.state.costume==='electric'?24:18)*heroAttackBoost()*(b.heroStatus.attackUp>elapsed?1.5:1)*(e.status.defDown?1.4:1));e.hp=Math.max(0,e.hp-damage);if(!['pikachu','wigglytuff','blissey'].includes(b.gym.spirit))e.actor.play('Wave',true);updateHp(e);battleLog('靈核球共鳴 · 信任 +'+damage+(b.gym.spirit==='blissey'?'，把握打斷後的 3 秒破綻！':b.gym.spirit==='wigglytuff'?'，把握驚恐的 3 秒！':b.gym.spirit==='mew'?'，留意卡住後的連續紫波！':'，留意下一次警示光圈！'));if(e.hp<=0)await endBattle(true);}catch(error){S.state[key]++;save();S.errors.push(error.message);}finally{b.throwing=false;hero.play('Idle');}}
function tickGym(dt){const b=battle;if(!b?.gym||b.busy)return;moveGymGuardian(dt);const e=b.enemies[0],a=e.actor;if(!a)return;if(b.defDownUntil&&elapsed>b.defDownUntil){delete e.status.defDown;b.defDownUntil=0;updateHp(e);}for(const k of Object.keys(b.heroStatus))if(b.heroStatus[k]<=elapsed)delete b.heroStatus[k];const statusNames={stun:'短暫暈眩',paralyze:'彩虹麻痺・無法投球',slow:'紫波減速',throwBlock:'投擲受阻',attackUp:'勇氣加攻'};if(b.heroLabel)b.heroLabel.el.innerHTML='<b>旅人 · 閃避試煉</b><small>'+Object.keys(b.heroStatus).map(k=>statusNames[k]||k).join(' · ')+'</small>';if(['pikachu','mew','wigglytuff','blissey'].includes(b.gym.spirit))return;if(b.warning){const w=b.warning;if(elapsed>=w.time){b.warning=null;const distance=Math.hypot(S.player.x-w.center.x,S.player.z-w.center.z);a.play('Attack',true);combatFx(a.root.position.clone().add(new T.Vector3(0,1.6,0)),w.center.clone().add(new T.Vector3(0,1,0)),e.s.element,true,.7);if(distance<w.radius&&!roll){for(const [key,duration]of Object.entries(w.statuses))b.heroStatus[key]=elapsed+duration;let away=S.player.clone().sub(a.root.position);away.y=0;if(away.length()<.01)away.set(0,0,1);away.normalize();const pushed=S.player.clone().addScaledVector(away,w.push);if(!gymBoundsBlocked(pushed.x,pushed.z)){S.player.copy(pushed);hero.root.position.copy(S.player);}hero.play('Hurt',true);battleLog(w.name+'：被推離，'+Object.keys(w.statuses).map(k=>statusNames[k]).join('、')+'；效果很快解除。');}else battleLog('成功閃避 '+w.name+'！');updateHp(e);}}else if(elapsed>b.nextAttack){const defs={mew:{name:'紫波連環',radius:2.5,statuses:{slow:2,throwBlock:1.5},push:2.6,gap:3.8},wigglytuff:{name:'小山震地驚跳',radius:2.8,statuses:{stun:.65,throwBlock:1.4},push:3,gap:4.1}},d=defs[b.gym.spirit];b.nextAttack=elapsed+d.gap;b.warning={...d,center:S.player.clone(),time:elapsed+1.1};combatRing(b.warning.center,d.radius,e.s.element,1.1);battleLog(d.name+' · 1.1秒後光圈生效，移動或翻滾閃避！');}a.root.rotation.y=Math.atan2(S.player.x-a.root.position.x,S.player.z-a.root.position.z);}

let arenaResultTimer=null;
function arenaResultOverlay(){
 let root=document.getElementById('arenaResultOverlay');
 if(root)return root;
 root=document.createElement('section');
 root.id='arenaResultOverlay';
 root.hidden=true;
 root.setAttribute('role','dialog');
 root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label','幻靈競技擂台戰鬥結果');
 root.innerHTML='<div class="arenaResultTitle"></div><div class="arenaResultChoices"><button type="button" data-arena-choice="continue">接續戰鬥</button><button type="button" data-arena-choice="exit">退出戰鬥</button></div>';
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-arena-choice]');
  if(!button||!root.classList.contains('choicesReady'))return;
  resolveArenaResult(button.dataset.arenaChoice==='continue');
 });
 document.body.append(root);
 return root;
}
function showArenaResult(won){
 const root=arenaResultOverlay();
 clearTimeout(arenaResultTimer);
 const resultWord=won?'獲勝':'失敗';
 const title=root.querySelector('.arenaResultTitle');title.replaceChildren(...Array.from(resultWord,(c,i)=>{const span=document.createElement('span');span.className='arenaResultGlyph';span.textContent=c;span.style.setProperty('--glyph-order',i);span.setAttribute('aria-hidden','true');return span;}));title.setAttribute('aria-label',resultWord);
 root.dataset.result=won?'win':'lose';
 root.hidden=false;
 root.classList.remove('shown','choicesReady');
 const buttons=root.querySelectorAll('button');root.querySelector('[data-arena-choice="continue"]').textContent=battle?.bookRoom?'返回書櫃':battle?.kind==='fishing'?'接續釣魚挑戰':'接續戰鬥';
 buttons.forEach(b=>b.disabled=true);
 void root.offsetWidth;
 requestAnimationFrame(()=>root.classList.add('shown'));
 arenaResultTimer=setTimeout(()=>{
  if(!root.hidden&&battle?.ending){root.classList.add('choicesReady');buttons.forEach(b=>b.disabled=false);}
 },2300);
}
async function resolveArenaResult(continueBattle){
 const b=battle;if(!b||b.gym||!b.ending||b.resultResolving)return;
 b.resultResolving=true;
 clearTimeout(arenaResultTimer);
 const root=document.getElementById('arenaResultOverlay');
 if(root){root.hidden=true;root.classList.remove('shown','choicesReady');}
 const won=b.resultWon;
 if(continueBattle&&!b.bookRoom){const nextKind=b.kind==='fishing'?'fishing':'arena';const carry=await endBattle(won,true,true);try{await startBattle(nextKind,carry);}finally{arenaCarry=null;}return;}
 await endBattle(won,true);
}

let arenaDiscoveryBusy=false;
const discoverySpecial=s=>!s||s.category==='tower'||s.acquisition==='tower'||BOSS_CARD_IDS.includes(s.id)||isChest(s)||isBook(s)||isOneTimeSpecial(s.id)||isGymGuardian(s)||WATER_EVENT_ONLY.includes(s.id)||s.id==='jigglypuff'||s.role==='legendary'||s.rarity==='傳說';
function recordArenaDiscovery(b,won){if(!won||b.kind!=='arena'||b.gym||b.bookRoom)return;const id=b.discoveryId||=(crypto.randomUUID());const next=JSON.parse(JSON.stringify(S.state));const reward=PhantomTownRewards.queueVictory(next,id,{spirits,isSpecial:discoverySpecial,eligible,complete:dexComplete()});if((S.state.arenaRewardIds||[]).includes(id))return;townWriter.save(next);townWriter.adopt(S.state,next);if(!reward)toast('一般幻靈已收錄，特殊幻靈仍依原途徑出現；全圖鑑後每勝可得100點。');}
async function deliverArenaDiscoveries(){
 if(arenaDiscoveryBusy||place||battle||modal||dialog)return;arenaDiscoveryBusy=true;
 try{while(S.state.arenaRewardQueue?.length){const reward=S.state.arenaRewardQueue[0];let fresh=null,old=null;if(reward.kind==='spirit'&&owned(reward.speciesId)){const draft={...S.state,arenaRewardIds:[],arenaRewardQueue:S.state.arenaRewardQueue.slice(1)};const revised=PhantomTownRewards.queueVictory(draft,reward.id,{spirits,isSpecial:discoverySpecial,eligible,complete:dexComplete()});const next={...S.state,arenaRewardQueue:revised?[revised,...S.state.arenaRewardQueue.slice(1)]:S.state.arenaRewardQueue.slice(1)};townWriter.save(next);townWriter.adopt(S.state,next);continue;}
   if(reward.kind==='points'){const result=PhantomCaveBridge.reward('arena-win:'+reward.id,100);townWriter.adopt(S.state,result.state);}
   else{const spec=byId[reward.speciesId];if(!spec||discoverySpecial(spec))throw Error('擂台獎勵幻靈資格已變更');const replaceable=wild.filter(a=>!a.capturing&&!a.specialEventId&&!a.riverSwim&&!discoverySpecial(a.species)&&a!==target);old=replaceable.find(a=>owned(a.species.id))||replaceable[0];if(wild.length&&!old)break;fresh=await spawnWild(spec,old?old.root.position.clone():randomPoint());if(!fresh)break;fresh.arenaDiscovery=true;}
   const next={...S.state,arenaRewardQueue:S.state.arenaRewardQueue.slice(1)};
   try{townWriter.save(next);townWriter.adopt(S.state,next);}catch(error){if(fresh){wild.splice(wild.indexOf(fresh),1);removeActor(fresh);}throw error;}
   if(old){wild.splice(wild.indexOf(old),1);removeActor(old);}if(fresh)showWorldBroadcast('擂台獲勝｜未收錄的「'+fresh.species.name+'」已替換場景中的一隻幻靈，請尋找並締約！');else toast('全圖鑑擂台獎勵：無盡洞穴轉蛋點數 +100');
 }}catch(error){S.errors.push('擂台獎勵：'+error.message);toast('擂台獎勵已保留，稍後返回場景再發放。');}finally{arenaDiscoveryBusy=false;}
}

function recordArenaParticipation(b,abort=false){
 if(b.kind!=='arena'||b.ending)return;
 SpiritReplacementRules.arenaProgress(S.state,b,abort);
  if(!abort)window.PhantomJourneyGuide?.onArenaFinished?.();
 for(const [id,key] of Object.entries(ARENA_EVOLVERS)){
  if(id==='giratina')continue;
  const tookPart=!abort&&b.allies.some(a=>a.s.id===id);
  S.state[key]=tookPart?Math.min(3,number(S.state[key])+1):0;
 }
 S.state.frogArenaPending=false;
 save();
}
async function endBattle(won,abort=false,keep=false){arenaFeedback.clear();battleAudio.stop();const b=battle;if(!b||(b.ending&&!abort)||b.fishingPrizeSettled)return;if(b.kind==='fishing'&&won&&!b.caveWinRecorded){b.caveWinRecorded=true;save();caveEvent('fishing-win','fishing:'+b.caveBattleId);}const fishingWins=b.kind==='fishing'?Math.max(0,Math.floor(Number(b.fishingWins)||0))+(won?1:0):0;recordArenaParticipation(b,abort);try{recordArenaDiscovery(b,won);}catch(error){S.errors.push('擂台獎勵存檔：'+error.message);toast('獎勵尚未存入，請保留本頁並重試結算。');}if(abort){clearTimeout(arenaResultTimer);const overlay=document.getElementById('arenaResultOverlay');if(overlay){overlay.hidden=true;overlay.classList.remove('shown','choicesReady');}}if(!b.gym&&!abort){b.ending=true;b.busy=true;b.resultWon=!!won;$('battleActions').innerHTML='';$('battleLog').textContent='';showArenaResult(won);return;}b.ending=true;b.busy=true;disposeXiaoshanTrial(b);disposeOutoumanTrial(b);disposePhoenixTrial(b);stopAppearanceBgm();if(won){S.state.wins++;S.state.pokeballs+=8;S.state.greatBallCount+=2;if(b.gym){S.state.gyms[b.gym.id]={...S.state.gyms[b.gym.id],cleared:true};if(!S.state.unlockedCostumes.includes(b.gym.costume))S.state.unlockedCostumes.push(b.gym.costume);enqueueGuardianAppearance(b.gym);window.PhantomJourneyGuide?.onGymCleared?.(b.gym.id);}save();if(b.gym)await showGymVictory();}disposeRiceTrial(b);b.arena?.userData.dispose?.();if(!b.gym&&!b.arena?.userData.dispose)b.arena?.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])m?.dispose();});b.actors.forEach(removeActor);if(b.heroLabel)removeLabel(b.heroLabel);if(keep){const carry={previous:b.previous,won:!!won||!!b.carryWon,fishingWins};arenaCarry=carry;battle=null;return carry;}(place?insideGroup:townGroup).add(hero.root);battleGroup.clear();battleGroup.visible=false;document.body.classList.remove('battle-active','gym-active','gym-player-narration');$('battleLog').hidden=false;$('battleLog').style.removeProperty('top');$('battleLog').style.removeProperty('left');scene.background=b.previous.background;scene.fog=b.previous.fog;battle=null;hero.root.visible=true;S.player.copy(b.previous.position);hero.root.position.copy(S.player);townGroup.visible=!place;insideGroup.visible=!!place;$('controls').hidden=false;$('battleHud').hidden=true;setCostume(S.state.costume);if(!abort)toast(won?'挑戰獲勝！靈核球 +8、高階球 +2。':'已安全返回探索，補給後再來挑戰吧！');if(won&&b.gym)await ensureSpecialAppearances();if(b.bookRoom&&won&&!bookEncounter){const speciesId=['weedle','kakuna','beedrill'][Math.floor(Math.random()*3)];bookEncounter={roomId:b.bookRoom.id,speciesId,position:bookRewardPoint(b.bookRoom),actor:null};await ensureBookActor();toast('書櫃挑戰獲勝！一本書本幻靈出現在'+b.bookRoom.name+'，可鎖定締約。');}if(S.caveMissionNotice){const task=S.caveMissionNotice;S.caveMissionNotice=null;window.PhantomJourneyGuide?.showTask?.(task);}if(b.kind==='fishing'&&fishingWins>0){b.fishingPrizeSettled=true;await spawnRiverGoldfish(fishingWins);}if((won||b.carryWon)&&b.kind==='arena')await deliverArenaDiscoveries();if((won||b.carryWon)&&!b.gym&&!b.bookRoom&&b.kind!=='fishing')for(const id of ['jigglypuff'])if(byId[id]&&!wild.some(w=>w.species.id===id)){while(outdoorWildCount()>=WILD_LIMIT){const old=wild.find(w=>!w.specialEventId&&!w.riverSwim&&w!==target)||wild.find(w=>!w.specialEventId&&!w.riverSwim);if(!old)break;wild.splice(wild.indexOf(old),1);if(old===target)clearTarget();removeActor(old);}await spawnWild(byId[id],randomPoint());}}

// Supplied native families: feet and flight body share the same collision-safe anchor.
// All source motions recur; no teleport in world Y when switching to a flying pose.
function tickNativeFamily(a,dt,speed){
 if(!NativeFamilies.has(a.path)&&!isRobot(a.path)&&!isAvian(a.path))return false;
 const state=a.nativeActivity||={phase:'walk',remaining:4+Math.random()*3,cycle:0};
 state.remaining-=dt;
 if(state.remaining<=0){const order=isRobot(a.path)&&RobotSpirits.stage(a.path)===1?['walk','stand']:['walk','takeoff','fly','landing','sit','stand'];state.phase=order[(order.indexOf(state.phase)+1)%order.length];state.remaining=({walk:6,takeoff:2,fly:7,landing:1.5,sit:4,stand:3})[state.phase];state.cycle++;}
 let moving=false;
 if(state.phase==='walk'||state.phase==='fly'){
  a.timer-=dt;if(a.timer<=0){a.timer=2+Math.random()*3;const theta=Math.random()*Math.PI*2,r=1+Math.random()*3;a.goal.set(a.home.x+Math.cos(theta)*r,0,a.home.z+Math.sin(theta)*r);}
  const d=a.goal.clone().sub(a.root.position);d.y=0;
  if(d.length()>.15){d.normalize();const stride=dt*speed*(state.phase==='fly'?1.35:1),x=a.root.position.x+d.x*stride,z=a.root.position.z+d.z*stride;
   if(!blocked(x,z,.55)){a.root.position.x=x;a.root.position.z=z;a.root.rotation.y=Math.atan2(d.x,d.z);moving=true;}else a.timer=0;
  }
 }
 const motion=({walk:moving?'Walk':'Idle',takeoff:'Takeoff',fly:'Fly',landing:isAvian(a.path)?'Land':'Landing',sit:isAvian(a.path)?'Rest':'Sit',stand:'Idle'})[state.phase];
 if(a.mode!==motion)a.play(motion,motion==='Landing');
 updateNativeFlightLayer(a,dt,state.phase);
 return true;
}

// Wild light phoenix: frequent safe landings make capture possible, with taller flight
// and clearance-aware waypoint selection to avoid trees, buildings and map edges.
// The native rig handles Y during Takeoff/Fly/Land; never jump the world root vertically.
function walkPhoenix(a,dt,speed){
 const q=a.phoenixWander||={phase:'walk',remaining:7+Math.random()*2,cycles:0};q.remaining-=dt;
 if(q.remaining<=0){
  const order=['walk','takeoff','fly','land','rest'];
  q.phase=order[(order.indexOf(q.phase)+1)%order.length];
  q.remaining=q.phase==='walk'?7+Math.random()*2:q.phase==='fly'?3+Math.random():q.phase==='rest'?3+Math.random():2.1;
  q.cycles++;a.timer=0;
  if(q.phase==='takeoff')a.flightProfile=null; // one new cruising level per flight
 }
 let moving=false;
 if(q.phase==='walk'||q.phase==='fly'){
  const clearance=q.phase==='fly'?1.8:.8;
  a.timer-=dt;
  if(a.timer<=0){
   a.timer=1.5+Math.random()*2;
   for(let attempt=0;attempt<10;attempt++){
    const angle=Math.random()*Math.PI*2,radius=1+Math.random()*3.5;
    const x=a.home.x+Math.sin(angle)*radius,z=a.home.z+Math.cos(angle)*radius;
    if(!blocked(x,z,clearance)){a.goal.set(x,0,z);break;}
    if(attempt===9)a.goal.set(a.root.position.x,0,a.root.position.z);
   }
  }
  const dx=a.goal.x-a.root.position.x,dz=a.goal.z-a.root.position.z,distance=Math.hypot(dx,dz),stride=Math.min(distance,dt*speed*(q.phase==='fly'?1.55:1));
  if(distance>.15){
   const x=a.root.position.x+dx/distance*stride,z=a.root.position.z+dz/distance*stride;
   if(!blocked(x,z,clearance)){a.root.position.x=x;a.root.position.z=z;a.root.rotation.y=Math.atan2(dx,dz);moving=true;}
   else{a.timer=0;a.goal.set(a.root.position.x,0,a.root.position.z);}
  }
 }
 a.motionSpeed=q.phase==='fly'?Math.max(.6,speed*1.55):moving?speed:0;
 const mode=({walk:moving?'Walk':'Idle',takeoff:'Takeoff',fly:'Fly',land:'Land',rest:'Idle'})[q.phase];
 if(a.mode!==mode)a.play(mode);
 // No fixed 4.6-unit rail: larger birds naturally cruise higher, with
 // individual height bands and gentle changes over the course of a flight.
 if(q.phase==='fly'||q.phase==='takeoff')a.controller?.setFlightHeight?.(Math.min(5.95,Math.max(3.5,wildFlightTarget(a,4))));
 // A previously locked bird must not remain a valid target once it takes off.
 if(target===a&&!a.capturing&&!phoenixWildGrounded(a))clearTarget();
 return true;
}

// The game owns navigation; each riceball owns only its connected local roll/face/wave rig.
function walkRiceball(a,dt,speed){
 a.timer-=dt;const q=a.riceWander||(a.riceWander={stuckUntil:0,nextStuck:elapsed+6+Math.random()*4});
 if(elapsed<q.stuckUntil){a.motionSpeed=0;a.play('Stuck');return;}
 if(elapsed>=q.nextStuck){q.stuckUntil=elapsed+1.6;q.nextStuck=elapsed+9+Math.random()*5;return;}
 if(a.timer<0){a.timer=3+Math.random()*4;const t=Math.random()*Math.PI*2,r=Math.random()*4;a.goal.set(a.home.x+Math.cos(t)*r,0,a.home.z+Math.sin(t)*r);}
 const d=a.goal.clone().sub(a.root.position).setY(0),dist=d.length();
 if(dist>.15){d.normalize();const step=Math.min(dist,speed*dt),nx=a.root.position.x+d.x*step,nz=a.root.position.z+d.z*step;
  if(!blocked(nx,nz,.3)){a.root.position.set(nx,0,nz);a.root.rotation.y=Math.atan2(-d.z,d.x);a.motionSpeed=speed;a.play('Walk');}
  else{a.timer=0;q.stuckUntil=elapsed+1.6;a.motionSpeed=0;a.play('Stuck');}
 }else{a.motionSpeed=0;a.play('Idle');}
}
function walkActor(a,dt,speed=.6){if(a.capturing)return;if(a.pondJump)return hopPondFrog(a,dt);if(a.pondSwim)return swimPond(a,dt,speed);if(a.species?.stationary){a.play('Idle');return;}if(a.riverSwim)return swimRiver(a,dt);if(isLightPhoenix(a.path))return walkPhoenix(a,dt,speed);if(isRiceball(a.path))return walkRiceball(a,dt,speed);if(tickNativeFamily(a,dt,speed))return;updateFlight(a,dt);a.timer-=dt;if(a.timer<0){a.timer=3+Math.random()*4;const theta=Math.random()*Math.PI*2,r=Math.random()*(a.data?1.4:4);a.goal.set(a.home.x+Math.cos(theta)*r,0,a.home.z+Math.sin(theta)*r);}const d=a.goal.clone().sub(a.root.position);d.y=0;let moving=false;if(d.length()>.15){d.normalize();const gait=isReplacement(a.path)?ReplacementSpirits.worldMoveFactor(a.path,a.controller?.getMotionState?.()):1,nx=a.root.position.x+d.x*speed*dt*gait,nz=a.root.position.z+d.z*speed*dt*gait;if(!blocked(nx,nz,.3)){a.root.position.x=nx;a.root.position.z=nz;a.root.rotation.y=Math.atan2(d.x,d.z);moving=true;}else a.timer=0;}const hasFly=Object.keys(a.actions).some(k=>k.toLowerCase()==='fly'),flying=a.airborne&&(a.flightState==='air'||a.root.position.y>.15);a.play(flying?(hasFly?'Fly':'Walk'):moving?'Walk':isXiaoshan(a.path)?'Sleep':'Idle');}
function beginRoll(){if(riding()){S.state.mountActive=null;overworldMount?.setMount(null);mountSelection=null;save();}if(!hero||roll||modal||dialog||battle&&!battle.gym||throwing||battle?.heroStatus?.freeze>elapsed||battle?.heroStatus?.stun>elapsed)return;cancelNavigation();let x=S.stick.x+(S.keys.KeyD||S.keys.ArrowRight?1:0)-(S.keys.KeyA||S.keys.ArrowLeft?1:0),z=S.stick.y+(S.keys.KeyS||S.keys.ArrowDown?1:0)-(S.keys.KeyW||S.keys.ArrowUp?1:0);const len=Math.hypot(x,z);if(len<.08){x=Math.sin(hero.root.rotation.y);z=Math.cos(hero.root.rotation.y);}else{const yaw=battle?.gym?0:cameraOrbit.yaw;[x,z]=[(x*Math.cos(yaw)+z*Math.sin(yaw))/len,(-x*Math.sin(yaw)+z*Math.cos(yaw))/len];}hero.root.rotation.y=Math.atan2(x,z);roll={x,z,start:elapsed,duration:.42};hero.play('Roll',true);if(hero.actions.Roll)hero.actions.Roll.setEffectiveTimeScale(hero.actions.Roll.getClip().duration/.42);if(battle?.gym?.spirit==='blissey')phoenixRollPressed(battle,elapsed);}
function updateRoll(dt){const button=$('rollBtn');if(button){button.disabled=!!roll;button.textContent='滾';}if(!roll)return;const t=(elapsed-roll.start)/roll.duration;if(t>=1){roll=null;hero.play('Idle');return;}const speed=10.12*Math.sin(Math.PI*Math.max(.08,t)),nx=S.player.x+roll.x*speed*dt,nz=S.player.z+roll.z*speed*dt;if(!(battle?.gym?gymBoundsBlocked(nx,nz):blocked(nx,nz,.5))){S.player.x=nx;S.player.z=nz;}hero.root.position.copy(S.player);}
const helloState={still:0,next:0,until:0};
function greetWhenFacingCamera(){
 if(!hero||battle||place||modal||dialog||navigation||throwing||roll||locked){helloState.still=0;return false;}
 if(helloState.until>elapsed)return true;
 const direction=camera.position.clone().sub(S.player);direction.y=0;
 if(direction.lengthSq()<.001)return false;
 direction.normalize();
 const face=hero.root.rotation.y;
 if(direction.x*Math.sin(face)+direction.z*Math.cos(face)<.72){helloState.still=0;return false;}
 if(!helloState.still)helloState.still=elapsed;
 if(elapsed-helloState.still<2||elapsed<helloState.next)return false;
 const names=Object.keys(hero.actions);
 const chosen=['Wave','Hello','Greet','Salute','Celebrate'].map(t=>names.find(n=>n.toLowerCase().includes(t.toLowerCase()))).find(Boolean);
 if(!chosen){helloState.next=elapsed+20;return false;}
 hero.play(chosen,true);
 const clip=hero.actions[chosen];
 helloState.until=elapsed+Math.max(1,Math.min(2.3,(clip?.getClip().duration||1.5)/(clip?.getEffectiveTimeScale()||1)));
 helloState.next=elapsed+11+Math.random()*8;
 return true;
}

function movement(dt){if(!hero||modal||dialog||fishingBusy||battle&&!battle.gym||throwing||roll||battle?.heroStatus?.freeze>elapsed||battle?.heroStatus?.stun>elapsed||battle?.throwing)return;let x=S.stick.x+(S.keys.KeyD||S.keys.ArrowRight?1:0)-(S.keys.KeyA||S.keys.ArrowLeft?1:0),z=S.stick.y+(S.keys.KeyS||S.keys.ArrowDown?1:0)-(S.keys.KeyW||S.keys.ArrowUp?1:0);let len=Math.hypot(x,z);if(len>.06){cancelNavigation();const yaw=battle?.gym?0:cameraOrbit.yaw;[x,z]=[x*Math.cos(yaw)+z*Math.sin(yaw),-x*Math.sin(yaw)+z*Math.cos(yaw)];}else if(navigation){const v=navigationStep();if(v){x=v.x;z=v.z;len=1;}}if(len>.06){x/=Math.max(1,len);z/=Math.max(1,len);const speed=4.73*(riding()?1.5:1)*(S.state.costume==='mist'||S.state.costume==='sound'?1.2:1)*(battle?.heroStatus.slow>elapsed?.55:battle?.heroStatus.paralyze>elapsed?.65:1),nx=S.player.x+x*dt*speed,nz=S.player.z+z*dt*speed,isBlocked=(a,b)=>battle?.gym?gymBoundsBlocked(a,b):blocked(a,b);if(!isBlocked(nx,S.player.z))S.player.x=nx;if(!isBlocked(S.player.x,nz))S.player.z=nz;hero.root.position.copy(S.player);const angle=Math.atan2(x,z),diff=Math.atan2(Math.sin(angle-hero.root.rotation.y),Math.cos(angle-hero.root.rotation.y));hero.root.rotation.y+=diff*Math.min(1,dt*12);helloState.still=0;helloState.until=0;hero.play(S.state.costume==='sound'?'Idle':'Walk');}else{if(locked&&target)hero.root.rotation.y=Math.atan2(target.root.position.x-S.player.x,target.root.position.z-S.player.z);if(!greetWhenFacingCamera())hero.play('Idle');}}
function radar(){const c=$('radarCanvas').getContext('2d'),W=220;c.clearRect(0,0,W,W);c.fillStyle='#28463f';c.fillRect(0,0,W,W);c.strokeStyle='#78938360';c.lineWidth=1;for(let k=0;k<5;k++){c.beginPath();c.moveTo(k*55,0);c.lineTo(k*55,W);c.stroke();c.beginPath();c.moveTo(0,k*55);c.lineTo(W,k*55);c.stroke();}const pos=(x,z)=>[110+(x-S.player.x)*3.4,110+(z-S.player.z)*3.4];if(!place)river?.drawRadar(c,pos);c.font='14px sans-serif';c.textAlign='center';if(!place)for(const b of world.buildings){const p=pos(b.position[0],b.position[2]);c.fillStyle='#dfc781';c.fillRect(p[0]-4,p[1]-4,8,8);c.fillStyle='#f6ebc9';const short=b.name.replace('初光','').replace('幻靈','').replace('大夢','').replace('星穹','');c.fillText(short.slice(0,4),p[0],p[1]-9);}for(const n of npcs)if(n.root.visible){const p=pos(n.root.position.x,n.root.position.z);c.fillStyle='#85daf0';c.beginPath();c.arc(...p,3.5,0,Math.PI*2);c.fill();c.font='11px sans-serif';c.fillText(n.data.name.slice(0,3),p[0],p[1]+13);}if(!place)for(const w of wild){const p=pos(w.root.position.x,w.root.position.z);c.fillStyle=w===target?'#ffb269':'#d1dc93';c.beginPath();c.arc(...p,3,0,Math.PI*2);c.fill();}// 雷達的座標：世界 X 往右、世界 Z 往下；主角 yaw=0 朝 +Z，因此箭頭預設向下。
 // 使用 -yaw 轉換為 Canvas 順時針旋轉，避免固定箭頭和主角實際方向脫節。
 const facing=Number.isFinite(hero?.root?.rotation?.y)?hero.root.rotation.y:0;
 c.save();c.translate(110,110);c.rotate(-facing);
 c.beginPath();c.moveTo(0,11);c.lineTo(-6,-7);c.lineTo(0,-4);c.lineTo(6,-7);c.closePath();
 c.fillStyle='#fff8d9';c.strokeStyle='#244651';c.lineWidth=1.5;c.fill();c.stroke();c.restore();}
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.05);if(document.hidden||evolutionBusy)return;elapsed+=dt;arenaFeedback.update(dt*arenaSpeed());if(!S.ready)return;adjustGraphics(dt);
 // Menus must not continue ticking unseen 3D battles and wildlife.
 if(modal){
  if(viewer){
   const v=viewer;
   v.mix.update(dt);v.controller?.update(dt);
   if(elapsed-(tick.viewerRenderAt||0)>=(mobileGraphics?1/30:1/50)){
    v.cam.position.set(v.center.x+Math.sin(v.yaw)*v.distance*Math.cos(v.pitch),v.center.y+Math.sin(v.pitch)*v.distance,v.center.z+Math.cos(v.yaw)*v.distance*Math.cos(v.pitch));
    v.cam.lookAt(v.center);v.r.render(v.st,v.cam);tick.viewerRenderAt=elapsed;
   }
  }
  return;
 }tickBookEncounter();tickBroadcast();if(!place&&!battle&&!modal&&!dialog&&S.state.arenaRewardQueue?.length&&elapsed>=(tick.discoveryAt||0)){tick.discoveryAt=elapsed+8;void deliverArenaDiscoveries();}if(river&&!place&&!battle)river.tick(dt);if(elapsed>=(tick.specialCheckAt||0)){tickSpecialAppearances(elapsed-(tick.specialCheckedAt||elapsed));tick.specialCheckedAt=elapsed;tick.specialCheckAt=elapsed+.2;}if(elapsed>=(tick.pondCheckAt||0)){tick.pondCheckAt=elapsed+12;void (async()=>{await ensurePondCaterpillar();await ensurePondFrog();})();}if(elapsed>=(tick.labLegendCheckAt||0)){tick.labLegendCheckAt=elapsed+3;void ensureLabLegendWilds();}if(battle&&!battle.gym)battle.arenaClock+=dt*arenaSpeed();battle?.arena?.userData.tick?.(arenaTime());if(battle?.gym)tickGym(dt);for(const a of actors)if(a.root.visible&&a.root.parent?.visible!==false){const arenaActor=!!(battle&&!battle.gym&&battle.actors.includes(a)),actorDt=dt*(arenaActor?arenaSpeed():1);a.waterPuddle?.tick(arenaActor?arenaTime():elapsed);a.mixer.update(actorDt);a.guanpangFx?.update(a.mode,a.actions[a.mode]?.time||0);a.duoFx?.update(a.mode,a.actions[a.mode]?.time||0);if(a.controller&&!a.capturing&&!a.nativePaused){a.controller.setMotionSpeed(isAvian(a.path)?1:Math.min(6,Math.max(0,(Number.isFinite(a.motionSpeed)?a.motionSpeed:0)/Math.max(.35,a.object.scale.x))));try{a.controller.update(actorDt*(arenaActor?(a.arenaPlaybackRate||1):1));if(battle&&!battle.gym&&a.arenaSpeciesId==='moltres'){const crouch=Math.max(0,Math.min(.45,Number(a.controller.getState?.()?.crouch)||0));a.root.position.y=.23+crouch*Math.max(.01,Math.abs(a.object.scale.y)||1);}}catch(error){a.controller.setMode('Idle');a.controller.setMotionSpeed(0);if(!a.controllerErrorLogged){a.controllerErrorLogged=true;S.errors.push('角色動畫已安全暫停：'+error.message);}}}}updateRoll(dt);movement(dt);tickLabEvent(dt);tickChestEncounter(dt);updateSoundCostume(dt);collectSupplies();if(!battle&&!modal&&!dialog){if(!place){for(const w of wild)if(w!==target||!throwing)walkActor(w,dt,.45+(w.species.stage||1)*.1);if(target&&!wild.includes(target))clearTarget();}for(const n of npcs)if(n.root.visible){if(n.data?.id==='prof_daydream'&&place?.id==='dream_lab'){n.play('Idle');continue;}const d=n.root.position.distanceTo(S.player);if(d>3)n.contactLock=false;if(d>2.5)walkActor(n,dt,.45);else n.play('Idle');if(d<1.6&&!n.contactLock&&elapsed>n.cooldown&&(!navigation||navigation.kind==='npc'&&navigation.id===n.data.id)){talk(n);break;}}}try{tickPetFollower(dt);}catch(error){if(!tick.petErrorReported){tick.petErrorReported=true;console.warn('寵物互動暫停，保護遊戲主迴圈',error);}if(petFollower){const face=hero.root.rotation.y;petFollower.root.position.lerp(new T.Vector3(S.player.x-Math.sin(face)*1.13,0,S.player.z-Math.cos(face)*1.13),Math.min(1,dt*7));}}if(companion){companion.root.visible=S.state.costume==='mist'&&!battle&&!place;if(companion.root.visible){const face=hero.root.rotation.y,goal=new T.Vector3(S.player.x-Math.sin(face)*1.25,0,S.player.z-Math.cos(face)*1.25),d=goal.sub(companion.root.position),dist=d.length(),moving=dist>.08;if(moving){const step=Math.min(dist,dt*Math.max(1.8,dist*4));companion.root.position.addScaledVector(d,step/Math.max(dist,.001));companion.root.rotation.y=Math.atan2(-d.z,d.x);companion.motionSpeed=step/dt;companion.play('Walk');companion.idleSince=elapsed;}else{companion.motionSpeed=0;const q=(elapsed-(companion.idleSince||elapsed))%9;companion.play(q>4.5&&q<6.2?'Stuck':q>6.2?'Wave':'Idle');}}}tickMount(dt);for(let i=effects.length-1;i>=0;i--){const e=effects[i],t=Math.min(1,(elapsed-e.start)/e.duration);e.update(t);if(t===1){if(e.object)detach(e.object);effects.splice(i,1);e.done?.();}}const portrait=innerWidth<600;if(battle?.gym){gymCamera();}else if(battle||arenaCarry){camera.position.lerp(new T.Vector3(0,portrait?11.3:9.9,portrait?23.5:18),Math.min(1,dt*6));camera.lookAt(0,portrait?-.8:-.2,0);}else{const distance=(place?12.2:portrait?17.3:19.6)*cameraOrbit.zoom,desired=S.player.clone().add(new T.Vector3(Math.sin(cameraOrbit.yaw)*distance*Math.cos(cameraOrbit.pitch),distance*Math.sin(cameraOrbit.pitch),Math.cos(cameraOrbit.yaw)*distance*Math.cos(cameraOrbit.pitch)));camera.position.lerp(desired,Math.min(1,dt*7));camera.lookAt(S.player.x,1.1,S.player.z);light.position.set(S.player.x-12,25,S.player.z+15);light.target.position.copy(S.player);light.target.updateMatrixWorld();}const targetText=target&&!battle&&captureCandidates().includes(target)?`${target.species.name} · ${target.species.stageLabel||'第 '+target.species.stage+' 階段'}${target.berry?' · 已餵果':''}`:'';if($('target').textContent!==targetText)$('target').textContent=targetText;portalCheck();if(elapsed>=(tick.nextLabelsAt||0)){updateLabels();tick.nextLabelsAt=elapsed+(mobileGraphics?.05:.035);}if(Math.floor(elapsed*6)!==tick.radarFrame){tick.radarFrame=Math.floor(elapsed*6);radar();}window.PhantomOcclusion?.update(place?insideGroup:townGroup,camera,hero.root,dt,!battle);if(!mobileGraphics||elapsed-(tick.lastWorldRenderAt||0)>=.028){renderer.render(scene,camera);tick.lastWorldRenderAt=elapsed;}}
// Preserve the selected render quality; never automatically blur high quality.
function adjustGraphics(dt){graphicsQuality.smoothed=graphicsQuality.smoothed*.96+dt*.04;}
function setGraphicsPreset(preset){
 if(!GRAPHICS_LEVELS.includes(preset))return;
 const old=graphicsQuality.preset;graphicsQuality.preset=preset;
 try{localStorage.setItem(GRAPHICS_SETTING_KEY,preset);}catch{}
 graphicsQuality.dpr=graphicsPixelRatio(preset);renderer.setPixelRatio(graphicsQuality.dpr);
 const shadows=preset!=='low',mapSize=preset==='high'?1024:512;
 if(renderer.shadowMap.enabled!==shadows||light.shadow.mapSize.x!==mapSize){
  renderer.shadowMap.enabled=shadows;
  if(light.shadow.mapSize.x!==mapSize){
   light.shadow.map?.dispose();light.shadow.map=null;
   light.shadow.mapSize.set(mapSize,mapSize);
  }
  renderer.shadowMap.needsUpdate=true;
  scene.traverse(o=>{if(o.isMesh&&o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true;}});
 }
 return old!==preset;
}
window.addEventListener('storage',e=>{if(e.key===GRAPHICS_SETTING_KEY)setGraphicsPreset(readGraphicsPreset());});
const clock=new T.Clock();function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
const BALL_OPTIONS=[{id:'normal',name:'普通幻靈球',field:'pokeballs'},{id:'great',name:'高階幻靈球',field:'greatBallCount'},{id:'master',name:'星耀幻靈球',field:'masterBallCount'}];
function chooseBall(id){
 const option=BALL_OPTIONS.find(b=>b.id===id);if(!option)return;
 ballType=id;const button=$('captureBtn');
 button.dataset.ball=id;button.title='短按使用'+option.name+'・長按選球';
 button.setAttribute('aria-label','締約：'+option.name+'，短按使用，長按切換球種');
 $('ballPicker').hidden=true;toast('已選擇：'+option.name+'（剩餘 '+(S.state[option.field]||0)+'）');
}
function showBallPicker(){
 if(modal||dialog||throwing||place&&!battle?.gym)return;
 const menu=$('ballPicker');menu.replaceChildren();
 const title=document.createElement('strong');title.textContent='選擇幻靈球';menu.append(title);
 for(const opt of BALL_OPTIONS){
  const btn=document.createElement('button'),n=Math.max(0,S.state[opt.field]||0);
  btn.type='button';btn.dataset.pickBall=opt.id;btn.disabled=n===0;
  btn.textContent=opt.name+' ×'+n+(ballType===opt.id?' ✓':'');
  btn.setAttribute('aria-pressed',String(ballType===opt.id));
  btn.onclick=()=>chooseBall(opt.id);menu.append(btn);
 }
 menu.hidden=false;
}
function bindCaptureLongPress(){
 const button=$('captureBtn'),menu=$('ballPicker');let timer=null,start=null,opened=false,pointer=null;
 function cancel(){if(timer!==null)clearTimeout(timer);timer=null;}
 button.addEventListener('contextmenu',e=>{e.preventDefault();cancel();showBallPicker();opened=true;});
 button.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;e.preventDefault();
  pointer=e.pointerId;opened=false;start={x:e.clientX,y:e.clientY};
  if(button.setPointerCapture)button.setPointerCapture(e.pointerId);
  cancel();timer=setTimeout(()=>{timer=null;opened=true;showBallPicker();},480);
 });
 button.addEventListener('pointermove',e=>{if(e.pointerId===pointer&&start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>18)cancel();});
 button.addEventListener('pointerup',e=>{
  if(pointer!==e.pointerId)return;e.preventDefault();
  const shouldThrow=!opened&&timer!==null;
  cancel();pointer=null;start=null;
  if(shouldThrow){menu.hidden=true;throwBall();}
 });
 for(const name of ['pointercancel','lostpointercapture'])button.addEventListener(name,e=>{if(pointer===e.pointerId){cancel();pointer=null;}});
 // Keyboard or screen reader click only; pointer events are handled on release.
 button.addEventListener('click',e=>{if(e.detail===0){menu.hidden=true;throwBall();}});
 document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!button.contains(e.target))menu.hidden=true;},true);
}
function bindUi(){if($('mountBtn'))$('mountBtn').onclick=()=>{if(riding())changeMount(S.state.mountActive);else{const owned=Object.keys(towerProgress().mounts||{}).find(k=>towerProgress().mounts[k]);if(owned)changeMount(S.state.mountLast||owned);}};$('radar').onclick=()=>{const button=$('radarToggle'),expanded=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',expanded?'縮小城鎮雷達':'展開城鎮雷達');layoutWorldNotifications();window.PhantomJourneyGuide?.refresh?.();};$('menuBtn').onclick=showMenu;$('dexBtn').onclick=showDex;$('closeModal').onclick=modalBackOrClose;bindCaptureLongPress();$('lockBtn').onclick=()=>{if(battle?.gym)return toast('道館首領已自動鎖定。');if(locked)clearTarget();else{clearTarget();selectTarget(true);}};bindCamera();$('navCancelBtn').onclick=cancelNavigation;$('berryBtn').onclick=useBerry;$('rollBtn').onclick=beginRoll;$('portal').onclick=()=>portalAction?.();$('npcActions').onclick=e=>{const b=e.target.closest('[data-npc]');if(b)npcAction(b.dataset.npc);};$('modalBody').onclick=e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;if(d.merchantTab){merchantTab=d.merchantTab;showPetShop();return;}if(d.caveGroup){merchantCardId=d.caveGroup;showPetShop();return;}if(d.caveExchange){if(merchantTradeBusy)return;merchantTradeBusy=true;try{const count=Number($('caveTradeQuantity').value);save();const result=PhantomCaveBridge.exchangeGroup(d.caveExchange,count,spiritCatalog.sort(regularSpirits()));townWriter.adopt(S.state,result.state);for(const id of Object.keys(spiritCardTradeDraft))delete spiritCardTradeDraft[id];hud();showPetShop();toast('卡片兌換成功！無盡洞穴點數 +'+result.points);}catch(e){toast(e.message);}finally{setTimeout(()=>merchantTradeBusy=false,350);}return;}if(d.labPick)return claimLabLegend(d.labPick);if(d.labClose){deferLabChoice();return closeModal();}if(d.reset==='first')return showReset(true);if(d.reset==='final')return resetGame();if(d.navBuilding)return beginNavigation('building',d.navBuilding);if(d.navNpc)return beginNavigation('npc',d.navNpc);if(d.graphicsQuality){setGraphicsPreset(d.graphicsQuality);showDisplaySettings();return;}if(d.displayAudio)return showBgmSettings();if(d.sfxToggle){PhantomBgm.toggleSfx();showBgmSettings();return;}if(d.bgmToggle){window.PhantomBgm?.toggle();showBgmSettings();return;}if(d.menu){const actions={monsters:showMonsterDex,display:showDisplaySettings,home:showMenu,pets:showPetShop,dex:showDex,team:showTeam,costume:showCostumes,gym:showGyms,bag:showBag,help:showHelp,studio:()=>window.open('model-preview.html','_blank','noopener'),guide:showGuide,reset:showReset,tower:()=>{save();location.href='tower/?v=20261023-rules-sync-v2'}};const opener=actions[d.menu];if(opener){if(['home','studio','tower'].includes(d.menu))opener();else goModal(opener,showMenu);}}if(d.monster)return showMonsterDetail(d.monster);if(d.spiritTradeAdd)return addSpiritTradeCard();if(d.spiritTradeRemove)return removeSpiritTradeCard(d.spiritTradeRemove);if(d.spiritTradeConfirm)return exchangeSpiritCardsForMasterBall();if(d.mount)return changeMount(d.mount);if(d.pet)return changePet(d.pet);if(d.detail){const reopen=modalReopen();goModal(()=>showDetail(d.detail),reopen);}if(d.view){const id=d.view,back=modalBack;goModal(()=>showViewer(id),()=>{showDetail(id);modalBack=back;});}if(d.vmotion)viewerMotion(d.vmotion);if(d.evolve)evolve(d.evolve);if(d.add){if(S.state.team.includes(d.add))return toast('這位夥伴已在隊伍中。');if(S.state.team.length>=3)return toast('隊伍已滿，請先在隊伍頁移出一位。');S.state.team.push(d.add);save();toast('已加入隊伍。');}if(d.remove){S.state.team=S.state.team.filter(id=>id!==d.remove);save();showTeam();}if(d.costume){setCostume(d.costume);showCostumes();}if(d.arena)startBattle(d.arena);};$('modalBody').addEventListener('change',e=>{if(e.target?.id==='spiritTradeSelect')spiritTradeSelectedId=e.target.value;});$('modalBody').addEventListener('input',e=>{if(e.target?.id==='caveTradeQuantity'){const count=Number(e.target.value),g=PhantomCaveBridge.groups(spiritCatalog.sort(regularSpirits()),S.state.captureCounts).find(g=>g.id===merchantCardId),valid=Number.isSafeInteger(count)&&count>0&&count<=g.stock;const plan=valid?CaveMerchant.quote(g,count):null;$('caveTradePoints').textContent=plan?plan.points:'—';$('caveTradePlan').innerHTML=plan?.html||'<li>請輸入有效數量</li>';$('modalBody').querySelector('[data-cave-exchange]').disabled=!valid;return;}if(e.target?.id==='sfxVolumeRange'){$('sfxVolumeValue').textContent=PhantomBgm.setSfxVolume(e.target.value)+'%';return;}if(e.target?.id!=='bgmVolumeRange')return;const v=window.PhantomBgm?.setVolume(Number(e.target.value));const output=$('bgmVolumeValue');if(output)output.textContent=(v??e.target.value)+'%';});
$('battleActions').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.skill!==undefined)playerTurn('skill',Number(b.dataset.skill));if(b.dataset.battle==='retreat')endBattle(false,true);else if(b.dataset.battle)playerTurn(b.dataset.battle);};const viewCanvas=$('scene');let labTapStart=null;
 viewCanvas.addEventListener('pointerdown',e=>{labTapStart={x:e.clientX,y:e.clientY,id:e.pointerId};},{passive:true});
 viewCanvas.addEventListener('pointerup',e=>{if(labTapStart?.id===e.pointerId&&Math.hypot(e.clientX-labTapStart.x,e.clientY-labTapStart.y)<14)tapLabBall(e);labTapStart=null;},{passive:true});
 const joy=$('joystick');let pointer=null;function joyMove(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,dist=Math.hypot(dx,dy),max=r.width*.32;S.stick.x=dx/Math.max(max,dist);S.stick.y=dy/Math.max(max,dist);$('stick').style.transform=`translate(${S.stick.x*max}px,${S.stick.y*max}px)`;}joy.onpointerdown=e=>{pointer=e.pointerId;joy.setPointerCapture(pointer);joyMove(e)};joy.onpointermove=e=>{if(e.pointerId===pointer)joyMove(e)};const release=()=>{pointer=null;S.stick.x=S.stick.y=0;$('stick').style.transform='';};joy.onpointerup=release;joy.onpointercancel=release;addEventListener('keydown',e=>{if(evolutionBusy){if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape'].includes(e.code))e.preventDefault();return;}if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;S.keys[e.code]=true;if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Space')throwBall();if(e.code==='Tab')$('lockBtn').click();if(e.code==='KeyE')portalAction?.();if(e.code==='ShiftLeft'||e.code==='ShiftRight')beginRoll();if(e.code==='Escape'){closeDialog();if(modal)modalBackOrClose();}});addEventListener('keyup',e=>S.keys[e.code]=false);addEventListener('blur',()=>{S.keys={};release();save();});}

// Progressive scene hydration: main controls unlock after the town, hero and
// nearby residents, instead of waiting for every model, decoration and wild spawn.
async function loadDeferredTown(nearNpcs){
 const remaining=npcData.filter(n=>!nearNpcs.includes(n));
 const tasks=[
  ()=>ensureSpecialAppearances(),
  ...remaining.slice(0,3).map(n=>()=>loadNpc(n)),
  ()=>populate(),
  ()=>loadTownGrass(),
  ()=>spawnSupplies(),
  ...remaining.slice(3).map(n=>()=>loadNpc(n))
 ];
 for(const task of tasks){
  if(!S.ready)break;
  await delay(mobileGraphics?450:75);
  // Delay model parsing while combat or capture is in progress on phones.
  while(S.ready&&(battle||throwing||enterBusy||document.hidden))await delay(300);
  try{await task();if(place)setNpcPlace();}
  catch(e){S.errors.push('背景圖資：'+e.message);console.warn('背景資源稍後可重試',e);}
 }
}
function warmBattleModels(){
 if(!S.ready)return;
 if(battle||throwing||enterBusy||modal||document.hidden){setTimeout(warmBattleModels,2000);return;}
 // Don't block first paint or flood the network: queue assets one at a time.
 const models=[world.battleModel||'models/world/arena.glb',...S.state.team.map(id=>byId[id]?.model).filter(Boolean)];
 let n=0;
 const next=()=>{if(n>=models.length||!S.ready)return;
  if(battle||throwing||enterBusy||modal||document.hidden){setTimeout(next,2200);return;}
  const path=models[n++];
  asset(path).then(async g=>{if(/(ahong-cowboy|starlight-mage|guanpang)\.glb$/.test(path)&&!actorBaseBounds.has(path))actorBaseBounds.set(path,(await runtimeActorBounds(g.scene,path)).clone());}).catch(e=>console.warn('預先載入場地或隊伍模型失敗',e)).finally(()=>setTimeout(next,mobileGraphics?850:160));
 };
 next();
 // Browser may cache the challenge-tower document before the player opens it.
 if(!mobileGraphics&&!document.querySelector('link[data-tower-prefetch]')){
  const link=document.createElement('link');link.rel='prefetch';link.href='tower/?v=20261023-rules-sync-v2';link.as='document';
  link.dataset.towerPrefetch='true';document.head.append(link);
 }
}

async function init(){try{const responses=await Promise.all(['data/spirits.json','data/world.json','data/npcs.json','data/spirit-catalog.json'].map(p=>fetch(p+(p==='data/npcs.json'?'?v=20261023-npc-rules-v2':'?v=20261023-rides-v1')).then(r=>{if(!r.ok)throw Error(p+' 尚未就緒');return r.json()})));spirits=Array.isArray(responses[0])?responses[0]:responses[0].spirits;spirits.forEach(s=>{s.id=s.id||s.speciesId;s.name=s.name||s.displayName;byId[s.id]=s;});spiritCatalog=SpiritCatalog.create(responses[3]);world=responses[1];npcData=Array.isArray(responses[2])?responses[2]:responses[2].npcs;const extraDataRequests=[(async()=>{try{const r=await fetch('data/bookshelf-interactions.json?v=20261016-books-v1');if(r.ok)bookshelfData=await r.json();}catch(e){S.errors.push('書櫃配置：'+e.message);}})(),(async()=>{try{const r=await fetch('data/model-size-overrides.json?v=20261023-starspire-v1');if(r.ok){const v=await r.json();modelSizeOverrides=v.overrides||v;}}catch(e){console.warn('尺寸設定尚未就緒',e);}})(),(async()=>{try{const r=await fetch('data/tower-monsters.json?v=20261023-rides-v1');if(r.ok)towerMonsters=(await r.json()).monsters||[];}catch(e){console.warn('魔物卡牌尚未載入',e);}})(),(async()=>{try{const r=await fetch('data/card-art.json?v=20261023-starspire-v1');if(r.ok){const v=await r.json();cardArt=v.cards||v.art||v;}}catch(e){console.warn('卡圖清單尚未就緒',e);}})()];await Promise.all(extraDataRequests);S.state=loadSave();consumeTowerBossGrants();migrateTowerCardCollection();mountOwnership={...towerProgress().mounts};planChestEncounter();const newPlayerStart=!spirits.some(s=>owned(s.id))&&!labClaimed();const restoredBuilding=newPlayerStart?'dream_lab':S.state.buildingId,restoredPosition=newPlayerStart?null:S.state.position?.slice();S.state.team=S.state.team.filter(id=>byId[id]&&owned(id));if(!S.state.team.length)S.state.team=spirits.filter(s=>owned(s.id)).slice(0,3).map(s=>s.id);for(const g of gyms)if(S.state.gyms[g.id]?.cleared&&!S.state.unlockedCostumes.includes(g.costume))S.state.unlockedCostumes.push(g.costume);$('loadText').textContent='載入初光鎮與旅人…';const townAsset=await asset(world.worldModel||world.model);town=townAsset.scene.clone(true);townGroup.add(town);town.traverse(n=>{if(n.isMesh){n.receiveShadow=true;n.castShadow=true;}});try{river=window.PhantomRiver?.build({THREE:T,group:townGroup,town,config:world.river,mobile:mobileGraphics})||null;}catch(e){S.errors.push('北側河道：'+e.message);console.warn('北側河道建置失敗',e);}hero=await actor('models/hero.glb',2.55);hero.restScene=(await asset('models/hero.glb')).scene;prepareHeroOutcomeActions();hero.root.rotation.y=Math.PI;S.player.fromArray(world.spawn||[0,0,4]);if(!newPlayerStart&&S.state.position?.length===2&&!blocked(...S.state.position))S.player.set(S.state.position[0],0,S.state.position[1]);hero.root.position.copy(S.player);setCostume(S.state.costume);overworldMount=OverworldMounts.create({THREE:T,parent:townGroup,hero,createDeer:()=>FloralDeer.create({stage:3,inPlace:true})});$('loadText').textContent='準備鄰近居民與初始幻靈…';
const nearestNpcs=[...npcData].sort((a,b)=>{
 const p=a.position||[0,0,0],q=b.position||[0,0,0],az=p.length===2?p[1]:p[2],bz=q.length===2?q[1]:q[2];
 return Math.hypot(p[0]-S.player.x,az-S.player.z)-Math.hypot(q[0]-S.player.x,bz-S.player.z);
}).slice(0,2);
await Promise.allSettled([...nearestNpcs.map(loadNpc),spawnWild(chooseWild())]);if(byId.mew){companion=await actor(byId.mew.model,.55);companion.root.visible=false;companion.root.position.copy(S.player);companion.idleSince=elapsed;}camera.position.copy(S.player).add(new T.Vector3(0,8.6,10.7));setNpcPlace();if(S.state.petActive)void equipPet(S.state.petActive);if(restoredBuilding){const b=world.buildings.find(x=>x.id===restoredBuilding);if(b){await enterBuilding(b);if(newPlayerStart){if(!blocked(LAB_START_POSITION.x,LAB_START_POSITION.z,.45)){S.player.copy(LAB_START_POSITION);hero.root.position.copy(S.player);}save();}else if(restoredPosition&&!blocked(...restoredPosition)){S.player.set(restoredPosition[0],0,restoredPosition[1]);hero.root.position.copy(S.player);}}}bindUi();hud();S.ready=true;PhantomLoading.end();
 window.PhantomJourneyGuide?.init?.({
  state:S.state,newPlayer:newPlayerStart,
  earlyStarter:labClaimed()&&regularSpirits().filter(s=>owned(s.id)).length===1&&!S.state.adventureClaimed,
  inLab:()=>place?.id==='dream_lab',inBuilding:()=>!!place,inGym:()=>place?.id==='gym_light',
  blocked:()=>!!(modal||dialog||battle||enterBusy||throwing),
  // 旅人手冊開啟時保留任務快捷鍵；其他模態頁面仍依原規則隱藏。
  shortcutBlocked:()=>!!(dialog||battle||enterBusy||(modal&&!['旅人手冊','幻靈圖鑑'].includes($('modalTitle')?.textContent))),
  navigate:(type,id)=>beginNavigation(type,id),showCostumes:()=>showCostumes(),showGyms:()=>showGyms(),
  showMenu:()=>showMenu(),notice:t=>toast(t),
  progress:()=>dexStats(),caveAction:caveMissionAction,

  save:()=>save()
 });
 if(new URLSearchParams(location.search).get('monsterDex')==='1')showMonsterDex();$('load').hidden=true;document.body.dataset.ready='true';setTimeout(()=>void loadDeferredTown(nearestNpcs),mobileGraphics?900:350);setTimeout(()=>warmBattleModels(),mobileGraphics?8000:2300);setInterval(save,15000);addEventListener('pagehide',e=>{save();if(!e.persisted&&battle){disposeXiaoshanTrial(battle);disposePhoenixTrial(battle);}else if(battle?.xiaoshanTrial?.utterance)window.speechSynthesis?.cancel();});document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});setInterval(()=>{if(!place&&!battle&&!modal){const far=wild.find(w=>w!==target&&!w.specialEventId&&!w.labLegendStarter&&!w.pondSwim&&!w.pondJump&&w.root.position.distanceTo(S.player)>24);if(far){wild.splice(wild.indexOf(far),1);removeActor(far);replenish();}}},45000);toast(newPlayerStart?'歡迎來到大夢研究所！請向桌上的幻靈球前進，選擇第一位幻靈。':S.state.migratedFrom?'歡迎回來！你的舊版進度已接續。':'歡迎來到初光鎮！靠近幻靈，投出靈核球締約。');updateLabGuide();}catch(e){PhantomLoading.fail('城鎮讀取失敗，請重試');$('load').classList.add('load-error');S.errors.push(e.message);$('loadText').textContent=e.message+'。請重新整理，或確認資產是否完整。';console.error(e);}}
window.PhantomGame={talk,enterEndlessCave,caveEvent,caveMissionAction,showPetShop,
 guideTips,recordArenaDiscovery,deliverArenaDiscoveries,milestoneTargets,dexComplete,changeMount,get mount(){return overworldMount},get river(){return river},startFishing,eligible,spawnWeight,chooseWild,beginNavigation,cancelNavigation,get navigation(){return navigation},cameraOrbit,clearTarget,showGuide,showReset,resetGame,grantSupply,tickBroadcast,get cardArt(){return cardArt},get elapsed(){return elapsed},broadcastNow(){broadcastAt=elapsed;tickBroadcast()},endBattle,playerTurn,tickGym,state:S,scene,camera,renderer,actors,wild,npcs,asset,cloneSkin,showDex,showTeam,showGyms,showViewer,startBattle,showBgmSettings,get audio(){return battleAudio.metrics},get arenaFeedback(){return arenaFeedback.metrics},enterBuilding,leaveBuilding,grant,save,showMenu,throwBall,useBerry,selectTarget,get spirits(){return spirits},get world(){return world},get hero(){return hero},get battle(){return battle},get place(){return place},captureCandidates,readBookshelf,nearbyBookshelf,validBookTeam,get bookshelfData(){return bookshelfData},get bookEncounter(){return bookEncounter},get chestEncounter(){return chestEncounter},get chestNextAt(){return chestNextAt},get viewer(){return viewer},get labels(){return labels},get target(){return target},beginRoll,get roll(){return roll},blocked,teleport(x,z){S.player.set(x,0,z);hero.root.position.copy(S.player);},setCostume};

function spawnWeight(s){return 1/Math.pow(1+number(S.state.captureCounts[s.id]),1.6)/(1+wild.filter(w=>w.species.id===s.id).length*3);}
function chooseWild(){const list=spirits.filter(s=>!['entei','articuno'].includes(s.id)&&!(s.id==='raikou'&&wild.some(w=>w.species.id==='raikou'))&&!isChest(s)&&!isBook(s)&&eligible(s)&&(!isOneTimeSpecial(s.id)||dexComplete()||!wild.some(w=>w.species.id===s.id))&&!specialEvents().some(e=>e.speciesId===s.id));let r=Math.random()*list.reduce((n,s)=>n+spawnWeight(s),0);return list.find(s=>(r-=spawnWeight(s))<=0)||list[list.length-1];}
function clearTarget(){locked=false;$('lockBtn').setAttribute('aria-pressed','false');$('lockBtn').setAttribute('aria-label','鎖定可締約幻靈');$('lockBtn').title='鎖定可締約幻靈';target=null;if(lockLabel){removeLabel(lockLabel);lockLabel=null;}$('target').textContent='';}
function showReset(final=false){openModal('重置遊戲 · '+(final?'最後確認':'第一次確認'),`<p>${final?'這是最後一次確認。':'重置將清除本瀏覽器的幻靈、道具、衣櫃、道館、挑戰塔素材、無盡洞穴及位置紀錄。'}操作後無法復原。</p><div class="toolbar"><button data-menu="help">取消</button><button class="danger" data-reset="${final?'final':'first'}">${final?'確定清除並重新開始':'繼續確認重置'}</button></div>`);}
function resetGame(){localStorage.removeItem('phantom-starspire-tower-v1');S.state=migrate();S.player.fromArray(world.spawn||[0,0,4]);navigation=null;townWriter.reset(S.state);save();location.reload();}
const buildingNotes={care_center:'恢復夥伴精神，領取旅行補給。',ranger_station:'一般幻靈圖鑑收錄 5 種，完成巡護委託可領普通、高階、星耀靈核球各 30 顆（一次性）。',dream_lab:'查看幻靈研究與圖鑑，認識羈絆進階。',gym_light:'四種主角即時首領試煉，勝利解鎖服裝。',tower_starspire:'三種一般魔物加三名獨立首領，共六場挑戰；使用武器、翻滾與素材強化。',house_resident_a:'拜訪居民，聽故事並取得不定時補給。'};
function showGuide(){openModal('建物與居民 · 點名稱導航',`<h3>建物</h3>${world.buildings.map(b=>`<div class="guideRow"><button data-nav-building="${b.id}">⌖ ${esc(b.name)}</button><p>${esc(buildingNotes[b.id]||'探索鎮上的新發現。')}</p></div>`).join('')}<h3>居民</h3>${npcData.map(n=>`<div class="guideRow"><button data-nav-npc="${n.id}">⌖ ${esc(n.name)}</button><p>${esc(n.role)} · ${esc(Rules.formatNpcText((n.dialogue||[])[0]||'歡迎來到初光鎮。'))}</p></div>`).join('')}<p class="muted">路線會繞開建物。抵達建物入口後可按「進入」；抵達居民身邊會自動對話。手動移動會取消導航。</p>`);}
function cancelNavigation(){document.body.classList.remove('navigating');navigation=null;navRoute=[];if($('navCancelBtn'))$('navCancelBtn').hidden=true;}
function beginNavigation(kind,id){if(battle||throwing||enterBusy)return;closeModal();closeDialog();if(place)leaveBuilding();navigation={kind,id};navRoute=[];navReplan=0;$('navCancelBtn').hidden=false;document.body.classList.add('navigating');toast('開始導航至 '+(kind==='waypoint'?(id==='fishing'?'河畔召喚處':'探索山洞'):kind==='building'?world.buildings.find(b=>b.id===id)?.name:npcData.find(n=>n.id===id)?.name));}
function planRoute(goal){const step=1,key=(x,z)=>x+','+z,sx=Math.round(S.player.x),sz=Math.round(S.player.z),gx=goal.x,gz=goal.z,start={x:sx,z:sz,g:0,f:0};const open=[start],cost=new Map([[key(sx,sz),0]]);let found=null,loops=0;while(open.length&&loops++<6500){open.sort((a,b)=>a.f-b.f);const n=open.shift();if(Math.hypot(n.x-gx,n.z-gz)<1.1){found=n;break;}for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,k=key(x,z),g=n.g+Math.hypot(dx,dz);if(blocked(x,z,.55)||blocked(n.x+dx*.5,n.z+dz*.5,.55)||g>=(cost.get(k)??Infinity))continue;cost.set(k,g);open.push({x,z,g,f:g+Math.hypot(x-gx,z-gz),parent:n});}}const route=[];while(found?.parent){route.unshift(new T.Vector3(found.x,0,found.z));found=found.parent;}return route;}
function navigationStep(){if(!navigation)return null;const nav=navigation;let goal;if(nav.kind==='waypoint'){const r=world.river||{};goal=nav.id==='fishing'?new T.Vector3(6,0,(r.nearBankZ||-40.6)+1.1):new T.Vector3(r.bridgeX||0,0,r.tunnelZ||-55);}else if(nav.kind==='building'){const b=world.buildings.find(b=>b.id===nav.id);if(!b)return cancelNavigation();const p=b.entrance;goal=new T.Vector3(p[0],0,p.length===3?p[2]:p[1]);}else{const n=npcs.find(n=>n.data.id===nav.id);if(!n)return cancelNavigation();goal=n.root.position.clone();}if(nav.kind==='waypoint'&&nav.id==='fishing'?river?.canFish(S.player):S.player.distanceTo(goal)<(nav.kind==='npc'?1.4:1.25)){cancelNavigation();toast('已抵達目的地。');return null;}if(elapsed>navReplan||!navRoute.length){navRoute=planRoute(goal);navReplan=elapsed+1.5;if(!navRoute.length){cancelNavigation();toast('找不到安全路線，請稍微移動後再導航。');return null;}}while(navRoute.length&&S.player.distanceTo(navRoute[0])<.25)navRoute.shift();if(!navRoute.length)return null;const d=navRoute[0].clone().sub(S.player);d.y=0;return d.normalize();}
function grantSupply(source='補給廣播',allowMaster=true){const pool=[['pokeballs',5,'靈核球'],['greatBallCount',2,'高階靈核球'],['masterBallCount',1,'星耀幻靈球'],['berryCount',3,'星露果'],['potion',2,itemNames.potion],['armorBreak',1,itemNames.armorBreak],['attackBoost',1,itemNames.attackBoost]];const i=Math.random(),entry=pool[i<.025&&allowMaster?2:i<.19?1:i<.43?0:i<.60?3:i<.75?4:i<.88?5:6],k=entry[0];if(k in S.state)S.state[k]+=entry[1];else S.state.items[k]=number(S.state.items[k])+entry[1];save();return source+'：'+entry[2]+' +'+entry[1];}
function maybeNpcGift(n,requested=false){
 const key=n.data.id+'-random',now=Date.now(),last=number(S.state.npcRewards[key]);
 if(now-last<120000)return requested?'補給正在準備中，請兩分鐘後再來對話。':'';
 S.state.npcRewards[key]=now;
 const chance=Math.random();
 if(chance<.05){
  S.state.masterBallCount=number(S.state.masterBallCount)+1;
  save();
  return '幸運的對話獎勵！獲得星耀幻靈球 ×1！';
 }
 if(chance<.75)return grantSupply(n.data.name+'的對話補給',false);
 save();
 return requested?'這次沒有獲得補給，再和其他居民聊聊吧。':'';
}
function tickBroadcast(){if(place||battle||dialog||modal)return;if(elapsed>=broadcastAt){broadcastAt=elapsed+120+Math.random()*180;const text=grantSupply('初光補給廣播');showWorldBroadcast(text);toast(text);}tickGuideBroadcast();}
function bindCamera(){for(const [id,fn]of[['cameraLeftBtn',()=>cameraOrbit.yaw-=.3],['cameraRightBtn',()=>cameraOrbit.yaw+=.3],['cameraNearBtn',()=>cameraOrbit.zoom=Math.max(.7,cameraOrbit.zoom-.1)],['cameraFarBtn',()=>cameraOrbit.zoom=Math.min(2.35,cameraOrbit.zoom+.1)]])if($(id))$(id).onclick=fn;const points=new Map();let previous=null;$('scene').addEventListener('pointerdown',e=>{if(battle||modal||dialog)return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});$('scene').setPointerCapture(e.pointerId);previous=points.size===2?[...points.values()]:null;});$('scene').addEventListener('pointermove',e=>{if(!points.has(e.pointerId)||battle)return;const old=points.get(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size===1){cameraOrbit.yaw-=(e.clientX-old.x)*.008;cameraOrbit.pitch=Math.max(.42,Math.min(.95,cameraOrbit.pitch+(e.clientY-old.y)*.003));}else if(points.size===2){const now=[...points.values()],dist=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(previous&&dist(now)>10)cameraOrbit.zoom=Math.max(.7,Math.min(2.35,cameraOrbit.zoom*dist(previous)/dist(now)));previous=now;}});for(const e of ['pointerup','pointercancel'])$('scene').addEventListener(e,p=>{points.delete(p.pointerId);previous=null});$('scene').addEventListener('wheel',e=>{if(battle||modal||dialog)return;e.preventDefault();cameraOrbit.zoom=Math.max(.7,Math.min(2.35,cameraOrbit.zoom*(e.deltaY>0?1.06:.94)));},{passive:false});}

// Read-only performance counters for real-device acceptance testing.
window.phantomPerformance=()=>({scene:battle?.gym?'gym':battle?'arena':place?'indoor':'world',estimatedFPS:Math.round(1/Math.max(.001,graphicsQuality.smoothed)),renderPixelRatio:renderer.getPixelRatio(),devicePixelRatio:devicePixelRatio||1,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,activeActors:actors.length,activeEffects:effects.length});
init();tick();
})();
