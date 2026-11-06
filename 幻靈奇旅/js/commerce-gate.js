/* 初光商會外圍：藤蔓木圍籬、自動大門與看門狗「招財」。全部程序建模，零件合併成單一網格再上輪廓，手機也只多幾個 draw call。 */
(() => {
'use strict';
const WOOD=0xb8682a,WOOD_D=0x8a4a1c,STONE=0xe6d6bb,STONE_D=0xc8b596,VINE=0x5f9c2c,LEAF=0x86c43a,PETAL=0xfff6e2,YOLK=0xf4c42a,RED=0xd8301f,RED_D=0xa81f14,GOLD=0xf2b81e,COAT=0xf6c63d,CREAM=0xfdeccb,INK=0x2a1a12,BROWN=0x8a4f22,PINK=0xf0707a,WHITE=0xffffff;
const PANEL=2.9,HEIGHT=1.5,LIT=.62,GATE_DEPTH=.9,FACE_DOOR=Math.atan2(2.6,-3.4),DOG_Y=.1;
/* 依顏色寫入頂點色，所有零件併成一個 BufferGeometry。 */
function builder(T){
 const pos=[],nor=[],col=[],m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),c=new T.Color(),n3=new T.Matrix3();
 function put(geo,color,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const g=geo.index?geo.toNonIndexed():geo,p=g.attributes.position,n=g.attributes.normal;e.set(rx,ry,rz);q.setFromEuler(e);m.compose(new T.Vector3(x,y,z),q,new T.Vector3(sx,sy,sz));n3.getNormalMatrix(m);c.setHex(color);const v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(n3).normalize();nor.push(v.x,v.y,v.z);col.push(c.r*LIT,c.g*LIT,c.b*LIT);}}
 function mesh(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));const o=new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true}));o.castShadow=true;return o;}
 return{put,mesh};
}
function shapes(T){return{box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(1,10,7),low:new T.SphereGeometry(1,6,4),cyl:new T.CylinderGeometry(1,1,1,10),disc:new T.CylinderGeometry(1,1,1,16),dome:new T.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2),ring:new T.TorusGeometry(1,.09,6,16)};}
/* 一段圍籬：木柱、上下橫木、交叉格柵，加上藤蔓與葉片 */
function panel(b,S,x,z,alongX,seed){
 const at=(u,v=0)=>alongX?[x+u,z+v]:[x+v,z+u],ry=alongX?0:Math.PI/2,[px,pz]=at(0);
 b.put(S.box,STONE,px,.16,pz,.56,.32,.56);b.put(S.box,WOOD,px,.82,pz,.28,HEIGHT-.1,.28);b.put(S.box,WOOD_D,px,HEIGHT+.02,pz,.4,.14,.4);b.put(S.low,LEAF,px,HEIGHT+.22,pz,.17,.22,.17);
 for(const y of [.46,1.16]){const [rx,rz]=at(PANEL/2);b.put(S.box,WOOD,rx,y,rz,alongX?PANEL:.14,.17,alongX?.14:PANEL);}
 const [mx,mz]=at(PANEL/2),len=Math.hypot(PANEL-.3,.72)*.98,tilt=Math.atan2(.72,PANEL-.3);
 for(const s of [-1,1])b.put(S.box,WOOD_D,mx,.81,mz,len,.11,.08,0,ry,s*tilt);
 for(let i=0;i<4;i++){const u=.35+i*.72,[vx,vz]=at(u,.11),y=1.16+Math.sin(i*1.9+seed)*.1;b.put(S.low,VINE,vx,y,vz,.11,.09,.11);if((i+seed)%2===0){const[lx,lz]=at(u+.12,.17);b.put(S.low,LEAF,lx,y+.12,lz,.17,.07,.12,.5,seed,.4);}}
 if(seed%3===0){const[fx,fz]=at(PANEL*.62,.2);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;b.put(S.low,PETAL,fx+(alongX?Math.cos(a)*.1:0),.84+Math.sin(a)*.1,fz+(alongX?0:Math.cos(a)*.1),.09,.09,.05);}b.put(S.low,YOLK,fx,.84,fz,.06,.06,.07);}
}
function buildFence(T,LOT,S){
 const b=builder(T),north=LOT.minZ+GATE_DEPTH,south=LOT.maxZ-.25,east=LOT.maxX-.25,west=LOT.minX+.25;let seed=0;
 const run=(from,to,fixed,alongX)=>{const n=Math.max(1,Math.round(Math.abs(to-from)/PANEL)),step=(to-from)/n;for(let i=0;i<n;i++){const u=from+i*step;if(alongX){panelAt(u,fixed,true,step);}else panelAt(fixed,u,false,step);}};
 const panelAt=(x,z,alongX,step)=>{const flip=step<0;panel(b,S,alongX?(flip?x+step:x):x,alongX?z:(flip?z+step:z),alongX,seed++);};
 run(-LOT.gate-1,west,north,true);run(LOT.gate+1,east,north,true);run(north,south,west,false);run(north,south,east,false);run(west,east,south,true);
 return b.mesh();
}
function buildGate(T,LOT,S,root){
 const b=builder(T),z=LOT.minZ+GATE_DEPTH,g=LOT.gate,px=g+.42;
 for(const s of [-1,1]){const x=s*px;b.put(S.box,STONE_D,x,.2,z,1.14,.4,1.14);b.put(S.box,STONE,x,1.26,z,.9,1.8,.9);for(const y of [.72,1.26,1.8])b.put(S.box,STONE_D,x,y,z,.93,.04,.93);b.put(S.box,WOOD,x,2.28,z,1.12,.22,1.12);b.put(S.box,WOOD_D,x,2.52,z,.46,.26,.46);b.put(S.box,WOOD,x,3,z,.62,.12,.62);b.put(S.dome,WOOD,x,3.05,z,.4,.28,.4);for(const [dx,dz] of [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]])b.put(S.box,WOOD_D,x+dx,2.78,z+dz,.05,.44,.05);}
 for(let i=0;i<=20;i++){const a=i/20*Math.PI,x=Math.cos(a)*px,y=2.3+Math.sin(a)*1.75,t=Math.atan2(Math.sin(a)*1.75,Math.cos(a)*px);b.put(S.box,WOOD,x,y,z,.72,.3,.32,0,0,a+Math.PI/2);if(i%2===0)b.put(S.low,VINE,x+.08,y+.16,z+.14,.15,.13,.15);if(i%3===0)b.put(S.low,LEAF,x-.06,y+.26,z+.18,.27,.09,.17,.4,i,.5);if(i===6||i===14){for(let k=0;k<5;k++){const q=k/5*Math.PI*2;b.put(S.low,PETAL,x+Math.cos(q)*.17,y+.2+Math.sin(q)*.17,z+.26,.14,.14,.06);}b.put(S.low,YOLK,x,y+.2,z+.3,.09,.09,.07);}}
 /* 郵筒掛在右柱 */
 b.put(S.box,RED,px,1.46,z+.56,.62,.5,.26);b.put(S.cyl,RED_D,px,1.71,z+.56,.31,.26,.31,0,0,Math.PI/2);b.put(S.box,CREAM,px,1.44,z+.7,.34,.2,.03);
 const fixed=b.mesh();root.add(fixed);
 const glass=new T.MeshBasicMaterial({color:0xffd66b,toneMapped:false}),lamps=[];for(const s of [-1,1]){const l=new T.Mesh(new T.BoxGeometry(.3,.36,.3),glass);l.position.set(s*px,2.78,z);root.add(l);lamps.push(l);}
 const leaves=[-1,1].map(s=>{const h=new T.Group();h.position.set(s*(g+.02),0,z);const w=builder(T),d=-s,W=g-.04;for(const y of [.34,2.02])w.put(S.box,WOOD,d*W/2,y,0,W,.22,.16);w.put(S.box,WOOD,d*.1,1.2,0,.22,1.9,.16);w.put(S.box,WOOD,d*(W-.1),1.15,0,.22,1.8,.16);for(let i=0;i<3;i++){const u=.8+i*.85;w.put(S.ring,VINE,d*u,.86+i%2*.42,0,.38,.38,.5);w.put(S.low,LEAF,d*u,1.26-i%2*.32,.06,.2,.09,.12,.4,i,.3);}w.put(S.box,GOLD,d*(W-.5),1.15,.08,.26,.26,.06,0,0,Math.PI/4);const o=w.mesh();h.add(o);root.add(h);return{h,s};});
 return{leaves,glass,lamps};
}
/* 招財：比照設定圖的金毛柴犬＋紅帽紅袍，頭身分開才能點頭、搖尾巴 */
function coinTexture(T){const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');g.fillStyle='#f6bf1f';g.beginPath();g.arc(48,48,47,0,7);g.fill();g.lineWidth=7;g.strokeStyle='#a56a10';g.beginPath();g.arc(48,48,40,0,7);g.stroke();g.fillStyle='#8a4f10';g.font='900 30px "Microsoft JhengHei",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('招',48,32);g.fillText('財',48,64);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;}
function buildDog(T,S){
 /* 招財沒有輪廓線，靠深紅、橘毛、奶白的明暗差把部位分開 */
 const RED=0xc4140c,RED_D=0x6a0806,GOLD=0xffd21f,COAT=0xe8820e,CREAM=0xfffaf0,BROWN=0x54290c;
 const root=new T.Group(),body=builder(T),head=builder(T),tail=builder(T);root.name='招財';
 body.put(S.ball,RED,0,.72,0,.46,.5,.4);body.put(S.ball,COAT,0,.22,0,.3,.22,.28);body.put(S.ball,CREAM,0,.8,.3,.22,.26,.14);
 body.put(S.box,GOLD,0,.42,.32,.72,.1,.08);body.put(S.box,RED_D,0,.42,0,.86,.26,.68);body.put(S.box,GOLD,0,.29,.34,.86,.05,.03);
 body.put(S.ring,GOLD,0,1.06,.02,.3,.3,.6,Math.PI/2);
 for(const s of [-1,1]){body.put(S.ball,RED,s*.46,.72,.08,.15,.27,.15,.3,0,s*.5);body.put(S.ball,GOLD,s*.58,.53,.14,.15,.08,.15);body.put(S.ball,CREAM,s*.62,.42,.18,.15,.13,.15);body.put(S.ball,COAT,s*.22,.12,.1,.17,.13,.2);body.put(S.ball,CREAM,s*.23,.08,.26,.17,.08,.14);}
 body.put(S.box,BROWN,.1,.74,.02,.08,.98,.72,0,0,-.7);body.put(S.box,BROWN,.52,.42,.14,.3,.3,.2);body.put(S.box,BROWN,.52,.54,.25,.32,.13,.05);body.put(S.box,GOLD,.52,.48,.27,.09,.09,.05);
 const torso=body.mesh();root.add(torso);
 const coin=new T.Mesh(new T.CircleGeometry(.2,20),new T.MeshBasicMaterial({map:coinTexture(T)}));coin.position.set(0,.84,.45);root.add(coin);
 const neck=new T.Group();neck.position.set(0,1.1,.02);root.add(neck);
 head.put(S.ball,COAT,0,.42,0,.56,.5,.5);head.put(S.ball,CREAM,0,.28,.28,.3,.22,.25);head.put(S.ball,CREAM,-.2,.52,.38,.12,.1,.08);head.put(S.ball,CREAM,.2,.52,.38,.12,.1,.08);
 head.put(S.ball,INK,0,.38,.53,.085,.06,.05);head.put(S.ball,RED_D,0,.2,.46,.13,.09,.08);head.put(S.ball,PINK,0,.17,.5,.08,.06,.06);
 for(const s of [-1,1]){head.put(S.ball,INK,s*.22,.48,.44,.085,.1,.05);head.put(S.ball,WHITE,s*.2,.52,.49,.03,.035,.02);head.put(S.ball,COAT,s*.6,.34,0,.2,.42,.26,0,0,s*.28);}
 head.put(S.dome,RED,0,.72,-.03,.56,.42,.54);head.put(S.box,GOLD,0,.74,.02,1.04,.08,.92);head.put(S.ball,RED_D,0,.72,.5,.46,.05,.26,.2);head.put(S.ball,GOLD,0,1.14,-.03,.12,.12,.12);head.put(S.ball,GOLD,0,.88,.44,.1,.1,.05);
 const face=head.mesh();neck.add(face);
 const wag=new T.Group();wag.position.set(0,.3,-.36);root.add(wag);tail.put(S.ball,COAT,0,.1,-.14,.13,.2,.13,-.8);tail.put(S.ball,COAT,0,.3,-.26,.14,.17,.14,-.2);tail.put(S.ball,CREAM,0,.47,-.24,.11,.12,.11);const brush=tail.mesh();wag.add(brush);
 return{root,neck,wag};
}
function create({THREE:T,parent,LOT,frontZ}){
 const S=shapes(T),fence=buildFence(T,LOT,S);parent.add(fence);
 const gateRoot=new T.Group();parent.add(gateRoot);const gate=buildGate(T,LOT,S,gateRoot);
 const dog=buildDog(T,S),post={x:0,z:LOT.minZ-.3};dog.root.position.set(post.x,DOG_Y,post.z);dog.root.rotation.y=Math.PI;dog.root.scale.setScalar(.92);parent.add(dog.root);
 window.ToonOutline?.add(T,fence);window.ToonOutline?.add(T,gateRoot);
 Object.values(S).forEach(g=>g.dispose());
 /* 帶路：從大門沿西側步道繞到店門口旁等玩家 */
 const route=[[0,LOT.minZ+2.6],[-12.4,LOT.minZ+3.2],[-12.4,frontZ+3.4],[-2.6,frontZ+3.4]],door={x:0,z:frontZ+2.6},trail=[];
 let phase='guard',open=0,time=0,leg=0,leash=15;
 function setPhase(next){phase=next;leg=0;trail.length=0;dog.root.visible=next!=='gone';if(next==='lead')trail.push({x:dog.root.position.x,z:dog.root.position.z});if(next==='wait'){const[x,z]=route[route.length-1];dog.root.position.set(x,DOG_Y,z);dog.root.rotation.y=FACE_DOOR;}}
 function step(dt,player){
  if(phase==='lead'){const [x,z]=route[leg],p=dog.root.position,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz),waiting=player&&Math.hypot(player.x-p.x,player.z-p.z)>leash;if(d<.2){trail.push({x:p.x,z:p.z});if(++leg>=route.length){phase='wait';dog.root.rotation.y=FACE_DOOR;}}else if(!waiting){const k=Math.min(d,5.6*dt),last=trail[trail.length-1];p.x+=dx/d*k;p.z+=dz/d*k;if(!last||Math.hypot(last.x-p.x,last.z-p.z)>.6)trail.push({x:p.x,z:p.z});dog.root.rotation.y=Math.atan2(dx,dz);p.y=DOG_Y+Math.abs(Math.sin(time*11))*.16;}}
 }
 function update(dt,player,{unlocked}){time+=dt;
  const near=!!player&&Math.hypot(player.x,player.z-(LOT.minZ+GATE_DEPTH))<6.5,want=near&&unlocked;open=Math.max(0,Math.min(1,open+(want?dt*2.4:-dt*1.8)));for(const l of gate.leaves)l.h.rotation.y=l.s*open*1.5;
  if(phase==='gone')return;step(dt,player);dog.wag.rotation.z=Math.sin(time*(phase==='guard'?7:13))*.42;dog.neck.rotation.x=phase==='guard'?Math.sin(time*1.6)*.05:0;dog.neck.rotation.z=Math.sin(time*.9)*.05;if(phase!=='lead')dog.root.position.y=DOG_Y;
 }
 const gateZ=LOT.minZ+GATE_DEPTH;
 function blocked(x,z,m=.42){if(Math.abs(x)<LOT.gate&&Math.abs(z-gateZ)<.5+m&&open<.7)return true;if(phase==='guard'&&Math.hypot(x-post.x,z-post.z)<.85+m)return true;if(Math.abs(Math.abs(x)-(LOT.gate+.42))<.55+m&&Math.abs(z-gateZ)<.55+m)return true;return false;}
 return{update,blocked,setPhase,setLeash(v){leash=v;},post,door,trail,get phase(){return phase;},get open(){return open;},dog:dog.root,dispose(){gate.glass.dispose();}};
}
window.PhantomCommerceGate={create};
})();
