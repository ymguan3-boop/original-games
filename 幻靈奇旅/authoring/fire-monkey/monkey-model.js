// 火猴兩階（C囝仔 → C老猴）：以小男孩主角的骨架為架構建模
//   關節名稱、樞紐位置、左右鏡射、手上掛點（propL/R、fxL/R、ball）與五官切換節點（eyeOpen…、mouth…、brow）
//   全部沿用 kid-model.js，所以主角的 19 個烘焙動作（actions.baked.js）可直接套用在兩隻猴子身上。
//   另外加上尾巴關節鏈（tail0…tail6）與尾巴火焰（tailFlame），由預覽頁做程序擺動。
// 座標慣例同主角：面向 +Z、腳底 y=0；頭部零件寫在「頭部未下移前」的座標（主角頭心 y 2.03），手臂寫在「肩膀未下移前」的座標（肩 y 1.55）。
// 需先載入 kid-model.js（取用 __KID_PARTS__ 的骨架數值）；本檔不修改主角模型。
(function (root) {
  const PI = Math.PI;
  const K = root.__KID_PARTS__;
  const OFF = K.OFF;

  let STAGE = 1;
  const E = (p, s, r, m) => ({ t: 'ell', p, s, r: r || [0, 0, 0], m, stage: STAGE });
  const T = (p, R, tube, m, o = {}) => ({ t: 'torus', p, R, tube, arc: o.arc || PI * 2, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const C = (p, rt, rb, h, m, o = {}) => ({ t: 'cyl', p, rt, rb, h, seg: o.seg || 32, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const B = (p, size, m, o = {}) => ({ t: 'box', p, size, bevel: o.bevel ?? 0.01, r: o.r || [0, 0, 0], s: [1, 1, 1], m, stage: STAGE });
  const L = (p, pts, m, o = {}) => ({ t: 'lathe', p, pts, phiStart: o.phiStart || 0, phiLength: o.phiLength || PI * 2, th: 0.02, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const ST = (p, points, ro, ri, depth, m, o = {}) => ({ t: 'star', p, points, ro, ri, depth, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const G = (p, c, o = {}) => ({ t: 'g', p, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], c: [c].flat(Infinity), id: o.id });
  const swapLR = (id) => (id.endsWith('L') ? id.slice(0, -1) + 'R' : id.endsWith('R') ? id.slice(0, -1) + 'L' : id);
  function mirror(node) {
    const q = JSON.parse(JSON.stringify(node));
    (function f(n) { n.p = [-n.p[0], n.p[1], n.p[2]]; n.r = [n.r[0], -n.r[1], -n.r[2]]; if (n.id) n.id = swapLR(n.id); if (n.c) n.c.forEach(f); })(q);
    return q;
  }
  const sym = (n) => [n, mirror(n)];
  const joint = (id, at, parts, s0) => G(at, [G([-at[0], -at[1], -at[2]], parts)], { id, s: s0 });
  function seg(A, Bp, ra, rb, m) {
    const d = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]], len = Math.hypot(...d), u = d.map((v) => v / len);
    return C([(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2, (A[2] + Bp[2]) / 2], rb, ra, len, m, { r: [Math.atan2(u[2], u[1]), 0, -Math.asin(u[0])] });
  }
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const shift = (node, dy) => { node.p = [node.p[0], node.p[1] + dy, node.p[2]]; return node; };

  // ---- 主角骨架（與 kid-model.js 相同；下移量依主角身形公式換算） ------------------
  const HEM = 0.8, TORSO_K = 2 / 3, ARM_K = 0.85;
  const sq = (y) => +(HEM + (y - HEM) * TORSO_K).toFixed(4);
  const ay = (y) => +(1.55 + (y - 1.55) * ARM_K).toFixed(4);
  const DY_HEAD = sq(1.655) - 1.655, DY_ARM = sq(1.55) - 1.55;
  const LX = 0.145;
  const SK0 = {
    root: [0, 0, 0], hips: [0, 0.66, 0], chest: [0, 0.82, 0], head: [0, 1.7, 0],
    upperArmL: [0.29, 1.55, 0], forearmL: [0.345, ay(1.27), 0], handL: [0.36, ay(0.97), 0.01],
    thighL: [LX, 0.6, 0], shinL: [LX, 0.32, 0], footL: [LX, 0.11, 0],
  };
  const GRIP_L = K.GRIP_L, MUZZLE = K.MUZZLE;
  const KID_EYE = [0.085, 1.973, 0.219], KID_BROW = [0.09, 2.045, 0.229], KID_MOUTH = [0, 1.835, 0.197];

  // 火焰：紅色底 → 橘色中段 → 黃色尖端，三層上下錯開（任何角度都看得到漸層）
  const flame = (p, h, w, r, o = {}) => G(p, [
    E([0, h * 0.32, 0], [w, h * 0.42, w * (o.d || 0.8)], 0, 'flameRed'),
    E([0, h * 0.58, 0], [w * 0.74, h * 0.34, w * 0.62 * (o.d || 0.8) / 0.8], [o.bend || 0, 0, 0], 'flameOrange'),
    E([0, h * 0.84, -(o.bend || 0) * h * 0.25], [w * 0.42, h * 0.22, w * 0.4], [(o.bend || 0) * 1.6, 0, 0], 'flameYellow'),
  ], { r });

  // ---- 共用：手、腳、尾巴 ------------------------------------------------------
  // 拳頭與主角同一個握點（握點穿過拳心），只是換成猴子的米色手掌
  function fist(m) {
    return [
      E([0.367, ay(0.97) - 0.062, 0.028], [0.05, 0.058, 0.054], [0, 0, 0.05], m),
      E([0.381, ay(0.97) - 0.09, 0.03], [0.038, 0.026, 0.05], [0, 0, 0.1], m),
      E([0.338, ay(0.97) - 0.05, 0.064], [0.02, 0.036, 0.021], [0.45, 0, 0.25], m),
    ];
  }
  function sockets() {
    return [joint('propL', GRIP_L, []), joint('fxL', add(GRIP_L, MUZZLE), [], OFF)];
  }
  // 猴掌腳：大腳掌＋三根圓腳趾＋後跟
  function monkeyFoot(m, sz = 1) {
    return [
      E([LX, 0.05, 0.05], [0.085 * sz, 0.05, 0.14 * sz], 0, m),
      ...[-0.045, 0, 0.045].map((dx) => E([LX + dx * sz, 0.035, 0.17 * sz], [0.03 * sz, 0.03, 0.035 * sz], 0, m)),
      E([LX + 0.075 * sz, 0.04, 0.09], [0.025, 0.025, 0.03], [0, 0.5, 0], m),   // 大拇趾（外側）
      E([LX, 0.06, -0.05], [0.07 * sz, 0.055, 0.06], 0, m),
    ];
  }
  // 尾巴：從腰後伸出，往外下彎再翹起成 S 形，尾端一團火焰；每一節一個關節（預覽頁做波浪擺動）
  function tail(pts, r0, r1, m, flameH) {
    const n = pts.length - 1;
    let node = null;
    for (let i = n - 1; i >= 0; i--) {
      const ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n);
      const parts = [seg(pts[i], pts[i + 1], ra, rb, m), E(pts[i + 1], [rb, rb, rb], 0, m)];
      if (i === n - 1) parts.push(joint('tailFlame', pts[n], [flame(add(pts[n], [0, -0.03, 0]), flameH, flameH * 0.42, [0, 0, -0.15], { bend: -0.3 })]));
      if (node) parts.push(node);
      node = joint('tail' + i, pts[i], parts);
    }
    return node;
  }

  // ---- 五官切換節點（與主角同名：動作檔用縮放切換表情、用位置＋旋轉動眉毛） --------------------
  function eyeSet(eyeAt, ry, open, lineM) {
    const arc = (o, a, rz) => T(add(eyeAt, o), 0.042, 0.009, lineM, { arc: PI * a, r: [0, ry, rz] });
    return [
      joint('eyeOpenL', eyeAt, [G(eyeAt, open, { r: [0, ry, 0] })]),
      joint('eyeHappyL', eyeAt, [arc([0, -0.008, 0.004], 0.75, 0)], OFF),
      joint('eyeSadL', eyeAt, [arc([0, -0.012, 0.004], 0.65, -0.35)], OFF),
      joint('eyeShutL', eyeAt, [T(add(eyeAt, [0, 0, 0.004]), 0.036, 0.009, lineM, { arc: PI * 0.7, r: [0, ry, PI] })], OFF),
    ];
  }
  // 眉毛：動作檔把 browL 放回主角的眉毛樞紐，所以樞紐沿用主角位置、眉毛本體放在猴臉上
  const brow = (at, s, r, m) => joint('browL', KID_BROW, [E(at, s, r, m)]);

  // ================================================================================
  // 1 階：C囝仔（大頭、大耳、頭頂一撮火焰、紅色領巾、吐舌缺牙的壞笑）
  // ================================================================================
  const KID_K = 0.76, KID_W = 1 / KID_K;   // C囝仔：身體＋腿縮成 0.76 倍長，粗細維持
  // 只加粗靜態零件（不包住子關節，避免非等比縮放讓關節轉動時變形）：以 (cx, cz) 為軸心，x、z 放大
  const fat = (parts, cx = 0, cz = 0, w = KID_W) => G([cx, 0, cz], [G([-cx, 0, -cz], parts)], { s: [w, 1, w] });
  const fatAll = (parts, c, w = KID_W) => G(c, [G(c.map((v) => -v), parts)], { s: [w, w, w] });
  function buildKid() {
    // 頭心（頭部座標）
    const HC = [0, 2.0, 0], HS = [0.335, 0.315, 0.3];
    STAGE = 1;
    const ear = G([0.34, 2.02, -0.03], [
      E([0, 0, 0], [0.05, 0.13, 0.125], 0, 'fur'),
      E([0.022, -0.005, 0.008], [0.03, 0.095, 0.09], 0, 'earPink'),
    ], { r: [0, -0.95, 0.15] });
    // 頭頂一大撮往後上方捲起的火焰毛（前面兩小撮陪襯）
    const tuft = G([0, 2.25, 0.06], [
      flame([0, 0, 0], 0.44, 0.1, [-0.45, 0, 0.12], { bend: -0.5, d: 0.6 }),
      flame([0.05, -0.01, 0.06], 0.22, 0.06, [-0.1, 0, -0.5], { bend: -0.25, d: 0.6 }),
      flame([-0.06, -0.01, 0.05], 0.26, 0.065, [-0.2, 0, 0.45], { bend: -0.3, d: 0.6 }),
    ]);
    const headBase = [
      E(HC, HS, 0, 'fur'),
      E([0, 1.87, 0.05], [0.29, 0.17, 0.25], 0, 'fur'),                                    // 下半臉（臉頰較寬）
      sym(E([0.105, 2.03, 0.15], [0.165, 0.155, 0.15], 0, 'cream')),                       // 眼周米色面罩（兩個大圓合成心形，額頭中央留棕色 V 字）
      E([0, 1.9, 0.12], [0.285, 0.17, 0.2], 0, 'cream'),                                   // 下半臉＋臉頰整片米色
      E([0, 1.88, 0.17], [0.22, 0.13, 0.15], 0, 'cream'),                                  // 嘴套
      E([0, 1.99, 0.2], [0.09, 0.09, 0.1], 0, 'cream'),
      sym(ear), tuft,
    ];
    STAGE = 5;
    const eyeAt = [0.108, 2.03, 0.285], ry = 0.36;
    const openEye = [
      E([0, 0, 0], [0.058, 0.066, 0.024], 0, 'white'),
      E([-0.006, -0.006, 0.012], [0.042, 0.05, 0.02], 0, 'iris'),
      E([-0.008, -0.008, 0.02], [0.022, 0.028, 0.014], 0, 'pupil'),
      E([0.008, 0.012, 0.03], [0.011, 0.011, 0.006], 0, 'white'),
      E([0, 0.05, 0.004], [0.07, 0.034, 0.03], [0, 0, 0.18], 'cream'),                  // 上眼皮半蓋（調皮瞇眼）
      T([0, 0.012, 0.012], 0.06, 0.006, 'line', { arc: PI * 0.8, r: [0, 0, 0.35] }),
    ];
    const mAt = [0, 1.845, 0.305];
    const face = [
      eyeSet(eyeAt, ry, openEye, 'line'), eyeSet(eyeAt, ry, openEye, 'line').map(mirror),
      brow([0.115, 2.115, 0.282], [0.055, 0.013, 0.013], [0, ry, -0.12], 'furDark'),
      mirror(brow([0.115, 2.135, 0.278], [0.055, 0.013, 0.013], [0, ry, 0.22], 'furDark')),   // 右眉挑高（壞笑）
      E([0, 1.935, 0.312], [0.036, 0.022, 0.02], 0, 'nose'),
      sym(E([0.016, 1.93, 0.328], [0.008, 0.006, 0.004], 0, 'pupil')),
      sym(E([0.185, 1.92, 0.24], [0.045, 0.026, 0.014], [0, 0.65, 0], 'blush')),
      // 平常：咧嘴吐舌、上排缺一顆門牙
      joint('mouthSmile', mAt, [
        E(mAt, [0.075, 0.036, 0.02], [0, 0, -0.08], 'mouth'),
        B(add(mAt, [0.025, 0.022, 0.012]), [0.026, 0.026, 0.012], 'white', { bevel: 0.005 }),
        B(add(mAt, [-0.048, 0.016, 0.01]), [0.02, 0.018, 0.01], 'white', { bevel: 0.004 }),
        E(add(mAt, [-0.012, -0.042, 0.014]), [0.036, 0.046, 0.016], [-0.5, 0, 0.18], 'tongue'),
        E(add(mAt, [-0.012, -0.05, 0.022]), [0.006, 0.03, 0.004], [-0.5, 0, 0.18], 'tongueDark'),
      ]),
      joint('mouthGrin', mAt, [
        E(add(mAt, [0, -0.008, 0]), [0.085, 0.05, 0.022], 0, 'mouth'),
        B(add(mAt, [0.03, 0.028, 0.012]), [0.03, 0.026, 0.012], 'white', { bevel: 0.005 }),
        B(add(mAt, [-0.038, 0.026, 0.01]), [0.03, 0.024, 0.012], 'white', { bevel: 0.005 }),
        E(add(mAt, [0, -0.034, 0.012]), [0.05, 0.02, 0.012], 0, 'tongue'),
      ], OFF),
      joint('mouthSad', mAt, [T(add(mAt, [0, -0.03, 0.01]), 0.04, 0.008, 'line', { arc: PI * 0.7 })], OFF),
      joint('mouthO', mAt, [E(mAt, [0.03, 0.038, 0.016], 0, 'mouth')], OFF),
      joint('mouthLine', mAt, [T(add(mAt, [0, 0.06, 0.01]), 0.075, 0.008, 'line', { arc: 0.6, r: [0, 0, PI] })], OFF),
    ];

    // 上半身：短短的棕色身體、米色肚子、紅色三角領巾（中央小火焰）
    STAGE = 2;
    const upper = [
      C([0, 1.4, 0], 0.075, 0.085, 0.14, 'fur'),
      L([0, 0, 0], [[0.245, 0.8], [0.255, 0.92], [0.25, 1.06], [0.235, 1.18], [0.205, 1.28], [0.14, 1.36], [0.07, 1.41], [0.001, 1.42]], 'fur', { s: [1, 1, 0.82] }),
      E([0, 0.97, 0.085], [0.215, 0.34, 0.15], 0, 'cream'),                                   // 胸口到肚子一整片米色（往下延伸過腰）
      T([0, 1.345, 0.01], 0.13, 0.038, 'scarf', { r: [PI / 2 + 0.18, 0, 0], s: [1.05, 1, 1] }),
      C([0, 1.25, 0.175], 0.13, 0.012, 0.17, 'scarf', { r: [-0.22, 0, 0], s: [1, 1, 0.22] }),
      flame([0, 1.215, 0.2], 0.075, 0.025, [-0.22, 0, 0]),
      G([0.08, 1.34, -0.13], [E([0, 0, 0], [0.03, 0.03, 0.025], 0, 'scarf'), E([0.035, -0.02, -0.01], [0.04, 0.02, 0.012], [0, 0, -0.5], 'scarf'), E([-0.03, -0.025, -0.01], [0.035, 0.018, 0.012], [0, 0, 0.6], 'scarf')]),  // 後頸打結
    ];
    STAGE = 3;
    const lower0 = [
      E([0, 0.68, 0], [0.245, 0.17, 0.19], 0, 'fur'),
      E([0, 0.75, 0.09], [0.205, 0.16, 0.14], 0, 'cream'),                                    // 小腹米色（往上接到胸前那片）
    ];
    const lower = [fat(lower0)];
    // 四肢：短而圓的棕色手臂、米色手掌；短腿、米色大腳掌（零件加粗，長度跟著整隻縮短）
    STAGE = 4;
    const armL = shift(joint('upperArmL', SK0.upperArmL, [
      fat([
        E([0.29, 1.53, 0], [0.085, 0.085, 0.085], 0, 'fur'),
        seg([0.3, 1.5, 0], [0.345, ay(1.27), 0], 0.07, 0.062, 'fur'),
        E([0.345, ay(1.27), 0], [0.062, 0.062, 0.062], 0, 'fur'),
      ], 0.325, 0),
      joint('forearmL', SK0.forearmL, [
        fat([
          seg([0.345, ay(1.27), 0], [0.36, ay(0.97), 0.01], 0.06, 0.052, 'fur'),
          E([0.36, ay(0.99), 0.01], [0.054, 0.05, 0.054], 0, 'cream'),
        ], 0.352, 0.005),
        joint('handL', SK0.handL, [fatAll(fist('cream'), [0.36, ay(0.97), 0.01], 1.15), sockets()]),
      ]),
    ]), DY_ARM);
    const legL = joint('thighL', SK0.thighL, [
      fat([
        seg([LX, 0.66, 0], [LX, 0.32, 0], 0.11, 0.085, 'fur'),
        E([LX, 0.32, 0], [0.08, 0.08, 0.08], 0, 'fur'),
      ], LX, 0),
      joint('shinL', SK0.shinL, [
        fat([seg([LX, 0.32, 0], [LX, 0.1, 0], 0.075, 0.06, 'fur')], LX, 0),
        joint('footL', SK0.footL, [fatAll(monkeyFoot('cream'), [LX, 0, 0], 1.2)]),
      ]),
    ]);
    STAGE = 6;
    const tl = tail([[0, 0.66, -0.17], [0.05, 0.55, -0.3], [0.16, 0.44, -0.38], [0.31, 0.4, -0.4], [0.44, 0.46, -0.37], [0.5, 0.6, -0.32], [0.47, 0.74, -0.28], [0.4, 0.82, -0.25]], 0.045 * KID_W, 0.03 * KID_W, 'fur', 0.26 * KID_W);
    return assemble([...headBase, ...face], [fat(upper)], lower, armL, legL, tl, 1.2 / KID_K, KID_K);
  }

  // ================================================================================
  // 2 階：C老猴（火焰頭髮＋金色頭箍、紅領巾長飄帶、裸上身火紋、金護腕、紅腰帶金扣、深色燈籠褲）
  // ================================================================================
  function buildElder() {
    const HC = [0, 2.01, 0], HS = [0.27, 0.28, 0.265];
    STAGE = 1;
    const ear = G([0.27, 1.99, -0.02], [
      E([0, 0, 0], [0.04, 0.09, 0.085], 0, 'fur'),
      E([0.017, -0.004, 0.006], [0.024, 0.062, 0.058], 0, 'earPink'),
    ], { r: [0, -0.5, 0.1] });
    // 火焰頭髮：一圈往後上方翻起的火舌（前額兩撮、頭頂高聳、後腦往下）
    const hair = [
      E([0, 2.13, -0.03], [0.275, 0.18, 0.26], 0, 'hairRed'),
      ...[
        [0, 2.2, 0.16, 0.36, 0.11, [-0.55, 0, 0], -0.35], [0.1, 2.21, 0.12, 0.3, 0.085, [-0.5, 0, -0.45], -0.3], [-0.1, 2.21, 0.12, 0.3, 0.085, [-0.5, 0, 0.45], -0.3],
        [0, 2.26, -0.02, 0.38, 0.12, [-0.85, 0, 0], -0.3], [0.15, 2.17, -0.04, 0.28, 0.09, [-0.7, 0, -0.85], -0.2], [-0.15, 2.17, -0.04, 0.28, 0.09, [-0.7, 0, 0.85], -0.2],
        [0.09, 2.15, -0.16, 0.3, 0.09, [-1.5, 0, -0.4], -0.2], [-0.09, 2.15, -0.16, 0.3, 0.09, [-1.5, 0, 0.4], -0.2], [0, 2.06, -0.2, 0.28, 0.1, [-2.0, 0, 0], -0.2],
        [0.22, 2.08, -0.06, 0.2, 0.065, [-0.6, 0, -1.3], -0.15], [-0.22, 2.08, -0.06, 0.2, 0.065, [-0.6, 0, 1.3], -0.15],
      ].map(([x, y, z, h, w, r, b]) => flame([x, y, z], h, w, r, { bend: b })),
      sym(flame([0.14, 2.13, 0.2], 0.15, 0.05, [0.5, 0.3, -2.6], { bend: 0.2 })),   // 鬢角垂下的兩撮
    ];
    // 金色頭箍：前低後高斜繞，額前一對捲雲紋＋寶珠
    const band = [
      T([0, 2.115, -0.015], 0.268, 0.02, 'gold', { r: [PI / 2 + 0.22, 0, 0], s: [1.03, 1, 1] }),
      G([0, 2.1, 0.258], [
        E([0, 0, 0], [0.032, 0.032, 0.02], 0, 'gem'),
        sym(T([0.045, 0.012, 0], 0.03, 0.009, 'gold', { arc: PI * 1.5, r: [0, 0, -0.6] })),
        sym(T([0.08, 0.03, -0.006], 0.018, 0.007, 'gold', { arc: PI * 1.4, r: [0, 0, 2.2] })),
        T([0, 0, 0.004], 0.035, 0.008, 'gold'),
      ], { r: [-0.22, 0, 0] }),
    ];
    const headBase = [
      E(HC, HS, 0, 'fur'),
      E([0, 1.86, 0.03], [0.22, 0.14, 0.22], 0, 'fur'),
      sym(E([0.088, 2.0, 0.13], [0.135, 0.125, 0.13], 0, 'cream')),
      E([0, 1.89, 0.1], [0.23, 0.14, 0.17], 0, 'cream'),                                   // 下半臉＋臉頰
      E([0, 1.87, 0.14], [0.17, 0.11, 0.13], 0, 'cream'),
      E([0, 1.82, 0.12], [0.12, 0.065, 0.11], 0, 'cream'),                                 // 下巴
      sym(ear), hair, band,
    ];
    STAGE = 5;
    const eyeAt = [0.088, 1.995, 0.248], ry = 0.36;
    const openEye = [
      E([0, 0, 0], [0.05, 0.036, 0.02], 0, 'white'),
      E([-0.006, -0.004, 0.01], [0.032, 0.033, 0.016], 0, 'iris'),
      E([-0.008, -0.004, 0.017], [0.016, 0.02, 0.01], 0, 'pupil'),
      E([0.006, 0.01, 0.022], [0.008, 0.008, 0.004], 0, 'white'),
      E([0, 0.034, 0.002], [0.062, 0.022, 0.026], [0, 0, 0.22], 'cream'),               // 眼皮壓低（銳利）
      T([0, 0.004, 0.01], 0.052, 0.008, 'line', { arc: PI * 0.75, r: [0, 0, 0.45] }),
    ];
    const mAt = [0, 1.84, 0.262];
    const face = [
      eyeSet(eyeAt, ry, openEye, 'line'), eyeSet(eyeAt, ry, openEye, 'line').map(mirror),
      sym(brow([0.095, 2.05, 0.252], [0.06, 0.015, 0.016], [0, ry, 0.3], 'furDark')),     // 濃眉：內低外高（霸氣）
      E([0, 1.905, 0.27], [0.03, 0.02, 0.018], 0, 'nose'),
      sym(E([0.013, 1.9, 0.284], [0.007, 0.005, 0.004], 0, 'pupil')),
      joint('mouthSmile', mAt, [T(add(mAt, [0.004, 0.035, 0]), 0.045, 0.008, 'line', { arc: 0.9, r: [0, 0, PI + 0.95] })]),   // 自信的斜嘴笑
      joint('mouthGrin', mAt, [
        E(add(mAt, [0, -0.006, 0]), [0.065, 0.034, 0.018], 0, 'mouth'),
        B(add(mAt, [0, 0.014, 0.01]), [0.09, 0.016, 0.012], 'white', { bevel: 0.005 }),
        sym(C(add(mAt, [0.038, 0.004, 0.012]), 0.008, 0.001, 0.022, 'white', { seg: 10 })),   // 小虎牙
      ], OFF),
      joint('mouthSad', mAt, [T(add(mAt, [0, -0.025, 0.006]), 0.035, 0.008, 'line', { arc: PI * 0.7 })], OFF),
      joint('mouthO', mAt, [E(mAt, [0.03, 0.036, 0.014], 0, 'mouth')], OFF),
      joint('mouthLine', mAt, [T(add(mAt, [0, 0.06, 0.006]), 0.068, 0.008, 'line', { arc: 0.6, r: [0, 0, PI] })], OFF),
    ];

    // 上半身：寬肩倒三角、米色胸腹、肩頭火紋；紅領巾＋往兩側後方飄的長帶
    STAGE = 2;
    // 領巾長飄帶：從後頸往兩側後方飄出，越往尾端越寬、顏色越深，帶尾一團火焰
    const ribbon = (k) => {
      const pts = [[0.08 * k, 1.34, -0.12], [0.26 * k, 1.3, -0.24], [0.44 * k, 1.2, -0.3], [0.6 * k, 1.06, -0.32], [0.72 * k, 0.9, -0.3], [0.8 * k, 0.74, -0.26]];
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1], mid = p0.map((v, j) => (v + p1[j]) / 2), d = p1.map((v, j) => v - p0[j]), len = Math.hypot(...d), u = d.map((v) => v / len);
        out.push(B(mid, [0.1 + i * 0.016, len + 0.035, 0.012], i < 3 ? 'scarf' : 'scarfDark', { r: [Math.atan2(u[2], u[1]), 0, -Math.asin(u[0])], bevel: 0.005 }));
      }
      out.push(flame(add(pts[pts.length - 1], [0.02 * k, -0.02, 0]), 0.17, 0.06, [PI + 0.35, 0, -0.5 * k]));
      return out;
    };
    const upper = [
      C([0, 1.4, 0], 0.07, 0.08, 0.14, 'cream'),
      L([0, 0, 0], [[0.215, 0.8], [0.225, 0.92], [0.25, 1.06], [0.28, 1.2], [0.285, 1.27], [0.235, 1.33], [0.12, 1.385], [0.06, 1.41], [0.001, 1.42]], 'cream', { s: [1, 1, 0.74] }),
      E([0, 1.07, 0.08], [0.2, 0.25, 0.135], 0, 'cream'),                                  // 胸口到腹部一整片米色
      E([0, 0.88, 0.08], [0.17, 0.11, 0.12], 0, 'cream'),
      E([0, 1.1, 0.1], [0.002, 0.13, 0.12], 0, 'creamShade'),                               // 胸腹中線（淡）
      ...[1.03, 0.95].flatMap((y) => sym(E([0.045, y, 0.152], [0.04, 0.032, 0.05], 0, 'creamShade'))),   // 腹肌（淡陰影）
      ...[1.03, 0.95].flatMap((y) => sym(E([0.045, y + 0.004, 0.157], [0.036, 0.027, 0.05], 0, 'cream'))),
      // 紅領巾短披肩：圍住脖子、蓋住雙肩與上胸
      L([0, 0, 0], [[0.085, 1.44], [0.15, 1.425], [0.23, 1.385], [0.29, 1.32], [0.312, 1.25], [0.31, 1.19], [0.3, 1.16]], 'scarf', { s: [1, 1, 0.8] }),
      T([0, 1.43, 0], 0.09, 0.03, 'scarf', { r: [PI / 2, 0, 0], s: [1, 0.85, 1] }),           // 領口捲邊
      C([0, 1.115, 0.21], 0.19, 0.012, 0.24, 'scarf', { r: [-0.18, 0, 0], s: [1, 1, 0.18] }),  // 前胸垂下的 V 形
      C([0, 1.13, 0.218], 0.13, 0.008, 0.17, 'scarfDark', { r: [-0.18, 0, 0], s: [1, 1, 0.12] }),
      G([0.13, 1.3, 0.235], [                                                                // 左肩前的結＋兩條短尾
        E([0, 0, 0], [0.04, 0.035, 0.03], 0, 'scarfDark'),
        B([0.02, -0.07, 0.005], [0.05, 0.11, 0.014], 'scarf', { r: [0.1, 0, 0.25], bevel: 0.006 }),
        B([-0.025, -0.06, 0.012], [0.045, 0.09, 0.014], 'scarfDark', { r: [0.1, 0, -0.35], bevel: 0.006 }),
      ]),
      ribbon(1), ribbon(-1),
    ];
    // 下半身：紅腰帶（金色圓扣）、前垂紅布、深棕燈籠褲
    STAGE = 3;
    const lower = [
      E([0, 0.7, 0], [0.26, 0.18, 0.2], 0, 'pants'),
      T([0, 0.82, 0], 0.235, 0.055, 'sash', { r: [PI / 2, 0, 0], s: [1, 0.78, 1.3] }),
      G([0, 0.82, 0.215], [
        C([0, 0, 0], 0.065, 0.065, 0.02, 'gold', { r: [PI / 2, 0, 0] }),
        T([0, 0, 0.011], 0.048, 0.007, 'goldDark'),
        ST([0, 0, 0.013], 6, 0.035, 0.016, 0.006, 'goldDark'),
      ]),
      B([0, 0.6, 0.2], [0.14, 0.3, 0.018], 'sash', { r: [-0.08, 0, 0], bevel: 0.008 }),
      B([0, 0.47, 0.212], [0.12, 0.08, 0.02], 'flameOrange', { r: [-0.08, 0, 0], bevel: 0.008 }),
      sym(B([0.15, 0.66, 0.17], [0.09, 0.2, 0.016], 'sash', { r: [-0.1, 0.4, 0.1], bevel: 0.008 })),
      sym(G([0.2, 0.62, -0.12], [B([0, 0, 0], [0.08, 0.28, 0.016], 'scarf', { r: [0.25, -0.5, 0.15], bevel: 0.008 }), flame([0.02, -0.17, 0.03], 0.13, 0.04, [PI + 0.2, 0, 0.1])])),
    ];
    // 四肢：壯碩手臂（三角肌火紋、金護腕），燈籠褲管束在小腿、金色腳環
    STAGE = 4;
    const armL = shift(joint('upperArmL', SK0.upperArmL, [
      E([0.3, 1.52, 0], [0.1, 0.1, 0.1], 0, 'cream'),
      G([0.405, 1.4, 0.01], [                                                               // 上臂外側火焰紋身
        E([0, 0, 0], [0.008, 0.065, 0.03], 0, 'flameOrange'),
        E([0.001, 0.05, -0.006], [0.008, 0.035, 0.016], [0.3, 0, 0], 'flameRed'),
        E([0.001, -0.01, 0.026], [0.008, 0.035, 0.014], [-0.4, 0, 0], 'flameRed'),
        E([0.002, -0.03, 0], [0.006, 0.03, 0.016], 0, 'flameYellow'),
      ], { r: [0, 0, 0.17] }),
      seg([0.31, 1.5, 0], [0.345, ay(1.27), 0], 0.085, 0.066, 'cream'),
      E([0.345, ay(1.27), 0], [0.066, 0.066, 0.066], 0, 'cream'),
      joint('forearmL', SK0.forearmL, [
        seg([0.345, ay(1.27), 0], [0.36, ay(0.97), 0.01], 0.066, 0.054, 'fur'),
        C([0.354, ay(1.1), 0.006], 0.07, 0.074, 0.15, 'gold', { r: [0, 0, -0.05] }),
        T([0.357, ay(1.04), 0.008], 0.073, 0.012, 'goldDark', { r: [PI / 2, 0, -0.05] }),
        T([0.351, ay(1.16), 0.004], 0.075, 0.012, 'goldDark', { r: [PI / 2, 0, -0.05] }),
        B([0.352, ay(1.1), 0.08], [0.03, 0.07, 0.012], 'goldDark', { bevel: 0.004 }),
        E([0.36, ay(0.99), 0.01], [0.054, 0.05, 0.054], 0, 'fur'),
        joint('handL', SK0.handL, [fist('cream'), sockets()]),
      ]),
    ]), DY_ARM);
    const pantsFlame = (y) => sym(flame([LX + 0.03, y, 0.11], 0.16, 0.05, [-0.15, 0.25, 0]));
    const legL = joint('thighL', SK0.thighL, [
      seg([LX, 0.68, 0], [LX + 0.01, 0.34, 0], 0.13, 0.125, 'pants'),
      E([LX + 0.01, 0.34, 0], [0.125, 0.11, 0.125], 0, 'pants'),
      joint('shinL', SK0.shinL, [
        E([LX + 0.012, 0.25, 0.005], [0.125, 0.12, 0.125], 0, 'pants'),
        flame([LX + 0.03, 0.17, 0.1], 0.18, 0.06, [-0.2, 0.2, 0]),
        flame([LX + 0.1, 0.18, 0.05], 0.14, 0.045, [-0.1, 0.9, -0.2]),
        C([LX, 0.14, 0], 0.07, 0.072, 0.05, 'wrap'),
        T([LX, 0.12, 0], 0.07, 0.016, 'gold', { r: [PI / 2, 0, 0] }),
        T([LX, 0.16, 0], 0.07, 0.012, 'goldDark', { r: [PI / 2, 0, 0] }),
        joint('footL', SK0.footL, monkeyFoot('cream', 1.05)),
      ]),
    ]);
    void pantsFlame;
    STAGE = 6;
    const tl = tail([[0, 0.66, -0.18], [0.07, 0.54, -0.3], [0.2, 0.44, -0.38], [0.36, 0.42, -0.4], [0.5, 0.5, -0.38], [0.57, 0.65, -0.34], [0.55, 0.8, -0.3], [0.48, 0.9, -0.27]], 0.042, 0.03, 'fur', 0.3);
    return assemble([...headBase, ...face], upper, lower, armL, legL, tl);
  }

  // ---- 組裝（與主角同一層級：root → hips → chest → head / 手臂） ----------------------
  function assemble(headParts, upper, lower, armL, legL, tl, hk = 1, rk = 1) {
    STAGE = 7;
    const g = GRIP_L;
    const ballSocket = joint('ball', [-g[0], g[1] + DY_ARM - 0.01, 0.08], [], OFF);
    const hp = SK0.head;   // 頭部放大：以脖子樞紐為中心縮放（眉毛樞紐也在同一個縮放層裡，動作檔的位置一樣對得上）
    const head = shift(joint('head', hp, [G(hp, [G([-hp[0], -hp[1], -hp[2]], headParts)], { s: [hk, hk, hk] })]), DY_HEAD);
    const chest = joint('chest', SK0.chest, [upper, armL, mirror(armL), head]);
    const hips = joint('hips', SK0.hips, [lower, legL, mirror(legL), chest, tl]);
    // rk：整隻等比例縮放（掛在 root 的靜止縮放上；動作檔只動 root 的旋轉，所以縮放會保留）
    return [joint('root', SK0.root, [hips, ballSocket], [rk, rk, rk])];
  }

  // 結構檢查：每個主角關節在猴子身上都存在、且樞紐世界座標相同（動作才對得上）
  function rotXYZ([a, b, c], [x, y, z]) {
    const x1 = x * Math.cos(c) - y * Math.sin(c), y1 = x * Math.sin(c) + y * Math.cos(c);
    const x2 = x1 * Math.cos(b) + z * Math.sin(b), z2 = -x1 * Math.sin(b) + z * Math.cos(b);
    return [x2, y1 * Math.cos(a) - z2 * Math.sin(a), y1 * Math.sin(a) + z2 * Math.cos(a)];
  }
  function checkRig(tree0) {
    const tree = JSON.parse(JSON.stringify(tree0)); tree[0].s = [1, 1, 1];
    const at = {};
    const walk = (n, toWorld) => {
      const local = (v) => toWorld(add(rotXYZ(n.r, v.map((x, i) => x * (n.s || [1, 1, 1])[i])), n.p));
      if (n.id) at[n.id] = local([0, 0, 0]);
      (n.c || []).forEach((c) => walk(c, local));
    };
    tree.forEach((n) => walk(n, (v) => v));
    const bad = [];
    for (const [id, p] of Object.entries(K.AT)) {
      if (/^outfit/.test(id) || /^(eye|mouth|brow)/.test(id)) continue;   // 眉毛位置寫在頭部縮放層裡，世界座標隨頭部大小改變   // 服裝不需要；表情只做縮放，樞紐可不同
      if (!at[id]) bad.push(id + ' 缺少');
      else if (Math.hypot(...p.map((v, i) => v - at[id][i])) > 1e-3) bad.push(id + ' 位置不同');
    }
    ['browL', 'browR', 'eyeOpenL', 'eyeOpenR', 'eyeHappyL', 'eyeSadR', 'eyeShutL', 'mouthSmile', 'mouthGrin', 'mouthSad', 'mouthO', 'mouthLine'].forEach((id) => { if (!at[id]) bad.push(id + ' 缺少'); });
    return bad;
  }

  const MATERIALS = {
    fur: { c: '#8B4E2E', rough: 0.8, fabric: 0.6, sheenColor: '#C07A4E' },
    furDark: { c: '#4A2616', rough: 0.8 },
    cream: { c: '#F3D2A6', rough: 0.65, sss: 0.4 },
    creamShade: { c: '#E2B98A', rough: 0.65, sss: 0.4 },
    earPink: { c: '#EDA1A0', rough: 0.6, sss: 0.4 },
    blush: { c: '#F09A8E', rough: 0.85, opacity: 0.75 },
    nose: { c: '#6E3A26', rough: 0.5 },
    white: { c: '#FBF8F2', rough: 0.35 },
    iris: { c: '#9A5418', rough: 0.2, coat: 1 },
    pupil: { c: '#1D110B', rough: 0.15, coat: 1 },
    line: { c: '#3A2014', rough: 0.6 },
    mouth: { c: '#6E2420', rough: 0.5 },
    tongue: { c: '#E5737A', rough: 0.35, coat: 0.4 },
    tongueDark: { c: '#C4545C', rough: 0.4 },
    scarf: { c: '#D63A2E', fabric: 1 },
    scarfDark: { c: '#A92A22', fabric: 1 },
    sash: { c: '#C9302A', fabric: 1 },
    pants: { c: '#4A2C22', fabric: 1 },
    wrap: { c: '#5A3524', fabric: 1 },
    hairRed: { c: '#D8402A', rough: 0.6 },
    flameRed: { c: '#E5452B', rough: 0.5, emit: 0.35 },
    flameOrange: { c: '#F68A2A', rough: 0.45, emit: 0.5 },
    flameYellow: { c: '#FFD35A', rough: 0.4, emit: 0.7 },
    gold: { c: '#E0B24E', rough: 0.28, metal: 0.9 },
    goldDark: { c: '#B07E28', rough: 0.35, metal: 0.85 },
    gem: { c: '#E8463A', rough: 0.1, coat: 1, emit: 0.25 },
  };

  // 金箍棒（獨立道具，掛在 propR）：紅色長棍、兩端金色雕紋套頭；原點 = 握點、+Z = 棍身方向
  const ALONG_Z = [PI / 2, 0, 0];
  const PC = (p, rt, rb, h, m) => ({ t: 'cyl', p, rt, rb, h, seg: 24, r: ALONG_Z, s: [1, 1, 1], m });
  const PT = (p, R, tube, m) => ({ t: 'torus', p, R, tube, arc: PI * 2, r: [0, 0, 0], s: [1, 1, 1], m });
  const capEnd = (z, k) => [PC([0, 0, z], 0.05, 0.05, 0.24, 'gold'), PC([0, 0, z + k * 0.13], 0.056, 0.056, 0.03, 'goldDark'), PT([0, 0, z - k * 0.06], 0.051, 0.01, 'goldDark'), PT([0, 0, z + k * 0.02], 0.051, 0.008, 'goldDark'), PC([0, 0, z - k * 0.12], 0.054, 0.054, 0.025, 'goldDark')];
  const STAFF = {
    name: '金箍棒', socket: 'propR', grip2: [0, 0, -0.3],
    // staffShaft：棍身（樞紐在棍尾，沿 Z 拉長）；staffFront：前端金套頭（往前平移）→ 預覽頁依動作的 ext 伸長
    parts: [
      { t: 'g', p: [0, 0, -0.55], r: [0, 0, 0], s: [1, 1, 1], id: 'staffShaft', c: [PC([0, 0, 0.8], 0.04, 0.04, 1.6, 'staffRed')] },
      ...capEnd(-0.43, -1),
      { t: 'g', p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], id: 'staffFront', c: capEnd(0.93, 1) },
    ],
  };
  const STAFF_MATERIALS = {
    staffRed: { c: '#C8262A', rough: 0.35, coat: 0.5 },
    gold: MATERIALS.gold, goldDark: MATERIALS.goldDark,
  };

  const kid = { id: 'c-kid', name: 'C囝仔', stage: 1, materials: MATERIALS, parts: buildKid() };
  const elder = { id: 'c-elder', name: 'C老猴', stage: 2, materials: MATERIALS, parts: buildElder() };
  const STAGES = [
    { n: 1, name: '頭部' }, { n: 2, name: '上半身' }, { n: 3, name: '下半身' }, { n: 4, name: '四肢' },
    { n: 5, name: '五官' }, { n: 6, name: '尾巴' },
  ];
  const TAIL = { joints: 7, flame: 'tailFlame' };
  const api = { CHARACTERS: { kid, elder }, STAGES, TAIL, STAFF, STAFF_MATERIALS, checkRig, DESC: {
    kid: '調皮又愛捉弄人的小火猴，總是露出壞壞的笑，門牙缺一顆是他的招牌。',
    elder: '歷經磨練而成長的火之猴王，手持金箍棒，身法敏捷，能以靈活的戰鬥技巧壓制對手。',
  } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MONKEY_BLUEPRINT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
