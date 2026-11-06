/* 商品與武器架的程序模型：不必下載檔案，每種商品併成單一網格後即可 InstancedMesh 批次擺上貨架。 */
const cache=new Map();
export function builder(T){
 const pos=[],nor=[],col=[],m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),c=new T.Color(),n3=new T.Matrix3(),v=new T.Vector3();
 function put(geo,color,x=0,y=0,z=0,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0){const g=geo.index?geo.toNonIndexed():geo,p=g.attributes.position,n=g.attributes.normal;e.set(rx,ry,rz);q.setFromEuler(e);m.compose(new T.Vector3(x,y,z),q,new T.Vector3(sx,sy,sz));n3.getNormalMatrix(m);c.setHex(color).convertSRGBToLinear();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(n3).normalize();nor.push(v.x,v.y,v.z);col.push(c.r,c.g,c.b);}}
 function mesh(rough=.55,metal=.05){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));const o=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:metal}));o.castShadow=true;return o;}
 return{put,mesh};
}
const kit=T=>({ball:new T.SphereGeometry(1,12,9),cyl:new T.CylinderGeometry(1,1,1,12),cone:new T.CylinderGeometry(.42,1,1,12),box:new T.BoxGeometry(1,1,1),hex:new T.CylinderGeometry(1,1,1,6),tip:new T.ConeGeometry(1,1,6),oct:new T.OctahedronGeometry(1,0),rock:new T.DodecahedronGeometry(1,0),ring:new T.TorusGeometry(1,.16,6,16),half:new T.TorusGeometry(1,.3,6,12,Math.PI)});
const CORK=0x9a6538,GLASS=0xdff3f5,GOLD=0xf0b422,DARK=0x2c1a12;
const flask=(b,G,liquid,{body='ball',cap=CORK}={})=>{if(body==='ball'){b.put(G.ball,liquid,0,.34,0,.34,.34,.34);b.put(G.ball,GLASS,0,.5,.08,.13,.09,.2);}else{b.put(G.cone,liquid,0,.32,0,.32,.62,.32);}b.put(G.cyl,GLASS,0,.76,0,.13,.26,.13);b.put(G.cyl,cap,0,.92,0,.15,.13,.15);};
const RECIPES={
 potion(b,G){flask(b,G,0xe0322a);b.put(G.ball,0xff8a80,-.12,.42,.26,.06,.06,.05);b.put(G.ball,0xff8a80,.12,.42,.26,.06,.06,.05);b.put(G.tip,0xff8a80,0,.32,.26,.13,.16,.05,Math.PI);},
 revive(b,G){b.put(G.box,0x35b86a,0,.34,0,.42,.64,.3);b.put(G.box,GOLD,0,.68,0,.46,.06,.34);b.put(G.cyl,GLASS,0,.8,0,.1,.2,.1);b.put(G.ball,GOLD,0,.96,0,.13);b.put(G.box,0xffffff,0,.36,.16,.26,.08,.02);b.put(G.box,0xffffff,0,.36,.16,.08,.26,.02);for(const s of[-1,1])b.put(G.ball,0xfff6df,s*.36,.5,0,.2,.1,.05,0,0,s*.5);},
 battery(b,G){b.put(G.cyl,0x2c64bc,0,.42,0,.28,.72,.28);b.put(G.cyl,GOLD,0,.8,0,.29,.06,.29);b.put(G.cyl,GOLD,0,.04,0,.29,.08,.29);b.put(G.cyl,0xd9d9d9,0,.88,0,.12,.1,.12);b.put(G.box,0xffe23a,.03,.54,.27,.1,.26,.03,0,0,-.5);b.put(G.box,0xffe23a,-.03,.32,.27,.1,.26,.03,0,0,-.5);},
 'vacuum-orb'(b,G){b.put(G.ball,0x7a3fd0,0,.46,0,.34);b.put(G.ball,0xc9a2ff,-.1,.56,.2,.1);b.put(G.ring,0xf0d6ff,0,.46,0,.46,.46,.46,1.2,0,.3);b.put(G.cyl,DARK,0,.05,0,.2,.1,.2);},
 'pet-xp-double'(b,G){b.put(G.oct,0xe0408f,-.17,.42,0,.22,.34,.22);b.put(G.oct,GOLD,.2,.34,0,.17,.27,.17);b.put(G.cyl,0x6a3f24,0,.04,0,.34,.08,.3);},
 'buff-attack'(b,G){flask(b,G,0xd8301f,{body:'cone',cap:GOLD});b.put(G.box,0xf4f4f4,0,.34,.32,.06,.3,.02);b.put(G.box,GOLD,0,.26,.32,.16,.04,.03);},
 'buff-defense'(b,G){flask(b,G,0x2f6fd0,{body:'cone',cap:0xc9d4de});b.put(G.oct,0xdfe8f2,0,.32,.3,.14,.2,.03);},
 'buff-capture'(b,G){flask(b,G,0xf4c42a,{cap:0xd8301f});b.put(G.ball,0xffffff,0,.34,.3,.1,.1,.06);b.put(G.box,DARK,0,.34,.33,.2,.025,.02);},
 'buff-pickup'(b,G){flask(b,G,0x3fb86a,{body:'cone',cap:0x7a4a22});b.put(G.half,0xd8301f,0,.3,.31,.14,.14,.05,Math.PI);b.put(G.box,0xdfe8f2,-.14,.32,.31,.05,.06,.04);b.put(G.box,0xdfe8f2,.14,.32,.31,.05,.06,.04);},
 'shop-iron'(b,G){for(const [x,y,z,s,c] of [[0,.24,0,.3,0x565b66],[-.3,.16,.1,.2,0x6a6f7a],[.28,.15,.12,.2,0x4c5059],[.08,.15,-.26,.19,0x60656f],[.02,.46,.04,.17,0x747a85]]){b.put(G.rock,c,x,y,z,s,s*.9,s,x*3,z*4,y*3);b.put(G.oct,0xd9e2ec,x+s*.5,y+s*.5,z+s*.5,s*.22);}},
 'shop-wood'(b,G){for(const [x,y] of [[-.21,.2],[.21,.2],[0,.56]]){b.put(G.cyl,0x9a6538,x,y,0,.2,.92,.2,Math.PI/2);for(const z of[-.465,.465]){b.put(G.cyl,0xe9c98a,x,y,z,.17,.02,.17,Math.PI/2);b.put(G.ring,0xb98a50,x,y,z,.09,.09,.09);}}},
 'shop-crystal'(b,G){for(const [x,z,h,r,tilt,c] of [[0,0,.82,.15,0,0x4fd6e8],[-.2,.05,.56,.11,.3,0x7fe6f2],[.2,.02,.62,.12,-.28,0x35b4d8],[.04,.2,.42,.09,-.2,0xa6f2f8],[-.03,-.2,.46,.1,.2,0x35b4d8]]){b.put(G.hex,c,x+Math.sin(tilt)*h*.4,h*.4,z,r,h*.8,r,0,0,-tilt);b.put(G.tip,c,x+Math.sin(tilt)*h*.84,h*.86,z,r,h*.2,r,0,0,-tilt);}b.put(G.rock,0x6a5a4e,0,.03,0,.34,.1,.3);},
};
export const hasProcedural=sku=>!!RECIPES[sku];
/* 回傳與 GLTF 相同的 {scene}，後面的貨架程式不用分辨來源 */
export function productModel(T,sku){const key='p:'+sku;if(!cache.has(key)){const b=builder(T),G=kit(T);RECIPES[sku](b,G);const scene=new T.Group();scene.add(b.mesh());scene.name=sku;cache.set(key,{scene});}return cache.get(key);}
/* 武器架：背板三排掛桿，武器直立靠掛，前方看得到每一把 */
export function armoryRack(T){if(cache.has('rack'))return cache.get('rack');const b=builder(T),G=kit(T),W=0x9a5a2c,D=0x6e3f1e,MET=0xc9b27a;
 b.put(G.box,D,0,.05,.04,1,.1,.74);b.put(G.box,W,0,.72,-.3,.96,1.3,.07);for(const s of[-1,1]){b.put(G.box,D,s*.46,.7,-.27,.09,1.36,.12);b.put(G.box,W,s*.46,.14,.02,.07,.07,.6);}
 b.put(G.box,D,0,1.38,-.27,1,.09,.14);for(const s of[-1,1])b.put(G.box,D,s*.39,1.38,.1,.05,.06,.8);b.put(G.box,D,0,1.38,.36,.9,.08,.06);
 for(const y of[.3,.72,1.14]){b.put(G.box,MET,0,y+.2,-.2,.86,.035,.05);for(let i=0;i<6;i++)b.put(G.cyl,MET,(i-2.5)*.145,y+.2,-.14,.018,.1,.018,Math.PI/2);b.put(G.box,W,0,y-.12,-.13,.9,.03,.3);}
 const scene=new T.Group();scene.add(b.mesh(.75,.05));scene.name='armory-rack';const r={scene};cache.set('rack',r);return r;}
