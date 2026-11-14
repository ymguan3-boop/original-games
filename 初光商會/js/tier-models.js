import {builder} from './product-models.js?v=20261114-v51';
import {artisanArmory} from './armory-pilot-v41.js?v=20261114-v51';
import {TIER_DESIGNS,tierNumber} from './tier-designs.js?v=20261114-v51';
import {shelfTypes} from './furniture.js?v=20261114-v51';
import {decorTypes} from './decorations.js?v=20261114-v51';
const cache=new Map();
export function createTierModel(T,{type,tier=1,decoration=false}={}){
 const n=tierNumber(tier),key=[type,n,decoration].join(':');if(cache.has(key))return cache.get(key);
 if(type==='armory'&&n===1&&!decoration)return artisanArmory(T);
 const C=TIER_DESIGNS[n],b=builder(T),shapes={},owned=[];
 const geo=(id,create)=>shapes[id]||(owned.push(shapes[id]=create()),shapes[id]);
 const G={box:geo('box',()=>new T.BoxGeometry(1,1,1)),ball:geo('ball',()=>new T.SphereGeometry(1,10,7)),cyl:geo('cyl',()=>new T.CylinderGeometry(1,1,1,12)),cone:geo('cone',()=>new T.ConeGeometry(1,1,8)),gem:geo('gem',()=>new T.OctahedronGeometry(1)),ring:geo('ring',()=>new T.TorusGeometry(1,.09,5,20))};
 function B(c,x,y,z,w,h,d,rz=0){b.put(G.box,c,x,y,z,w,h,d,0,0,rz);}
 function O(c,x,y,z,r,s=r,d=r){b.put(G.ball,c,x,y,z,r,s,d);}
 function bar(c,x,y,z,w,h,d){const id=`r:${w}:${h}:${d}`,g=geo(id,()=>{const r=Math.min(.025,w/5,h/5),s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:1,curveSegments:3,steps:1});g.translate(0,0,-d/2);return g;});b.put(g,c,x,y,z);}
 function pin(x,y,z){O(C.trim,x,y,z,.014,.014,.009);}
 function leaf(x,y,z,a=0,c=C.panel){b.put(G.ball,c,x,y,z,.065,.024,.025,0,0,a);}
 function motif(kind,x,y,z,s=.15){
  if(kind==='sword'){bar(C.trim,x,y,z,.024,s*1.6,.018);bar(C.trim,x,y-s*.3,z,.11,s*.13,.024);O(C.accent,x,y-s*.75,z,.025);}
  else if(kind==='star'||kind==='sun'){const count=kind==='sun'?12:5;for(let i=0;i<count;i++){const a=i/count*Math.PI*2;B(C.trim,x+Math.sin(a)*s*.7,y+Math.cos(a)*s*.7,z,.028,s*.55,.023,-a);}O(C.accent,x,y,z,s*.36,s*.36,.025);}
  else if(kind==='crown'){bar(C.trim,x,y-s*.2,z,s*1.8,.045,.04);for(let i=-1;i<=1;i++){b.put(G.cone,C.trim,x+i*s*.6,y+s*.2,z,s*.3,s*(i?1:1.4),.035);O(C.accent,x+i*s*.6,y+s*(i?.72:.92),z,.022);}}
  else if(kind==='moon'){b.put(G.ring,C.trim,x,y,z,s,s,.04,0,0,.4);O(C.wood,x+s*.35,y+s*.3,z+.025,s*.74,s*.74,.035);O(C.accent,x-s*.6,y-s*.2,z+.03,.025);}
  else if(kind==='gear'){b.put(G.ring,C.trim,x,y,z,s*.7,s*.7,.04);for(let i=0;i<8;i++){const a=i*Math.PI/4;B(C.trim,x+Math.sin(a)*s*.8,y+Math.cos(a)*s*.8,z,.04,s*.45,.035,-a);}O(C.dark,x,y,z,.035,.035,.045);}
  else if(kind==='pearl'){b.put(G.ring,C.trim,x,y,z,s,s,.035);O(C.accent,x,y,z,s*.6,s*.6,.04);}
  else{for(let i=0;i<5;i++){const a=i/5*Math.PI*2;leaf(x+Math.sin(a)*s*.6,y+Math.cos(a)*s*.6,z,-a,kind==='flower'?C.accent:C.panel);}O(C.trim,x,y,z,.03);}
 }
 function feet(){for(const side of[-1,1]){bar(C.dark,side*.36,.075,0,.18,.12,.69);bar(C.wood,side*.36,.20,-.08,.12,.20,.19);if(n>=7)for(const z of[-.2,.18])O(C.trim,side*.36,.09,z,.065,.065,.07);}}
 function cornice(y,w=.86){
  const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,.10);
  if(['star','moon','celestial'].includes(C.shape)){s.lineTo(-w*.27,.10);s.quadraticCurveTo(-.08,.20,0,.32);s.quadraticCurveTo(.08,.20,w*.27,.10);}
  else if(['crown','royal'].includes(C.shape)){s.lineTo(-w*.22,.10);s.lineTo(-w*.18,.23);s.lineTo(0,.30);s.lineTo(w*.18,.23);s.lineTo(w*.22,.10);}
  else if(C.shape==='workshop'){s.lineTo(-w*.25,.17);s.lineTo(w*.25,.17);}
  else{s.bezierCurveTo(-w*.25,.10,-w*.18,.26,0,.26);s.bezierCurveTo(w*.18,.26,w*.25,.10,w/2,.10);}
  s.lineTo(w/2,.10);s.lineTo(w/2,0);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.08,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,curveSegments:7,steps:1});owned.push(g);b.put(g,C.wood,0,y,-.24);bar(C.trim,0,y+.025,-.142,w+.015,.035,.026);motif(C.motif,0,y+.15,-.14,.09);
 }
 function post(x,h){bar(C.wood,x,h/2+.20,-.20,.095,h,.12);bar(C.dark,x,h+.22,-.20,.14,.12,.16);if(n>=4){bar(C.trim,x,h/2+.20,-.13,.025,h-.10,.018);for(const y of[.35,h*.5,h+.12])pin(x,y,-.115);}if(n>=7)for(const dx of[-.025,.025])b.put(G.cyl,C.trim,x+dx,h/2+.20,-.115,.006,h-.15,.006);}
 function materialTray(){
  for(const side of[-1,1])bar(C.dark,side*.33,.075,0,.17,.12,.58);
  bar(C.wood,0,.16,0,.88,.12,.66);bar(C.panel,0,.23,0,.76,.025,.52);
  for(const side of[-1,1]){bar(C.wood,side*.43,.31,0,.07,.21,.66);bar(C.trim,side*.43,.425,0,.085,.035,.68);}
  bar(C.wood,0,.34,-.30,.83,.26,.065);bar(C.wood,0,.275,.30,.83,.13,.065);bar(C.trim,0,.35,.335,.87,.035,.026);
  for(const x of[-.38,.38])for(const z of[-.30,.30]){bar(C.dark,x,.27,z,.09,.16,.08);pin(x,.28,z+.045);}
  for(let i=-3;i<=3;i++)B(C.dark,i*.105,.238,0,.004,.005,.45);
  bar(C.dark,0,.32,0,.025,.20,.59);bar(C.trim,0,.43,0,.035,.035,.63);if(n>=4)for(const side of[-1,1])motif(C.motif,side*.33,.305,.345,.045);
 }
 function cabinet(kind){if(kind==='materials'){materialTray();return;}const def=shelfTypes.find(t=>t.id===kind)||shelfTypes[0],h=def.top-.21;feet();
  if(kind==='armory'||kind==='limited-armory'){
   for(const side of[-1,1])post(side*.37,h-.06);for(const side of[-1,1])B(C.dark,side*.18,.78,-.24,.035,1.03,.04,-side*.38);
   const ys=kind==='limited-armory'?[.29,.65,1.02,1.36]:[.28,.70,1.12];for(const y of ys){bar(C.wood,0,y,-.10,.83,.07,.13);bar(C.trim,0,y+.03,-.02,.79,.015,.025);for(let i=0;i<6;i++){b.put(G.cyl,C.trim,(i-2.5)*.143,y+.05,.02,.012,.075,.012,Math.PI/2);pin((i-2.5)*.143,y,.0);}}
   for(let i=-1;i<=1;i++){bar(C.panel,i*.25,.23,.045,.235,.12,.035);pin(i*.25,.23,.069);}cornice(h);
   if(kind==='limited-armory'){for(const side of[-1,1]){b.put(G.ring,C.trim,side*.36,h*.55,-.09,.09,.09,.025,0,0,side*.4);for(let j=0;j<3;j++)leaf(side*(.36+.035*j),.42+j*.32,-.055,side*.6);}motif('crown',0,h+.35,-.15,.13);}
  }else{
   bar(C.dark,0,.20,-.02,.89,.18,.70);bar(C.panel,0,h*.53+.12,-.30,.74,h-.02,.055);for(const side of[-1,1])post(side*.40,h-.04);
   for(const y of[.23,.74,1.25].filter(y=>y<h)){bar(C.wood,0,y-.015,0,.78,.055,.59);bar(C.trim,0,y,.31,.80,.04,.025);for(const side of[-1,1])pin(side*.34,y,.33);}
   for(let i=-1;i<=1;i++){bar(C.wood,i*.25,.19,.335,.235,.12,.035);pin(i*.25,.19,.36);}cornice(h);
   if(kind==='apothecary'||kind==='arcane'){for(const side of[-1,1]){bar(C.panel,side*.40,h+.18,-.20,.09,.15,.11);bar(C.trim,side*.40,h+.27,-.20,.11,.045,.13);}if(kind==='arcane')for(const side of[-1,1])for(let j=0;j<4;j++)leaf(side*.42,.38+j*.29,.0,side*.6);}
   if(kind==='materials'){for(const y of[.27,.75,1.23])for(const side of[-1,1]){B(C.dark,side*.40,y,.02,.12,.09,.10);pin(side*.40,y,.077);}for(const side of[-1,1])B(C.trim,side*.2,.82,-.255,.035,.98,.015,-side*.4);for(const x of[-.12,0,.12])b.put(G.gem,C.accent,x,h+.12,-.13,.07,.09,.06);}
   if(kind==='relic'||kind==='royal'){for(const side of[-1,1])for(let j=0;j<5;j++)pin(side*.405,.35+j*.25,.0);motif(kind==='royal'?'crown':'pearl',0,h+.34,-.16,.11);}
  }
  if(C.shape==='expedition')for(const side of[-1,1]){bar(C.dark,side*.37,.55,-.115,.12,.065,.024);pin(side*.37,.55,-.09);}
  if(C.shape==='workshop')for(const side of[-1,1])for(const y of[.30,h-.06]){B(C.trim,side*.40,y,-.10,.15,.08,.035);pin(side*.40,y,-.075);}
  if(C.shape==='botanical')for(const side of[-1,1])for(let j=0;j<5;j++)leaf(side*.40,.37+j*.21,-.10,side*.6);
  if(C.shape==='gallery')for(const side of[-1,1])O(C.accent,side*.40,h-.03,-.10,.038);
  if(C.shape==='royal'||C.shape==='celestial')for(const side of[-1,1]){b.put(G.gem,C.accent,side*.40,h*.7,-.105,.045,.075,.025);leaf(side*.38,h+.16,-.12,side*.5,C.trim);}
  // Restrained carved wood-grain lines on rail fronts preserve the hand-crafted construction.
  for(const side of[-1,1])for(let j=0;j<3;j++)B(C.dark,side*(.365+j*.012),.65,-.131,.004,.40,.003,side*.015);
 }
 function pot(){b.put(G.cyl,C.dark,0,.07,0,.27,.14,.27);b.put(G.cyl,C.wood,0,.27,0,.29,.36,.29);b.put(G.ring,C.trim,0,.44,0,.30,.30,.30,Math.PI/2);if(n>=4)for(let i=0;i<6;i++){const a=i*Math.PI/3;O(C.accent,Math.cos(a)*.292,.27,Math.sin(a)*.292,.026);}if(n>=7)for(const side of[-1,1])O(C.trim,side*.32,.31,0,.06,.09,.035);}
 function framedPicture(type){const large=type==='painting-large',w=large?1.15:type==='couplet'?.48:.70,h=large?.70:type==='couplet'?.36:.52;bar(C.dark,0,h/2,0,w,h,.08);bar(C.trim,0,h/2,.047,w-.035,h-.035,.02);bar(0xe9e2ca,0,h/2,.063,w-.09,h-.09,.015);B(C.panel,0,h*.4,.075,w-.11,h*.30,.008);for(let i=0;i<3;i++)b.put(G.cone,C.wood,(i-1)*w*.2,h*.45,.085,w*.24,h*(.25+i*.04),.009);O(C.accent,w*.24,h*.70,.083,h*.09,h*.09,.008);for(const x of[-w/2+.03,w/2-.03])for(const y of[.03,h-.03])pin(x,y,.07);if(n>=4)motif(C.motif,0,h+.07,.02,.06);}
 function decorationModel(type){
  if(type==='clock'){bar(C.dark,0,.33,0,.47,.60,.105);if(['star','moon','celestial'].includes(C.shape)){b.put(G.cone,C.wood,0,.66,0,.29,.20,.09);}else{O(C.wood,0,.56,0,.27,.16,.06);}b.put(G.cyl,0xf5eedc,0,.38,.067,.20,.028,.20,Math.PI/2);b.put(G.ring,C.trim,0,.38,.09,.21,.21,.21);for(let i=0;i<12;i++){const a=i*Math.PI/6;B(C.dark,Math.sin(a)*.165,.38+Math.cos(a)*.165,.096,.012,.026,.009,-a);}B(C.dark,.035,.41,.106,.015,.12,.012,-.7);B(C.dark,-.025,.41,.108,.015,.08,.012,.8);b.put(G.cyl,C.trim,0,.13,.06,.008,.15,.008);O(C.trim,0,.07,.06,.05,.05,.015);if(n>=5)motif(C.motif,0,.68,0,.07);}
  else if(['painting','painting-large','couplet'].includes(type))framedPicture(type);
  else if(['plant','fern','lavender','citrus'].includes(type)){pot();const h=type==='plant'?1.42:type==='citrus'?1.1:type==='lavender'?.92:.80;for(let i=0;i<(type==='lavender'?13:9);i++){const a=i*2.4,r=.10+(i%3)*.075,y=.47+(h-.5)*(i%4)/4,x=Math.sin(a)*r,z=Math.cos(a)*r;b.put(G.cyl,C.dark,x*.5,.45+(y-.45)/2,z*.5,.012,y-.42,.012,Math.cos(a)*.2,0,-Math.sin(a)*.2);if(type==='lavender'){O(n%2?0x9981bc:0xb694c9,x,y+.16,z,.035,.12,.035);leaf(x,y,z,a,0x6e9770);}else{b.put(G.ball,i%2?0x74a269:0x99bb7d,x,y+.12,z,.12,.19,.055,.2,a,.4);if(type==='citrus'&&i%2===0)O(0xe5b347,x+.04,y+.11,z+.04,.05);}}}
  else if(type==='sofa'){for(const x of[-.33,.33])for(const z of[-.23,.23])bar(C.dark,x,.10,z,.075,.16,.075);bar(C.wood,0,.25,0,.87,.18,.59);bar(C.panel,0,.39,.02,.67,.13,.52);bar(C.wood,0,.61,-.24,.86,.47,.10);bar(C.panel,0,.63,-.18,.69,.30,.11);for(const side of[-1,1]){bar(C.wood,side*.39,.44,0,.10,.24,.61);O(C.panel,side*.39,.57,0,.075,.08,.28);bar(C.accent,side*.22,.53,-.08,.16,.18,.10);}if(n>=5)motif(C.motif,0,.83,-.23,.08);}
  else if(type==='carpet'){B(C.dark,0,.02,0,2.7,.035,1.9);B(C.trim,0,.041,0,2.60,.014,1.8);B(C.panel,0,.052,0,2.46,.009,1.66);for(const x of[-1.25,1.25])for(let j=0;j<9;j++)B(C.accent,x,.059,(j-4)*.18,.08,.008,.06);for(const z of[-.79,.79])for(let i=0;i<13;i++)B(C.accent,(i-6)*.18,.059,z,.065,.008,.06);b.put(G.ring,C.trim,0,.06,0,.50,.34,.50,Math.PI/2);for(let i=0;i<8+n%3;i++){const a=i*Math.PI*2/(8+n%3);b.put(G.gem,C.accent,Math.cos(a)*.52,.065,Math.sin(a)*.34,.08,.009,.05,0,-a,0);}}
  else if(type==='lantern'){b.put(G.cyl,C.dark,0,.07,0,.29,.14,.29);b.put(G.cyl,C.wood,0,.53,0,.06,.9,.06);bar(C.dark,0,.99,0,.38,.38,.30);bar(0xe9ca83,0,.99,.16,.28,.27,.025);for(const side of[-1,1])bar(C.trim,side*.18,.99,.17,.035,.38,.035);b.put(G.cone,C.wood,0,1.25,0,.29,.22,.24);motif(C.motif,0,1.02,.19,.08);}
  else if(type==='lucky-cat'){bar(C.dark,0,.09,0,.66,.15,.55);O(C.wood,0,.43,0,.23,.28,.19);O(C.accent,0,.73,.01,.23,.22,.18);for(const side of[-1,1])b.put(G.cone,C.accent,side*.15,.94,0,.09,.18,.065);for(const side of[-1,1]){O(C.dark,side*.075,.75,.17,.018);O(C.panel,side*.12,.68,.17,.035,.015,.01);}O(C.trim,0,.58,.18,.04);O(C.accent,.27,.72,.0,.07,.16,.07);b.put(G.ring,C.trim,0,.33,.17,.09,.12,.025);}
  else if(type==='fountain'){b.put(G.cyl,C.dark,0,.08,0,.45,.14,.45);b.put(G.cyl,C.wood,0,.23,0,.42,.20,.42);b.put(G.cyl,C.accent,0,.34,0,.36,.025,.36);b.put(G.cyl,C.trim,0,.67,0,.075,.69,.075);b.put(G.cyl,C.wood,0,.90,0,.25,.13,.25);b.put(G.cyl,C.accent,0,.98,0,.21,.018,.21);for(let i=0;i<6;i++){const a=i*Math.PI/3;O(C.accent,Math.cos(a)*.15,.65,Math.sin(a)*.15,.018,.19,.018);}b.put(G.gem,C.accent,0,1.17,0,.10,.21,.10);}
  else if(type==='artwork'){for(const x of[-.32,.32])bar(C.dark,x,.11,0,.14,.19,.39);for(let i=-1;i<=1;i++){const x=i*.26;bar(C.wood,x,.88,0,.25,1.42,.10);bar(C.panel,x,.90,.06,.19,1.23,.02);for(let j=0;j<4;j++)leaf(x,.43+j*.25,.08,i*.4,C.trim);}motif(C.motif,0,1.68,.03,.12);}
  else if(type==='phoenix'){bar(C.dark,0,.12,0,.65,.23,.50);O(C.wood,0,.65,0,.18,.31,.17);for(const side of[-1,1])for(let i=0;i<5;i++)b.put(G.ball,i%2?C.trim:C.accent,side*(.14+i*.055),.80+i*.07,0,.045,.36-i*.035,.055,0,0,-side*(.4+i*.16));O(C.trim,0,1.05,.02,.12,.14,.10);b.put(G.cone,C.accent,0,1.2,.02,.08,.17,.07);}
  else{bar(C.dark,0,.10,0,.64,.20,.52);b.put(G.cyl,C.wood,0,.32,0,.22,.28,.22);const sun=type==='sun-art';if(sun){b.put(G.ring,C.trim,0,1.0,0,.38,.38,.08);motif('sun',0,1.0,.04,.30);}else for(let i=0;i<5;i++){const a=i*2.4;b.put(G.gem,i%2?C.trim:C.accent,Math.sin(a)*.16,.65+(i%3)*.15,Math.cos(a)*.14,.09,.30,.09);}}
 }
 if(decoration)decorationModel(type);else cabinet(type);
 const scene=new T.Group(),mesh=b.mesh(.72,.06);scene.add(mesh);if(type==='materials'&&!decoration)scene.scale.x=2;scene.name=`lv${n}-${type}`;scene.userData={tier:n,type,triangles:mesh.geometry.attributes.position.count/3,approvedPathway:'armory-pilot-v41',footprint:decoration&&type==='carpet'?[2.7,1.9]:type==='materials'?[2,1]:[1,1]};owned.forEach(g=>g.dispose());const r={scene};cache.set(key,r);return r;
}
export function createOrbTrim(T,tier){const C=TIER_DESIGNS[tierNumber(tier)],b=builder(T),ring=new T.TorusGeometry(.445,.012,5,36),gem=new T.OctahedronGeometry(.035),ball=new T.SphereGeometry(.024,8,6);b.put(ring,C.trim,0,.72,0,1,1,1,Math.PI/2);for(let i=0;i<4+tierNumber(tier)%3;i++){const a=i*Math.PI*2/(4+tierNumber(tier)%3);b.put(tier>=4?gem:ball,i%2?C.accent:C.trim,Math.sin(a)*.445,.72,Math.cos(a)*.445);}const root=new T.Group();root.add(b.mesh(.5,.15));for(const g of[ring,gem,ball])g.dispose();return root;}
