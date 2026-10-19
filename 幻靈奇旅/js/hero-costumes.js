/* Shared kid-hero garments. All measurements are in the chest's rest frame,
 * before the game scales, leans or moves the character. No animation tracks or
 * weapon sockets are changed. The authoring exporter uses this same repair. */
(function (global) {
 'use strict';
 const VERSION='kid-chest-fit-v1';
 const SWAP={shirt:'ultraSilver',shirtLight:'ultraRed',shorts:'ultraRed',skin:'ultraSilver',shoe:'ultraSilver',sole:'ultraRed'};
 function create(T){
  const states=new WeakMap();
  const ownGeometry=(state,geometry)=>(state.ownedGeometries.add(geometry),geometry);
  const ownMaterial=(state,material)=>(state.ownedMaterials.add(material),material);
  function disposeNative(controller){
   if(!controller)return;
   // The bundled Three.js predates Object3D.removeFromParent, which the native
   // butterfly's disposer uses. Adapt its owned root, never the shared engine.
   const node=controller.root;
   if(node&&typeof node.removeFromParent!=='function')node.removeFromParent=function(){if(this.parent)this.parent.remove(this);return this;};
   // These roots are created privately by ensureSound, with no GLTF resources.
   // The butterfly factory omits its two antenna geometries from its disposer.
   // Observe disposal so the fallback releases omissions without a second call
   // for the geometries/materials which the controller already owns correctly.
   const pending=new Set(),listeners=new Map();
   node?.traverse(n=>{if(!n.isMesh)return;if(n.geometry)pending.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])if(m)pending.add(m);});
   for(const resource of pending){const onDispose=()=>pending.delete(resource);listeners.set(resource,onDispose);resource.addEventListener('dispose',onDispose);}
   try{controller.dispose();}finally{
    for(const [resource,onDispose] of listeners)resource.removeEventListener('dispose',onDispose);
    for(const resource of pending)resource.dispose();
   }
  }
  function clip(geometry,normal,d){
   const src=geometry.index?geometry.toNonIndexed():geometry,p=src.attributes.position,n=src.attributes.normal,out=[],normals=[];
   const push=v=>{out.push(...v.p);normals.push(...v.n);};
   for(let i=0;i<p.count;i+=3){
    const poly=[];
    for(let k=0;k<3;k++){
     const j=i+k;poly.push({p:[p.getX(j),p.getY(j),p.getZ(j)],n:[n.getX(j),n.getY(j),n.getZ(j)]});
    }
    const result=[];
    for(let k=0;k<3;k++){
     const a=poly[k],b=poly[(k+1)%3],fa=normal.reduce((s,v,j)=>s+v*a.p[j],-d),fb=normal.reduce((s,v,j)=>s+v*b.p[j],-d);
     if(fa>=0)result.push(a);
     if((fa>=0)!==(fb>=0)){const t=fa/(fa-fb);result.push({p:a.p.map((v,j)=>v+(b.p[j]-v)*t),n:a.n.map((v,j)=>v+(b.n[j]-v)*t)});}
    }
    for(let k=1;k<result.length-1;k++){push(result[0]);push(result[k]);push(result[k+1]);}
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.normalizeNormals();if(src!==geometry)src.dispose();return g;
  }
  function inFrame(mesh,frame){return mesh.geometry.clone().applyMatrix4(new T.Matrix4().copy(frame.matrixWorld).invert().multiply(mesh.matrixWorld));}
  function materialName(m){return m?.userData?.key||m?.name;}
  function prepare(root){
   if(states.has(root))return states.get(root);
   const chest=root.getObjectByName('chest');if(!chest)return null;
   root.updateMatrixWorld(true);
   const meshes=[];root.traverse(n=>{if(n.isMesh)meshes.push(n);});
   const torso=meshes.find(n=>n.userData.part?.m==='shirt'&&n.userData.part?.stage===2&&n.userData.part?.t==='lathe'&&!n.userData.part?.uo);
   if(!torso)return null;
   const profile=root.userData.heroCostumeFit?.profile||(()=>{
    const geometry=inFrame(torso,chest),p=geometry.attributes.position,rows=new Map();
    for(let i=0;i<p.count;i++){const y=+p.getY(i).toFixed(5),r=Math.hypot(p.getX(i),p.getZ(i)/.68);rows.set(y,Math.max(rows.get(y)||0,r));}
    geometry.dispose();
    return [...rows].sort((a,b)=>a[0]-b[0]).map(([y,r])=>[r,y]);
   })();
   const radius=y=>{for(let i=1;i<profile.length;i++)if(y<=profile[i][1]){const [r0,y0]=profile[i-1],[r1,y1]=profile[i];return r0+(r1-r0)*Math.max(0,Math.min(1,(y-y0)/(y1-y0)));}return profile[profile.length-1][0];};
   const topAt=x=>{for(let i=profile.length-1;i>0;i--){const [r,y]=profile[i],[r0,y0]=profile[i-1];if(r0>=Math.abs(x)&&r<=Math.abs(x))return y0+(y-y0)*(r0-Math.abs(x))/(r0-r);}return profile[profile.length-1][1];};
   const surface=(x,y,sign=1,gap=.009)=>sign*(.68*Math.sqrt(Math.max(0,radius(y)**2-x*x))+gap);
   const state={root,chest,profile,radius,topAt,surface,materials:{},cache:{},bases:new WeakMap(),heads:new WeakSet(),sound:null,ownedGeometries:new Set(),ownedMaterials:new Set(),restore:[]};
   states.set(root,state);
   if(root.userData.heroCostumeFit?.version!==VERSION){
    // A colour boundary must share one surface. The previous light-blue shell
    // covered the entire dark-blue shell at a 0.004 radial separation.
    const light=meshes.find(n=>n.userData.part?.m==='shirtLight'&&n.userData.part?.stage===2),base=inFrame(torso,chest);
    if(light){
     const normal=[.2666,.54,0],d=.2666*(-.27)+.54*(1.2133-.82),length=Math.hypot(normal[0],normal[1]);
     normal[0]/=length;normal[1]/=length;
     const toLocal=n=>new T.Matrix4().copy(n.matrixWorld).invert().multiply(chest.matrixWorld);
     const originalTorso=torso.geometry,originalLight=light.geometry;
     state.restore.push(()=>{torso.geometry=originalTorso;light.geometry=originalLight;});
     torso.geometry=ownGeometry(state,clip(base,normal.map(v=>-v),-d/length).applyMatrix4(toLocal(torso)));
     light.geometry=ownGeometry(state,clip(base,normal,d/length).applyMatrix4(toLocal(light)));
    }
    base.dispose();
    const vest=root.getObjectByName('outfitVest');
    if(vest){
     const kept=[];vest.traverse(n=>{if(!n.isMesh)return;const key=n.userData.part?.m;if(!['vestPocket','leather','leatherDark','gold'].includes(key))return;
      let geo=inFrame(n,chest);
      // The old leatherDark merge contains six detached box straps AND the
      // backpack lid. Keep the lid behind the torso, replace only the straps.
      if(key==='leatherDark'){const source=geo;geo=clip(source,[0,0,-1],.196);source.dispose();}
      if(!geo.attributes.position.count){geo.dispose();return;}
      ownGeometry(state,geo);
      const m=new T.Mesh(geo,n.material);m.userData.part={...n.userData.part};m.castShadow=true;kept.push(m);
     });
     // Preserve this named garment node and its ancestors for action bindings.
     const frame=new T.Group();frame.name='FittedAdventureGarment';
     const vestToChest=new T.Matrix4().copy(chest.matrixWorld).invert().multiply(vest.matrixWorld);
     frame.matrixAutoUpdate=false;frame.matrix.copy(vestToChest).invert();
     const originalChildren=[...vest.children];state.restore.push(()=>{vest.clear();originalChildren.forEach(n=>vest.add(n));});
     vest.clear();vest.add(frame);kept.forEach(n=>frame.add(n));
     const vestMaterial=meshes.find(n=>n.userData.part?.m==='vest')?.material||ownMaterial(state,new T.MeshStandardMaterial({color:0xf2c230,roughness:.95}));
     const points=profile.filter(([,y])=>y>.025).map(([r,y])=>new T.Vector2(r+.012,y));
     const geo=ownGeometry(state,new T.LatheGeometry(points,56,.42,Math.PI*2-.84));geo.scale(1,1,.68);
     const fabric=new T.Mesh(geo,vestMaterial);fabric.name='貼合軀幹的完整背心';fabric.userData.part={m:'vest',stage:6,t:'lathe'};fabric.castShadow=true;frame.add(fabric);
     const strapMaterial=meshes.find(n=>n.userData.part?.m==='leatherDark'&&n.userData.part?.stage===6)?.material||ownMaterial(state,new T.MeshStandardMaterial({color:0x654d36,roughness:.9}));
     for(const sign of [-1,1])frame.add(harness(state,sign,strapMaterial,.013,'冒險服貼身肩帶'));
    }
    const previousFit=root.userData.heroCostumeFit;
    state.restore.push(()=>{if(previousFit===undefined)delete root.userData.heroCostumeFit;else root.userData.heroCostumeFit=previousFit;});
    root.userData.heroCostumeFit={version:VERSION,profile};
   }
   root.traverse(n=>{
    if(!n.isMesh||!n.material)return;
    const list=Array.isArray(n.material)?n.material:[n.material];
    for(const m of list){const key=materialName(m);if(key)state.materials[key]??=m;if(key==='outline'){m.side=T.BackSide;n.castShadow=false;n.receiveShadow=false;}}
    state.bases.set(n,n.material);
    let p=n.parent;for(;p;p=p.parent)if(p.name==='head'){state.heads.add(n);break;}
   });
   return state;
  }
  function harness(state,sign,material,gap,name){
   const {surface,topAt}=state,x=.15,top=topAt(x),points=[];
   // Trace the real shoulder cross-section. Body length and shoulder height
   // come from the current GLB, rather than the retired 2.55-world-unit paths.
   for(let i=0;i<=24;i++){
    const a=i/24*Math.PI,y=.15+(top-.15)*Math.sin(a),z=surface(x,y,Math.cos(a)>=0?1:-1,0),r=state.radius(y),slope=(state.radius(y+.0001)-state.radius(y-.0001))/.0002;
    const normal=new T.Vector3(sign*x/r,-slope,z/(.4624*r)).normalize();
    points.push(new T.Vector3(sign*x,y,z).addScaledVector(normal,gap));
   }
   const r=state.radius(.15);
   for(let i=1;i<=16;i++){const theta=Math.acos(x/r),phi=-theta+2*theta*i/16;
    // Continue around the outer flank below the armpit, closing the harness.
    points.push(new T.Vector3(sign*(r+gap)*Math.cos(phi),.15,(r*.68+gap)*Math.sin(phi)));
   }
   // Connect the shoulder loop using a smooth underarm return. Sideways is
   // tangent to the torso, so a flat narrow ribbon stays on the surface.
   const curve=new T.CatmullRomCurve3(points,true,'centripetal'),pos=[],idx=[],segments=128;
   for(let i=0;i<=segments;i++){
    const t=i/segments,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),r=state.radius(p.y),slope=(state.radius(p.y+.0001)-state.radius(p.y-.0001))/.0002,normal=new T.Vector3(p.x/r,-slope,p.z/(.4624*r)).normalize(),side=new T.Vector3().crossVectors(tangent,normal).normalize().multiplyScalar(.017);
    for(const s of [-1,1]){
     const v=p.clone().addScaledVector(side,s);
     // Project both ribbon edges out of the shirt/vest as well. A centreline
     // alone can fit while its flat edges still cut through the shoulder.
     if(v.y>=state.profile[0][1]&&v.y<=state.profile[state.profile.length-1][1]){
      const radial=Math.hypot(v.x,v.z/.68),minimum=state.radius(v.y)+(gap>=.013?.018:.009);
      if(radial<minimum&&radial>1e-8){v.x*=minimum/radial;v.z*=minimum/radial;}
     }
     pos.push(v.x,v.y,v.z);
    }
    if(i<segments){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}
   }
   const geo=ownGeometry(state,new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
   const mat=ownMaterial(state,material.clone());mat.side=T.DoubleSide;
   const mesh=new T.Mesh(geo,mat);mesh.name=name+(sign<0?'右':'左');mesh.userData.part={m:materialName(material)||'strap',stage:6};mesh.castShadow=false;return mesh;
  }
  function ensureSound(root){
   const state=prepare(root);if(!state||state.sound)return state?.sound;
   if(!global.XiaoshanSpirit?.create)return null;
   const group=new T.Group();group.name='FittedXiaoshanCostume';group.userData.costume='sound';state.chest.add(group);
   const controller=global.XiaoshanSpirit.create({inPlace:true}),bag=new T.Group(),model=controller.root;
   model.scale.setScalar(.19);model.rotation.y=Math.PI;bag.add(model);bag.name='小山造型後背包';group.add(bag);
   bag.updateMatrixWorld(true);
   // Invert the chest's placement/scale before measuring; the miniature faces
   // outwards and its innermost surface touches the upper back.
   const nativeBox=new T.Box3();model.updateMatrix();model.traverse(n=>{if(!n.isMesh)return;const matrix=new T.Matrix4().copy(bag.matrixWorld).invert().multiply(n.matrixWorld),p=n.geometry.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++)nativeBox.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(matrix));});
   bag.position.set(-(nativeBox.min.x+nativeBox.max.x)/2,.08-nativeBox.min.y,-state.radius(.28)*.68+.004-nativeBox.max.z);
   const material=ownMaterial(state,new T.MeshStandardMaterial({color:0x9175aa,roughness:.85,metalness:0}));
   const straps=[];for(const sign of [-1,1]){const mesh=harness(state,sign,material,.009,'小山貼身肩帶');group.add(mesh);straps.push({mesh,geometry:mesh.geometry});}
   const butterfly=global.XiaoshanSpirit.createButterfly?.();
   if(butterfly){butterfly.root.name='小山套裝環繞蝴蝶';butterfly.root.userData.costume='sound';butterfly.root.scale.multiplyScalar(.8);root.add(butterfly.root);butterfly.root.visible=false;}
   state.sound={root:group,bag,controller,straps,strapMaterial:material,butterfly,time:0};group.visible=false;return state.sound;
  }
  function apply(root,id){
   const state=prepare(root);if(!state)return;
   if(id==='sound')ensureSound(root);
   root.traverse(n=>{
    if(n.userData.costume)n.visible=n.userData.costume===id;
    const base=state.bases.get(n);if(!n.isMesh||!base)return;
    const part=n.userData.part||{},target=id==='electric'&&!(part.m==='skin'&&state.heads.has(n))?SWAP[part.m]:null;
    const convert=base=>{if(!target||!state.materials[target])return base;const key=target+'|'+base.side;return state.cache[key]??=ownMaterial(state,Object.assign(state.materials[target].clone(),{side:base.side}));};
    n.material=Array.isArray(base)?base.map(convert):convert(base);
    if(part.uo)n.visible=id!=='electric';
   });
  }
  function update(root,dt){
   const sound=states.get(root)?.sound;if(!sound?.root.visible)return;
   sound.time+=dt;sound.controller.update(Math.min(dt,.05));
   if(sound.butterfly){
    const t=sound.time,visual=sound.butterfly.root,angle=t*.72,orbit=.93+.1*Math.sin(t*.75);
    sound.butterfly.update(dt);visual.position.set(orbit*Math.sin(angle),1.55+.41*Math.sin(t*1.65)+.13*Math.sin(t*2.65+.4),orbit*Math.cos(angle));
    visual.rotation.order='YXZ';visual.rotation.set(.31+.05*Math.sin(t*1.2),angle+Math.PI/2+.12*Math.sin(t*.55),.03*Math.sin(t*1.5));
   }
  }
  function dispose(root){
   const state=states.get(root);if(!state)return;states.delete(root);
   // GLTF resources can be shared with the asset cache or another scene. Only
   // release objects allocated here; native controllers own their own resources.
   disposeNative(state.sound?.controller);disposeNative(state.sound?.butterfly);
   if(state.sound?.root.parent)state.sound.root.parent.remove(state.sound.root);
   root.traverse(n=>{const base=state.bases.get(n);if(base)n.material=base;});
   for(let i=state.restore.length-1;i>=0;i--)state.restore[i]();
   for(const geometry of state.ownedGeometries)geometry.dispose();
   for(const material of state.ownedMaterials)material.dispose();
   state.ownedGeometries.clear();state.ownedMaterials.clear();state.restore.length=0;state.cache={};state.materials={};state.sound=null;
  }
  return {prepare,apply,ensureSound,update,dispose,version:VERSION};
 }
 global.HeroCostumes={create,version:VERSION};
})(globalThis);
