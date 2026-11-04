/* 3D island models for the 幻靈群島 sea chart: one small toon-shaded, outlined diorama per stage built from its
   scene (barn and windmill, frog pond, waterfall cliff, orchard, smoking forge houses, desert mesa and cacti,
   observatory dome, moonlit pines, the star tower, the sea-dragon abyss). Each is rendered once to a transparent
   model. This file is the SOURCE of the chart's models: tools/bake-chart-models.mjs builds them here and writes the GLB files in
   defense/models/ that the game loads (the game itself does not run this file). Boss cards come from island-cards.js. */
import {THEMES} from './env.js?v=20261105-v18';
import {createIslandProps} from './island-props.js?v=20261105-v18';

export function createIslandBuilder(THREE, kit) {
  const T = THREE, {toon, toonify} = kit;
  const box = (w, h, d, c) => new T.Mesh(new T.BoxGeometry(w, h, d), toon(c));
  const cyl = (rt, rb, h, c, s = 10) => new T.Mesh(new T.CylinderGeometry(rt, rb, h, s), toon(c));
  const ball = (r, c, s = 12) => new T.Mesh(new T.SphereGeometry(r, s, Math.max(6, s - 4)), toon(c));
  const cone = (r, h, c, s = 8) => new T.Mesh(new T.ConeGeometry(r, h, s), toon(c));
  const at = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
  const tree = (c = 0x5fbf4a, trunk = 0x8a5a36) => { const g = new T.Group(); g.add(at(cyl(0.07, 0.09, 0.5, trunk, 6), 0, 0.25, 0)); g.add(at(ball(0.34, c), 0, 0.72, 0)); g.add(at(ball(0.24, c), 0.18, 0.62, 0.1)); return g; };
  const pine = (c = 0x2f6a46) => { const g = new T.Group(); g.add(at(cyl(0.05, 0.06, 0.3, 0x5a3a24, 6), 0, 0.15, 0)); for (let i = 0; i < 3; i++) g.add(at(cone(0.34 - i * 0.08, 0.42, c), 0, 0.42 + i * 0.24, 0)); return g; };
  const house = (wall, roof) => { const g = new T.Group(); g.add(at(box(0.7, 0.5, 0.6, wall), 0, 0.25, 0)); const r = cone(0.56, 0.36, roof, 4); r.rotation.y = Math.PI / 4; r.scale.z = 0.85; g.add(at(r, 0, 0.68, 0)); return g; };

  /* the island: a jagged grass top over a sand rim, sitting in a ring of shallow water and foam */
  function base(theme) {
    const g = new T.Group(), th = THEMES[theme] || THEMES.meadow;
    const shallow = new T.Mesh(new T.CircleGeometry(2.55, 28), new T.MeshBasicMaterial({color: 0x7fd8f0, transparent: true, opacity: 0.55, depthWrite: false})); shallow.rotation.x = -Math.PI / 2; shallow.position.y = -0.02; shallow.userData.isEffect = true; g.add(shallow);
    const sandGeo = new T.CylinderGeometry(2.05, 2.3, 0.36, 18), grassGeo = new T.CylinderGeometry(1.7, 1.95, 0.3, 16);
    for (const geo of [sandGeo, grassGeo]) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + Math.sin(a * 3 + theme.length) * 0.07 + Math.sin(a * 7) * 0.04; p.setX(i, x * k); p.setZ(i, z * k * 0.82); } geo.computeVertexNormals(); }
    g.add(at(new T.Mesh(sandGeo, toon(0xf0d9a0)), 0, -0.02, 0));
    g.add(at(new T.Mesh(grassGeo, toon(th.ground[0])), 0, 0.28, 0));
    return {g, top: 0.43};
  }

  const BUILD = {
    meadow(g, y) {
      const barn = house(0xd8483b, 0x7a3a2a); barn.scale.setScalar(1.2); g.add(at(barn, -0.6, y, -0.2, 0.4));
      const mill = new T.Group(); mill.add(at(cyl(0.18, 0.26, 1, 0xf3ead8), 0, 0.5, 0)); mill.add(at(cone(0.26, 0.3, 0xb5523b), 0, 1.15, 0));
      const hub = new T.Group(); for (let i = 0; i < 4; i++) { const b = box(0.1, 0.62, 0.03, 0xf8f0dc); b.position.y = 0.32; const arm = new T.Group(); arm.rotation.z = i * Math.PI / 2 + 0.4; arm.add(b); hub.add(arm); } hub.position.set(0, 0.95, 0.24); mill.add(hub);
      g.add(at(mill, 0.65, y, -0.1, -0.3));
      for (const [x, z] of [[-0.2, 0.75], [0.9, 0.6]]) g.add(at(cyl(0.18, 0.2, 0.26, 0xf0c95a), x, y + 0.13, z));
      g.add(at(tree(), -1.25, y, 0.4)); g.add(at(tree(0x6fcf55), 1.3, y, -0.5));
    },
    pond(g, y) {
      const pond = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 0.05, 20), toon(0x4fbde8)); g.add(at(pond, 0.1, y + 0.02, 0.05));
      for (const [x, z] of [[-0.2, 0.2], [0.4, -0.2], [0.25, 0.4]]) { const pad = cyl(0.13, 0.13, 0.02, 0x5fb84a, 10); g.add(at(pad, x, y + 0.06, z)); }
      const frog = new T.Group(); frog.add(at(ball(0.2, 0x6fcf55), 0, 0.16, 0)); for (const s of [-1, 1]) { frog.add(at(ball(0.07, 0xffffff), s * 0.09, 0.32, 0.08)); frog.add(at(ball(0.035, 0x222222), s * 0.09, 0.33, 0.14)); }
      g.add(at(frog, 0.95, y, 0.55, -0.6)); const f2 = frog.clone(); f2.scale.setScalar(0.7); g.add(at(f2, 0.4, y + 0.04, -0.2, 0.4));
      for (let i = 0; i < 5; i++) g.add(at(cyl(0.02, 0.02, 0.45, 0x5a8a3a, 4), -0.75 + i * 0.07, y + 0.22, -0.45 + (i % 2) * 0.1));
      g.add(at(tree(), -1.2, y, 0.3)); g.add(at(tree(0x58b04a), 1.25, y, -0.55));
    },
    waterfall(g, y) {
      for (let i = 0; i < 6; i++) { const r = new T.Mesh(new T.DodecahedronGeometry(0.42 + (i % 3) * 0.08, 0), toon([0x8f96a2, 0x7d8592, 0xa3aab4][i % 3])); g.add(at(r, -0.9 + (i % 3) * 0.6, y + 0.3 + Math.floor(i / 3) * 0.55, -0.6 - Math.floor(i / 3) * 0.12)); }
      const fall = new T.Mesh(new T.PlaneGeometry(0.42, 1.1), new T.MeshBasicMaterial({color: 0xbfeeff})); fall.userData.isEffect = true; g.add(at(fall, -0.3, y + 0.6, -0.25));
      g.add(at(cyl(0.5, 0.52, 0.05, 0x5cc4f0, 18), -0.3, y + 0.03, 0.25));
      g.add(at(tree(0x58b04a), 1.0, y, 0.2)); g.add(at(tree(), 0.75, y, -0.6));
    },
    orchard(g, y) {
      for (const [x, z] of [[-0.8, -0.2], [0.1, -0.5], [0.85, 0.05], [-0.25, 0.55]]) { const t = tree(0x62bd4c); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; t.add(at(ball(0.06, 0xff4a3a, 8), Math.cos(a) * 0.3, 0.72 + (i % 2) * 0.12, Math.sin(a) * 0.3)); } g.add(at(t, x, y, z)); }
      const basket = new T.Group(); basket.add(at(cyl(0.18, 0.14, 0.16, 0xb5823e), 0, 0.08, 0)); for (let i = 0; i < 3; i++) basket.add(at(ball(0.06, 0xff4a3a, 8), (i - 1) * 0.08, 0.18, 0)); g.add(at(basket, 0.65, y, 0.7));
      const ladder = new T.Group(); for (const x of [-0.09, 0.09]) ladder.add(at(box(0.03, 0.8, 0.03, 0xb5823e), x, 0.4, 0)); for (let i = 0; i < 4; i++) ladder.add(at(box(0.2, 0.025, 0.025, 0xb5823e), 0, 0.12 + i * 0.2, 0)); ladder.rotation.x = -0.3; g.add(at(ladder, 0.3, y, -0.1));
    },
    forge(g, y) {
      for (const [x, z, r] of [[-0.6, -0.2, 0.3], [0.55, -0.35, -0.4]]) {
        const h = house(0x9aa0a8, 0x5a5f68); h.scale.setScalar(1.1); g.add(at(h, x, y, z, r));
        const chimney = box(0.12, 0.4, 0.12, 0x6f6b66); g.add(at(chimney, x + 0.2, y + 0.85, z));
        for (let i = 0; i < 3; i++) { const puff = ball(0.09 + i * 0.04, 0xd8d8de, 8); puff.userData.isEffect = true; g.add(at(puff, x + 0.24 + i * 0.08, y + 1.15 + i * 0.18, z)); }
      }
      for (const x of [-0.1, 0.9]) { const lamp = new T.Group(); lamp.add(at(cyl(0.025, 0.03, 0.7, 0x3a3a44, 6), 0, 0.35, 0)); lamp.add(at(ball(0.08, 0xffd27a, 8), 0, 0.74, 0)); g.add(at(lamp, x, y, 0.6)); }
      g.add(at(tree(0xc9a24a), -1.2, y, 0.45));
    },
    desert(g, y) {
      const mesa = cyl(0.55, 0.7, 0.75, 0xc9693e, 9); g.add(at(mesa, -0.65, y + 0.37, -0.35)); g.add(at(cyl(0.56, 0.56, 0.06, 0xe08a55, 9), -0.65, y + 0.76, -0.35));
      const cactus = () => { const c = new T.Group(); c.add(at(cyl(0.09, 0.1, 0.7, 0x4f9a3e, 8), 0, 0.35, 0)); for (const s of [-1, 1]) { const arm = cyl(0.06, 0.06, 0.28, 0x4f9a3e, 6); c.add(at(arm, s * 0.15, 0.42 + (s > 0 ? 0.1 : 0), 0)); } return c; };
      g.add(at(cactus(), 0.6, y, -0.4)); g.add(at(cactus(), 1.1, y, 0.35)); g.add(at(cactus(), -0.2, y, 0.6));
      const saloon = house(0xb5783e, 0x7a4a2a); g.add(at(saloon, 0.25, y, 0.1, -0.5));
      g.add(at(cyl(0.12, 0.12, 0.24, 0x8a5a36, 10), 0.75, y + 0.12, 0.75));
    },
    observatory(g, y) {
      const hall = new T.Group(); hall.add(at(cyl(0.55, 0.6, 0.55, 0xf3ecdf, 16), 0, 0.28, 0));
      const dome = new T.Mesh(new T.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x8a7ad8)); hall.add(at(dome, 0, 0.55, 0));
      hall.add(at(box(0.12, 0.4, 0.1, 0x2b2f5a), 0, 0.82, 0.42)); g.add(at(hall, -0.25, y, -0.2));
      const scope = new T.Group(); scope.add(at(cyl(0.03, 0.03, 0.5, 0x3a3a44, 6), 0, 0.25, 0)); const tube = cyl(0.07, 0.09, 0.55, 0xd9b45a, 10); tube.rotation.z = 0.9; scope.add(at(tube, 0.1, 0.55, 0)); g.add(at(scope, 0.9, y, 0.3, -0.6));
      for (const [x, z] of [[1.0, -0.5], [-1.1, 0.5]]) g.add(at(ball(0.07, 0xfff2a0, 8), x, y + 0.6, z));
      g.add(at(tree(0xa38ad8), -1.2, y, -0.3));
    },
    night(g, y) {
      for (const [x, z, s] of [[-0.8, -0.3, 1.2], [0.1, -0.6, 1], [0.9, -0.1, 1.15], [-0.3, 0.5, 0.9]]) { const p = pine(); p.scale.setScalar(s); g.add(at(p, x, y, z)); }
      for (const [x, z] of [[0.5, 0.55], [0.75, 0.4], [-0.9, 0.55]]) { const m = new T.Group(); m.add(at(cyl(0.03, 0.04, 0.14, 0xf0e6d0, 6), 0, 0.07, 0)); m.add(at(new T.Mesh(new T.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x6fd8ff, {emissive: new T.Color(0x2a8ad8), emissiveIntensity: 0.8})), 0, 0.14, 0)); g.add(at(m, x, y, z)); }
      const lan = new T.Group(); lan.add(at(cyl(0.025, 0.03, 0.6, 0x3a3a44, 6), 0, 0.3, 0)); lan.add(at(box(0.14, 0.16, 0.14, 0xffd27a), 0, 0.66, 0)); g.add(at(lan, 0.25, y, 0.25));
    },
    tower(g, y) {
      const t = new T.Group();
      for (let i = 0; i < 4; i++) t.add(at(cyl(0.34 - i * 0.06, 0.38 - i * 0.06, 0.42, [0xd7c8f2, 0xf2b6cf][i % 2], 12), 0, 0.21 + i * 0.42, 0));
      const star = new T.Mesh(new T.OctahedronGeometry(0.18, 0), toon(0xffe27a, {emissive: new T.Color(0xffb800), emissiveIntensity: 0.4})); t.add(at(star, 0, 1.95, 0));
      g.add(at(t, -0.1, y, -0.25));
      for (const [x, z] of [[-0.95, 0.35], [0.85, 0.4], [0.95, -0.45]]) g.add(at(cyl(0.1, 0.12, 0.6, 0xe8e2f6, 8), x, y + 0.3, z));
      g.add(at(tree(0xf2a9c6, 0x8a5a7a), -1.1, y, -0.45));
    },
    abyss(g, y) {
      for (let i = 0; i < 5; i++) { const r = new T.Mesh(new T.DodecahedronGeometry(0.3 + (i % 2) * 0.12, 0), toon(0x3f5f72)); g.add(at(r, -1 + i * 0.5, y + 0.15, -0.6 + (i % 2) * 0.25)); }
      for (const [x, z, c] of [[0.8, 0.45, 0xff7a9a], [-0.7, 0.5, 0xffa86a], [0.2, 0.7, 0xff7a9a]]) { const coral = new T.Group(); for (let i = 0; i < 3; i++) { const b = cyl(0.03, 0.04, 0.3 + i * 0.06, c, 5); b.rotation.z = (i - 1) * 0.4; coral.add(at(b, (i - 1) * 0.06, 0.16, 0)); } g.add(at(coral, x, y, z)); }
      const coil = new T.Group();
      for (let i = 0; i < 3; i++) { const seg = new T.Mesh(new T.TorusGeometry(0.28, 0.1, 8, 14, Math.PI), toon(0x3d8fd8)); seg.rotation.y = Math.PI / 2; coil.add(at(seg, -0.45 + i * 0.45, 0.08, 0)); }
      const head = ball(0.17, 0x3d8fd8); coil.add(at(head, 0.75, 0.32, 0)); coil.add(at(cone(0.05, 0.2, 0xffe27a, 6), 0.75, 0.52, 0.06));
      g.add(at(coil, 0.1, y, -0.05, 0.3));
    },
  };

  /* each island's signature props from island-props.js (the same ones the battle field uses), scaled down onto the model:
     [prop, x, z, scale, height above the grass, turn] */
  const animated = [], P = createIslandProps(T, kit, Math.random, animated);
  const SIGNATURE = {
    meadow: [[P.whiteFlowers, -0.35, 0.95, 0.5, 0, 0], [P.mound, 0.1, -0.95, 0.5, 0, 0]],
    pond: [[() => P.boardwalk(3), 0.1, 0.05, 0.3, 0.02, 0.3], [P.frogStatue, -0.95, 0.75, 0.32, 0, 0.5]],
    waterfall: [[P.rainbow, -0.3, -0.85, 0.34, 0.25, 0], [P.daffodils, 0.25, 0.85, 0.45, 0, 0]],
    orchard: [[P.treehouse, -0.25, -0.45, 0.3, 0, 0.3]],
    forge: [[P.teslaCoil, 0.2, 0.8, 0.3, 0, 0], [P.speakerStack, -0.95, 0.55, 0.3, 0, 0.6]],
    desert: [[P.wagon, -0.4, 0.8, 0.3, 0, 0.4], [P.deadTree, 1.2, -0.55, 0.34, 0, 0]],
    observatory: [[() => P.magicCircle(2.3), 0, 0.15, 0.42, 0, 0], [P.floatRock, 1.05, -0.6, 0.3, 1.0, 0], [P.floatRock, -1.2, 0.2, 0.26, 1.25, 0]],
    night: [[P.twistedTree, -1.0, -0.45, 0.3, 0, 0], [P.mist, 0.2, 0.55, 0.4, 0, 0], [() => P.bats(3), 0, 0, 0.26, 1.2, 0]],
    tower: [[() => P.plaza(3.6), -0.1, -0.25, 0.4, 0, 0], [P.floatSlab, 1.15, -0.7, 0.3, 1.0, 0], [P.floatSlab, -1.2, 0.5, 0.26, 1.3, 0]],
    abyss: [[P.ruinArch, -0.9, -0.55, 0.28, 0, 0.5], [P.foamRock, 1.1, 0.5, 0.3, 0, 0], [P.dragonAltar, 0.05, 0.75, 0.24, 0, 0]],
  };
  function signature(theme, g, y) { for (const [make, x, z, k, h, ry] of SIGNATURE[theme] || []) { const o = make(); o.scale.multiplyScalar(k); g.add(at(o, x, y + h, z, ry)); } }

  return {
    animated,
    async island(theme) {
      const {g, top} = base(theme);
      (BUILD[theme] || BUILD.meadow)(g, top); signature(theme, g, top);
      toonify(g, {outline: 0.035});
      return g;
    },
    /* the harbour of the town, rebuilt in 3D from the same pier code (js/harbor.js makeDock), with the boatman standing
       on the beach at the foot of the pier; heroModel is a fresh clone of models/hero.glb (or null) */
    dock(heroModel) {
      const H = globalThis.PhantomHarbor, C = {...H.DEFAULTS}, g = new T.Group(), sand = toon(0xf0d9a0), grass = toon(0x86cc5e);
      const {pier, booth} = H.makeDock(T, C, {mobile: true});
      /* a rounded sand peninsula with a grass top, a wet-sand rim and foam; the shallow water fades out softly */
      const blob = (r, h, c, y) => { const m = new T.Mesh(new T.CylinderGeometry(r, r * 1.08, h, 28), toon(c)); m.scale.set(1.05, 1, 1.5); return at(m, 35.2, y, 5); };
      g.add(blob(5.9, 0.34, 0xd4b479, -0.2), blob(5.5, 0.36, 0xf0d9a0, -0.12), blob(4.3, 0.4, 0x86cc5e, -0.06));
      const foam = new T.Mesh(new T.RingGeometry(0.93, 1, 40), new T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.75, side: T.DoubleSide, depthWrite: false})); foam.rotation.x = -Math.PI / 2; foam.scale.set(6.6, 9.3, 1); foam.position.set(35.2, -0.08, 5); foam.userData.isEffect = true; g.add(foam);
      g.add(at(tree(0x5fbf4a), 31.6, 0.3, -0.6), at(tree(0x6fcf55), 31.4, 0.3, 10.6));
      g.add(pier, booth);
      H.toonOutline(T, pier, {thickness: 0.07}); H.toonOutline(T, booth, {thickness: 0.07});
      toonify(g, {outline: 0.06});
      if (heroModel) {
        const box3 = new T.Box3().setFromObject(heroModel), s = 2.55 / (box3.max.y - box3.min.y); heroModel.scale.setScalar(s); heroModel.position.y = -box3.min.y * s;
        const man = new T.Group(); man.add(heroModel); H.dressBoatman(T, heroModel); toonify(heroModel, {outline: 0.05});
        man.position.set(36.6, 0.12, 7.4); man.rotation.y = Math.PI * 0.9; g.add(man);
      }
      return g;
    },
  };
}
