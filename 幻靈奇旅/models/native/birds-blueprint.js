// 三隻鳥角色的共用參數藍圖（Y 軸向上，角色面向 +Z，地面 y=0）
// Three.js 與 Blender 都讀這份藍圖，用各自原生的 API 建出幾何與材質。
(function (root) {
  const PI = Math.PI;

  // ---- 零件建構器 ----------------------------------------------------------
  const E = (p, s, r, m) => ({ t: 'ell', p, s, r: r || [0, 0, 0], m });
  const T = (p, R, tube, m, o = {}) => ({ t: 'torus', p, R, tube, arc: o.arc || PI * 2, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const C = (p, rt, rb, h, m, o = {}) => ({ t: 'cyl', p, rt, rb, h, seg: o.seg || 32, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const B = (p, size, m, o = {}) => ({ t: 'box', p, size, bevel: o.bevel ?? 0.04, r: o.r || [0, 0, 0], s: [1, 1, 1], m });
  const SH = (p, R, base, amp, n, th, m, o = {}) => ({ t: 'shell', p, R, base, amp, n, th, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const ST = (p, points, ro, ri, depth, m, o = {}) => ({ t: 'star', p, points, ro, ri, depth, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const L = (p, pts, m, o = {}) => ({ t: 'lathe', p, pts, phiStart: o.phiStart || 0, phiLength: o.phiLength || PI * 2, th: o.th || 0.04, r: o.r || [0, 0, 0], s: [1, 1, 1], m });
  const G = (p, c, o = {}) => ({ t: 'g', p, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], c: c.flat(Infinity), id: o.id });

  // 對 YZ 平面鏡射（左右對稱零件）：位置 x 取負、尤拉角 y/z 取負；骨架名稱 R → L
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

  // ---- 骨架 ----------------------------------------------------------------
  // 每個可動部位是一個「樞紐」群組：本身旋轉為 0，原本的擺放角度放在內層。
  // 動作只要改樞紐的位置／旋轉／縮放即可，兩個引擎都用同一組數值。
  const HIP = 1.2; // 身體樞紐高度（身體重心附近）
  const pivot = (id, p, c, r) => G(p, [G([0, 0, 0], c, { r: r || [0, 0, 0] })], { id });
  function rig(list) {
    const limbs = list.filter((n) => n.id);
    const rest = list.filter((n) => !n.id);
    limbs.forEach((n) => { n.p = [n.p[0], n.p[1] - HIP, n.p[2]]; });
    return [G([0, HIP, 0], [G([0, -HIP, 0], rest), limbs], { id: 'body' })];
  }

  // ---- 共用部位 ------------------------------------------------------------
  function eyes(x, y, z) {
    // 眼睛比表面法線再多朝外轉一些，側面才看得到
    return sym(T([x, y, z], 0.13, 0.03, 'eye', { arc: PI * 0.75, r: [0, Math.asin(x) * 1.5, 0] }));
  }
  function cheeks(x, y, z) {
    return sym(E([x, y, z], [0.17, 0.11, 0.05], [0, 0.62, 0], 'cheek'));
  }
  function foot(x, claws) {
    const toes = [-0.55, 0, 0.55].map((a) =>
      G([0, 0, 0], [
        E([0, 0.05, 0.14], [0.065, 0.05, 0.14], 0, 'foot'),
        claws ? C([0, 0.04, 0.29], 0, 0.035, 0.09, 'claw', { r: [PI / 2, 0, 0] }) : [],
      ], { r: [0, a, 0] })
    );
    return G([x, 0, 0.18], [C([0, 0.17, 0], 0.07, 0.08, 0.22, 'foot'), toes], { id: 'footR' });
  }
  function feet(claws) {
    return sym(foot(0.32, claws));
  }
  function tuft(y, m) {
    return G([0, y, 0], [
      E([0, 0.3, 0], [0.11, 0.3, 0.08], 0, m),
      sym(E([0.22, 0.22, 0.02], [0.1, 0.24, 0.07], [0, 0, -0.75], m)),
    ]);
  }
  // 扇形翅膀：layers = [{m, n, L, w, a0, a1, z}]
  function wing(pos, rot, base, layers) {
    const parts = [E([0.05, 0, 0], base.s, 0, base.m)];
    layers.forEach((ly) => {
      for (let i = 0; i < ly.n; i++) {
        const a = ly.n === 1 ? ly.a0 : ly.a0 + (ly.a1 - ly.a0) * (i / (ly.n - 1));
        const len = Array.isArray(ly.L) ? ly.L[i] : ly.L;
        const d = 0.15 + len * 0.55;
        const m = Array.isArray(ly.m) ? ly.m[i % ly.m.length] : ly.m;
        parts.push(E([Math.cos(a) * d, Math.sin(a) * d, ly.z - i * 0.004], [len * 0.55, ly.w, 0.07], [0, 0, a], m));
      }
    });
    return sym(pivot('wingR', pos, parts, rot));
  }
  function flower(p, m, mc, r = 0.1, ps = 0.075) {
    const petals = [];
    for (let k = 0; k < 5; k++) {
      const a = PI / 2 + (k * 2 * PI) / 5;
      petals.push(E([r * Math.cos(a), r * Math.sin(a), 0.03], [ps, ps, 0.045], 0, m));
    }
    return G(p, [petals, E([0, 0, 0.07], [0.05, 0.05, 0.04], 0, mc)]);
  }

  // ---- 雛鳥 ----------------------------------------------------------------
  function chick() {
    return [
      E([0, 1.25, 0], [1.0, 1.08, 0.95], 0, 'body'),
      E([0, 0.72, 0.04], [0.84, 0.6, 0.8], 0, 'body'),
      SH([0, 1.3, 0], 1.1, 0.92, 0.42, 7, 0.07, 'shell', { s: [1.02, 1, 0.98] }),
      tuft(2.33, 'yolk'),
      eyes(0.36, 1.2, 0.88),
      cheeks(0.56, 1.0, 0.75),
      C([0, 1.12, 0.98], 0, 0.15, 0.26, 'beak', { r: [1.25, 0, 0], s: [1, 1, 0.7] }),
      C([0, 1.0, 0.95], 0, 0.11, 0.2, 'beak', { r: [1.95, 0, 0], s: [1, 1, 0.7] }),
      E([0, 1.05, 0.9], [0.1, 0.07, 0.06], 0, 'mouth'),
      // 圍巾 + 花扣
      T([0, 0.8, 0], 0.86, 0.11, 'scarf', { r: [PI / 2 + 0.1, 0, 0], s: [1, 0.97, 0.7] }),
      G([0, 0.74, 0.86], [
        sym(E([0.2, 0.02, -0.03], [0.17, 0.09, 0.06], [0, 0, -0.25], 'scarf')),
        sym(E([0.07, -0.2, 0], [0.08, 0.15, 0.045], [0, 0, 0.35], 'scarf')),
        flower([0, 0, 0.02], 'yolk', 'beak'),
      ]),
      wing([0.9, 0.95, 0.02], [0, 0.3, 0], { m: 'body', s: [0.28, 0.3, 0.15] }, [
        { m: ['yolk', 'body'], n: 4, L: [0.62, 0.56, 0.5, 0.44], w: 0.13, a0: 0.6, a1: -0.4, z: 0 },
      ]),
      pivot('tail', [0, 0.62, -0.85], [
        E([0, 0, 0], [0.1, 0.22, 0.06], 0, 'yolk'),
        sym(E([0.13, 0.02, 0], [0.09, 0.18, 0.06], [0, 0, -0.5], 'yolk')),
      ], [-0.5, 0, 0]),
      feet(false),
    ].flat(Infinity);
  }

  // ---- 青羽鳥 --------------------------------------------------------------
  function bluebird() {
    const lens = G([0.32, 0, 0], [
      C([0, 0, -0.05], 0.23, 0.23, 0.08, 'leather', { r: [PI / 2, 0, 0] }),
      C([0, 0, 0.01], 0.18, 0.18, 0.06, 'glass', { r: [PI / 2, 0, 0] }),
      T([0, 0, 0.02], 0.19, 0.05, 'gold'),
    ]);
    return [
      E([0, 1.3, 0], [1.0, 1.1, 0.95], 0, 'body'),
      E([0, 1.17, 0.3], [0.8, 0.7, 0.7], 0, 'white'),
      E([0, 0.7, 0.12], [0.8, 0.62, 0.78], 0, 'white'),
      // 飛行帽 + 護目鏡
      SH([0, 1.32, 0], 1.04, 1.35, 0, 1, 0.05, 'leather', { s: [1.0, 1.06, 0.97] }),
      sym(E([1.0, 1.45, 0.05], [0.12, 0.32, 0.27], 0, 'leather')),
      sym(T([1.1, 1.38, 0.08], 0.07, 0.018, 'gold', { r: [0, PI / 2, 0] })),
      T([0, 1.75, 0], 1.0, 0.055, 'leather', { r: [PI / 2 - 0.3, 0, 0] }),
      B([0, 1.44, -1.06], [0.2, 0.15, 0.06], 'gold', { bevel: 0.015 }),
      G([0, 1.97, 0.84], [sym(lens), B([0, 0, -0.02], [0.2, 0.07, 0.07], 'leather', { bevel: 0.02 })], { r: [-0.5, 0, 0] }),
      tuft(2.38, 'blueLight'),
      eyes(0.35, 1.2, 0.94),
      cheeks(0.52, 1.0, 0.8),
      C([0, 1.08, 1.06], 0, 0.13, 0.22, 'beak', { r: [PI / 2, 0, 0], s: [1, 1, 0.7] }),
      // 圍巾、花、羅盤
      T([0, 0.84, 0], 0.88, 0.12, 'scarf', { r: [PI / 2 + 0.1, 0, 0], s: [1, 0.97, 0.7] }),
      E([0, 0.8, 0.88], [0.12, 0.1, 0.08], 0, 'scarf'),
      sym(E([0.25, 0.72, 0.86], [0.22, 0.1, 0.06], [0, -0.3, -0.5], 'scarf')),
      flower([0.38, 0.86, 0.8], 'white', 'blueLight', 0.07, 0.055),
      G([0, 0.5, 0.9], [
        T([0, 0, 0], 0.13, 0.022, 'gold'),
        ST([0, 0, 0], 4, 0.2, 0.06, 0.05, 'gold'),
        ST([0, 0, 0.015], 4, 0.13, 0.04, 0.05, 'gold', { r: [0, 0, PI / 4] }),
      ]),
      // 斜背包
      G([0, 0.75, 0], [T([0, 0, 0], 1.0, 0.035, 'leather', { r: [-PI / 2, 0, 0] })], { r: [0, 0, -0.5], s: [1, 1, 0.92] }),
      G([0.74, 0.42, 0.5], [
        B([0, 0, 0], [0.4, 0.38, 0.2], 'leather', { bevel: 0.05 }),
        B([0, 0.07, 0.11], [0.42, 0.26, 0.04], 'leatherDark', { bevel: 0.02 }),
        B([0, -0.02, 0.14], [0.07, 0.1, 0.03], 'gold', { bevel: 0.01 }),
      ], { r: [0, 0.75, 0] }),
      wing([0.92, 0.98, 0.0], [0, 0.35, 0], { m: 'white', s: [0.3, 0.32, 0.16] }, [
        { m: ['blue', 'blueLight'], n: 5, L: [0.8, 0.74, 0.68, 0.6, 0.52], w: 0.13, a0: 0.65, a1: -0.55, z: -0.03 },
        { m: 'white', n: 3, L: 0.4, w: 0.12, a0: 0.4, a1: -0.3, z: 0.04 },
      ]),
      pivot('tail', [0, 0.55, -0.82], [
        E([0, -0.3, 0], [0.12, 0.38, 0.06], 0, 'blue'),
        sym(E([0.14, -0.25, 0.01], [0.11, 0.33, 0.06], [0, 0, -0.35], 'blueLight')),
      ], [0.9, 0, 0]),
      feet(true),
    ].flat(Infinity);
  }

  // ---- 天翼王 --------------------------------------------------------------
  function king() {
    const spikes = [];
    for (let k = 1; k < 5; k++) {
      const a = (k * 2 * PI) / 5;
      spikes.push(C([0.66 * Math.sin(a), 0.42, 0.66 * Math.cos(a)], 0, 0.09, 0.32, 'gold'));
      spikes.push(E([0.66 * Math.sin(a), 0.6, 0.66 * Math.cos(a)], [0.045, 0.045, 0.045], 0, 'gold'));
      spikes.push(E([0.64 * Math.sin(a), 0.14, 0.64 * Math.cos(a)], [0.05, 0.07, 0.03], [0, a, 0], 'gem'));
    }
    const crown = G([0, 2.1, 0.02], [
      L([0, 0, 0], [[0.6, 0], [0.62, 0.12], [0.68, 0.3]], 'gold', { th: 0.03 }),
      E([0, 0.2, 0], [0.55, 0.3, 0.5], 0, 'lavender'),
      spikes,
      E([0, 0.15, 0.67], [0.09, 0.12, 0.04], 0, 'gem'),
      G([0, 0.48, 0.66], [
        E([0, 0.12, 0], [0.06, 0.17, 0.04], 0, 'gold'),
        sym(E([0.09, 0.04, 0], [0.05, 0.1, 0.035], [0, 0, -0.6], 'gold')),
        E([0, -0.05, 0], [0.11, 0.03, 0.035], 0, 'gold'),
      ]),
    ], { r: [-0.1, 0, 0] });

    const collar = [T([0, 1.0, 0], 0.82, 0.2, 'fur', { r: [PI / 2, 0, 0] })];
    for (let k = 0; k < 16; k++) {
      const a = (k * 2 * PI) / 16;
      collar.push(E([0.92 * Math.sin(a), 1.0 + 0.05 * (k % 2), 0.88 * Math.cos(a)], [0.18, 0.16, 0.16], 0, 'fur'));
    }

    const phi0 = 0.75, phiLen = 2 * PI - 1.5;
    const capeProfile = [[0.86, 1.02], [0.94, 0.85], [1.08, 0.55], [1.25, 0.22], [1.34, 0.04]];
    const hem = [];
    const N = 22;
    for (let k = 0; k < N; k++) {
      const f = phi0 + phiLen * (k / (N - 1));
      hem.push(E([1.37 * Math.sin(f), 0.08, 1.37 * Math.cos(f)], [0.14, 0.1, 0.06], [0, f, 0], k % 2 ? 'gold' : 'fur'));
    }
    const edge = [];
    [phi0, phi0 + phiLen].forEach((f) => {
      for (let s = 0; s <= 8; s++) {
        const u = s / 8;
        const seg = Math.min(3, Math.floor(u * 4));
        const t = u * 4 - seg;
        const r = capeProfile[seg][0] + (capeProfile[seg + 1][0] - capeProfile[seg][0]) * t + 0.03;
        const y = capeProfile[seg][1] + (capeProfile[seg + 1][1] - capeProfile[seg][1]) * t;
        edge.push(E([r * Math.sin(f), y, r * Math.cos(f)], [0.06, 0.07, 0.06], 0, 'gold'));
      }
    });

    return [
      E([0, 1.3, 0], [1.0, 1.1, 0.95], 0, 'body'),
      E([0, 0.8, 0.05], [0.85, 0.6, 0.8], 0, 'body'),
      crown,
      eyes(0.35, 1.25, 0.9),
      cheeks(0.54, 1.06, 0.76),
      C([0, 1.13, 0.98], 0, 0.13, 0.22, 'beak', { r: [PI / 2, 0, 0], s: [1, 1, 0.7] }),
      collar,
      sym(E([0.34, 0.9, 0.98], [0.06, 0.06, 0.06], 0, 'gold')),
      sym(T([0.2, 0.82, 0.98], 0.08, 0.02, 'gold', { r: [0, 0, 0.6] })),
      G([0, 0.72, 0.93], [
        T([0, 0, 0], 0.15, 0.025, 'gold'),
        ST([0, 0, 0], 4, 0.3, 0.1, 0.06, 'gold'),
        ST([0, 0, 0.03], 4, 0.18, 0.06, 0.05, 'gem'),
      ]),
      L([0, 0, 0], capeProfile, 'cape', { phiStart: phi0, phiLength: phiLen, th: 0.04 }),
      hem,
      edge,
      G([0, 0.68, -1.06], [ST([0, 0, 0], 4, 0.24, 0.08, 0.05, 'gold'), ST([0, 0, 0.03], 4, 0.14, 0.05, 0.04, 'gem')], { r: [0, PI, 0] }),
      wing([0.75, 1.45, -0.45], [0, 0.35, 0], { m: 'fur', s: [0.3, 0.32, 0.18] }, [
        { m: 'gold', n: 7, L: 1.3, w: 0.15, a0: 0.1, a1: 1.45, z: -0.08 },
        { m: 'lavender', n: 6, L: 0.98, w: 0.14, a0: 0.15, a1: 1.35, z: -0.02 },
        { m: 'fur', n: 5, L: 0.66, w: 0.13, a0: 0.2, a1: 1.25, z: 0.04 },
      ]),
      feet(true),
    ].flat(Infinity);
  }

  // ---- 材質（sRGB 色碼；rough/metal/coat/sss/trans/sheen） ----------------
  const shared = {
    eye: { c: '#4A3328', rough: 0.4 },
    cheek: { c: '#F2A7A3', rough: 0.7 },
    beak: { c: '#EFAA2E', rough: 0.35, coat: 0.4 },
    foot: { c: '#E8A72E', rough: 0.4, coat: 0.3 },
    claw: { c: '#3B2A22', rough: 0.3 },
    mouth: { c: '#E26F67', rough: 0.4 },
  };
  const BIRDS = [
    {
      id: 'chick', name: '雛鳥', tag: '初階', accent: '#8B6240',
      materials: Object.assign({}, shared, {
        body: { c: '#F6E7C1', rough: 0.55, sss: 0.25, coat: 0.15 },
        yolk: { c: '#F2D172', rough: 0.5, coat: 0.2 },
        shell: { c: '#F7F3EC', rough: 0.3, coat: 0.5 },
        scarf: { c: '#94653D', rough: 0.6, sheen: 0.4 },
      }),
      parts: rig(chick()),
    },
    {
      id: 'blue', name: '青羽鳥', tag: '中階', accent: '#355F86',
      materials: Object.assign({}, shared, {
        body: { c: '#7099D2', rough: 0.5, sss: 0.15, coat: 0.15 },
        blueLight: { c: '#AFC9EC', rough: 0.5 },
        blue: { c: '#5F8BCB', rough: 0.5 },
        white: { c: '#F8F5EE', rough: 0.55, sss: 0.2 },
        leather: { c: '#7B4A2A', rough: 0.55, coat: 0.25 },
        leatherDark: { c: '#5E3720', rough: 0.55, coat: 0.25 },
        gold: { c: '#CFA048', rough: 0.28, metal: 0.9 },
        glass: { c: '#A9CFEF', rough: 0.05, trans: 0.85 },
        scarf: { c: '#4F7FC2', rough: 0.6, sheen: 0.4 },
      }),
      parts: rig(bluebird()),
    },
    {
      id: 'king', name: '天翼王', tag: '終階', accent: '#A9802F',
      materials: Object.assign({}, shared, {
        body: { c: '#F7EFDF', rough: 0.5, sss: 0.25, coat: 0.15 },
        gold: { c: '#DDAB42', rough: 0.25, metal: 0.95 },
        gem: { c: '#2F6BD8', rough: 0.05, trans: 0.6, coat: 1 },
        cape: { c: '#3A4FA8', rough: 0.75, sheen: 0.6 },
        lavender: { c: '#B7B6EA', rough: 0.55 },
        fur: { c: '#FBF7EE', rough: 0.9, sheen: 0.5 },
        foot: { c: '#E9B23C', rough: 0.35, coat: 0.3 },
      }),
      parts: rig(king()),
    },
  ];

  // 統一相機：70mm 鏡頭（36mm 片幅），距離 9，看向 (0,1.35,0)
  const CAMERA = { focal: 70, sensor: 36, pos: [0, 1.6, 9], target: [0, 1.35, 0] };
  // 視角（角色繞 Y 軸旋轉）：正面、斜側（動作影片用）、側面（嘴朝畫面左）、背面
  const VIEWS = [
    { id: 'front', name: '正面', rotY: 0 },
    { id: 'q', name: '斜側', rotY: -0.7 },
    { id: 'side', name: '側面', rotY: -PI / 2 },
    { id: 'back', name: '背面', rotY: PI },
  ];

  // ---- 動作 ----------------------------------------------------------------
  // 每個動作是一個 ph（0→2π 一個循環）的姿勢函式，烘焙成 24fps 的逐格數值。
  // 姿勢 = 各樞紐的 p（位置）／r（尤拉角 XYZ）／s（縮放），皆為父層座標下的絕對值。
  const FPS = 24;
  const FOOT_X = 0.32, FOOT_Z = 0.18;

  // R = Rx·Ry·Rz 的反矩陣作用在向量上（用於讓腳掌固定在地面）
  function invRotXYZ([a, b, c], [x, y, z]) {
    const y1 = y * Math.cos(a) + z * Math.sin(a), z1 = -y * Math.sin(a) + z * Math.cos(a);
    const x2 = x * Math.cos(b) - z1 * Math.sin(b), z2 = x * Math.sin(b) + z1 * Math.cos(b);
    return [x2 * Math.cos(c) + y1 * Math.sin(c), -x2 * Math.sin(c) + y1 * Math.cos(c), z2];
  }
  // 給定身體姿勢與腳掌的世界位置，求腳在身體座標下的位置與抵銷旋轉
  function plant(body, world, toeUp = 0) {
    const d = invRotXYZ(body.r, [world[0] - body.p[0], world[1] - body.p[1], world[2] - body.p[2]]);
    return { p: [d[0] / body.s[0], d[1] / body.s[1], d[2] / body.s[2]], r: [-body.r[0] - toeUp, -body.r[1], -body.r[2]] };
  }

  const poses = {
    // 移動：原地踏步，身體左右晃、上下彈，翅膀每步拍兩下
    walk(ph) {
      const body = { p: [0, HIP + 0.045 * Math.abs(Math.sin(ph)), 0], r: [0.07, 0.1 * Math.sin(ph), 0.07 * Math.sin(ph)], s: [1, 1, 1] };
      const step = (side, q) => {
        const lift = Math.max(0, Math.sin(q)) * 0.14;
        return plant(body, [side * FOOT_X, lift, FOOT_Z - 0.13 * Math.cos(q)], lift * 2.5);
      };
      return {
        body, footR: step(1, ph), footL: step(-1, ph + PI),
        wingR: { r: [0, 0.1, 0.3 + 0.45 * Math.sin(2 * ph)] },
        tail: { r: [0, 0.3 * Math.sin(ph), 0] },
      };
    },
    // 坐下：身體下沉貼地、腳往前收，翅膀下垂貼身，緩慢呼吸
    sit(ph) {
      const b = 0.012 * Math.sin(ph);
      const body = { p: [0, HIP - 0.12 + b * 0.5, 0], r: [-0.06, 0, 0], s: [1 + b * 0.5, 1 + b, 1 + b * 0.5] };
      return {
        body, footR: plant(body, [0.3, 0, 0.42], 0.25), footL: plant(body, [-0.3, 0, 0.42], 0.25),
        wingR: { r: [0, 0.35, -0.95 + 0.05 * Math.sin(ph)] },
        tail: { r: [0.15, 0, 0] },
      };
    },
    // 準備起飛：蹲低、身體前傾、翅膀高舉向後並快速抖動
    takeoff(ph) {
      const c = 0.5 - 0.5 * Math.cos(ph);
      const body = {
        p: [0, HIP - 0.14 - 0.08 * c, 0.05], r: [0.28 + 0.12 * c, 0, 0],
        s: [1.03 + 0.02 * c, 0.95 - 0.03 * c, 1.03 + 0.02 * c],
      };
      return {
        body, footR: plant(body, [FOOT_X, 0, FOOT_Z]), footL: plant(body, [-FOOT_X, 0, FOOT_Z]),
        wingR: { r: [0, 0.45, 1.0 + 0.15 * c + 0.1 * Math.sin(6 * ph)] },
        tail: { r: [0.3 * c, 0, 0] },
      };
    },
    // 飛翔：身體前傾成水平、離地，翅膀繞身體縱軸上下拍；下拍時身體上升
    fly(ph) {
      // 頭身一體的造型若完全 90° 會變成臉朝地，取約 60° 讓臉仍看得到前方
      const body = { p: [0, HIP + 0.6 + 0.07 * Math.sin(ph), 0], r: [1.05 + 0.05 * Math.cos(ph), 0, 0], s: [1, 1, 1] };
      return {
        body,
        footR: { p: [0.28, -HIP + 0.15, 0.0], r: [0.6, 0, 0] },
        footL: { p: [-0.28, -HIP + 0.15, 0.0], r: [0.6, 0, 0] },
        wingR: { r: [0, 0.25 + 0.8 * Math.cos(ph), 0] },
        tail: { r: [0.12 * Math.sin(ph), 0, 0] },
      };
    },
  };

  function bake(id, name, desc, frames, repeat) {
    const tracks = {};
    for (let i = 0; i <= frames; i++) {
      const pose = poses[id]((2 * PI * i) / frames);
      const w = pose.wingR.r;
      pose.wingL = { r: [w[0], -w[1], -w[2]] }; // 左翅鏡射
      for (const [node, tr] of Object.entries(pose))
        for (const k of ['p', 'r', 's'])
          if (tr[k]) ((tracks[node] ||= {})[k] ||= []).push(tr[k].map((v) => +v.toFixed(5)));
    }
    return { id, name, desc, frames, repeat, fps: FPS, tracks };
  }
  // frames = 一個循環的格數；repeat = Blender 影片重複幾個循環
  const ACTIONS = [
    bake('walk', '移動', '原地踏步，身體左右晃動，翅膀每步拍兩下', 20, 2),
    bake('sit', '坐下', '身體下沉貼地、腳往前收，翅膀下垂貼身並緩慢呼吸', 48, 1),
    bake('takeoff', '準備起飛', '蹲低前傾，翅膀高舉向後、快速抖動蓄力', 48, 1),
    bake('fly', '飛翔', '身體轉為水平離地，翅膀上下拍動，下拍時身體上升', 12, 4),
  ];

  // ---- 繁體中文命名（匯出的 .blend／.glb 物件、材質、動作都用這些名稱） ----
  const NAMES = {
    pivots: { body: '身體', wingR: '右翅', wingL: '左翅', footR: '右腳', footL: '左腳', tail: '尾巴' },
    types: { ell: '橢球', torus: '圓環', cyl: '圓柱', box: '方塊', shell: '殼', star: '星形', lathe: '旋轉體', g: '群組' },
    materials: {
      body: '身體', yolk: '黃羽毛', shell: '蛋殼', scarf: '圍巾', eye: '眼睛', cheek: '腮紅', beak: '鳥喙',
      foot: '腳', claw: '爪子', mouth: '嘴巴', blueLight: '淺藍羽毛', blue: '藍羽毛', white: '白羽毛',
      leather: '皮革', leatherDark: '深色皮革', gold: '金屬金', glass: '鏡片玻璃', gem: '藍寶石',
      cape: '披風', lavender: '淡紫羽毛', fur: '白絨毛',
    },
    views: { front: '正面', q: '斜側', side: '側面', back: '背面' },
  };

  const api = { BIRDS, CAMERA, VIEWS, ACTIONS, FPS, NAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BIRD_BLUEPRINT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
