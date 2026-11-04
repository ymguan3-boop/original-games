/* 輕量 3D 戰鬥粒子：真實低面數幾何、零外部依賴，直接跑在遊戲的 Three.js r128。
   粒子軌跡全在頂點著色器計算，發射時只寫一次資料，平常 CPU 不用逐顆更新；同一種形狀共用一個 draw call。
   不透明、會寫深度，手機上沒有半透明重繪成本，也不會和模型互相穿幫。
   只負責畫面：不讀寫血量、天氣、天空、霧或存檔。回退：?vfx3d=0 或 localStorage phantom-vfx3d=off。 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;root.Vfx3D=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){'use strict';
const SETTING='phantom-vfx3d';
function enabled(){try{const q=new URLSearchParams(root.location?.search||'').get('vfx3d');if(q==='0'||q==='off')return false;if(q==='1'||q==='on')return true;return root.localStorage?.getItem(SETTING)!=='off';}catch{return true;}}
function lowPower(){try{return !!(root.matchMedia?.('(max-width: 820px)').matches||root.matchMedia?.('(pointer: coarse)').matches||root.navigator?.connection?.saveData);}catch{return false;}}
const LIMITS={high:{shard:520,ring:32,density:1},low:{shard:220,ring:16,density:.55}};
const VERT=`precision highp float;
attribute vec3 aOrigin,aVel,aColor;attribute vec4 aTime;
uniform float uTime,uGravity,uDrag,uGrow;varying vec3 vColor;varying float vShade;
vec3 spin(vec3 p,float a,float b){float c=cos(a),s=sin(a);p=vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);c=cos(b);s=sin(b);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
void main(){float t=uTime-aTime.x,life=aTime.y,k=t/life;if(k<0.||k>=1.){gl_Position=vec4(2.,2.,2.,1.);return;}
float d=(1.-exp(-uDrag*t))/uDrag;vec3 c=aOrigin+aVel*d;c.y+=-.5*uGravity*t*t*aTime.w;if(c.y<.04&&uGrow<.5)c.y=.04;
float size=aTime.z*(uGrow>.5?(.25+k*uGrow):(1.-k*k));vec3 n=normal,p=position*size;
if(uGrow>.5){p.xy*=1.;p.z*=1.-k;p=vec3(p.x,p.z,p.y);n=vec3(0.,1.,0.);}else{float a=t*(4.+aTime.w*7.)+aVel.x,b=t*3.+aVel.z;p=spin(p,a,b);n=spin(n,a,b);}
vColor=aColor;vShade=.72+.28*max(0.,dot(normalize(mat3(modelMatrix)*n),vec3(.32,.84,.42)));
gl_Position=projectionMatrix*modelViewMatrix*vec4(c+p,1.);}`;
const FRAG=`precision mediump float;varying vec3 vColor;varying float vShade;void main(){gl_FragColor=vec4(vColor*vShade,1.);}`;
function pool(T,geo,cap,gravity,drag,grow,parent,order){
 const g=new T.InstancedBufferGeometry();g.index=geo.index;g.setAttribute('position',geo.attributes.position);g.setAttribute('normal',geo.attributes.normal);g.instanceCount=cap;
 const add=(name,n)=>{const a=new T.InstancedBufferAttribute(new Float32Array(cap*n),n);a.setUsage(T.DynamicDrawUsage);g.setAttribute(name,a);return a;};
 const origin=add('aOrigin',3),vel=add('aVel',3),color=add('aColor',3),time=add('aTime',4);time.array.fill(-1e4);
 const uniforms={uTime:{value:0},uGravity:{value:gravity},uDrag:{value:drag},uGrow:{value:grow}};
 const material=new T.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,uniforms,fog:false,toneMapped:false,side:grow?T.DoubleSide:T.FrontSide});
 const mesh=new T.Mesh(g,material);mesh.frustumCulled=false;mesh.renderOrder=order;mesh.visible=false;parent.add(mesh);
 let head=0,liveUntil=0,dirty=false;
 return{cap,mesh,uniforms,attrs:[origin,vel,color,time],spawn(now,x,y,z,vx,vy,vz,r,gb,b,life,size,w){const i=head;head=(head+1)%cap;origin.setXYZ(i,x,y,z);vel.setXYZ(i,vx,vy,vz);color.setXYZ(i,r,gb,b);time.setXYZW(i,now,life,size,w);dirty=true;liveUntil=Math.max(liveUntil,now+life);},
  sync(now){uniforms.uTime.value=now;mesh.visible=now<liveUntil;if(dirty){dirty=false;for(const a of [origin,vel,color,time])a.needsUpdate=true;}},
  live(now){return now<liveUntil;},clear(){time.array.fill(-1e4);time.needsUpdate=true;liveUntil=0;mesh.visible=false;},
  dispose(){parent.remove(mesh);g.dispose();material.dispose();}};
}
const COLORS={焰:[0xff7a2a,0xffd25a,0xff3b1f],潮:[0x3fb6ff,0xbfeeff,0x1f7fe0],森:[0x62d873,0xd8f58a,0x2f9c4e],雷:[0xffe23a,0xfff6b0,0xffb71f],念:[0xb66bff,0xeed2ff,0x7f46d8],光:[0xffe7a0,0xffffff,0xffc65a]};
function create({THREE:T,parent,quality}={}){
 const tier=quality||(lowPower()?'low':'high'),L=LIMITS[tier],on=enabled()&&!!T&&!!parent;
 const stats={bursts:0,particles:0,rings:0,tier,on,drawCalls:0};
 if(!on)return{burst(){return false;},ring(){return false;},hit(){return false;},update(){},clear(){},dispose(){},stats:()=>({...stats}),enabled:false,tier};
 const shardGeo=new T.OctahedronGeometry(1,0),ringGeo=new T.RingGeometry(.86,1,28),shards=pool(T,shardGeo,L.shard,1,1.9,0,parent,30),rings=pool(T,ringGeo,L.ring,0,1,3.4,parent,29),c=new T.Color();
 let now=0,disposed=false;
 const rgb=v=>{c.setHex(v);return[c.r,c.g,c.b];};
 /* c.setHex 在 r128 不做色彩空間轉換，數值即畫面顏色 */
 function burst(p,{count=12,colors=COLORS.光,speed=4,up=2.4,size=.14,life=.5,spread=1,gravity=9}={}){if(disposed)return false;const n=Math.max(1,Math.round(count*L.density));for(let i=0;i<n;i++){const a=Math.random()*6.2832,s=speed*(.45+Math.random()*.75)*spread,[r,g,b]=rgb(colors[i%colors.length]);shards.spawn(now,p.x,p.y,p.z,Math.cos(a)*s,up*(.5+Math.random()),Math.sin(a)*s,r,g,b,life*(.75+Math.random()*.4),size*(.7+Math.random()*.7),gravity/9);}stats.bursts++;stats.particles+=n;return true;}
 function ring(p,{radius=1,color=0xffffff,life=.32}={}){if(disposed)return false;const [r,g,b]=rgb(color);rings.spawn(now,p.x,Math.max(.06,p.y||0),p.z,0,0,0,r,g,b,life,radius,0);stats.rings++;return true;}
 /* 命中配方：一次爆散＋貼地衝擊環，強力招式加量而不是加層數 */
 function hit(p,element,strong=false){const colors=COLORS[element]||COLORS.光;burst(p,{count:strong?22:9,colors,speed:strong?5.4:3.6,up:strong?4:2.4,size:strong?.17:.12,life:strong?.62:.42});if(strong)ring({x:p.x,y:.08,z:p.z},{radius:1.25,color:colors[0],life:.34});return true;}
 function update(dt){if(disposed)return;now+=dt;shards.sync(now);rings.sync(now);stats.drawCalls=(shards.live(now)?1:0)+(rings.live(now)?1:0);}
 function clear(){shards.clear();rings.clear();}
 function dispose(){if(disposed)return;disposed=true;shards.dispose();rings.dispose();shardGeo.dispose();ringGeo.dispose();}
 return{burst,ring,hit,update,clear,dispose,stats:()=>({...stats}),enabled:true,tier};
}
return{create,enabled,lowPower,LIMITS,COLORS};
});
