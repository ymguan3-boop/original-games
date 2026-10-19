/* Structural/deformation measurements only; this does not certify appearance.
 * Run from the game root: node authoring/kid-hero/check-costume-fit.cjs */
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const T={};vm.runInNewContext(read('vendor/three.min.js'),{exports:T,module:{exports:T},console});
global.THREE=T;global.window=global;global.self=global;
for(const p of ['vendor/GLTFLoader.js','models/native/xiaoshan.js','js/hero-costumes.js'])vm.runInThisContext(read(p),{filename:p});
const bytes=fs.readFileSync(path.join(root,'models/hero.glb'));
new T.GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',g=>{
 try{
  const model=g.scene,chest=model.getObjectByName('chest');model.updateMatrixWorld(true);
  const torso=()=>{const found=[];model.traverse(n=>{const p=n.userData.part;if(n.isMesh&&p?.stage===2&&p.t==='lathe'&&!p.uo&&['shirt','shirtLight'].includes(p.m))found.push(n);});return found;};
  function area(geometry){const p=geometry.attributes.position,idx=geometry.index,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let sum=0;for(let i=0;i<(idx?.count||p.count);i+=3){a.fromBufferAttribute(p,idx?idx.getX(i):i);b.fromBufferAttribute(p,idx?idx.getX(i+1):i+1);c.fromBufferAttribute(p,idx?idx.getX(i+2):i+2);sum+=b.sub(a).cross(c.sub(a)).length()/2;}return sum;}
  const surfaces=(model.userData.heroCostumeFit?torso():torso().filter(n=>n.userData.part.m==='shirt')).map(n=>n.geometry.clone()),originalArea=surfaces.reduce((sum,g)=>sum+area(g),0),clipNames=g.animations.map(c=>c.name),sockets=['propR','propL','fxR','fxL'];
  const socketIds=sockets.map(name=>model.getObjectByName(name).uuid);
  const api=HeroCostumes.create(T),state=api.prepare(model);api.apply(model,'sound');api.update(model,.016);model.updateMatrixWorld(true);
  const repairedArea=torso().reduce((sum,n)=>sum+area(n.geometry),0),areaError=Math.abs(repairedArea-originalArea)/originalArea;
  assert(areaError<1e-6,'制服分割後面積不守恆');
  let invalid=0;model.traverse(n=>{if(n.isMesh)for(const a of Object.values(n.geometry.attributes))for(const v of a.array)if(!Number.isFinite(v))invalid++;});assert.equal(invalid,0);
  const triangles=[];
  for(const surface of surfaces){const sp=surface.attributes.position,si=surface.index;for(let i=0;i<(si?.count||sp.count);i+=3)triangles.push(new T.Triangle(...[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(sp,si?si.getX(i+k):i+k))));}
  const gaps={};model.traverse(n=>{if(!n.isMesh||!n.name.includes('貼身肩帶'))return;const p=n.geometry.attributes.position;let min=Infinity,max=-Infinity,count=0,nearestMax=0;const point=new T.Vector3(),closest=new T.Vector3();for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i);let nearest=Infinity;for(const tri of triangles){tri.closestPointToPoint(point,closest);nearest=Math.min(nearest,point.distanceTo(closest));}nearestMax=Math.max(nearestMax,nearest);
   const y=p.getY(i);if(y<state.profile[0][1]||y>state.profile.at(-1)[1])continue;const distance=Math.hypot(p.getX(i),p.getZ(i)/.68)-state.radius(y);min=Math.min(min,distance);max=Math.max(max,distance);count++;
  }gaps[n.name]={min,max,nearestSurfaceMaximumDistance:nearestMax,samples:count};assert(min>.0089,'肩帶邊緣穿入軀幹');assert(nearestMax<.035,'肩帶浮離軀幹');});
  const items=[model.getObjectByName('outfitVest'),state.sound.root,state.sound.bag,...state.sound.straps.map(s=>s.mesh)];
  const relative=n=>new T.Matrix4().copy(chest.matrixWorld).invert().multiply(n.matrixWorld);
  const rest=items.map(relative);let drift=0,samples=0;
  const mixer=new T.AnimationMixer(model);
  for(const clip of g.animations){mixer.stopAllAction();const action=mixer.clipAction(clip).reset().play();for(let frame=0;frame<=24;frame++){mixer.setTime(clip.duration*frame/24);model.updateMatrixWorld(true);items.forEach((n,i)=>relative(n).elements.forEach((v,j)=>drift=Math.max(drift,Math.abs(v-rest[i].elements[j]))));samples++;}action.stop();}
  assert(drift<1e-8,'衣裝脫離胸口');assert.deepEqual(g.animations.map(c=>c.name),clipNames);assert.deepEqual(sockets.map(name=>model.getObjectByName(name).uuid),socketIds);
  mixer.stopAllAction();api.apply(model,'trainer');const originalMaterials=new Map();model.traverse(n=>{if(n.isMesh)originalMaterials.set(n,n.material);});
  for(const id of ['adventure','electric','sound','trainer'])api.apply(model,id);
  for(const [n,m] of originalMaterials)assert.equal(n.material,m,'換回制服後材質沒有還原');
  const report={technicalStatus:'PASS',visualStatus:'NOT_REVIEWED',heroGLBUnmodified:true,animationClips:clipNames,weaponSockets:sockets,uniformSurfaceAreaRelativeError:areaError,invalidAttributeValues:invalid,garmentChestFrameMaximumDrift:drift,animationSamples:samples,shoulderStrapRadialClearance:gaps,limitations:['Does not verify rendered appearance, cloth/sleeve intersections in every pose, or device performance.']};
  fs.writeFileSync(path.join(root,'qa/costume-fit-structure.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }catch(error){console.error(error);process.exitCode=1;}
},error=>{console.error(error);process.exitCode=1;});
