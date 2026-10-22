// 用 Three.js 依參數藍圖建出角色（Y 軸向上，面向 +Z）；零件格式與鳥族共用
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const geoCache = new Map();

// 不織布纖維紋理：細顆粒雜訊 + 短纖維線，當凹凸貼圖與粗糙度貼圖
let feltTex = null;
// 細緻度：1 = 網頁展示；匯出到遊戲時調低（手機載入量與效能）
export const DETAIL = { k: 1 };
const seg = (n, min) => Math.max(min, Math.round(n * DETAIL.k));

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
    sheen: spec.sheen ?? 0,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(spec.c),
  });
  if (spec.fabric) {
    // 棉質布料：細纖維凹凸、略帶柔光
    const tex = feltTexture();
    m.roughness = 0.95;
    m.roughnessMap = tex;
    m.bumpMap = tex;
    m.bumpScale = 0.7 * spec.fabric;
    m.sheen = 0.35;
    m.sheenRoughness = 0.8;
    m.sheenColor = new THREE.Color(spec.c).lerp(new THREE.Color('#ffffff'), 0.35);
  }
  if (spec.emit) {
    m.emissive = new THREE.Color(spec.c);
    m.emissiveIntensity = spec.emit;
  }
  if (spec.felt) {
    // 絨面：全粗糙 + 邊緣柔光（sheen）+ 纖維凹凸
    const tex = feltTexture();
    m.roughness = 1;
    m.roughnessMap = tex;
    m.bumpMap = tex;
    m.bumpScale = 1.6;
    m.sheen = spec.sheen ?? 0.8;
    m.sheenRoughness = 0.75;
    m.sheenColor = new THREE.Color(spec.c).lerp(new THREE.Color('#ffffff'), 0.45);
  }
  if (spec.sheenColor) m.sheenColor = new THREE.Color(spec.sheenColor);
  if (spec.opacity) {
    m.transparent = true;
    m.opacity = spec.opacity;
    m.depthWrite = false;
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
  const nu = seg(n.cut ? 144 : Math.max(64, teeth * 12), 48), nv = seg(26, 12);
  const pos = [], idx = [];
  const cut = (j) => {
    if (n.cut) {
      // 自訂下緣：n.cut 為等分一圈的角度表，相鄰兩點以餘弦平滑內插（髮際線）
      const k = n.cut.length, x = (j / nu) * k, i0 = Math.floor(x) % k, i1 = (i0 + 1) % k;
      const t = (1 - Math.cos((x - Math.floor(x)) * Math.PI)) / 2;
      return n.cut[i0] * (1 - t) + n.cut[i1] * t;
    }
    const x = (j / nu) * teeth;
    return base + amp * (1 - 2 * Math.abs(x - Math.floor(x) - 0.5));
  };
  const ring = (r, i) => {
    const start = pos.length / 3;
    for (let j = 0; j < nu; j++) {
      const phi = (2 * Math.PI * j) / nu, th0 = (cut(j) * i) / nv;
      // pw < 1：超橢圓（頭頂較平、較飽滿），與頭部輪廓同一公式
      const pw = n.pw || 1;
      const sn = Math.pow(Math.abs(Math.sin(th0)), pw), cs = Math.sign(Math.cos(th0)) * Math.pow(Math.abs(Math.cos(th0)), pw);
      pos.push(r * sn * Math.cos(phi), r * cs, r * sn * Math.sin(phi));
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

// 貼頭型頭髮：沿頭部輪廓（與頭同一條 profile）往外 off，從髮際線高度 cutY(ψ) 長到頭頂。
// ψ 從正前方（+Z）起算，往 +X 轉；cut 為等分一圈的高度表，餘弦內插。內外兩層＋髮緣。
function hairGeometry(n) {
  const prof = n.profile, top = prof[prof.length - 1][1];
  const rAt = (y) => {
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
      if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
    }
    return 0;
  };
  const k = n.cut.length;
  const cutY = (psi) => {
    const x = ((psi / (2 * Math.PI)) * k + k) % k, i0 = Math.floor(x), i1 = (i0 + 1) % k;
    const t = (1 - Math.cos((x - i0) * Math.PI)) / 2;
    return n.cut[i0] * (1 - t) + n.cut[i1] * t;
  };
  const nu = seg(160, 64), nv = seg(48, 20), pos = [], idx = [];
  const ring = (off, i) => {
    const start = pos.length / 3;
    for (let j = 0; j < nu; j++) {
      const psi = (2 * Math.PI * j) / nu, y0 = cutY(psi);
      const t = i / nv, y = y0 + (top - y0) * (1 - Math.pow(1 - t, 1.6)); // 頭頂附近加密
      const r = i === nv ? 0 : rAt(y) + off;
      pos.push(r * Math.sin(psi), i === nv ? y + off : y, r * Math.cos(psi));   // 頭頂中心也往外加厚（否則低面數時頭頂露出頭皮）
    }
    return start;
  };
  const layer = (off, flip) => {
    const rows = [];
    for (let i = 0; i <= nv; i++) rows.push(ring(off, i));
    for (let i = 0; i < nv; i++)
      for (let j = 0; j < nu; j++) {
        const j2 = (j + 1) % nu, a = rows[i] + j, b = rows[i] + j2, c = rows[i + 1] + j2, d = rows[i + 1] + j;
        if (flip) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
      }
  };
  layer(n.off, false);
  layer(n.off - n.th, true);
  const o = ring(n.off, 0), inn = ring(n.off - n.th, 0);
  for (let j = 0; j < nu; j++) { const j2 = (j + 1) % nu; idx.push(o + j, o + j2, inn + j2, o + j, inn + j2, inn + j); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// 以平面裁切網格：只保留 n·p ≥ d 的部分，邊界三角形精確切開、法線內插（斜切配色用）
function clipByPlane(src, { n: nv, d }) {
  src.computeVertexNormals();
  const g = src.index ? src.toNonIndexed() : src;
  const P = g.attributes.position, N = g.attributes.normal;
  const outP = [], outN = [];
  const f = (i) => nv[0] * P.getX(i) + nv[1] * P.getY(i) + nv[2] * P.getZ(i) - d;
  const vtx = (i) => ({ p: [P.getX(i), P.getY(i), P.getZ(i)], n: [N.getX(i), N.getY(i), N.getZ(i)], f: f(i) });
  const mix = (a, b) => {
    const t = a.f / (a.f - b.f);
    return { p: a.p.map((v, k) => v + (b.p[k] - v) * t), n: a.n.map((v, k) => v + (b.n[k] - v) * t), f: 0 };
  };
  const emit = (...vs) => vs.forEach((v) => { outP.push(...v.p); outN.push(...v.n); });
  for (let i = 0; i < P.count; i += 3) {
    const tri = [vtx(i), vtx(i + 1), vtx(i + 2)];
    const ins = tri.filter((v) => v.f >= 0).length;
    if (ins === 3) emit(...tri);
    else if (ins === 0) continue;
    else {
      // 依原順序走一圈，收集保留的頂點與交點，再扇形三角化
      const poly = [];
      for (let k = 0; k < 3; k++) {
        const a = tri[k], b = tri[(k + 1) % 3];
        if (a.f >= 0) poly.push(a);
        if ((a.f >= 0) !== (b.f >= 0)) poly.push(mix(a, b));
      }
      for (let k = 1; k < poly.length - 1; k++) emit(poly[0], poly[k], poly[k + 1]);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(outN, 3));
  return out;
}

function geometryFor(n) {
  // 小零件（縫線、斑點、珍珠）用低面數球體，大零件用高面數
  const small = n.t === 'ell' && Math.max(...n.s) < 0.07;
  const key = n.t === 'ell' ? (n.low ? 'ellL' : small ? 'ellS' : 'ell') : JSON.stringify(n, (k, v) => (['p', 'r', 's', 'm'].includes(k) ? undefined : v));
  if (geoCache.has(key)) return geoCache.get(key);
  let g;
  switch (n.t) {
    case 'ell': g = n.low ? new THREE.SphereGeometry(1, 10, 8) : small ? new THREE.SphereGeometry(1, seg(14, 8), seg(10, 6)) : new THREE.SphereGeometry(1, seg(48, 18), seg(32, 12)); break;   // low：遊戲匯出時火焰這類遠看的零件用低面數
    case 'torus': {
      const full = n.arc >= Math.PI * 2 - 1e-6;
      g = n.low ? new THREE.TorusGeometry(n.R, n.tube, 4, 18, n.arc) : new THREE.TorusGeometry(n.R, n.tube, seg(24, 8), seg(96, 32), n.arc);   // low：細管（眼線、環紋）用低面數
      if (!full) g.rotateZ(Math.PI / 2 - n.arc / 2); // 弧形置中對稱於 +Y
      break;
    }
    case 'cyl': g = new THREE.CylinderGeometry(n.rt, n.rb, n.h, seg(n.seg, 10)); break;
    case 'box': g = new RoundedBoxGeometry(n.size[0], n.size[1], n.size[2], seg(4, 2), n.bevel); break;
    case 'shell': g = shellGeometry(n); break;
    case 'hair': g = hairGeometry(n); break;
    case 'star': g = starGeometry(n); break;
    case 'lathe':
      g = new THREE.LatheGeometry(n.pts.map(([r, y]) => new THREE.Vector2(r, y)), seg(128, 40), n.phiStart, n.phiLength);
      if (n.clip) g = clipByPlane(g, n.clip);
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
    if (n.t === 'lathe' || n.t === 'shell' || n.t === 'hair') mat =mats[n.m + '__2s'] ||= Object.assign(mat.clone(), { side: THREE.DoubleSide });
    obj = new THREE.Mesh(geometryFor(n), mat);
    obj.userData.part = { t: n.t, m: n.m, stage: n.stage, uo: n.uo }; // 匯出時依此命名
    obj.castShadow = true;
    obj.receiveShadow = true;
  }
  if (n.ol && obj.isMesh) {   // 卡通輪廓線：同一個形狀外擴 n.ol 公尺、只畫背面的黑色殼
    const om = (mats.__outline ||= new THREE.MeshBasicMaterial({ color: 0x8a8a8a, side: THREE.BackSide }));
    const o = new THREE.Mesh(obj.geometry, om), t = n.ol, sc = n.s || [1, 1, 1];
    if (n.t === 'ell') o.scale.set(1 + t / sc[0], 1 + t / sc[1], 1 + t / sc[2]);
    else if (n.t === 'cyl') { const r = Math.max(n.rt, n.rb); o.scale.set(1 + t / (r * sc[0]), 1 + t / ((n.h / 2) * sc[1]), 1 + t / (r * sc[2])); }
    else o.scale.setScalar(1.04);
    o.userData.part = { t: n.t, m: 'outline', stage: n.stage };
    obj.add(o);
  }
  if (n.id) obj.name = n.id; // 骨架樞紐名稱，AnimationClip 的軌道靠它綁定
  obj.position.fromArray(n.p);
  obj.rotation.set(n.r[0], n.r[1], n.r[2], 'XYZ');
  obj.scale.fromArray(n.s || [1, 1, 1]);
  return obj;
}

export function buildBird(bird) {
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
export function buildClips(actions, root) {
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

export function countTriangles(obj) {
  let tris = 0;
  obj.traverse((o) => {
    if (o.isMesh) {
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  return Math.round(tris);
}
