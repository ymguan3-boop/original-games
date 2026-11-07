/* Themed cartoon scenery for each stage (farm meadow, riverside, forge town, library, night forest, star tower,
   abyss): ground colours, lighting and toon-shaded, outlined props placed clear of the road and the two bases. */

import {createIslandProps} from './island-props.js?v=20261107-a3';

export const THEMES = {
  meadow: {sky: 0xbfe6ff, ground: [0x86cc5e, 0x6ab84c, 0xb4d468], hemi: [0xfff6e0, 0x5e8a3a, 0.85], sun: [0xfff0cf, 1.15], road: [0x6a4528, 0xc89a5a, 0xe9c98e]},
  pond: {sky: 0xb8e4ff, ground: [0x7fc965, 0x5fb553, 0xa9d873], hemi: [0xeaf7ff, 0x4f8a48, 0.85], sun: [0xfff4dc, 1.1], road: [0x5e4026, 0xc3a06a, 0xeedbb0]},
  waterfall: {sky: 0xa8dcf5, ground: [0x6cbf74, 0x52a862, 0x94d08a], hemi: [0xe6f6ff, 0x3f7a5a, 0.85], sun: [0xf2fbff, 1.05], road: [0x4a4a52, 0x9aa0a8, 0xdfe3e8]},
  orchard: {sky: 0xffe6c2, ground: [0x9ccc5a, 0x84b84a, 0xc2d86a], hemi: [0xfff2dc, 0x6a7a3a, 0.85], sun: [0xffe2b0, 1.15], road: [0x6a4528, 0xd2a46a, 0xf0d6a8]},
  desert: {sky: 0xffd8a8, ground: [0xe8c48a, 0xd6aa6a, 0xf2d6a2], hemi: [0xfff0d8, 0x9a6a3a, 0.85], sun: [0xffe0b0, 1.2], road: [0x6a3a22, 0xb26a3e, 0xd99a62]},
  forge: {sky: 0xffd9b0, ground: [0x9fa45c, 0x868f4c, 0xb8ba6c], hemi: [0xffe6c8, 0x6b4a2c, 0.8], sun: [0xffd09a, 1.15], road: [0x3e3a36, 0x8f8a82, 0xdcd6ca]},
  observatory: {sky: 0xe7dcff, ground: [0x9fd08a, 0x83bd78, 0xc7dd9a], hemi: [0xf4ecff, 0x5d7a55, 0.85], sun: [0xfff2e6, 1.05], road: [0x5a3e2c, 0xb99a7a, 0xe6d3bd]},
  night: {sky: 0x2e3c62, ground: [0x4f8a5c, 0x3e7350, 0x66a06e], hemi: [0xa8bcf0, 0x2a3a30, 1.0], sun: [0xbcd0ff, 0.9], road: [0x2c2218, 0x7a6448, 0xa99270], night: true},
  tower: {sky: 0xd6d0ff, ground: [0xb7b0d8, 0x9c95c4, 0xd0c9ea], hemi: [0xf1eeff, 0x5c557e, 0.85], sun: [0xfff6e8, 1.05], road: [0x4d4266, 0xa79bc9, 0xddd5f3]},
  abyss: {sky: 0x9fd8e6, ground: [0x5fb3a8, 0x4a9a92, 0x83cdbf], hemi: [0xdaf6ff, 0x2f5f66, 0.8], sun: [0xe6fbff, 1.0], road: [0x2f4b52, 0x7fa9ad, 0xc4e2e0]},
};
export function themeOf(stage) { return THEMES[stage.scene] ? stage.scene : 'meadow'; }

export function buildEnvironment(THREE, group, {theme, path, start, end, rand, kit}) {
  const {toon, toonify, linear} = kit, T = THEMES[theme], animated = [];
  const pts = path.points;
  const roadDistance = (x, z) => { let b = Infinity; for (let i = 0; i < pts.length; i += 2) b = Math.min(b, Math.hypot(pts[i][0] - x, pts[i][1] - z)); return b; };
  const taken = [];
  const P = createIslandProps(THREE, kit, rand, animated);
  /* find a free spot: off the road, away from the bases and other big props */
  function spot(clear = 2.6, room = 1.5, tries = 40, inside = true) {
    for (let i = 0; i < tries; i++) {
      const x = (rand() - 0.5) * (inside ? 32 : 42), z = (rand() - 0.5) * (inside ? 18 : 26);
      if (!inside && Math.abs(x) < 16.5 && Math.abs(z) < 9.5) continue;
      if (roadDistance(x, z) < clear) continue;
      if (Math.hypot(x - start[0], z - start[1]) < 4 || Math.hypot(x - end[0], z - end[1]) < 4) continue;
      /* keep the view clear between the camera and the boss / hero barrels standing at the two bases */
      if ([start, end].some((b) => Math.abs(x - b[0]) < 3.6 && z > b[1] && z - b[1] < 8)) continue;
      if (taken.some((t) => Math.hypot(t[0] - x, t[1] - z) < t[2] + room)) continue;
      taken.push([x, z, room]); return [x, z];
    }
    return null;
  }
  const place = (obj, x, z, rot = rand() * Math.PI * 2, outline = 0.12) => { obj.position.set(x, 0, z); obj.rotation.y = rot; group.add(obj); toonify(obj, {outline}); return obj; };
  const box = (w, h, d, hex) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(hex));
  const cyl = (rt, rb, h, hex, seg = 12) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), toon(hex));
  const ball = (r, hex, seg = 14) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), toon(hex));

  /* ---------- props ---------- */
  function roundTree(leaf = [0x5cb84a, 0x74c95a, 0x4aa63e], trunkHex = 0x8a5a36) {
    const g = new THREE.Group(), t = cyl(0.18, 0.26, 1.2, trunkHex, 8); t.position.y = 0.6; g.add(t);
    const n = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) { const b = ball(0.62 + rand() * 0.3, leaf[i % leaf.length]); b.position.set((rand() - 0.5) * 0.7, 1.45 + rand() * 0.55 + (i ? 0 : 0.2), (rand() - 0.5) * 0.7); g.add(b); }
    g.scale.setScalar(0.85 + rand() * 0.5); return g;
  }
  function pine(hex = 0x3f8f4a) {
    const g = new THREE.Group(), t = cyl(0.12, 0.18, 0.7, 0x6b4428, 6); t.position.y = 0.35; g.add(t);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.22, 1.1, 8), toon(hex)); c.position.y = 1.0 + i * 0.6; g.add(c); }
    g.scale.setScalar(0.8 + rand() * 0.6); return g;
  }
  function bush(hex = 0x58b247) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = ball(0.38 + rand() * 0.18, hex); b.position.set((i - 1) * 0.35, 0.3, (rand() - 0.5) * 0.3); g.add(b); } return g; }
  function flowers(colors = [0xffffff, 0xff9ec4, 0xfff176, 0xc6a8ff, 0xff8a65]) {
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) { const s = new THREE.Group(), st = cyl(0.02, 0.02, 0.28, 0x4f9a3e, 4); st.position.y = 0.14; s.add(st); const f = ball(0.08, colors[Math.floor(rand() * colors.length)], 8); f.position.y = 0.3; s.add(f); s.position.set((rand() - 0.5) * 1.2, 0, (rand() - 0.5) * 1.2); g.add(s); }
    return g;
  }
  function fence(len = 4) {
    const g = new THREE.Group(), wood = 0xf2e6cf;
    for (let i = 0; i <= len; i++) { const p = box(0.14, 0.7, 0.14, wood); p.position.set(i - len / 2, 0.35, 0); g.add(p); }
    for (const y of [0.25, 0.52]) { const r = box(len, 0.08, 0.06, wood); r.position.y = y; g.add(r); }
    return g;
  }
  function barn() {
    const g = new THREE.Group(), body = box(3, 2, 2.4, 0xd9483b); body.position.y = 1; g.add(body);
    for (const s of [1, -1]) { const panel = box(3.2, 0.14, 1.55, 0x8b3a2e); panel.position.set(0, 2.45, s * 0.6); panel.rotation.x = s * 0.62; g.add(panel); }
    const gable = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.98, 3), toon(0xd9483b)); gable.rotation.z = Math.PI / 2; gable.rotation.x = Math.PI / 6; gable.position.y = 2.25; gable.scale.set(0.62, 1, 1); g.add(gable);
    const door = box(1.1, 1.3, 0.05, 0xf4ead2); door.position.set(0, 0.65, 1.22); g.add(door);
    for (const s of [1, -1]) { const x = box(1.5, 0.08, 0.06, 0xd9483b); x.position.set(0, 0.65, 1.25); x.rotation.z = s * 0.86; g.add(x); }
    const trim = box(3.05, 0.1, 2.45, 0xf4ead2); trim.position.y = 2; g.add(trim);
    return g;
  }
  function haystack() { const g = new THREE.Group(), c = cyl(0.55, 0.6, 0.7, 0xf0c95a, 14); c.position.y = 0.35; g.add(c); const t = ball(0.56, 0xf6d877); t.scale.y = 0.6; t.position.y = 0.7; g.add(t); return g; }
  function windmill() {
    const g = new THREE.Group(), tower = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 3.2, 10), toon(0xf4ead2)); tower.position.y = 1.6; g.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.8, 10), toon(0x8b3a2e)); cap.position.y = 3.6; g.add(cap);
    const hub = new THREE.Group(); hub.position.set(0, 3.1, 0.65); g.add(hub);
    for (let i = 0; i < 4; i++) { const b = box(0.32, 1.7, 0.05, 0xf8f0dc); b.position.y = 0.95; const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(b); hub.add(arm); }
    animated.push((dt) => { hub.rotation.z += dt * 0.9; });
    return g;
  }
  function lantern(lit = false) {
    const g = new THREE.Group(), post = cyl(0.06, 0.08, 1.8, 0x3a3a44, 6); post.position.y = 0.9; g.add(post);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.34), toon(0xfff1b0, {emissive: linear(lit ? 0xffd27a : 0x7a6a3a), emissiveIntensity: lit ? 1.6 : 0.6})); lamp.position.y = 1.95; g.add(lamp);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.22, 4), toon(0x3a3a44)); roof.position.y = 2.26; roof.rotation.y = Math.PI / 4; g.add(roof);
    if (lit) { const l = new THREE.PointLight(0xffc870, 1.1, 7, 2); l.position.y = 1.9; g.add(l); }
    return g;
  }
  function sign(text) {
    const g = new THREE.Group(), post = box(0.12, 1.2, 0.12, 0x8a5a36); post.position.y = 0.6; g.add(post);
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
    x.fillStyle = '#c99a5c'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#4a2c14'; x.font = 'bold 52px "Microsoft JhengHei", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 50);
    const tex = new THREE.CanvasTexture(c), board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 0.08), [toon(0xc99a5c), toon(0xc99a5c), toon(0xc99a5c), toon(0xc99a5c), new THREE.MeshToonMaterial({map: tex, gradientMap: kit.gradientMap}), toon(0xc99a5c)]);
    board.position.y = 1.15; g.add(board); return g;
  }
  function pond(r = 2) {
    const g = new THREE.Group(), shore = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.35, r + 0.45, 0.08, 28), toon(0xd8c79a)); shore.position.y = 0.04; g.add(shore);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.1, 28), new THREE.MeshToonMaterial({color: linear(0x5cc4f0), gradientMap: kit.gradientMap, emissive: linear(0x1b6f9a), emissiveIntensity: 0.25})); water.position.y = 0.07; g.add(water);
    for (let i = 0; i < 4; i++) { const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10), toon(0x5fb54a)); const a = rand() * Math.PI * 2, d = rand() * r * 0.7; pad.position.set(Math.cos(a) * d, 0.14, Math.sin(a) * d); g.add(pad); }
    for (let i = 0; i < 6; i++) { const reed = cyl(0.03, 0.04, 0.8, 0x6a9a3e, 4); const a = rand() * Math.PI * 2; reed.position.set(Math.cos(a) * (r + 0.2), 0.4, Math.sin(a) * (r + 0.2)); g.add(reed); }
    animated.push((dt, t) => { water.material.emissiveIntensity = 0.22 + Math.sin(t * 1.5) * 0.06; });
    return g;
  }
  function rock(hex = 0xb8b2a6) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + rand() * 0.35, 0), toon(hex)); r.position.y = 0.2; r.scale.y = 0.7; const g = new THREE.Group(); g.add(r); return g; }
  function stump() { const g = new THREE.Group(), s = cyl(0.45, 0.5, 0.45, 0x9a6a3c, 14); s.position.y = 0.22; g.add(s); const top = cyl(0.44, 0.44, 0.02, 0xe6c38a, 14); top.position.y = 0.46; g.add(top); return g; }
  function house(wall = 0xb9b2a6, roofHex = 0x5a4a4a) {
    const g = new THREE.Group(), body = box(2, 1.5, 1.8, wall); body.position.y = 0.75; g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1, 4), toon(roofHex)); roof.position.y = 2; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.95); g.add(roof);
    const chimney = box(0.35, 0.9, 0.35, 0x7a6a62); chimney.position.set(0.55, 2.1, 0.2); g.add(chimney);
    const door = box(0.5, 0.8, 0.05, 0x6b4428); door.position.set(0, 0.4, 0.92); g.add(door);
    for (const x of [-0.6, 0.6]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.05), toon(0xffe08a, {emissive: linear(0xffb84a), emissiveIntensity: 0.5})); w.position.set(x, 0.9, 0.92); g.add(w); }
    const puffs = [];
    for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({color: 0xeeeeee, transparent: true, opacity: 0.6, depthWrite: false})); p.userData.isEffect = true; g.add(p); puffs.push(p); }
    animated.push((dt, t) => puffs.forEach((p, i) => { const k = (t * 0.35 + i / 3) % 1; p.position.set(0.55 + k * 0.4, 2.6 + k * 1.6, 0.2); p.scale.setScalar(0.6 + k * 1.4); p.material.opacity = 0.6 * (1 - k); }));
    return g;
  }
  function bookshelf() {
    const g = new THREE.Group(), frame = box(1.6, 1.8, 0.5, 0x8a5a36); frame.position.y = 0.9; g.add(frame);
    const colors = [0xd9483b, 0x4a8fd9, 0xf0c95a, 0x5fb54a, 0xb46cff];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) { const b = box(0.18, 0.42, 0.36, colors[(row * 6 + i) % colors.length]); b.position.set(-0.6 + i * 0.24, 0.35 + row * 0.55, 0.1); g.add(b); }
    return g;
  }
  function mushroom(glowHex = 0x9cf0ff) {
    const g = new THREE.Group(), st = cyl(0.1, 0.13, 0.4, 0xf2e6cf, 8); st.position.y = 0.2; g.add(st);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(glowHex, {emissive: linear(glowHex), emissiveIntensity: 0.9})); cap.position.y = 0.38; g.add(cap);
    g.scale.setScalar(0.8 + rand() * 0.9); return g;
  }
  function crystalCluster(hex = 0xb69bff) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 + rand() * 0.25, 0), toon(hex, {emissive: linear(hex), emissiveIntensity: 0.55})); c.scale.y = 2; c.position.set((rand() - 0.5) * 0.7, 0.45, (rand() - 0.5) * 0.7); c.rotation.z = (rand() - 0.5) * 0.6; g.add(c); }
    return g;
  }
  function pillar(hex = 0xe6e0f6) { const g = new THREE.Group(), p = cyl(0.35, 0.42, 2.6, hex, 10); p.position.y = 1.3; g.add(p); const top = box(1, 0.25, 1, hex); top.position.y = 2.7; g.add(top); const base = box(1, 0.25, 1, hex); base.position.y = 0.12; g.add(base); return g; }
  function coral(hex = 0xff9a8a) { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const b = cyl(0.07, 0.1, 0.6 + rand() * 0.6, hex, 6); b.position.set((rand() - 0.5) * 0.5, 0.4, (rand() - 0.5) * 0.5); b.rotation.set((rand() - 0.5) * 0.7, 0, (rand() - 0.5) * 0.7); g.add(b); } return g; }

  function frog() {
    const g = new THREE.Group(), body = ball(0.32, 0x6ac94a); body.scale.set(1, 0.75, 1.1); body.position.y = 0.22; g.add(body);
    for (const x of [-0.14, 0.14]) { const eye = ball(0.1, 0xffffff, 8); eye.position.set(x, 0.42, 0.12); g.add(eye); const p = ball(0.05, 0x222222, 6); p.position.set(x, 0.44, 0.2); g.add(p); }
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 14), toon(0x5fb54a)); pad.position.y = 0.02; g.add(pad);
    const phase = rand() * 6; animated.push((dt, t) => { body.position.y = 0.22 + Math.max(0, Math.sin(t * 2 + phase)) * 0.15; });
    return g;
  }
  /* a rocky cliff of stacked boulders with a curved water curtain, a plunge pool with a foam ring and mist. The
     curtain and mist skip the outline pass and never write depth, so they cannot cut into the rock. */
  function waterfallCliff() {
    const g = new THREE.Group(), rock = [0x8f96a2, 0x7d8592, 0xa3aab4];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9 - row; i++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3 + rand() * 0.5, 1), toon(rock[(i + row) % 3]));
      r.position.set(-7 + i * 1.75 + row * 0.85, 1 + row * 1.7 + rand() * 0.3, -0.6 - rand() * 0.6 - row * 0.2); r.scale.set(1, 0.85, 0.8); r.rotation.set(rand(), rand(), rand());
      if (Math.abs(r.position.x) < 1.6 && row < 2) r.position.z -= 0.9; /* a notch where the water runs */
      g.add(r);
    }
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.5 + rand() * 0.3, 8, 6), toon(0x5fae45)); m.position.set(-5 + i * 5, 5.6, -0.8); m.scale.y = 0.5; g.add(m); }
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
    x.fillStyle = 'rgba(127,214,255,.55)'; x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 46; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.35 + Math.random() * 0.55) + ')'; x.fillRect(Math.random() * 64, Math.random() * 256, 2 + Math.random() * 5, 24 + Math.random() * 70); }
    const fallTex = new THREE.CanvasTexture(c); fallTex.wrapS = fallTex.wrapT = THREE.RepeatWrapping;
    const fall = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 5.4, 16, 1, true, -Math.PI * 0.4, Math.PI * 0.8), new THREE.MeshBasicMaterial({map: fallTex, transparent: true, depthWrite: false, side: THREE.DoubleSide}));
    fall.position.set(0, 2.9, -0.7); fall.userData.isEffect = true; fall.renderOrder = 2; g.add(fall);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.12, 28), new THREE.MeshToonMaterial({color: linear(0x5cc4f0), gradientMap: kit.gradientMap})); pool.position.set(0, 0.06, 1.6); g.add(pool);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.22, 6, 28), toon(0x8f96a2)); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.12, 1.6); rim.scale.z = 0.6; g.add(rim);
    const foamRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.3, 24), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false})); foamRing.rotation.x = -Math.PI / 2; foamRing.position.set(0, 0.14, 0.9); foamRing.userData.isEffect = true; g.add(foamRing);
    const mist = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false})); mist.position.set(0, 0.5, 0.9); mist.scale.y = 0.5; mist.userData.isEffect = true; g.add(mist);
    animated.push((dt, t) => { fallTex.offset.y = -t * 1.6; mist.scale.x = 1 + Math.sin(t * 3) * 0.08; foamRing.scale.setScalar(1 + Math.sin(t * 4) * 0.08); });
    return g;
  }
  function fruitTree(fruit = 0xff5a4a) { const g = roundTree([0x5cb84a, 0x6fc95a, 0x4aa63e]); for (let i = 0; i < 7; i++) { const f = ball(0.11, fruit, 8), a = rand() * Math.PI * 2; f.position.set(Math.cos(a) * 0.6, 1.4 + rand() * 0.8, Math.sin(a) * 0.6); g.add(f); } return g; }
  function basket(fruit = 0xff5a4a) { const g = new THREE.Group(), b = cyl(0.38, 0.3, 0.35, 0xb5823e, 12); b.position.y = 0.18; g.add(b); for (let i = 0; i < 5; i++) { const f = ball(0.11, fruit, 8); f.position.set((rand() - 0.5) * 0.4, 0.42, (rand() - 0.5) * 0.4); g.add(f); } return g; }
  function ladder() { const g = new THREE.Group(); for (const x of [-0.25, 0.25]) { const r = box(0.07, 2, 0.07, 0xb5823e); r.position.set(x, 1, 0); g.add(r); } for (let i = 0; i < 6; i++) { const s = box(0.5, 0.05, 0.05, 0xb5823e); s.position.y = 0.2 + i * 0.32; g.add(s); } g.rotation.x = -0.25; return g; }
  function cactus() {
    const g = new THREE.Group(), c = cyl(0.25, 0.28, 1.8, 0x4f9a4a, 10); c.position.y = 0.9; g.add(c);
    for (const s of [1, -1]) { const arm = cyl(0.14, 0.14, 0.7, 0x4f9a4a, 8); arm.position.set(s * 0.45, 1.1 + rand() * 0.3, 0); g.add(arm); const elbow = cyl(0.14, 0.14, 0.4, 0x4f9a4a, 8); elbow.rotation.z = Math.PI / 2; elbow.position.set(s * 0.3, 0.8 + rand() * 0.2, 0); g.add(elbow); }
    g.scale.setScalar(0.8 + rand() * 0.5); return g;
  }
  function mesa() { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const m = cyl(1.4 - i * 0.3, 1.6 - i * 0.3, 0.9, [0xc8643a, 0xd9804a, 0xb8553a][i], 7); m.position.y = 0.45 + i * 0.85; g.add(m); } g.scale.setScalar(0.9 + rand() * 0.6); return g; }
  function barrel() { const g = new THREE.Group(), b = cyl(0.32, 0.32, 0.75, 0x9a6a3c, 12); b.position.y = 0.38; g.add(b); for (const y of [0.15, 0.6]) { const band = cyl(0.335, 0.335, 0.06, 0x4a4a52, 12); band.position.y = y; g.add(band); } return g; }
  function saloon() {
    const g = new THREE.Group(), body = box(2.6, 1.8, 1.8, 0xc48a52); body.position.y = 0.9; g.add(body);
    const front = box(2.8, 0.7, 0.12, 0xa86e3a); front.position.set(0, 2.1, 0.92); g.add(front);
    const porch = box(2.8, 0.1, 0.8, 0x8a5a36); porch.position.set(0, 0.05, 1.3); g.add(porch);
    for (const x of [-1.25, 1.25]) { const p = box(0.1, 1.4, 0.1, 0x8a5a36); p.position.set(x, 0.7, 1.65); g.add(p); }
    const door = box(0.7, 0.9, 0.05, 0x6b4428); door.position.set(0, 0.55, 0.92); g.add(door);
    return g;
  }
  function telescope() { const g = new THREE.Group(), tri = cyl(0.04, 0.06, 1.2, 0x5a4a6a, 6); tri.position.y = 0.6; g.add(tri); const tube = cyl(0.12, 0.18, 1.4, 0xd9b45a, 12); tube.rotation.z = -0.9; tube.position.set(0.3, 1.35, 0); g.add(tube); return g; }
  function domeHall() {
    const g = new THREE.Group(), body = cyl(1.4, 1.5, 1.4, 0xe9e2f6, 16); body.position.y = 0.7; g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x7a6ab8)); dome.position.y = 1.4; g.add(dome);
    const slit = box(0.35, 1.2, 0.1, 0x2a2440); slit.position.set(0, 2, 1.25); slit.rotation.x = -0.5; g.add(slit);
    return g;
  }
  function starLamp() { const g = lantern(true), star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), toon(0xfff2a8, {emissive: linear(0xffe27a), emissiveIntensity: 1})); star.position.y = 2.55; g.add(star); animated.push((dt) => { star.rotation.y += dt * 2; }); return g; }

  /* ---------- per-theme scatter ---------- */
  /* props go inside the field when there is room, otherwise just outside its edge */
  const scatter = (count, make, clear = 2.6, room = 1.5, inside = true, outline = 0.12) => { for (let i = 0; i < count; i++) { const s = spot(clear, room, 40, inside) || spot(clear, room, 40, false); if (s) place(make(), s[0], s[1], undefined, outline); } };
  /* a fence along the far edge and a sign at each base give the field a frame */
  const sides = [[-14, -9.6, 0], [14, -9.6, 0], [-14, 9.6, 0], [14, 9.6, 0]];
  if (['meadow', 'pond', 'orchard', 'observatory'].includes(theme)) for (const [x, z] of sides) { if (roadDistance(x, z) > 3) place(fence(5), x, z, 0, 0.06); }
  place(sign('巢穴'), start[0] + 2.4, start[1] + 2.2, 0.2, 0.06);
  place(sign('基地'), end[0] - 2.4, end[1] + 2.4, -0.2, 0.06);

  if (theme === 'meadow') {
    scatter(1, barn, 4, 3.4); scatter(1, windmill, 3.4, 2.4); scatter(4, haystack, 2.4, 1); scatter(14, () => roundTree(), 2.8, 1.6); scatter(8, bush, 2.2, 0.8); scatter(12, flowers, 2, 0.8); scatter(3, stump, 2.2, 0.8); scatter(3, () => lantern(false), 2.2, 0.6);
  } else if (theme === 'pond') {
    scatter(3, () => pond(1.8 + rand()), 4.6, 3); scatter(6, frog, 2.2, 0.8); scatter(12, () => roundTree([0x6fcf6a, 0x89d97a, 0x58bb55]), 2.8, 1.6); scatter(10, bush, 2.2, 0.8); scatter(10, flowers, 2, 0.8); scatter(8, rock, 2, 0.6); scatter(2, () => lantern(false), 2.2, 0.6);
  } else if (theme === 'waterfall') {
    place(waterfallCliff(), 0, -16.5, 0, 0.12); taken.push([0, -16.5, 7.5]);
    scatter(10, () => rock(0x9aa0aa), 2, 0.7); scatter(10, () => roundTree([0x5fb86a, 0x77c97a, 0x4aa65a]), 2.8, 1.6); scatter(5, () => pond(1.2 + rand() * 0.6), 4, 2.4); scatter(8, flowers, 2, 0.8);
  } else if (theme === 'orchard') {
    scatter(14, () => fruitTree([0xff5a4a, 0xffa53a, 0xffd23a][Math.floor(rand() * 3)]), 2.8, 1.6); scatter(6, () => basket([0xff5a4a, 0xffa53a][Math.floor(rand() * 2)]), 2, 0.7); scatter(3, ladder, 2.2, 0.8); scatter(3, haystack, 2.4, 1); scatter(1, barn, 4, 3.4); scatter(8, flowers, 2, 0.8);
  } else if (theme === 'desert') {
    scatter(2, saloon, 3.8, 2.8); scatter(12, cactus, 2.2, 0.9); scatter(5, mesa, 3.2, 2); scatter(6, barrel, 2, 0.6); scatter(8, () => rock(0xc8964a), 2, 0.6);
  } else if (theme === 'forge') {
    scatter(4, () => house(), 3.6, 2.6); scatter(8, () => rock(0x9a8a7a), 2.2, 0.8); scatter(6, () => lantern(true), 2.2, 0.8); scatter(6, () => roundTree([0xc9a24a, 0xb88a3a, 0xd9b45a], 0x6b4428), 2.8, 1.6); scatter(5, stump, 2.2, 0.8); scatter(4, haystack, 2.4, 1);
  } else if (theme === 'observatory') {
    scatter(2, domeHall, 3.8, 2.6); scatter(4, telescope, 2.2, 0.8); scatter(4, bookshelf, 3, 2); scatter(8, starLamp, 2.2, 0.8); scatter(10, () => roundTree([0xb58ad9, 0xc9a2e6, 0x9e74c9]), 2.8, 1.6); scatter(10, flowers, 2, 0.8); scatter(6, bush, 2.2, 0.8);
  } else if (theme === 'night') {
    scatter(14, () => pine(0x2f6b45), 2.8, 1.4); scatter(14, () => mushroom([0x9cf0ff, 0xff9cf0, 0xb4ff9c][Math.floor(rand() * 3)]), 2, 0.5); scatter(7, () => lantern(true), 2.2, 0.8); scatter(6, () => rock(0x5a6a7a), 2, 0.6);
  } else if (theme === 'tower') {
    scatter(10, () => pillar(), 3, 1.6); scatter(10, () => crystalCluster([0xb69bff, 0x9bd4ff, 0xffd69b][Math.floor(rand() * 3)]), 2.2, 0.9); scatter(8, () => roundTree([0xf2c6e6, 0xe6b0dc, 0xffd6ef], 0x7a5a6a), 2.8, 1.6); scatter(6, () => lantern(true), 2.2, 0.8);
  } else if (theme === 'abyss') {
    scatter(2, () => pond(2 + rand()), 4.8, 3); scatter(12, () => coral([0xff9a8a, 0xffc36a, 0xb48aff][Math.floor(rand() * 3)]), 2.2, 0.8); scatter(10, () => crystalCluster(0x7fe6ff), 2.2, 0.9); scatter(8, () => rock(0x4f7a82), 2, 0.6);
  }
  /* ---------- each island's signature props (docs/十關島嶼3D設計規格.md) ---------- */
  const lift = (make, y) => () => { const o = make(), g = new THREE.Group(); o.position.y = y; g.add(o); return g; };
  const far = (x, z, r, obj, outline = 0.1) => { taken.push([x, z, r]); return place(obj, x, z, 0, outline); };
  if (theme === 'meadow') {
    scatter(5, P.mound, 2.6, 1.2); scatter(6, P.whiteFlowers, 2, 0.8); scatter(3, () => fence(3), 2.2, 1);
  } else if (theme === 'pond') {
    scatter(2, () => P.boardwalk(4), 3.4, 2.4); scatter(2, P.frogStatue, 2.4, 1); scatter(3, P.bubbles, 3, 1);
  } else if (theme === 'waterfall') {
    scatter(2, P.stoneSteps, 3, 2); scatter(8, P.daffodils, 2, 0.8); far(0, -12.8, 5, P.rainbow(), 0.01).scale.setScalar(1.7); scatter(1, P.petals, 3, 1);
  } else if (theme === 'orchard') {
    scatter(2, P.treehouse, 4, 3); scatter(2, () => P.ropeBridge(4), 3.4, 2.4);
  } else if (theme === 'forge') {
    scatter(4, P.teslaCoil, 2.6, 1.2); scatter(3, P.speakerStack, 2.4, 1); scatter(1, P.stageLights, 3.4, 2.4);
  } else if (theme === 'desert') {
    scatter(2, P.wagon, 3, 1.8); scatter(3, P.signpost, 2.2, 0.8); scatter(4, P.deadTree, 2.4, 0.9);
  } else if (theme === 'observatory') {
    scatter(2, () => P.magicCircle(2.3), 4.2, 3); scatter(1, P.starTowerSmall, 3.6, 2.4); group.add(P.shootingStar());
    for (let i = 0; i < 5; i++) { const sp = spot(2.4, 1.2, 40, false); if (sp) place(lift(P.floatRock, 1.4 + rand() * 1.6)(), sp[0], sp[1], undefined, 0.08); }
  } else if (theme === 'night') {
    scatter(6, P.twistedTree, 2.8, 1.6); scatter(4, P.mist, 3, 1.4, true, 0.01); group.add(P.bats(6));
  } else if (theme === 'tower') {
    far(0, -14.5, 6, P.plaza(3.6), 0.05); far(0, -14.5, 6, P.starTower(), 0.1);
    for (let i = 0; i < 5; i++) { const sp = spot(2.4, 1.4, 40, false); if (sp) place(lift(P.floatSlab, 0.8 + rand() * 2.2)(), sp[0], sp[1], undefined, 0.08); }
  } else if (theme === 'abyss') {
    scatter(1, P.dragonAltar, 4, 3); scatter(1, P.ruinArch, 3.6, 2.4); scatter(2, P.rift, 3.4, 2, true, 0.01); scatter(5, P.foamRock, 2.4, 1);
  }
  /* a ring of trees outside the field so the map never ends in bare grass */
  const outer = theme === 'night' ? () => pine(0x2a5a3c) : theme === 'forge' ? () => roundTree([0xc9a24a, 0xb88a3a]) : theme === 'tower' ? () => pillar() : theme === 'abyss' ? () => coral() : theme === 'desert' ? () => (rand() < 0.5 ? cactus() : mesa()) : theme === 'orchard' ? () => fruitTree() : () => roundTree();
  for (let i = 0; i < 46; i++) { const a = rand() * Math.PI * 2, x = Math.cos(a) * (19 + rand() * 9), z = Math.sin(a) * (12 + rand() * 7); if (taken.some((t) => Math.hypot(t[0] - x, t[1] - z) < t[2])) continue; place(outer(), x, z, undefined, 0.12); }

  /* grass tufts (instanced) and pebbles along the road */
  const tuftGeo = new THREE.ConeGeometry(0.08, 0.32, 4), tuft = new THREE.InstancedMesh(tuftGeo, toon(T.ground[1]), 900), dummy = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < 2600 && n < 900; i++) { const x = (rand() - 0.5) * 40, z = (rand() - 0.5) * 26; if (roadDistance(x, z) < 1.7) continue; dummy.position.set(x, 0.14, z); dummy.rotation.set((rand() - 0.5) * 0.4, rand() * 3, (rand() - 0.5) * 0.4); dummy.scale.setScalar(0.7 + rand() * 0.8); dummy.updateMatrix(); tuft.setMatrixAt(n++, dummy.matrix); }
  tuft.count = n; group.add(tuft);
  const pebble = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.09, 0), toon(0xd8ccb4), 500);
  let m = 0;
  for (let i = 0; i < pts.length && m < 500; i += 1) { if (rand() < 0.45) continue; const [x, z] = pts[i], a = rand() * Math.PI * 2, d = rand() * 1.0; dummy.position.set(x + Math.cos(a) * d, 0.07, z + Math.sin(a) * d); dummy.scale.set(1 + rand(), 0.4, 1 + rand()); dummy.rotation.set(0, rand() * 3, 0); dummy.updateMatrix(); pebble.setMatrixAt(m++, dummy.matrix); }
  pebble.count = m; group.add(pebble);

  /* fireflies at night */
  if (T.night) {
    const geo = new THREE.BufferGeometry(), count = 70, pos = new Float32Array(count * 3), seeds = [];
    for (let i = 0; i < count; i++) { seeds.push([(rand() - 0.5) * 36, 0.6 + rand() * 2.5, (rand() - 0.5) * 22, rand() * 6]); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts2 = new THREE.Points(geo, new THREE.PointsMaterial({color: 0xfff6a0, size: 0.22, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending}));
    group.add(pts2);
    animated.push((dt, t) => { seeds.forEach(([x, y, z, s], i) => { pos[i * 3] = x + Math.sin(t * 0.6 + s) * 0.8; pos[i * 3 + 1] = y + Math.sin(t * 1.3 + s * 2) * 0.3; pos[i * 3 + 2] = z + Math.cos(t * 0.5 + s) * 0.8; }); geo.attributes.position.needsUpdate = true; });
  }
  let t = 0;
  return {update(dt) { t += dt; for (const f of animated) f(dt, t); }};
}
