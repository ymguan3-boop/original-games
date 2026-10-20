// 水系幻靈六隻的 Three.js 參數藍圖＋程序動作
// 座標：Y 向上、面向 +Z、水灘地面 y = 0。每隻都有自己的水灘（見 index.html）。
// 動作：idle 待機、move 移動、attack 攻擊、ultimate 大絕招；每個動作是一個循環，pose(n, t) 在第 t 秒擺出姿勢，
// fx 陣列列出循環中第幾秒要放什麼特效（index.html 的特效庫負責畫出來）。
(function (root) {
  const PI = Math.PI;
  const MATERIALS = {
    shine: { c: '#FFFFFF', rough: 0.1, emit: 0.8 },
    leaf: { c: '#FFFFFF', rough: 0.35, coat: 0.5, vc: 1 },
    leafJelly: { c: '#FFFFFF', rough: 0.06, coat: 1, trans: 0.4, vc: 1 },
    leafGlass: { c: '#FFFFFF', rough: 0.05, coat: 1, opacity: 0.62, vc: 1 },
    eyeWhite: { c: '#FFFFFF', rough: 0.2, coat: 1 },
    pupil: { c: '#120C10', rough: 0.15, coat: 1 },
    mouth: { c: '#9C2E35', rough: 0.4 },
    tongue: { c: '#F07C86', rough: 0.4 },
    blush: { c: '#F8A9B4', rough: 0.8, opacity: 0.8 },
    // 金魚
    redFish: { c: '#E8463B', rough: 0.45, coat: 0.5, sss: 0.6 },
    redFin: { c: '#E5513F', rough: 0.4, coat: 0.4, sss: 0.6 },
    cream: { c: '#F7E3CB', rough: 0.5, coat: 0.3, sss: 0.5 },
    eyeRed: { c: '#9B2416', rough: 0.15, coat: 1 },
    goldFish: { c: '#E5A33E', rough: 0.4, coat: 0.5, sss: 0.6 },
    goldFin: { c: '#E8AC4C', rough: 0.4, coat: 0.4, sss: 0.6 },
    eyeAmber: { c: '#8A4512', rough: 0.15, coat: 1 },
    crown: { c: '#E0A733', rough: 0.3, metal: 0.6, coat: 0.6 },
    crownGem: { c: '#F2C14E', rough: 0.05, coat: 1, emit: 0.15 },
    silverFish: { c: '#B9B5B2', rough: 0.35, coat: 0.6, sss: 0.4 },
    silverFin: { c: '#C4C0BD', rough: 0.35, coat: 0.5, sss: 0.4 },
    pearlCream: { c: '#F5ECE0', rough: 0.4, coat: 0.5, sss: 0.4 },
    eyeBrown: { c: '#4A3A35', rough: 0.15, coat: 1 },
    lash: { c: '#2A1C18', rough: 0.6 },
    pearl: { c: '#FBF6EE', rough: 0.12, coat: 1, sheen: 1 },
    tiara: { c: '#D9C7A0', rough: 0.3, metal: 0.5, coat: 0.6 },
    // 水凝膠（毛蟲、仙子）
    jelly: { c: '#62BDEE', rough: 0.06, coat: 1, trans: 0.45, sss: 0.9 },
    jellyLight: { c: '#9ED8F5', rough: 0.08, coat: 1, trans: 0.4, sss: 0.9 },
    jellyWhite: { c: '#F4F9FC', rough: 0.25, coat: 0.8, sss: 0.4 },
    jellyFoot: { c: '#A8DDF4', rough: 0.2, coat: 0.6, sss: 0.6 },
    bubble: { c: '#D6F0FF', rough: 0.02, coat: 1, opacity: 0.45 },
    eyeBlue: { c: '#1F4E9C', rough: 0.1, coat: 1 },
    eyeSky: { c: '#3C8FD0', rough: 0.1, coat: 1 },
    eyeLight: { c: '#7EC4EC', rough: 0.1, coat: 1 },
    skin: { c: '#FCEFE8', rough: 0.5, sss: 0.4 },
    browBlue: { c: '#5FA8DC', rough: 0.4 },
    hairJelly: { c: '#7FC8F0', rough: 0.08, coat: 1, trans: 0.35, sss: 0.9 },
    wing: { c: '#9CCFF4', rough: 0.05, coat: 1, opacity: 0.62 },
    wingTip: { c: '#C9B9F2', rough: 0.05, coat: 1, opacity: 0.55 },
    petalWhite: { c: '#F4FAFD', rough: 0.3, coat: 0.6, sss: 0.4 },
    petalBlue: { c: '#B5E2F7', rough: 0.15, coat: 0.8, sss: 0.6 },
    // 水蛟龍王
    dragon: { c: '#2E6FC2', rough: 0.4, coat: 0.5, sss: 0.4 },
    dragonDeep: { c: '#244F9C', rough: 0.45, coat: 0.4 },
    dragonFin: { c: '#3A8ADB', rough: 0.35, coat: 0.5, sss: 0.6 },
    finCream: { c: '#F4ECD8', rough: 0.4, coat: 0.4, sss: 0.5 },
    belly: { c: '#F2E9D6', rough: 0.5, coat: 0.3 },
    whisker: { c: '#9FD3F2', rough: 0.2, coat: 0.6, sss: 0.6 },
    gold: { c: '#D9AE5A', rough: 0.25, metal: 0.65, coat: 0.6 },
    gemBlue: { c: '#2E8FD6', rough: 0.04, coat: 1, emit: 0.25 },
    hornCream: { c: '#F1E7D2', rough: 0.45, coat: 0.3 },
    dragonGold: { c: '#E9B43C', rough: 0.35, coat: 0.5, sss: 0.4 },
    clawWhite: { c: '#FBF6EA', rough: 0.3, coat: 0.6 },
    eyeRing: { c: '#1C3E7A', rough: 0.3 },
  };

  const E = (p, s, r, m) => ({ t: 'ell', p, s, r: r || [0, 0, 0], m });
  const T = (p, R, tube, m, o = {}) => ({ t: 'torus', p, R, tube, arc: o.arc || PI * 2, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const C = (p, rt, rb, h, m, o = {}) => ({ t: 'cyl', p, rt, rb, h, seg: o.seg || 24, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const SH = (p, R, base, th, m, o = {}) => ({ t: 'shell', p, R, base, amp: 0, n: 1, th, cut: o.cut, pw: o.pw, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const G = (p, c, o = {}) => ({ t: 'g', p, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], c: [c].flat(Infinity), id: o.id });
  // 關節：at = 樞紐位置（父層座標），parts 用同一個父層座標描述
  const joint = (id, at, parts, r) => G(at, [G([-at[0], -at[1], -at[2]], parts)], { id, r });
  const mirrorX = (node) => {
    const q = JSON.parse(JSON.stringify(node));
    (function f(n) {
      n.p = [-n.p[0], n.p[1], n.p[2]]; n.r = [n.r[0], -n.r[1], -n.r[2]];
      if (n.id) n.id = n.id.endsWith('L') ? n.id.slice(0, -1) + 'R' : n.id;
      (n.c || []).forEach(f);
    })(q);
    return q;
  };
  const sym = (n) => [n, mirrorX(n)];
  // A→B 的圓柱
  function seg(A, B, ra, rb, m) {
    const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], len = Math.hypot(...d), u = d.map((v) => v / len);
    return C([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], rb, ra, len, m, { r: [Math.atan2(u[2], u[1]), 0, -Math.asin(u[0])] });
  }
  // 漸層葉片（builder 的 leaf：頂點色由 c1 漸層到尖端 c2）：沿局部 +Y 長出、薄面在 X（鰭面 = YZ 平面）
  //   flare > 0：越往尖端越寬（金魚尾）；< 0：越往尖端越尖（龍鰭）
  const leafMat = (m) => (/jelly|Jelly/.test(m) ? 'leafJelly' : 'leaf');
  const petal = (len, w, th, mA, mB, tip = 0.72, flare = 0.25) =>
    ({ t: 'leaf', p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], len, w, th, flare, c1: MATERIALS[mA].c, c2: MATERIALS[mB].c, from: tip - 0.4, to: 1.0, m: leafMat(mA) });
  // 翅膀片：薄面在 Z（翅面 = XY 平面）
  const wingPetal = (len, w, th, mA, mB) => [
    { t: 'leaf', p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], len, w, th, flare: 0.5, axis: 'z', c1: MATERIALS[mA].c, c2: MATERIALS[mB].c, from: 0.2, to: 1, m: 'leafGlass' },
    E([w * 0.3, len * 0.8, th * 1.1], [w * 0.17, len * 0.09, th * 0.5], 0, 'shine'),
  ];
  // 大眼睛：白眼球、彩色虹膜、深色瞳孔、兩顆反光
  const eye = (p, size, iris, ry, o = {}) => G(p, [
    E([0, 0, 0], [size, size * 1.1, size * 0.45], 0, o.sclera || 'eyeWhite'),
    E([0, -size * 0.04, size * 0.18], [size * 0.86, size * 0.95, size * 0.4], 0, iris),
    E([0, -size * 0.08, size * 0.3], [size * 0.5, size * 0.56, size * 0.3], 0, o.pupil || 'pupil'),
    E([size * 0.28, size * 0.3, size * 0.42], [size * 0.22, size * 0.24, size * 0.1], 0, 'shine'),
    E([-size * 0.25, -size * 0.35, size * 0.42], [size * 0.1, size * 0.1, size * 0.06], 0, 'shine'),
  ], { r: [0, ry, 0] });
  // 張嘴笑：深紅嘴＋粉紅舌
  const mouth = (p, w, h) => [E(p, [w, h, w * 0.5], 0, 'mouth'), E([p[0], p[1] - h * 0.35, p[2] + w * 0.15], [w * 0.7, h * 0.45, w * 0.35], 0, 'tongue')];
  // 水滴：圓底＋尖頂
  const drop = (p, s, m, r) => G(p, [E([0, 0, 0], [s, s, s], 0, m), C([0, s * 1.15, 0], 0, s * 0.82, s * 1.3, m)], { r: r || [0, 0, 0] });

  // ======================================================================
  // 金魚家族：小金魚（紅）、金魚國王（金＋王冠）、金魚皇后（銀灰＋珍珠頭冠）
  // ======================================================================
  function goldfish(o) {
    const H = 1.05;   // 身體中心高度（浮在水灘上方）
    const tailFin = (rx, len, w) => G([0, 0, 0], petal(len, w, 0.035, o.fin, o.finTip, 0.62, 0.45), { r: [rx, 0, 0] });
    const body = [
      E([0, 0, 0], [0.56, 0.52, 0.6], 0, o.body),
      E([0, -0.2, 0.2], [0.46, 0.33, 0.44], 0, o.belly),                     // 淺色的下巴與肚子
      // 鱗片：身體後半部幾排半月形
      ...[0.35, 0.65].flatMap((a) => [-0.25, 0.05, 0.3].map((y) => E([0.5 * Math.sin(a + 1.3), y, -0.5 * Math.cos(a + 1.3)], [0.03, 0.09, 0.11], [0, -(a + 1.3), 0], o.scale))),
      ...[0.35, 0.65].flatMap((a) => [-0.25, 0.05, 0.3].map((y) => E([-0.5 * Math.sin(a + 1.3), y, -0.5 * Math.cos(a + 1.3)], [0.03, 0.09, 0.11], [0, a + 1.3, 0], o.scale))),
      sym(eye([0.27, 0.06, 0.44], 0.165, o.iris, 0.55, {})),
      mouth([0, -0.18, 0.57], 0.075, 0.07),
      sym(E([0.36, -0.12, 0.42], [0.08, 0.05, 0.03], [0, 0.7, 0], 'blush')),
      // 背鰭
      joint('dorsal', [0, 0.46, -0.05], [
        G([0, 0.46, -0.05], petal(0.48, 0.2, 0.03, o.fin, o.finTip, 0.6), { r: [-0.55, 0, 0] }),
        G([0, 0.44, 0.08], petal(0.3, 0.14, 0.03, o.fin, o.finTip, 0.6), { r: [-0.25, 0, 0] }),
      ]),
      // 胸鰭（左右）
      ...sym(joint('finL', [0.47, -0.12, 0.12], [G([0.47, -0.12, 0.12], petal(0.42, 0.17, 0.03, o.fin, o.finTip, 0.6), { r: [0.3, 0.6, -2.0] })])),
      G([0, -0.48, 0.0], petal(0.2, 0.08, 0.025, o.fin, o.finTip, 0.55), { r: [PI - 0.3, 0, 0] }),   // 腹鰭
      // 大尾巴：上下兩片＋中間一片
      joint('tail', [0, 0.02, -0.55], [G([0, 0.02, -0.55], [tailFin(-PI / 2 + 0.6, 0.95, 0.4), tailFin(-PI / 2 - 0.6, 0.9, 0.38), tailFin(-PI / 2, 0.6, 0.22)])]),
      o.extra || [],
    ];
    return [joint('body', [0, H, 0], [G([0, H, 0], body)])];
  }
  // 金魚國王：金色王冠（菱形寶石）＋後方一圈花瓣
  const kingCrown = G([0, 0.52, 0.12], [
    ...[-0.7, -0.35, 0, 0.35, 0.7].map((a) => G([0, 0, 0], petal(0.32 + (a === 0 ? 0.1 : 0), 0.13, 0.03, 'goldFin', 'cream', 0.65), { r: [-0.55 + Math.abs(a) * 0.2, 0, -a] })),
    C([0, 0.04, 0.05], 0.2, 0.22, 0.12, 'crown', { seg: 5, r: [-0.3, 0, 0] }),
    ...[-0.13, 0, 0.13].map((x, i) => C([x, 0.16 + (i === 1 ? 0.05 : 0), 0.1 - Math.abs(x) * 0.3], 0, 0.06, 0.16 + (i === 1 ? 0.08 : 0), 'crown', { seg: 4, r: [-0.3, 0, 0] })),
    G([0, 0.08, 0.27], [E([0, 0, 0], [0.07, 0.1, 0.04], 0, 'crownGem')], { r: [-0.3, 0, PI / 4] }),
  ]);
  // 金魚皇后：細頭冠＋珍珠＋後方花瓣，大眼睫毛
  const queenTiara = G([0, 0.5, 0.1], [
    ...[-0.6, -0.3, 0, 0.3, 0.6].map((a) => G([0, 0, -0.05], petal(0.3 + (a === 0 ? 0.08 : 0), 0.13, 0.03, 'silverFin', 'pearlCream', 0.62), { r: [-0.6 + Math.abs(a) * 0.2, 0, -a] })),
    T([0, 0.04, 0.08], 0.17, 0.018, 'tiara', { r: [PI / 2 - 0.35, 0, 0], arc: PI }),
    ...[-0.14, -0.07, 0.07, 0.14].map((x) => E([x, 0.07 + (0.15 - Math.abs(x)) * 0.5, 0.17], [0.032, 0.032, 0.032], 0, 'pearl')),
    G([0, 0.17, 0.2], [E([0, 0, 0], [0.06, 0.09, 0.05], 0, 'pearl'), C([0, 0.1, 0], 0, 0.045, 0.08, 'pearl')], { r: [-0.3, 0, 0] }),
  ]);
  const lashes = sym(G([0.27, 0.06, 0.44], [0.7, 1.05, 1.4].map((a) => C([0.17 * Math.cos(a), 0.19 * Math.sin(a) + 0.02, 0.06], 0.006, 0.012, 0.07, 'lash', { r: [0, 0, a - PI / 2] })), { r: [0, 0.55, 0] }));

  // ======================================================================
  // 水毛蟲：半透明水凝膠的大頭毛毛蟲，三節身體、水滴觸角、水滴尾巴
  // ======================================================================
  function caterpillar() {
    const antenna = joint('antL', [0.14, 1.02, 0.32], [
      seg([0.14, 1.02, 0.32], [0.26, 1.28, 0.24], 0.045, 0.04, 'jelly'),
      G([0.36, 1.36, 0.22], [E([0, 0, 0], [0.15, 0.09, 0.1], 0, 'jelly'), E([0.05, 0.03, 0.06], [0.04, 0.025, 0.02], 0, 'shine')], { r: [0, 0, 0.35] }),
    ]);
    const bubble = (p, r) => E(p, [r, r, r], 0, 'bubble');
    const feet = (z, x, y) => sym(E([x, y, z], [0.085, 0.07, 0.09], 0, 'jellyFoot'));
    const segment = (id, at, rr, next) => joint(id, at, [
      E(at, rr, 0, 'jelly'),
      E([at[0], at[1] - rr[1] * 0.35, at[2] + 0.02], [rr[0] * 0.8, rr[1] * 0.62, rr[2] * 0.9], 0, 'jellyWhite'),
      feet(at[2], rr[0] * 0.62, 0.075),
      bubble([rr[0] * 0.75, at[1] + rr[1] * 0.55, at[2]], 0.055), bubble([-rr[0] * 0.55, at[1] + rr[1] * 0.75, at[2] - 0.05], 0.045),
      next || [],
    ]);
    const tail = joint('tail', [0, 0.42, -1.12], [G([0, 0.42, -1.12], [
      E([0, 0.22, 0], [0.09, 0.23, 0.16], 0, 'jelly'),
      C([0, 0.5, 0], 0, 0.08, 0.16, 'jelly'),
      E([0.02, 0.25, 0.08], [0.03, 0.08, 0.03], 0, 'shine'),
    ], { r: [-0.55, 0, 0] })]);
    const body = segment('seg1', [0, 0.42, -0.2], [0.42, 0.38, 0.36],
      segment('seg2', [0, 0.36, -0.6], [0.36, 0.33, 0.32],
        segment('seg3', [0, 0.32, -0.94], [0.3, 0.28, 0.28], tail)));
    const head = joint('head', [0, 0.55, 0.25], [
      E([0, 0.62, 0.35], [0.52, 0.47, 0.46], 0, 'jelly'),
      E([0, 0.5, 0.48], [0.46, 0.36, 0.36], 0, 'jellyWhite'),
      sym(eye([0.2, 0.62, 0.74], 0.13, 'eyeBlue', 0.3, {})),
      sym(E([0.33, 0.47, 0.68], [0.08, 0.05, 0.03], [0, 0.6, 0], 'blush')),
      mouth([0, 0.44, 0.8], 0.07, 0.06),
      drop([0, 0.94, 0.7], 0.06, 'jelly', [-0.5, 0, 0]),
      sym(antenna),
      bubble([0.5, 0.75, 0.3], 0.07), bubble([-0.5, 0.75, 0.3], 0.07), bubble([0.42, 0.9, 0.05], 0.05),
      feet(0.45, 0.32, 0.07),
    ]);
    return [joint('root', [0, 0, 0], [head, body])];
  }

  // ======================================================================
  // 水仙子：水精靈小仙女（依骨架圖：頭、胸、腰、肩肘腕、髖膝踝、四片翅膀、長髮尾）
  // ======================================================================
  function fairy() {
    const HY = 0.95;   // 髖部高度（腳尖離水灘約 0.3）
    // 頭髮外殼：前面短（瀏海）、兩側與後面長；cut = 各方位的下緣角度（0 = 頭頂）
    const cut = Array.from({ length: 16 }, (_, i) => {
      const phi = (i / 16) * 2 * PI, front = Math.max(0, Math.sin(phi));    // phi = π/2 為正前方
      return 2.35 - 1.5 * Math.pow(front, 1.6);
    });
    const hairLock = (x, side) => G([x, 1.5, 0.05], [
      E([0, 0, 0], [0.08, 0.2, 0.08], 0, 'hairJelly'),
      E([side * 0.02, -0.25, -0.02], [0.07, 0.15, 0.07], 0, 'hairJelly'),
      E([side * 0.05, -0.42, 0.0], [0.05, 0.08, 0.05], 0, 'hairJelly'),
    ], { r: [0, 0, side * 0.12] });
    // 臉：圓潤小臉、靠近一點的大眼（上睫毛線＋兩根外側睫毛）、細眉、小鼻、彎彎的笑嘴
    const fairyEye = G([0.108, 1.565, 0.262], [
      E([0, 0, 0], [0.086, 0.1, 0.036], 0, 'eyeWhite'),
      E([0, -0.008, 0.012], [0.076, 0.09, 0.034], 0, 'eyeSky'),                 // 大大的藍色虹膜
      E([0, -0.03, 0.022], [0.058, 0.055, 0.028], 0, 'eyeLight'),               // 下半較亮（漸層感）
      E([0, 0.002, 0.03], [0.04, 0.05, 0.024], 0, 'eyeBlue'),
      E([0, 0.004, 0.04], [0.02, 0.026, 0.014], 0, 'pupil'),
      E([0.025, 0.04, 0.05], [0.026, 0.03, 0.01], 0, 'shine'),                  // 左上大反光
      E([-0.03, -0.045, 0.045], [0.012, 0.012, 0.006], 0, 'shine'),             // 右下小反光
      E([0.0, -0.06, 0.04], [0.03, 0.008, 0.005], 0, 'shine'),
      T([0, 0.006, 0.02], 0.088, 0.008, 'lash', { arc: PI * 0.62, r: [0, 0, PI * 0.14] }),   // 上眼線（只畫上緣，內眼角不延伸）
      C([0.085, 0.052, 0.018], 0.003, 0.009, 0.045, 'lash', { r: [0, 0, -0.95] }),
      C([0.072, 0.075, 0.018], 0.003, 0.008, 0.04, 'lash', { r: [0, 0, -0.55] }),
    ], { r: [0, 0.34, 0.28], s: [1.12, 0.86, 0.5] });   // 鳳眼：杏仁形、外眼角往上揚；Z 壓扁貼平臉面
    const head = joint('head', [0, 1.38, 0], [
      E([0, 1.6, 0.02], [0.29, 0.29, 0.27], 0, 'skin'),
      E([0, 1.5, 0.07], [0.22, 0.17, 0.21], 0, 'skin'),                                         // 圓圓的臉頰
      SH([0, 1.66, -0.01], 1, 2.4, 0.035, 'hairJelly', { s: [0.33, 0.34, 0.33], cut }),
      sym(fairyEye),
      sym(G([0.112, 1.708, 0.252], [E([0, 0, 0], [0.075, 0.009, 0.006], [0, 0, 0.06], 'browBlue')], { r: [0, 0.26, 0] })),   // 長而平的細眉
      // 開懷大笑：嘴寬、上緣平、下緣大圓弧，露出舌頭；嘴角往上翹
      G([0, 1.455, 0.262], [
        E([0, -0.008, 0], [0.07, 0.045, 0.016], 0, 'mouth'),
        E([0, -0.026, 0.008], [0.045, 0.02, 0.01], 0, 'tongue'),
        E([0, 0.03, 0.004], [0.08, 0.026, 0.018], 0, 'skin'),
        ...[1, -1].map((k) => E([k * 0.068, 0.008, 0.004], [0.012, 0.008, 0.008], [0, 0, k * 0.6], 'mouth')),
      ], { r: [-0.2, 0, 0], s: [1, 1, 0.5], id: 'mouth' }),
      sym(E([0.175, 1.49, 0.225], [0.05, 0.03, 0.015], [0, 0.6, 0], 'blush')),
      drop([0, 1.83, 0.285], 0.038, 'jelly', [-0.35, 0, 0]),
      ...sym(G([0, 0, 0], [
        seg([0.06, 1.95, 0.0], [0.13, 2.13, 0.0], 0.025, 0.022, 'hairJelly'),
        E([0.2, 2.16, 0.0], [0.1, 0.07, 0.07], [0, 0, 0.3], 'hairJelly'),
      ])),
      hairLock(0.28, 1), hairLock(-0.28, -1),
      E([0.32, 1.78, 0.0], [0.045, 0.045, 0.045], 0, 'bubble'), E([-0.32, 1.78, 0.0], [0.045, 0.045, 0.045], 0, 'bubble'),
      // 長髮尾：腦後一路垂到腳邊再捲起，尾端一顆水泡
      joint('hairTail', [0, 1.55, -0.25], [
        E([0, 1.3, -0.33], [0.18, 0.32, 0.12], 0, 'hairJelly'),
        E([0, 0.95, -0.38], [0.15, 0.3, 0.1], 0, 'hairJelly'),
        E([0.02, 0.65, -0.36], [0.11, 0.22, 0.09], 0, 'hairJelly'),
        T([0.08, 0.42, -0.34], 0.1, 0.055, 'hairJelly', { arc: PI * 1.4, r: [0, PI / 2, PI * 0.6] }),
        E([0.16, 0.36, -0.3], [0.06, 0.06, 0.06], 0, 'bubble'),
      ]),
    ]);
    const arm = joint('upperArmL', [0.12, 1.3, 0], [
      E([0.12, 1.3, 0], [0.045, 0.045, 0.045], 0, 'skin'),
      seg([0.12, 1.3, 0], [0.28, 1.17, 0.02], 0.038, 0.032, 'skin'),
      joint('forearmL', [0.28, 1.17, 0.02], [
        seg([0.28, 1.17, 0.02], [0.43, 1.06, 0.06], 0.031, 0.026, 'skin'),
        G([0.47, 1.04, 0.07], [E([0, 0, 0], [0.045, 0.02, 0.035], 0, 'skin'), E([0.035, 0.0, 0.02], [0.03, 0.012, 0.012], [0, 0.3, 0], 'skin')], { r: [0, 0, -0.5] }),
      ]),
    ]);
    const leg = joint('thighL', [0.07, HY, 0], [
      seg([0.07, HY, 0], [0.08, 0.66, 0.0], 0.06, 0.045, 'skin'),
      joint('shinL', [0.08, 0.66, 0.0], [
        seg([0.08, 0.66, 0], [0.08, 0.42, -0.01], 0.044, 0.032, 'skin'),
        joint('footL', [0.08, 0.4, -0.01], [
          E([0.08, 0.37, 0.02], [0.045, 0.04, 0.07], 0, 'jellyLight'),
          E([0.08, 0.41, 0.0], [0.04, 0.025, 0.04], 0, 'jelly'),
          E([0.08, 0.4, 0.07], [0.025, 0.02, 0.02], 0, 'jelly'),
        ]),
      ]),
    ]);
    const wing = (id, at, len, w, rz, ry) => joint(id, at, [G(at, wingPetal(len, w, 0.02, 'wing', 'wingTip'), { r: [0, ry, rz] })]);
    const skirtPetal = (a, len, m, tilt) => G([0.1 * Math.sin(a), 0.97, 0.08 * Math.cos(a)], petal(len, 0.12, 0.02, m, 'petalBlue', 0.7), { r: [PI - tilt, a, 0] });
    const chest = joint('chest', [0, 1.02, 0], [
      E([0, 1.17, 0], [0.12, 0.16, 0.09], 0, 'skin'),
      E([0, 1.12, 0.02], [0.125, 0.12, 0.095], 0, 'petalWhite'),
      G([0, 1.14, 0.1], [0, 0.6, -0.6].map((a) => G([0, 0, 0], petal(0.13, 0.05, 0.015, 'petalWhite', 'petalBlue', 0.7), { r: [-0.3, 0, a] }))),
      drop([0, 1.2, 0.1], 0.025, 'jelly', [-0.2, 0, 0]),
      sym(arm),
      head,
      // 四片翅膀（背後）：上翅大、下翅小
      wing('wingUL', [0.06, 1.25, -0.1], 0.72, 0.3, -1.0, 0.25),
      wing('wingUR', [-0.06, 1.25, -0.1], 0.72, 0.3, 1.0, -0.25),
      wing('wingLL', [0.06, 1.1, -0.1], 0.5, 0.21, -2.2, 0.2),
      wing('wingLR', [-0.06, 1.1, -0.1], 0.5, 0.21, 2.2, -0.2),
    ]);
    const hips = joint('hips', [0, HY, 0], [
      E([0, 0.98, 0], [0.11, 0.08, 0.085], 0, 'skin'),
      // 花瓣裙：兩層，外層白、內層淺藍
      Array.from({ length: 9 }, (_, i) => skirtPetal((i / 9) * 2 * PI, 0.3, 'petalWhite', 0.55)),
      Array.from({ length: 7 }, (_, i) => skirtPetal((i / 7 + 0.07) * 2 * PI, 0.22, 'petalBlue', 0.35)),
      // 裙襬兩側垂下的小水珠
      sym(G([0.2, 0.8, 0.02], [C([0, 0.04, 0], 0.004, 0.004, 0.1, 'jelly'), E([0, -0.03, 0], [0.035, 0.04, 0.035], 0, 'bubble')])),
      sym(leg),
      chest,
    ]);
    return [joint('root', [0, 0, 0], [hips])];
  }

  // ======================================================================
  // 水蛟龍王：長口鼻、可張開的下顎與獠牙、細長兇眼、長角、鬃鰭與長鬚、金冠藍寶石；
  //   九節 S 形長身（腹甲、背刺、側鱗）、前後四爪、胸鰭與大尾鰭
  // ======================================================================
  function dragon() {
    const Y = 1.2, N = 14, GAP = 0.44;
    const finP = (len, w) => petal(len, w, 0.03, 'dragonFin', 'finCream', 0.55, -0.6);      // 尖形鰭（越往尖端越窄）
    // 長鬚：從口鼻兩側往外、往下捲
    const whisker = (side) => {
      const pts = [[0.24, Y - 0.08, 1.36], [0.45, Y - 0.1, 1.42], [0.68, Y - 0.2, 1.35], [0.82, Y - 0.38, 1.15], [0.8, Y - 0.55, 0.95], [0.68, Y - 0.6, 0.85]].map(([x, y, z]) => [side * x, y, z]);
      return pts.slice(1).map((p, i) => seg(pts[i], p, 0.022 - i * 0.003, 0.019 - i * 0.003, 'whisker'));
    };
    const horn = (side) => {
      const pts = [[0.17, Y + 0.4, 0.86], [0.22, Y + 0.62, 0.72], [0.24, Y + 0.78, 0.52]].map(([x, y, z]) => [side * x, y, z]);
      return pts.slice(1).map((p, i) => seg(pts[i], p, 0.07 - i * 0.025, 0.045 - i * 0.025, 'hornCream'));
    };
    // 依原畫：圓頭、奶油色口鼻與下巴、大圓眼（深藍虹膜＋白色反光＋深色眼眶）、淺藍眉毛、頭頂金冠
    const head = joint('head', [0, Y, 0.62], [
      E([0, Y + 0.1, 0.92], [0.48, 0.44, 0.46], 0, 'dragon'),
      E([0, Y - 0.08, 1.18], [0.36, 0.25, 0.3], 0, 'belly'),                                   // 奶油色口鼻
      E([0, Y - 0.03, 1.42], [0.2, 0.13, 0.13], 0, 'belly'),
      sym(E([0.065, Y + 0.02, 1.54], [0.028, 0.016, 0.014], 0, 'pupil')),                       // 鼻孔
      T([0, Y - 0.13, 1.47], 0.07, 0.01, 'pupil', { arc: PI * 0.55, r: [0.25, 0, PI * 0.22] }),   // 抿著的嘴
      joint('jaw', [0, Y - 0.15, 1.05], [
        E([0, Y - 0.22, 1.27], [0.25, 0.08, 0.26], 0, 'belly'),
        E([0, Y - 0.17, 1.27], [0.18, 0.04, 0.2], 0, 'mouth'),
        ...[0.1, -0.1].map((x) => C([x, Y - 0.13, 1.42], 0, 0.02, 0.06, 'clawWhite')),
      ]),
      ...sym(G([0.22, Y + 0.1, 1.27], [
        T([0, 0, 0.0], 0.15, 0.018, 'eyeRing'),                                                  // 眼眶
        eye([0, 0, 0], 0.145, 'eyeBlue', 0, {}),
        E([0, -0.04, 0.05], [0.09, 0.07, 0.03], 0, 'eyeSky'),                                    // 虹膜下半亮藍
      ], { r: [0, 0.42, 0.32], s: [1.25, 0.72, 1] })),   // 鳳眼：杏仁形、外眼角上揚
      sym(G([0.25, Y + 0.21, 1.27], [E([0.02, 0, 0], [0.15, 0.035, 0.06], 0, 'whisker')], { r: [0, 0.42, 0.5] })),   // 淺藍眉：貼著眼睛上緣往外上揚
      sym(G([0.33, Y - 0.05, 1.08], petal(0.22, 0.08, 0.025, 'finCream', 'whisker', 0.6, -0.4), { r: [-0.8, 0.4, -2.0] })),   // 頰上的奶油色小鰭
      G([0, Y + 0.33, 1.28], [
        C([0, 0.12, 0], 0, 0.075, 0.32, 'gold', { seg: 4 }),                                    // 中央高尖
        sym(C([0.1, 0.04, -0.01], 0, 0.055, 0.22, 'gold', { seg: 4, r: [0, 0, -0.35] })),      // 兩側尖
        sym(C([0.19, -0.03, -0.03], 0, 0.04, 0.15, 'gold', { seg: 4, r: [0, 0, -0.8] })),
        sym(G([0.2, -0.02, -0.04], petal(0.26, 0.07, 0.02, 'gold', 'crownGem', 0.6, -0.3), { r: [-0.4, 0.3, -1.25] })),   // 金翼
        T([0, -0.08, -0.04], 0.2, 0.026, 'gold', { arc: PI, r: [PI / 2 - 0.5, 0, 0] }),       // 冠圈
        ...[-0.75, -0.4, 0.4, 0.75].map((a) => E([0.2 * Math.cos(PI / 2 - a), -0.08 + 0.2 * Math.sin(PI / 2 - a) * Math.sin(-0.5) * 0, 0.2 * Math.sin(PI / 2 - a) * 0.6 - 0.04], [0.022, 0.022, 0.022], 0, 'crownGem')),   // 金珠
        T([0, -0.02, 0.04], 0.085, 0.018, 'gold'),                                               // 寶石座
        E([0, -0.02, 0.05], [0.07, 0.085, 0.045], 0, 'gemBlue'),                                 // 中央大藍寶石
        E([0.02, 0.01, 0.09], [0.018, 0.022, 0.01], 0, 'shine'),
        sym(E([0.12, -0.05, 0.03], [0.03, 0.035, 0.022], 0, 'gemBlue')),                        // 兩側小寶石
      ], { r: [-0.55, 0, 0] }),
      horn(1), horn(-1),
      sym(G([0.38, Y + 0.18, 0.8], finP(0.7, 0.22), { r: [-1.15, 0.35, -1.0] })),
      sym(G([0.32, Y + 0.36, 0.74], finP(0.55, 0.16), { r: [-1.3, 0.25, -0.5] })),
      G([0, Y + 0.48, 0.72], finP(0.5, 0.15), { r: [-1.2, 0, 0] }),
      whisker(1), whisker(-1),
    ]);
    // 黃色四肢＋大白爪：粗短、往後收（浮游時自然下垂），腳掌寬、四根大彎爪朝前下方
    const leg = (id, at, len) => {
      const knee = [at[0] + 0.14, at[1] - len * 0.5, at[2] - 0.04], foot = [at[0] + 0.18, at[1] - len * 0.85, at[2] + 0.04];
      return joint(id, at, [
        E(at, [0.15, 0.15, 0.15], 0, 'dragonGold'),
        seg(at, knee, 0.14, 0.11, 'dragonGold'),
        seg(knee, foot, 0.11, 0.09, 'dragonGold'),
        E([foot[0], foot[1] - 0.03, foot[2] + 0.06], [0.15, 0.08, 0.16], 0, 'dragonGold'),
        ...[-0.1, -0.035, 0.035, 0.1].map((dx) => G([foot[0] + dx, foot[1] - 0.05, foot[2] + 0.2], [
          C([0, 0.07, 0], 0.03, 0.05, 0.14, 'clawWhite'), C([0, 0.19, 0.03], 0, 0.03, 0.14, 'clawWhite', { r: [0.7, 0, 0] }),
        ], { r: [PI / 2 + 0.35, 0, dx * 2.5] })),
      ]);
    };
    // 身體：14 節串接（頭接在第一節＝脖子上），越往後越細；腹甲、側鱗、背鰭
    const radii = Array.from({ length: N }, (_, i) => 0.44 - i * 0.024);
    const pos = radii.map((_, i) => [0, Y - 0.1, 0.3 - i * GAP]);
    const last = pos[N - 1];
    let chain = joint('tail', [0, last[1], last[2] - 0.12], [
      G([0, last[1] + 0.03, last[2] - 0.12], petal(1.25, 0.5, 0.035, 'dragonFin', 'finCream', 0.5), { r: [-PI / 2 + 0.75, 0, 0] }),
      G([0, last[1], last[2] - 0.12], petal(1.0, 0.42, 0.035, 'dragonFin', 'finCream', 0.5), { r: [-PI / 2 - 0.5, 0, 0] }),
      G([0, last[1] + 0.02, last[2] - 0.12], petal(0.6, 0.22, 0.03, 'dragonFin', 'finCream', 0.5), { r: [-PI / 2 + 0.12, 0, 0] }),
    ]);
    for (let i = N - 1; i >= 0; i--) {
      const r = radii[i], p = pos[i];
      chain = joint('seg' + (i + 1), p, [
        E(p, [r, r * 0.92, r * 1.55], 0, 'dragon'),
        E([0, p[1] - r * 0.45, p[2]], [r * 0.7, r * 0.52, r * 1.45], 0, 'belly'),
        ...[-0.25, 0.25].map((dz) => E([0, p[1] - r * 0.86, p[2] + dz * r * 2], [r * 0.55, 0.02, r * 0.28], 0, 'finCream')),
        ...[-1, 1].flatMap((sd) => [-0.4, 0.4].map((dz) => E([sd * r * 0.82, p[1] + r * 0.3, p[2] + dz * r], [0.025, r * 0.28, r * 0.32], [0, 0, sd * 0.6], 'dragonDeep'))),
        i < N - 2 ? G([0, p[1] + r * 0.85, p[2] - 0.05], finP(0.34 - i * 0.015, 0.12), { r: [-0.9, 0, 0] }) : [],
        i === 0 ? head : [],
        i === 1 ? sym(leg('legFL', [r * 0.85, p[1] - 0.15, p[2] + 0.05], 0.48)) : [],
        i === 7 ? sym(leg('legBL', [r * 0.85, p[1] - 0.12, p[2]], 0.4)) : [],
        i === 2 ? sym(joint('finL', [r * 0.9, p[1], p[2]], [G([r * 0.9, p[1], p[2]], finP(0.9, 0.3), { r: [-0.7, 0.5, -1.6] })])) : [],
        i === 9 ? sym(G([r * 0.85, p[1] - 0.05, p[2]], finP(0.45, 0.18), { r: [-0.8, 0.4, -1.9] })) : [],
        chain,
      ]);
    }
    return [joint('root', [0, 0, 0], [chain])];
  }

  // ======================================================================
  // 動作：每隻 { idle, move, attack, ultimate } = { dur, pose(n, t), fx: [[秒, 特效, 參數]] }
  //   n.節點名 → { r: [rx, ry, rz] 增量, p: [dx, dy, dz] 增量 }（index.html 疊加在靜止姿勢上）
  // ======================================================================
  const s = Math.sin, TAU = 2 * PI;
  const ease = (x) => x * x * (3 - 2 * x);
  const env = (t, a, b) => (t < a || t > b ? 0 : Math.sin(((t - a) / (b - a)) * PI));     // a~b 之間的一個鼓起
  const ramp = (t, a, b) => ease(Math.min(1, Math.max(0, (t - a) / (b - a))));

  // 水蛟龍王：S 形盤踞程度 k（0 = 伸直，1 = 完全盤起）
  const DRAGON_N = 14;
  // 大絕立起的螺旋：neck 脖子仰角、pitch／bend／twist 每節的俯仰／側彎／扭轉（到第 upTo 節），之後幾節 lay／layBend 平躺盤地；stand = 整體抬高量
  const DRAGON_HELIX = { neck: -1.3, pitch: 0.12, bend: 0.3, twist: 0.35, upTo: 8, lay: 0.85, layBend: 0.3, stand: 1.85 };
  function coil(n, k, a) {
    n.root.p = [0, -0.62 * k, 0];
    n.seg1.r = [-0.7 * k + 0.03 * s(a), 0.05 * s(a), 0];               // 脖子立起
    n.seg2.r = [0.62 * k, 0.2 * k, 0];                                  // 回到地面
    for (let i = 3; i <= DRAGON_N; i++) n['seg' + i].r = [0, (i <= 8 ? 0.6 : -0.72) * k + 0.03 * s(a - i * 0.5), 0];   // 緊密的 S 形：第 3–8 節往一邊彎，第 9 節起往另一邊彎
  }
  function legs(n, spread, swing) {
    n.legFL.r = [-0.4 * spread + 0.3 * swing, 0, 0.2 * spread]; n.legFR.r = [-0.4 * spread + 0.3 * swing, 0, -0.2 * spread];
    n.legBL.r = [-0.3 * spread, 0, 0.25 * spread]; n.legBR.r = [-0.3 * spread, 0, -0.25 * spread];
  }
  // 金魚大絕：浮起 → 往後翻身一圈 → 對準前方吐出水柱（r = 水柱粗細），吐的時候身體被反作用力往後推
  const fishUlt = (r, color) => ({ dur: 3.8, pose(n, t) {
    const up = env(t, 0.1, 3.6), flip = ramp(t, 0.25, 1.15) * TAU, spit = env(t, 1.3, 3.2);
    n.body.p = [0, 0.4 * up, -0.25 * spit]; n.body.r = [-flip - 0.15 * spit, 0, 0];
    n.tail.r = [0, 0.9 * s(t * 18) * (0.4 + spit), 0]; n.finL.r = [0, 0, 0.8 * s(t * 12)]; n.finR.r = [0, 0, -0.8 * s(t * 12)]; n.dorsal.r = [-0.2 * spit, 0, 0]; },
    fx: [[0.2, 'ripple', { r: 1.6 }], [1.3, 'beam', { node: 'body', at: [0, 0.88, 0.62], color, dur: 1.9, r, len: 5 }], [1.35, 'splash', { n: 14, z: 0.8 }], [3.2, 'ripple', { r: 2.2 }]] });
  const fishActions = (ult) => ({
    idle: { dur: 3, pose(n, t) { const a = (t / 3) * TAU;
      n.body.p = [0, 0.06 * s(a), 0]; n.body.r = [0.05 * s(a), 0.1 * s(a), 0];
      n.tail.r = [0, 0.25 * s(a * 2), 0]; n.finL.r = [0, 0, 0.25 * s(a * 2)]; n.finR.r = [0, 0, -0.25 * s(a * 2)]; n.dorsal.r = [0.08 * s(a * 2), 0, 0]; } },
    move: { dur: 1.2, pose(n, t) { const a = (t / 1.2) * TAU;
      n.body.p = [0.08 * s(a), 0.05 * s(a * 2), 0.1 * s(a)]; n.body.r = [0.1, 0.18 * s(a), 0.05 * s(a)];
      n.tail.r = [0, 0.7 * s(a * 2), 0]; n.finL.r = [0, 0, 0.5 * s(a * 2)]; n.finR.r = [0, 0, -0.5 * s(a * 2)]; n.dorsal.r = [-0.15, 0.15 * s(a * 2), 0]; },
      fx: [[0, 'trail'], [0.6, 'trail']] },
    attack: { dur: 1.6, pose(n, t) {                                 // 往後縮蓄力 → 往前衝 → 吐水彈
      const back = env(t, 0, 0.5), lunge = env(t, 0.45, 0.85);
      n.body.p = [0, 0.1 * back, -0.35 * back + 0.6 * lunge]; n.body.r = [-0.35 * back + 0.25 * lunge, 0, 0];
      n.tail.r = [0, 0.9 * s(t * 14) * (back + lunge), 0]; n.finL.r = [0, 0, 0.6 * back]; n.finR.r = [0, 0, -0.6 * back]; n.dorsal.r = [-0.2 * lunge, 0, 0]; },
      fx: [[0.6, 'bullet', { y: 1.0, z: 0.7 }]] },
    ultimate: ult,
  });
  const ACTIONS = {
    goldfish: fishActions(fishUlt(0.16, 0x7fd2ff)),
    king: fishActions(fishUlt(0.32, 0xffd27a)),
    queen: fishActions(fishUlt(0.32, 0xe8f4ff)),
    caterpillar: {
      idle: { dur: 3, pose(n, t) { const a = (t / 3) * TAU;
        n.head.r = [0.05 * s(a), 0.12 * s(a), 0]; ['seg1', 'seg2', 'seg3'].forEach((k, i) => (n[k].r = [0.04 * s(a - i), 0, 0], n[k].p = [0, 0.02 * s(a * 2 - i), 0]));
        n.tail.r = [0.15 * s(a * 2), 0, 0.1 * s(a)]; n.antL.r = [0, 0, 0.15 * s(a * 2)]; n.antR.r = [0, 0, -0.15 * s(a * 2 + 0.5)]; } },
      move: { dur: 1.4, pose(n, t) { const a = (t / 1.4) * TAU;     // 一波一波往前蠕動
        n.root.p = [0, 0, 0.12 * s(a)]; n.head.r = [0.12 * s(a), 0.05 * s(a), 0]; n.head.p = [0, 0.05 * Math.max(0, s(a)), 0];
        ['seg1', 'seg2', 'seg3'].forEach((k, i) => (n[k].p = [0, 0.12 * Math.max(0, s(a - (i + 1) * 0.9)), 0], n[k].r = [0.2 * s(a - (i + 1) * 0.9), 0, 0]));
        n.tail.r = [0.3 * s(a - 3.6), 0, 0]; n.antL.r = [0.2 * s(a * 2), 0, 0.2]; n.antR.r = [0.2 * s(a * 2), 0, -0.2]; },
        fx: [[0.2, 'ripple', { r: 1.2 }], [0.9, 'ripple', { r: 1.2 }]] },
      attack: { dur: 1.6, pose(n, t) {                                // 後仰蓄力 → 頭槌往前 → 吐水彈
        const back = env(t, 0, 0.55), hit = env(t, 0.5, 0.95);
        n.root.p = [0, 0, -0.15 * back + 0.35 * hit]; n.head.r = [-0.45 * back + 0.35 * hit, 0, 0]; n.head.p = [0, 0.15 * back, 0];
        ['seg1', 'seg2', 'seg3'].forEach((k, i) => (n[k].r = [0.15 * back * (i + 1) * 0.5, 0, 0]));
        n.tail.r = [-0.6 * back, 0, 0]; n.antL.r = [-0.5 * back, 0, 0.4 * hit]; n.antR.r = [-0.5 * back, 0, -0.4 * hit]; },
        fx: [[0.62, 'bullet', { y: 0.55, z: 0.9 }], [0.7, 'splash', { n: 10, z: 0.9 }]] },
      ultimate: { dur: 4, pose(n, t) {                                 // 吐絲：昂首蓄力 → 連續三次往前吐絲，前方結成絲網
        const rear = env(t, 0, 0.7), spit = [1.0, 1.7, 2.4].reduce((m, x) => Math.max(m, env(t, x - 0.15, x + 0.35)), 0);
        n.root.p = [0, 0.1 * rear, -0.1 * rear]; n.head.r = [-0.5 * rear + 0.25 * spit, 0.15 * s(t * 3), 0]; n.head.p = [0, 0.1 * rear, 0.08 * spit];
        ['seg1', 'seg2', 'seg3'].forEach((k, i) => (n[k].r = [0.2 * rear - 0.1 * spit, 0, 0], n[k].p = [0, 0.03 * spit, 0]));
        n.tail.r = [-0.5 * rear, 0, 0.2 * s(t * 8)]; n.antL.r = [-0.4 * rear, 0, 0.3 * spit]; n.antR.r = [-0.4 * rear, 0, -0.3 * spit]; },
        fx: [[1.0, 'silk', { node: 'head', at: [0, 0.44, 0.84] }], [1.7, 'silk', { node: 'head', at: [0, 0.44, 0.84] }], [2.4, 'silk', { node: 'head', at: [0, 0.44, 0.84], web: true }]] },
    },
    fairy: {
      idle: { dur: 3, pose(n, t) { const a = (t / 3) * TAU, f = s(t * 18);
        n.root.p = [0, 0.06 * s(a), 0]; n.hips.r = [0, 0.1 * s(a), 0]; n.chest.r = [0.03 * s(a), 0, 0]; n.head.r = [0.05 * s(a), 0.15 * s(a), 0.05 * s(a)];
        n.upperArmL.r = [0, 0, 0.12 * s(a)]; n.upperArmR.r = [0, 0, -0.12 * s(a)];
        n.thighL.r = [-0.15, 0, 0]; n.shinL.r = [0.35, 0, 0]; n.thighR.r = [0.1, 0, 0]; n.shinR.r = [0.6, 0, 0]; n.footL.r = [0.3, 0, 0]; n.footR.r = [0.4, 0, 0];
        n.wingUL.r = [0, 0.35 * f, 0]; n.wingUR.r = [0, -0.35 * f, 0]; n.wingLL.r = [0, 0.3 * f, 0]; n.wingLR.r = [0, -0.3 * f, 0]; n.hairTail.r = [0.25 + 0.08 * s(a), 0, 0.1 * s(a * 2)];
        n.mouth.s = [1, 0.25 + 0.75 * Math.max(0, s(a * 2)), 1]; } },   // 待機：一下笑開、一下閉上
      move: { dur: 1.2, pose(n, t) { const a = (t / 1.2) * TAU, f = s(t * 24);      // 前傾飛行、雙腳交替踢水
        n.root.p = [0, 0.15 + 0.06 * s(a * 2), 0.1 * s(a)]; n.hips.r = [0.35, 0.1 * s(a), 0]; n.chest.r = [0.05, 0, 0]; n.head.r = [-0.3, 0, 0];
        n.upperArmL.r = [0.4, 0, -0.3]; n.upperArmR.r = [0.4, 0, 0.3];
        n.thighL.r = [0.3 * s(a), 0, 0]; n.shinL.r = [0.7 + 0.4 * s(a + 1), 0, 0]; n.thighR.r = [-0.3 * s(a), 0, 0]; n.shinR.r = [0.7 - 0.4 * s(a + 1), 0, 0]; n.footL.r = [0.5, 0, 0]; n.footR.r = [0.5, 0, 0];
        n.wingUL.r = [0, 0.6 * f, 0]; n.wingUR.r = [0, -0.6 * f, 0]; n.wingLL.r = [0, 0.5 * f, 0]; n.wingLR.r = [0, -0.5 * f, 0]; n.hairTail.r = [1.0 + 0.12 * s(a * 2), 0, 0.15 * s(a * 2)]; n.mouth.s = [1, 0.6 + 0.4 * s(a * 2), 1]; },
        fx: [[0, 'sparkle'], [0.6, 'sparkle']] },
      attack: { dur: 1.6, pose(n, t) { const f = s(t * 20), cast = env(t, 0, 0.6), push = env(t, 0.5, 1.0);   // 右手聚水球 → 推出
        n.root.p = [0, 0.08 * cast, 0.15 * push]; n.hips.r = [0.1 * push, -0.4 * cast + 0.2 * push, 0]; n.chest.r = [0, -0.3 * cast, 0]; n.head.r = [0, 0.2 * cast, 0];
        n.upperArmR.r = [-1.3 * cast - 1.4 * push, 0, 0.6 * cast]; n.forearmR.r = [0, 0, -0.9 * cast + 0.6 * push]; n.upperArmL.r = [-0.4 * push, 0, 0.4 * cast];
        n.thighL.r = [-0.2, 0, 0]; n.shinL.r = [0.4, 0, 0]; n.thighR.r = [0.2 * push, 0, 0]; n.shinR.r = [0.6, 0, 0]; n.footL.r = [0.3, 0, 0]; n.footR.r = [0.4, 0, 0];
        n.wingUL.r = [0, 0.4 * f, 0]; n.wingUR.r = [0, -0.4 * f, 0]; n.wingLL.r = [0, 0.3 * f, 0]; n.wingLR.r = [0, -0.3 * f, 0]; n.hairTail.r = [0.3 + 0.4 * push, 0, 0]; n.mouth.s = [1, 0.2 + 0.8 * push + 0.3 * cast, 1]; },
        fx: [[0.15, 'orb', { dur: 0.6 }], [0.75, 'bullet', { y: 1.25, z: 0.5, x: -0.3 }]] },
      ultimate: { dur: 4.2, pose(n, t) { const f = s(t * 26), up = env(t, 0.2, 3.9), spin = ramp(t, 0.4, 3.6) * TAU;   // 水之花綻：雙手高舉、旋轉升空，水蓮花綻放，降下水雨
        n.root.p = [0, 0.7 * up, 0]; n.hips.r = [0, spin, 0]; n.chest.r = [-0.15 * up, 0, 0]; n.head.r = [-0.35 * up, 0, 0];
        n.upperArmL.r = [0, 0, 1.6 * up]; n.upperArmR.r = [0, 0, -1.6 * up]; n.forearmL.r = [0, 0, 0.4 * up]; n.forearmR.r = [0, 0, -0.4 * up];
        n.shinL.r = [0.2, 0, 0]; n.shinR.r = [0.2, 0, 0]; n.footL.r = [0.6 * up, 0, 0]; n.footR.r = [0.6 * up, 0, 0];
        n.wingUL.r = [0, 0.7 * f, -0.3 * up]; n.wingUR.r = [0, -0.7 * f, 0.3 * up]; n.wingLL.r = [0, 0.6 * f, 0]; n.wingLR.r = [0, -0.6 * f, 0]; n.hairTail.r = [0.3 + 0.5 * up, 0, 0.3 * s(t * 3)]; n.mouth.s = [1, 0.3 + 0.7 * up, 1]; },
        fx: [[0.6, 'lotus', { dur: 3 }], [1.2, 'rain', { dur: 2.4 }], [3.7, 'splash', { n: 40 }], [3.7, 'ripple', { r: 3 }]] },
    },
    dragon: {
      // 待機：S 形盤踞。脖子立起、頭朝前；身體前半往一邊彎、後半往另一邊彎，躺在水灘上
      idle: { dur: 3.6, pose(n, t) { const a = (t / 3.6) * TAU;
        coil(n, 1, a);
        n.head.r = [0.35 + 0.05 * s(a), 0.15 * s(a), 0]; n.jaw.r = [0.04 + 0.04 * s(a * 2), 0, 0];
        n.tail.r = [-0.2, 0.3 + 0.2 * s(a * 2), 0]; n.finL.r = [0, 0, 0.2 * s(a * 2)]; n.finR.r = [0, 0, -0.2 * s(a * 2)];
        legs(n, 0.6, 0); } },
      // 移動：身體左右彎曲又伸展（彎曲幅度隨時間一大一小），四肢交替划
      move: { dur: 2, pose(n, t) { const a = (t / 2) * TAU, amp = 0.28 + 0.18 * s(a);
        n.root.p = [0, -0.05, 0.25 * s(a)]; n.head.r = [0.05, -0.2 * s(a + 0.6), 0]; n.jaw.r = [0.05, 0, 0];
        for (let i = 1; i <= DRAGON_N; i++) n['seg' + i].r = [i === 1 ? -0.1 : 0.03 * s(a * 2 - i), (i === 1 ? 0.5 : 1) * amp * s(a * 2 - i * 0.75), 0];
        n.tail.r = [0.2 * s(a * 2 - 7), 0.5 * s(a * 2 - 10), 0]; n.finL.r = [0, 0, 0.5 * s(a * 2)]; n.finR.r = [0, 0, -0.5 * s(a * 2)];
        ['legFL', 'legFR', 'legBL', 'legBR'].forEach((k, i) => (n[k].r = [0.8 * s(a * 2 + (i % 2) * PI + (i > 1 ? 1.2 : 0)), 0, 0])); },
        fx: [[0, 'trail'], [1, 'trail']] },
      // 攻擊：半盤著把上身昂起蓄力 → 張口往前撲咬 → 噴大水彈
      attack: { dur: 1.9, pose(n, t) { const coilK = 0.55, rear = env(t, 0, 0.65), bite = env(t, 0.6, 1.15);
        coil(n, coilK, 0);
        n.root.p = [0, -0.62 + 0.25 * rear, 0.6 * bite];
        n.seg1.r = [-0.55 * rear - 0.3 * bite, 0, 0]; n.seg2.r = [0.3 * rear + 0.2 * bite, 0, 0];
        n.head.r = [0.3 + 0.25 * rear + 0.3 * bite, 0, 0];                // 脖子抬起時頭往下補，嘴巴保持水平正對前方 n.jaw.r = [0.6 * rear + 0.3 * bite, 0, 0];
        n.tail.r = [0.3 * rear, 0.6 * s(t * 10) * bite, 0]; n.finL.r = [0, 0, 0.5 * rear]; n.finR.r = [0, 0, -0.5 * rear];
        legs(n, 0.5, rear - bite); },
        fx: [[0.75, 'bullet', { node: 'head', at: [0, 1.1, 1.55], big: true, flat: true }], [0.8, 'splash', { n: 16, z: 2 }]] },
      // 大絕：盤旋升空（身體一圈圈往上盤），昂首張口噴出巨型水柱，四周掀起浪圈
      // 大絕：頭帶著身體一邊繞圈一邊往上爬升（螺旋），直到上身立起、尾巴仍盤在地上，才低頭對準前方吐出超粗水柱
      ultimate: { dur: 5.8, pose(n, t) {
        const p = ramp(t, 0.15, 2.7), aim = ramp(t, 2.6, 3.1), roar = env(t, 2.9, 5.2), back = ramp(t, 5.2, 5.8), w = p * (1 - back);
        coil(n, 1, t);                                                   // 起點：盤踞
        const lerp3 = (A, B, k) => A.map((v, i) => v + (B[i] - v) * k);
        // 立起的姿勢：脖子幾乎垂直、身體往下一圈圈螺旋（每節側彎＋扭轉），最後幾節平躺盤在地上
        const H = root.WATER_DRAGON_HELIX || DRAGON_HELIX;
        n.seg1.r = lerp3(n.seg1.r, [H.neck, 0, 0], w);
        for (let i = 2; i <= DRAGON_N; i++) n['seg' + i].r = lerp3(n['seg' + i].r, i <= H.upTo ? [H.pitch, H.bend, H.twist] : [H.lay, H.layBend, 0], w);
        // 頭帶著繞：整條身體繞垂直軸轉兩圈後回到正面；身體立起時整體抬高
        n.root.r = [0, TAU * 2 * p, 0];                                 // 旋轉兩整圈：立起吐水柱時正好面向正前方
        n.root.p = [0, n.root.p[1] + H.stand * w, 0];
        n.head.r = [0.35 + (-0.3 * (1 - aim) + 1.15 * aim) * w, 0.25 * s(t * 3) * (1 - aim), 0]; n.jaw.r = [0.1 + 0.8 * roar, 0, 0];
        n.tail.r = [-0.2, 0.4 * s(t * 6), 0]; n.finL.r = [0, 0, 0.7 * w]; n.finR.r = [0, 0, -0.7 * w];
        legs(n, 0.6 + 0.4 * w, s(t * 8) * w); },
        fx: [[0.15, 'ripple', { r: 3 }], [0.3, 'vortex', { color: 0x4fa8ff, dur: 2.4, r: 2.2, h: 4 }], [3.0, 'beam', { node: 'head', at: [0, 1.1, 1.55], color: 0x3f9cf0, dur: 2.2, r: 0.85, len: 7, swirl: true, flat: true }], [3.1, 'wave', { r: 5 }], [4.1, 'wave', { r: 5 }], [5.2, 'splash', { n: 60 }]] },
    },
  };

  const SPIRITS = [
    { id: 'goldfish', name: '小金魚', stage: '1階', ref: 'ref/goldfish.webp', puddle: 1.15, ult: '翻身細水柱', atk: '水彈',
      parts: goldfish({ body: 'redFish', belly: 'cream', fin: 'redFin', finTip: 'cream', iris: 'eyeRed', scale: 'redFin' }) },
    { id: 'king', name: '金魚國王', stage: '2階', ref: 'ref/king.webp', puddle: 1.2, ult: '翻身金色粗水柱', atk: '水彈',
      parts: goldfish({ body: 'goldFish', belly: 'cream', fin: 'goldFin', finTip: 'cream', iris: 'eyeAmber', scale: 'goldFin', extra: [kingCrown] }) },
    { id: 'queen', name: '金魚皇后', stage: '2階', ref: 'ref/queen.webp', puddle: 1.2, ult: '翻身珍珠粗水柱', atk: '水彈',
      parts: goldfish({ body: 'silverFish', belly: 'pearlCream', fin: 'silverFin', finTip: 'pearlCream', iris: 'eyeBrown', scale: 'silverFin', extra: [queenTiara, lashes] }) },
    { id: 'caterpillar', name: '水毛蟲', stage: '1階', ref: 'ref/caterpillar.webp', puddle: 1.35, ult: '吐絲結網', atk: '頭槌水彈', parts: caterpillar() },
    { id: 'fairy', name: '水仙子', stage: '2階', ref: 'ref/fairy.webp', ref2: 'ref/fairy-rig.webp', puddle: 1.1, ult: '水之花綻', atk: '水球', parts: fairy() },
    { id: 'dragon', name: '水蛟龍王', stage: '3階', ref: 'ref/dragon.webp', puddle: 3.0, scale: 1.4, ult: '盤旋怒濤龍息', atk: '龍咬水彈', parts: dragon() },
  ];
  SPIRITS.forEach((sp) => (sp.actions = ACTIONS[sp.id]));
  root.WATER_SPIRITS = { SPIRITS, MATERIALS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
