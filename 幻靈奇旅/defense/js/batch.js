/* Static batching for the battle map. Every tree, rock and flower is its own mesh plus an outline mesh, about 2,000 draw
   calls per frame, which is what heats a phone. After the map is built, everything that never moves is baked into one
   mesh per material (and one outline mesh per thickness). What moves is found by running the map's animation at a few
   moments and comparing transforms, so no list of animated props has to be kept in step with env.js. */

/* meshes whose world matrix changes while the scenery animates (and everything under them) stay separate */
export function movingMeshes(roots, advance) {
  const nodes = [], rest = new Map(), moving = new Set();
  for (const r of roots) r.traverse((o) => nodes.push(o));
  const snap = () => { for (const r of roots) r.updateMatrixWorld(true); };
  snap(); for (const o of nodes) rest.set(o, o.matrixWorld.elements.slice());
  for (const t of [0.37, 1.13, 2.71]) {
    advance(t); snap();
    for (const o of nodes) { const a = rest.get(o), b = o.matrixWorld.elements; for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > 1e-5) { moving.add(o); break; } }
  }
  return moving;
}

function appendInto(out, mesh, THREE, normalMatrix, v) {
  const g = mesh.geometry, pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, base = out.count, m = mesh.matrixWorld;
  normalMatrix.getNormalMatrix(m);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m); out.pos.push(v.x, v.y, v.z);
    v.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize(); out.nor.push(v.x, v.y, v.z);
    if (out.uv) out.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
  }
  /* a mirrored transform flips the winding */
  const flip = m.determinant() < 0, idx = g.index;
  const n = idx ? idx.count : pos.count;
  for (let i = 0; i < n; i += 3) {
    const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
    if (flip) out.idx.push(base + a, base + c, base + b); else out.idx.push(base + a, base + b, base + c);
  }
  out.count += pos.count;
}

function bake(THREE, out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nor, 3));
  if (out.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  g.setIndex(out.count > 65535 ? new THREE.Uint32BufferAttribute(out.idx, 1) : new THREE.Uint16BufferAttribute(out.idx, 1));
  return g;
}

/* outlineMaterialFor(worldThickness) builds the hull material for baked (world space) geometry */
export function batchStatic(THREE, roots, parent, {moving = new Set(), outlineMaterialFor} = {}) {
  const groups = new Map(), lines = new Map(), removed = [];
  const isFixed = (o) => { for (let p = o; p; p = p.parent) { if (moving.has(p)) return false; if (p === parent) break; } return true; };
  for (const r of roots) { r.updateMatrixWorld(true); r.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.morphTargetInfluences || Array.isArray(o.material) || !o.geometry.attributes.normal || !isFixed(o)) return;
    let hidden = false; for (let p = o; p; p = p.parent) if (!p.visible) hidden = true;
    if (hidden) return;
    if (o.userData.isOutline && o.userData.outlineWorld !== undefined) {
      const t = o.userData.outlineWorld;
      if (!lines.has(t)) lines.set(t, []); lines.get(t).push(o); return;
    }
    const m = o.material;
    if (m.transparent || o.userData.isEffect || (o.renderOrder && !o.userData.isOutline)) return;
    const key = m.uuid + (o.castShadow ? 's' : '') + (o.receiveShadow ? 'r' : '');
    if (!groups.has(key)) groups.set(key, {material: m, cast: o.castShadow, receive: o.receiveShadow, list: [], order: o.renderOrder, ink: !!o.userData.isOutline});
    groups.get(key).list.push(o);
  }); }
  const nm = new THREE.Matrix3(), v = new THREE.Vector3(), fresh = () => ({pos: [], nor: [], uv: [], idx: [], count: 0});
  const flush = (out, material, cast, receive) => { const mesh = new THREE.Mesh(bake(THREE, out), material); mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.matrixAutoUpdate = false; mesh.userData.batched = true; parent.add(mesh); return mesh; };
  let meshes = 0;
  for (const {material, cast, receive, list, order, ink} of groups.values()) {
    if (list.length < 2) continue;
    let out = fresh();
    const done = () => { const b = flush(out, material, cast, receive); b.renderOrder = order; if (ink) b.userData.isOutline = true; };
    for (const o of list) { appendInto(out, o, THREE, nm, v); removed.push(o); meshes++; if (out.count > 60000) { done(); out = fresh(); } }
    if (out.count) done();
  }
  for (const [t, list] of lines) {
    if (list.length < 2 || !outlineMaterialFor) continue;
    const material = outlineMaterialFor(t);
    let out = fresh(); out.uv = null;
    const flushLine = () => { const l = flush(out, material, false, false); l.userData.isOutline = true; l.renderOrder = -1; };
    for (const o of list) { appendInto(out, o, THREE, nm, v); removed.push(o); meshes++; if (out.count > 60000) { flushLine(); out = fresh(); out.uv = null; } }
    if (out.count) flushLine();
  }
  /* drop what was baked (deepest first, so an outline goes before its mesh), then any group left empty */
  const gone = new Set(removed), geos = new Set(removed.map((o) => o.geometry));
  for (const o of removed) if (o.userData.isOutline) { o.parent?.remove(o); }
  for (const o of removed) if (!o.userData.isOutline) { if (o.children.length) o.visible = false; else o.parent?.remove(o); }
  geos.forEach((g) => g.dispose());
  const prune = (o) => { for (const c of [...o.children]) prune(c); if (o !== parent && !moving.has(o) && !o.isMesh && !o.isLine && !o.isPoints && !o.isLight && !o.children.length) o.parent?.remove(o); };
  for (const r of roots) prune(r);
  return gone.size;
}
