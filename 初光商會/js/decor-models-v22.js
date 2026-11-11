/* Original procedural countryside props. +Y up, +Z front, bottom origin.
 * Each call owns its geometries/materials; no shared disposable resources. */
const TYPES=['clock','painting','couplet','fern','lavender','citrus'];
export const hasDecorModel=type=>TYPES.includes(type);
export function decorModelAsset(T,type){
 if(!hasDecorModel(type))throw new Error('Unknown countryside decoration: '+type);
 const root=new T.Group();root.name='decor-v22-'+type;
 const colors={wood:0x78513c,dark:0x493b31,cream:0xf6e6bc,gold:0xdab267,green:0x607d47,light:0x94ad62,terra:0xb97550,purple:0x9474b6,red:0xb74437,orange:0xe9a840,sky:0x9fc8c5};
 const mats=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new T.MeshStandardMaterial({color,roughness:.9,metalness:0})]));
 for(const material of Object.values(mats))material.color.convertSRGBToLinear();
 function mesh(geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,mats[material]);m.position.set(x,y,z);root.add(m);return m;}
 const box=(w,h,d,c,x,y,z)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z);
 const sphere=(r,c,x,y,z,sx=1,sy=1,sz=1)=>{const m=mesh(new T.SphereGeometry(r,6,4),c,x,y,z);m.scale.set(sx,sy,sz);return m;};
 const cyl=(rt,rb,h,c,x,y,z,n=12)=>mesh(new T.CylinderGeometry(rt,rb,h,n),c,x,y,z);
 function rod(a,b,r,c){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p),m=cyl(r,r,v.length(),c,...p.clone().add(q).multiplyScalar(.5).toArray(),6);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
 function face(points,c,z){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return mesh(new T.ShapeGeometry(shape),c,0,0,z);}
 function leaf(a,b,width,c='green'){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p),m=sphere(1,c,...p.clone().add(q).multiplyScalar(.5).toArray(),width,v.length()/2,.022);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());}
 function pot(c='terra'){cyl(.19,.14,.25,c,0,.155,0);cyl(.205,.205,.055,c,0,.292,0);cyl(.177,.177,.015,'dark',0,.322,0);cyl(.145,.16,.03,c,0,.015,0);}
 if(type==='clock'){
  const disk=(r,d,c,z)=>{const m=cyl(r,r,d,c,0,.35,z,32);m.rotation.x=Math.PI/2;};
  disk(.35,.075,'wood',0);disk(.31,.01,'gold',.044);disk(.286,.012,'cream',.055);
  for(let i=0;i<12;i++){const a=i*Math.PI/6,m=box(.014,i%3===0?.058:.033,.009,'dark',Math.sin(a)*.246,.35+Math.cos(a)*.246,.067);m.rotation.z=-a;}
  rod([0,.35,.08],[.115,.435,.08],.012,'dark');rod([0,.35,.082],[-.045,.525,.082],.009,'dark');sphere(.025,'gold',0,.35,.087,1,1,.4);
  for(const x of [-.21,.21])box(.014,.045,.006,'gold',x,.11,.045);
 }else if(type==='painting'){
  box(.72,.58,.065,'wood',0,.29,0);box(.655,.515,.012,'gold',0,.29,.04);box(.61,.47,.01,'cream',0,.29,.05);box(.57,.43,.008,'sky',0,.29,.059);
  sphere(.047,'cream',.16,.435,.067,1,1,.08);
  face([[-.285,.075],[-.285,.25],[-.14,.35],[.04,.18],[.285,.285],[.285,.075]],'green',.069);
  face([[-.285,.075],[-.285,.17],[-.08,.235],[.13,.115],[.285,.19],[.285,.075]],'light',.073);
  box(.095,.08,.012,'cream',.075,.215,.079);face([[.014,.255],[.075,.306],[.136,.255]],'terra',.089);box(.018,.046,.005,'wood',.074,.2,.089);
  face([[-.04,.075],[.015,.075],[.075,.177],[.061,.177]],'cream',.077);
 }else if(type==='couplet'){
  for(const side of [-1,1]){const x=side*.23;box(.16,.64,.025,'wood',x,.34,0);box(.14,.61,.008,'red',x,.34,.018);for(const y of [.49,.34,.19]){const m=box(.064,.064,.008,'gold',x,y,.027);m.rotation.z=Math.PI/4;box(.037,.009,.006,'red',x,y,.033);}}
  box(.66,.12,.03,'wood',0,.64,0);box(.63,.095,.008,'red',0,.64,.021);
  // Geometric auspicious seal; no font dependency or falsely legible glyphs.
  for(const x of [-.18,0,.18]){box(.06,.009,.006,'gold',x,.66,.03);box(.012,.045,.006,'gold',x,.64,.03);box(.06,.009,.006,'gold',x,.619,.03);}
  for(const x of [-.23,.23]){rod([x,.02,0],[x,0,0],.012,'gold');}
 }else if(type==='fern'){
  pot();for(let i=0;i<9;i++){const angle=i*Math.PI*2/9,tip=[Math.cos(angle)*.32,.66+(i%3)*.09,Math.sin(angle)*.32];rod([0,.31,0],tip,.009,'green');for(let j=1;j<=4;j++){const t=j/5,a=[tip[0]*t,.31+(tip[1]-.31)*t,tip[2]*t],span=.105*(1-t*.6);for(const sign of [-1,1])leaf(a,[a[0]+Math.cos(angle+sign*1.1)*span,a[1]+.055,a[2]+Math.sin(angle+sign*1.1)*span],.026,j%2?'green':'light');}}
 }else if(type==='lavender'){
  pot('cream');for(let i=0;i<11;i++){const a=i*2.4,r=.04+(i%3)*.045,x=Math.cos(a)*r,z=Math.sin(a)*r,top=.77+(i%4)*.045;rod([x*.4,.32,z*.4],[x,top,z],.007,'green');for(let j=0;j<4;j++){const y=top-j*.044;sphere(.033,'purple',x,y,z,.8,1.25,.8);}leaf([x*.5,.43,z*.5],[x+Math.cos(a)*.11,.59,z+Math.sin(a)*.11],.024);}
  box(.17,.065,.013,'terra',0,.17,.17);box(.12,.012,.008,'cream',0,.17,.183);
 }else{
  pot();rod([0,.31,0],[.025,.97,0],.026,'wood');for(let i=0;i<8;i++){const a=i*2.4,x=Math.cos(a)*.23,z=Math.sin(a)*.23,y=.72+(i%3)*.11;rod([.012,y-.13,0],[x,y,z],.012,'wood');leaf([x*.55,y-.025,z*.55],[x*1.3,y+.14,z*1.3],.075,i%2?'green':'light');leaf([x*.7,y,z*.7],[x*.5,y+.18,z*.5],.067);if(i%2===0){rod([x,y,z],[x,y-.055,z],.005,'green');sphere(.052,'orange',x,y-.096,z);}}
 }
 // Merge by material to keep mobile draw calls low while retaining hard normals.
 const buckets=new Map();root.updateMatrixWorld(true);
 for(const child of [...root.children]){let g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrixWorld);const key=child.material;if(!buckets.has(key))buckets.set(key,{position:[],normal:[]});const b=buckets.get(key);for(const attr of ['position','normal'])b[attr].push(...g.attributes[attr].array);g.dispose();child.geometry.dispose();root.remove(child);}
 let triangles=0;for(const [material,attrs]of buckets){const g=new T.BufferGeometry();for(const name of ['position','normal'])g.setAttribute(name,new T.Float32BufferAttribute(attrs[name],3));g.computeBoundingSphere();const m=new T.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;root.add(m);triangles+=attrs.position.length/9;}
 for(const m of Object.values(mats))if(!buckets.has(m))m.dispose();
 root.userData={decorType:type,assetVersion:22,triangles,materialCount:buckets.size,origin:'bottom',front:'+Z'};
 return {scene:root,animations:[]};
}
