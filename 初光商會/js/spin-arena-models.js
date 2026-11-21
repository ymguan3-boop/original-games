import{SPIN_TOPS,plazaArenaTheme}from'./spin-arena-config.js?v=20261115-v63';
import {storybookEnabled} from './storybook-mode.js';
import {dressStoryArena,dressStoryTop} from './storybook-arena.js';
export function createSpinModels(T){
 const metals=new Set([...SPIN_TOPS.map(t=>t.metal),0xbd944b,0xd1a54b,0xe9ba56]);
 const faces=[];for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,64);g.addColorStop(0,'#f2f5ff');g.addColorStop(.35,'#c9d9ee');g.addColorStop(.48,'#fff2d5');g.addColorStop(.55,'#64758a');g.addColorStop(1,'#252d40');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);ctx.fillStyle=i%2?'#e9f3ff':'#fff5db';ctx.fillRect(8,4,9,36);ctx.fillRect(39,12,5,27);faces.push(c);}const env=new T.CubeTexture(faces);env.encoding=T.sRGBEncoding;env.needsUpdate=true;
 let resolveAtlas,rejectAtlas;const ready=new Promise((resolve,reject)=>{resolveAtlas=resolve;rejectAtlas=reject;});const atlas=new T.TextureLoader().load(new URL('../assets/spin-arena/materials-v2/surface-atlas-v3.webp',import.meta.url).href,resolveAtlas,undefined,rejectAtlas);atlas.encoding=T.sRGBEncoding;atlas.anisotropy=2;
 const topMaterials=new Map();
 const materials=new Map(),mat=c=>{if(!materials.has(c)){const metal=metals.has(c),m=new T.MeshPhysicalMaterial({color:c,roughness:metal?.22:.28,metalness:metal?.85:0,clearcoat:metal?.3:.8,clearcoatRoughness:.16,envMap:env,envMapIntensity:metal?.85:.22});m.color.convertSRGBToLinear();materials.set(c,m);}return materials.get(c);};
 function mesh(g,geo,c,x=0,y=0,z=0,edge=false){const m=new T.Mesh(geo,mat(c));m.position.set(x,y,z);g.add(m);m.receiveShadow=true;if(edge){const line=new T.LineSegments(new T.EdgesGeometry(geo,32),new T.LineBasicMaterial({color:0x211a18}));m.add(line);}return m;}
 const cylinder=(g,r,h,c,x=0,y=0,z=0,n=48,edge=false)=>mesh(g,new T.CylinderGeometry(r,r,h,n),c,x,y,z,edge);
 const box=(g,w,h,d,c,x,y,z)=>mesh(g,new T.BoxGeometry(w,h,d),c,x,y,z,true);
 const ring=(g,r,t,c,y)=>{const m=mesh(g,new T.TorusGeometry(r,t,6,80),c,0,y,0);m.rotation.x=Math.PI/2;return m;};
 function arena({radius=2.6,mini=false,level=3}={}){
  const g=new T.Group();const theme=plazaArenaTheme(level);g.name=theme.name;g.userData.arenaLevel=theme.level;g.userData.spectators=theme.spectators;const ratio=radius/2.6;
  // Lathed shallow bowl and closed pedestal are genuine geometry, not a flat image.
  const base=cylinder(g,2.65,.25,0x4b4f52,0,.14,0,64,true);cylinder(g,2.72,.10,0xbd944b,0,.265,0,64,true);
  const profile=[new T.Vector2(0,.34),new T.Vector2(.7,.35),new T.Vector2(1.5,.40),new T.Vector2(2.1,.52),new T.Vector2(2.45,.72),new T.Vector2(2.58,.76)].reverse();const floor=mesh(g,new T.LatheGeometry(profile,96),0x62666b);for(const part of[base,floor]){part.material=part.material.clone();part.material.map=atlas;part.material.color.setHex(part===floor?0xffffff:0xebedef).convertSRGBToLinear();part.material.metalness=.15;part.material.roughness=part===floor?.46:.58;part.material.clearcoat=.16;part.material.userData.surfaceRole='light-grey';const uv=part.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.004+uv.getX(i)*.492,.004+uv.getY(i)*.492);uv.needsUpdate=true;}
  for(const r of[.65,1.45,2.3])ring(g,r,.013,0x929ba4,.365+(r/2.6)**3*.34);
  ring(g,2.64,.07,0xd1a54b,.87);
  for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*2.65,z=Math.sin(a)*2.65,post=box(g,.24,.62,.25,0xb8bdc2,x,.57,z);post.rotation.y=-a;box(g,.30,.08,.31,0xe9ba56,x,.91,z);const cap=mesh(g,new T.SphereGeometry(.075,8,6),0xffdf80,x,1.02,z);cap.userData.noOutline=true;if(i%3===0){const flag=box(g,.55,.52,.035,0xa5abb1,x*1.01,.5,z*1.01);flag.rotation.y=-a+Math.PI/2;}}
  // Explicit exit pockets rather than pretending the ring is an impenetrable wall.
  for(const sign of[-1,1]){box(g,.64,.12,.32,0xd5b46a,sign*2.9,.25,0);}
  // Large silhouette changes at each tier, all outside the playable bowl.
  const relief=(shape,color,x,y,z,scale=1)=>{const m=mesh(g,new T.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1,curveSegments:8}),color,x,y,z,true);m.scale.setScalar(scale);return m;};
  if(theme.level===3){for(const sign of[-1,1])box(g,.35,.16,.35,0x70767d,sign*1.9,.12,1.8);}
  if(theme.level>=4){
   cylinder(g,2.79,.14,0x959ca2,0,.055,0,12,true);ring(g,2.73,.045,0xe9ba56,.20);ring(g,2.68,.045,0xe9ba56,.74);
   for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*2.61,z=Math.sin(a)*2.61;const buttress=box(g,.48,.67,.27,0xe9ba56,x,.48,z);buttress.rotation.y=-a;const gem=mesh(g,new T.OctahedronGeometry(.14,0),0x3cabc9,x,.72,z);gem.scale.set(1,1.4,.65);}
   const crest=new T.Shape();crest.moveTo(-.56,0);crest.quadraticCurveTo(-.9,.6,-.48,1.05);crest.quadraticCurveTo(0,1.5,.48,1.05);crest.quadraticCurveTo(.9,.6,.56,0);crest.closePath();
   relief(crest,0xe9ba56,0,.82,-2.55);relief(crest,0x234e61,0,.92,-2.43,.74);
   const jewel=mesh(g,new T.OctahedronGeometry(.28,0),0x3cabc9,0,1.55,-2.27);jewel.scale.set(.85,1.4,.55);
   for(const sign of[-1,1]){const curl=mesh(g,new T.TorusGeometry(.34,.055,6,28,Math.PI*1.6),0xe9ba56,sign*.84,1.24,-2.3);curl.rotation.z=sign*.4;const pillar=box(g,.25,.85,.25,0xb8bdc2,sign*1.45,.78,-2.08);box(g,.39,.12,.39,0xe9ba56,sign*1.45,1.21,-2.08);mesh(g,new T.OctahedronGeometry(.18,0),0x3cabc9,sign*1.45,1.43,-2.08);}
  }
  if(theme.level>=5){
   cylinder(g,2.83,.10,0xe9ba56,0,.015,0,12,true);ring(g,2.65,.027,0xdfe4e5,.98);
   const crown=new T.Shape();crown.moveTo(-1.2,0);crown.lineTo(-1.42,1.08);crown.lineTo(-.78,.78);crown.lineTo(-.62,1.55);crown.lineTo(0,1.03);crown.lineTo(.62,1.55);crown.lineTo(.78,.78);crown.lineTo(1.42,1.08);crown.lineTo(1.2,0);crown.closePath();
   relief(crown,0xe9ba56,0,1.16,-2.40);relief(crown,0x812a38,0,1.25,-2.27,.79);box(g,2.55,.24,.25,0xe9ba56,0,1.15,-2.32);
   for(const x of[-1.42,-.62,.62,1.42])mesh(g,new T.SphereGeometry(.10,10,8),0xffe6ac,x,1.16+(Math.abs(x)<1?1.55:1.08),-2.32);
   for(const sign of[-1,1]){for(let i=0;i<5;i++){const feather=new T.Shape();feather.moveTo(0,0);feather.quadraticCurveTo(.25,.25,.24,.85);feather.quadraticCurveTo(-.12,.63,-.11,0);feather.closePath();const f=relief(feather,0xe9ba56,sign*(1.18+i*.19),1.05+i*.06,-2.0+i*.20);f.rotation.z=-sign*(.25+i*.15);}
    const foot=mesh(g,new T.SphereGeometry(.33,12,8),0xe9ba56,sign*1.8,.23,1.91);foot.scale.set(1,.7,1.2);for(let i=0;i<3;i++){const toe=mesh(g,new T.SphereGeometry(.10,8,6),0xe9ba56,sign*1.8+(i-1)*.18,.14,2.19);toe.scale.set(.8,.8,1.5);}
   }
  }
  if(storybookEnabled) dressStoryArena(T,g,theme.level);
  g.scale.setScalar(ratio);g.userData.collision={kind:'circle',radius:2.25*ratio};return g;
 }
 function top(id='flame'){
  const t=SPIN_TOPS.find(t=>t.id===id)||SPIN_TOPS[0],g=new T.Group();g.name=t.name;
  mesh(g,new T.ConeGeometry(.12,.25,16),t.metal,0,.10,0,true).rotation.z=Math.PI;
  cylinder(g,.34,.16,0x292731,0,.26,0,36,true);for(let i=0;i<24;i++){const a=i*Math.PI/12,b=box(g,.026,.08,.04,0x171923,Math.cos(a)*.337,.26,Math.sin(a)*.337);b.rotation.y=-a;}ring(g,.335,.017,t.metal,.33);cylinder(g,.46,.12,t.metal,0,.38,0,48,true);ring(g,.39,.045,t.color,.46);
  for(let i=0;i<t.blades;i++){const a=i*Math.PI*2/t.blades,group=new T.Group();group.rotation.y=a;g.add(group);const s=new T.Shape();s.moveTo(.14,-.10);s.quadraticCurveTo(.35,-.24,.61,-.11);s.quadraticCurveTo(.45,-.10,.47,.21);s.quadraticCurveTo(.35,.19,.31,.09);s.lineTo(.14,.06);s.closePath();if(['frost','terra','nebula'].includes(id)){s.curves=[];s.moveTo(.14,-.09);for(const [x,y] of (id==='frost'?[[.39,-.19],[.62,-.03],[.43,.2],[.29,.07]]:id==='terra'?[[.42,-.18],[.58,-.12],[.58,.12],[.32,.18]]:[[.32,-.18],[.62,-.04],[.46,.07],[.38,.24],[.27,.06]]))s.lineTo(x,y);s.closePath();}const blade=mesh(group,new T.ExtrudeGeometry(s,{depth:.065,bevelEnabled:true,bevelThickness:.018,bevelSize:.014,bevelSegments:2,curveSegments:10}),t.metal,0,.46,0,true);blade.rotation.x=-Math.PI/2;const inset=mesh(group,new T.ExtrudeGeometry(s,{depth:.012,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:1,curveSegments:8}),t.color,0,.55,0,true);const ip=inset.geometry.attributes.position;for(let j=0;j<ip.count;j++){const radial=Math.hypot(ip.getX(j),ip.getY(j));ip.setZ(j,ip.getZ(j)+Math.sin(Math.min(1,Math.max(0,(radial-.15)/.47))*Math.PI)*.035);}inset.geometry.computeVertexNormals();inset.rotation.x=-Math.PI/2;inset.scale.set(.88,.88,1);
   const screw=cylinder(group,.021,.018,0xc7ced4,.29,.606,0,12,true);box(group,.025,.004,.004,0x35363a,.29,.618,0);if(id==='flame'){const flame=new T.Shape();flame.moveTo(.22,-.01);flame.quadraticCurveTo(.39,-.08,.49,-.06);flame.quadraticCurveTo(.36,-.03,.39,.06);flame.quadraticCurveTo(.30,.02,.22,.025);flame.closePath();const inlay=mesh(group,new T.ExtrudeGeometry(flame,{depth:.004,bevelEnabled:false,curveSegments:8}),t.metal,0,.601,0);inlay.rotation.x=-Math.PI/2;}
  }
  cylinder(g,.22,.09,t.metal,0,.51,0,32,true);cylinder(g,.18,.025,t.color,0,.57,0,32,true);
  const emblem=new T.Group();g.add(emblem);emblem.position.y=.605;
  if(id==='flame'){for(let i=0;i<10;i++){const a=i*Math.PI/5,tuft=mesh(emblem,new T.ConeGeometry(.034,.075,5),t.metal,Math.sin(a)*.113,.014,Math.cos(a)*.113);tuft.rotation.set(Math.cos(a)*Math.PI/2,0,-Math.sin(a)*Math.PI/2);}const head=mesh(emblem,new T.SphereGeometry(.10,18,12),t.metal,0,.022,0);head.scale.set(1,.43,1.08);for(const x of[-1,1]){const ear=mesh(emblem,new T.ConeGeometry(.029,.06,6),t.metal,x*.073,.035,-.063);ear.rotation.x=-.6;const brow=box(emblem,.055,.014,.016,t.metal,x*.042,.064,-.04);brow.rotation.y=x*.2;mesh(emblem,new T.SphereGeometry(.009,10,8),0x231813,x*.035,.069,-.019);const muzzle=mesh(emblem,new T.SphereGeometry(.034,12,8),t.metal,x*.023,.060,.044);muzzle.scale.y=.45;}mesh(emblem,new T.SphereGeometry(.015,10,8),0x2f2019,0,.08,.027).scale.set(1,.4,.7);const chin=mesh(emblem,new T.ConeGeometry(.035,.065,6),t.metal,0,.025,.095);chin.rotation.x=Math.PI/2;}
  else {const points=({wind:3,crystal:6,thunder:4,shield:8,frost:6,tide:7,thorn:5,terra:4,sun:9,nebula:6})[id]||5;for(let i=0;i<points;i++){const a=i*Math.PI*2/points,b=box(emblem,.045,.018,.14,t.metal,Math.sin(a)*.055,.01,Math.cos(a)*.055);b.rotation.y=a;}}
  g.traverse(o=>{if(!o.isMesh)return;const original=o.material,c=original.color.clone().convertLinearToSRGB().getHex(),role=c===t.color?(id==='flame'?'red':null):metals.has(c)?(id==='wind'?'silver':'gold'):c===0xc7ced4?'silver':null;if(!role&&![0x292731,0x171923].includes(c))return;const key=id+':'+(role||'rubber');if(!topMaterials.has(key)){const m=original.clone();m.map=atlas;m.color.set(0xffffff);if(role==='red'&&id!=='flame')m.color.setHex(t.color);m.roughness=role==='gold'?.25:role==='silver'?.32:role==='red'?.24:.87;m.metalness=role==='gold'||role==='silver'?.88:role==='red'?.25:0;m.clearcoat=role==='red'?.9:.15;m.userData.surfaceRole=role||'rubber';topMaterials.set(key,m);}o.material=topMaterials.get(key);const uv=o.geometry.attributes.uv;if(uv){let minU=Infinity,minV=Infinity,maxU=-Infinity,maxV=-Infinity;for(let i=0;i<uv.count;i++){minU=Math.min(minU,uv.getX(i));minV=Math.min(minV,uv.getY(i));maxU=Math.max(maxU,uv.getX(i));maxV=Math.max(maxV,uv.getY(i));}const right=role==='gold'||!role,upper=role==='red'||role==='gold';for(let i=0;i<uv.count;i++)uv.setXY(i,(right?.5:0)+.004+(uv.getX(i)-minU)/(maxU-minU||1)*.492,(upper?.5:0)+.004+(uv.getY(i)-minV)/(maxV-minV||1)*.492);uv.needsUpdate=true;}});if(storybookEnabled) dressStoryTop(T,g,t);g.userData.bodyRadius=.64;return g;
 }
 function dispose(g){const geos=new Set(),mats=new Set();g.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});for(const geo of geos)geo.dispose();for(const m of mats)m.dispose();}
 return {arena,top,dispose,ready,environment:env,disposeEnvironment(){env.dispose();atlas.dispose();}};
}
