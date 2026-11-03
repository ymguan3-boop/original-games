/* Bakes the sea chart's 3D models into GLB files so the game loads them directly instead of building them with code:
   defense/models/island-<scene>.glb (ten islands), dock.glb (town pier, booth, beach) and speedboat.glb.
   Run: node defense/tools/bake-chart-models.mjs
   The models are built by js/islands3d.js and js/harbor.js (Three.js r128 from vendor/), the dark outline is baked in as real
   geometry (an inverted hull), and a tiny GLB writer below stores the scene graph, meshes and plain colours. Canvas
   textures (the wood planks) become their base colour; the two painted-texture props (star plate, rainbow plaza) are added by
   the game itself (js/chart-models.js). The boatman and the rider are the hero model, added at run time. */
import {createRequire} from 'node:module';
import {writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const defense = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), root = path.resolve(defense, '..');
const out = path.join(defense, 'models');

/* ---- a minimal DOM so the builders can run in Node (canvas drawing is ignored; the first fill colour is remembered) ---- */
globalThis.window = globalThis;
const stubCanvas = () => {
  const c = {width: 0, height: 0, first: null, isStub: true};
  c.getContext = () => new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({addColorStop() {}}) : () => {})),
    set: (t, k, v) => { if (k === 'fillStyle' && !c.first && typeof v === 'string') c.first = v; t[k] = v; return true; },
  });
  return c;
};
globalThis.document = {createElement: () => stubCanvas()};
const T = require(path.join(root, 'vendor/three.min.js'));
require(path.join(root, 'js/harbor.js'));
const H = globalThis.PhantomHarbor;
const imp = (p) => import(pathToFileURL(path.join(defense, p)).href);
const {createToonKit} = await imp('js/style.js');
const {createIslandBuilder} = await imp('js/islands3d.js');
const {STAGES} = await imp('js/stages.js');

/* ---- baked outline instead of the run-time shader outline ---- */
const INK = new T.Color(0x3a2414).convertSRGBToLinear();
const inkMaterial = new T.MeshBasicMaterial({color: INK, name: 'ink'});
function bakeOutline(root, thickness) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((n) => { if (n.isMesh && !n.userData.isOutline && !n.userData.isEffect && !n.userData.soft && n.visible !== false) meshes.push(n); });
  for (const n of meshes) {
    const m = Array.isArray(n.material) ? n.material[0] : n.material;
    if (!m || (m.transparent && m.opacity < 0.9) || m.isMeshBasicMaterial || !n.geometry.attributes.normal || !n.geometry.index) continue;
    const s = new T.Vector3(); n.getWorldScale(s);
    const k = thickness / Math.max(1e-4, (Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.z)) / 3);
    const g = n.geometry.clone(), p = g.attributes.position, nr = g.attributes.normal, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.set(nr.getX(i), nr.getY(i), nr.getZ(i)).normalize().multiplyScalar(k); p.setXYZ(i, p.getX(i) + v.x, p.getY(i) + v.y, p.getZ(i) + v.z); }
    const idx = g.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const o = new T.Mesh(g, inkMaterial); o.name = 'outline'; o.userData.isOutline = true; o.userData.baked = true; n.add(o);
  }
}
const kit = createToonKit(T), bakeKit = {...kit, toonify(root, {outline = 0.04} = {}) { if (outline > 0) bakeOutline(root, outline); return root; }};

/* ---- GLB writer ---- */
function toGLB(root) {
  root.updateMatrixWorld(true);
  const gltf = {asset: {version: '2.0', generator: 'hlqj bake-chart-models'}, scene: 0, scenes: [{nodes: [0]}], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [{byteLength: 0}]};
  const chunks = []; let offset = 0;
  const view = (typed, target) => {
    const pad = (4 - (offset % 4)) % 4; if (pad) { chunks.push(new Uint8Array(pad)); offset += pad; }
    const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    chunks.push(bytes); gltf.bufferViews.push({buffer: 0, byteOffset: offset, byteLength: bytes.length, target}); offset += bytes.length;
    return gltf.bufferViews.length - 1;
  };
  const accessor = (typed, type, componentType, count, target, minmax) => {
    gltf.accessors.push({bufferView: view(typed, target), componentType, count, type, ...(minmax || {})}); return gltf.accessors.length - 1;
  };
  const mats = new Map();
  const material = (m, mesh) => {
    const key = m.uuid + (mesh.userData.isEffect ? 'fx' : '');
    if (mats.has(key)) return mats.get(key);
    let c = m.color ? m.color.clone() : new T.Color(1, 1, 1);
    if (m.map?.image?.first) c = new T.Color(m.map.image.first).convertSRGBToLinear();   /* wood textures become their base colour */
    const e = m.emissive ? m.emissive.clone().multiplyScalar(m.emissiveIntensity ?? 1) : new T.Color(0, 0, 0);
    const def = {name: m.name || (m.isMeshToonMaterial ? 'toon' : 'mat'), pbrMetallicRoughness: {baseColorFactor: [c.r, c.g, c.b, m.transparent ? m.opacity : 1], metallicFactor: 0, roughnessFactor: 1},
      emissiveFactor: [Math.min(1, e.r), Math.min(1, e.g), Math.min(1, e.b)], alphaMode: m.transparent ? 'BLEND' : 'OPAQUE', doubleSided: m.side === T.DoubleSide};
    gltf.materials.push(def); mats.set(key, gltf.materials.length - 1); return gltf.materials.length - 1;
  };
  const meshDef = (mesh) => {
    const g = mesh.geometry, pos = g.attributes.position; if (!pos || pos.isInterleavedBufferAttribute) return null;
    const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (m.map?.image?.isStub && !m.map.image.first) return null;
    if (m.transparent && m.map?.image?.isStub && mesh.userData.isEffect) return null;      /* painted-texture effects are rebuilt in game */
    const a = new Float32Array(pos.array), mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a[i + k]); mx[k] = Math.max(mx[k], a[i + k]); }
    const attributes = {POSITION: accessor(a, 'VEC3', 5126, pos.count, 34962, {min: mn, max: mx})};
    if (g.attributes.normal && !g.attributes.normal.isInterleavedBufferAttribute) attributes.NORMAL = accessor(new Float32Array(g.attributes.normal.array), 'VEC3', 5126, pos.count, 34962);
    const prim = {attributes, material: material(m, mesh), mode: 4};
    if (g.index) { const big = pos.count > 65535, ia = big ? new Uint32Array(g.index.array) : new Uint16Array(g.index.array); prim.indices = accessor(ia, 'SCALAR', big ? 5125 : 5123, ia.length, 34963); }
    gltf.meshes.push({name: mesh.name || 'mesh', primitives: [prim], extras: mesh.userData.isEffect ? {isEffect: true} : undefined});
    return gltf.meshes.length - 1;
  };
  const node = (o) => {
    const idx = gltf.nodes.length, def = {name: o.name || o.type}; gltf.nodes.push(def);
    if (o.position.lengthSq()) def.translation = o.position.toArray();
    if (o.quaternion.w !== 1) def.rotation = o.quaternion.toArray();
    if (o.scale.x !== 1 || o.scale.y !== 1 || o.scale.z !== 1) def.scale = o.scale.toArray();
    if (o.isMesh && !(o.userData.isOutline && !o.userData.baked)) { const mi = meshDef(o); if (mi !== null) def.mesh = mi; }
    if (o.userData.isEffect || o.userData.isOutline) def.extras = {...(o.userData.isEffect ? {isEffect: true} : {}), ...(o.userData.isOutline ? {isOutline: true} : {})};
    const kids = [];
    for (const c of o.children) {
      if (c.visible === false || (c.isMesh && c.userData.isOutline && !c.userData.baked)) continue;
      if (!(c.isMesh || c.isGroup || c.type === 'Object3D')) continue;
      kids.push(node(c));
    }
    if (kids.length) def.children = kids;
    return idx;
  };
  node(root);
  const bin = Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength))), binPad = (4 - (bin.length % 4)) % 4;
  gltf.buffers[0].byteLength = bin.length + binPad;
  let json = Buffer.from(JSON.stringify(gltf)); const jPad = (4 - (json.length % 4)) % 4; json = Buffer.concat([json, Buffer.alloc(jPad, 0x20)]);
  const total = 12 + 8 + json.length + 8 + bin.length + binPad, head = Buffer.alloc(12 + 8);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8); head.writeUInt32LE(json.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
  const binHead = Buffer.alloc(8); binHead.writeUInt32LE(bin.length + binPad, 0); binHead.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, json, binHead, bin, Buffer.alloc(binPad)]);
}

/* ---- build and write ---- */
mkdirSync(out, {recursive: true});
const builder = createIslandBuilder(T, bakeKit), save = (name, group) => { const b = toGLB(group); writeFileSync(path.join(out, name), b); console.log(name, (b.length / 1024).toFixed(0) + ' KB'); };
for (const stage of STAGES) save('island-' + stage.scene + '.glb', await builder.island(stage.scene));
save('dock.glb', builder.dock(null));
const {boat} = H.makeSpeedboat(T, {mobile: true}); bakeOutline(boat, 0.03);
save('speedboat.glb', boat);
