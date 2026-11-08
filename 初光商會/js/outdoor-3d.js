/* 3D 店外：初光鎮的一般戶外景色，參考使用者提供的五階店面圖。
 * 草地、石板路、圓樹、花叢、石圍花圃、木柵欄、石燈、旗桿。每類零件合併成一個網格，整片戶外只多幾個 draw call。 */
function builder(T){
 const pos=[],nor=[],col=[],m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),c=new T.Color(),n3=new T.Matrix3(),v=new T.Vector3();
 function put(geo,color,x,y,z,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0){const g=geo.index?geo.toNonIndexed():geo,p=g.attributes.position,n=g.attributes.normal;e.set(rx,ry,rz);q.setFromEuler(e);m.compose(new T.Vector3(x,y,z),q,new T.Vector3(sx,sy,sz));n3.getNormalMatrix(m);c.setHex(color).convertSRGBToLinear();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(n3).normalize();nor.push(v.x,v.y,v.z);col.push(c.r,c.g,c.b);}}
 function mesh(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));const o=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.9}));o.castShadow=true;o.receiveShadow=true;return o;}
 return {put,mesh};
}
const rand=seed=>()=>(seed=(seed*9301+49297)%233280)/233280;
export function buildOutdoor(T,{width,depth,entrance,level=1,grassMat}){
 const group=new T.Group();group.name='初光鎮戶外';const r=rand(77+level);
 const S={ball:new T.SphereGeometry(1,16,12),rod:new T.CylinderGeometry(1,1,1,12),disc:new T.CylinderGeometry(1,1,1,18),cone:new T.ConeGeometry(1,1,12)};
 /* 草地：大片平面，顏色跟著季節的 grass 材質 */
 const ground=new T.Mesh(new T.PlaneGeometry(90,90),grassMat);ground.rotation.x=-Math.PI/2;ground.position.set(width/2,-.07,depth/2);ground.receiveShadow=true;group.add(ground);
 const stone=builder(T),plant=builder(T),wood=builder(T);
 /* 石板路：入口往外延伸，另一條沿店前橫過去 */
 for(let i=0;i<9;i++){const z=depth+.4+i*.95,x=entrance.x+Math.sin(i*.8)*.35;stone.put(S.disc,0xd8cbb4,x,-.05,z,.42+r()*.1,.06,.3+r()*.08);}
 for(let i=0;i<7;i++)stone.put(S.disc,0xcdbfa6,entrance.x-2.2-i*1.05,-.05,depth+2.6+Math.sin(i)*.3,.4,.06,.32);
 /* 圓樹：店後方與兩側，避開店面 */
 const tree=(x,z,s=1)=>{wood.put(S.rod,0x7a4a24,x,.7*s,z,.16*s,1.4*s,.16*s);for(const[dx,dy,dz,k]of[[0,1.9,0,1],[.5,1.6,.2,.75],[-.45,1.65,-.15,.78],[.1,2.35,.1,.7],[-.2,1.5,.45,.65]])plant.put(S.ball,k>.9?0x5fae3a:0x6fbf44,x+dx*s,dy*s,z+dz*s,.85*k*s);for(let i=0;i<5;i++)plant.put(S.ball,0xffe36e,x+(r()-.5)*1.4*s,(1.5+r()*1.1)*s,z+.6*s,.08);};
 for(let x=-3;x<width+4;x+=3.2+r())tree(x,-3.2-r()*1.5,1+r()*.3);
 for(let z=1;z<depth+2;z+=3.4+r())tree(-3.4-r()*1.2,z,1+r()*.25);
 for(let z=2;z<depth;z+=3.6+r())tree(width+2.8+r(),z,.9+r()*.3);
 /* 花叢與石圍花圃：店前左右 */
 const bush=(x,z,s=1)=>{for(const[dx,dz,k]of[[0,0,1],[.35,.1,.8],[-.3,.15,.75],[.05,-.3,.7]])plant.put(S.ball,0x5aa83a,x+dx*s,.28*s*k,z+dz*s,.42*k*s,.34*k*s,.42*k*s);const cols=[0xff7aa8,0xffd24a,0xffffff,0xff5a5a];for(let i=0;i<9;i++)plant.put(S.ball,cols[i%4],x+(r()-.5)*.8*s,.45*s+r()*.15,z+(r()-.5)*.7*s,.07);};
 const bed=(x,z,w,d)=>{for(let i=0;i<Math.ceil((w+d)*2.6);i++){const t=i/Math.ceil((w+d)*2.6),p=t*2*(w+d),px=p<w?x+p:p<w+d?x+w:p<2*w+d?x+w-(p-w-d):x,pz=p<w?z:p<w+d?z+(p-w):p<2*w+d?z+d:z+d-(p-2*w-d);stone.put(S.ball,0xb8b0a4,px,.06,pz,.17,.12,.17);}for(let k=0;k<w*d*5;k++)plant.put(S.ball,[0xff6a8a,0xffd24a,0xff9ac0,0xffffff][k%4],x+.2+r()*(w-.4),.16,z+.2+r()*(d-.4),.09);plant.put(S.disc,0x6a4a2c,x+w/2,.03,z+d/2,w/2,.05,d/2);};
 bed(entrance.x-4.2,depth+.6,2.6,1.2);bed(entrance.x+2.2,depth+.6,2.4,1.2);
 for(const[x,z]of[[-1.4,depth-1],[width+.9,depth-2],[-1.2,2],[width+1,3],[entrance.x+5.4,depth+1.4]])bush(x,z,1);
 /* 木柵欄：右前方 */
 const fx=entrance.x+5,fz=depth+3.4;for(let i=0;i<6;i++){wood.put(S.rod,0xb8742e,fx+i*.8,.35,fz,.07,.7,.07);wood.put(S.cone,0xc8843a,fx+i*.8,.75,fz,.08,.12,.08);}for(const y of[.25,.52])wood.put(S.rod,0xa8642a,fx+2,y,fz,.04,4.1,.04,0,0,Math.PI/2);
 /* 石燈與旗桿 */
 const lamp=(x,z)=>{stone.put(S.disc,0xa8a29a,x,.08,z,.22,.16,.22);stone.put(S.rod,0x8a8580,x,.65,z,.07,1,.07);stone.put(S.disc,0x6a6560,x,1.2,z,.2,.08,.2);plant.put(S.ball,0xffe08a,x,1.36,z,.13);stone.put(S.cone,0x5a5550,x,1.58,z,.24,.24,.24);};
 lamp(entrance.x-1.6,depth+1);lamp(entrance.x+2.6,depth+1);
 const pole=new T.Group();wood.put(S.rod,0x7a4a24,width+1.6,1.6,-1.6,.07,3.2,.07);wood.put(S.rod,0x7a4a24,width+1.95,3.05,-1.6,.03,.75,.03,0,0,Math.PI/2);
 const flagTex=(()=>{const c=document.createElement('canvas');c.width=64;c.height=96;const g=c.getContext('2d');g.fillStyle='#1f4fb0';g.fillRect(0,0,64,96);g.fillStyle='#f2c032';g.fillRect(0,0,64,8);g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?9:20;g.lineTo(32+Math.cos(a)*q,46+Math.sin(a)*q);}g.fill();const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;})();
 const flag=new T.Mesh(new T.PlaneGeometry(.66,1,4,1),new T.MeshStandardMaterial({map:flagTex,side:T.DoubleSide,roughness:.8}));flag.position.set(width+1.95,2.55,-1.6);flag.name='旗幟';group.add(flag);
 for(const b of [stone,plant,wood])group.add(b.mesh());
 Object.values(S).forEach(g=>g.dispose());
 /* 旗子隨風擺動 */
 group.userData.tick=t=>{const p=flag.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,Math.sin(t*3+x*5)*.06*(x+.33));}p.needsUpdate=true;};
 return group;
}
