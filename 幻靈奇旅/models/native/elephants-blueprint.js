// 小肥象家族的參數藍圖（Y 軸向上、面向 +Z、地面 y=0）
// 零件格式與鳥族相同；骨架用「關節」群組：關節放在世界座標的樞紐點，
// 內層再平移回去，所以零件一律用世界座標描述，動畫只需要改關節的旋轉／位置。
(function (root) {
  const PI = Math.PI;

  // ---- 零件建構器 ----------------------------------------------------------
  const E = (p, s, r, m) => ({ t: 'ell', p, s, r: r || [0, 0, 0], m });
  const T = (p, R, tube, m, o = {}) => ({ t: 'torus', p, R, tube, arc: o.arc || PI * 2, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const C = (p, rt, rb, h, m, o = {}) => ({ t: 'cyl', p, rt, rb, h, seg: o.seg || 32, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const B = (p, size, m, o = {}) => ({ t: 'box', p, size, bevel: o.bevel ?? 0.02, r: o.r || [0, 0, 0], s: [1, 1, 1], m });
  const SH = (p, R, base, amp, n, th, m, o = {}) => ({ t: 'shell', p, R, base, amp, n, th, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const ST = (p, points, ro, ri, depth, m, o = {}) => ({ t: 'star', p, points, ro, ri, depth, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const L = (p, pts, m, o = {}) => ({ t: 'lathe', p, pts, phiStart: o.phiStart || 0, phiLength: o.phiLength || PI * 2, th: 0.03, r: o.r || [0, 0, 0], s: [1, 1, 1], m });
  const G = (p, c, o = {}) => ({ t: 'g', p, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], c: [c].flat(Infinity), id: o.id });

  function mirror(node) {
    const q = JSON.parse(JSON.stringify(node));
    (function f(n) {
      n.p = [-n.p[0], n.p[1], n.p[2]];
      n.r = [n.r[0], -n.r[1], -n.r[2]];
      if (n.id) n.id = n.id.replace(/R$/, 'L');
      if (n.c) n.c.forEach(f);
    })(q);
    return q;
  }
  const sym = (node) => [node, mirror(node)];

  // 關節：樞紐在世界座標 at；內層平移 -at，裡面的零件與子關節都用世界座標
  const joint = (id, at, parts) => G(at, [G([-at[0], -at[1], -at[2]], parts)], { id });

  // ---- 骨架（三隻共用同一副，服裝不同） ----------------------------------
  const SK = {
    body: [0, 0.55, 0],
    head: [0, 1.02, 0.04],
    earR: [0.58, 1.72, -0.08],
    trunk1: [0, 1.38, 0.6],
    trunk2: [0, 1.17, 0.8],
    trunk3: [0, 1.06, 0.96],
    armR: [0.42, 0.9, 0.06],
    legR: [0.25, 0.38, 0.03],
    tail: [0, 0.45, -0.44],
  };
  const TRUNK = { pts: [SK.trunk1, SK.trunk2, SK.trunk3, [0, 1.08, 1.1], [0, 1.2, 1.16]], r: [0.17, 0.14, 0.12, 0.105, 0.1] };

  const rotY = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

  // 縫線：一串小橢球
  const dash = (p, r, m = 'thread', s = [0.012, 0.032, 0.008]) => E(p, s, r, m);

  // 象鼻一節：A→B 錐形圓柱 + 關節球 + 兩道皺褶
  function trunkSeg(A, Bp, ra, rb, m) {
    const d = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]];
    const len = Math.hypot(d[0], d[1], d[2]);
    const th = Math.atan2(d[2], d[1]);
    const ring = Math.atan2(-d[1], d[2]);
    const mid = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2, (A[2] + Bp[2]) / 2];
    const at = (t) => [A[0] + d[0] * t, A[1] + d[1] * t, A[2] + d[2] * t];
    return [
      E(A, [ra, ra, ra], 0, m),
      C(mid, rb, ra, len, m, { r: [th, 0, 0] }),
      T(at(0.35), ra * 0.93, 0.016, m, { r: [ring, 0, 0] }),
      T(at(0.7), (ra + rb) * 0.47, 0.015, m, { r: [ring, 0, 0] }),
    ];
  }

  // ---- 基本象身（膚色材質名為 skin；armMat 讓國王的袖子換成絨布） -------
  function elephant(o = {}) {
    const armMat = o.armMat || 'skin';
    const P = TRUNK.pts, R = TRUNK.r;

    // 頭頂中縫
    const headSeam = [];
    for (let a = 0.78; a < 2.7; a += 0.085) {
      const y = 1.55 + 0.665 * Math.sin(a), z = 0.02 + 0.645 * Math.cos(a);
      headSeam.push(dash([0, y, z], [Math.atan2(-0.64 * Math.sin(a), 0.66 * Math.cos(a)), 0, 0]));
    }
    // 肚子中縫
    const bellySeam = [];
    for (let y = 0.2; y < 1.0; y += 0.06) {
      const z1 = 0.5 * Math.sqrt(Math.max(0, 1 - ((y - 0.62) / 0.5) ** 2));
      const z2 = 0.06 + 0.46 * Math.sqrt(Math.max(0, 1 - ((y - 0.5) / 0.4) ** 2));
      bellySeam.push(dash([0, y, Math.max(z1, z2) + 0.004], [0, 0, 0]));
    }

    // 耳朵：外層灰、內層粉紅、內緣一圈縫線；兩層關節（拍動 earR、傾倒 earTiltR）
    const ec = [1.0, 1.48, -0.12], ery = 0.35;
    const n = [Math.sin(ery), 0, Math.cos(ery)];
    const earStitch = [];
    for (let k = 0; k < 28; k++) {
      const t = (k / 28) * 2 * PI;
      earStitch.push(dash(add(ec, rotY([0.4 * Math.cos(t), 0.53 * Math.sin(t), 0.072], ery)), [0, ery, t + PI / 2]));
    }
    const ear = joint('earR', SK.earR, joint('earTiltR', SK.earR, [
      E(ec, [0.44, 0.58, 0.08], [0, ery, 0], 'skin'),
      E(add(ec, n.map((v) => v * 0.045)), [0.35, 0.47, 0.045], [0, ery, 0], 'pink'),
      earStitch,
    ]));

    // 腳：腿、米色腳底、三片腳趾、腳底縫線
    const soleStitch = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * 2 * PI;
      soleStitch.push(dash([0.26 + 0.175 * Math.sin(a), 0.085, 0.05 + 0.175 * Math.cos(a)], [0, a, PI / 2], 'thread', [0.01, 0.028, 0.008]));
    }
    const leg = joint('legR', SK.legR, [
      E([0.26, 0.22, 0.03], [0.2, 0.23, 0.21], 0, 'skin'),
      C([0.26, 0.04, 0.05], 0.175, 0.185, 0.08, 'pad'),
      [-0.09, 0, 0.09].map((dx) => E([0.26 + dx, 0.07, 0.215], [0.055, 0.05, 0.035], [0, dx * 2, 0], 'pad')),
      soleStitch,
    ]);

    // 手：上臂（可換袖子材質）、手掌、米色掌墊
    const arm = joint('armR', SK.armR, [
      E([0.56, 0.68, 0.08], [0.15, 0.26, 0.15], [0, 0, 0.4], armMat),
      armMat !== 'skin' ? E([0.645, 0.48, 0.1], [0.12, 0.11, 0.12], [0, 0, 0.4], 'skin') : [],
      E([0.665, 0.445, 0.1], [0.1, 0.05, 0.09], [0, 0, 0.4], 'pad'),
      o.cuff || [],
    ]);

    const tail = joint('tail', SK.tail, [
      C([0, 0.385, -0.55], 0.025, 0.035, 0.22, 'skin', { r: [-2.19, 0, 0] }),
      E([0, 0.3, -0.68], [0.095, 0.095, 0.095], 0, 'skin'),
    ]);

    const trunk = joint('trunk1', P[0], [
      trunkSeg(P[0], P[1], R[0], R[1], 'skin'),
      joint('trunk2', P[1], [
        trunkSeg(P[1], P[2], R[1], R[2], 'skin'),
        joint('trunk3', P[2], [
          trunkSeg(P[2], P[3], R[2], R[3], 'skin'),
          trunkSeg(P[3], P[4], R[3], R[4], 'skin'),
          E(P[4], [R[4], R[4], R[4]], 0, 'skin'),
          C(add(P[4], [0, 0.08, 0.02]), 0.06, 0.06, 0.03, 'pink', { r: [-0.25, 0, 0] }),
        ]),
      ]),
    ]);

    const eye = G([0.29, 1.55, 0.6], [
      C([0, 0, 0], 0.125, 0.125, 0.07, 'button', { r: [PI / 2, 0, 0] }),
      T([0, 0, 0.035], 0.1, 0.018, 'button'),
      B([0, 0, 0.042], [0.12, 0.024, 0.016], 'thread', { r: [0, 0, PI / 4], bevel: 0.006 }),
      B([0, 0, 0.042], [0.12, 0.024, 0.016], 'thread', { r: [0, 0, -PI / 4], bevel: 0.006 }),
    ], { r: [0, 0.4, 0] });

    const head = joint('head', SK.head, [
      E([0, 1.55, 0.02], [0.74, 0.66, 0.64], 0, 'skin'),
      headSeam,
      sym(eye),
      sym(T([0.29, 1.75, 0.57], 0.08, 0.011, 'brow', { arc: PI * 0.55, r: [-0.35, 0.4, 0] })),
      sym(E([0.46, 1.36, 0.48], [0.12, 0.08, 0.04], [0, 0.75, 0], 'cheek')),
      T([-0.17, 1.3, 0.6], 0.07, 0.012, 'brow', { arc: PI * 0.7, r: [-0.3, -0.25, PI] }),
      sym(ear),
      trunk,
      o.headwear || [],
    ]);

    const body = joint('body', SK.body, [
      E([0, 0.62, 0], [0.56, 0.5, 0.5], 0, 'skin'),
      E([0, 0.5, 0.06], [0.5, 0.4, 0.46], 0, 'skin'),
      o.outfit ? [] : bellySeam,
      o.outfit || [],
      sym(leg),
      sym(arm),
      tail,
      head,
    ]);
    return [body];
  }

  // ---- 服裝零件 ------------------------------------------------------------
  // 波浪荷葉領：一圈交錯的橢球 + 米色滾邊
  function ruff(main, edge, y = 1.0, rr = 0.56) {
    const out = [T([0, y + 0.02, 0.02], 0.46, 0.09, main, { r: [PI / 2, 0, 0] })];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * 2 * PI;
      out.push(E([rr * Math.sin(a), y - 0.03, rr * 0.95 * Math.cos(a) + 0.02], [0.15, 0.09, 0.06], [0, a, 0], main));
      out.push(E([(rr + 0.04) * Math.sin(a + 0.2), y - 0.1, (rr + 0.04) * 0.95 * Math.cos(a + 0.2) + 0.02], [0.12, 0.05, 0.05], [0, a + 0.2, 0], edge));
    }
    return out;
  }
  // 白色毛皮滾邊（帶黑點的貂皮）
  function ermine(center, R, tube, n, spots, o = {}) {
    const out = [T(center, R, tube, 'fur', { r: [PI / 2, 0, 0], s: o.s })];
    const sx = (o.s || [1, 1, 1])[0], sz = (o.s || [1, 1, 1])[1];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 2 * PI + 0.1;
      if (o.skip && o.skip(a)) continue;
      out.push(E([(R + tube * 0.9) * sx * Math.sin(a) + center[0], center[1] + (k % 2 ? 0.03 : -0.03), (R + tube * 0.9) * sz * Math.cos(a) + center[2]],
        [0.025, 0.03, 0.02], [0, a, 0], 'spot'));
    }
    return out;
  }
  const fleur = (p, m, k = 1, r) => G(p, [
    E([0, 0.1 * k, 0], [0.05 * k, 0.13 * k, 0.03 * k], 0, m),
    sym(E([0.07 * k, 0.04 * k, 0], [0.04 * k, 0.09 * k, 0.03 * k], [0, 0, -0.6], m)),
    E([0, -0.02 * k, 0], [0.09 * k, 0.025 * k, 0.03 * k], 0, m),
    E([0, -0.08 * k, 0], [0.03 * k, 0.05 * k, 0.025 * k], 0, m),
  ], { r });

  // ---- 小肥象：紅白條紋派對帽 + 荷葉領 -----------------------------------
  function fat() {
    const slices = [];
    for (let k = 0; k < 6; k++)
      slices.push(L([0, 0, 0], [[0.34, 0], [0.002, 0.52]], k % 2 ? 'cream' : 'red', { phiStart: (k * PI) / 3 - PI / 6, phiLength: PI / 3 }));
    return elephant({
      headwear: G([0, 2.1, 0], [slices, T([0, 0.02, 0], 0.34, 0.045, 'red', { r: [PI / 2, 0, 0] }), E([0, 0.56, 0], [0.1, 0.1, 0.1], 0, 'yellow')], { r: [-0.08, 0, 0.04] }),
      outfit: [ruff('red', 'cream'), E([0, 0.9, 0.6], [0.075, 0.075, 0.075], 0, 'yellow')],
    });
  }

  // ---- 阿拉肥：皇冠、絨布長袍、貂皮滾邊、披風、星形胸針 -----------------
  function king() {
    const arches = [0, 1, 2, 3].map((k) => T([0, 0.2, 0], 0.37, 0.035, 'gold', { arc: PI, r: [0, (k * PI) / 4, 0] }));
    const pearls = [];
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * 2 * PI;
      pearls.push(E([0.45 * Math.sin(a), 0.2, 0.45 * Math.cos(a)], [0.028, 0.028, 0.028], 0, 'pearl'));
    }
    const gems = [1, 2, 3, 4, 5].map((k) => {
      const a = (k / 6) * 2 * PI;
      return E([0.45 * Math.sin(a), 0.12, 0.45 * Math.cos(a)], [0.035, 0.045, 0.02], [0, a, 0], 'ruby');
    });
    const crown = G([0, 2.05, 0], [
      ermine([0, 0, 0], 0.42, 0.09, 14, true),
      E([0, 0.24, 0], [0.4, 0.3, 0.4], 0, 'velvet'),
      L([0, 0, 0], [[0.44, 0.06], [0.46, 0.2]], 'gold'),
      arches, pearls, gems,
      E([0, 0.58, 0], [0.06, 0.06, 0.06], 0, 'gold'),
      fleur([0, 0.68, 0], 'gold', 0.8),
      ST([0, 0.13, 0.46], 5, 0.1, 0.045, 0.03, 'gold'),
      E([0, 0.13, 0.48], [0.04, 0.05, 0.025], 0, 'ruby'),
    ], { r: [-0.08, 0, 0] });

    // 披風（背後張開）＋下襬貂皮
    const phi0 = 1.1, phiLen = 2 * PI - 2.2;
    const capeProfile = [[0.55, 1.0], [0.66, 0.8], [0.8, 0.4], [0.88, 0.06]];
    const hem = [];
    for (let k = 0; k < 20; k++) {
      const f = phi0 + phiLen * (k / 19);
      hem.push(E([0.9 * Math.sin(f), 0.07, 0.9 * Math.cos(f)], [0.13, 0.08, 0.08], [0, f, 0], 'fur'));
      if (k % 2) hem.push(E([0.97 * Math.sin(f), 0.08, 0.97 * Math.cos(f)], [0.022, 0.03, 0.02], [0, f, 0], 'spot'));
    }
    const edges = [];
    [phi0, phi0 + phiLen].forEach((f) => {
      for (let s = 0; s <= 9; s++) {
        const u = s / 9, seg = Math.min(2, Math.floor(u * 3)), t = u * 3 - seg;
        const r = capeProfile[seg][0] + (capeProfile[seg + 1][0] - capeProfile[seg][0]) * t + 0.03;
        const y = capeProfile[seg][1] + (capeProfile[seg + 1][1] - capeProfile[seg][1]) * t;
        edges.push(E([r * Math.sin(f), y, r * Math.cos(f)], [0.07, 0.07, 0.06], 0, 'fur'));
      }
    });
    const robeStars = [];
    [[-0.75, 0.45], [0.75, 0.45], [-0.95, 0.75], [0.95, 0.75], [-1.3, 0.3], [1.3, 0.3]].forEach(([a, y]) => {
      const rr = 0.6 * Math.sqrt(1 - ((y - 0.58) / 0.52) ** 2) + 0.01;
      robeStars.push(ST([rr * Math.sin(a), y, rr * 0.9 * Math.cos(a)], 5, 0.05, 0.022, 0.02, 'gold', { r: [0, a, 0] }));
    });
    const tassel = (p) => G(p, [E([0, 0.02, 0], [0.04, 0.04, 0.04], 0, 'gold'), C([0, -0.1, 0], 0.025, 0.07, 0.18, 'gold')]);
    const epaulette = G([0.42, 0.98, 0.06], [
      E([0, 0, 0], [0.17, 0.05, 0.15], 0, 'gold'),
      [-0.1, -0.03, 0.04, 0.11].map((x) => C([x, -0.08, 0.1], 0.012, 0.012, 0.12, 'gold')),
    ], { r: [0, 0, -0.35] });

    const outfit = [
      E([0, 0.58, 0], [0.6, 0.52, 0.54], 0, 'velvet'),
      E([0, 0.5, 0.18], [0.2, 0.42, 0.42], 0, 'cream'),
      fleur([0, 0.42, 0.6], 'gold', 1.1),
      robeStars,
      ermine([0, 0.1, 0.02], 0.58, 0.08, 18, true, { s: [1, 0.95, 1] }),
      L([0, 0, 0], capeProfile, 'velvet', { phiStart: phi0, phiLength: phiLen }),
      hem, edges,
      G([0, 0.55, -0.85], [fleur([0, 0, 0], 'gold', 1.3), ST([0, 0.32, 0], 6, 0.11, 0.05, 0.03, 'gold'), E([0, 0.32, 0.02], [0.04, 0.05, 0.025], 0, 'ruby')], { r: [0, PI, 0] }),
      // 披肩：絨布荷葉 + 貂皮邊
      ruff('velvet', 'fur', 1.0, 0.55),
      ST([0, 0.86, 0.62], 6, 0.13, 0.06, 0.04, 'gold'),
      E([0, 0.86, 0.65], [0.05, 0.06, 0.03], 0, 'ruby'),
      T([0, 0.92, 0.52], 0.3, 0.018, 'gold', { arc: PI * 0.75, r: [-0.35, 0, PI] }),
      sym(tassel([0.36, 0.72, 0.5])),
      sym(epaulette),
    ];
    const cuff = G([0.625, 0.53, 0.1], [T([0, 0, 0], 0.14, 0.055, 'fur', { r: [-PI / 2, 0, 0] })], { r: [0, 0, 0.4] });
    return elephant({ headwear: crown, outfit, armMat: 'velvet', cuff });
  }

  // ---- 小飛：飛行帽、護目鏡、帽翼、紅色小披風 ---------------------------
  function fly() {
    const lens = G([0.2, 0, 0], [
      C([0, 0, -0.03], 0.155, 0.155, 0.06, 'brownDark', { r: [PI / 2, 0, 0] }),
      C([0, 0, 0.01], 0.12, 0.12, 0.05, 'glass', { r: [PI / 2, 0, 0] }),
      T([0, 0, 0.02], 0.13, 0.032, 'glassRim'),
    ]);
    const sherpa = [];
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * 2 * PI;
      sherpa.push(E([0.71 * Math.sin(a), 1.83, 0.62 * Math.cos(a) + 0.02], [0.07, 0.06, 0.06], [0, a, 0], 'cream'));
    }
    const capWing = G([0.56, 2.0, 0.08], [
      E([0.12, 0.09, 0], [0.16, 0.07, 0.04], [0, 0, 0.55], 'white'),
      E([0.17, 0.0, 0], [0.19, 0.065, 0.04], [0, 0, 0.15], 'white'),
      E([0.13, -0.08, 0], [0.14, 0.06, 0.04], [0, 0, -0.25], 'white'),
    ], { r: [0, 0.35, 0] });
    const headwear = [
      SH([0, 1.55, 0.02], 0.7, 1.15, 0, 1, 0.04, 'brown', { s: [1.1, 1.0, 0.96] }),
      [-0.45, 0, 0.45].map((a) => {
        const out = [];
        for (let t = 0.1; t < 1.12; t += 0.09)
          // 外層轉經度 a、內層轉 t+π/2，縫線才會順著帽子的經線
          out.push(G([0.775 * Math.sin(t) * Math.sin(a), 1.55 + 0.705 * Math.cos(t), 0.02 + 0.676 * Math.sin(t) * Math.cos(a)],
            [dash([0, 0, 0], [t + PI / 2, 0, 0])], { r: [0, a, 0] }));
        return out;
      }),
      T([0, 1.84, 0.02], 0.64, 0.05, 'cream', { r: [PI / 2, 0, 0], s: [1.1, 0.96, 1] }),
      sherpa,
      G([0, 1.99, 0.52], [sym(lens), B([0, 0, -0.02], [0.14, 0.05, 0.05], 'brownDark'), ST([0, -0.13, 0.04], 5, 0.07, 0.032, 0.025, 'gold')], { r: [-0.6, 0, 0] }),
      sym(capWing),
      E([0, 2.27, 0.02], [0.09, 0.09, 0.09], 0, 'yellow'),
      sym(G([0.66, 1.6, 0.27], [E([0, 0, 0], [0.1, 0.24, 0.17], 0, 'brown'), E([0.04, -0.17, 0.06], [0.045, 0.045, 0.03], 0, 'gold')], { r: [0, 0.5, 0.15] })),
    ];

    // 紅色小披風（前方開口）＋米色毛邊＋白毛球＋金色徽章
    const phi0 = 0.5, phiLen = 2 * PI - 1.0;
    const prof = [[0.5, 1.05], [0.62, 0.93], [0.72, 0.78]];
    const trim = [];
    for (let k = 0; k < 24; k++) {
      const f = phi0 + phiLen * (k / 23);
      trim.push(E([0.75 * Math.sin(f), 0.78, 0.75 * Math.cos(f)], [0.08, 0.05, 0.06], [0, f, 0], 'cream'));
    }
    [phi0, phi0 + phiLen].forEach((f) => {
      prof.forEach(([r, y]) => trim.push(E([(r + 0.03) * Math.sin(f), y, (r + 0.03) * Math.cos(f)], [0.06, 0.06, 0.06], 0, 'cream')));
    });
    const pompom = (x) => G([x, 0.8, 0.62], [C([0, 0.02, 0], 0.008, 0.008, 0.08, 'cream'), E([0, -0.05, 0], [0.05, 0.05, 0.05], 0, 'white')]);
    const wingBadge = (a) => G([0.76 * Math.sin(a), 0.86, 0.76 * Math.cos(a)], [
      E([0, 0, 0], [0.04, 0.04, 0.02], 0, 'gold'),
      sym(E([0.07, 0.01, 0], [0.07, 0.03, 0.015], [0, 0, 0.25], 'cream')),
    ], { r: [-0.5, a, 0] });
    const outfit = [
      L([0, 0, 0], prof, 'red', { phiStart: phi0, phiLength: phiLen }),
      trim,
      T([0, 1.02, 0.02], 0.46, 0.1, 'red', { r: [PI / 2, 0, 0] }),
      T([0, 0.97, 0.02], 0.5, 0.045, 'cream', { r: [PI / 2, 0, 0] }),
      [-0.32, -0.18, 0.18, 0.32].map(pompom),
      G([0, 0.95, 0.6], [C([0, 0, 0], 0.1, 0.1, 0.03, 'gold', { r: [PI / 2, 0, 0] }), B([0, 0, 0.02], [0.12, 0.025, 0.01], 'goldDark'), B([0, 0.01, 0.02], [0.025, 0.09, 0.01], 'goldDark')]),
      wingBadge(1.6), wingBadge(-1.6), wingBadge(PI),
    ];
    return elephant({ headwear, outfit });
  }

  // ---- 材質（felt = 不織布絨面） -------------------------------------------
  const base = (skin) => ({
    skin: { c: skin, felt: true },
    pink: { c: '#E6BDB5', felt: true },
    pad: { c: '#F0E7D7', felt: true },
    thread: { c: '#F5EEE2', rough: 0.8 },
    button: { c: '#4A2C20', rough: 0.3, coat: 0.8 },
    brow: { c: '#4E3528', rough: 0.8 },
    cheek: { c: '#F2A1A4', rough: 1 },
    cream: { c: '#F3EBDB', felt: true },
    red: { c: '#BE4339', felt: true },
    yellow: { c: '#E2B13E', felt: true },
  });
  const ELEPHANTS = [
    {
      id: 'fat', name: '小肥象', tag: '初階', accent: '#B5483E',
      materials: base('#A8AEB9'),
      parts: fat(),
    },
    {
      id: 'king', name: '阿拉肥', tag: '終階', accent: '#8E1F2B',
      materials: Object.assign(base('#A4A4A9'), {
        velvet: { c: '#8A1C29', felt: true, sheen: 1 },
        fur: { c: '#F6F1E6', felt: true },
        spot: { c: '#2D2420', rough: 1 },
        gold: { c: '#D7A946', rough: 0.3, metal: 0.95 },
        ruby: { c: '#C3172C', rough: 0.05, trans: 0.5, coat: 1 },
        pearl: { c: '#F5F0E8', rough: 0.2, coat: 1 },
      }),
      parts: king(),
    },
    {
      id: 'fly', name: '小飛', tag: '飛行員', accent: '#4F7FB4',
      materials: Object.assign(base('#A9C4E4'), {
        brown: { c: '#6A452F', felt: true },
        brownDark: { c: '#4C3123', felt: true },
        glass: { c: '#A9D1EA', rough: 0.1, coat: 1, trans: 0.4 },
        glassRim: { c: '#9DBBD6', felt: true },
        white: { c: '#F8F5EF', felt: true },
        gold: { c: '#D9AE4C', rough: 0.3, metal: 0.95 },
        goldDark: { c: '#A57A28', rough: 0.4, metal: 0.9 },
      }),
      parts: fly(),
    },
  ];

  const CAMERA = { focal: 80, sensor: 36, pos: [0, 2.15, 9.5], target: [0, 1.62, 0] };
  const VIEWS = [
    { id: 'front', name: '正面', rotY: 0 },
    { id: 'q', name: '斜側', rotY: -0.7 },
    { id: 'side', name: '側面', rotY: -PI / 2 },
    { id: 'back', name: '背面', rotY: PI },
  ];

  // ---- 動作 ----------------------------------------------------------------
  // 每個動作是 ph（0→2π 一循環）的姿勢函式，烘焙成 24fps 逐格數值。
  // 旋轉角皆為父層座標的尤拉角 XYZ：
  //   rx 正 = 往後甩（下垂的四肢／象鼻往後），rx 負 = 往前／往上捲
  //   右側 rz 正 = 往外張開；耳朵 earR 的 rz 正 = 往上拍
  // 象鼻三節用相位延遲做出「甩動」的波浪；左側自動鏡射（若未另外指定）。
  const FPS = 24;
  const mir = (r) => [r[0], -r[1], -r[2]];
  const v3 = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
  const legL0 = [-SK.legR[0], SK.legR[1], SK.legR[2]];
  // 象鼻：base = 三節的靜止彎曲量（rx），swing = 左右甩幅（rz），lag = 每節相位延遲
  function trunkWave(a, { curl = [0, 0, 0], swing = [0.1, 0.15, 0.2], lift = [0, 0, 0], lag = 0.6, freq = 1 }) {
    const o = {};
    ['trunk1', 'trunk2', 'trunk3'].forEach((id, i) => {
      const q = freq * a - lag * i;
      o[id] = { r: [curl[i] + lift[i] * Math.sin(2 * q), 0, swing[i] * Math.sin(q)] };
    });
    return o;
  }

  const poses = {
    // 站立：呼吸起伏、頭左右看、象鼻慢慢擺、耳朵輕搧、手微微晃
    stand(a) {
      const b = Math.sin(a);
      return {
        body: { p: v3(SK.body, [0, 0.008 * b, 0]), r: [0, 0, 0], s: [1 + 0.01 * b, 1 + 0.014 * b, 1 + 0.01 * b] },
        head: { r: [0.03 * Math.sin(a + 1), 0.12 * Math.sin(a), 0.04 * Math.sin(a + 0.5)] },
        earR: { r: [0, 0, 0.07 * Math.sin(2 * a)] }, earTiltR: { r: [0, 0.1 * Math.sin(2 * a + 0.6), 0] },
        ...trunkWave(a, { curl: [0, 0, -0.05], swing: [0.1, 0.14, 0.2], lift: [0.04, 0.06, 0.08], lag: 0.7 }),
        armR: { r: [0.06 * b, 0, 0.04 * b] }, armL: { r: [-0.06 * b, 0, -0.04 * b] },
        legR: { p: SK.legR, r: [0, 0, 0] }, legL: { p: legL0, r: [0, 0, 0] },
        tail: { r: [0, 0.3 * Math.sin(2 * a), 0] },
      };
    },
    // 移動：左右腳交替跨步、手與同側腳反向擺、身體上下彈左右晃，象鼻左右甩、耳朵每步搧一下
    walk(a) {
      const s = Math.sin(a), c = Math.cos(a);
      const bob = 0.045 * Math.abs(s);
      return {
        body: { p: v3(SK.body, [0, bob, 0]), r: [0.05, 0.1 * s, 0.07 * s], s: [1, 1, 1] },
        head: { r: [0.05 * Math.sin(2 * a), -0.08 * s, -0.06 * s] },
        earR: { r: [0, 0, 0.14 * Math.sin(2 * a)] }, earTiltR: { r: [0, 0.18 * Math.sin(2 * a - 0.5), 0] },
        ...trunkWave(a, { curl: [0, 0, -0.05], swing: [0.25, 0.35, 0.45], lift: [0.08, 0.1, 0.14], lag: 0.6 }),
        armR: { r: [0.55 * s, 0, 0.1] }, armL: { r: mir([-0.55 * s, 0, 0.1]) },
        legR: { p: v3(SK.legR, [0, 0.07 * Math.max(0, c) - bob, 0]), r: [-0.45 * s, 0, 0] },
        legL: { p: v3(legL0, [0, 0.07 * Math.max(0, -c) - bob, 0]), r: [0.45 * s, 0, 0] },
        tail: { r: [0.2 * Math.sin(2 * a), 0.45 * s, 0] },
      };
    },
    // 坐下：屁股著地、雙腳往前伸開、手放肚子前，象鼻往上捲慢慢搖，耳朵下垂
    sit(a) {
      const b = Math.sin(a);
      return {
        body: { p: v3(SK.body, [0, -0.17 + 0.006 * b, 0]), r: [-0.12, 0, 0], s: [1.03, 0.97 + 0.012 * b, 1.03] },
        head: { r: [-0.06 + 0.03 * Math.sin(a + 1), 0.1 * Math.sin(a), 0.05 * Math.sin(a + 2)] },
        earR: { r: [0, 0, -0.2 + 0.04 * b] }, earTiltR: { r: [0, 0.12, 0] },
        ...trunkWave(a, { curl: [-0.3, -0.5, -0.6], swing: [0.1, 0.14, 0.2], lift: [0.03, 0.05, 0.08], lag: 0.7 }),
        armR: { r: [-0.55 + 0.06 * b, 0, -0.2] }, armL: { r: mir([-0.55 + 0.06 * b, 0, -0.2]) },
        legR: { p: SK.legR, r: [-1.35, 0, 0.25 + 0.05 * Math.sin(a + 0.5)] },
        legL: { p: legL0, r: [-1.35, 0, -0.25 - 0.05 * Math.sin(a + 1.8)] },
        tail: { r: [0.5, 0.15 * b, 0] },
      };
    },
    // 準備起飛：蹲低蓄力、耳朵抬起越搧越大、雙手張開、象鼻高舉捲起並甩動、尾巴翹起
    takeoff(a) {
      const c = 0.5 - 0.5 * Math.cos(a); // 0→1→0 蓄力
      const flap = (0.25 + 0.4 * c) * Math.sin(4 * a);
      return {
        body: { p: v3(SK.body, [0, -0.09 * c, 0]), r: [0.12 + 0.06 * c, 0, 0], s: [1 + 0.04 * c, 1 - 0.06 * c, 1 + 0.04 * c] },
        head: { r: [-0.15 * c, 0, 0.04 * Math.sin(4 * a)] },
        earR: { r: [0, 0, 0.3 + flap] }, earTiltR: { r: [-0.75 * c, 0, 0] },
        ...trunkWave(a, { curl: [-0.25 - 0.4 * c, -0.65 * c, -0.85 * c], swing: [0.12, 0.18, 0.25], lift: [0, 0, 0], lag: 0.5, freq: 2 }),
        armR: { r: [-0.25, 0, 0.45 + 0.8 * c + 0.12 * Math.sin(4 * a)] }, armL: { r: mir([-0.25, 0, 0.45 + 0.8 * c + 0.12 * Math.sin(4 * a)]) },
        legR: { p: v3(SK.legR, [0, 0.09 * c, 0]), r: [-0.12 - 0.06 * c, 0, 0] },
        legL: { p: v3(legL0, [0, 0.09 * c, 0]), r: [-0.12 - 0.06 * c, 0, 0] },
        tail: { r: [-0.5 * c, 0, 0.3 * Math.sin(4 * a)] },
      };
    },
    // 用耳朵飛翔：離地前傾，耳朵翻成水平當翅膀上下大幅拍動；象鼻向前上捲並甩動，
    // 手向前划、腳在後方交替踢，尾巴往後飄
    fly(a) {
      const s = Math.sin(a), c = Math.cos(a);
      return {
        body: { p: v3(SK.body, [0, 0.8 + 0.07 * s, 0]), r: [0.35 + 0.04 * c, 0, 0.05 * s], s: [1, 1, 1] },
        head: { r: [-0.32 + 0.04 * s, 0, 0] },
        earR: { r: [0, 0, 0.15 + 0.75 * c] }, earTiltR: { r: [-1.3, 0, 0] },
        ...trunkWave(a, { curl: [-0.6, -0.5, -0.6], swing: [0.15, 0.22, 0.28], lift: [0.06, 0.1, 0.15], lag: 0.8 }),
        armR: { r: [-0.9 + 0.2 * s, 0, 0.25] }, armL: { r: mir([-0.9 + 0.2 * s, 0, 0.25]) },
        legR: { p: SK.legR, r: [0.55 + 0.25 * s, 0, 0.1] },
        legL: { p: legL0, r: [0.55 - 0.25 * s, 0, -0.1] },
        tail: { r: [0.9, 0, 0.3 * Math.sin(2 * a)] },
      };
    },
  };

  function bake(id, name, desc, frames, links) {
    const tracks = {};
    for (let i = 0; i <= frames; i++) {
      const pose = poses[id]((2 * PI * i) / frames);
      for (const k of Object.keys(pose)) {
        const lk = k.replace(/R$/, 'L');
        if (lk !== k && !pose[lk]) pose[lk] = { r: mir(pose[k].r) }; // 耳朵左右鏡射
      }
      for (const [node, tr] of Object.entries(pose))
        for (const key of ['p', 'r', 's'])
          if (tr[key]) ((tracks[node] ||= {})[key] ||= []).push(tr[key].map((v) => +v.toFixed(5)));
    }
    return { id, name, desc, frames, fps: FPS, links, tracks };
  }
  // links：每個動作各部位如何連動（頁面上的對照表）
  const ACTIONS = [
    bake('stand', '站立', '原地呼吸，頭左右張望，象鼻慢慢擺、耳朵輕搧', 72,
      { 鼻子: '三節緩慢擺盪', 耳朵: '輕輕前後搧', 手: '隨呼吸微晃', 腳: '站穩不動', 身體: '呼吸起伏' }),
    bake('walk', '移動', '原地踏步：左右腳交替、手腳反向擺動，象鼻跟著步伐左右甩', 24,
      { 鼻子: '左右甩＋每步上下彈', 耳朵: '每步搧一下', 手: '與同側腳反向前後擺', 腳: '交替抬腳跨步', 身體: '上下彈、左右晃' }),
    bake('sit', '坐下', '屁股著地、雙腳往前伸開，手放肚子前，象鼻往上捲慢慢搖，耳朵下垂', 72,
      { 鼻子: '往上捲起、慢慢搖', 耳朵: '放鬆下垂', 手: '收在肚子前', 腳: '往前伸直、微微晃', 身體: '下沉後仰、呼吸' }),
    bake('takeoff', '準備起飛', '蹲低蓄力，耳朵抬起越搧越快，雙手張開，象鼻高舉甩動', 36,
      { 鼻子: '高舉捲起、快速甩', 耳朵: '抬起、越搧越大', 手: '往兩側張開抖動', 腳: '蹲低踩穩', 身體: '下蹲壓扁再回彈' }),
    bake('fly', '用耳朵飛翔', '離地前傾，耳朵翻成水平當翅膀上下拍，象鼻向前捲起甩動，手向前划、腳往後踢', 18,
      { 鼻子: '向前上捲、波浪甩動', 耳朵: '水平展開、上下大拍', 手: '向前伸、划動', 腳: '往後擺、交替踢', 身體: '離地前傾、隨拍動起伏' }),
  ];

  const api = { ELEPHANTS, CAMERA, VIEWS, SK, ACTIONS, FPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ELEPHANT_BLUEPRINT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
