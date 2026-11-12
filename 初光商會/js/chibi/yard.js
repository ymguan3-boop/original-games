/* 商會門外：依等級變熱鬧的街景、進出的顧客、門口發傳單的店員。
   全部是原創造型：石板路、市集攤位、噴泉、旗幟。 */
import {LEVELS,GROUND,CFG,tune,rng,shade,hex,canvasTex,ramp,plankTex,stoneTex,stripeTex,cobbleTex,addOutline,hull} from './shell.js?v=20261112-v31c';
const THREE=globalThis.THREE;

const STEP_D=.36;
export function layout(level,o={}){const L={...LEVELS[level],...(o.w?{w:o.w}:{}),...(o.d?{d:o.d}:{})},{w,d,t,H}=L,n=Math.max(2,Math.ceil(-GROUND/.16)),half=w/2+t,zF=d/2+t,zS=zF+.18+n*STEP_D,pathLen=[0,2.4,2.6,2.8,3,3.2][level],zR=zS+pathLen+1.3;
 return {doorX:o.doorX||0,L,w,d,t,H,half,zF,zS,zR,nSteps:n,stepW:(level===1?1.05:level>=4?2.1:1.8)+.9+.25,pw:level===1?1.8:level>=4?3.4:2.6,roadHalf:half+[0,5,6,7,8,10][level]};}

const mats=new Map();
const toon=(c,o={})=>{const k=c+JSON.stringify(o);if(!mats.has(k)){const m=new THREE.MeshToonMaterial({color:c,gradientMap:ramp(),...o});if(CFG.linear){m.color.convertSRGBToLinear();m.emissive?.convertSRGBToLinear();}mats.set(k,m);}return mats.get(k);};
const texMat=(tex,rx,ry)=>{const m=tex.clone();m.needsUpdate=true;m.repeat.set(rx,ry);return new THREE.MeshToonMaterial({map:m,gradientMap:ramp()});};
function mk(geo,mat,x=0,y=0,z=0,parent,round=false){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent?.add(o);if(round)hull(o,.012);return o;}
const B=(w,h,d,c,x,y,z,p)=>mk(new THREE.BoxGeometry(w,h,d),typeof c==='number'?toon(c):c,x,y,z,p);
const C=(r1,r2,h,c,x,y,z,p,seg=14,round=true)=>mk(new THREE.CylinderGeometry(r1,r2,h,seg),typeof c==='number'?toon(c):c,x,y,z,p,round);
const S=(r,c,x,y,z,p,sx=1,sy=1,sz=1)=>{const o=mk(new THREE.SphereGeometry(r,14,10),typeof c==='number'?toon(c):c,x,y,z,p,true);o.scale.set(sx,sy,sz);return o;};

/* ---------- 擺設 ---------- */
let G=GROUND;
function tree(p,x,z,s=1,kind='round'){const g=new THREE.Group();g.position.set(x,G,z);g.scale.setScalar(s);p.add(g);C(.13,.18,1.1,0x8a5a34,0,.55,0,g,10);
 if(kind==='pine'){for(let i=0;i<3;i++){const c=mk(new THREE.ConeGeometry(.75-i*.18,.8,12),toon(i%2?0x4f9a3a:0x5aa846),0,1.1+i*.45,0,g,true);}}
 else{S(.62,0x5fae44,0,1.45,0,g);S(.48,0x6cbc4e,.42,1.25,.15,g);S(.5,0x56a03e,-.4,1.3,-.1,g);S(.42,0x74c454,.05,1.85,.1,g);}
 return g;}
function bush(p,x,z,s=1,flowers=0){const g=new THREE.Group();g.position.set(x,G,z);g.scale.setScalar(s);p.add(g);S(.34,0x5fae44,0,.25,0,g,1.3,.85,1);S(.26,0x6cbc4e,.28,.2,.08,g);if(flowers){const R=rng(Math.round(x*31+z*17)+99);for(let i=0;i<5;i++)S(.06,[0xf27a8a,0xffffff,0xf7c840][i%3],(R()-.5)*.6,.42+R()*.1,(R()-.3)*.4,g);}return g;}
function flowerBed(p,x,z,w,d,border=0xb9ad98){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);for(const s of[-1,1]){B(w,.16,.1,border,0,.08,s*d/2,g);B(.1,.16,d,border,s*w/2,.08,0,g);}B(w-.1,.1,d-.1,0x7a5a3a,0,.05,0,g).userData.noLine=true;
 const R=rng(Math.round(x*13+z*7)+5),n=Math.round(w*d*7);for(let i=0;i<n;i++){const fx=(R()-.5)*(w-.25),fz=(R()-.5)*(d-.25);S(.07,i%3?0x5fae44:0x6cbc4e,fx,.14,fz,g,1,.8,1).userData.noLine=true;if(R()<.6)S(.05,[0xf27a8a,0xffffff,0xf7c840,0xb07ad8][i%4],fx,.22,fz,g);}return g;}
function fence(p,x1,z1,x2,z2,{color=0xf7ead0,broken=false}={}){const g=new THREE.Group();p.add(g);const len=Math.hypot(x2-x1,z2-z1),n=Math.max(2,Math.round(len/.32)),ang=Math.atan2(x2-x1,z2-z1),R=rng(Math.round(x1*7+z1*3)+11);
 for(let i=0;i<=n;i++){if(broken&&R()<.3)continue;const f=i/n,px=x1+(x2-x1)*f,pz=z1+(z2-z1)*f,h=broken?.4+R()*.25:.6;const pk=B(.09,h,.05,color,px,G+h/2,pz,g);pk.rotation.y=ang;if(broken)pk.rotation.z=(R()-.5)*.35;}
 for(const y of[.18,.42]){if(broken&&y>.3)continue;const r=B(.04,.06,len,shade(color,-.12),(x1+x2)/2,G+y,(z1+z2)/2,g);r.rotation.y=ang;if(broken)r.rotation.x=.06;}return g;}
function lampPost(p,x,z,{gold=false,anim}={}){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);const pc=gold?0xd9a521:0x3e3a36;C(.16,.2,.18,pc,0,.09,0,g);C(.05,.06,2.3,pc,0,1.25,0,g,8);B(.32,.05,.32,pc,0,2.42,0,g);const l=B(.26,.34,.26,toon(0xffe08a,{emissive:0xffb648,emissiveIntensity:.55}),0,2.62,0,g);const cap=mk(new THREE.ConeGeometry(.24,.2,4),toon(pc),0,2.89,0,g,false);cap.rotation.y=Math.PI/4;S(.04,pc,0,3.0,0,g);return g;}
function barrel(p,x,z,s=1,broken=false){const g=new THREE.Group();g.position.set(x,G,z);g.scale.setScalar(s);p.add(g);const b=mk(new THREE.CylinderGeometry(.27,.27,.62,14),texMat(plankTex({base:0x9a6a40,dark:0x5a3a22,n:8,seed:4}),2,1),0,.31,0,g,true);b.scale.set(1,1,1);for(const y of[.1,.52])C(.285,.285,.05,0x4a4440,0,y,0,g,14,false);if(!broken)C(.25,.25,.02,0x7a5232,0,.625,0,g,14,false);else b.rotation.z=1.3,b.position.y=.27;return g;}
function crate(p,x,z,s=.5,rot=0,fill=null){const g=new THREE.Group();g.position.set(x,G,z);g.rotation.y=rot;p.add(g);B(s,s,s,texMat(plankTex({base:0xc08a52,dark:0x6e4a2a,n:3,vertical:false,seed:7}),1,1),0,s/2,0,g);if(fill){const R=rng(Math.round(x*9+z*5));for(let i=0;i<6;i++)S(s*.15,fill[i%fill.length],(R()-.5)*s*.6,s+.02,(R()-.5)*s*.6,g);}return g;}
function sack(p,x,z){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);S(.22,0xd9c49a,0,.2,0,g,1,1.1,.9);C(.06,.1,.12,0xd9c49a,0,.44,0,g,8);return g;}
function bench(p,x,z,rot=0){const g=new THREE.Group();g.position.set(x,G,z);g.rotation.y=rot;p.add(g);B(1.4,.08,.42,0xb07a44,0,.42,0,g);B(1.4,.3,.06,0xb07a44,0,.68,-.2,g);for(const s of[-1,1]){B(.08,.42,.08,0x5c3e26,s*.6,.21,.15,g);B(.08,.7,.08,0x5c3e26,s*.6,.35,-.18,g);}return g;}
function aBoard(p,x,z,rot=0,text='今日特價'){const g=new THREE.Group();g.position.set(x,G,z);g.rotation.y=rot;p.add(g);const t=canvasTex(128,160,(c,W,H)=>{c.fillStyle='#2f3b33';c.fillRect(0,0,W,H);c.fillStyle='#fff';c.font='900 26px "Microsoft JhengHei",sans-serif';c.textAlign='center';c.fillText(text.slice(0,2),W/2,52);c.fillText(text.slice(2),W/2,86);c.fillStyle='#f7c840';c.fillText('★ ★',W/2,128);});
 for(const s of[-1,1]){const pl=B(.62,.86,.05,0x9a6438,0,.42,s*.14,g);pl.rotation.x=s*.2;const face=mk(new THREE.PlaneGeometry(.5,.68),new THREE.MeshBasicMaterial({map:t}),0,.44,s*.17,g);face.rotation.x=s*.2;face.rotation.y=s>0?0:Math.PI;face.userData.noLine=true;}return g;}
function stall(p,x,z,{c1=0xd94a3a,c2=0xfff4df,goods=[0xf25a3a,0xf7c840,0x8ac24a,0xf0904a],rot=0}={}){const g=new THREE.Group();g.position.set(x,G,z);g.rotation.y=rot+Math.PI;p.add(g);
 B(2,.7,.9,texMat(plankTex({base:0xc08a52,dark:0x6e4a2a,n:4,vertical:false,seed:9}),1,1),0,.35,0,g);B(2.1,.06,1,0x9a6438,0,.72,0,g);
 const R=rng(Math.round(x*11+z*3)+3);for(let i=0;i<4;i++){const cx=-.72+i*.48;B(.4,.12,.36,0x8a5a32,cx,.81,.1,g);for(let k=0;k<5;k++)S(.07,goods[(i+k)%goods.length],cx+(R()-.5)*.25,.92,.1+(R()-.5)*.2,g);}
 for(const sx of[-1,1])for(const sz of[-1,1])C(.04,.04,2,0x8a5a34,sx*.95,1,sz*.42,g,8,false);
 const can=mk(new THREE.BoxGeometry(2.3,.05,1.3),new THREE.MeshToonMaterial({map:stripeTex(c1,c2,9),gradientMap:ramp()}),0,2.05,.08,g);can.rotation.x=.18;
 const n=9,sw=2.3/n;for(let i=0;i<n;i++){const sh=new THREE.Shape();sh.moveTo(-sw/2,0);sh.absarc(0,0,sw/2,Math.PI,2*Math.PI,false);mk(new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false,curveSegments:8}),toon(i%2?c2:c1),-1.15+sw*(i+.5),1.93,.73,g);}
 return g;}
function well(p,x,z){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);mk(new THREE.CylinderGeometry(.75,.8,.7,20,1,true),texMat(stoneTex({base:0xcfc6b4,mortar:0x8f8a80,rows:2,cols:6,seed:21}),2,1),0,.35,0,g,true).material.side=THREE.DoubleSide;C(.78,.78,.08,0xb8ad9a,0,.72,0,g,20);mk(new THREE.CircleGeometry(.7,20),toon(0x4f9cc8),0,.5,0,g).rotation.x=-Math.PI/2;
 for(const s of[-1,1])B(.1,1.4,.1,0x8a5a34,s*.7,1.3,0,g);C(.04,.04,1.5,0x6e4a2a,0,1.55,0,g,8,false).rotation.z=Math.PI/2;
 for(const s of[-1,1]){const r=B(1.9,.06,.9,0xc0503a,0,2.1,s*.32,g);r.rotation.x=s*.6;}B(.32,.26,.32,0x9a6a40,.15,1.15,0,g);return g;}
function fountain(p,x,z,r=1.5,anim,statue=false){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);const st=texMat(stoneTex({base:0xf0eadc,mortar:0xc8bfae,rows:1,cols:8,seed:33,rough:.06}),3,1);
 mk(new THREE.CylinderGeometry(r,r+.08,.45,28),st,0,.22,0,g,true);const water=mk(new THREE.CircleGeometry(r-.12,28),toon(0x6cc4e8,{emissive:0x2a8ac0,emissiveIntensity:.15}),0,.4,0,g);water.rotation.x=-Math.PI/2;water.userData.noLine=true;
 C(.22,.3,.9,0xf0eadc,0,.8,0,g,14);C(r*.42,r*.3,.18,0xf0eadc,0,1.28,0,g,20);const w2=mk(new THREE.CircleGeometry(r*.38,20),toon(0x6cc4e8),0,1.375,0,g);w2.rotation.x=-Math.PI/2;
 const jet=mk(new THREE.CylinderGeometry(.03,.09,.7,8,1,true),toon(0xbfe9ff,{transparent:true,opacity:.8}),0,1.7,0,g);jet.userData.noLine=true;
 const drops=[];for(let i=0;i<8;i++){const d=mk(new THREE.SphereGeometry(.05,6,5),toon(0xbfe9ff),0,1.9,0,g);d.userData.noLine=true;d.castShadow=false;drops.push(d);}
 if(statue){B(.5,.35,.5,0xd9a521,0,1.55,0,g);const cr=mk(new THREE.OctahedronGeometry(.32),toon(0x9fdcff,{emissive:0x4aa8ff,emissiveIntensity:.35}),0,2.25,0,g);cr.scale.y=1.5;jet.position.y=1.95;}
 anim.push(t=>{jet.scale.y=1+Math.sin(t*6)*.08;drops.forEach((d,i)=>{const a=i/8*Math.PI*2,k=(t*.9+i*.125)%1;d.position.set(Math.cos(a)*(.15+k*r*.36),1.95+(statue?.3:0)+k*.4-k*k*1.1,Math.sin(a)*(.15+k*r*.36));});});return g;}
function flagPole(p,x,z,color,anim,h=3){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);C(.05,.06,h,0xd9d2c2,0,h/2,0,g,8);S(.08,0xd9a521,0,h+.05,0,g);const fl=new THREE.Group();fl.position.set(0,h-.35,0);g.add(fl);
 const geo=new THREE.PlaneGeometry(.9,.55,8,1);geo.translate(.45,0,0);const f=mk(geo,toon(color,{side:THREE.DoubleSide}),0,0,0,fl);f.userData.noLine=true;const base=geo.attributes.position.array.slice();
 anim.push(t=>{const a=geo.attributes.position;for(let i=0;i<a.count;i++){const px=base[i*3];a.setZ(i,Math.sin(t*4+px*4+x)*px*.18);}a.needsUpdate=true;geo.computeVertexNormals();});return g;}
function bunting(p,a,b,colors,sag=.35){const g=new THREE.Group();p.add(g);const n=Math.max(4,Math.round(a.distanceTo(b)/.4)),pts=[];for(let i=0;i<=n;i++){const f=i/n,v=a.clone().lerp(b,f);v.y-=Math.sin(f*Math.PI)*sag;pts.push(v);}
 const line=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),n*2,.012,4),toon(0x6e4a2a));line.userData.noLine=true;g.add(line);
 const tri=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([-.12,0,0,.12,0,0,0,-.26,0],3));tri.computeVertexNormals();
 for(let i=1;i<n;i++){const f=mk(tri,toon(colors[i%colors.length],{side:THREE.DoubleSide}),pts[i].x,pts[i].y,pts[i].z,g);f.rotation.y=Math.atan2(b.x-a.x,b.z-a.z)-Math.PI/2;f.userData.noLine=true;f.castShadow=false;}return g;}
function cart(p,x,z,rot=0){const g=new THREE.Group();g.position.set(x,G,z);g.rotation.y=rot;p.add(g);B(1.5,.4,.9,texMat(plankTex({base:0xb07a44,dark:0x6e4a2a,n:3,vertical:false,seed:15}),1,1),0,.62,0,g);for(const s of[-1,1]){const wh=C(.32,.32,.08,0x6e4a2a,.3,.33,s*.5,g,14);wh.rotation.x=Math.PI/2;}for(const s of[-1,1])B(1,.05,.05,0x8a5a34,-1.1,.55,s*.3,g);crate(g,-.3,0,.4,.3,[0xf25a3a,0xf7c840]).position.y=.82;sack(g,.35,.1).position.y=.82;return g;}
function rock(p,x,z,s=.25){const o=S(s,0x9a958a,x,G+s*.35,z,p,1.3,.7,1);o.rotation.y=x;return o;}
function weeds(p,x,z){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);for(let i=0;i<4;i++){const c=mk(new THREE.ConeGeometry(.04,.3,4),toon(0x6f8a48),(i-1.5)*.06,.15,(i%2)*.05,g);c.rotation.z=(i-1.5)*.25;c.userData.noLine=true;}return g;}
function stump(p,x,z){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);C(.3,.38,.4,0x7a5232,0,.2,0,g,12);C(.29,.29,.02,0xd9b07a,0,.41,0,g,12,false);return g;}
function deadTree(p,x,z){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);C(.1,.17,1.6,0x6e5032,0,.8,0,g,8);for(const [a,y,l] of[[.7,1.2,.7],[-.8,1.4,.6],[.3,1.65,.5]]){const br=C(.035,.06,l,0x6e5032,Math.sin(a)*l/2,y,0,g,6);br.rotation.z=-a;}return g;}
function arch(p,x,z,w,anim){const g=new THREE.Group();g.position.set(x,G,z);p.add(g);const tor=mk(new THREE.TorusGeometry(w/2,.07,8,24,Math.PI),toon(0x5fae44),0,1.3,0,g,true);for(const s of[-1,1])C(.07,.07,1.3,0x5fae44,s*w/2,.65,0,g,8);
 for(let i=0;i<=12;i++){const a=i/12*Math.PI;S(.08,[0xf27a8a,0xffffff,0xf7c840][i%3],Math.cos(a)*w/2,1.3+Math.sin(a)*w/2,.05,g);}for(let i=0;i<5;i++)for(const s of[-1,1])S(.07,[0xf27a8a,0xffffff][i%2],s*w/2,.25+i*.26,.06,g);return g;}
function dirtTex(){const R=rng(41);return canvasTex(256,256,(g,W,H)=>{g.fillStyle='#b8946a';g.fillRect(0,0,W,H);for(let i=0;i<500;i++){g.fillStyle=R()<.5?'#a3815a':'#c9a87e';g.globalAlpha=.6;g.beginPath();g.ellipse(R()*W,R()*H,1+R()*4,1+R()*3,0,0,7);g.fill();}g.globalAlpha=1;});}
function plazaTex(level){if(level<5)return cobbleTex();return canvasTex(256,256,(g,W,H)=>{g.fillStyle='#e8dfcc';g.fillRect(0,0,W,H);g.strokeStyle='#c7b99c';g.lineWidth=3;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,H);g.moveTo(0,i*64);g.lineTo(W,i*64);g.stroke();}g.fillStyle='#d9b05a';g.beginPath();g.moveTo(W/2,W/2-40);g.lineTo(W/2+40,W/2);g.lineTo(W/2,W/2+40);g.lineTo(W/2-40,W/2);g.fill();g.fillStyle='#c94a3a';g.beginPath();g.arc(W/2,H/2,12,0,7);g.fill();});}

/* ---------- 人物 ---------- */
const faceCache=new Map();
function faceTex(skin,eye,mouth){const k=skin+'|'+eye+'|'+mouth;if(faceCache.has(k))return faceCache.get(k);
 const t=canvasTex(256,128,(g,W,H)=>{g.fillStyle=hex(skin);g.fillRect(0,0,W,H);const cx=W*.25,cy=H*.54;
  for(const s of[-1,1]){g.fillStyle=hex(eye);g.beginPath();g.ellipse(cx+s*12,cy,4.2,6.5,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(cx+s*12+1.4,cy-2.6,1.6,0,7);g.fill();g.fillStyle='rgba(240,120,120,.45)';g.beginPath();g.ellipse(cx+s*19,cy+8,4.5,2.6,0,0,7);g.fill();}
  g.strokeStyle='#6a3a2a';g.fillStyle='#b8423a';g.lineWidth=1.6;g.beginPath();if(mouth==='open'){g.ellipse(cx,cy+13,4,3.6,0,0,7);g.fill();}else{g.arc(cx,cy+9,4,.2*Math.PI,.8*Math.PI);g.stroke();}});
 t.wrapS=THREE.ClampToEdgeWrapping;faceCache.set(k,t);return t;}
const SKINS=[0xffdcbc,0xf6cba4,0xe8b48a,0xc98f62];
const HAIRS=[0x4a3020,0x2a2226,0xd9a040,0x8a4a2a,0xc8603a,0x5a4a6a];
const SHIRTS=[0x5a8fd0,0xe8705a,0x7fb84e,0xf2c040,0xb07ad8,0x5ab8b0,0xf7a8b8,0xffffff];
const PANTS=[0x3e4a6a,0x6e5a44,0x4a4a52,0x7a6a5a];
export function person(opt={}){
 const R=rng(opt.seed||7);const pick=a=>a[Math.floor(R()*a.length)];
 const o={skin:pick(SKINS),hair:pick(HAIRS),shirt:pick(SHIRTS),pants:pick(PANTS),shoes:0x5a3a26,style:pick(['short','pony','bun','cap','short','long']),skirt:R()<.35,scale:1.18+R()*.2,...opt};
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale);
 const legs=[];for(const s of[-1,1]){const hip=new THREE.Group();hip.position.set(s*.08,.36,0);body.add(hip);mk(new THREE.CylinderGeometry(.065,.058,.3,10),toon(o.pants),0,-.15,0,hip,true);const sh=S(.075,o.shoes,0,-.31,.03,hip,1,.7,1.35);legs.push(hip);}
 const torso=mk(new THREE.CylinderGeometry(.15,.19,.4,16),toon(o.shirt),0,.56,0,body,true);
 if(o.skirt)mk(new THREE.CylinderGeometry(.18,.27,.22,16),toon(shade(o.shirt,-.15)),0,.42,0,body,true);
 if(o.apron){const ap=B(.26,.36,.03,o.apron,0,.5,.17,body);ap.userData.noLine=true;hull(ap,.01);B(.3,.03,.02,shade(o.apron,-.2),0,.68,.17,body).userData.noLine=true;}
 if(o.patch){B(.08,.08,.02,0xa58660,.08,.6,.19,body).userData.noLine=true;}
 const arms=[];for(const s of[-1,1]){const sh=new THREE.Group();sh.position.set(s*.19,.72,0);body.add(sh);mk(new THREE.CylinderGeometry(.05,.045,.27,8),toon(o.shirt),0,-.13,0,sh,true);const hand=new THREE.Group();hand.position.y=-.29;sh.add(hand);S(.058,o.skin,0,0,0,hand);sh.rotation.z=s*.12;arms.push({sh,hand,side:s});}
 const head=new THREE.Group();head.position.y=1.0;body.add(head);
 const faceM=[faceTex(o.skin,0x3a2418,'smile'),faceTex(o.skin,0x3a2418,'open')].map(t=>new THREE.MeshToonMaterial({map:t,gradientMap:ramp()}));
 const skull=mk(new THREE.SphereGeometry(.27,22,16),faceM[0],0,0,0,head,true);
 const hm=toon(o.hair);const cap=mk(new THREE.SphereGeometry(.288,22,14,0,Math.PI*2,0,Math.PI*.46),hm,0,0,0,head,true);cap.rotation.x=-.32;
 S(.2,o.hair,0,-.02,-.12,head,1.25,1,.9);/* 後腦 */
 const fr=mk(new THREE.SphereGeometry(.12,10,8),hm,-.1,.17,.18,head);fr.scale.set(1.2,.5,.6);fr.userData.noLine=true;
 if(o.style==='pony')S(.11,o.hair,0,.02,-.3,head,.9,1.5,.9);
 if(o.style==='bun')S(.12,o.hair,0,.28,-.1,head);
 if(o.style==='long'){S(.17,o.hair,-.2,-.18,-.04,head,.7,1.4,.9);S(.17,o.hair,.2,-.18,-.04,head,.7,1.4,.9);}
 if(o.style==='cap'||o.hat){const hc=o.hat||pick([0xd94a3a,0x5a8fd0,0xf2c040]);const hat=mk(new THREE.SphereGeometry(.295,18,10,0,Math.PI*2,0,Math.PI*.42),toon(hc),0,.02,0,head,true);hat.rotation.x=-.2;const brim=C(.2,.2,.03,hc,0,.07,.24,head,14,false);brim.scale.z=.7;}
 const props={};
 if(o.flyers){props.stack=B(.16,.06,.2,0xfff8e8,0,-.03,.06,arms[0].hand);props.stack.rotation.x=.3;}
 props.flyer=B(.15,.2,.01,0xfff2c0,0,-.08,.08,arms[1].hand);props.flyer.visible=false;props.flyer.userData.noLine=true;
 props.bag=new THREE.Group();arms[1].hand.add(props.bag);B(.2,.22,.1,pick([0xf2c040,0xe8705a,0x7fb84e,0xfff4df]),0,-.16,0,props.bag).userData.noLine=true;mk(new THREE.TorusGeometry(.06,.012,4,10,Math.PI),toon(0x6e4a2a),0,-.05,0,props.bag);props.bag.visible=false;
 const p={g,body,legs,arms,head,skull,faceM,props,phase:R()*6,talk:0};
 p.pose=(dt,moving,speed=1)=>{if(moving)p.phase+=dt*8*speed;const sw=moving?Math.sin(p.phase):0;
  p.legs[0].rotation.x=sw*.6;p.legs[1].rotation.x=-sw*.6;p.body.position.y=moving?Math.abs(Math.cos(p.phase))*.035:0;
  if(!p.armOverride){p.arms[0].sh.rotation.x=-sw*.5;p.arms[1].sh.rotation.x=p.props.bag.visible?-.15+sw*.2:sw*.5;}
  p.talk=Math.max(0,p.talk-dt);p.skull.material=p.faceM[p.talk>0&&Math.sin(performance.now()*.02)>0?1:0];};
 return p;}

/* 對話泡泡 */
function bubble(text){const t=canvasTex(256,96,(g,W,H)=>{g.font='900 34px "Microsoft JhengHei","Noto Sans TC",sans-serif';const tw=Math.min(W-16,g.measureText(text).width+34);const x=(W-tw)/2;g.fillStyle='#fff';g.strokeStyle='#4a2e1c';g.lineWidth=5;g.beginPath();g.roundRect(x,6,tw,62,22);g.fill();g.stroke();g.beginPath();g.moveTo(W/2-10,66);g.lineTo(W/2,88);g.lineTo(W/2+10,66);g.fill();g.stroke();g.fillStyle='#fff';g.fillRect(W/2-8,62,16,6);g.fillStyle='#4a2e1c';g.textAlign='center';g.textBaseline='middle';g.fillText(text,W/2,38);});
 t.wrapS=THREE.ClampToEdgeWrapping;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(1.9,.71,1);s.renderOrder=10;return s;}

/* 冒險者在草地上和一隻幻靈對打：揮劍、命中閃光、幻靈被擊退後彈回來反撲，三秒一輪 */
function fieldBattle(parent,x,z,anim){
 const g=new THREE.Group();g.position.set(x,G,z);g.scale.setScalar(1.2);parent.add(g);
 const hero=person({seed:5151,shirt:0x4f7fc8,pants:0x6e5a44,hair:0x8a4a2a,style:'short',skirt:false,scale:1.15});hero.g.rotation.y=Math.PI/2;g.add(hero.g);
 const blade=new THREE.Group();blade.position.set(0,-.02,.02);hero.arms[1].hand.add(blade);
 mk(new THREE.BoxGeometry(.05,.5,.02),toon(0xdfe8ee),0,-.3,0,blade);mk(new THREE.BoxGeometry(.16,.04,.05),toon(0xd9a521),0,-.04,0,blade);mk(new THREE.BoxGeometry(.04,.1,.04),toon(0x6e4a2a),0,.04,0,blade);blade.rotation.x=Math.PI;
 const shield=mk(new THREE.CylinderGeometry(.13,.13,.04,14),toon(0xc0503a),0,-.02,.05,hero.arms[0].hand,true);shield.rotation.x=Math.PI/2;
 /* 幻靈：圓滾滾的嫩芽小靈，五官貼在臉上 */
 const mon=new THREE.Group();mon.position.set(1.7,0,0);g.add(mon);const body=new THREE.Group();mon.add(body);
 const skin=toon(0x8fd36a,{emissive:0xffffff,emissiveIntensity:0}),belly=toon(0xe6f7c8);
 const blob=mk(new THREE.SphereGeometry(.42,22,16),skin,0,.4,0,body,true);blob.scale.set(1,.88,1);
 mk(new THREE.SphereGeometry(.26,16,12),belly,-.27,.34,0,body).scale.set(.45,.8,.8);
 for(const s of[-1,1]){const eye=mk(new THREE.SphereGeometry(.055,10,8),toon(0x2a1c12),-.36,.5,s*.13,body);eye.scale.set(.35,1,.8);mk(new THREE.SphereGeometry(.018,6,5),toon(0xffffff),-.385,.52,s*.13-.01,body);const ear=mk(new THREE.ConeGeometry(.08,.22,8),skin,.05,.78,s*.2,body,true);ear.rotation.x=s*.5;}
 const sprout=new THREE.Group();sprout.position.set(.05,.78,0);body.add(sprout);for(const s of[-1,1]){const lf=mk(new THREE.SphereGeometry(.09,10,8),toon(0x4f9a3a),s*.08,.1,0,sprout,true);lf.scale.set(1.6,.45,.8);lf.rotation.z=-s*.5;}
 const mouth=mk(new THREE.SphereGeometry(.04,8,6),toon(0x7a2a1c),-.4,.38,0,body);mouth.scale.set(.3,.6,1.4);
 const shadow=mk(new THREE.CircleGeometry(.4,18),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.18,depthWrite:false}),0,.01,0,mon);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
 /* 命中特效：金色星芒＋「砰！」 */
 const spark=new THREE.Group();g.add(spark);for(let i=0;i<6;i++){const st=mk(new THREE.OctahedronGeometry(.08),toon(0xffd84a,{emissive:0xffb020,emissiveIntensity:.8}),0,0,0,spark);st.userData.a=i/6*Math.PI*2;}spark.visible=false;
 const pow=bubble('砰！');pow.scale.set(1.3,.49,1);g.add(pow);pow.visible=false;
 const ease=k=>k<0?0:k>1?1:k*k*(3-2*k);
 anim.push(t=>{const u=t%3;
  /* 冒險者：預備 → 衝刺揮劍 → 收招後退 → 被反撲時後仰 */
  const lunge=u<1.2?0:u<1.5?ease((u-1.2)/.3)*.55:u<2.2?.55*(1-ease((u-1.5)/.7)):0,recoil=u>2.55&&u<2.85?Math.sin((u-2.55)/.3*Math.PI)*.18:0;
  hero.g.position.x=lunge-recoil;hero.body.position.y=u<1.2?Math.abs(Math.sin(u*6))*.03:0;hero.body.rotation.z=-recoil*.8;
  const swing=u<1.2?-2.3+Math.sin(u*4)*.12:u<1.55?-2.3+ease((u-1.2)/.35)*3:u<2.2?.7-ease((u-1.55)/.65)*3:-2.3;hero.arms[1].sh.rotation.x=swing;hero.arms[0].sh.rotation.x=-.9;hero.arms[0].sh.rotation.z=.3;
  const step=u>1.2&&u<1.5?Math.sin((u-1.2)/.3*Math.PI)*.6:0;hero.legs[0].rotation.x=step;hero.legs[1].rotation.x=-step;
  /* 幻靈：原地彈跳 → 被擊中閃白、壓扁、擊退 → 彈回 → 反撲 */
  const hit=u>1.45&&u<1.75,knock=u<1.45?0:u<1.8?ease((u-1.45)/.35)*.75:u<2.4?.75*(1-ease((u-1.8)/.6)):0,tackle=u>2.4&&u<2.9?Math.sin((u-2.4)/.5*Math.PI)*.7:0;
  mon.position.x=1.7+knock-tackle;const hop=u<1.45?Math.abs(Math.sin(u*5))*.18:u>2.4?Math.abs(Math.sin((u-2.4)*6.3))*.25:0;body.position.y=hop;
  const squash=hit?1-Math.sin((u-1.45)/.3*Math.PI)*.35:1;body.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));body.rotation.z=hit?-.35:tackle*.4;
  skin.emissiveIntensity=hit?.55:0;shadow.scale.setScalar(1-hop*.8);sprout.rotation.z=Math.sin(t*9)*.25;
  spark.visible=hit;if(hit){const k=(u-1.45)/.3;spark.position.set(1.25,.6,0);spark.children.forEach(st=>{const r=.15+k*.45;st.position.set(Math.cos(st.userData.a)*r*.4,Math.sin(st.userData.a)*r,Math.sin(st.userData.a*2)*.1);st.scale.setScalar(1-k*.6);});}
  pow.visible=u>1.45&&u<2.05;if(pow.visible){pow.position.set(1.4,1.55+(u-1.45)*.5,0);pow.material.opacity=Math.min(1,(2.05-u)*4);}
 });
 return g;}

/* ---------- 主程式 ---------- */
export const CROWD=[null,{shop:1,pass:2,idle:0},{shop:3,pass:2,idle:0},{shop:5,pass:3,idle:1},{shop:8,pass:5,idle:2},{shop:12,pass:7,idle:3}];
export function buildYard(level,opts={}){
 G=GROUND;const ambient=!!opts.ambient;const Y=layout(level,opts),{w,d,half,zF,zS,zR,pw,H,doorX:DX}=Y,root=new THREE.Group(),props=new THREE.Group(),anim=[];root.add(props);
 const R=rng(level*131+17);
 /* 地面：L1 泥土路；L2 石板小徑；L3 以上整片石板廣場 */
 const road=level===1?dirtTex():cobbleTex();
 const floorStrip=(x,z,ww,dd,tex,y=.02,r=1.2)=>{const m=mk(new THREE.BoxGeometry(ww,.04,dd),texMat(tex,ww/r,dd/r),x,G+y,z,root);m.castShadow=false;m.userData.noLine=true;return m;};
 floorStrip(DX,(zS+zR-1.3)/2,pw,zR-1.3-zS,road);
 floorStrip(0,zR,Y.roadHalf*2+20,2.6,road,.05);
 if(level>=3){const pz0=zF+.2,pz1=zR-1.3;floorStrip(0,(pz0+pz1)/2,half*2+[0,0,0,3,5,7][level],pz1-pz0,cobbleTex(),.01);
  const across=[0,0,0,6,7.5,9][level];floorStrip(0,zR+1.3+across/2,[0,0,0,12,18,24][level],across,plazaTex(level),.035,level===5?2:1.2);}
 if(level===5){const c=mk(new THREE.BoxGeometry(1.4,.03,zR-1.3-zS),toon(0xb5201a),DX,G+.07,(zS+zR-1.3)/2,root);c.userData.noLine=true;c.castShadow=false;}

 const sideX=half+1.2,across=zR+1.3;
 if(level===1){
  fence(props,-half-.6,zF-1.8,-half-.6,zR-1.6,{color:0x9a7a5a,broken:true});fence(props,half+.6,zF-.5,half+.6,zR-1.8,{color:0x9a7a5a,broken:true});
  stump(props,-half-1.5,zF-2.6);deadTree(props,half+2,-d/2+.3);barrel(props,half+.95,zF+.5,1,true);crate(props,-half-1.2,zF+1.2,.45,.5);
  for(let i=0;i<10;i++)weeds(props,(R()<.5?-1:1)*(half+.4+R()*4),zF-3+R()*7);for(let i=0;i<7;i++)rock(props,(R()<.5?-1:1)*(1.4+R()*6),zR+1.8+R()*3,.12+R()*.15);
  tree(props,-6.5,across+3,1.1,'pine');weeds(props,DX+1.2,zS+.8);weeds(props,DX-1.1,zS+1.5);
 }
 if(level>=2){
  const tc=level===2?2:level===3?3:4;for(let i=0;i<tc;i++){const s=i%2?1:-1;tree(props,s*(half+1.8+R()*1.4),-d/2+1+i*1.1,1+R()*.25,i%3===2?'pine':'round');}
  for(let i=0;i<2+level;i++){const s=i%2?1:-1;tree(props,s*(4+R()*(Y.roadHalf-5)),across+(level>=3?[0,0,0,6,7.5,9][level]:0)+1.6+R()*2,.9+R()*.4,R()<.3?'pine':'round');}
  bush(props,-half-.5,zF-.4,1,1);bush(props,half+.5,zF-.6,1,1);
 }
 if(level===2){
  flowerBed(props,DX-(Y.stepW/2+.9),zF+1,1.3,.8);flowerBed(props,DX+Y.stepW/2+.9,zF+1,1.3,.8);
  fence(props,-half-.6,zF+.2,-half-.6,zR-1.5);fence(props,half+.6,zF+.2,half+.6,zR-1.5);fence(props,-half-.6,zR-1.5,DX-pw/2-.3,zR-1.5);fence(props,half+.6,zR-1.5,DX+pw/2+.3,zR-1.5);
  lampPost(props,DX-pw/2-.45,zR-1.75);aBoard(props,DX-pw/2-.75,zS+.35,.35);
  barrel(props,half+.95,zF-.4);barrel(props,half+1.15,zF+.25,.85);crate(props,half+1,zF-1.3,.5,.2);crate(props,half+1.1,zF-1.3,.35,.6).position.y=G+.5;
  bench(props,3,across+1.3,Math.PI);bush(props,-3.2,across+1.2,1.1,1);
 }
 if(level>=3){
  const pl=(x,z)=>{const g=new THREE.Group();g.position.set(x,G,z);props.add(g);B(.8,.5,.8,texMat(stoneTex({base:0xe4d6b6,mortar:0xb8a682,rows:1,cols:2,seed:3}),1,1),0,.25,0,g);bush(g,0,0,.9,1).position.y=.5;};
  pl(DX-(Y.stepW/2+.8),zS-.35);pl(DX+Y.stepW/2+.8,zS-.35);
  for(const s of[-1,1]){lampPost(props,s*(half+.3),zR-1.75,{gold:level>=4});flagPole(props,s*(half+1.3),zF+.3,level===3?0xc8382a:level===4?0x3f6fb8:0xa8171a,anim,level===5?3.6:3);}
  aBoard(props,DX-pw/2-.7,zS+.5,.35,level>=4?'新品上架':'今日特價');
  barrel(props,-half-1.1,zF-.6);crate(props,-half-1.1,zF+.3,.5,.3,[0xf25a3a,0x8ac24a]);sack(props,-half-1.6,zF);
 }
 if(level===3){well(props,-4.8,across+3.2);stall(props,4.6,across+3.3);crate(props,6.2,across+3,.45,.2,[0xf7c840]);}
 if(level===4){fountain(props,0,across+3.8,1.5,anim);stall(props,-5.6,across+3.4,{c1:0x3f6fb8});stall(props,5.6,across+3.4,{c1:0xd94a3a,goods:[0xb07ad8,0x5ab8b0,0xf7c840]});
  for(const s of[-1,1])lampPost(props,s*3,across+1,{gold:true});cart(props,-9.5,across+2.5,.4);
  for(let i=0;i<8;i++)bush(props,-half-.6,zF-3+i*.75,.75);for(let i=0;i<8;i++)bush(props,half+.6,zF-3+i*.75,.75);
  const cols=[0xc22d1c,0xf2c040,0x3f6fb8,0xfffaf0];for(const s of[-1,1])bunting(props,new THREE.Vector3(s*half,G+(-G)+H+.1,zF+.1),new THREE.Vector3(s*(half+.3),G+2.5,zR-1.75),cols);bunting(props,new THREE.Vector3(-3,G+2.5,across+1),new THREE.Vector3(3,G+2.5,across+1),cols);}
 if(level===5){fountain(props,0,across+4.4,2.1,anim,true);stall(props,-6.8,across+3.4,{c1:0xa8171a,c2:0xf2c040});stall(props,6.8,across+3.4,{c1:0x3f6fb8,goods:[0xb07ad8,0x5ab8b0,0xf7c840]});stall(props,-9.8,across+6.4,{c1:0x7fb84e,rot:.3});stall(props,9.8,across+6.4,{c1:0xf0904a,rot:-.3,goods:[0xf25a3a,0xffffff]});
  for(const s of[-1,1]){lampPost(props,s*3.4,across+1,{gold:true});lampPost(props,s*3.4,across+7.6,{gold:true});flagPole(props,s*(half+3),zR-1.8,0xf2c040,anim,3.6);}
  arch(props,DX,zS+1,pw+.4,anim);cart(props,-12,across+3,.5);cart(props,12.5,across+2.5,-.4);
  for(let i=0;i<9;i++)bush(props,-half-.6,zF-3.5+i*.75,.8,i%2);for(let i=0;i<9;i++)bush(props,half+.6,zF-3.5+i*.75,.8,i%2);
  flowerBed(props,DX-(Y.stepW/2+1.2),zF+1.1,1.6,.9,0xf2c040);flowerBed(props,DX+Y.stepW/2+1.2,zF+1.1,1.6,.9,0xf2c040);
  const cols=[0xa8171a,0xf2c040,0xfffaf0,0x3f6fb8];for(const s of[-1,1])bunting(props,new THREE.Vector3(s*half,H+.2,zF+.1),new THREE.Vector3(s*(half+3),G+3.2,zR-1.8),cols);
  bunting(props,new THREE.Vector3(-3.4,G+2.5,across+1),new THREE.Vector3(3.4,G+2.5,across+1),cols);bunting(props,new THREE.Vector3(-3.4,G+2.5,across+7.6),new THREE.Vector3(3.4,G+2.5,across+7.6),cols);
  bunting(props,new THREE.Vector3(-3.4,G+2.5,across+1),new THREE.Vector3(-3.4,G+2.5,across+7.6),cols,.25);bunting(props,new THREE.Vector3(3.4,G+2.5,across+1),new THREE.Vector3(3.4,G+2.5,across+7.6),cols,.25);}
 if(opts.cull)for(const o of [...props.children]){const p=o.position;if((p.x>half-.3&&p.z<zR-1.2)||p.z<-d/2-.2)props.remove(o);}
 if(opts.gardenArea){const a=opts.gardenArea;props.updateMatrixWorld(true);for(const o of [...props.children]){const b=new THREE.Box3().setFromObject(o),left=b.min.x<a.cx-2&&b.max.x>a.minX,right=b.max.x>a.cx+2&&b.min.x<a.maxX;if((left||right)&&b.max.z>a.minZ&&b.min.z<a.maxZ){props.remove(o);o.traverse(n=>n.geometry?.dispose());}}}
 if(opts.reserved?.length){props.updateMatrixWorld(true);for(const o of [...props.children]){const b=new THREE.Box3().setFromObject(o);if(opts.reserved.some(p=>b.max.x>p.x-p.r&&b.min.x<p.x+p.r&&b.max.z>p.z-p.r&&b.min.z<p.z+p.r)){props.remove(o);o.traverse(n=>n.geometry?.dispose());}}}
 const battleAt=level===1?{x:DX-3.6,z:zF+1.75}:null;
 if(battleAt)for(const o of [...props.children]){if(Math.hypot(o.position.x-battleAt.x-.8,o.position.z-battleAt.z)<2.2){props.remove(o);o.traverse(n=>n.geometry?.dispose?.());}}
 addOutline(props);
 if(battleAt)fieldBattle(root,battleAt.x,battleAt.z,anim);

 /* ---------- 人群 ---------- */
 const people=[],crowd=ambient?{...CROWD[level],shop:0}:CROWD[level],RX=Y.roadHalf;
 const groundY=(x,z)=>{if(z<=zF+.18)return 0;if(z>=zS)return G;return THREE.MathUtils.lerp(0,G,(z-(zF+.18))/(zS-zF-.18));};
 const staffColor=[0,0x8a6a48,0x5ea63f,0xc8382a,0xc22d1c,0xa8171a][level];
 const staff=person({seed:900+level,shirt:level===1?0x9a8a70:0xfffaf0,apron:staffColor,hat:level>=2?staffColor:null,style:'short',skirt:false,flyers:true,patch:level===1,scale:1.3});
 const staffPos=new THREE.Vector3(DX+Math.max(Y.stepW/2+.35,pw/2+.45),G,zS+.45);staff.g.position.copy(staffPos);if(!ambient)root.add(staff.g);staff.home=staffPos.clone();
 staff.arms[0].sh.rotation.x=-.9;staff.arms[0].sh.rotation.z=.25;staff.armOverride=true;
 const spawnRoute=(p,shop)=>{const s=R()<.5?-1:1,lane=zR+(R()-.5)*1.4,jx=(R()-.5)*.6;p.route=[];p.wait=0;p.inside=false;
  p.g.position.set(p.first?(R()-.5)*RX*1.6:s*RX,G,lane);p.first=false;
  if(shop){p.route.push({x:jx,z:lane},{x:jx*.5,z:zS+.25},{x:0,z:zF+.25},{x:0,z:d/2-.5});const bx=(R()-.5)*(w-1.6),bz=-d/2+.8+R()*(d-2.2);p.route.push({x:bx,z:bz,wait:2.5+R()*4,browse:true},{x:0,z:d/2-.5},{x:0,z:zF+.25,bag:true},{x:jx*.5,z:zS+.25},{x:-jx,z:lane+(R()-.5)*.6},{x:(R()<.5?-1:1)*RX,z:lane});}
  else p.route.push({x:-s*RX,z:lane,pass:true});
  p.speed=(.85+R()*.4)*(shop?1:1.1);p.flyer=false;p.props.flyer.visible=false;p.props.bag.visible=false;p.got=false;};
 const N=crowd.shop+crowd.pass;
 for(let i=0;i<N;i++){const p=person({seed:level*1000+i*37+3});p.shopper=i<crowd.shop;p.first=true;p.delay=.2+R()*(i<crowd.shop?5:3);p.g.visible=false;root.add(p.g);people.push(p);}
 /* 站著聊天或逛攤位的鎮民 */
 const idlers=[];const spots=level===3?[[4.6,across+2.4,0]]:level===4?[[-5.6,across+2.4,0],[5.6,across+2.4,0],[1.9,across+2.2,-2.2],[2.6,across+2.6,-1.6]]:level===5?[[-6.8,across+2.4,0],[6.8,across+2.4,0],[-1.6,across+2.1,2.6],[-2.2,across+2.6,1.8],[2.4,across+2.3,-2.4],[-9.3,across+5.2,.3]]:[];
 const vendorSpots=level===3?[[4.6,across+4.1,Math.PI]]:level===4?[[-5.6,across+4.2,Math.PI],[5.6,across+4.2,Math.PI]]:level===5?[[-6.8,across+4.2,Math.PI],[6.8,across+4.2,Math.PI],[-9.6,across+7.1,Math.PI+.3],[9.6,across+7.1,Math.PI-.3]]:[];
 for(const [x,z,r] of [...spots.slice(0,crowd.idle+(level>=4?2:0)),...vendorSpots]){const p=person({seed:Math.round(x*100+z*10)+level});p.g.position.set(x,G,z);p.g.rotation.y=r;root.add(p.g);p.idleT=R()*5;idlers.push(p);}

 const bubbles=[];const say=(p,text,dur=2)=>{if(p.bub){p.g.remove(p.bub);}const b=bubble(text);b.position.set(0,1.75,0);p.g.add(b);p.bub=b;p.bubT=dur;p.talk=Math.min(dur,1.2);};
 const LINES=['歡迎光臨！','今日特價喔！','新貨上架！','來看看吧～','送你一張傳單！'];
 const THANKS=['好喔！','♪','去看看！','謝謝～'];
 let staffCool=1.5,give=0,giveTarget=null,waveT=0;
 const v=new THREE.Vector3();
 function update(dt,t){
  for(const f of anim)f(t);
  for(const p of people){
   if(p.delay>0){p.delay-=dt;if(p.delay<=0){spawnRoute(p,p.shopper);p.g.visible=true;}continue;}
   if(!p.route)continue;const tg=p.route[0];if(!tg){p.g.visible=false;p.delay=1+R()*5;p.route=null;continue;}
   if(p.wait>0){p.wait-=dt;p.pose(dt,false);p.head.rotation.y=Math.sin(t*1.3+p.phase)*.6;if(p.wait<=0){p.route.shift();p.head.rotation.y=0;}continue;}
   const dx=tg.x-p.g.position.x,dz=tg.z-p.g.position.z,dist=Math.hypot(dx,dz),step=p.speed*1.1*dt;
   if(dist<=step){p.g.position.x=tg.x;p.g.position.z=tg.z;if(tg.bag)p.props.bag.visible=true;if(tg.wait){p.wait=tg.wait;}else p.route.shift();}
   else{p.g.position.x+=dx/dist*step;p.g.position.z+=dz/dist*step;const want=Math.atan2(dx,dz);let da=want-p.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));p.g.rotation.y+=da*Math.min(1,dt*10);}
   p.g.position.y=groundY(p.g.position.x,p.g.position.z);p.pose(dt,dist>step,p.speed);
   /* 路人拿到傳單後，有機會轉進店裡 */
   if(!ambient&&!p.shopper&&p.got&&!p.converted&&Math.abs(p.g.position.x)<1.2){p.converted=true;if(R()<.6){p.shopper=true;const lane=p.g.position.z,s=-Math.sign(tg.x)||1;const jx=p.g.position.x*.3;spawnRouteFrom(p,lane,jx);}}
  }
  function spawnRouteFrom(p,lane,jx){const bx=(R()-.5)*(w-1.6),bz=-d/2+.8+R()*(d-2.2);p.route=[{x:jx*.5,z:zS+.25},{x:0,z:zF+.25},{x:0,z:d/2-.5},{x:bx,z:bz,wait:2.5+R()*3},{x:0,z:d/2-.5},{x:0,z:zF+.25,bag:true},{x:jx*.5,z:zS+.25},{x:-jx,z:lane},{x:(R()<.5?-1:1)*RX,z:lane}];}
  /* 店員：轉向最近的人，揮手招呼，靠近時遞傳單 */
  if(!ambient){let best=null,bd=5.2;for(const p of people){if(!p.g.visible||!p.route||p.g.position.z<zF+.3)continue;const dd=p.g.position.distanceTo(staff.g.position);if(dd<bd){bd=dd;best=p;}}
  const look=best?Math.atan2(best.g.position.x-staff.g.position.x,best.g.position.z-staff.g.position.z):0;let da=look-staff.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));staff.g.rotation.y+=da*Math.min(1,dt*4);
  staffCool-=dt;
  if(give>0){give-=dt;const k=1-give/.9;staff.arms[1].sh.rotation.x=-Math.sin(Math.min(1,k*1.6)*Math.PI/2)*1.35;staff.props.flyer.visible=k<.55;if(k>=.55&&giveTarget&&!giveTarget.got){giveTarget.got=true;giveTarget.props.flyer.visible=!giveTarget.props.bag.visible;say(giveTarget,THANKS[Math.floor(R()*THANKS.length)],1.4);}if(give<=0){staff.arms[1].sh.rotation.x=0;}}
  else if(waveT>0){waveT-=dt;staff.arms[1].sh.rotation.x=-2.6;staff.arms[1].sh.rotation.z=-.3+Math.sin(t*14)*.35;if(waveT<=0){staff.arms[1].sh.rotation.set(0,0,-.12);}}
  else if(best&&staffCool<=0){if(bd<1.5&&!best.got&&!best.props.bag.visible){give=.9;giveTarget=best;staff.props.flyer.visible=true;say(staff,'送你一張傳單！',1.6);staffCool=1.4;}
   else if(bd<5.2){waveT=1.1;say(staff,LINES[Math.floor(R()*4)],1.8);staffCool=2.4+R()*1.5;if(!best.got&&!best.shopper&&R()<.5)best.got=true;}}
  else if(!best&&staffCool<=0){say(staff,LINES[Math.floor(R()*4)],1.8);waveT=1;staffCool=4+R()*2;}
  staff.pose(dt,false);staff.body.position.y=Math.abs(Math.sin(t*2))*.01;}
  for(const p of idlers){p.idleT+=dt;p.pose(dt,false);p.head.rotation.y=Math.sin(p.idleT*.7)*.5;p.body.rotation.z=Math.sin(p.idleT*1.6)*.02;if(p.idleT%9<dt&&R()<.5)say(p,['這個好！','多少錢？','真熱鬧～','嗯…'][Math.floor(R()*4)],1.6);}
  for(const p of [...people,...(ambient?[]:[staff]),...idlers])if(p.bub){p.bubT-=dt;p.bub.material.opacity=Math.min(1,p.bubT*3);if(p.bubT<=0){p.g.remove(p.bub);p.bub=null;}}
 }
 root.userData={level,lineMats:props.userData.lineMats,camZ:(zR+(level>=3?[0,0,0,6,7.5,9][level]:2))/2-.6,extent:Y.roadHalf};
 return {root,update,people,staff};
}

/* 商會用的主角：同一套 Q 版畫風（黑髮、藍外套、黃色背帶與背包），提供商會角色控制介面 */
export function createHeroChibi(){
 const p=person({seed:4242,skin:0xffdcbc,hair:0x2a2226,shirt:0x3f7fd0,pants:0x5a5f72,shoes:0x8a4a2a,style:'short',skirt:false,scale:1});
 const strap=toon(0xf2c040),pack=toon(0x9a6438);
 for(const s of[-1,1]){const st=mk(new THREE.BoxGeometry(.05,.42,.02),strap,s*.09,.56,.165,p.body);st.rotation.z=s*.12;st.userData.noLine=true;}
 mk(new THREE.BoxGeometry(.3,.06,.02),strap,0,.5,.17,p.body).userData.noLine=true;
 const bp=mk(new THREE.BoxGeometry(.3,.34,.15),pack,0,.58,-.24,p.body);mk(new THREE.BoxGeometry(.31,.12,.16),strap,0,.7,-.24,p.body);
 /* 前額翹髮 */
 for(const [x,r] of [[-.08,.5],[.04,-.2],[.13,-.7]]){const c=mk(new THREE.ConeGeometry(.06,.18,6),toon(0x2a2226),x,.24,.16,p.head);c.rotation.set(.9,0,r);}
 p.g.traverse(o=>{if(o.userData.isHull)o.parent.remove(o);});tune(p.g);
 let mode='Idle',time=0,mood='';
 return {root:p.g,human:p,setMode(m){mode=m;},setMood(m){mood=m||'';},setAction(){},
  update(dt){time+=dt;const moving=mode==='Walk'||mode==='Run';p.pose(dt,moving,mode==='Run'?1.4:1);if(!moving){p.body.position.y=Math.sin(time*2.2)*.01;p.head.rotation.z=Math.sin(time*.9)*.04;}
   if(mood==='happy'||mood==='proud'){p.talk=.3;}},
  dispose(){p.g.traverse(o=>o.geometry?.dispose?.());}};
}
