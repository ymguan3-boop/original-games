/* The PK island on the sea chart: a small sandy island carrying a Roman colosseum (two tiers of arches round a sand
   arena, the taller far side half-ruined like the real one), red banners, and big gold "PK" letters floating above it.
   Built with plain Three.js primitives and the game's toon kit at run time; animate() bobs and spins the letters. */
export function createPkIsland(T, kit) {
  const g = new T.Group(), M = (hex) => kit.toon(hex);
  const STONE = 0xead6ad, STONE_DARK = 0xc9a874, SAND = 0xf3dfa8, GRASS = 0x8fd46a, ROCK = 0xb08a5e, RED = 0xd8463c, GOLD = 0xffc83d;
  const add = (geo, hex, x = 0, y = 0, z = 0, parent = g) => { const m = new T.Mesh(geo, M(hex)); m.position.set(x, y, z); parent.add(m); return m; };

  /* the island: rocky base, grass top, sand apron */
  add(new T.CylinderGeometry(2.55, 2.1, 0.55, 28), ROCK, 0, 0.0, 0);
  add(new T.CylinderGeometry(2.6, 2.55, 0.16, 28), GRASS, 0, 0.33, 0);
  add(new T.CylinderGeometry(2.05, 2.05, 0.06, 28), SAND, 0, 0.43, 0);

  /* the colosseum: solid travertine tiers ringed with dark arch openings; the far side stands three tiers high, the near
     side is low and broken so the arena shows */
  const col = new T.Group(); col.position.y = 0.46; g.add(col);
  const R = 1.78, TIER = 0.46, SHADOW = 0x6b4a2e;
  const tierArc = [[0, Math.PI * 2], [Math.PI * 0.3, Math.PI * 1.4], [Math.PI * 0.55, Math.PI * 0.9]];
  const archBody = new T.BoxGeometry(0.17, 0.24, 0.06), archTop = new T.CylinderGeometry(0.085, 0.085, 0.06, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
  tierArc.forEach(([start, len], t) => {
    const wall = add(new T.CylinderGeometry(R - t * 0.06, R - t * 0.06 + 0.02, TIER, 48, 1, true, start, len), t % 2 ? STONE_DARK : STONE, 0, TIER / 2 + t * TIER, 0, col);
    wall.material = M(t % 2 ? STONE_DARK : STONE).clone(); wall.material.side = T.DoubleSide;
    const cap = add(new T.TorusGeometry(R - t * 0.06 + 0.03, 0.04, 5, 48, len), STONE, 0, (t + 1) * TIER, 0, col); cap.rotation.x = Math.PI / 2; cap.rotation.z = -(start + len) + Math.PI / 2;
    const n = Math.max(2, Math.round(len / (Math.PI * 2) * 22));
    for (let i = 0; i < n; i++) {
      const a = start + (i + 0.5) / n * len, r = R - t * 0.06 + 0.02, arch = new T.Group();
      arch.position.set(Math.sin(a) * r, t * TIER + 0.2, Math.cos(a) * r); arch.rotation.y = a; col.add(arch);
      add(archBody, SHADOW, 0, 0, 0, arch); add(archTop, SHADOW, 0, 0.12, 0, arch);
    }
  });
  /* seating: stepped rings inside, and the sand arena floor */
  for (let k = 0; k < 4; k++) add(new T.CylinderGeometry(R - 0.1 - k * 0.18, R - 0.1 - k * 0.18, 0.12, 40), k % 2 ? STONE : STONE_DARK, 0, 0.4 - k * 0.11, 0, col);
  add(new T.CylinderGeometry(1.0, 1.0, 0.05, 32), SAND, 0, 0.05, 0, col);
  /* crossed spears in the arena */
  for (const s of [-1, 1]) { const sp = add(new T.CylinderGeometry(0.025, 0.025, 1.0, 6), 0x7a4a24, 0, 0.5, 0, col); sp.rotation.z = s * 0.55; const tip = add(new T.ConeGeometry(0.06, 0.18, 8), 0xdfe6ee, 0, 0.5, 0, sp); tip.position.y = 0.55; }

  /* banners on poles round the rim */
  for (const a of [Math.PI * 0.75, Math.PI * 1.25, Math.PI * 0.25, Math.PI * 1.75]) {
    const x = Math.sin(a) * (R + 0.05), z = Math.cos(a) * (R + 0.05), back = Math.cos(a - Math.PI), top = (back > 0.55 ? 3 : back > -0.2 ? 2 : 1) * TIER;
    add(new T.CylinderGeometry(0.03, 0.03, 0.75, 6), 0x7a4a24, x, top + 0.3, z, col);
    const flag = add(new T.BoxGeometry(0.34, 0.22, 0.02), RED, x + 0.17, top + 0.55, z, col); flag.userData.flag = true;
  }

  /* "PK" in big gold block letters above the arena, facing the viewer (billboard) */
  const sign = new T.Group(); sign.position.y = 3.2; sign.userData.billboard = true; g.add(sign);
  const bar = (w, h, x, y, rz = 0, parent) => { const m = add(new T.BoxGeometry(w, h, 0.26), GOLD, x, y, 0, parent); m.rotation.z = rz; return m; };
  const P = new T.Group(); P.position.x = -0.62; sign.add(P);
  bar(0.24, 1.2, -0.3, 0, 0, P); bar(0.62, 0.22, 0.01, 0.49, 0, P); bar(0.62, 0.22, 0.01, 0.01, 0, P); bar(0.22, 0.6, 0.3, 0.25, 0, P);
  const K = new T.Group(); K.position.x = 0.58; sign.add(K);
  bar(0.24, 1.2, -0.3, 0, 0, K); bar(0.22, 0.72, 0.06, 0.27, -0.72, K); bar(0.22, 0.72, 0.06, -0.27, 0.72, K);
  /* a red shield plate behind the letters */
  const plate = add(new T.CylinderGeometry(1.25, 1.25, 0.1, 6).rotateX(Math.PI / 2), RED, 0, 0, -0.18, sign); plate.rotation.z = Math.PI / 6;
  const rim = add(new T.TorusGeometry(1.25, 0.07, 6, 6), GOLD, 0, 0, -0.18, sign); rim.rotation.z = Math.PI / 6;
  kit.toonify(g, {outline: 0.035});

  let t = 0;
  return {group: g, animate(dt) {
    t += dt; sign.position.y = 3.2 + Math.sin(t * 1.6) * 0.12;
    g.traverse((o) => { if (o.userData.flag) o.rotation.y = Math.sin(t * 3 + o.position.x) * 0.35; });
  }};
}
