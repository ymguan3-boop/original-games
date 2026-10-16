(function(){
const THREE=window.THREE;

// Local r128-compatible rounded box: same rounded-cube projection as Three addon.
function RoundedBoxGeometry(w,h,d,segments,radius){
 const steps=segments*2+1, g=new THREE.BoxGeometry(1,1,1,steps,steps,steps).toNonIndexed();
 radius=Math.min(w/2,h/2,d/2,radius);const p=g.attributes.position,n=g.attributes.normal,v=new THREE.Vector3(),q=new THREE.Vector3(),half=.5/steps;
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.copy(v);q.x-=Math.sign(q.x)*half;q.y-=Math.sign(q.y)*half;q.z-=Math.sign(q.z)*half;q.normalize();p.setXYZ(i,(w/2-radius)*Math.sign(v.x)+q.x*radius,(h/2-radius)*Math.sign(v.y)+q.y*radius,(d/2-radius)*Math.sign(v.z)+q.z*radius);n.setXYZ(i,q.x,q.y,q.z);}return g;
}
// 用 Three.js 依參數藍圖建出角色（Y 軸向上，面向 +Z）；零件格式與鳥族共用
const geoCache = new Map();let geometryProfile='elephant';

// 不織布纖維紋理：細顆粒雜訊 + 短纖維線，當凹凸貼圖與粗糙度貼圖
let feltTex = null;
function feltTexture() {
  if (feltTex) return feltTex;
  const size = 256, cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 150 + Math.random() * 70;
    img.data.set([v, v, v, 255], i * 4);
  }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round';
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size, y = Math.random() * size, a = Math.random() * Math.PI * 2, l = 3 + Math.random() * 7;
    const v = Math.random() < 0.5 ? 235 : 110;
    g.strokeStyle = `rgba(${v},${v},${v},0.55)`;
    g.lineWidth = 0.8 + Math.random();
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 1) * l * 0.5, y + Math.sin(a + 1) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  feltTex = new THREE.CanvasTexture(cv);
  feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping;
  feltTex.repeat.set(4, 4);
  feltTex.anisotropy = 4;
  return feltTex;
}

function makeMaterial(spec) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.c),
    roughness: spec.rough ?? 0.5,
    metalness: spec.metal ?? 0,
    clearcoat: spec.coat ?? 0,
    clearcoatRoughness: 0.15,
  });
  if (spec.felt) {
    // 絨面：全粗糙 + 邊緣柔光（sheen）+ 纖維凹凸
    const tex = feltTexture();
    m.roughness = 1;
    m.roughnessMap = tex;
    m.bumpMap = tex;
    m.bumpScale = 0.025;
  }
  if (spec.trans) {
    m.transmission = spec.trans;
    m.thickness = 0.1;
    m.ior = 1.5;
  }
  // 次表面散射在即時渲染以微弱自發光近似
  if (spec.sss) m.emissive = new THREE.Color(spec.c).multiplyScalar(spec.sss * 0.12);
  return m;
}

// 鋸齒邊半球殼：外層 + 內層 + 邊緣，與 Blender 版同一條 cut(φ) 公式
function shellGeometry(n) {
  const { R, base, amp, th } = n;
  const teeth = n.n;
  const nu = Math.max(64, teeth * 12), nv = 22;
  const pos = [], idx = [];
  const cut = (j) => {
    const x = (j / nu) * teeth;
    return base + amp * (1 - 2 * Math.abs(x - Math.floor(x) - 0.5));
  };
  const ring = (r, i) => {
    const start = pos.length / 3;
    for (let j = 0; j < nu; j++) {
      const phi = (2 * Math.PI * j) / nu, th0 = (cut(j) * i) / nv;
      pos.push(r * Math.sin(th0) * Math.cos(phi), r * Math.cos(th0), r * Math.sin(th0) * Math.sin(phi));
    }
    return start;
  };
  const layer = (r, flip) => {
    const rows = [];
    for (let i = 0; i <= nv; i++) rows.push(ring(r, i));
    for (let i = 0; i < nv; i++)
      for (let j = 0; j < nu; j++) {
        const j2 = (j + 1) % nu;
        const a = rows[i] + j, b = rows[i] + j2, c = rows[i + 1] + j2, d = rows[i + 1] + j;
        if (flip) idx.push(a, c, b, a, d, c);
        else idx.push(a, b, c, a, c, d);
      }
  };
  layer(R, false);
  layer(R - th, true);
  const o = ring(R, nv), inn = ring(R - th, nv); // 邊緣另開頂點，法線不與殼面混合
  for (let j = 0; j < nu; j++) {
    const j2 = (j + 1) % nu;
    idx.push(o + j, inn + j, inn + j2, o + j, inn + j2, o + j2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function starGeometry(n) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 2 * n.points; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / n.points;
    const r = i % 2 ? n.ri : n.ro;
    i ? shape.lineTo(r * Math.cos(a), r * Math.sin(a)) : shape.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  const bevel = Math.min(0.012, n.depth * 0.3);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: n.depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3,
  });
  g.translate(0, 0, -n.depth / 2 + bevel);
  return g;
}

function geometryFor(n) {
  // 小零件（縫線、斑點、珍珠）用低面數球體，大零件用高面數
  const small = geometryProfile!=='bird' && n.t === 'ell' && Math.max(...n.s) < 0.07;
  const key = geometryProfile+':'+(n.t === 'ell' ? (small ? 'ellS' : 'ell') : JSON.stringify(n, (k, v) => (['p', 'r', 's', 'm'].includes(k) ? undefined : v)));
  if (geoCache.has(key)) return geoCache.get(key);
  let g;
  switch (n.t) {
    case 'ell': g = small ? new THREE.SphereGeometry(1, 14, 10) : geometryProfile==='bird'?new THREE.SphereGeometry(1,64,40):new THREE.SphereGeometry(1,48,32); break;
    case 'torus': {
      const full = n.arc >= Math.PI * 2 - 1e-6;
      g = new THREE.TorusGeometry(n.R, n.tube, 24, 96, n.arc);
      if (!full) g.rotateZ(Math.PI / 2 - n.arc / 2); // 弧形置中對稱於 +Y
      break;
    }
    case 'cyl': g = new THREE.CylinderGeometry(n.rt, n.rb, n.h, n.seg); break;
    case 'box': g = new RoundedBoxGeometry(n.size[0], n.size[1], n.size[2], 4, n.bevel); break;
    case 'shell': g = shellGeometry(n); break;
    case 'star': g = starGeometry(n); break;
    case 'lathe':
      g = new THREE.LatheGeometry(n.pts.map(([r, y]) => new THREE.Vector2(r, y)), 128, n.phiStart, n.phiLength);
      break;
  }
  geoCache.set(key, g);
  return g;
}

function buildNode(n, mats) {
  let obj;
  if (n.t === 'g') {
    obj = new THREE.Group();
    n.c.forEach((c) => obj.add(buildNode(c, mats)));
  } else {
    let mat = mats[n.m];
    if (n.t === 'lathe' || n.t === 'shell') mat =mats[n.m + '__2s'] ||= Object.assign(mat.clone(), { side: THREE.DoubleSide });
    obj = new THREE.Mesh(geometryFor(n), mat);
    obj.userData.part = { t: n.t, m: n.m }; // 匯出時依此命名
    obj.castShadow = true;
    obj.receiveShadow = true;
  }
  if (n.id) obj.name = n.id; // 骨架樞紐名稱，AnimationClip 的軌道靠它綁定
  obj.position.fromArray(n.p);
  obj.rotation.set(n.r[0], n.r[1], n.r[2], 'XYZ');
  obj.scale.fromArray(n.s || [1, 1, 1]);
  return obj;
}

function buildBird(bird) {
  const mats = {};
  for (const [k, v] of Object.entries(bird.materials)) {
    mats[k] = makeMaterial(v);
    mats[k].userData.key = k;
  }
  const root = new THREE.Group();
  root.name = bird.id;
  bird.parts.forEach((p) => root.add(buildNode(p, mats)));
  return root;
}

// 把藍圖的逐格動作轉成 AnimationClip；只收這隻鳥身上真的有的樞紐（天翼王沒有尾巴）
function buildClips(actions, root) {
  const clips = {};
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const a of actions) {
    const times = Array.from({ length: a.frames + 1 }, (_, i) => i / a.fps);
    const tracks = [];
    for (const [node, tr] of Object.entries(a.tracks)) {
      if (!root.getObjectByName(node)) continue;
      if (tr.p) tracks.push(new THREE.VectorKeyframeTrack(`${node}.position`, times, tr.p.flat()));
      if (tr.s) tracks.push(new THREE.VectorKeyframeTrack(`${node}.scale`, times, tr.s.flat()));
      if (tr.r) {
        const vals = [];
        tr.r.forEach(([x, y, z]) => { q.setFromEuler(e.set(x, y, z, 'XYZ')); vals.push(q.x, q.y, q.z, q.w); });
        tracks.push(new THREE.QuaternionKeyframeTrack(`${node}.quaternion`, times, vals));
      }
    }
    clips[a.id] = new THREE.AnimationClip(a.id, a.frames / a.fps, tracks);
  }
  return clips;
}

function countTriangles(obj) {
  let tris = 0;
  obj.traverse((o) => {
    if (o.isMesh) {
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  return Math.round(tris);
}

const registry={
 'piplup':['bird','chick'],'prinplup':['bird','blue'],'empoleon':['bird','king'],
 'totodile':['elephant','fat'],'croconaw':['elephant','fly'],'feraligatr':['elephant','king']
};
const clipNames={stand:'Idle',walk:'Walk',sit:'Sit',takeoff:'Takeoff',fly:'Fly'};
const labels={Idle:'站立',Walk:'移動',Sit:'坐下',Takeoff:'準備起飛',Fly:'飛翔／大耳拍動',Landing:'緩緩降落'};
function entry(path){return registry[String(path).replace(/^native:\/\//,'')];}

// Merge only rigid siblings sharing a material AND nearest animated pivot.
// No topology reduction or cross-joint merging; every supplied articulation survives.
function batchRigidParts(root){
 root.updateMatrixWorld(true);const groups=new Map();
 root.traverse(mesh=>{if(!mesh.isMesh)return;let pivot=mesh.parent;while(pivot!==root&&!pivot.name)pivot=pivot.parent;
  const key=pivot.uuid+':'+mesh.material.uuid;if(!groups.has(key))groups.set(key,{pivot,material:mesh.material,meshes:[]});groups.get(key).meshes.push(mesh);
 });
 for(const {pivot,material,meshes} of groups.values()){
  if(meshes.length<2)continue;const attributes={position:[],normal:[],uv:[]},indices=[];let vertexOffset=0;const inverse=new THREE.Matrix4().copy(pivot.matrixWorld).invert();
  for(const mesh of meshes){const g=mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
   for(const key of Object.keys(attributes)){const attr=g.attributes[key];if(attr)attributes[key].push(attr.array);}const count=g.index?g.index.count:g.attributes.position.count;for(let i=0;i<count;i++)indices.push(vertexOffset+(g.index?g.index.getX(i):i));vertexOffset+=g.attributes.position.count;g.dispose();mesh.parent.remove(mesh);
  }
  const merged=new THREE.BufferGeometry();for(const [key,arrays] of Object.entries(attributes)){if(!arrays.length)continue;const values=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const arr of arrays){values.set(arr,offset);offset+=arr.length;}merged.setAttribute(key,new THREE.BufferAttribute(values,key==='uv'?2:3));}
  merged.setIndex(indices);const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.nativeRigidBatch=true;pivot.add(mesh);
 }
}
function build(path){
 const spec=entry(path);if(!spec)throw Error('未知原生模型：'+path);
 const bp=spec[0]==='bird'?BIRD_BLUEPRINT:ELEPHANT_BLUEPRINT, source=(bp.BIRDS||bp.ELEPHANTS).find(v=>v.id===spec[1]);
 geometryProfile=spec[0];const scene=buildBird(source);batchRigidParts(scene);const clips=Object.values(buildClips(bp.ACTIONS,scene));
 clips.forEach(c=>{c.userData={sourceAction:c.name};c.name=clipNames[c.name]||c.name;});
 // Birds have a breathing sitting rest; expose the complete source Sit as well.
 if(!clips.some(c=>c.name==='Idle')){const idle=clips.find(c=>c.name==='Sit').clone();idle.name='Idle';clips.push(idle);}
 // The source fly pose raises its body internally; landing blends toward planted feet.
 const from=clips.find(c=>c.name==='Fly'),to=clips.find(c=>c.name==='Sit'),tracks=[],frames=36,times=Array.from({length:frames+1},(_,i)=>i/24);
 for(const name of new Set([...from.tracks,...to.tracks].map(t=>t.name))){
  const [node,property]=name.split('.'),part=scene.getObjectByName(node),size=property==='quaternion'?4:3;
  const startTrack=from.tracks.find(t=>t.name===name),endTrack=to.tracks.find(t=>t.name===name),start=startTrack?Array.from(startTrack.values.slice(0,size)):part[property].toArray(),end=endTrack?Array.from(endTrack.values.slice(0,size)):part[property].toArray(),values=[];
  for(let i=0;i<=frames;i++){const x=i/frames,k=x*x*(3-2*x);if(size===4){const q=new THREE.Quaternion().fromArray(start).slerp(new THREE.Quaternion().fromArray(end),k);values.push(...q.toArray());}else for(let j=0;j<size;j++)values.push(start[j]+(end[j]-start[j])*k);}
  tracks.push(size===4?new THREE.QuaternionKeyframeTrack(name,times,values):new THREE.VectorKeyframeTrack(name,times,values));
 }
 const landing=new THREE.AnimationClip('Landing',1.5,tracks);clips.push(landing);
 scene.userData.nativeFamily=spec[0];
 return {scene,animations:clips};
}
window.NativeFamilies={has:path=>!!entry(path),build,labels,registry,labelsFor:path=>({...labels,Idle:entry(path)?.[0]==='bird'?'坐下休息':'站立',Fly:entry(path)?.[0]==='bird'?'振翅飛翔':'用耳朵飛翔（大耳拍動）'})};
})();
