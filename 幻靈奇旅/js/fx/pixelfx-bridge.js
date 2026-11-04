/* 幻靈奇旅 × pixelfx 共用特效引擎。
   只負責畫面：fx.emit() 由已發生的遊戲事件觸發，絕不修改血量、天氣、掉寶、貨幣或存檔，
   也不碰全域天空／霧／曝光。圖集由 authoring/pixelfx-build.mjs 離線烘好，玩家端只讀靜態 PNG＋JSON。
   回退：?pixelfx=0 或 localStorage phantom-pixelfx=off；單一圖集載入失敗時 emit 回報 ok:false，由呼叫端播舊特效。 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;root.PixelFX=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){'use strict';
const VERSION='20261106-pixelfx-v1';
const script=root.document?.currentScript?.src||'';
const BASE=script?script.replace(/js\/fx\/pixelfx-bridge\.js.*$/,''):'';
const SETTING='phantom-pixelfx';
function enabled(){try{const q=new URLSearchParams(root.location?.search||'').get('pixelfx');if(q==='0'||q==='off')return false;if(q==='1'||q==='on')return true;return root.localStorage?.getItem(SETTING)!=='off';}catch{return true;}}
function lowPower(){try{return !!(root.matchMedia?.('(max-width: 820px)').matches||root.matchMedia?.('(pointer: coarse)').matches||root.navigator?.connection?.saveData);}catch{return false;}}
const LIMITS={high:{instances:48,ambient:12,memory:96e6,gap:.03},low:{instances:24,ambient:5,memory:40e6,gap:.07}};

/* ---------- 對照表（純函式，Node 測試也用這段） ---------- */
function ruleMatches(m,ev){if(!m)return true;for(const k of Object.keys(m)){const want=m[k],got=ev[k];if(k==='skill'){if(!new RegExp(want,'i').test(got||''))return false;}else if(Array.isArray(want)){if(!want.includes(got))return false;}else if(want!==got)return false;}return true;}
function resolve(map,ev){const list=map?.events?.[ev.mode+'.'+ev.event];if(!list)return null;for(const rule of list){if(rule.disabled)continue;if(ruleMatches(rule.match,ev))return rule;}return null;}
function idsForMode(map,mode,all=false){const out=new Set();for(const key of Object.keys(map?.events||{})){if(key.split('.')[0]!==mode)continue;for(const rule of map.events[key]){if(rule.disabled&&!all)continue;for(const f of rule.fx||[])out.add(f.id);}}return [...out];}

/* ---------- 共用資料：manifest、對照表、圖片 ---------- */
let manifest=null,map=null,dataPromise=null;
const images=new Map();   // id → {img,bytes,state,promise,last,tex}
const stats={played:0,skipped:0,failed:0,dropped:0,textures:0,textureBytes:0,peak:0,active:0,pooled:0,emits:{}};
function data(){if(dataPromise)return dataPromise;const get=f=>fetch(BASE+f+'?v='+VERSION).then(r=>{if(!r.ok)throw Error(f+' '+r.status);return r.json();});dataPromise=Promise.all([get('assets/fx/pixelfx/manifest.json'),get('js/fx/pixelfx-map.json')]).then(([a,b])=>{manifest=a;map=b;return true;}).catch(e=>{console.warn('pixelfx 無法載入，改用原特效：',e.message);manifest=null;map=null;return false;});return dataPromise;}
function loadImage(id){let e=images.get(id);if(e)return e.promise;const info=manifest?.effects?.[id];if(!info||typeof Image==='undefined')return Promise.resolve(null);e={id,info,state:'loading',bytes:info.w*info.h*4,last:0,users:0,img:null,tex:null,promise:null};e.promise=new Promise(done=>{const img=new Image();img.onload=()=>{e.img=img;e.state='ready';done(e);};img.onerror=()=>{e.state='failed';stats.failed++;done(null);};img.src=BASE+'assets/fx/pixelfx/'+info.file+'?v='+VERSION;});images.set(id,e);return e.promise;}
function evict(limit){let total=0;const idle=[];for(const e of images.values())if(e.tex){total+=e.bytes;if(!e.users)idle.push(e);}if(total>limit){idle.sort((a,b)=>a.last-b.last);for(const e of idle){if(total<=limit)break;e.tex.dispose();e.tex=null;total-=e.bytes;}}stats.textureBytes=total;stats.textures=[...images.values()].filter(e=>e.tex).length;}
function texture(T,e){if(!e.tex){const t=new T.Texture(e.img);t.flipY=false;t.generateMipmaps=false;t.minFilter=t.magFilter=T.NearestFilter;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.needsUpdate=true;e.tex=t;}return e.tex;}

/* ---------- 3D 世界 ---------- */
const VERT=`uniform vec4 uRect;uniform vec2 uPivot;uniform float uRot;uniform float uFlat;uniform float uLift;varying vec2 vUv;
void main(){vUv=uRect.xy+vec2(uv.x,1.-uv.y)*uRect.zw;vec2 p=position.xy-uPivot;float c=cos(uRot),s=sin(uRot);p=vec2(p.x*c-p.y*s,p.x*s+p.y*c);
if(uFlat>.5){gl_Position=projectionMatrix*modelViewMatrix*vec4(p,0.,1.);return;}
vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);mv.xy+=p*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));mv.xyz+=normalize(-mv.xyz)*uLift;gl_Position=projectionMatrix*mv;}`;
/* 貼圖以原始 sRGB 位元組取樣、不經 encodings 區塊直接輸出，畫面顏色等於像素原稿。 */
const FRAG=`uniform sampler2D uMap;uniform vec4 uTint;uniform float uOpacity;varying vec2 vUv;
void main(){vec4 c=texture2D(uMap,vUv);if(c.a<.02)discard;float l=dot(c.rgb,vec3(.3,.59,.11));c.rgb=mix(c.rgb,uTint.rgb*min(1.5,l*1.7),uTint.a);gl_FragColor=vec4(c.rgb,c.a*uOpacity);}`;
const RENDER_ORDER=40,PIXEL=.032;   // 1 來源像素 = 0.032 世界單位（scale 1）
function hex(v){return typeof v==='string'?parseInt(v.replace('#',''),16):v;}
function create({THREE:T,parent,camera,sceneId='world',quality}={}){
 const tier=quality||(lowPower()?'low':'high'),L=LIMITS[tier],on=enabled()&&!!T&&!!parent;
 const geometry=on?new T.PlaneGeometry(1,1).translate(.5,.5,0):null,free=[],active=[],timers=[],attached=new Map(),ambientSets=new Map();
 const material=()=>new T.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,transparent:true,depthWrite:false,depthTest:true,fog:false,toneMapped:false,side:T.DoubleSide,uniforms:{uMap:{value:null},uRect:{value:new T.Vector4()},uPivot:{value:new T.Vector2()},uRot:{value:0},uFlat:{value:0},uLift:{value:1.2},uTint:{value:new T.Vector4(1,1,1,0)},uOpacity:{value:1}}});
 const from=on?new T.Vector3():null,to=on?new T.Vector3():null,v=on?new T.Vector3():null;let disposed=false,clock=0;const lastEmit=new Map();
 function release(i){const a=active[i];active.splice(i,1);a.entry.users=Math.max(0,(a.entry.users||0)-1);a.mesh.visible=false;a.mesh.material.uniforms.uMap.value=null;parent.remove(a.mesh);free.push(a.mesh);if(a.key&&attached.get(a.key)===a)attached.delete(a.key);}
 function acquire(priority){if(active.length>=L.instances){const victim=active.findIndex(a=>a.priority<priority||(priority>=1&&a.priority<=priority&&!a.loop));if(victim<0){stats.dropped++;return null;}release(victim);}let m=free.pop();if(!m){m=new T.Mesh(geometry,material());m.frustumCulled=false;m.renderOrder=RENDER_ORDER;}if(m.parent!==parent)parent.add(m);m.visible=true;return m;}
 function frameOf(a){const i=a.info,n=i.frames,raw=Math.floor(a.t*a.rate*i.fps),f=a.loop?raw%n:Math.min(n-1,raw);a.mesh.material.uniforms.uRect.value.set((f%i.cols)*i.cell[0]/i.w,Math.floor(f/i.cols)*i.cell[1]/i.h,i.cell[0]/i.w,i.cell[1]/i.h);}
 function place(a){let p=a.pos;if(a.follow){const f=a.follow();if(f===null)a.stopAt??=a.t;else if(f)p=a.pos=f;}if(a.travel&&a.from&&a.to){const k=Math.min(1,a.t/a.travel),fr=typeof a.from==='function'?a.from():a.from,tt=typeof a.to==='function'?a.to():a.to;v.set(fr.x+(tt.x-fr.x)*k,fr.y+(tt.y-fr.y)*k,fr.z+(tt.z-fr.z)*k);a.mesh.position.copy(v);if(a.orient&&camera){from.set(fr.x,fr.y,fr.z).project(camera);to.set(tt.x,tt.y,tt.z).project(camera);a.mesh.material.uniforms.uRot.value=Math.atan2((to.y-from.y)/(camera.aspect||1),to.x-from.x);}return;}if(p)a.mesh.position.set(p.x,p.y+a.offsetY+a.rise*a.t,p.z);}
 function start(e,o){const priority=o.priority??(o.ambient?0:1);if(o.ambient&&active.filter(a=>a.ambient).length>=L.ambient)return null;const mesh=acquire(priority);if(!mesh)return null;const info=e.info,u=mesh.material.uniforms,s=(o.scale??1)*PIXEL;
  e.users=(e.users||0)+1;e.last=clock;u.uMap.value=texture(T,e);u.uPivot.value.set(info.pivot[0]/info.cell[0],1-info.pivot[1]/info.cell[1]);u.uRot.value=o.angle||0;u.uFlat.value=o.plane==='ground'?1:0;u.uLift.value=o.lift??1.2;
  const c=o.tint==null?null:new T.Color(hex(o.tint));u.uTint.value.set(c?c.r:1,c?c.g:1,c?c.b:1,c?(o.tintAmount??.85):0);u.uOpacity.value=o.opacity??1;
  mesh.material.depthTest=o.depthTest!==false;mesh.material.blending=o.additive?T.AdditiveBlending:T.NormalBlending;mesh.scale.set(info.cell[0]*s*(o.flip?-1:1),info.cell[1]*s,1);
  if(o.plane==='ground')mesh.rotation.set(-Math.PI/2,0,o.yaw||0);else mesh.rotation.set(0,0,0);
  const a={mesh,entry:e,info,t:0,rate:(o.rate??1)*(o.fitDuration?info.duration/o.fitDuration:1),loop:o.loop??false,hold:o.hold??0,fade:o.fade??.12,opacity:o.opacity??1,priority,ambient:!!o.ambient,key:o.key||null,follow:o.follow||null,pos:o.pos?{x:o.pos.x,y:o.pos.y,z:o.pos.z}:null,offsetY:o.followY||0,from:o.from||null,to:o.to||null,travel:o.travel||0,rise:o.rise||0,orient:!!o.orient,stopAt:null};
  frameOf(a);place(a);active.push(a);stats.active=active.length;stats.played++;stats.peak=Math.max(stats.peak,active.length);return a;}
 function ready(id){const e=images.get(id);return e?.state==='ready'?e:null;}
 /* 單一效果：尚未載入完成回傳 null，並在背景開始載入，下一次就能播。 */
 function play(id,o={}){if(!on||disposed)return null;const e=ready(id);if(!e){stats.skipped++;if(manifest)void loadImage(id);else void data();return null;}if(o.key){const old=attached.get(o.key);if(old){if(old.entry===e&&old.stopAt==null)return old;const i=active.indexOf(old);if(i>=0)release(i);}}const a=start(e,o);if(a&&o.key)attached.set(o.key,a);return a;}
 function resolveAt(item,ev){const anchor=item.anchor||'at',base=anchor==='from'?(ev.from||ev.at):anchor==='to'?(ev.to||ev.at):(ev.at||ev.to||ev.from);if(!base)return null;const ground=item.ground?0:(base.y||0);return{x:base.x+(item.x||0),y:ground+(item.y||0),z:base.z+(item.z||0)};}
 function fire(item,ev){const pos=resolveAt(item,ev);if(!pos)return false;const scale=(item.scale??1)*(ev.intensity??1),tint=item.tint==='element'?ev.tint:item.tint,travel=item.travel?(ev.duration||item.travel):0;return !!play(item.id,{...item,pos,scale,tint,travel,from:travel?ev.from:null,to:travel?ev.to:null,key:item.key?(ev.key||'')+':'+item.key:undefined,follow:item.track?ev.follow:null,fitDuration:item.fit?(ev.duration||item.fit):undefined,loop:item.loop||false});}
 /* 由遊戲事件播放：{mode,event,speciesId,element,strong,kind,skill,at,from,to,...}。回傳 {ok} 讓呼叫端決定是否退回舊特效。 */
 function emit(ev){if(!on||disposed)return{ok:false,legacy:true};if(!map){void data();return{ok:false,legacy:true};}const rule=resolve(map,ev),key=ev.mode+'.'+ev.event;stats.emits[key]=(stats.emits[key]||0)+1;if(!rule)return{ok:false,legacy:true,unmapped:true};if(rule.keep)return{ok:false,legacy:true,kept:true};const tag=key+':'+(ev.key||'');if(!ev.force&&clock-(lastEmit.get(tag)??-9)<L.gap)return{ok:true,legacy:false,throttled:true};lastEmit.set(tag,clock);let shown=0;for(const item of rule.fx||[]){if(tier==='low'&&item.optional)continue;if(item.delay){timers.push({at:clock+item.delay,item,ev});shown++;continue;}if(fire(item,ev))shown++;}return{ok:shown>0,legacy:shown===0||!!rule.overlay,rule};}
 function preload(mode){if(!on)return Promise.resolve(false);const modes=Array.isArray(mode)?mode:[mode];return data().then(okay=>okay?Promise.all(modes.flatMap(m=>idsForMode(map,m)).map(loadImage)).then(()=>true):false);}
 /* 常駐（燃燒／冰凍／護盾…）：同一 key 只留一個實例，狀態結束即淡出。 */
 function attach(key,id,follow,o={}){return play(id,{...o,key,follow,loop:true,pos:follow()||{x:0,y:0,z:0}});}
 function detach(key){const a=attached.get(key);if(a)a.stopAt??=a.t;}
 function detachPrefix(prefix){for(const [k,a] of attached)if(k.startsWith(prefix))a.stopAt??=a.t;}
 /* 環境粒子：低密度循環，圍繞 center() 隨機散布；手機自動減半，不做任何全域光影改動。 */
 function ambient(name,items,center){if(on)ambientSets.set(name,{items:items.map(i=>({...i,next:0})),center});}
 function ambientFrom(name,key,center){if(on)void data().then(okay=>{if(okay&&!disposed&&map.ambient?.[key])ambient(name,map.ambient[key],center);});}
 function clearAmbient(name){if(name)ambientSets.delete(name);else ambientSets.clear();}
 function update(dt){if(!on||disposed)return;clock+=dt;for(let i=timers.length-1;i>=0;i--)if(timers[i].at<=clock){const j=timers.splice(i,1)[0];fire(j.item,j.ev);}
  for(const set of ambientSets.values()){const c=set.center();if(!c)continue;for(const it of set.items){if(clock<it.next)continue;it.next=clock+(it.every||2)*(tier==='low'?2:1)*(.7+Math.random()*.6);const a=Math.random()*6.283,r=(it.radius||10)*Math.sqrt(Math.random());play(it.id,{ambient:true,pos:{x:c.x+Math.cos(a)*r,y:(it.ground?0:(c.y||0))+(it.y??2),z:c.z+Math.sin(a)*r},scale:it.scale??1,opacity:it.opacity??.75,plane:it.plane,rate:it.rate,loop:!!it.hold,hold:it.hold||0,rise:it.rise,lift:it.lift??.2});}}
  for(let i=active.length-1;i>=0;i--){const a=active[i];a.t+=dt;const dur=a.info.frames/(a.info.fps*a.rate);let done=false;if(a.stopAt!=null){const k=(a.t-a.stopAt)/a.fade;a.mesh.material.uniforms.uOpacity.value=a.opacity*Math.max(0,1-k);done=k>=1;}else if(a.loop){if(a.hold&&a.t>=a.hold)a.stopAt=a.t;}else if(a.t>=dur+a.hold)a.stopAt=a.t;if(done){release(i);continue;}frameOf(a);place(a);}
  evict(L.memory);stats.active=active.length;stats.pooled=free.length;}
 /* 換模式／重賽／失焦：只清掉這個 fx 正在播放的內容；貼圖留在快取給下次重用，超量時由 evict 回收。 */
 function clear(){timers.length=0;ambientSets.clear();for(let i=active.length-1;i>=0;i--)release(i);attached.clear();stats.active=0;}
 function dispose(){if(disposed)return;clear();disposed=true;for(const m of free)m.material.dispose();free.length=0;geometry?.dispose();stats.pooled=0;}
 const snapshot=()=>({...stats,tier,on,sceneId,active:active.length,pooled:free.length,timers:timers.length,attached:attached.size});
 if(on)void data();
 return{emit,play,attach,detach,detachPrefix,preload,ambient,ambientFrom,clearAmbient,update,clear,dispose,stats:snapshot,get enabled(){return on;},tier};
}

/* ---------- 2D 介面層：絕不攔截點擊，靜止時不跑 rAF ---------- */
let layer=null,raf=0,last=0;const sprites=[];
function ensureLayer(){if(layer)return layer;const c=document.createElement('canvas');c.setAttribute('aria-hidden','true');c.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000;image-rendering:pixelated';document.body.appendChild(c);layer=c;return c;}
function overlayFrame(now){raf=0;const c=layer;if(!c)return;const dt=Math.min(.05,(now-last)/1000||0);last=now;const w=c.width=Math.ceil(innerWidth),h=c.height=Math.ceil(innerHeight),g=c.getContext('2d');g.imageSmoothingEnabled=false;for(let i=sprites.length-1;i>=0;i--){const s=sprites[i];s.t+=dt;const info=s.e.info,f=Math.floor(s.t*(s.rate||1)*info.fps);if(f>=info.frames){sprites.splice(i,1);continue;}const k=s.scale,cw=info.cell[0],ch=info.cell[1],dx=Math.round(s.x*w-info.pivot[0]*k),dy=Math.round(s.y*h-info.pivot[1]*k);g.drawImage(s.e.img,(f%info.cols)*cw,Math.floor(f/info.cols)*ch,cw,ch,dx,dy,cw*k,ch*k);}if(sprites.length)raf=requestAnimationFrame(overlayFrame);else g.clearRect(0,0,w,h);}
function overlay(id,{x=.5,y=.26,scale,rate}={}){if(!enabled()||typeof document==='undefined')return Promise.resolve(false);return data().then(okay=>okay&&loadImage(id)).then(e=>{if(!e?.img)return false;ensureLayer();const k=scale||Math.max(1,Math.min(3,Math.round(Math.min(innerWidth,innerHeight)/240)));if(sprites.length>=6)sprites.shift();sprites.push({e,t:0,scale:k,rate,x,y});if(!raf){last=performance.now();raf=requestAnimationFrame(overlayFrame);}return true;});}
/* 依對照表播 UI 事件（ui.* 規則，fx 項目的 x／y 為螢幕比例） */
function ui(mode,event,ev={}){if(!enabled())return;return data().then(okay=>{if(!okay)return;const rule=resolve(map,{mode,event,...ev});for(const f of rule?.fx||[])void overlay(f.id,f);});}

/* 依模型路徑分家族：同一家族的三階段共用招式特效。 */
const FAMILY=/(pepper-chick|water-dog|water-fairy|fire-bear|cat-girl|ahong-cowboy|starlight-mage|guanpang|fire-monkey|outoman)/;
const familyOf=path=>(FAMILY.exec(path||'')||[])[1]||null;
return{create,overlay,ui,resolve,familyOf,ruleMatches,idsForMode,enabled,lowPower,LIMITS,VERSION,stats};
});
