/* Signature props for the ten islands (docs/十關島嶼3D設計規格.md). Each prop is a small toon-shaded group in battle-field
   units (a tree is about 2 tall); the battle scenery (env.js) places them at full size and the sea chart
   (islands3d.js) places them scaled down. Effect meshes (glow, mist, rainbow, bats) are flagged isEffect so they skip the
   outline pass and never write depth. Animations are pushed onto `animated` as (dt, t) callbacks; nothing flashes. */
export function createIslandProps(THREE, kit, rand = Math.random, animated = []) {
  const T = THREE, {toon, linear} = kit;
  const box = (w, h, d, c) => new T.Mesh(new T.BoxGeometry(w, h, d), toon(c));
  const cyl = (rt, rb, h, c, s = 10) => new T.Mesh(new T.CylinderGeometry(rt, rb, h, s), toon(c));
  const ball = (r, c, s = 12) => new T.Mesh(new T.SphereGeometry(r, s, Math.max(6, s - 4)), toon(c));
  const cone = (r, h, c, s = 8) => new T.Mesh(new T.ConeGeometry(r, h, s), toon(c));
  const at = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
  const glow = (c, opacity = 0.5) => new T.MeshBasicMaterial({color: c, transparent: true, opacity, depthWrite: false});
  const fx = (m) => { m.userData.isEffect = true; return m; };
  const emissive = (c, k = 0.8) => toon(c, {emissive: linear(c), emissiveIntensity: k});

  const props = {
    /* 1 · 初光草原：grassy mounds, white flowers, a country sign */
    mound() { const g = new T.Group(), m = ball(1.3, 0x86d25f, 16); m.scale.set(1, 0.4, 1); g.add(at(m, 0, 0.1, 0)); return g; },
    whiteFlowers() {
      const g = new T.Group();
      for (let i = 0; i < 12; i++) {
        const f = new T.Group(); f.add(at(cyl(0.02, 0.02, 0.3, 0x4f9a3e, 4), 0, 0.15, 0));
        for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; f.add(at(ball(0.06, 0xffffff, 6), Math.cos(a) * 0.08, 0.32, Math.sin(a) * 0.08)); }
        f.add(at(ball(0.05, 0xffd84a, 6), 0, 0.33, 0)); g.add(at(f, (rand() - 0.5) * 1.2, 0, (rand() - 0.5) * 1.2));
      }
      return g;
    },
    /* 2 · 青蛙池塘：boardwalk, frog statue, drifting bubbles */
    boardwalk(len = 4) {
      const g = new T.Group();
      for (let i = 0; i < len * 2; i++) g.add(at(box(0.4, 0.07, 1.1, 0xb98a4e), i * 0.45 - len * 0.45, 0.28, 0));
      for (let i = 0; i <= len; i++) for (const s of [-0.52, 0.52]) g.add(at(cyl(0.05, 0.05, 0.6, 0x8a5a36, 6), i * 0.9 - len * 0.45, 0.3, s));
      for (const s of [-0.52, 0.52]) g.add(at(box(len * 0.9 + 0.2, 0.05, 0.05, 0x8a5a36), 0, 0.58, s));
      return g;
    },
    frogStatue() {
      const g = new T.Group(); g.add(at(cyl(0.5, 0.58, 0.3, 0xb8b2a6, 10), 0, 0.15, 0));
      const body = ball(0.36, 0xa7b59c); body.scale.set(1, 0.8, 1.1); g.add(at(body, 0, 0.6, 0));
      for (const s of [-1, 1]) { g.add(at(ball(0.12, 0xdfe6d8, 8), s * 0.16, 0.86, 0.14)); g.add(at(ball(0.05, 0x333333, 6), s * 0.16, 0.88, 0.24)); }
      return g;
    },
    bubbles() {
      const g = new T.Group(), list = [];
      for (let i = 0; i < 7; i++) { const b = fx(new T.Mesh(new T.SphereGeometry(0.1 + rand() * 0.12, 10, 8), glow(0xffffff, 0.4))); b.userData.ph = rand(); list.push(b); g.add(b); }
      animated.push((dt, t) => list.forEach((b, i) => { const k = (t * 0.18 + b.userData.ph) % 1; b.position.set(Math.sin(t + i * 2) * 0.5, 0.3 + k * 2.4, Math.cos(t * 0.8 + i) * 0.5); b.material.opacity = 0.45 * (1 - k); }));
      return g;
    },
    /* 3 · 水仙瀑布：narcissus beds, stone steps, a rainbow in the mist, falling petals */
    daffodils() {
      const g = new T.Group();
      for (let i = 0; i < 9; i++) {
        const f = new T.Group(); f.add(at(cyl(0.02, 0.025, 0.4, 0x5aa84a, 4), 0, 0.2, 0));
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; f.add(at(ball(0.07, 0xffffff, 6), Math.cos(a) * 0.1, 0.42, Math.sin(a) * 0.1)); }
        f.add(at(cyl(0.06, 0.05, 0.1, 0xffd84a, 8), 0, 0.44, 0)); g.add(at(f, (rand() - 0.5) * 1.3, 0, (rand() - 0.5) * 1.3));
      }
      return g;
    },
    stoneSteps() { const g = new T.Group(); for (let i = 0; i < 4; i++) g.add(at(box(2.2 - i * 0.2, 0.22, 0.9, [0xa9b0ba, 0x9aa1ac][i % 2]), 0, 0.11 + i * 0.22, -i * 0.7)); return g; },
    rainbow() {
      const g = new T.Group(), cols = [0xff6b6b, 0xffb347, 0xfff176, 0x7bd88f, 0x6bc5ff];
      cols.forEach((c, i) => { const a = fx(new T.Mesh(new T.TorusGeometry(2.6 - i * 0.16, 0.08, 6, 36, Math.PI), glow(c, 0.38))); g.add(a); });
      animated.push((dt, t) => { g.children.forEach((a, i) => { a.material.opacity = 0.32 + Math.sin(t * 0.8 + i * 0.4) * 0.06; }); });
      return g;
    },
    petals() {
      const g = new T.Group(), list = [];
      for (let i = 0; i < 14; i++) { const p = fx(new T.Mesh(new T.CircleGeometry(0.07, 6), new T.MeshBasicMaterial({color: i % 2 ? 0xffffff : 0xffe98a, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide}))); p.userData.ph = rand(); list.push(p); g.add(p); }
      animated.push((dt, t) => list.forEach((p, i) => { const k = (t * 0.12 + p.userData.ph) % 1; p.position.set(Math.sin(t * 0.7 + i) * 1.3, 2.4 - k * 2.3, Math.cos(t * 0.5 + i * 1.7) * 1.3); p.rotation.set(t + i, t * 0.7, 0); }));
      return g;
    },
    /* 4 · 猴王果園：a treehouse, a rope bridge, hanging fruit */
    treehouse() {
      const g = new T.Group(), trunk = cyl(0.38, 0.52, 2.6, 0x8a5a36, 9); g.add(at(trunk, 0, 1.3, 0));
      g.add(at(ball(1.2, 0x5cb84a, 14), 0, 3.0, 0)); g.add(at(ball(0.8, 0x74c95a, 12), 0.7, 3.3, 0.3));
      g.add(at(cyl(1.1, 1.1, 0.14, 0xb98a4e, 10), 0, 1.9, 0));
      g.add(at(box(1.0, 0.8, 0.9, 0xd9a15a), 0, 2.4, 0));
      const roof = cone(0.9, 0.55, 0xc0463a, 4); roof.rotation.y = Math.PI / 4; g.add(at(roof, 0, 3.05, 0));
      g.add(at(box(0.26, 0.4, 0.05, 0x6b4428), 0, 2.28, 0.47));
      for (let i = 0; i < 6; i++) g.add(at(box(0.5, 0.05, 0.05, 0xb5823e), 0.55, 0.3 + i * 0.3, 0.9));
      for (const s of [-1, 1]) g.add(at(box(0.05, 1.9, 0.05, 0xb5823e), 0.55 + s * 0.26, 0.95, 0.9));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(at(ball(0.1, [0xff5a4a, 0xffa53a][i % 2], 8), Math.cos(a) * 1.0, 2.9 + (i % 2) * 0.3, Math.sin(a) * 1.0)); }
      return g;
    },
    ropeBridge(len = 4) {
      const g = new T.Group();
      for (const x of [-len / 2, len / 2]) { g.add(at(cyl(0.1, 0.12, 1.1, 0x8a5a36, 6), x, 0.55, -0.45)); g.add(at(cyl(0.1, 0.12, 1.1, 0x8a5a36, 6), x, 0.55, 0.45)); }
      const n = len * 3;
      for (let i = 0; i <= n; i++) { const k = i / n, x = (k - 0.5) * len, sag = Math.sin(k * Math.PI) * -0.3 + 0.95; g.add(at(box(0.3, 0.05, 1.0, 0xb98a4e), x, sag - 0.4, 0)); }
      for (const z of [-0.45, 0.45]) for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; g.add(at(box(len / n + 0.02, 0.04, 0.04, 0xcdb58a), (k - 0.5) * len, Math.sin(k * Math.PI) * -0.3 + 1.2, z)); }
      return g;
    },
    /* 5 · 雷鳴工坊：tesla coils, speaker stacks, stage lights */
    teslaCoil() {
      const g = new T.Group(); g.add(at(cyl(0.5, 0.6, 0.35, 0x5a5f78, 10), 0, 0.18, 0));
      for (let i = 0; i < 4; i++) { const r = new T.Mesh(new T.TorusGeometry(0.34 - i * 0.05, 0.07, 6, 14), toon(0xc7a05a)); r.rotation.x = Math.PI / 2; g.add(at(r, 0, 0.55 + i * 0.3, 0)); }
      g.add(at(cyl(0.07, 0.07, 1.7, 0x8f93a8, 6), 0, 1.15, 0));
      const orb = new T.Mesh(new T.SphereGeometry(0.3, 14, 10), toon(0x7fc9ff, {emissive: linear(0x4aa8ff), emissiveIntensity: 0.9})); g.add(at(orb, 0, 2.15, 0));
      const halo = fx(new T.Mesh(new T.SphereGeometry(0.5, 12, 8), glow(0x8fd2ff, 0.2))); g.add(at(halo, 0, 2.15, 0));
      animated.push((dt, t) => { orb.material.emissiveIntensity = 0.75 + Math.sin(t * 2.2) * 0.2; halo.scale.setScalar(1 + Math.sin(t * 2.2) * 0.08); });
      return g;
    },
    speakerStack() {
      const g = new T.Group();
      for (const [y, w] of [[0.5, 1.0], [1.45, 0.8]]) {
        g.add(at(box(w, 0.9, 0.7, 0x2c2a38), 0, y, 0));
        for (const dy of [-0.18, 0.2]) { const cone = cyl(0.22, 0.22, 0.06, 0x9a9ab8, 14); cone.rotation.x = Math.PI / 2; g.add(at(cone, 0, y + dy, 0.37)); cone.rotation.x = Math.PI / 2; }
      }
      return g;
    },
    stageLights() {
      const g = new T.Group();
      for (const x of [-1, 1]) g.add(at(cyl(0.06, 0.07, 3, 0x3a3a48, 6), x * 1.5, 1.5, 0));
      g.add(at(box(3.2, 0.1, 0.1, 0x3a3a48), 0, 3, 0));
      [0xff4fd8, 0xe7ff3a, 0x5fd0ff].forEach((c, i) => {
        g.add(at(cyl(0.12, 0.2, 0.3, 0x2c2a38, 8), (i - 1) * 1.0, 2.85, 0.1));
        const beam = fx(new T.Mesh(new T.ConeGeometry(0.5, 2.6, 12, 1, true), glow(c, 0.13))); beam.position.set((i - 1) * 1.0, 1.5, 0.1); g.add(beam);
        animated.push((dt, t) => { beam.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.25; });
      });
      return g;
    },
    /* 6 · 牛仔荒野：wagon, signpost, dead tree */
    wagon() {
      const g = new T.Group(); g.add(at(box(1.6, 0.4, 0.9, 0xa86e3a), 0, 0.7, 0));
      for (const x of [-0.6, 0.6]) for (const z of [-0.5, 0.5]) { const w = cyl(0.36, 0.36, 0.1, 0x6b4428, 12); w.rotation.x = Math.PI / 2; g.add(at(w, x, 0.4, z)); }
      const top = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 1.5, 12, 1, false, 0, Math.PI), toon(0xf1e4c4)); top.rotation.z = Math.PI / 2; top.rotation.y = Math.PI / 2; top.rotation.x = Math.PI; g.add(at(top, 0, 1.0, 0));
      g.add(at(box(0.9, 0.06, 0.06, 0x6b4428), 1.2, 0.55, 0));
      return g;
    },
    signpost() {
      const g = new T.Group(); g.add(at(cyl(0.08, 0.1, 1.7, 0x6b4428, 6), 0, 0.85, 0));
      const a = box(1.0, 0.3, 0.07, 0xd9a15a); g.add(at(a, 0.3, 1.5, 0.08, 0.1)); const b = box(0.9, 0.3, 0.07, 0xc0804a); g.add(at(b, -0.25, 1.1, 0.08, -0.15));
      return g;
    },
    deadTree() {
      const g = new T.Group(); g.add(at(cyl(0.12, 0.22, 1.7, 0x6b5440, 6), 0, 0.85, 0));
      for (const [y, rz, len] of [[1.3, 0.9, 0.8], [1.0, -1.0, 0.7], [1.6, 0.4, 0.5]]) { const b = cyl(0.04, 0.07, len, 0x6b5440, 5); b.rotation.z = rz; g.add(at(b, Math.sin(rz) * -0.3, y + 0.2, 0)); }
      return g;
    },
    /* 7 · 星輝觀星台：star-plate floor, floating stones, star tower, shooting star */
    magicCircle(r = 2.6) {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      x.translate(128, 128); x.strokeStyle = 'rgba(255,214,102,.95)'; x.fillStyle = 'rgba(80,110,220,.22)'; x.lineWidth = 4;
      x.beginPath(); x.arc(0, 0, 120, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.arc(0, 0, 96, 0, 7); x.stroke();
      x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5; x.lineTo(Math.cos(a) * 92, Math.sin(a) * 92); } x.closePath(); x.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.beginPath(); x.arc(Math.cos(a) * 108, Math.sin(a) * 108, 5, 0, 7); x.fillStyle = 'rgba(255,230,140,.95)'; x.fill(); }
      const tex = new T.CanvasTexture(c), m = fx(new T.Mesh(new T.CircleGeometry(r, 40), new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false})));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.05; const g = new T.Group(); g.add(m);
      animated.push((dt) => { m.rotation.z += dt * 0.08; });
      return g;
    },
    floatRock() {
      const g = new T.Group(), r = new T.Mesh(new T.DodecahedronGeometry(0.55, 0), toon(0x8a86b4)); r.scale.y = 0.7; g.add(r);
      g.add(at(cone(0.16, 0.5, 0xffd86a, 5), 0, 0.5, 0)); const base = g.position.y;
      const ph = rand() * 6; animated.push((dt, t) => { r.position.y = Math.sin(t * 0.9 + ph) * 0.12; });
      g.userData.floatBase = base; return g;
    },
    starTowerSmall() {
      const g = new T.Group();
      for (let i = 0; i < 4; i++) g.add(at(cyl(0.7 - i * 0.12, 0.8 - i * 0.12, 0.9, [0x2f4a8a, 0xd9b45a][i % 2], 10), 0, 0.45 + i * 0.9, 0));
      const star = new T.Mesh(new T.OctahedronGeometry(0.3, 0), toon(0xffe27a, {emissive: linear(0xffd04a), emissiveIntensity: 0.8})); g.add(at(star, 0, 4.2, 0));
      animated.push((dt) => { star.rotation.y += dt; }); return g;
    },
    shootingStar() {
      const g = new T.Group(), head = fx(new T.Mesh(new T.SphereGeometry(0.12, 8, 6), glow(0xfff6c0, 0.95))), tail = fx(new T.Mesh(new T.ConeGeometry(0.1, 1.4, 8, 1, true), glow(0xbcd0ff, 0.3)));
      tail.rotation.z = -Math.PI / 2; tail.position.x = -0.7; g.add(head, tail);
      animated.push((dt, t) => { const k = (t * 0.12) % 1; g.position.set(-9 + k * 18, 7 - k * 3.4, -7); g.visible = k < 0.5; });
      return g;
    },
    /* 8 · 月影森林：twisted trees, ground mist, a bat flock, dead wood */
    twistedTree() {
      const g = new T.Group(); let x = 0, z = 0;
      for (let i = 0; i < 6; i++) { const seg = cyl(0.22 - i * 0.025, 0.28 - i * 0.025, 0.55, 0x4a3a5a, 7); seg.rotation.z = Math.sin(i * 1.3) * 0.35; seg.rotation.x = Math.cos(i * 1.1) * 0.25; x += Math.sin(i * 1.3) * 0.12; z += Math.cos(i * 1.1) * 0.08; g.add(at(seg, x, 0.3 + i * 0.5, z)); }
      for (const [dx, dy, r, c] of [[0, 3.4, 0.9, 0x2f5a52], [0.6, 3.1, 0.6, 0x3a6a5a], [-0.6, 3.2, 0.6, 0x28524a]]) g.add(at(ball(r, c, 10), x + dx, dy, z));
      for (const s of [-1, 1]) { const b = cyl(0.04, 0.08, 1, 0x4a3a5a, 5); b.rotation.z = s * 1.0; g.add(at(b, x + s * 0.4, 2.7, z)); }
      return g;
    },
    mist() {
      const g = new T.Group(), list = [];
      for (let i = 0; i < 5; i++) { const m = fx(new T.Mesh(new T.SphereGeometry(0.9 + rand() * 0.5, 10, 6), glow(0x8dff9a, 0.16))); m.scale.y = 0.22; m.position.set((rand() - 0.5) * 2.4, 0.2, (rand() - 0.5) * 2.4); m.userData.ph = rand() * 6; list.push(m); g.add(m); }
      animated.push((dt, t) => list.forEach((m) => { m.position.x += Math.sin(t * 0.3 + m.userData.ph) * dt * 0.12; m.material.opacity = 0.14 + Math.sin(t * 0.7 + m.userData.ph) * 0.04; }));
      return g;
    },
    bats(n = 5) {
      const g = new T.Group(), list = [], mat = new T.MeshBasicMaterial({color: 0x120f22, side: T.DoubleSide, depthWrite: false});
      const shape = new T.Shape(); shape.moveTo(0, 0); shape.lineTo(-0.5, 0.18); shape.lineTo(-0.3, -0.02); shape.lineTo(-0.15, 0.1); shape.lineTo(0, -0.1); shape.lineTo(0.15, 0.1); shape.lineTo(0.3, -0.02); shape.lineTo(0.5, 0.18); shape.closePath();
      for (let i = 0; i < n; i++) { const b = fx(new T.Mesh(new T.ShapeGeometry(shape), mat)); b.userData.ph = rand() * 6; b.userData.r = 2.5 + rand() * 3; b.userData.h = 4 + rand() * 2; list.push(b); g.add(b); }
      animated.push((dt, t) => list.forEach((b, i) => { const a = t * (0.25 + i * 0.03) + b.userData.ph; b.position.set(Math.cos(a) * b.userData.r, b.userData.h + Math.sin(t * 1.3 + i) * 0.2, Math.sin(a) * b.userData.r * 0.6); b.rotation.set(0.5, -a, Math.sin(t * 9 + i) * 0.5); }));
      return g;
    },
    /* 9 · 星穹塔下：the star tower, a coloured energy plaza, floating slabs */
    starTower() {
      const g = new T.Group(), cols = [0xd7c8f2, 0xf2b6cf, 0xbfe0ff, 0xf6e3a6, 0xd7c8f2];
      for (let i = 0; i < 5; i++) { g.add(at(cyl(1.15 - i * 0.16, 1.25 - i * 0.16, 1.3, cols[i], 12), 0, 0.65 + i * 1.3, 0)); g.add(at(cyl(1.28 - i * 0.16, 1.28 - i * 0.16, 0.12, 0x8a7ad8, 12), 0, 1.3 + i * 1.3, 0)); }
      const dome = new T.Mesh(new T.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x8a7ad8)); g.add(at(dome, 0, 6.5, 0));
      const star = new T.Mesh(new T.OctahedronGeometry(0.4, 0), toon(0xffe27a, {emissive: linear(0xffc83a), emissiveIntensity: 0.8})); g.add(at(star, 0, 7.5, 0));
      animated.push((dt, t) => { star.rotation.y += dt * 0.8; star.position.y = 7.5 + Math.sin(t * 1.4) * 0.12; }); return g;
    },
    plaza(r = 3.2) {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.translate(128, 128);
      const cols = ['#ff8fb8', '#ffd86a', '#8fe0a8', '#7fc0ff', '#c59aff', '#ffb27a'];
      for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 124, i / 12 * 6.2832, (i + 1) / 12 * 6.2832); x.fillStyle = cols[i % 6]; x.globalAlpha = 0.5; x.fill(); }
      x.globalAlpha = 1; x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 5; for (const rr of [118, 80, 42]) { x.beginPath(); x.arc(0, 0, rr, 0, 7); x.stroke(); }
      const tex = new T.CanvasTexture(c), m = fx(new T.Mesh(new T.CircleGeometry(r, 40), new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false})));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.06; const g = new T.Group(); g.add(at(cyl(r + 0.15, r + 0.2, 0.1, 0xe9e2f6, 28), 0, 0.03, 0), m);
      animated.push((dt) => { m.rotation.z += dt * 0.1; }); return g;
    },
    floatSlab() {
      const g = new T.Group(), s = box(1.5, 0.24, 1.5, [0xd7c8f2, 0xf2c6e6, 0xbfe0ff][Math.floor(rand() * 3)]); g.add(s);
      g.add(at(box(0.5, 0.03, 0.5, 0xffe27a), 0, 0.14, 0)); const ph = rand() * 6; animated.push((dt, t) => { s.position.y = Math.sin(t * 0.8 + ph) * 0.12; }); return g;
    },
    /* 10 · 水蛟深淵：dragon altar, sea-god arch, a glowing rift, storm rocks with foam */
    dragonAltar() {
      const g = new T.Group();
      g.add(at(cyl(1.5, 1.7, 0.3, 0x3f6a7a, 8), 0, 0.15, 0)); g.add(at(cyl(1.1, 1.3, 0.3, 0x4f7f90, 8), 0, 0.45, 0));
      for (let i = 0; i < 3; i++) { const seg = new T.Mesh(new T.TorusGeometry(0.5, 0.14, 8, 16, Math.PI), toon(0x3d8fd8)); seg.rotation.y = Math.PI / 2; g.add(at(seg, -0.8 + i * 0.8, 0.62, 0)); }
      const head = ball(0.26, 0x3d8fd8); g.add(at(head, 1.2, 0.95, 0)); g.add(at(cone(0.07, 0.3, 0xffe27a, 6), 1.2, 1.28, 0.08));
      const orb = new T.Mesh(new T.SphereGeometry(0.34, 14, 10), toon(0x7fe6ff, {emissive: linear(0x4acaf0), emissiveIntensity: 0.9})); g.add(at(orb, 0, 1.4, 0));
      const halo = fx(new T.Mesh(new T.SphereGeometry(0.6, 12, 8), glow(0x7fe6ff, 0.18))); g.add(at(halo, 0, 1.4, 0));
      animated.push((dt, t) => { orb.material.emissiveIntensity = 0.7 + Math.sin(t * 1.6) * 0.2; halo.scale.setScalar(1 + Math.sin(t * 1.6) * 0.1); orb.position.y = halo.position.y = 1.4 + Math.sin(t * 1.1) * 0.08; });
      return g;
    },
    ruinArch() {
      const g = new T.Group();
      for (const s of [-1, 1]) { g.add(at(cyl(0.3, 0.36, 2.4, 0x5f8892, 8), s * 1.1, 1.2, 0)); g.add(at(box(0.9, 0.2, 0.9, 0x6f98a2), s * 1.1, 0.1, 0)); }
      const arch = new T.Mesh(new T.TorusGeometry(1.1, 0.26, 8, 18, Math.PI), toon(0x5f8892)); g.add(at(arch, 0, 2.4, 0));
      g.add(at(ball(0.18, 0x7fe6ff, 8), 0, 3.65, 0)); return g;
    },
    rift() {
      const g = new T.Group(), dark = fx(new T.Mesh(new T.PlaneGeometry(3.6, 0.9), new T.MeshBasicMaterial({color: 0x04101c, transparent: true, opacity: 0.92, depthWrite: false})));
      dark.rotation.x = -Math.PI / 2; dark.position.y = 0.05; g.add(dark);
      const edge = fx(new T.Mesh(new T.PlaneGeometry(3.9, 1.15), glow(0x3ac8ff, 0.28))); edge.rotation.x = -Math.PI / 2; edge.position.y = 0.04; g.add(edge);
      animated.push((dt, t) => { edge.material.opacity = 0.22 + Math.sin(t * 1.2) * 0.07; }); return g;
    },
    foamRock() {
      const g = new T.Group(), r = new T.Mesh(new T.DodecahedronGeometry(0.7, 0), toon(0x35566a)); r.scale.y = 0.9; g.add(at(r, 0, 0.5, 0));
      const foam = fx(new T.Mesh(new T.RingGeometry(0.75, 1.2, 20), glow(0xffffff, 0.6))); foam.rotation.x = -Math.PI / 2; foam.position.y = 0.06; g.add(foam);
      const ph = rand() * 6; animated.push((dt, t) => { foam.scale.setScalar(1 + Math.sin(t * 1.6 + ph) * 0.1); }); return g;
    },
  };
  return props;
}
