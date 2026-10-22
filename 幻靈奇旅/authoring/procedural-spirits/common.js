// 程序模型共用：材質、幾何（辣椒、羽瓣、葉、金莢、水滴）、關鍵影格插值。
// chicks.js（剝皮辣椒雞三階）與 dogs.js（汪汪犬三階）共用；export.html 會把動作烘焙成 GLB。
import * as THREE from 'three';

export const V3 = THREE.Vector3, V2 = THREE.Vector2;
export const v = (x, y, z) => new V3(x, y, z);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = t => t * t * (3 - 2 * t);
// 關鍵影格插值：keys = [[時間, 值], ...]，段間 smoothstep
export function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
    return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}
export const win = (t, a, b) => t > a && t < b;
// 循環動作用：在 dur 秒內剛好轉 n 圈的正弦
export const cyc = (t, dur, n, ph = 0) => Math.sin(2 * Math.PI * n * t / dur + ph);

// 細節等級：export 時降低面數
export const DETAIL = { k: 1 };
const seg = (n) => Math.max(6, Math.round(n * DETAIL.k));
const cache = {};
const cached = (key, make) => cache[key + '@' + DETAIL.k] ||= make();
export const sphere = (hi = false) => cached('sph' + hi, () => new THREE.SphereGeometry(1, seg(hi ? 56 : 28), seg(hi ? 40 : 20)));
export const cone = () => cached('cone', () => { const g = new THREE.ConeGeometry(1, 1, seg(18)); g.translate(0, .5, 0); return g; });
export const Y = v(0, 1, 0), Z = v(0, 0, 1);

function furTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, a = Math.PI / 2 + (Math.random() - .5) * .9, l = 4 + Math.random() * 9;
    const c2 = Math.random() < .5 ? 75 + Math.random() * 40 : 160 + Math.random() * 60;
    g.strokeStyle = `rgb(${c2},${c2},${c2})`; g.lineWidth = 1 + Math.random();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 3); return t;
}
export const FUR = typeof document !== 'undefined' ? furTexture() : null;
const P = (o) => new THREE.MeshPhysicalMaterial(o);
export function material(key, o) { const m = P(o); m.name = key; return m; }

export function mk(geo, mat, parent, pos, scale) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  if (pos) m.position.copy(pos);
  if (scale != null) typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.copy(scale);
  if (parent) parent.add(m); return m;
}
export function onSphere(obj, parent, c, r, dir, inset = 0) {
  const d = dir.clone().normalize();
  obj.position.copy(c).addScaledVector(d, r - inset);
  obj.quaternion.setFromUnitVectors(Z, d);
  parent.add(obj); return obj;
}
export const dirAE = (az, el) => v(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
// 尖刺／毛束：底在 pos，朝 dir 伸出；flat < 1 壓扁成片狀
export function spike(parent, mat, pos, dir, len, rad, flat = 1) {
  const m = mk(cone(), mat, parent, pos, v(rad, len, rad * flat));
  m.quaternion.setFromUnitVectors(Y, dir.clone().normalize()); return m;
}
// 具名群組：動畫要驅動的節點都要有唯一名稱
export function node(name, parent, pos) { const g = new THREE.Group(); g.name = name; if (pos) g.position.copy(pos); parent?.add(g); return g; }

function colored(g, colorAt) {
  const pos = g.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { colorAt(i, c); cols.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals(); return g;
}
// 辣椒：頂端 y=0、尖端 y=-L，往 +x 彎；red=true 尖端轉紅
export function pepperGeo(L, R, bend, red) {
  return cached(`pep${L}|${R}|${bend}|${red}`, () => {
    const pts = [new V2(1e-4, 0)], N = seg(30), sh = .08;
    for (let i = 0; i <= N; i++) {
      const t = i / N; let r;
      if (t < sh) r = R * (.62 + .38 * Math.sin(t / sh * Math.PI / 2));
      else { const s = (t - sh) / (1 - sh); r = R * (1 - .38 * s) * Math.pow(Math.max(0, 1 - Math.pow(s, 2.6)), .5); }
      pts.push(new V2(Math.max(r, 1e-4), -t * L));
    }
    const g = new THREE.LatheGeometry(pts.reverse(), seg(26)), pos = g.attributes.position;
    const cTop = new THREE.Color(0x3a6c1c), cMid = new THREE.Color(0x5f9c2c), cLow = new THREE.Color(0x4a8222), cY = new THREE.Color(0xc29a28), cR = new THREE.Color(0xd8261a);
    const s = [];
    for (let i = 0; i < pos.count; i++) { s[i] = clamp(-pos.getY(i) / L, 0, 1); pos.setX(i, pos.getX(i) + bend * L * s[i] * s[i]); }
    return colored(g, (i, c) => {
      c.copy(cTop).lerp(cMid, Math.min(1, s[i] * 2.5)).lerp(cLow, clamp((s[i] - .5) * 2, 0, 1));
      if (red) { c.lerp(cY, clamp((s[i] - .45) / .15, 0, 1) * .55); c.lerp(cR, clamp((s[i] - .58) / .2, 0, 1)); }
    });
  });
}
export function stemGeo(k) {
  return cached('stem' + k, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    [[0, 0, 0], [0, .12, 0], [.03, .25, 0], [.12, .33, 0], [.22, .31, 0], [.26, .22, 0]].map(p => v(...p).multiplyScalar(k))), seg(18), .045 * k, seg(8)));
}
// 羽瓣（水滴形）：底在 y=0 往 +y，往 +x 彎，顏色 c0→c1
export function petalGeo(L, R, bend, c0, c1) {
  return cached(`pet${L}|${R}|${bend}|${c0}|${c1}`, () => {
    const pts = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new V2(Math.max(R * Math.sin(Math.PI * Math.pow(t, .62)), 1e-4), t * L)); }
    const g = new THREE.LatheGeometry(pts, seg(18)), pos = g.attributes.position, a = new THREE.Color(c0), b = new THREE.Color(c1), tt = [];
    for (let i = 0; i < pos.count; i++) { tt[i] = clamp(pos.getY(i) / L, 0, 1); pos.setX(i, pos.getX(i) + bend * L * tt[i] * tt[i]); }
    return colored(g, (i, c) => c.copy(a).lerp(b, Math.pow(tt[i], 1.3)));
  });
}
export const leafGeo = () => cached('leaf', () => {
  const s = new THREE.Shape(); s.moveTo(0, 0);
  s.bezierCurveTo(.17, .12, .17, .42, 0, .64); s.bezierCurveTo(-.17, .42, -.17, .12, 0, 0);
  const g = new THREE.ShapeGeometry(s, 10), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -x * x * 3 + Math.sin(y * 4) * .03); }
  g.computeVertexNormals(); return g;
});
export const podGeo = () => cached('pod', () => { const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new V2(Math.max(.085 * Math.pow(Math.sin(Math.PI * t), .8), 1e-4), t * .28 - .14)); } return new THREE.LatheGeometry(pts, seg(12)); });
export const dropGeo = () => cached('drop', () => { const p = []; for (let i = 0; i <= 16; i++) { const t = i / 16; p.push(new V2(Math.max(.5 * Math.sin(Math.PI * Math.pow(t, .62)), 1e-4), t)); } return new THREE.LatheGeometry(p, seg(16)); });
