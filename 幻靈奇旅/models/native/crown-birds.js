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
 const cape=add(garb,new T.SphereGeometry(.56,20,12,0,Math.PI*2,0,Math.PI*.62),mat(d.cape,{side:T.DoubleSide}),0,.08,-.16);cape.scale.set(1,.9,.82);cape.rotation.x=-.55;
 const hem=add(garb,new T.TorusGeometry(.46,.035,8,28),gold,0,.14,.1);hem.rotation.x=Math.PI/2-.4;
 const gemFrame=add(garb,new T.CylinderGeometry(.13,.13,.05,20),gold,0,.2,.5);gemFrame.rotation.x=Math.PI/2;
 const gem=add(garb,new T.OctahedronGeometry(.09),mat(d.gem,{emissive:d.gem,emissiveIntensity:.4}),0,.2,.54);gem.scale.z=.5;
 base.root.scale.setScalar(d.scale);
 return own;
}
function create({kind='sparrow'}={}){const T=window.THREE,d=DESIGN[kind],base=window.SmallBirds.create({species:d.base,inPlace:true}),own=dress(T,base,d),dispose=base.dispose;base.dispose=()=>{for(const o of own){o.geometry.dispose();o.material.dispose();}dispose?.();};base.design=d;return base;}
window.CrownBirds={create,DESIGN};
})();
