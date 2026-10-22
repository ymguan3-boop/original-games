/* 模型室：同一進化家族一起展示，前方木頭人當招式目標。
   八個統一動作：待機、移動、跑步、特殊（打招呼）、開心（歡呼）、受擊、普攻、絕招。
   模型沒有對應動作時，以待機／行走為底加上程序動作補上（跑步＝加速行走、打招呼＝搖擺小跳、歡呼＝雙跳旋身、受擊＝後退抖動）。 */
(async()=>{'use strict';
const T=THREE,C=ModelRoomSettings,$=id=>document.getElementById(id),host=$('stage');
const scene=new T.Scene();
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.domElement.setAttribute('aria-label','可拖曳旋轉與縮放的立體幻靈家族');host.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(30,1,.05,200);
scene.add(new T.HemisphereLight(0xf2f6fa,0xb9b2a4,.95));
const key=new T.DirectionalLight(0xffffff,1.55);key.position.set(-5,9,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-4,near:1,far:40});key.shadow.bias=-.0005;scene.add(key,key.target);
const rim=new T.DirectionalLight(0xbfdcff,.6);rim.position.set(4,5,-6);scene.add(rim);
const ground=new T.Mesh(new T.PlaneGeometry(80,80),new T.ShadowMaterial({opacity:.18}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const loader=new T.GLTFLoader(),scriptCache=new Map(),byId={};
let fitW=6,fitH=4,catalog,spirits=[],portraitMap={},families=[],packs=[],family=null,selected=null,motion='Idle',paused=false,serial=0,dead=false,last=performance.now(),angle=.28,pitch=.2,zoom=1,span=6,suit='trainer',heroCostumes=null;
const target=new T.Vector3(0,1.2,0);
try{const saved=JSON.parse(localStorage.getItem('phantom_journey_v1')||'null');if(C.suits[saved?.costume])suit=saved.costume;}catch{}
const MOTIONS=[['Idle','待機'],['Walk','移動'],['Run','跑步'],['Greet','特殊 · 打招呼'],['Cheer','開心 · 歡呼'],['Hurt','受擊']],MOVES=[['Attack','普攻'],['Ultimate','絕招']];
const DESC={Idle:'站著呼吸、眨眼的待機動作。',Walk:'原地行走（遊戲中邊走邊移動）。',Run:'原地跑步；沒有跑步動作的幻靈以加速行走補上。',Greet:'打招呼：有手臂或翅膀的幻靈由肩膀帶動舉手揮動；沒有專屬動作的以左右搖擺小跳補上。',Cheer:'開心歡呼：跳躍、舉手或旋身。',Hurt:'受擊後退與抖動。',Attack:'普攻，對前方的木頭人出手。',Ultimate:'絕招，對前方的木頭人出手。'};
const error=e=>{$('error-message').textContent=e?.message||String(e);$('error').hidden=false;$('status').textContent='載入或預覽失敗，可重新載入或選擇其他家族。';};
addEventListener('unhandledrejection',e=>error(e.reason));

/* ---------- 載入與釋放 ---------- */
function script(path){if(scriptCache.has(path))return scriptCache.get(path);const p=new Promise((res,rej)=>{const n=document.createElement('script');n.src=path+'?v='+C.revision;n.onload=res;n.onerror=()=>{scriptCache.delete(path);n.remove();rej(Error('程式載入失敗：'+path));};document.head.append(n);});scriptCache.set(path,p);return p;}
async function scripts(paths){for(const p of paths)await script(p);}
function owned(root){const r=new Set();root.traverse(n=>{if(n.geometry)r.add(n.geometry);if(n.skeleton?.boneTexture)r.add(n.skeleton.boneTexture);for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){r.add(m);for(const v of Object.values(m))if(v?.isTexture)r.add(v);}});return r;}
function release(p){if(!p)return;p.guanpangFx?.dispose();p.duoFx?.dispose();p.mixer?.stopAllAction();p.mixer?.uncacheRoot(p.root);if(p.hero&&heroCostumes)heroCostumes.dispose(p.root);try{p.controller?.dispose?.();}catch{}for(const r of p.resources||[])r.dispose?.();p.display?.parent?.remove(p.display);}
function excluded(n,root){for(let x=n;x;x=x.parent){if(!x.visible||x.userData?.isEffect||x.userData?.effect||/^(Effects|ReusableEffects|ReusableLightEffects|CombatEffects|ReusableFireball)$/.test(x.name))return true;if(x===root)break;}return false;}
function bounds(root){const box=new T.Box3(),temp=new T.Box3();root.updateMatrixWorld(true);root.traverse(n=>{if(!n.isMesh||!n.geometry||excluded(n,root))return;const ms=Array.isArray(n.material)?n.material:[n.material];if(ms.every(m=>m?.isMeshBasicMaterial&&m.transparent&&m.depthWrite===false))return;const g=n.geometry;if(!g.boundingBox)g.computeBoundingBox();if(g.boundingBox)box.union(temp.copy(g.boundingBox).applyMatrix4(n.matrixWorld));});if(box.isEmpty())throw Error('模型沒有可見幾何');return box;}
async function build(id){
 const s=byId[id],path=id==='hero'?'models/hero.glb':s?.model;if(!path)throw Error('找不到模型：'+id);
 const route=C.route(path);let root,controller,mixer,clips=[];
 if(route){await scripts(route.scripts);if(route.create){controller=await route.create(path);root=controller.root;}else{const n=route.build(path);root=n.scene;clips=n.animations||[];}}
 else{if(id==='hero')await scripts(['models/native/xiaoshan.js','js/hero-costumes.js']);const g=await loader.loadAsync(path+'?v='+C.revision);root=g.scene;clips=g.animations||[];}
 const resources=owned(root);if(!controller)mixer=new T.AnimationMixer(root);
 root.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
 const display=new T.Group();display.add(root);
 const duoFx=/(ahong-cowboy|starlight-mage)\.glb$/.test(path)?createDuoCombatVFX(T,display,root,path):null;
 const guanpangFx=/guanpang\.glb$/.test(path)?createGuanpangCombatVFX(T,display,root,clips):null;
 const state=controller?.getState?.()||{},modes=controller?(Array.isArray(state.modes)?state.modes:route?.modes||[]).slice():clips.map(c=>c.name);
 const p={id,s,path,root,display,controller,mixer,clips,resources,route,modes,duoFx,guanpangFx,hero:id==='hero',durations:Object.assign({},typeof route?.durations==='function'?route.durations():route?.durations,state.durations),base:new T.Vector3(),scale:1,current:null,time:0,plan:null};
 if(p.hero){heroCostumes??=HeroCostumes.create(T);heroCostumes.apply(root,suit);}
 return p;
}

/* ---------- 動作對應 ---------- */
const GAME={Idle:'Idle',Walk:'Walk',Run:'Run',Greet:'Wave',Cheer:'Celebrate',Hurt:'Hurt'};
const CAND={Idle:['Idle','Hover','Rest'],Walk:['Walk','Fly','Roll','Hop','Move'],Run:['Run','NinjaRun','Dash','Fly'],Greet:['Wave','Greet','React'],Cheer:['Celebrate','JumpCelebrate','Jump','Hop','Cheer'],Hurt:['Hurt','Stuck','Scared']};
function nativeMap(p,name){const k=p.route?.kind,f=k==='replacement'?window.ReplacementSpirits?.motion:k==='avian'?window.AvianSpirits?.motion:k==='frog'?window.FrogSpirits?.motion:k==='robot'?window.RobotSpirits?.motion:null;try{return f?f(p.path,name):null;}catch{return null;}}
const find=(names,n)=>names.find(x=>x.toLowerCase()===String(n).toLowerCase());
function resolve(p,canon){
 const names=p.modes;
 if(canon==='Attack'||canon==='Ultimate'){
  if(p.hero)return{mode:find(names,canon==='Attack'?'Attack':'Throw')||'Idle'};
  const i=canon==='Attack'?0:1,skill=p.s.skills?.[i]||{cost:i?3:1};let plan;
  try{plan=SpiritCombat.attackPlan(p.s,{path:p.path,actions:Object.fromEntries(names.map(n=>[n,null])),controller:p.controller},skill,catalog.skill(p.s.id,i)||{});}catch{plan=null;}
  const mode=find(names,plan?.mode)||catalog.attack(p.s,i,names)?.mode||find(names,canon)||names[0];
  return{mode,release:plan?.procedural?.4:(plan?.releaseFraction??.48),attack:i,vfx:!!window.SpiritVfx?.has(p.path),procedural:!!plan?.procedural};
 }
 const mapped=nativeMap(p,GAME[canon]);
 if(mapped&&find(names,mapped)&&(canon==='Idle'||mapped.toLowerCase()!=='idle')&&!(canon==='Run'&&/walk/i.test(mapped)))return{mode:find(names,mapped)};
 const hit=CAND[canon].map(n=>find(names,n)).find(Boolean);
 if(hit&&!(canon==='Run'&&/fly/i.test(hit)&&!/fly/i.test(resolve(p,'Walk').mode)))return{mode:hit};
 const idle=find(names,'Idle')||names[0];
 if(canon==='Run')return{mode:resolve(p,'Walk').mode,speed:1.8,proc:'run'};
 if(canon==='Walk')return{mode:idle,proc:'walk'};
 return{mode:idle,proc:canon.toLowerCase()};
}
const LOOP=new Set(['Idle','Walk','Run']);
function duration(p,mode){const clip=p.clips.find(c=>c.name===mode);if(clip)return clip.duration;return p.durations[mode]||catalog?.get(p.s)?.skills?.find(k=>k.animation===mode)?.duration||2.4;}
function nativeSeek(p,mode,t){const c=p.controller;if(p.path==='avian://jigglypuff'){c.setMode(mode);c.seek(t);}else if(typeof c.seek==='function')c.seek(mode,t);else c.setMode(mode);}
function start(p,canon){
 const plan=resolve(p,canon);p.plan=plan;p.canon=canon;p.time=0;p.hitDone=false;p.dur=Math.max(.4,duration(p,plan.mode)/(plan.speed||1));if(p.k0)p.root.scale.copy(p.k0);p.fx=null;p.fxT=0;if(plan.procedural)p.dur=canon==='Ultimate'?1.15:.55;
 if(plan.proc==='greet'||plan.proc==='cheer')p.dur=1.8;if(plan.proc==='hurt')p.dur=.9;
 if(p.controller){p.controller.setMode(plan.mode);nativeSeek(p,plan.mode,0);return;}
 p.mixer.stopAllAction();const clip=p.clips.find(c=>c.name===plan.mode);if(!clip)return;
 const a=p.mixer.clipAction(clip);a.reset().setLoop(T.LoopRepeat,Infinity).setEffectiveTimeScale(plan.speed||1).play();p.current=a;p.mixer.update(0);
}
// 程序補位動作：疊在模型的 display 群組上
/* ---------- 擂台特效（與遊戲擂台共用 arena-fx.js） ---------- */
const fxGroup=new T.Group();scene.add(fxGroup);let fxEffects=[],fxClock=0;
let dummyActor=null;
function fxClear(){fxGroup.clear();fxEffects=[];}
function fxTick(dt){fxClock+=dt;for(let i=fxEffects.length-1;i>=0;i--){const e=fxEffects[i],u=Math.min(1,(fxClock-e.start)/e.duration);e.update(u);if(u>=1){e.done?.();fxEffects.splice(i,1);}}}
function fxStep(p,dt){
 if(!p.plan?.vfx||!window.SpiritVfx)return;
 dummyActor??={root:dummy.g,object:dummy.g,worldSize:new T.Vector3(.9,2.3,.9),path:'dummy'};
 if(!p.fx){p.fxT=0;p.fx=SpiritVfx.script({T,path:p.path,strong:p.canon==='Ultimate',attacker:{root:p.display,object:p.root,worldSize:p.size,path:p.path,actions:{},height:p.height},defender:dummyActor,group:fxGroup,now:()=>fxClock,add:(d,fn,done)=>fxEffects.push({start:fxClock,duration:d,update:t=>fn(t,t*d),done}),sound:()=>{},color:p.s?.color,element:p.s?.element});}
 p.fxT+=dt;p.fx.update(Math.min(p.fxT,p.fx.total));
 const dir=dummy.g.position.clone().sub(p.base).setY(0),dist=dir.length();if(dist>1e-3)dir.divideScalar(dist);
 const gap=Math.max(1.2,Math.min(3.2,.3*p.height+.35*2.3+.6));
 p.display.rotation.y=Math.atan2(dir.x,dir.z);
 p.display.position.addScaledVector(dir,Math.max(0,dist-gap)*p.fx.approach(p.fxT));
 const ps=p.fx.pose?.(p.fxT);if(ps&&p.k0){p.display.position.y+=ps.y;p.root.scale.set(p.k0.x*(1+ps.sq),p.k0.y*(1-ps.sq),p.k0.z*(1+ps.sq));}else if(p.k0)p.root.scale.copy(p.k0);
 if(p.fxT>=p.fx.total+.35)p.fx=null;
}
function proc(p,u,t){const d=p.display,k=p.scale,h=p.height;d.position.copy(p.base);d.rotation.set(0,0,0);
 switch(p.plan?.proc){
  case 'run':d.position.y+=Math.abs(Math.sin(t*14))*.08*h;d.rotation.x=.12;break;
  case 'walk':d.position.y+=Math.abs(Math.sin(t*8))*.04*h;d.rotation.z=Math.sin(t*8)*.05;break;
  case 'greet':{const e=Math.sin(Math.min(1,u*1.25)*Math.PI);d.rotation.z=Math.sin(t*10)*.16*e;d.rotation.y=.25*e;d.position.y+=Math.max(0,Math.sin(t*10))*.06*h*e;break;}
  case 'cheer':{const j=x=>Math.max(0,Math.sin(Math.min(1,Math.max(0,(u-x)/.3))*Math.PI));const hop=j(.05)+j(.45);d.position.y+=hop*.35*h;d.rotation.y=Math.PI*2*Math.min(1,Math.max(0,(u-.45)/.35));break;}
  case 'hurt':{const e=Math.sin(Math.min(1,u*1.6)*Math.PI);d.position.z-=.22*h*e;d.rotation.x=-.25*e;d.position.x+=Math.sin(t*60)*.03*h*e;break;}
 }
}

/* ---------- 木頭人 ---------- */
const dummy=(()=>{const m=(c,r=.85)=>new T.MeshStandardMaterial({color:c,roughness:r});const wood=m('#9C6B3A'),woodDark=m('#6E4A28'),burlap=m('#D2B079'),rope=m('#8A5A2B'),straw=m('#E6C36A'),dark=m('#2B1C12',.5);
 const g=new T.Group(),body=new T.Group();g.add(body);const add=(geo,mat,x,y,z,par=body)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;par.add(o);return o;};
 add(new T.CylinderGeometry(.4,.44,.12,24),woodDark,0,.06,0,g);add(new T.CylinderGeometry(.09,.09,1.7,12),wood,0,.95,0);add(new T.CylinderGeometry(.27,.3,.66,20),burlap,0,1.08,0);
 for(const y of [.86,1.3])add(new T.TorusGeometry(.285,.022,8,24),rope,0,y,0).rotation.x=Math.PI/2;
 add(new T.BoxGeometry(1.2,.11,.11),wood,0,1.28,0);add(new T.SphereGeometry(.22,20,16),burlap,0,1.76,0);for(const x of [-.08,.08])add(new T.SphereGeometry(.03,8,8),dark,x,1.8,-.2);
 add(new T.ConeGeometry(.3,.26,20),straw,0,2.06,0);add(new T.CylinderGeometry(.42,.42,.03,24),straw,0,1.92,0);
 scene.add(g);return{g,body,mats:[burlap,wood],t:9,flash:0,power:1};})();
const texts=[];
function damageText(n,strong){const c=document.createElement('canvas');c.width=200;c.height=90;const g=c.getContext('2d');g.font='800 60px "Noto Sans TC",system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=9;g.strokeStyle='#4a2a12';g.strokeText('-'+n,100,46);g.fillStyle=strong?'#FFE27A':'#fff';g.fillText('-'+n,100,46);
 const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthTest:false}));sp.position.copy(dummy.g.position).add(new T.Vector3((Math.random()-.5)*.6,2.5,0));sp.scale.set(1.3,.6,1);scene.add(sp);texts.push({sp,age:0});}
function hitDummy(p){const sk=p.s?.skills?.[p.plan.attack]||{};dummy.t=0;dummy.flash=.22;dummy.power=p.plan.attack?1.5:1;damageText(sk.effect?0:Math.round((sk.power||p.s?.attack||20)*(.9+Math.random()*.2)),p.plan.attack===1);}
function stepDummy(dt){dummy.t+=dt;const k=Math.exp(-3*dummy.t),w=Math.cos(17*dummy.t)*.55*k*dummy.power;dummy.body.rotation.x=w;dummy.body.position.z=.22*Math.exp(-4.5*dummy.t)*dummy.power;dummy.flash=Math.max(0,dummy.flash-dt);dummy.mats.forEach(m=>m.emissive.setScalar(dummy.flash>0?.45:0));
 for(let i=texts.length-1;i>=0;i--){const t=texts[i];t.age+=dt;t.sp.position.y+=.9*dt;t.sp.material.opacity=Math.min(1,(1-t.age)*2.2);if(t.age>1){scene.remove(t.sp);t.sp.material.map.dispose();t.sp.material.dispose();texts.splice(i,1);}}}

/* ---------- 版面配置：家族並排、木頭人在前 ---------- */
function layout(){
 const widths=packs.map(p=>Math.max(.8,p.size.x));const gap=.7,total=widths.reduce((a,b)=>a+b,0)+gap*(packs.length-1);let x=-total/2;
 packs.forEach((p,i)=>{x+=widths[i]/2;p.base.set(x,0,0);p.display.position.copy(p.base);x+=widths[i]/2+gap;});
 const depth=Math.max(...packs.map(p=>p.size.z)),tall=Math.max(...packs.map(p=>p.height));
 dummy.g.position.set(total*.5+1.1,0,Math.max(1.8,depth*.5+1.3));dummy.g.rotation.y=Math.atan2(-dummy.g.position.x,-dummy.g.position.z)+Math.PI;
 fitW=Math.max(total+2.6,3.4);fitH=Math.max(tall*1.25,2.6);span=Math.max(fitW,fitH);target.set(.45,Math.min(tall*.45,1.6),dummy.g.position.z*.3);
 key.target.position.copy(target);key.shadow.camera.left=-span;key.shadow.camera.right=span;key.shadow.camera.top=span;key.shadow.camera.updateProjectionMatrix();cameraUpdate();}
function cameraUpdate(){const tn=2*Math.tan(camera.fov*Math.PI/360),d=Math.max(fitH/tn,fitW/(tn*camera.aspect))*zoom*1.08+(dummy.g.position.z*.3),cp=Math.cos(pitch);camera.position.set(target.x+Math.sin(angle)*d*cp,target.y+Math.sin(pitch)*d,target.z+Math.cos(angle)*d*cp);camera.lookAt(target);}
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();cameraUpdate();}new ResizeObserver(resize).observe(host);

/* ---------- 介面 ---------- */
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const BEATS={光:'焰',焰:'森',森:'潮',潮:'雷',雷:'念',念:'光'};
function buttons(){
 const mk=(box,list)=>$(box).replaceChildren(...list.map(([k,label])=>{const b=document.createElement('button');b.type='button';b.dataset.motion=k;b.textContent=label;b.onclick=()=>play(k);return b;}));
 mk('g-basic',MOTIONS);mk('g-moves',MOVES);
 const sel=selected?.s;if(sel)MOVES.forEach(([k],i)=>{const b=document.querySelector('[data-motion="'+k+'"]'),sk=sel.skills?.[i];if(sk){b.innerHTML=MOVES[i][1]+' · '+esc(sk.name);}});
 document.querySelectorAll('#g-moves button').forEach(b=>b.disabled=!!selected?.hero&&false);
 $('outfit-row').hidden=!packs.some(p=>p.hero);
}
function pressed(){document.querySelectorAll('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.motion===motion)));const label=[...MOTIONS,...MOVES].find(m=>m[0]===motion)?.[1]||motion;const fills=packs.filter(p=>p.plan?.proc).map(p=>p.s?.name||'主角');$('now').textContent=label;$('desc').textContent=DESC[motion]+(fills.length&&!['Attack','Ultimate'].includes(motion)?'（'+fills.join('、')+' 以程序動作補上）':'');$('pause').textContent=paused?'繼續':'暫停';$('pause').setAttribute('aria-pressed',String(paused));}
function play(canon){motion=canon;paused=false;fxClear();for(const p of packs)start(p,canon);pressed();}
function info(p){selected=p;document.querySelectorAll('#members button').forEach(b=>b.classList.toggle('active',b.dataset.id===p.id));const s=p.s;
 if(!s){$('card-name').textContent='初光旅人';$('card-tag').textContent='主角 · 六種造型';$('element').textContent='—';$('matchup').textContent='—';$('stats').textContent='—';$('skill0').textContent='Attack';$('skill1').textContent='Throw';$('evolution').textContent=C.evolution(null,byId);$('description').textContent='沿用遊戲目前造型；在這裡試穿不會改動存檔。';$('cardPortrait').hidden=true;buttons();return;}
 $('card-name').textContent=s.name;$('card-tag').textContent='No.'+catalog.number(s)+' · '+(s.type||'')+' · '+(s.stageLabel||'第 '+s.stage+' 階段')+' · '+(s.rarity||'普通');
 $('element').textContent=s.type;$('matchup').textContent='剋制 '+(BEATS[s.type]||'—')+'・被 '+(Object.keys(BEATS).find(k=>BEATS[k]===s.type)||'—')+' 剋制';
 $('stats').textContent='HP '+s.hp+'・攻擊 '+s.attack;
 const sk=i=>{const k=s.skills?.[i];return k?k.name+'（'+(k.effect==='eggArmour'?'對手攻擊減半':k.effect==='eggRecover'?'回復 90% HP':'威力 '+k.power)+'・'+(k.cost||1)+' 能量）':'—';};$('skill0').textContent=sk(0);$('skill1').textContent=sk(1);
 $('evolution').textContent=C.evolution(s,byId);$('description').textContent=s.description||'';
 const art=portraitMap[s.id],fig=$('cardPortrait');fig.dataset.frame=s.cardFrame||'default';fig.hidden=!art?.image;if(art?.image){fig.querySelector('img').src=art.image;fig.querySelector('img').alt=s.name+'圖鑑肖像';$('portrait-caption').textContent='No.'+catalog.number(s)+' · '+s.name;}
 buttons();pressed();}
async function select(fid,write=true){
 const fam=families.find(f=>f.id===fid)||families[0];const token=++serial;$('error').hidden=true;$('status').textContent='載入 '+fam.label+'…';
 try{const built=[];for(const id of fam.ids)built.push(await build(id));if(token!==serial||dead){built.forEach(release);return;}
  packs.forEach(release);packs=built;family=fam;
  for(const p of packs){scene.add(p.display);p.display.updateMatrixWorld(true);const b=bounds(p.display),h=p.hero?2.55:(p.s.height||1.3),k=h/Math.max(.01,b.max.y-b.min.y);p.root.scale.multiplyScalar(k);p.k0=p.root.scale.clone();p.display.updateMatrixWorld(true);const b2=bounds(p.display),c=b2.getCenter(new T.Vector3());p.root.position.x-=c.x;p.root.position.z-=c.z;p.root.position.y-=b2.min.y;p.size=b2.getSize(new T.Vector3());p.height=p.size.y;p.scale=k;}
  layout();
  $('members').replaceChildren(...packs.map(p=>{const b=document.createElement('button');b.dataset.id=p.id;b.textContent=p.s?p.s.name:'主角';b.onclick=()=>info(p);return b;}));
  $('model-title').textContent=fam.label;$('lede').textContent=fam.ids.length>1?'同一進化線一起展示（依實際體型比例）；前方的木頭人是招式目標，按招式可看到出手與受擊。':'前方的木頭人是招式目標，按招式可看到出手與受擊。';
  $('subject').value=fam.id;info(packs[packs.length-1]);play(motion);
  $('status').textContent=packs.map(p=>(p.s?.name||'主角')+'：'+(p.controller?'原生 Three.js':'GLB')).join('｜');
  if(write){const u=new URL(location.href);u.searchParams.set('subject',fam.id);history.replaceState(null,'',u);}
 }catch(e){if(token===serial)error(e);}
}
for(const [id,name]of Object.entries(C.suits)){const b=document.createElement('button');b.textContent=name;b.dataset.suit=id;b.onclick=()=>{suit=id;for(const p of packs)if(p.hero)heroCostumes.apply(p.root,id);document.querySelectorAll('[data-suit]').forEach(x=>x.classList.toggle('active',x.dataset.suit===suit));};$('outfit-buttons').append(b);}
$('subject').onchange=e=>select(e.target.value);$('retry').onclick=()=>select(family?.id||families[0].id);
$('pause').onclick=()=>{paused=!paused;pressed();};
$('search').oninput=e=>{const q=e.target.value.trim().toLowerCase();for(const o of $('subject').options)o.hidden=!!q&&!o.dataset.search.includes(q);};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{const k=b.dataset.view;angle=({front:0,three:.6,side:Math.PI/2,back:Math.PI,top:.3})[k];pitch=k==='top'?1.05:.2;zoom=1;cameraUpdate();};
const pointers=new Map();let pinch=0;const cv=renderer.domElement;
cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);};
cv.onpointermove=e=>{const prev=pointers.get(e.pointerId);if(!prev)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch)zoom=T.MathUtils.clamp(zoom*pinch/d,.35,2.4);pinch=d;}else{angle-=(e.clientX-prev[0])*.007;pitch=T.MathUtils.clamp(pitch+(e.clientY-prev[1])*.004,-.15,1.2);}cameraUpdate();};
for(const ev of ['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(ev,e=>{pointers.delete(e.pointerId);pinch=0;});
cv.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom*Math.exp(e.deltaY*.001),.35,2.4);cameraUpdate();},{passive:false});
$('snapshot').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download=(family?.label||'模型室')+'-'+motion+'.png';a.href=cv.toDataURL('image/png');a.click();};

/* ---------- 主迴圈 ---------- */
function frame(now){requestAnimationFrame(frame);const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;if(dead)return;
 try{if(!paused)for(const p of packs){p.time+=dt;const t=p.time,u=(t%p.dur)/p.dur;
   if(p.controller){let left=dt;while(left>1e-8){const s=Math.min(1/60,left);p.controller.update(s);left-=s;}
    if(!LOOP.has(p.plan.mode)&&t>=p.dur){p.time=0;p.hitDone=false;nativeSeek(p,p.plan.mode,0);}}
   else p.mixer.update(dt);
   if(p.plan.attack!=null){if(u<.05)p.hitDone=false;if(!p.hitDone&&u>=p.plan.release){p.hitDone=true;hitDummy(p);}}
   p.guanpangFx?.update(p.plan.mode,p.current?.time||0);p.duoFx?.update(p.plan.mode,p.current?.time||0);if(p.hero)heroCostumes.update(p.root,dt);
   proc(p,u,t);fxStep(p,dt);}
  fxTick(paused?0:dt);stepDummy(dt);renderer.render(scene,camera);}catch(e){paused=true;pressed();error(e);}}
requestAnimationFrame(frame);
window.HeroReview={get packs(){return packs;},renderer,scene,camera,play,select,getState:()=>({family:family?.id,motion,members:packs.map(p=>({id:p.id,mode:p.plan?.mode,proc:p.plan?.proc||null,modes:p.modes}))})};
addEventListener('pagehide',()=>{dead=true;++serial;packs.forEach(release);packs=[];renderer.dispose();});

/* ---------- 讀取圖鑑，依家族建立選單 ---------- */
try{const [data,def,art]=await Promise.all(['data/spirits.json','data/spirit-catalog.json','data/card-art.json'].map(p=>fetch(p+'?v='+C.revision,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(p+'：HTTP '+r.status);return r.json();})));
 spirits=data.spirits||data;catalog=SpiritCatalog.create(def);portraitMap=art.cards||art.art||art;for(const s of spirits)byId[s.id]=s;
 const groups=(def.groups||[]).map(g=>({id:g.id,ids:catalog.sort(g.ids.filter(id=>byId[id]))})).filter(g=>g.ids.length);
 const seen=new Set(groups.flatMap(g=>g.ids));for(const s of catalog.sort(spirits))if(!seen.has(s.id))groups.push({id:s.id,ids:[s.id]});
 groups.sort((a,b)=>(catalog.get(a.ids[0])?.order||999)-(catalog.get(b.ids[0])?.order||999));
 // 家族成員超過 3 隻時（三色蛋＋鳥族）拆成兩組，避免舞台太擠
 families=[{id:'hero',ids:['hero'],label:'主角 · 初光旅人'}];
 for(const g of groups){const chunks=g.ids.length>3?[g.ids.slice(0,Math.ceil(g.ids.length/2)),g.ids.slice(Math.ceil(g.ids.length/2))]:[g.ids];chunks.forEach((ids,i)=>families.push({id:chunks.length>1?g.id+'-'+i:g.id,ids,label:ids.map(id=>byId[id].name).join(' → ')}));}
 for(const f of families){const o=document.createElement('option');o.value=f.id;const nums=f.ids.filter(id=>byId[id]).map(id=>catalog.number(id));o.textContent=(nums.length?'No.'+nums[0]+(nums.length>1?'–'+nums[nums.length-1]:'')+' ':'')+f.label;o.dataset.search=[o.textContent,...f.ids.map(id=>[byId[id]?.type,byId[id]?.rarity].join(' '))].join(' ').toLowerCase();$('subject').append(o);}
 $('coverage').textContent='主角 ＋ '+spirits.length+' 種幻靈 · '+(families.length-1)+' 個家族 · 依圖鑑編號排序';
 const q=new URLSearchParams(location.search).get('subject');const fam=families.find(f=>f.id===q)||families.find(f=>f.ids.includes(q))||families[1]||families[0];
 resize();buttons();await select(fam.id,false);
}catch(e){error(e);}
})().catch(e=>{const box=document.getElementById('error');box.hidden=false;document.getElementById('error-message').textContent=e.message;console.error(e);});
