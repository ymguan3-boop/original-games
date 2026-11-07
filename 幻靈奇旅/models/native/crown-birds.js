/* 小麻與咕咕的第三階：沿用原本的鳥身與動作，再加上葉冠／鳳冠、披肩和徽章。 */
(()=>{'use strict';
const DESIGN={
 sparrow:{base:'xiaoma',name:'羽冠麻雀王',scale:1.22,crown:0xf2c230,leaf:0x4f9a3c,cape:0x3f8f3a,capeEdge:0xf2c230,gem:0x7cc24a,attack:'Attack',ultimate:'Ultimate'},
 rooster:{base:'gugu',name:'鳳冠雄雞王',scale:1.28,crown:0xf2c230,leaf:0xd62a1e,cape:0xc8291e,capeEdge:0xf2c230,gem:0xe02a2a,attack:'Attack',ultimate:'Ultimate'}
};
function dress(T,base,d){
 const find=n=>{let hit=null;base.root.traverse(o=>{if(!hit&&o.name===n)hit=o;});return hit;},head=find('Head'),body=find('Body'),mat=(c,o={})=>new T.MeshStandardMaterial({color:c,roughness:.45,...o}),own=[];
 const add=(p,geo,m,x,y,z)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.userData.crown=true;p.add(o);own.push(o);return o;};
 const gold=mat(d.crown,{metalness:.5});
 /* 參考圖的麻雀是棕白色，把原本的淡紫羽色換掉 */
 if(d.base==='xiaoma'){const hsl={};base.root.traverse(o=>{if(!o.isMesh||!o.material?.color)return;o.material.color.getHSL(hsl);if(hsl.h>.58&&hsl.h<.86&&hsl.s>.05)o.material.color.setHex(hsl.l>.62?0xa98460:0x7a5a3c);});}
 /* 依實際頭身大小擺放配件 */
 base.root.updateMatrixWorld(true);const sizeOf=o=>{const b=new T.Box3().setFromObject(o),c=b.getCenter(new T.Vector3()),z=b.getSize(new T.Vector3());o.worldToLocal(c);return {c,z};},hb=sizeOf(head),ks=hb.z.x/.62;
 const crown=new T.Group();crown.position.set(hb.c.x,hb.c.y+hb.z.y*.5,hb.c.z);crown.scale.setScalar(ks*.82);head.add(crown);
 const bb=sizeOf(body),kb=bb.z.x/1.05,garb=new T.Group();garb.position.copy(bb.c);garb.scale.setScalar(kb);body.add(garb);
 /* 冠：金環加三片尖飾，兩側各一片葉 */
 const top=0,ring=add(crown,new T.TorusGeometry(.2,.035,8,24),gold,0,top,.02);ring.rotation.x=Math.PI/2;
 for(const [x,h,r] of [[0,.24,0],[-.13,.17,.32],[.13,.17,-.32]]){const c=add(crown,new T.ConeGeometry(.055,h,6),gold,x,top+h/2,.02);c.rotation.z=r;}
 for(const s of [-1,1]){const l=add(crown,new T.SphereGeometry(.13,12,8),mat(d.leaf),s*.25,top+.03,.0);l.scale.set(1,.4,.6);l.rotation.z=s*.5;}
 /* 披肩：貼在背上的弧面與金邊 */
 const cape=add(garb,new T.SphereGeometry(.56,20,12,0,Math.PI*2,0,Math.PI*.62),mat(d.cape,{side:T.DoubleSide}),0,.08,-.16);cape.scale.set(.86,.78,.66);cape.rotation.x=-.55;
 const hem=add(garb,new T.TorusGeometry(.46,.035,8,28),gold,0,.14,.1);hem.rotation.x=Math.PI/2-.4;
 const gemFrame=add(garb,new T.CylinderGeometry(.13,.13,.05,20),gold,0,.2,.5);gemFrame.rotation.x=Math.PI/2;
 const gem=add(garb,new T.OctahedronGeometry(.09),mat(d.gem,{emissive:d.gem,emissiveIntensity:.4}),0,.2,.54);gem.scale.z=.5;
 base.root.scale.setScalar(d.scale);
 return own;
}
/* 專屬招式特效：麻雀王是落葉風暴，雄雞王是火鳥與烈焰。掛在角色上，所有模式都看得到 */
function effects(T,base,kind){const g=new T.Group();g.userData.isEffect=true;g.visible=false;g.scale.setScalar(1.4);base.root.add(g);const sparrow=kind==='sparrow',glow=c=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:.85,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),leaf=new T.SphereGeometry(.2,8,6),ring=new T.Mesh(new T.TorusGeometry(1.3,.05,8,48),glow(sparrow?0x8fe05a:0xffa030));ring.rotation.x=Math.PI/2;ring.position.y=.1;g.add(ring);
 const bits=Array.from({length:18},(_,i)=>{const m=new T.Mesh(leaf,glow(sparrow?(i%2?0x7cc24a:0xf2d34a):(i%2?0xff6a2a:0xffd24a)));m.scale.set(1,.3,.6);g.add(m);return m;});
 let bird=null;if(!sparrow){const sh=new T.Shape();sh.moveTo(0,1.1);sh.quadraticCurveTo(.5,.5,2.2,.9);sh.quadraticCurveTo(1,.1,.5,-.2);sh.lineTo(.2,-1.4);sh.lineTo(0,-.8);sh.lineTo(-.2,-1.4);sh.lineTo(-.5,-.2);sh.quadraticCurveTo(-1,.1,-2.2,.9);sh.quadraticCurveTo(-.5,.5,0,1.1);bird=new T.Mesh(new T.ShapeGeometry(sh),glow(0xff8a2a));bird.position.y=2.4;g.add(bird);}
 let t=-1,len=0;return{start(mode){t=0;len=mode==='Ultimate'?(sparrow?2.5:2.8):(sparrow?.7:.8);g.visible=true;g.userData.big=mode==='Ultimate';},update(dt){if(t<0)return;t+=dt;const k=t/len,big=g.userData.big;if(k>=1){t=-1;g.visible=false;return;}ring.scale.setScalar((big?1+k*3:.6+k));ring.material.opacity=.9*(1-k);bits.forEach((m,i)=>{const a=i/bits.length*Math.PI*2+t*(sparrow?7:4),r=(big?1.2+k*2.4:.5+k*1.2),y=sparrow?.3+(i%6)*.3+k*1.4:.2+Math.abs(Math.sin(t*5+i))*(big?2:.8);m.position.set(Math.cos(a)*r,y,Math.sin(a)*r);m.rotation.set(t*6+i,t*4,0);m.material.opacity=.9*(1-k*.7);});if(bird){bird.visible=big;bird.position.y=2.4+k*.6;bird.scale.setScalar(.6+k*.9);bird.material.opacity=Math.sin(k*Math.PI)*.7;bird.rotation.y=.4;}},dispose(){leaf.dispose();ring.geometry.dispose();ring.material.dispose();bird?.geometry.dispose();bird?.material.dispose();for(const m of bits)m.material.dispose();}};}
function create({kind='sparrow'}={}){const T=window.THREE,d=DESIGN[kind],base=window.SmallBirds.create({species:d.base,inPlace:true}),own=dress(T,base,d),fx=effects(T,base,kind),dispose=base.dispose,setMode=base.setMode,update=base.update;base.setMode=m=>{const ok=setMode(m);if(m==='Attack'||m==='Ultimate')fx.start(m);return ok;};base.update=dt=>{update(dt);fx.update(dt);};base.dispose=()=>{fx.dispose();for(const o of own){o.geometry.dispose();o.material.dispose();}dispose?.();};base.design=d;return base;}
window.CrownBirds={create,DESIGN};
})();
