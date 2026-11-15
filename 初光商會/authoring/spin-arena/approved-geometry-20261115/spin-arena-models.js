import{SPIN_TOPS}from'./spin-arena-config.js';
export function createSpinModels(T){
 const metals=new Set([...SPIN_TOPS.map(t=>t.metal),0xbd944b,0xd1a54b,0xe9ba56]);
 const faces=[];for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,64);g.addColorStop(0,'#f2f5ff');g.addColorStop(.35,'#c9d9ee');g.addColorStop(.48,'#fff2d5');g.addColorStop(.55,'#64758a');g.addColorStop(1,'#252d40');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);ctx.fillStyle=i%2?'#e9f3ff':'#fff5db';ctx.fillRect(8,4,9,36);ctx.fillRect(39,12,5,27);faces.push(c);}const env=new T.CubeTexture(faces);env.encoding=T.sRGBEncoding;env.needsUpdate=true;
 const materials=new Map(),mat=c=>{if(!materials.has(c)){const metal=metals.has(c),m=new T.MeshPhysicalMaterial({color:c,roughness:metal?.22:.28,metalness:metal?.85:0,clearcoat:metal?.3:.8,clearcoatRoughness:.16,envMap:env,envMapIntensity:metal?.85:.22});m.color.convertSRGBToLinear();materials.set(c,m);}return materials.get(c);};
 function mesh(g,geo,c,x=0,y=0,z=0,edge=false){const m=new T.Mesh(geo,mat(c));m.position.set(x,y,z);g.add(m);m.receiveShadow=true;if(edge){const line=new T.LineSegments(new T.EdgesGeometry(geo,32),new T.LineBasicMaterial({color:0x211a18}));m.add(line);}return m;}
 const cylinder=(g,r,h,c,x=0,y=0,z=0,n=48,edge=false)=>mesh(g,new T.CylinderGeometry(r,r,h,n),c,x,y,z,edge);
 const box=(g,w,h,d,c,x,y,z)=>mesh(g,new T.BoxGeometry(w,h,d),c,x,y,z,true);
 const ring=(g,r,t,c,y)=>{const m=mesh(g,new T.TorusGeometry(r,t,6,80),c,0,y,0);m.rotation.x=Math.PI/2;return m;};
 function arena({radius=2.6,mini=false}={}){
  const g=new T.Group();g.name='廣場戰鬥陀螺競技場';const ratio=radius/2.6;
  // Lathed shallow bowl and closed pedestal are genuine geometry, not a flat image.
  cylinder(g,2.65,.25,0x343d51,0,.14,0,64,true);cylinder(g,2.72,.10,0xbd944b,0,.265,0,64,true);
  const profile=[new T.Vector2(0,.34),new T.Vector2(.7,.35),new T.Vector2(1.5,.40),new T.Vector2(2.1,.52),new T.Vector2(2.45,.72),new T.Vector2(2.58,.76)].reverse();mesh(g,new T.LatheGeometry(profile,96),0x586e91);
  for(const r of[.65,1.45,2.3])ring(g,r,.013,0x75c9f4,.365+(r/2.6)**3*.34);
  ring(g,2.64,.07,0xd1a54b,.87);
  for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*2.65,z=Math.sin(a)*2.65,post=box(g,.24,.62,.25,0x455674,x,.57,z);post.rotation.y=-a;box(g,.30,.08,.31,0xe9ba56,x,.91,z);const cap=mesh(g,new T.SphereGeometry(.075,8,6),0xffdf80,x,1.02,z);cap.userData.noOutline=true;if(i%3===0){const flag=box(g,.55,.52,.035,0x315a9a,x*1.01,.5,z*1.01);flag.rotation.y=-a+Math.PI/2;}}
  // Explicit exit pockets rather than pretending the ring is an impenetrable wall.
  for(const sign of[-1,1]){box(g,.64,.12,.32,0xd5b46a,sign*2.9,.25,0);}
  g.scale.setScalar(ratio);g.userData.collision={kind:'circle',radius:2.25*ratio};return g;
 }
 function top(id='flame'){
  const t=SPIN_TOPS.find(t=>t.id===id)||SPIN_TOPS[0],g=new T.Group();g.name=t.name;
  mesh(g,new T.ConeGeometry(.12,.25,16),t.metal,0,.10,0,true).rotation.z=Math.PI;
  cylinder(g,.34,.16,0x292731,0,.26,0,36,true);for(let i=0;i<24;i++){const a=i*Math.PI/12,b=box(g,.026,.08,.04,0x171923,Math.cos(a)*.337,.26,Math.sin(a)*.337);b.rotation.y=-a;}ring(g,.335,.017,t.metal,.33);cylinder(g,.46,.12,t.metal,0,.38,0,48,true);ring(g,.39,.045,t.color,.46);
  for(let i=0;i<t.blades;i++){const a=i*Math.PI*2/t.blades,group=new T.Group();group.rotation.y=a;g.add(group);const s=new T.Shape();s.moveTo(.14,-.10);s.quadraticCurveTo(.35,-.24,.61,-.11);s.quadraticCurveTo(.45,-.10,.47,.21);s.quadraticCurveTo(.35,.19,.31,.09);s.lineTo(.14,.06);s.closePath();const blade=mesh(group,new T.ExtrudeGeometry(s,{depth:.065,bevelEnabled:true,bevelThickness:.018,bevelSize:.014,bevelSegments:2,curveSegments:10}),t.metal,0,.46,0,true);blade.rotation.x=-Math.PI/2;const inset=mesh(group,new T.ExtrudeGeometry(s,{depth:.012,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:1,curveSegments:8}),t.color,0,.55,0,true);const ip=inset.geometry.attributes.position;for(let j=0;j<ip.count;j++){const radial=Math.hypot(ip.getX(j),ip.getY(j));ip.setZ(j,ip.getZ(j)+Math.sin(Math.min(1,Math.max(0,(radial-.15)/.47))*Math.PI)*.035);}inset.geometry.computeVertexNormals();inset.rotation.x=-Math.PI/2;inset.scale.set(.88,.88,1);
   const screw=cylinder(group,.021,.018,0xc7ced4,.29,.606,0,12,true);box(group,.025,.004,.004,0x35363a,.29,.618,0);if(id==='flame'){const flame=new T.Shape();flame.moveTo(.22,-.01);flame.quadraticCurveTo(.39,-.08,.49,-.06);flame.quadraticCurveTo(.36,-.03,.39,.06);flame.quadraticCurveTo(.30,.02,.22,.025);flame.closePath();const inlay=mesh(group,new T.ExtrudeGeometry(flame,{depth:.004,bevelEnabled:false,curveSegments:8}),t.metal,0,.601,0);inlay.rotation.x=-Math.PI/2;}
  }
  cylinder(g,.22,.09,t.metal,0,.51,0,32,true);cylinder(g,.18,.025,t.color,0,.57,0,32,true);
  const emblem=new T.Group();g.add(emblem);emblem.position.y=.605;
  if(id==='flame'){for(let i=0;i<10;i++){const a=i*Math.PI/5,tuft=mesh(emblem,new T.ConeGeometry(.034,.075,5),t.metal,Math.sin(a)*.113,.014,Math.cos(a)*.113);tuft.rotation.set(Math.cos(a)*Math.PI/2,0,-Math.sin(a)*Math.PI/2);}const head=mesh(emblem,new T.SphereGeometry(.10,18,12),t.metal,0,.022,0);head.scale.set(1,.43,1.08);for(const x of[-1,1]){const ear=mesh(emblem,new T.ConeGeometry(.029,.06,6),t.metal,x*.073,.035,-.063);ear.rotation.x=-.6;const brow=box(emblem,.055,.014,.016,t.metal,x*.042,.064,-.04);brow.rotation.y=x*.2;mesh(emblem,new T.SphereGeometry(.009,10,8),0x231813,x*.035,.069,-.019);const muzzle=mesh(emblem,new T.SphereGeometry(.034,12,8),t.metal,x*.023,.060,.044);muzzle.scale.y=.45;}mesh(emblem,new T.SphereGeometry(.015,10,8),0x2f2019,0,.08,.027).scale.set(1,.4,.7);const chin=mesh(emblem,new T.ConeGeometry(.035,.065,6),t.metal,0,.025,.095);chin.rotation.x=Math.PI/2;}
  else {const points=id==='wind'?3:id==='crystal'?6:id==='thunder'?4:id==='shield'?8:5;for(let i=0;i<points;i++){const a=i*Math.PI*2/points,b=box(emblem,.045,.018,.14,t.metal,Math.sin(a)*.055,.01,Math.cos(a)*.055);b.rotation.y=a;}}
  g.userData.bodyRadius=.64;return g;
 }
 function dispose(g){const geos=new Set(),mats=new Set();g.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});for(const geo of geos)geo.dispose();for(const m of mats)m.dispose();}
 return {arena,top,dispose,environment:env,disposeEnvironment(){env.dispose();}};
}
