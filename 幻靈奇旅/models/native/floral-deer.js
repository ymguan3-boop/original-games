/* Floral Deer — original volumetric Three.js r128 rigs. +Z forward; Y=0 ground.
 * No textures, external assets, lights, or allocations in the animation loop.
 * Resource ownership and animation state are isolated per instance.
 */
(()=>{'use strict';
function create(options={}){
 const T=window.THREE;if(!T)throw new Error('FloralDeer requires THREE r128.');
 const stage=Math.max(1,Math.min(3,Math.floor(Number(options.stage)||1))),baby=stage===1,royal=stage===3;
 const names=['沒花鹿','花鹿米','藏鏡鹿'],root=new T.Group(),rig=new T.Group();root.name=names[stage-1];rig.name='FloralDeerRig';root.add(rig);
 const geometries=new Set(),materials=new Set(),jointNodes=[],legs=[],ears=[],antlers=[],foliage=[],tails=[],eyes=[],babyEyes=[];let babyMouth=null;
 const geo=g=>(geometries.add(g),g),linear=h=>new T.Color(h).convertSRGBToLinear();
 function mat(hex,extra={}){const m=new T.MeshPhysicalMaterial(Object.assign({color:linear(hex),roughness:.42,metalness:0,clearcoat:.32,clearcoatRoughness:.25,envMapIntensity:.55},extra));materials.add(m);return m;}
 const coat=mat('#efc36d'),golden=mat('#f5d77e'),paleGold=mat('#ffe5a0'),cream=mat('#fff1d9'),ivory=mat('#fff9eb'),pink=mat('#eaa093',{roughness:.55}),blush=mat('#f6b0a5',{roughness:.58});
 const brown=mat('#815236',{roughness:.58}),hoofMat=mat('#67422e',{roughness:.42}),noseMat=mat('#61402c',{roughness:.31}),dark=mat('#39261d',{roughness:.32}),gold=mat('#dca13c',{metalness:.64,roughness:.28}),goldBright=mat('#f7d66f',{metalness:.38,roughness:.27});
 const green=mat('#527858',{roughness:.47}),lightGreen=mat('#7b9560',{roughness:.46}),gemMat=mat('#4e9e88',{metalness:.13,roughness:.16,clearcoat:.95}),flowerGold=mat('#ffd66b',{roughness:.38}),white=mat('#ffffff',{roughness:.16});
 const sphere=geo(new T.SphereGeometry(1,24,16)),fineSphere=geo(new T.SphereGeometry(1,36,24)),tinySphere=geo(new T.SphereGeometry(1,14,10));
 const torus=geo(new T.TorusGeometry(1,.105,8,48)),gemGeometry=geo(new T.OctahedronGeometry(1,0));
 function group(parent,x=0,y=0,z=0,name=''){const g=new T.Group();g.position.set(x,y,z);g.name=name;parent.add(g);if(name)jointNodes.push(g);return g;}
 function mesh(parent,g,m){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function ell(parent,m,x,y,z,sx,sy,sz,detail=false){const o=mesh(parent,detail?fineSphere:sphere,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 function tube(parent,m,points,r=.015,segments=20){return mesh(parent,geo(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,7,false)),m);}
 function flow(parent,m,points,radius,segments=32,sides=10){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=curve.computeFrenetFrames(segments,false),p=[],indices=[];
  for(let i=0;i<=segments;i++){const t=i/segments,c=curve.getPointAt(t),r=radius(t);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,v=c.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);p.push(v.x,v.y,v.z);}}
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,m);
 }
 // Closed double-sided leaf volume: tapered silhouette, curved surface, raised central ridge.
 const leafGeometry=(()=>{
  const rows=18,cols=8,p=[],indices=[];
  for(const side of [1,-1])for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const t=i/rows,u=j/cols*2-1,w=.30*Math.pow(Math.sin(Math.PI*t),.72),thickness=.015*Math.sin(Math.PI*t);p.push(w*u,t,.10*Math.sin(Math.PI*t)*(1-u*u)+.035*t*t+side*thickness*(1-u*u));}
  const stride=cols+1,layer=(rows+1)*stride;
  for(let side=0;side<2;side++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=side*layer+i*stride+j,b=a+stride;if(side===0)indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);}
  const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g;
 })();
 const veinGeometry=geo(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,.10,.034),new T.Vector3(0,.42,.119),new T.Vector3(0,.74,.101),new T.Vector3(0,.94,.054)]),16,.009,5,false));
 function leaf(parent,m,x,y,z,width,length,rz=0,rx=0,ry=0,vein=false){
  const o=mesh(parent,leafGeometry,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(width,length,width);
  if(vein){const v=mesh(parent,veinGeometry,m===green||m===lightGreen?paleGold:goldBright);v.position.copy(o.position);v.rotation.copy(o.rotation);v.scale.copy(o.scale);}return o;
 }
 function flower(parent,x,y,z,size,petalMat=ivory,rotation=0){
  const f=group(parent,x,y,z);f.rotation.z=rotation;
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,o=ell(f,petalMat,Math.sin(a)*size*.61,Math.cos(a)*size*.61,0,size*.40,size*.54,size*.19);o.rotation.z=-a;}
  ell(f,flowerGold,0,0,size*.15,size*.29,size*.29,size*.21);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;ell(f,goldBright,Math.sin(a)*size*.12,Math.cos(a)*size*.12,size*.33,size*.035,size*.035,size*.025);}return f;
 }
 function jewel(parent,x,y,z,sx,sy,sz){const back=mesh(parent,gemGeometry,goldBright);back.position.set(x,y,z);back.scale.set(sx*1.20,sy*1.20,sz);const g=mesh(parent,gemGeometry,gemMat);g.position.set(x,y,z+sz*.65);g.scale.set(sx,sy,sz*.72);return g;}
 const torsoY=baby?.54:royal?1.63:1.28,bodyRX=baby?.35:royal?.45:.39,bodyRY=baby?.34:royal?.51:.45,bodyRZ=baby?.59:royal?.89:.75;
 const headRX=baby?.57:.43,headRY=baby?.59:.43,headRZ=baby?.48:.37;
 const headY=baby?1.23:royal?3.48:2.52,headZ=baby?.43:royal?.72:.64;
 const upper=baby?.205:royal?.62:.47,lower=baby?.22:royal?.64:.53,hoofHeight=baby?.11:royal?.15:.14;
 const body=group(rig,0,torsoY,0,'Torso');const torso=ell(body,coat,0,0,0,bodyRX,bodyRY,bodyRZ,true);ell(body,cream,0,-bodyRY*.38,.055,bodyRX*.82,bodyRY*.69,bodyRZ*.84,true);
 for(const s of [-1,1]){
  ell(body,coat,s*bodyRX*.47,-.035,bodyRZ*.48,bodyRX*.63,bodyRY*.88,bodyRZ*.40);ell(body,coat,s*bodyRX*.48,-.01,-bodyRZ*.57,bodyRX*.69,bodyRY*.87,bodyRZ*.40);
  const spots=baby?[[-.25,.15,.060],[-.05,.25,.065],[.12,.19,.047]]:[[-.43,.20,.072],[-.24,.29,.068],[-.04,.30,.060],[.12,.20,.058],[-.32,.035,.056],[-.12,.10,.049]];
  for(const p of spots){const z=p[0]*(royal?1.12:1),y=p[1]*(baby?.65:1),x=bodyRX*Math.sqrt(Math.max(.08,1-y*y/(bodyRY*bodyRY)-z*z/(bodyRZ*bodyRZ)));const spot=ell(body,ivory,s*(x+.015),y,z,p[2],p[2]*1.05,.014);spot.rotation.y=s*Math.PI/2;}
 }
 if(!baby)for(let i=0;i<5;i++){const z=-.43+i*.17,x=(i%2?-.13:.13),y=bodyRY*Math.sqrt(Math.max(.08,1-x*x/(bodyRX*bodyRX)-z*z/(bodyRZ*bodyRZ)));ell(body,ivory,x,y+.012,z,.060,.014,.065);}
 // The neck is a continuous solid from shoulder into skull. Head and antlers share the neck pivot.
 const neckBaseY=baby?.12:.22,neckBaseZ=baby?.32:royal?.44:.37;
 const neck=group(body,0,neckBaseY,neckBaseZ,'Neck');const headLocalY=headY-torsoY-neckBaseY,headLocalZ=headZ-neckBaseZ;
 if(baby){ell(neck,coat,0,.25,.03,.235,.36,.22);ell(neck,cream,0,.26,.15,.16,.29,.10);}
 else{
  flow(neck,coat,[[0,-.10,-.07],[0,headLocalY*.30,headLocalZ*.35-.035],[0,headLocalY*.67,headLocalZ*.80],[0,headLocalY-.12,headLocalZ]],t=>(royal?.26:.235)*(1-t*.49),42,16);
  flow(neck,cream,[[0,.03,.135],[0,headLocalY*.35,headLocalZ*.45+.145],[0,headLocalY*.72,headLocalZ*.84+.105],[0,headLocalY-.12,headLocalZ+.09]],t=>(royal?.15:.14)*(1-t*.44),36,12);
 }
 const head=group(neck,0,headLocalY,headLocalZ,'Head');ell(head,coat,0,0,0,headRX,headRY,headRZ,true);
 const faceCY=baby?-.11:-.035,faceCZ=baby?.30:.19,faceRX=baby?.54:.405,faceRY=baby?.45:.365,faceRZ=baby?.26:.225;
 ell(head,cream,0,faceCY,faceCZ,faceRX,faceRY,faceRZ,true);
 const surfaceZ=(x,y,offset=0)=>faceCZ+faceRZ*Math.sqrt(Math.max(.015,1-x*x/(faceRX*faceRX)-(y-faceCY)*(y-faceCY)/(faceRY*faceRY)))+offset;
 function facialCurve(points,r,m=dark){return tube(head,m,points.map(p=>[p[0],p[1],surfaceZ(p[0],p[1],.014)]),r,18);}
 if(baby){
  const irisMat=mat('#ffffff',{vertexColors:true,roughness:.23,clearcoat:.55}),irisTop=linear('#44271c'),irisBottom=linear('#cf9646');
  function babyEyePatch(parent,cx,cy,rx,ry,offset,m,dx=0,dy=0,gradient=false){
   const points=[],colors=[],indices=[],rows=8,cols=40;
   for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const r=i/rows,a=j/cols*Math.PI*2,x=dx+rx*r*Math.cos(a),y=dy+ry*r*Math.sin(a);points.push(x,y,surfaceZ(cx+x,cy+y,offset));if(gradient){const c=irisTop.clone().lerp(irisBottom,T.MathUtils.clamp((.7-(y-dy)/ry)*.72,0,1));colors.push(c.r,c.g,c.b);}}
   for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
   const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(points,3));if(gradient)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();const o=mesh(parent,g,m);o.castShadow=false;
  }
  for(const s of [-1,1]){
   const cx=s*.245,cy=.008,open=group(head,cx,cy,0,'BabyOpenEye'+s),closed=group(head,cx,-.035,0,'BabyClosedEye'+s),points=[];
   for(let i=0;i<=16;i++){const u=i/16,x=(u-.5)*.20,y=Math.sin(u*Math.PI)*.083;points.push([x,y,surfaceZ(cx+x,-.035+y,.014)]);}tube(closed,dark,points,.025,18);
   babyEyePatch(open,cx,cy,.133,.168,.017,dark);babyEyePatch(open,cx,cy,.112,.149,.022,irisMat,0,-.003,true);babyEyePatch(open,cx,cy,.048,.099,.026,dark,0,.022);babyEyePatch(open,cx,cy,.032,.043,.029,white,-.032,.075);babyEyePatch(open,cx,cy,.014,.018,.030,white,.045,-.069);babyEyes.push({open,closed});
  }
 }else{
  const irisMat=mat('#ffffff',{vertexColors:true,roughness:.26,clearcoat:.50});const irisTop=linear('#44271c'),irisBottom=linear('#d99943');
  function eyePatch(parent,cx,cy,rx,ry,offset,m,dx=0,dy=0,gradient=false){
   const p=[],c=[],idx=[],rows=8,sides=40;for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){const r=i/rows,a=j/sides*Math.PI*2,x=dx+rx*r*Math.cos(a),y=dy+ry*r*Math.sin(a);p.push(x,y,surfaceZ(cx+x,cy+y,offset));if(gradient){const v=(y-dy)/ry,col=irisTop.clone().lerp(irisBottom,Math.max(0,Math.min(1,(.65-v)*.75)));c.push(col.r,col.g,col.b);}}
   for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,b,a+1,b,b+1,a+1);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));if(gradient)g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();const o=mesh(parent,g,m);o.castShadow=false;return o;
  }
  for(const s of [-1,1]){const cx=s*.205,cy=.025,eye=group(head,cx,cy,0,'Eye'+s),blink=group(eye,0,0,0,'Eyelid'+s);eyePatch(blink,cx,cy,.111,.139,.012,dark);eyePatch(blink,cx,cy,.093,.122,.016,irisMat,0,-.004,true);eyePatch(blink,cx,cy,.042,.087,.019,dark,0,.017);eyePatch(blink,cx,cy,.028,.039,.022,white,-.027,.062);eyePatch(blink,cx,cy,.012,.016,.023,white,.036,-.057);eyes.push(blink);
   facialCurve([[s*.12,.179],[s*.20,.205],[s*.28,.175]],.009,brown);for(let i=0;i<2;i++)facialCurve([[s*(.292+i*.004),.085-i*.035],[s*(.327+i*.012),.108-i*.025]],.009);}
 }
 for(const s of [-1,1]){const x=s*(baby?.39:.295),y=baby?-.23:-.16,c=ell(head,blush,x,y,surfaceZ(x,y,.015),baby?.097:.067,baby?.071:.048,.013);c.rotation.y=s*.38;}
 const muzzle=group(head,0,baby?-.24:-.155,baby?.445:.365,'Muzzle');
 for(const s of [-1,1])ell(muzzle,ivory,s*(baby?.088:.074),-.005,.045,baby?.126:.111,baby?.101:.083,baby?.10:.122);
 const nose=ell(muzzle,noseMat,0,.058,baby?.133:.158,baby?.067:.061,baby?.039:.041,.041);nose.rotation.z=.08;
 tube(muzzle,brown,[[0,.032,baby?.155:.183],[0,-.019,baby?.153:.184]],.010,7);
 if(baby){babyMouth=group(muzzle,0,-.078,.140,'BabyMouthOpening');ell(babyMouth,brown,0,0,0,.075,.064,.017);ell(babyMouth,mat('#ed9268'),0,-.027,.017,.048,.027,.008);}
 else tube(muzzle,brown,[[-.105,-.025,.115],[-.052,-.053,.155],[0,-.027,.185],[.050,-.048,.160],[.094,-.024,.125]],.008,20);
 // Oversized cupped ears have a solid cream rim and a soft pink inset.
 for(const s of [-1,1]){
  const ear=group(head,s*headRX*.77,baby?.24:.16,-.04,'Ear'+s);ear.rotation.z=-s*(baby?.91:1.11);ear.rotation.y=s*.12;
  leaf(ear,paleGold,0,0,0,baby?1.06:1.08,baby?.60:.60,0,.05,0);leaf(ear,cream,0,.037,.024,baby?.91:.94,baby?.53:.53,0,.05,0);leaf(ear,pink,0,.085,.051,baby?.71:.73,baby?.41:.41,0,.05,0);ell(ear,cream,0,.045,.025,.12,.12,.07);ears.push({node:ear,s,base:ear.rotation.z});
 }
 // Cream bangs and forehead markings are geometry that wraps around the skull.
 ell(head,cream,0,headRY*.67,-.035,headRX*.93,headRY*.34,headRZ*.88,true);
 for(let i=0;i<5;i++){const x=(i-2)*headRX*.31,y=headRY*(.64-.07*Math.abs(i-2)),z=headRZ*.72;const bang=ell(head,ivory,x,y,z,headRX*.26,headRY*.22,.057);bang.rotation.z=(i-2)*.25;}
 for(const x of [-.075,.032,.112])ell(head,ivory,x,baby?.205:.225,headRZ*.96,.021,baby?.031:.025,.010);
 if(baby){const tuft=group(head,0,.51,-.06,'GoldenTuft');leaf(tuft,golden,-.025,0,0,.90,.55,.20,-.08,0,true);leaf(tuft,golden,.035,0,.01,.79,.47,-.68,-.04,0,true);leaf(tuft,paleGold,.08,-.02,.025,.59,.31,-1.12,.03,0);foliage.push({node:tuft,phase:.1,baseX:0,baseZ:0});}
 // Branches, flowers and leaves inherit the skull/antler transform as a single ornament rig.
 if(!baby)for(const s of [-1,1]){
  const antler=group(head,s*.225,.285,-.085,'Antler'+s);antlers.push({node:antler,s});
  if(!royal){
   flow(antler,brown,[[0,0,0],[s*.09,.31,.015],[s*.19,.61,.01],[s*.19,.87,.015]],t=>.055*(1-t*.79),32,10);
   flow(antler,gold,[[s*.09,.30,.015],[s*.32,.47,.025],[s*.50,.68,.03]],t=>.040*(1-t*.86),24,9);
   flow(antler,gold,[[s*.15,.51,.01],[-s*.06,.66,.015],[-s*.16,.80,.025]],t=>.033*(1-t*.87),22,9);
   leaf(antler,golden,s*.19,.76,.025,.89,.50,s*.09,-.04,0,true);leaf(antler,paleGold,s*.43,.56,.045,.90,.48,-s*.75,0,0,true);leaf(antler,cream,-s*.045,.60,.04,.74,.42,s*.53,0,0);
   leaf(antler,golden,-s*.07,.45,.025,.75,.40,s*.95,0,0,true);leaf(antler,green,s*.29,.35,.02,.80,.43,-s*1.08,.12,0,true);flower(antler,s*.25,.45,.103,.135,ivory,s*.22);flower(antler,-s*.045,.29,.09,.10,ivory);
  }else{
   flow(antler,gold,[[0,0,0],[s*.28,.13,-.01],[s*.66,.24,-.035],[s*1.00,.42,-.025],[s*1.22,.72,.02]],t=>(.10+.09*Math.sin(Math.PI*t))*(1-t*.97),52,14);
   flow(antler,goldBright,[[s*.17,.14,.065],[s*.60,.32,.080],[s*.98,.46,.073],[s*1.22,.72,.02]],t=>.022*(1-t*.94),36,8);
   flow(antler,gold,[[s*.35,.17,-.03],[s*.36,.47,-.04],[s*.29,.68,-.035]],t=>.048*(1-t*.88),26,10);
   flow(antler,gold,[[s*.68,.27,-.025],[s*.78,.54,-.04],[s*.70,.71,-.035]],t=>.042*(1-t*.89),26,10);
   for(let i=0;i<4;i++){const x=s*(.20+i*.20),y=.30+i*.065;leaf(antler,i%2?golden:cream,x,y,-.005,.72,.38,-s*(.20+i*.12),-.12,0,true);}
   leaf(antler,green,s*.30,.27,-.015,.97,.50,s*1.21,.10,0,true);leaf(antler,green,s*.77,.28,-.045,.92,.46,-s*1.98,.13,0,true);leaf(antler,lightGreen,s*.50,.42,-.05,.71,.40,s*.61,-.08,0,true);
   flower(antler,s*.30,.45,.15,.155,ivory);flower(antler,s*.65,.39,.15,.14,ivory,.24);flower(antler,s*.11,.22,.13,.115,ivory,-.25);
  }
 }
 // Soft brown bow with a five-petal yellow flower; the royal stage wears a jeweled collar.
 const collar=group(neck,0,baby?.01:.015,baby?.04:.025,'Collar');
 if(!royal){
  const band=mesh(collar,torus,brown);band.rotation.x=Math.PI/2;band.scale.set(baby?.265:.235,baby?.265:.235,baby?.20:.22);
  const bow=group(collar,0,-.065,baby?.255:.27);for(const s of [-1,1]){const loop=ell(bow,brown,s*.128,.012,0,.159,.088,.063);loop.rotation.z=-s*.27;const ribbon=ell(bow,brown,s*.066,-.116,-.009,.065,.14,.037);ribbon.rotation.z=s*.30;}
  flower(bow,0,-.007,.078,baby?.13:.15,flowerGold,.12);
 }else{
  const band=mesh(collar,torus,gold);band.rotation.x=Math.PI/2;band.scale.set(.277,.277,.261);const rim=mesh(collar,torus,goldBright);rim.rotation.x=Math.PI/2;rim.position.y=.034;rim.scale.set(.276,.276,.26);
  jewel(collar,0,.04,.276,.091,.126,.040);for(const s of [-1,1])jewel(collar,s*.235,.015,.12,.066,.09,.033);
  flower(collar,0,-.165,.31,.205,flowerGold);leaf(collar,green,-.06,-.15,.28,.55,.32,2.45,.02,0,true);leaf(collar,green,.07,-.15,.28,.55,.32,-2.45,.02,0,true);
  tube(collar,goldBright,[[0,-.31,.31],[0,-.47,.32]],.012,8);const pendant=mesh(collar,gemGeometry,goldBright);pendant.position.set(0,-.49,.32);pendant.scale.set(.065,.115,.035);
  const crown=group(head,0,.235,.12,'Crown');tube(crown,gold,[[-.37,.015,-.01],[-.22,.035,.17],[0,-.02,.27],[.22,.035,.17],[.37,.015,-.01]],.035,32);
  for(const s of [-1,1]){leaf(crown,goldBright,s*.12,.012,.22,.48,.32,-s*.42,-.02,0);leaf(crown,green,s*.055,.13,.24,.38,.26,-s*.12,0,0,true);}jewel(crown,0,.15,.267,.070,.115,.036);
 }
 // Chest mantle, shoulder leaves and the waterfall tail each have independent gentle sway pivots.
 const chest=group(body,0,.24,bodyRZ*.80,'ChestLeaves');
 if(baby){for(const s of [-1,1])leaf(chest,cream,s*.19,-.025,0,.48,.24,-s*2.25,.04,0);}
 else{
  for(let layer=0;layer<2;layer++)for(let i=0;i<5;i++){const s=(i-2)/2,a=Math.PI+s*.48,x=s*(royal?.20:.16),y=.025-layer*.17;leaf(chest,(i+layer)%3===0?golden:ivory,x,y,.025+layer*.045,royal?.83:.70,(royal?.69:.56)-Math.abs(s)*.12,a,royal?-.07:0,0,true);}
  for(const s of [-1,1]){
   const shoulder=group(body,s*.19,.31,.20,'ShoulderMantle'+s);foliage.push({node:shoulder,phase:s,baseX:0,baseZ:0});
   for(let i=0;i<(royal?5:3);i++){const a=-s*(1.62+i*.14),z=.20-i*.16;leaf(shoulder,i%2?cream:golden,s*.02,-i*.035,z,royal?.86:.63,royal?.75:.44,a,-.10-i*.06,s*.08,true);}
   if(royal){leaf(shoulder,green,s*.015,.04,.22,.90,.70,-s*1.39,-.08,0,true);leaf(shoulder,green,s*.02,.015,-.11,.80,.64,-s*1.66,-.18,0,true);}
  }
 }
 foliage.push({node:chest,phase:2,baseX:0,baseZ:0});
 const tail=group(body,0,.13,-bodyRZ*.88,'Tail');tails.push(tail);
 if(baby){leaf(tail,golden,0,0,0,.72,.42,-.15,-1.02,0);leaf(tail,ivory,0,.085,-.06,.60,.34,-.13,-.97,0);}
 else if(!royal){for(let i=0;i<7;i++){const a=(i-3)*.23;leaf(tail,i%3===0?ivory:golden,Math.sin(a)*.07,0,0,.73,.68-Math.abs(a)*.16,a,-.95-Math.abs(a)*.20,0,true);}}
 else{
  for(let layer=0;layer<3;layer++)for(let i=0;i<5;i++){const a=(i-2)*.22,x=(i-2)*.11,y=.15-layer*.16,z=-layer*.13,m=(i+layer)%5===0?green:(i+layer)%2?ivory:golden;leaf(tail,m,x,y,z,1.02-layer*.10,1.20+layer*.12-Math.abs(i-2)*.08,a,-2.23-layer*.08,0,true);}
  for(const s of [-1,1]){const hipCape=group(body,s*.29,.19,-.47,'HipCape'+s);foliage.push({node:hipCape,phase:s*1.7,baseX:0,baseZ:0});for(let i=0;i<4;i++)leaf(hipCape,i%2?ivory:golden,s*.015,-i*.14,-i*.06,.94,1.02-i*.035,-s*(2.12+i*.13),-.42-i*.10,s*.12,true);}
 }
 // Four continuous legs: shoulder/hip → elbow/stifle → wrist/hock → hoof.
 const shoulderY=upper+lower+hoofHeight,frontZ=bodyRZ*.61,rearZ=-bodyRZ*.62;
 for(const front of [true,false])for(const s of [-1,1]){
  const shoulder=group(body,s*bodyRX*(baby?.70:.67),shoulderY-torsoY+(front?0:.02),front?frontZ:rearZ,(front?'Shoulder':'Hip')+(s<0?'L':'R'));
  const knee=group(shoulder,0,-upper,0,(front?'Elbow':'Stifle')+s),ankle=group(knee,0,-lower,0,(front?'Wrist':'Hock')+s),hoof=group(ankle,0,-hoofHeight*.33,.022,'Hoof'+(front?'Front':'Rear')+s);
  const thick=baby?.102:royal?.091:.083,shin=baby?.074:royal?.058:.053;
  ell(shoulder,coat,0,-upper*.35,0,thick*(front?1:1.13),upper*.64,thick*1.13);ell(shoulder,cream,0,-upper*.73,.009,thick*.76,upper*.38,thick*.83);ell(knee,cream,0,0,0,shin*1.19,shin*1.32,shin*1.15);
  ell(knee,cream,0,-lower*.48,.008,shin,lower*.57,shin*1.05);ell(ankle,cream,0,-hoofHeight*.11,.007,shin*1.05,hoofHeight*.51,shin*1.10);ell(hoof,hoofMat,0,-hoofHeight*.21,.015,shin*1.31,hoofHeight*.43,shin*1.60);
  tube(hoof,brown,[[0,-hoofHeight*.48,shin*1.25],[0,-hoofHeight*.10,shin*1.48]],baby?.006:.004,6);
  if(royal&&front){const guard=mesh(knee,torus,gold);guard.rotation.x=Math.PI/2;guard.position.y=-lower*.60;guard.scale.set(.078,.078,.080);leaf(knee,goldBright,0,-lower*.79,.075,.38,.28,0,0,0);jewel(knee,0,-lower*.61,.087,.035,.058,.016);for(const d of [-1,1])leaf(knee,gold,d*.045,-lower*.56,.018,.28,.22,-d*.50,0,0);}
  legs.push({shoulder,knee,ankle,hoof,s,front,phase:(front?s<0:s>0)?0:Math.PI});
 }
 // Combine stationary geometry inside each articulated pivot, preserving actual joint hierarchy.
 function mergeStatic(node){
  for(const child of node.children.slice())if(child.isGroup)mergeStatic(child);
  const buckets=new Map();
  function gather(parent,matrix){for(const o of parent.children.slice()){o.updateMatrix();const local=new T.Matrix4().multiplyMatrices(matrix,o.matrix);if(o.isMesh){const list=buckets.get(o.material)||[];list.push({o,matrix:local});buckets.set(o.material,list);}else if(o.isGroup&&!o.name)gather(o,local);}}
  gather(node,new T.Matrix4());
  for(const [m,list]of buckets){if(list.length<2)continue;const p=[],n=[],c=[];for(const entry of list){let g=entry.o.geometry.clone();g.applyMatrix4(entry.matrix);if(g.index){const non=g.toNonIndexed();g.dispose();g=non;}const a=g.attributes.position,b=g.attributes.normal,col=g.attributes.color;for(let i=0;i<a.count;i++){p.push(a.getX(i),a.getY(i),a.getZ(i));n.push(b.getX(i),b.getY(i),b.getZ(i));if(m.vertexColors)c.push(col?col.getX(i):1,col?col.getY(i):1,col?col.getZ(i):1);}g.dispose();entry.o.parent.remove(entry.o);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));if(m.vertexColors)g.setAttribute('color',new T.Float32BufferAttribute(c,3));mesh(node,g,m);}
  for(const child of node.children.slice())if(child.isGroup&&!child.name&&child.children.length===0)node.remove(child);
 }
 mergeStatic(rig);
 const fx=group(root,0,0,0,'ReusableFloralPulse'),pulseMaterial=mat('#f6d46f',{transparent:true,opacity:0,depthWrite:false,emissive:linear('#e9b84f'),emissiveIntensity:.45,roughness:.24});
 const pulseRings=[],pollen=[];for(let i=0;i<2;i++){const m=pulseMaterial.clone();materials.add(m);const r=mesh(fx,geo(new T.TorusGeometry(1,.010,6,72)),m);r.rotation.x=-Math.PI/2;r.visible=false;pulseRings.push(r);}
 for(let i=0;i<10;i++){const p=mesh(fx,tinySphere,pulseMaterial);p.scale.setScalar(.014+(i%3)*.005);p.visible=false;p.castShadow=false;pollen.push({node:p,phase:i*Math.PI*.765,y:(i%5)*.14});}
 // Permanent orbiting ornaments are independent from the optional Pulse action.
 const orbitRoot=group(root,0,0,0,'OrbitingSakura'),orbitals=[],orbitRadius=royal?2.0:1.35,orbitHeight=royal?2.75:1.85,orbitZ=-.10;
 const orbitLimit=new T.Box3(new T.Vector3(-orbitRadius-(royal?.48:.22),orbitHeight-.85,orbitZ-orbitRadius*1.13-(royal?.48:.22)),new T.Vector3(orbitRadius+(royal?.48:.22),orbitHeight+.85,orbitZ+orbitRadius*1.13+(royal?.48:.22))),orbitWorldLimit=new T.Box3();
 if(!baby){
  // Five notched petals form a cherry-blossom silhouette, with a real beveled edge.
  const shape=new T.Shape(),outline=[];
  for(let petal=0;petal<5;petal++)for(let j=0;j<40;j++){const u=j/40,a=-Math.PI/2-Math.PI/5+(petal+u)*Math.PI*2/5,r=.43+.57*Math.pow(Math.sin(Math.PI*u),.72)-.115*Math.exp(-Math.pow((u-.5)/.047,2)),x=Math.cos(a)*r,y=Math.sin(a)*r;if(!petal&&!j)shape.moveTo(x,y);else shape.lineTo(x,y);outline.push(new T.Vector3(x,y,.071));}shape.closePath();
  const sakuraGeometry=geo(new T.ExtrudeGeometry(shape,{depth:.040,bevelEnabled:true,bevelSize:.012,bevelThickness:.009,bevelSegments:2,steps:1,curveSegments:24}));
  const rose=mat('#f7b8cb',{roughness:.37,clearcoat:.65}),roseTip=mat('#ffe4ed',{roughness:.4}),roseGold=mat('#cc9674',{metalness:.7,roughness:.24}),pinkMirror=mat('#ffa9dc',{metalness:.72,roughness:.065,clearcoat:1,clearcoatRoughness:.022,envMapIntensity:1.35,emissive:linear('#ad427d'),emissiveIntensity:.10,side:T.DoubleSide});
  const mirrorFaceGeometry=royal?geo(new T.ShapeGeometry(shape,32)):null;
  const edgeGeometry=royal?geo(new T.TubeGeometry(new T.CatmullRomCurve3(outline,true),160,.020,6,true)):null;
  for(let i=0;i<(royal?2:8);i++){
   const o=group(orbitRoot,0,0,0,(royal?'SakuraMirror':'SakuraBlossom')+i),size=royal?.40:.145+(i%3)*.018;o.scale.setScalar(size);
   mesh(o,sakuraGeometry,royal?roseGold:rose);
   if(royal){
    const front=mesh(o,mirrorFaceGeometry,pinkMirror);front.scale.set(.90,.90,1);front.position.z=.062;front.castShadow=false;
    const back=mesh(o,mirrorFaceGeometry,pinkMirror);back.scale.set(.90,.90,1);back.rotation.y=Math.PI;back.position.z=-.024;back.castShadow=false;
    mesh(o,edgeGeometry,roseGold);const rearRim=mesh(o,edgeGeometry,roseGold);rearRim.rotation.y=Math.PI;rearRim.position.z=.040;
   }else{
    ell(o,flowerGold,0,0,.059,.12,.12,.055);for(let n=0;n<5;n++){const a=n/5*Math.PI*2;ell(o,roseTip,Math.sin(a)*.18,Math.cos(a)*.18,.061,.022,.022,.012);}
   }
   orbitals.push({node:o,phase:i/(royal?2:8)*Math.PI*2,spin:i*.72});
  }
  mergeStatic(orbitRoot);
 }
 root.updateMatrixWorld(true);const initialBox=new T.Box3().setFromObject(rig),floorOffset=-initialBox.min.y+.014;rig.position.y=floorOffset;
 let mode='Idle',elapsed=0,actionTime=0,motionSpeed=1,transitionAge=.25,disposed=false;
 const modes=['Idle','Walk','Run','Greet','Rest','Pulse'],bounds=new T.Box3(),size=new T.Vector3(),pose=[];
 rig.traverse(node=>{if(node.isGroup)pose.push({node,position:new T.Vector3(),quaternion:new T.Quaternion(),scale:new T.Vector3(),targetPosition:new T.Vector3(),targetQuaternion:new T.Quaternion(),targetScale:new T.Vector3()});});
 function capturePose(){for(const p of pose){p.position.copy(p.node.position);p.quaternion.copy(p.node.quaternion);p.scale.copy(p.node.scale);}transitionAge=0;}
 function setMode(value){let name=String(value||'Idle');const aliases={Wave:'Greet',React:'Greet',Sleep:'Rest',Attack:'Pulse'};name=aliases[name]||name;if(!modes.includes(name))name='Idle';if(mode!==name){capturePose();mode=name;actionTime=0;}return mode;}
 function setMotionSpeed(value){const n=Number(value);motionSpeed=Number.isFinite(n)?Math.min(3,Math.max(0,n)):1;return motionSpeed;}
 function update(dt){
  if(disposed)return;const d=Math.min(.075,Math.max(0,Number(dt)||0));elapsed+=d;actionTime+=d;const t=elapsed,walk=mode==='Walk',run=mode==='Run',moving=walk||run,rest=mode==='Rest',greet=mode==='Greet',pulse=mode==='Pulse',speed=moving?motionSpeed:1;
  const gait=t*(run?10:6)*speed,stride=run?.53:.32,breath=Math.sin(t*(rest?1.35:2.0));
  rig.position.set(0,floorOffset-(rest?(upper+lower)*.40:0)+(moving?Math.abs(Math.sin(gait))*(run?.055:.021):0),!options.inPlace&&moving?Math.sin(t*.45)*.20*motionSpeed:0);rig.rotation.set(0,0,0);
  body.position.y=torsoY;body.rotation.set(moving?Math.sin(gait)*.012:breath*.006,0,moving?Math.sin(gait)*.010:0);body.scale.y=1+breath*.005;
  neck.rotation.set(rest?.17:greet?.09+Math.sin(actionTime*3.7)*.12:Math.sin(t*1.6)*.017,Math.sin(t*1.0)*.028,greet?Math.sin(actionTime*2.5)*.035:0);
  head.rotation.set(rest?.11:greet?Math.sin(actionTime*3.7+.5)*.095:Math.sin(t*1.8)*.014,greet?Math.sin(actionTime*2.1)*.055:Math.sin(t*.9)*.025,0);
  for(const l of legs){const q=gait+l.phase;l.shoulder.rotation.set(moving?Math.sin(q)*stride:0,0,0);l.knee.rotation.set(moving?Math.max(0,Math.sin(q-.65))*(run?.65:.38)*(l.front?-1:1):0,0,0);l.ankle.rotation.set(moving?-l.knee.rotation.x*.55-l.shoulder.rotation.x*.18:0,0,0);l.hoof.rotation.set(0,0,0);
   if(rest){l.shoulder.rotation.x=l.front?1.04:-1.04;l.knee.rotation.x=l.front?-2.0:2.0;l.ankle.rotation.x=l.front?.96:-.96;}
   if(greet&&l.front&&l.s===-1){l.shoulder.rotation.x=-.32;l.knee.rotation.x=-.70;l.ankle.rotation.x=.52;}
  }
  for(const e of ears){e.node.rotation.z=e.base+Math.sin(t*1.9+e.s)*.035+(greet?e.s*Math.sin(actionTime*4)*.045:0);e.node.rotation.x=Math.sin(t*1.5+e.s)*.023;}
  for(const a of antlers){a.node.rotation.x=Math.sin(t*1.8+a.s*.4)*(moving?.022:.009);a.node.rotation.z=Math.sin(t*1.4+a.s)*.009;}
  for(const f of foliage){f.node.rotation.x=f.baseX+Math.sin(t*(moving?3.6:1.8)+f.phase)*(moving?.048:.023);f.node.rotation.z=f.baseZ+Math.sin(t*1.6+f.phase)*.018;}
  for(const tailNode of tails){tailNode.rotation.set(Math.sin(t*2.2)*.025,Math.sin(t*(moving?3.5:1.7))*(moving?.12:.055),Math.sin(t*1.9)*.035);}
  const blinkPhase=t%5.4,blink=rest?.10:blinkPhase>5.03&&blinkPhase<5.23?Math.max(.07,Math.abs((blinkPhase-5.13)/.10)):1;for(const e of eyes)e.scale.y=blink;
  // Independent rhythms avoid a rigid facial toggle; resting closes the baby's eyes.
  if(baby){const openness=rest?0:T.MathUtils.smoothstep(Math.sin(t*1.5+.7),-.50,.50);for(const e of babyEyes){e.open.scale.y=Math.max(.028,openness);e.open.visible=openness>.075;e.closed.visible=openness<=.12;}babyMouth.scale.y=.10+.90*(.5+.5*Math.sin(t*1.9+.3));}
  orbitRoot.position.copy(rig.position);
  for(const o of orbitals){const a=t*(royal?.35:.28)+o.phase+.55,r=orbitRadius+(royal?0:Math.sin(t*.8+o.phase)*.075);o.node.position.set(Math.sin(a)*r,orbitHeight+Math.sin(a*2+o.phase*.37)*(royal?.21:.40)+Math.sin(t*1.4+o.phase)*.10,orbitZ+Math.cos(a)*r*1.13);o.node.rotation.set(Math.sin(t*.9+o.phase)*.12,a+(royal?.18:.35),Math.sin(t*.7+o.spin)*(royal?.13:.32));}
  fx.position.y=floorOffset;pulseMaterial.opacity=pulse?.68:0;
  for(let i=0;i<pulseRings.length;i++){const r=pulseRings[i],phase=(actionTime*.55+i*.5)%1;r.visible=pulse;if(pulse){r.position.y=.028+i*.015;r.scale.setScalar((baby?.32:.45)+phase*(royal?1.20:.80));r.material.opacity=(1-phase)*.58;}}
  for(const p of pollen){p.node.visible=pulse;if(pulse){const a=actionTime*.80+p.phase,r=(baby?.43:.60)+.08*Math.sin(a*1.7);p.node.position.set(Math.sin(a)*r,(actionTime*.32+p.y)%(baby?1.5:royal?2.9:2.1)+.12,Math.cos(a)*r);}}
  if(transitionAge<.25){transitionAge=Math.min(.25,transitionAge+d);const u=transitionAge/.25,k=u*u*(3-2*u);for(const p of pose){p.targetPosition.copy(p.node.position);p.targetQuaternion.copy(p.node.quaternion);p.targetScale.copy(p.node.scale);p.node.position.lerpVectors(p.position,p.targetPosition,k);p.node.quaternion.copy(p.quaternion).slerp(p.targetQuaternion,k);p.node.scale.lerpVectors(p.scale,p.targetScale,k);}}
 }
 function getState(){root.updateMatrixWorld(true);bounds.setFromObject(rig);if(orbitals.length){orbitWorldLimit.copy(orbitLimit).translate(rig.position).applyMatrix4(root.matrixWorld);bounds.union(orbitWorldLimit);}bounds.getSize(size);let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});return{name:root.name,stage,height:size.y,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray()},mode,modes:modes.slice(),meshes,triangles:Math.round(triangles),joints:jointNodes.length,orbitingBlossoms:stage===2?8:0,orbitingMirrors:royal?2:0,motionSpeed,disposed};}
 function dispose(){if(disposed)return;disposed=true;if(root.parent)root.parent.remove(root);root.clear();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.clear();materials.clear();}
 update(0);return{root,update,setMode,setMotionSpeed,dispose,getState};
}
window.FloralDeer={create,version:'1.1.0'};
})();
