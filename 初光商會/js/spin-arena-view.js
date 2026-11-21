import{createSpinModels}from'./spin-arena-models.js?v=20261121-storybook';
import{createSpinSkillEffects}from'./spin-arena-skills.js?v=20261121-storybook';
import{SPIN_FX}from'./spin-arena-paths.js?v=20261121-storybook';
import{SPIN_TOPS,SPIN_RULES}from'./spin-arena-config.js?v=20261121-storybook';
const SPIN_TOP=id=>SPIN_TOPS.find(t=>t.id===id)||{color:0xffffff,metal:0xdddddd,blades:6};
/* 3D 對戰畫面。勝負、傷害、碰撞全部由 spin-arena-core 決定；這裡只依模擬結果演出。
 * 場地為舊版兩倍（模型等比放大），陀螺縮小 15%；平時用全景鏡頭，只有施放技能時才特寫施放者。
 * 技能演出（參考動畫必殺技）：場景壓暗、能量光柱與螺旋環、陀螺後方浮現守護靈（沿用該陀螺既有收藏卡圖）、低角度環繞特寫；
 * 既有技能序列圖（GIF）與登場卡照原時序播放，不裁切、不替換。 */
const POOL={sparks:36,rings:5,ghosts:6,particles:56};
const AS=SPIN_RULES.radius/2.25,TOP_SCALE=1.08*.85,LIFT=.34*(AS-1);
/* 碗狀場地表面高度（與 spin-arena-models 的車削剖面一致），換算到遊戲座標 */
const PROFILE=[[0,.34],[.7,.35],[1.5,.40],[2.1,.52],[2.45,.72],[2.58,.76]];
function bowl(r){r=Math.abs(r);for(let k=1;k<PROFILE.length;k++){const [r0,y0]=PROFILE[k-1],[r1,y1]=PROFILE[k];if(r<=r1)return y0+(y1-y0)*(r-r0)/(r1-r0);}return PROFILE.at(-1)[1];}
export const spinFloorY=(x,z)=>AS*bowl(Math.hypot(x,z)/AS)-LIFT;
/* 12 顆陀螺的招牌演出，各對應參考影片（紅修招式盤點）的一招；只加 3D 特效，陀螺名稱、技能名稱、數值與既有 GIF 不變 */
export const SPIN_SIGNATURES={
 flame:{kind:'reverse',ref:'逆轉攻擊／真逆轉攻擊：加粗火焰尾、連續爆炎'},
 wind:{kind:'arcs',ref:'上空攻擊：場地上紅藍兩道弧形軌跡'},
 crystal:{kind:'absorb',ref:'鎮魂回旋：吸取對手旋轉力，能量流向自己'},
 thunder:{kind:'cross',ref:'星際火花：十字雷射與閃電'},
 shield:{kind:'dome',ref:'世界回旋：防禦模式金色護罩'},
 shadow:{kind:'slash',ref:'鎮魂斬擊：巨大弧形斬擊'},
 frost:{kind:'sigil',ref:'世界斬擊：地面圓陣與交叉線'},
 tide:{kind:'spiral',ref:'超上空攻擊：螺旋上升水流'},
 thorn:{kind:'zigzag',ref:'超逆轉攻擊：反轉改變軌跡與殘影'},
 terra:{kind:'quake',ref:'巨斧攻擊：蓄力重擊、連續震地'},
 sun:{kind:'awaken',ref:'超巨神斬擊：覺醒刃環繞'},
 nebula:{kind:'starburst',ref:'星際斬擊：星光放射斬擊'}
};
export function createSpinBattleView(canvas,{level=3,lowPower=false}={}){const T=globalThis.THREE,renderer=new T.WebGLRenderer({canvas,antialias:!lowPower,alpha:false});renderer.setPixelRatio(Math.min(lowPower?1:1.5,devicePixelRatio));renderer.setClearColor(0x21354a);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,90),models=createSpinModels(T),arena=models.arena({level});arena.scale.setScalar(AS);const hemi=new T.HemisphereLight(0xfff7e1,0x46556c,.8);scene.add(arena,hemi);const sun=new T.DirectionalLight(0xffffff,1.2);sun.position.set(6,14,8);scene.add(sun);
 /* 遊戲物件放在 play 群組：高度與舊版相同，場地放大造成的地面抬升由 LIFT 補回 */
 const play=new T.Group();play.position.y=LIFT;scene.add(play);
 const tops=[null,null],auras=[],blurs=[],fx=new T.Group();play.add(fx);const skills=createSpinSkillEffects(T,play);let angle=1,zoom=1,dead=false,frames=0;
 const geos=[],mats=[];const G=g=>(geos.push(g),g),M=m=>(mats.push(m),m);
 for(let i=0;i<2;i++){const ring=new T.Mesh(G(new T.TorusGeometry(.4,.04,6,40)),M(new T.MeshBasicMaterial({color:i?0x68d1ff:0xffbb5c,transparent:true,opacity:.6,depthWrite:false})));ring.rotation.x=-Math.PI/2;play.add(ring);auras.push(ring);}
 const sparkGeo=G(new T.SphereGeometry(.03,5,4)),sparks=Array.from({length:POOL.sparks},()=>{const p=new T.Mesh(sparkGeo,M(new T.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false})));p.visible=false;p.userData={};fx.add(p);return p;});
 const ringGeo=G(new T.RingGeometry(.55,.7,40)),rings=Array.from({length:POOL.rings},()=>{const r=new T.Mesh(ringGeo,M(new T.MeshBasicMaterial({color:0xffffff,transparent:true,side:T.DoubleSide,depthWrite:false})));r.rotation.x=-Math.PI/2;r.visible=false;r.userData={};fx.add(r);return r;});
 const ghostGeo=G(new T.CylinderGeometry(.42*TOP_SCALE,.18*TOP_SCALE,.3,20)),ghosts=[0,1].map(()=>Array.from({length:POOL.ghosts},()=>{const g=new T.Mesh(ghostGeo,M(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false})));g.visible=false;fx.add(g);return g;}));
 const partGeo={ember:G(new T.SphereGeometry(.045,5,4)),ice:G(new T.OctahedronGeometry(.06)),shard:G(new T.TetrahedronGeometry(.07)),leaf:G(new T.PlaneGeometry(.1,.05)),blade:G(new T.PlaneGeometry(.18,.03)),streak:G(new T.PlaneGeometry(.24,.025)),star:G(new T.OctahedronGeometry(.045)),bubble:G(new T.SphereGeometry(.05,6,5)),debris:G(new T.BoxGeometry(.07,.05,.06)),halo:G(new T.TorusGeometry(.06,.012,4,12)),arc:G(new T.PlaneGeometry(.04,.3))};
 const particles=Array.from({length:POOL.particles},()=>{const p=new T.Mesh(partGeo.ember,M(new T.MeshBasicMaterial({color:0xffffff,transparent:true,side:T.DoubleSide,depthWrite:false})));p.visible=false;p.userData={};fx.add(p);return p;});
 const bolts=[0,1].map(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(8*3),3));const l=new T.Line(G(g),M(new T.LineBasicMaterial({color:0xf6f0ff,transparent:true})));l.visible=false;play.add(l);return l;});
 const critTex=(()=>{const c=document.createElement('canvas');c.width=256;c.height=96;const x=c.getContext('2d');x.font='900 64px "Microsoft JhengHei",sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=10;x.strokeStyle='#5a1d00';x.strokeText('暴擊！',128,50);const g=x.createLinearGradient(0,10,0,90);g.addColorStop(0,'#fff7b0');g.addColorStop(.55,'#ffc42e');g.addColorStop(1,'#ff6a00');x.fillStyle=g;x.fillText('暴擊！',128,50);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;})();
 const critLabels=[0,1].map(()=>{const sp=new T.Sprite(M(new T.SpriteMaterial({map:critTex,transparent:true,depthTest:false,depthWrite:false})));sp.renderOrder=40;sp.scale.set(1.3,.5,1);sp.visible=false;sp.userData={};play.add(sp);return sp;});
 const shardGeo=G(new T.CylinderGeometry(.3,.1,.16,5,1,false,0,Math.PI*2/5)),shards=Array.from({length:10},()=>{const m=new T.Mesh(shardGeo,M(new T.MeshStandardMaterial({color:0xffffff,metalness:.6,roughness:.35,transparent:true})));m.visible=false;m.userData={};play.add(m);return m;});
 /* 必殺技舞台：能量光柱、上升螺旋環、守護靈（收藏卡圖）；每位選手一套，物件池重用 */
 const pillarGeo=G(new T.CylinderGeometry(.55,.85,4.2,28,1,true)),spiralGeo=G(new T.TorusGeometry(.75,.05,6,48));
 const finisher=[0,1].map(()=>{const pillar=new T.Mesh(pillarGeo,M(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})));const spirals=[0,1,2].map(()=>{const s=new T.Mesh(spiralGeo,M(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})));s.rotation.x=-Math.PI/2;return s;});pillar.renderOrder=3;for(const o of[pillar,...spirals]){o.visible=false;play.add(o);}return {pillar,spirals,until:0,start:0,actor:0};});
 /* 集中線與對撞閃光：掛在鏡頭前的看板，只在技能特寫／技能對撞時出現 */
 const lineTex=(()=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.translate(256,256);for(let k=0;k<120;k++){const a=Math.random()*Math.PI*2,r0=150+Math.random()*60,w=.004+Math.random()*.012;x.fillStyle=k%5?'rgba(255,255,255,.85)':'rgba(255,230,170,.9)';x.beginPath();x.moveTo(Math.cos(a-w)*r0,Math.sin(a-w)*r0);x.lineTo(Math.cos(a)*380,Math.sin(a)*380);x.lineTo(Math.cos(a+w)*r0,Math.sin(a+w)*r0);x.fill();}const t=new T.CanvasTexture(c);return t;})();
 const flashCanvas=document.createElement('canvas');flashCanvas.width=256;flashCanvas.height=8;const flashTex=new T.CanvasTexture(flashCanvas);
 const hud=(map,order,blending=T.AdditiveBlending)=>{const sp=new T.Sprite(M(new T.SpriteMaterial({map,transparent:true,opacity:0,depthTest:false,depthWrite:false,blending})));sp.renderOrder=order;sp.position.set(0,0,-1);sp.visible=false;camera.add(sp);return sp;};
 scene.add(camera);const speedLines=hud(lineTex,90),clashFlash=hud(flashTex,91);let clashAt=-9;
 function fitHud(sp){const h=2*Math.tan(camera.fov*Math.PI/360)*1.08;sp.scale.set(h*camera.aspect,h,1);}
 function clash(match,x,z){const a=SPIN_TOP(match.topId),b=SPIN_TOP(match.opponentTopId),ctx=flashCanvas.getContext('2d'),g=ctx.createLinearGradient(0,0,256,0),hex=c=>'#'+c.toString(16).padStart(6,'0');g.addColorStop(0,hex(a.color));g.addColorStop(.47,hex(a.color));g.addColorStop(.5,'#ffffff');g.addColorStop(.53,hex(b.color));g.addColorStop(1,hex(b.color));ctx.fillStyle=g;ctx.fillRect(0,0,256,8);flashTex.needsUpdate=true;clashAt=clockNow;
  const fy=spinFloorY(x,z);for(const bolt of clashBolts){const pos=bolt.geometry.attributes.position,a0=Math.random()*Math.PI*2;for(let k=0;k<8;k++){const d=k/7*1.6;pos.setXYZ(k,x+Math.cos(a0)*d+(Math.random()-.5)*.3,fy+.3+k*.12+(Math.random()-.5)*.2,z+Math.sin(a0)*d+(Math.random()-.5)*.3);}pos.needsUpdate=true;bolt.userData.until=clockNow+.35;bolt.visible=true;}}
 const clashBolts=[0,1,2].map(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(8*3),3));const l=new T.Line(G(g),M(new T.LineBasicMaterial({color:0xfff6c8,transparent:true})));l.visible=false;l.userData={};play.add(l);return l;});
 /* 十字雷射（暴擊）：地面上交叉的兩道光束 */
 const beamGeo=G(new T.PlaneGeometry(7,.09)),beams=[0,1].map(k=>{const m=new T.Mesh(beamGeo,M(new T.MeshBasicMaterial({color:0xff3b3b,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})));m.rotation.x=-Math.PI/2;m.visible=false;play.add(m);return m;});let beamAt=-9;
 function crossBeams(x,z){beamAt=clockNow;const a=Math.random()*Math.PI;beams.forEach((m,k)=>{m.position.set(x,spinFloorY(x,z)+.08,z);m.rotation.set(-Math.PI/2,0,a+(k?Math.PI/2:0));m.visible=true;});}
 /* 彗星火焰尾：技能中沿速度反方向拉長 */
 const cometGeo=G(new T.ConeGeometry(.32,1,18,1,true));cometGeo.translate(0,.5,0);cometGeo.rotateX(-Math.PI/2);
 const comets=[0,1].map(()=>{const m=new T.Mesh(cometGeo,M(new T.MeshBasicMaterial({color:0xff7a2a,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})));m.visible=false;play.add(m);return m;});
 /* 地面霓虹軌跡：記錄技能期間的實際移動路徑，畫成發光帶，技能結束後淡出 */
 const PATH_N=48,paths=[0,1].map(()=>{const g=new T.BufferGeometry(),pos=new Float32Array(PATH_N*2*3),idx=[];for(let k=0;k<PATH_N-1;k++){const a=k*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}g.setAttribute('position',new T.BufferAttribute(pos,3));g.setIndex(idx);const m=new T.Mesh(G(g),M(new T.MeshBasicMaterial({color:0xff4040,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})));m.frustumCulled=false;m.visible=false;play.add(m);return {mesh:m,pts:[],fadeAt:0};});
 function drawPath(p){const pts=p.pts,pos=p.mesh.geometry.attributes.position;for(let k=0;k<PATH_N;k++){const a=pts[Math.min(k,pts.length-1)]||[0,0],b=pts[Math.min(k+1,pts.length-1)]||a,dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,w=.07+.05*(1-k/PATH_N),nx=-dz/l*w,nz=dx/l*w,y=spinFloorY(a[0],a[1])+.025;pos.setXYZ(k*2,a[0]+nx,y,a[1]+nz);pos.setXYZ(k*2+1,a[0]-nx,y,a[1]-nz);}pos.needsUpdate=true;p.mesh.geometry.computeBoundingSphere();}
 /* 招牌演出用的物件：每位選手一套，平時隱藏 */
 const ADD={transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending};
 const sigGeo={arc:G(new T.RingGeometry(1,1.07,96)),dome:G(new T.SphereGeometry(.85,24,10,0,Math.PI*2,0,Math.PI/2)),slash:G(new T.RingGeometry(.8,1.45,40,1,0,2.3)),circle:G(new T.RingGeometry(1.25,1.33,64)),line:G(new T.PlaneGeometry(2.7,.05)),blade:G(new T.ConeGeometry(.07,.75,6))};
 const sig=[0,1].map(()=>{const g=new T.Group();g.visible=false;play.add(g);const mk=(geo,flat=true)=>{const m=new T.Mesh(geo,M(new T.MeshBasicMaterial({...ADD})));if(flat)m.rotation.x=-Math.PI/2;g.add(m);m.visible=false;return m;};
  const set={group:g,arcs:[mk(sigGeo.arc),mk(sigGeo.arc)],dome:mk(sigGeo.dome,false),slash:mk(sigGeo.slash),circle:mk(sigGeo.circle),lines:[mk(sigGeo.line),mk(sigGeo.line),mk(sigGeo.line)],blades:Array.from({length:6},()=>mk(sigGeo.blade,false)),kind:null,last:0};set.dome.material.wireframe=true;return set;});
 function sigStart(actor,id){const st=sig[actor];st.kind=SPIN_SIGNATURES[id]?.kind||null;st.last=-1;for(const c of st.group.children)c.visible=false;}
 function sigUpdate(actor,match,b,o,t,env,dt,clock){const st=sig[actor];st.group.visible=!!st.kind&&env>0;if(!st.kind)return;const fy=spinFloorY(b.x,b.z),every=p=>{if(t-st.last>=p){st.last=t;return true;}return false;};
  switch(st.kind){
   case 'reverse':comets[actor].scale.x=comets[actor].scale.y=TOP_SCALE*1.7;if(every(.18)){emitRing(b.x,b.z,0xff7a2a,.35,.9);for(let k=0;k<6;k++)emitParticle('ember',b.x,fy+.2,b.z,-(b.vx||0)*.4+(Math.random()-.5)*2,1.4+Math.random(),-(b.vz||0)*.4+(Math.random()-.5)*2,k%2?0xffd04a:0xff4a1a,.5);}break;
   case 'arcs':st.arcs.forEach((m,k)=>{m.visible=true;const r=Math.max(.6,Math.hypot(b.x,b.z)+(k?.45:-.35));m.position.set(0,spinFloorY(r,0)+.03,0);m.scale.setScalar(r);m.material.color.setHex(k?0x3aa0ff:0xff3b3b);m.material.opacity=.85*env;});if(every(.1))emitParticle('streak',b.x,fy+.2,b.z,(b.vx||0)*.2,.4,(b.vz||0)*.2,0xe8fbff,.4);break;
   case 'absorb':if(o&&every(.05))for(let k=0;k<2;k++){const ox=o.x+(Math.random()-.5)*.6,oz=o.z+(Math.random()-.5)*.6;emitParticle('shard',ox,spinFloorY(ox,oz)+.3,oz,(b.x-ox)*1.8,.3,(b.z-oz)*1.8,k?0x7fe0a0:0xe6fff0,.55);}st.dome.visible=true;st.dome.position.set(b.x,fy,b.z);st.dome.scale.setScalar(TOP_SCALE*(.95+Math.sin(clock*10)*.05));st.dome.material.color.setHex(0x7fe0a0);st.dome.material.opacity=.35*env;break;
   case 'cross':if(every(.32))crossBeams(b.x,b.z);break;
   case 'dome':st.dome.visible=true;st.dome.position.set(b.x,fy,b.z);st.dome.scale.setScalar(TOP_SCALE*(1.25+Math.sin(clock*8)*.06));st.dome.rotation.y+=dt*1.5;st.dome.material.color.setHex(0xffe27a);st.dome.material.opacity=.7*env;if(every(.4))emitRing(b.x,b.z,0xfff1b8,.4,1.2);break;
   case 'slash':st.slash.visible=true;st.slash.position.set(b.x,fy+.25,b.z);st.slash.rotation.set(-Math.PI/2,0,clock*14);st.slash.material.color.setHex(0xc58bff);st.slash.material.opacity=.85*env;st.slash.scale.setScalar(1+t*.6);break;
   case 'sigil':st.circle.visible=true;st.circle.position.set(b.x,fy+.03,b.z);st.circle.material.color.setHex(0x9fe8ff);st.circle.material.opacity=.9*env;st.circle.scale.setScalar(.8+Math.min(1,t*3)*.5);st.lines.forEach((m,k)=>{m.visible=true;m.position.set(b.x,fy+.035,b.z);m.rotation.set(-Math.PI/2,0,clock*.8+k*Math.PI/3);m.material.color.setHex(k%2?0xffffff:0x9fe8ff);m.material.opacity=.8*env;});if(every(.15))emitParticle('ice',b.x,fy+.3,b.z,(Math.random()-.5)*2,1,(Math.random()-.5)*2,0xffffff,.5);break;
   case 'spiral':if(every(.06)){const a=t*16;emitParticle('bubble',b.x+Math.cos(a)*.6,fy+.15+t*1.2,b.z+Math.sin(a)*.6,-Math.sin(a)*1.2,1.4,Math.cos(a)*1.2,Math.floor(t*10)%2?0x46b6e6:0xc8f4ff,.6);}break;
   case 'zigzag':spinAngle[actor]-=dt*fullRate('thorn')*2;if(every(.07)){const g=ghosts[actor][Math.floor(t*14)%POOL.ghosts];g.position.set(b.x,fy+.12,b.z);g.material.color.setHex(0x7ed36a);g.material.opacity=.5;g.userData.until=clock+.35;g.visible=true;emitParticle('leaf',b.x,fy+.3,b.z,(Math.random()-.5)*2,.8,(Math.random()-.5)*2,0x9fe87a,.6);}break;
   case 'quake':if(every(.33)){emitRing(b.x,b.z,0xd9b27a,.5,1.5);shakeUntil=clock+.14;shakePower=.1;for(let k=0;k<8;k++)emitParticle('debris',b.x,fy+.1,b.z,(Math.random()-.5)*3,1+Math.random()*1.5,(Math.random()-.5)*3,0xb8956a,.7);}break;
   case 'awaken':st.blades.forEach((m,k)=>{m.visible=true;const a=k/6*Math.PI*2+clock*9,r=.6+Math.sin(clock*20+k)*.05;m.position.set(b.x+Math.cos(a)*r,fy+.32,b.z+Math.sin(a)*r);m.rotation.set(0,-a,-Math.PI/2);m.material.color.setHex(k%2?0xffd24a:0xff7a1a);m.material.opacity=.9*env;});if(every(.12))emitParticle('ember',b.x,fy+.3,b.z,(Math.random()-.5)*1.5,2,(Math.random()-.5)*1.5,0xfff07a,.6);break;
   case 'starburst':if(every(.08))for(let k=0;k<4;k++){const a=Math.random()*Math.PI*2;emitParticle('star',b.x,fy+.35,b.z,Math.cos(a)*3,.6+Math.random(),Math.sin(a)*3,k%2?0xf3a6ff:0xc9a8ff,.55);}if(Math.floor(t/.3)!==Math.floor((t-dt/FINISH)/.3))emitRing(b.x,b.z,0xe0b8ff,.45,1.6);break;
  }}
 let critAt=0;function critLabel(x,z){const sp=critLabels[critAt++%2];sp.position.set(x,spinFloorY(x,z)+.85,z);sp.userData={born:clockNow};sp.visible=true;}
 function burst(cin,b,match){const top=SPIN_TOP(cin.loser?match.opponentTopId:match.topId),fy=spinFloorY(b.x,b.z);for(let k=0;k<shards.length;k++){const m=shards[k],a=k/shards.length*Math.PI*2+Math.random()*.4,sp=1.6+Math.random()*1.4;m.material.color.setHex(k%2?top.metal:top.color);m.material.opacity=1;m.position.set(b.x,fy+.15,b.z);m.rotation.set(Math.random()*3,a,Math.random()*3);m.userData={vx:Math.cos(a)*sp,vy:2.2+Math.random()*1.6,vz:Math.sin(a)*sp,spin:(Math.random()-.5)*14,born:clockNow};m.visible=true;}emitRing(b.x,b.z,0xffffff,.55,2.2);emitRing(b.x,b.z,0xffc04a,.8,1.4);for(let k=0;k<20;k++){const a=Math.random()*Math.PI*2;emitSpark(b.x,fy+.25,b.z,Math.cos(a)*4,1+Math.random()*3,Math.sin(a)*4,k%2?0xffffff:0xffd252,.6,1.6);}shakeUntil=clockNow+.4;shakePower=.2;}
 let sparkAt=0,ringAt=0,partAt=0,lastSeen=0,shakeUntil=0,shakePower=0,lastShake=-9,closeUntil=0,closeStart=0,closeActor=0,clockNow=0,slowRequest=false;const ghostTrail=[[],[]],spinAngle=[0,0];
 const ids=[];function fxOf(i,match){return SPIN_FX[i?match.opponentTopId:match.topId]||SPIN_FX.flame;}
 function emitSpark(x,y,z,vx,vy,vz,color,life=.45,size=1){const p=sparks[sparkAt++%sparks.length];p.position.set(x,y,z);p.userData={vx,vy,vz,born:clockNow,life};p.material.color.setHex(color);p.material.opacity=1;p.scale.setScalar(size);p.visible=true;}
 function emitRing(x,z,color,life=.5,size=1){const r=rings[ringAt++%rings.length];r.position.set(x,spinFloorY(x,z)+.07,z);r.userData={born:clockNow,life,size};r.material.color.setHex(color);r.visible=true;}
 function emitParticle(kind,x,y,z,vx,vy,vz,color,life=.6){const p=particles[partAt++%particles.length];if(p.geometry!==partGeo[kind])p.geometry=partGeo[kind]||partGeo.ember;p.position.set(x,y,z);p.rotation.set(Math.random()*3,Math.random()*3,0);p.userData={vx,vy,vz,born:clockNow,life,spin:(Math.random()-.5)*12};p.material.color.setHex(color);p.material.opacity=1;p.visible=true;}
 /* 撞擊特效：依類型（正面重撞、斜角擦撞、側翼、連續、反彈）分輕重 */
 function impact(e,match){const fy=spinFloorY(e.x,e.z);if(e.crit)crossBeams(e.x,e.z);if(e.strong&&match.bodies.some(b=>b.skillUntil>match.time))clash(match,e.x,e.z);if(e.crit){for(const i of e.crit){const v=match.bodies[1-i];critLabel(v.x,v.z);}emitRing(e.x,e.z,0xffd252,.5,1.8);}const t=e.type||'side',x=e.x,z=e.z,nx=e.nx||1,nz=e.nz||0,strong=!!e.strong,c=t==='rebound'?0x9fe8ff:t==='graze'?0xffe9a8:0xffd252;
  const n=t==='graze'?6:t==='combo'?8:strong?16:11;for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2,sp=(t==='graze'?1.5:2.4)*(.6+Math.random()*.8)*(strong?1.4:1);const gx=t==='graze'?-nz:Math.cos(a),gz=t==='graze'?nx:Math.sin(a),side=t==='graze'&&k%2?-1:1;emitSpark(x,fy+.2,z,gx*sp*side,1.2+Math.random()*1.6,gz*sp*side,k%3?c:0xffffff,.35+Math.random()*.25,strong?1.4:1);}
  if(t==='front'||t==='rebound'||strong)emitRing(x,z,t==='rebound'?0x8fe6ff:0xfff0b0,strong?.6:.4,strong?1.6:1);
  if(t==='combo')setTimeout(()=>{if(!dead)for(let k=0;k<5;k++)emitSpark(x+(Math.random()-.5)*.3,fy+.25,z+(Math.random()-.5)*.3,(Math.random()-.5)*3,1.5,(Math.random()-.5)*3,0xffb347,.3);},90);
  for(let i=0;i<2;i++){const f=fxOf(i,match),b=match.bodies[i];if(f.impact==='ice'||f.impact==='arc')for(let k=0;k<4;k++)emitParticle(f.impact==='ice'?'ice':'arc',b.x,spinFloorY(b.x,b.z)+.25,b.z,(Math.random()-.5)*2,1+Math.random(),(Math.random()-.5)*2,f.glow,.5);}
  if(strong&&clockNow-lastShake>.6){lastShake=clockNow;shakeUntil=clockNow+.28;shakePower=.16;slowRequest=true;}else if(t==='front'&&clockNow-lastShake>.6){lastShake=clockNow;shakeUntil=clockNow+.16;shakePower=.07;}}
 function dodge(e,match){const f=fxOf(e.actor,match),b=match.bodies[e.actor];for(let k=0;k<POOL.ghosts;k++){const g=ghosts[e.actor][k],x=e.x+(b.x-e.x)*k/POOL.ghosts,z=e.z+(b.z-e.z)*k/POOL.ghosts;g.position.set(x,spinFloorY(x,z)+.12,z);g.material.color.setHex(f.glow);g.material.opacity=.45;g.userData.until=clockNow+.35+k*.03;g.visible=true;}for(let k=0;k<6;k++)emitParticle('streak',e.x,spinFloorY(e.x,e.z)+.15,e.z,(b.x-e.x)*4+(Math.random()-.5),.3,(b.z-e.z)*4+(Math.random()-.5),f.trail,.35);if(e.style==='behind')emitRing(b.x,b.z,f.glow,.35,.8);}
 /* 必殺技開始：特寫＋光柱＋守護靈，時間與技能序列圖（1.2 秒）同步 */
 const FINISH=1.3;
 function skillStart(e,match){const f=fxOf(e.actor,match),b=match.bodies[e.actor],id=e.actor?match.opponentTopId:match.topId,fz=finisher[e.actor];closeUntil=clockNow+FINISH;closeStart=clockNow;closeActor=e.actor;fz.start=clockNow;fz.until=clockNow+FINISH;fz.actor=e.actor;fz.pillar.material.color.setHex(f.glow);fz.spirals.forEach((s,k)=>s.material.color.setHex(k%2?f.trail:f.glow));sigStart(e.actor,id);
  emitRing(b.x,b.z,f.glow,.5,1.4);for(let k=0;k<14;k++){const a=k/14*Math.PI*2;emitParticle(f.particle,b.x+Math.cos(a)*.4,spinFloorY(b.x,b.z)+.2,b.z+Math.sin(a)*.4,Math.cos(a)*1.6,.8+Math.random(),Math.sin(a)*1.6,k%2?f.trail:f.glow,.8);}}
 function updateFinisher(match,clock,dt){let dim=0;for(const fz of finisher){const on=match?.bodies&&fz.until>clock;for(const o of[fz.pillar,...fz.spirals])o.visible=on;if(!on){sig[fz.actor].group.visible=false;continue;}const b=match.bodies[fz.actor],fy=spinFloorY(b.x,b.z),t=(clock-fz.start)/FINISH,env=Math.min(1,t/.15,(1-t)/.2);dim=Math.max(dim,env);
   fz.pillar.position.set(b.x,fy+2.1,b.z);fz.pillar.scale.set(.6+env*.5,.3+Math.min(1,t*4)*.7,.6+env*.5);fz.pillar.rotation.y+=dt*6;fz.pillar.material.opacity=.14*env;
   sigUpdate(fz.actor,match,b,match.bodies[1-fz.actor],t,env,dt,clock);fz.spirals.forEach((s,k)=>{const p=(t*1.6+k/3)%1;s.position.set(b.x,fy+.15+p*2.6,b.z);s.scale.setScalar(1.2-p*.6);s.material.opacity=.75*env*(1-p);});
   }
  hemi.intensity=.8-.45*dim;sun.intensity=1.2-.6*dim;renderer.setClearColor(dim>.01?0x0b1222:0x21354a);}
 function readEffects(match){const list=(match.effects||[]).filter(e=>(e.id||0)>lastSeen);if(!list.length)return;lastSeen=Math.max(...list.map(e=>e.id||0));for(const e of list){if(match.time-e.at>.6)continue;if(e.kind==='hit')impact(e,match);else if(e.kind==='dodge')dodge(e,match);else if(e.kind==='skill')skillStart(e,match);}}
 /* 傾斜時陀螺最低點會低於軸心：依傾角把陀螺抬高，倒下時躺在場地表面而不是嵌進去 */
 const restLift=tilt=>Math.max(0,TOP_SCALE*(.62*Math.sin(Math.abs(tilt))-.4*Math.cos(tilt)+.03));
 /* 敗北特寫：依 roundResult.cause 演出；只看結果，不再計算任何勝負 */
 function defeatPose(c,b,i,t){if(!c||c.loser!==i)return null;const fy=spinFloorY(b.x,b.z);
  if(c.cause==='burst'){const k=Math.min(1,t/.25);return {x:b.x+(Math.random()-.5)*.08*k,y:fy+.01+k*.12,z:b.z+(Math.random()-.5)*.08*k,tilt:k*.3,spin:1,hidden:t>.25};}
  if(c.cause==='out'){const v=c.vx||c.vz?[c.vx,c.vz]:[b.x,b.z],l=Math.hypot(v[0],v[1])||1,k=Math.min(t,1.4),dist=k*3.4,x=b.x+v[0]/l*dist,z=b.z+v[1]/l*dist;return {x,y:Math.max(fy,spinFloorY(x,z))+.01+Math.max(0,5*k-2.6*k*k),z,tilt:k*4.2,spin:Math.max(.3,1-k*.5)};}
  const k=Math.min(1,t/1.3),tilt=k<.75?Math.sin(t*10)*.18*k/.75+k*.25:.25+(k-.75)/.25*1.15;return {x:b.x+Math.sin(t*7)*.05*(1-k),y:fy+.01+restLift(tilt),z:b.z+Math.cos(t*7)*.05*(1-k),tilt,spin:Math.max(0,1-k*1.1)};}
 /* 視覺轉速：每格轉「葉片間距的 42%」，在 60fps 下看起來是高速正轉（避免車輪錯覺看成慢轉）；旋轉能量低於 25% 才明顯變慢 */
 const fullRate=id=>.42*Math.PI*2/(SPIN_TOP(id).blades||6)*60;
 const spinRatio=spin=>Math.max(0,Math.min(1,spin/25));
 function render(match,clock,cinematic=null){if(dead)return {slow:false};clockNow=clock;slowRequest=false;const dt=Math.min(.05,frames?clock-(render.last||clock):0);render.last=clock;
  const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);camera.aspect=w/h;
  if(match?.phase==='battle'&&!cinematic)readEffects(match);else if(match)lastSeen=Math.max(lastSeen,...(match.effects||[]).map(e=>e.id||0),0);
  /* 鏡頭：平時全景看整個場地；只有施放技能時低角度環繞特寫施放者 */
  const wide=(w/h<.75?1.5:w/h<1?1.25:1)*AS*.82,focus=match?.bodies?.[0]||{x:0,z:0};let lx=0,ly=.1+LIFT,lz=0,cx,cy,cz;
  if(angle===0){cx=0;cy=6.6*wide/zoom;cz=.01;}else if(angle===1){cx=0;cy=4.3*wide/zoom;cz=5.2*wide/zoom;}else{cx=focus.x*.6;cy=3.6*wide/zoom;cz=focus.z*.6+4.2*wide/zoom;lx=focus.x*.4;lz=focus.z*.4;}
  if(match?.bodies&&closeUntil>clock&&!cinematic){const b=match.bodies[closeActor],fy=spinFloorY(b.x,b.z)+LIFT,t=(clock-closeStart)/FINISH,s=Math.max(0,Math.min(1,t/.18,(1-t)/.22)),e=s*s*(3-2*s),a=-.5+t*1.1;
   /* 鏡頭放在施放者「背對對手」那側，避免對手擋住；小幅環繞 */const o=match.bodies[1-closeActor],base=Math.atan2(b.x-o.x,b.z-o.z),px=b.x+Math.sin(base+a*.6)*4.4,py=fy+1.6,pz=b.z+Math.cos(base+a*.6)*4.4;cx+=(px-cx)*e;cy+=(py-cy)*e;cz+=(pz-cz)*e;lx+=(b.x-lx)*e;ly+=(fy+.95-ly)*e;lz+=(b.z-lz)*e;}
  if(shakeUntil>clock){const a=shakePower*(shakeUntil-clock)/.28;cx+=(Math.random()-.5)*a;cy+=(Math.random()-.5)*a;}
  camera.position.set(cx,cy,cz);camera.lookAt(lx,ly,lz);camera.updateProjectionMatrix();
  let follow=null;
  for(let i=0;i<2;i++){const id=i?match?.opponentTopId:match?.topId;if(id!==ids[i]){if(tops[i]){play.remove(tops[i]);models.dispose(tops[i]);}tops[i]=id?models.top(id):null;blurs[i]=null;if(tops[i]){tops[i].scale.setScalar(TOP_SCALE);const top=SPIN_TOP(id),disc=new T.Mesh(G(new T.CircleGeometry(.6,32)),M(new T.MeshBasicMaterial({color:top.metal,transparent:true,opacity:0,depthWrite:false})));disc.rotation.x=-Math.PI/2;disc.position.y=.47;tops[i].add(disc);blurs[i]=disc;play.add(tops[i]);}ids[i]=id;ghostTrail[i]=[];}
   const b=match?.bodies?.[i];if(!tops[i])continue;tops[i].visible=!!b;auras[i].visible=false;if(!b)continue;const f=fxOf(i,match),skillOn=b.skillUntil>match.time||b.buffUntil>match.time;
   const pose=defeatPose(cinematic,b,i,cinematic?.t||0),fy=spinFloorY(b.x,b.z);if(pose&&cinematic.loser===i)follow=pose;
   const ratio=pose?pose.spin:spinRatio(b.spin);spinAngle[i]+=dt*fullRate(id)*ratio;
   if(pose?.hidden&&!cinematic.burstDone){cinematic.burstDone=true;burst(cinematic,b,match);}tops[i].visible=!pose?.hidden;
   if(pose){tops[i].position.set(pose.x,pose.y,pose.z);tops[i].rotation.set(pose.tilt,spinAngle[i],pose.tilt*.4);}
   else{/* 只有快停下來（旋轉能量 < 30%）才開始搖晃 */const wob=b.spin<30?(30-b.spin)*.012:0,tilt=wob*(.6+.4*Math.sin(clock*6+i));tops[i].position.set(b.x,fy+.01+restLift(tilt),b.z);tops[i].rotation.set(tilt*Math.cos(clock*6+i),spinAngle[i],tilt*Math.sin(clock*6+i));}
   if(blurs[i])blurs[i].material.opacity=.32*ratio;
   const live=match.phase==='battle'&&!cinematic;auras[i].visible=live||(cinematic&&cinematic.loser!==i);auras[i].position.set(tops[i].position.x,spinFloorY(tops[i].position.x,tops[i].position.z)+.05,tops[i].position.z);auras[i].material.color.setHex(skillOn?f.glow:i?0x68d1ff:0xffbb5c);auras[i].material.opacity=skillOn?.55+Math.sin(clock*18)*.3:.25;auras[i].scale.setScalar((skillOn?1.25+Math.sin(clock*12)*.12:1)*TOP_SCALE);
   const speed=Math.hypot(b.vx||0,b.vz||0),trail=ghostTrail[i];if(live){trail.unshift([b.x,b.z]);trail.length=Math.min(trail.length,POOL.ghosts*2);}
   for(let k=0;k<POOL.ghosts;k++){const g=ghosts[i][k];if(g.userData.until>clock){g.material.opacity=Math.max(0,(g.userData.until-clock)*1.2);continue;}const pt=trail[(k+1)*2-1];const show=live&&pt&&(speed>2.6||skillOn);g.visible=!!show;if(show){g.position.set(pt[0],spinFloorY(pt[0],pt[1])+.12,pt[1]);g.material.color.setHex(skillOn?f.trail:0xffffff);g.material.opacity=(skillOn?.32:.14)*(1-k/POOL.ghosts);}}
   if(live&&skillOn&&Math.random()<(lowPower?.35:.7)){const a=Math.random()*Math.PI*2,rr=.32+Math.random()*.2;emitParticle(f.particle,b.x+Math.cos(a)*rr,fy+.12+Math.random()*.3,b.z+Math.sin(a)*rr,Math.cos(a)*.5-(b.vx||0)*.2,f.particle==='ember'?1.4:.6,Math.sin(a)*.5-(b.vz||0)*.2,Math.random()<.5?f.trail:f.glow,.55);}
   const bolt=bolts[i];bolt.visible=live&&skillOn&&f.particle==='arc'&&Math.random()<.8;if(bolt.visible){const pos=bolt.geometry.attributes.position;for(let k=0;k<8;k++){const a=k/7*Math.PI*1.6+clock*9;pos.setXYZ(k,b.x+Math.cos(a)*.5+(Math.random()-.5)*.12,fy+.18+(Math.random()-.5)*.2,b.z+Math.sin(a)*.5+(Math.random()-.5)*.12);}pos.needsUpdate=true;bolt.material.color.setHex(f.glow);}
  }
  updateFinisher(cinematic?null:match,clock,dt);
  for(let i=0;i<2;i++){const b=match?.bodies?.[i],comet=comets[i],p=paths[i];const skillOn=!!b&&!cinematic&&match.phase==='battle'&&b.skillUntil>match.time;
   if(b&&skillOn){const f=fxOf(i,match),v=Math.hypot(b.vx||0,b.vz||0),fy=spinFloorY(b.x,b.z);comet.visible=v>.6;if(comet.visible){comet.position.set(b.x,fy+.22,b.z);comet.rotation.set(0,Math.atan2(b.vx,b.vz),0);comet.scale.set(TOP_SCALE*1.1,TOP_SCALE,Math.min(4,.6+v*.55));comet.material.color.setHex(f.trail);comet.material.opacity=.55+Math.sin(clock*40)*.12;}
    if(!p.active){p.active=true;p.pts=[];p.mesh.material.color.setHex(f.glow===0xffffff?f.trail:f.trail);}p.pts.unshift([b.x,b.z]);p.pts.length=Math.min(p.pts.length,PATH_N);p.fadeAt=clock+1;p.mesh.visible=p.pts.length>2;if(p.mesh.visible){drawPath(p);p.mesh.material.opacity=.85;}}
   else{comet.visible=false;if(p.active){p.active=false;}if(p.mesh.visible){const k=(p.fadeAt-clock);p.mesh.material.opacity=Math.max(0,k*.85);if(k<=0||cinematic)p.mesh.visible=false;}}}
  const close=match?.bodies&&closeUntil>clock&&!cinematic,ct=close?(clock-closeStart)/FINISH:1,cenv=close?Math.max(0,Math.min(1,ct/.15,(1-ct)/.2)):0;speedLines.visible=cenv>0;if(speedLines.visible){fitHud(speedLines);speedLines.material.opacity=.32*cenv;speedLines.material.rotation=clock*.6;}
  const fa=clock-clashAt;clashFlash.visible=fa<.3;if(clashFlash.visible){fitHud(clashFlash);clashFlash.material.opacity=.32*(1-fa/.3);}
  for(const bolt of clashBolts){if(!bolt.visible)continue;if(bolt.userData.until<=clock){bolt.visible=false;continue;}bolt.material.opacity=(bolt.userData.until-clock)/.35;}
  const ba=clock-beamAt;for(const m of beams){m.visible=ba<.5;if(m.visible){m.material.opacity=.9*(1-ba/.5);m.scale.set(.3+Math.min(1,ba/.08)*.7,1+Math.sin(clock*60)*.2,1);}}
  if(cinematic&&follow&&match?.bodies){const f=fxOf(cinematic.loser,match);if(cinematic.cause==='out'&&cinematic.t<1.3&&Math.random()<.7)emitParticle('streak',follow.x,follow.y,follow.z,(Math.random()-.5),.2,(Math.random()-.5),f.trail,.4);if(!['out','burst'].includes(cinematic.cause)&&cinematic.t>.9&&cinematic.t<1.3&&!cinematic.dust){cinematic.dust=true;emitRing(follow.x,follow.z,0xd9c7a6,.6,1.1);for(let k=0;k<10;k++)emitParticle('debris',follow.x,spinFloorY(follow.x,follow.z)+.05,follow.z,(Math.random()-.5)*2.4,.6+Math.random(),(Math.random()-.5)*2.4,0xb8a07a,.7);}}
  for(const sp of critLabels){if(!sp.visible)continue;const age=clock-sp.userData.born;if(age>.9){sp.visible=false;continue;}const k=Math.min(1,age/.12);sp.scale.set(1.3*(1.6-.6*k),.5*(1.6-.6*k),1);sp.position.y+=dt*.6;sp.material.opacity=age<.6?1:1-(age-.6)/.3;}
  for(const m of shards){if(!m.visible)continue;const u=m.userData,age=clock-u.born;if(age>2.2){m.visible=false;continue;}u.vy-=6*dt;m.position.x+=u.vx*dt;m.position.z+=u.vz*dt;const floor=spinFloorY(m.position.x,m.position.z)+.05;m.position.y=Math.max(floor,m.position.y+u.vy*dt);if(m.position.y<=floor){u.vx*=.9;u.vz*=.9;u.vy=Math.abs(u.vy)*.25;}m.rotation.x+=u.spin*dt;m.rotation.z+=u.spin*.6*dt;m.material.opacity=age<1.6?1:1-(age-1.6)/.6;}
  for(const p of sparks){if(!p.visible)continue;const u=p.userData,age=clock-u.born;if(age>u.life){p.visible=false;continue;}u.vy-=7*dt;p.position.x+=u.vx*dt;p.position.z+=u.vz*dt;p.position.y=Math.max(spinFloorY(p.position.x,p.position.z)+.04,p.position.y+u.vy*dt);p.material.opacity=1-age/u.life;}
  for(const r of rings){if(!r.visible)continue;const u=r.userData,age=clock-u.born;if(age>u.life){r.visible=false;continue;}const k=age/u.life;r.scale.setScalar((.4+k*1.8)*u.size);r.material.opacity=(1-k)*.8;}
  for(const p of particles){if(!p.visible)continue;const u=p.userData,age=clock-u.born;if(age>u.life){p.visible=false;continue;}u.vy-=1.5*dt;p.position.x+=u.vx*dt;p.position.y+=u.vy*dt;p.position.z+=u.vz*dt;p.rotation.y+=u.spin*dt;p.material.opacity=1-age/u.life;}
  for(const list of ghosts)for(const g of list)if(g.userData.until&&g.userData.until<=clock&&g.material.opacity<=0)g.visible=false;
  ids.forEach((id,actor)=>{if(id)skills.prepare(id,actor);});skills.update(cinematic?null:match);
  renderer.render(scene,camera);frames++;return {slow:slowRequest};
 }
 return {render,project(x,z){const p=new T.Vector3(x,spinFloorY(x,z)+LIFT+.3,z).project(camera),r=canvas.getBoundingClientRect();return {x:(p.x+1)*r.width/2,y:(1-p.y)*r.height/2};},changeCamera(){angle=(angle+1)%3;return ['俯視','斜俯視','追蹤'][angle];},zoom(){zoom=zoom>=1.25?.85:zoom+.2;},get frames(){return frames;},get skillEffects(){return skills.active;},get triangles(){return renderer.info.render.triangles;},get activeFx(){return sparks.filter(p=>p.visible).length+particles.filter(p=>p.visible).length+rings.filter(r=>r.visible).length;},get closeUp(){return closeUntil>clockNow;},topPose(i){const t=tops[i];return t?{x:t.position.x,y:t.position.y,z:t.position.z,tilt:t.rotation.x,floor:spinFloorY(t.position.x,t.position.z),visible:t.visible}:null;},dispose(){if(dead)return;dead=true;critTex.dispose();lineTex.dispose();flashTex.dispose();skills.dispose();for(const g of geos)g.dispose();for(const m of mats)m.dispose();models.dispose(scene);models.disposeEnvironment();renderer.dispose();renderer.forceContextLoss();},scene,arena};
}
