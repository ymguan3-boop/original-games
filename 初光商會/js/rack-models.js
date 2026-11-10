/* 高階貨架的程序模型：層板對齊 productSlot 的商品高度，每座貨架併成單一網格，等級越高零件越講究。 */
import {builder,armoryRack} from './product-models.js?v=20261110-shop-r2';
const cache=new Map();
function shapes(T){return{box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,14),hex:new T.CylinderGeometry(1,1,1,6),ball:new T.SphereGeometry(1,12,9),cone:new T.ConeGeometry(1,1,8),gem:new T.OctahedronGeometry(1,0),dome:new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),ring:new T.TorusGeometry(1,.1,8,28),arc:new T.TorusGeometry(1,.13,8,24,Math.PI*1.25)};}
/* 底座、背板、側板、頂板與層板：y 是商品站立的高度 */
function carcass(b,S,c,ys,h){
 b.put(S.box,c.dark,0,.07,0,.98,.14,.74);b.put(S.box,c.back,0,h/2+.06,-.3,.86,h-.1,.04);
 for(const s of[-1,1])b.put(S.box,c.wood,s*.45,h/2+.06,0,.07,h-.1,.66);
 b.put(S.box,c.dark,0,h+.03,0,.98,.07,.74);
 for(const y of ys){b.put(S.box,c.wood,0,y-.02,0,.84,.04,.62);b.put(S.box,c.trim,0,y-.02,.315,.86,.055,.025);}
}
const leaf=(b,S,color,x,y,z,tilt,side=1)=>b.put(S.ball,color,x,y,z,.045,.02,.022,0,0,tilt*side);
function materials(b,S){ // 蜜金素材櫃：蜂蜜木工坊櫃，木條護欄、鐵角片，櫃頂堆礦石與原木
 const c={wood:0xd99a2b,dark:0x8a5213,back:0xb87a22,trim:0xf0c648},IRON=0x4e5660,GOLD=0xffcf3a,ys=[.23,.74,1.25],h=1.4;carcass(b,S,c,ys,h);
 for(let i=-3;i<=3;i++)b.put(S.box,i%2?0xa8691c:0xc98a26,i*.12,.74,-.276,.1,1.26,.012);
 for(const y of ys)b.put(S.box,c.dark,0,y+.05,.3,.86,.05,.03);
 for(const s of[-1,1]){b.put(S.box,c.dark,s*.45,.72,.33,.09,1.32,.05);for(const y of[.2,.72,1.3]){b.put(S.box,IRON,s*.455,y,.36,.1,.11,.02);b.put(S.ball,0xc9ccd2,s*.455,y,.375,.016);}
  b.put(S.box,c.dark,s*.492,.72,0,.018,1.45,.07,.42,0,0);b.put(S.box,c.dark,s*.492,.72,0,.018,1.45,.07,-.42,0,0);}
 for(const [x,y] of[[0,0],[-.12,0],[.12,0],[-.06,.1],[.06,.1],[0,.2]])b.put(S.hex,GOLD,x,h+.16+y,-.1,.07,.05,.07,Math.PI/2);
 for(const [x,z,r,col] of[[-.34,.05,.1,0x8f98a3],[-.24,-.1,.08,0xb7bec7],[-.38,-.13,.07,GOLD],[-.27,.1,.06,0xe0a92e]])b.put(S.gem,col,x,h+.11+r*.5,z,r,r*.8,r,.3,x,.2);
 for(const [z,y] of[[-.08,0],[.08,0],[0,.1]])b.put(S.cyl,0x9c6a33,.3,h+.13+y,z,.055,.3,.055,0,0,Math.PI/2);b.put(S.ring,0x5c3a18,.3,h+.17,0,.12,.12,.12,0,Math.PI/2);
}
function arcane(b,S){ // 月桂秘藥櫃：紫漆藥櫃，金線、月桂葉與新月，底座是小藥抽屜
 const c={wood:0x5a2f9c,dark:0x35196b,back:0x7a4cc4,trim:0xf0c64a},GOLD=0xf6cf55,LEAF=0x3f9c4a,LEAF2=0x79c35a,ys=[.23,.74,1.25],h=1.6;carcass(b,S,c,ys,h);
 for(let i=0;i<5;i++){const x=(i-2)*.185;b.put(S.box,0x7a4cc4,x,.08,.375,.165,.09,.02);b.put(S.ball,GOLD,x,.08,.392,.018);}
 for(const [y,r] of[[.5,.045],[1,.06],[1.45,.04]])b.put(S.ball,0xf2e6a8,0,y,-.272,r,r,.012);
 for(const s of[-1,1]){b.put(S.cyl,c.dark,s*.45,.82,.33,.04,1.52,.04);for(let i=0;i<7;i++){const y=.22+i*.2;b.put(S.ring,GOLD,s*.45,y,.33,.05,.05,.03,Math.PI/2);leaf(b,S,i%2?LEAF:LEAF2,s*.5,y+.05,.35,.6,s);leaf(b,S,i%2?LEAF2:LEAF,s*.41,y+.05,.37,-.6,s);}
  b.put(S.box,0x4f8a3a,s*.33,h-.13,.1,.05,.14,.05);b.put(S.ball,0x7aa84a,s*.33,h-.24,.1,.06,.09,.06);b.put(S.box,GOLD,s*.33,h-.16,.1,.06,.02,.06);}
 b.put(S.ring,GOLD,0,h+.32,-.08,.27,.27,.3);for(let i=0;i<14;i++){const a=(i+.5)/14*Math.PI*2,x=Math.cos(a)*.27,y=h+.32+Math.sin(a)*.27;b.put(S.ball,i%2?LEAF:LEAF2,x,y,-.04,.05,.024,.024,0,0,a+1.2);}
 b.put(S.arc,GOLD,0,h+.32,-.03,.15,.15,.2,0,0,-.35);b.put(S.ball,0xfff2b0,.05,h+.42,-.03,.014);b.put(S.ball,0xfff2b0,-.02,h+.26,-.03,.012);
 for(const [x,col] of[[-.36,0xe95a9c],[.36,0x3fc7c1]]){b.put(S.ball,col,x,h+.15,0,.075);b.put(S.cyl,col,x,h+.25,0,.024,.07,.024);b.put(S.cyl,GOLD,x,h+.3,0,.03,.03,.03);}
}
function relic(b,S){ // 琥珀珍品櫃：博物館展示櫃，紅絨背板、金頂飾柱，山形楣頂鑲大塊琥珀
 const c={wood:0xb4601a,dark:0x5a2a0c,back:0x8e1f2d,trim:0xf5c544},GOLD=0xf7cc4c,AMBER=0xff9414,ys=[.23,.62,1.01,1.4],h=1.72;carcass(b,S,c,ys,h);
 b.put(S.box,c.dark,0,.2,0,0,0,0);b.put(S.box,c.wood,0,.03,.02,1.06,.06,.82);b.put(S.box,GOLD,0,.145,.375,.98,.02,.012);
 for(const s of[-1,1]){b.put(S.cyl,AMBER,s*.455,.92,.34,.042,1.5,.042);b.put(S.box,GOLD,s*.455,.18,.34,.12,.07,.12);b.put(S.box,GOLD,s*.455,1.67,.34,.12,.07,.12);for(const y of[.5,.92,1.34])b.put(S.ring,GOLD,s*.455,y,.34,.055,.055,.04,Math.PI/2);
  b.put(S.box,c.dark,s*.34,h+.19,.08,.5,.06,.1,0,0,-s*.42);b.put(S.box,GOLD,s*.34,h+.225,.13,.5,.02,.02,0,0,-s*.42);b.put(S.gem,AMBER,s*.47,h+.18,.1,.05,.07,.05);b.put(S.ball,GOLD,s*.46,h+.1,.1,.04);}
 for(const y of ys)for(const x of[-.3,0,.3])b.put(S.gem,AMBER,x,y-.02,.335,.016,.016,.01);
 b.put(S.box,0x8e1f2d,0,h+.15,0,.54,.14,.06);b.put(S.ring,GOLD,0,h+.25,.05,.15,.15,.22);b.put(S.gem,AMBER,0,h+.25,.05,.115,.14,.08);b.put(S.gem,0xffc65c,-.03,h+.29,.09,.045,.055,.03);
 b.put(S.ball,GOLD,0,h+.43,.05,.04);b.put(S.cone,GOLD,0,h+.5,.05,.03,.1,.03);
}
function royal(b,S){ // 星穹皇家寶櫃：午夜藍星空背板、雙柱與層層金飾，頂上星穹圓頂與皇冠
 const c={wood:0x18297a,dark:0x0d1650,back:0x162a8c,trim:0xffd24a},GOLD=0xffd24a,SAPPHIRE=0x3f8cff,RUBY=0xe02a4a,PEARL=0xf4f1ff,ys=[.23,.58,.93,1.28,1.63],h=1.98;carcass(b,S,c,ys,h);
 let seed=17;const r=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};for(let i=0;i<34;i++){const s=.008+r()*.012;b.put(S.gem,i%5?0xfff3b8:PEARL,(r()-.5)*.78,.2+r()*1.65,-.276,s,s*1.5,.006);}
 b.put(S.box,GOLD,0,.145,.375,.98,.024,.012);b.put(S.box,c.dark,0,.035,.02,1.08,.07,.84);b.put(S.box,GOLD,0,.075,.44,1.08,.016,.012);
 for(const s of[-1,1]){for(const k of[0,1]){const x=s*(.47-k*.085);b.put(S.cyl,k?SAPPHIRE:PEARL,x,1.06,.35+k*.01,.032,1.74,.032);for(const y of[.5,1.06,1.62])b.put(S.ring,GOLD,x,y,.35,.042,.042,.03,Math.PI/2);}
  b.put(S.box,GOLD,s*.43,.2,.35,.2,.08,.13);b.put(S.box,GOLD,s*.43,1.93,.35,.2,.08,.13);for(const z of[-.28,.3]){b.put(S.ball,GOLD,s*.47,.05,z,.07,.05,.07);}
  b.put(S.box,RUBY,s*.26,h-.02,.33,.1,.12,.012,0,0,s*.12);b.put(S.gem,GOLD,s*.26,h-.1,.34,.018);
  b.put(S.ball,SAPPHIRE,s*.49,h+.14,0,.075);b.put(S.ring,GOLD,s*.49,h+.14,0,.115,.115,.1,1.2,0,s*.3);b.put(S.cone,GOLD,s*.49,h+.27,0,.022,.09,.022);}
 for(const y of ys)for(let i=-2;i<=2;i++)b.put(S.gem,i%2?RUBY:SAPPHIRE,i*.17,y-.02,.335,.015,.015,.01);
 b.put(S.dome,c.dark,0,h+.07,-.02,.36,.3,.32);b.put(S.ring,GOLD,0,h+.08,-.02,.36,.32,.3,Math.PI/2);
 for(let i=0;i<9;i++){const a=i/8*Math.PI,x=Math.cos(a)*.27,y=Math.sin(a)*.2;b.put(S.gem,0xfff3b8,x,h+.13+y,.19+Math.sin(a)*.04,.012,.018,.008);}
 b.put(S.cyl,GOLD,0,h+.39,-.02,.16,.07,.14);for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.cos(a)*.145,z=Math.sin(a)*.125-.02;b.put(S.cone,GOLD,x,h+.47,z,.03,.11,.03);b.put(S.ball,i%2?RUBY:PEARL,x,h+.535,z,.02);}
 b.put(S.gem,GOLD,0,h+.56,-.02,.05,.1,.05);b.put(S.gem,SAPPHIRE,0,h+.56,.02,.026,.05,.02);
}
const BUILD={materials,arcane,relic,royal};
export const hasRackModel=kind=>kind==='armory'||!!BUILD[kind];
export function rackModel(T,kind){
 if(kind==='armory')return armoryRack(T);
 if(cache.has(kind))return cache.get(kind);
 const b=builder(T),S=shapes(T);BUILD[kind](b,S);
 const scene=new T.Group(),mesh=b.mesh(.5,.12);scene.add(mesh);scene.name=kind+'-rack';Object.values(S).forEach(g=>g.dispose());
 const r={scene};cache.set(kind,r);return r;
}
