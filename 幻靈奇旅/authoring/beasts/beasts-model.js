// 火熊三階（小熊 → 壯熊 → 大熊）與貓娘三階（小貓娘 → 靈貓姬 → 雙刃貓女）
//   貓娘三階與大熊：以主角小男孩的骨架為架構（關節名稱、樞紐、掛點、表情節點相同，主角動作可直接套用），
//     用 root 等比例縮放＋頭部反向縮放調整頭身比；大熊的肩膀往外移（只動手臂樞紐的位置，旋轉照常）。
//   小熊、壯熊：四足站立，另建四足骨架（body / head / jaw / 四條腿各三節 / 尾巴火焰）。
// 需先載入 kid-model.js（取用 __KID_PARTS__）。座標慣例同主角：面向 +Z、腳底 y=0。
(function (root) {
  const PI = Math.PI;
  const K = root.__KID_PARTS__;
  const OFF = K.OFF;

  let STAGE = 1;
  const E = (p, s, r, m) => ({ t: 'ell', p, s, r: r || [0, 0, 0], m, stage: STAGE });
  const T = (p, R, tube, m, o = {}) => ({ t: 'torus', p, R, tube, arc: o.arc || PI * 2, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const C = (p, rt, rb, h, m, o = {}) => ({ t: 'cyl', p, rt, rb, h, seg: o.seg || 24, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const B = (p, size, m, o = {}) => ({ t: 'box', p, size, bevel: o.bevel ?? 0.01, r: o.r || [0, 0, 0], s: [1, 1, 1], m, stage: STAGE });
  const L = (p, pts, m, o = {}) => ({ t: 'lathe', p, pts, phiStart: o.phiStart || 0, phiLength: o.phiLength || PI * 2, th: 0.02, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
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
  // 帶狀（皮帶、披巾）：A→B 的扁盒，寬 w、厚 t；up = 寬度方向參考
  function strap(A, Bp, w, t, m) {
    const d = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]], len = Math.hypot(...d), u = d.map((v) => v / len);
    return B([(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2, (A[2] + Bp[2]) / 2], [w, len + 0.01, t], m, { r: [Math.atan2(u[2], u[1]), 0, -Math.asin(u[0])], bevel: Math.min(0.006, t / 2.2) });
  }
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const shift = (node, dy, dx = 0) => { node.p = [node.p[0] + dx, node.p[1] + dy, node.p[2]]; return node; };
  // 只加粗靜態零件：以 (cx, cz) 為軸心放大 x、z（不包住子關節）
  const fat = (parts, w, cx = 0, cz = 0) => (w === 1 ? parts : G([cx, 0, cz], [G([-cx, 0, -cz], parts)], { s: [w, 1, w] }));
  const grow = (parts, c, w) => G(c, [G(c.map((v) => -v), parts)], { s: [w, w, w] });
  const ALONG_Z = [PI / 2, 0, 0];
  const LEG_DROP = (k) => 0.6 * (k - 1);   // 腿縮放後腳底的高度差（髖關節高 0.6）

  // ---- 主角骨架數值（與 kid-model.js 相同）----
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
  const KID_BROW = [0.09, 2.045, 0.229];
  const ELB = [0.345, ay(1.27), 0], WRI = [0.36, ay(0.97), 0.01];

  // 火焰：紅 → 橘 → 黃三層上下錯開
  const flame = (p, h, w, r, o = {}) => G(p, [
    E([0, h * 0.32, 0], [w, h * 0.42, w * (o.d || 0.8)], 0, 'flameRed'),
    E([0, h * 0.58, 0], [w * 0.74, h * 0.34, w * 0.62 * (o.d || 0.8) / 0.8], [o.bend || 0, 0, 0], 'flameOrange'),
    E([0, h * 0.84, -(o.bend || 0) * h * 0.25], [w * 0.42, h * 0.22, w * 0.4], [(o.bend || 0) * 1.6, 0, 0], 'flameYellow'),
  ], { r });
  // 鋸齒火紋：深色毛與紅毛交界的一圈火舌（往上），沿圓周排 n 個
  const zigzag = (c, R, n, h, rz = 0.8, d = 0.6, w = 0.028) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * PI;
      out.push(G([c[0] + R * Math.sin(a), c[1], c[2] + R * rz * Math.cos(a)], [
        E([0, h * 0.35, 0], [w, h * 0.5, 0.012], 0, 'flameOrange'),
        E([0, h * 0.62, 0.003], [w * 0.57, h * 0.3, 0.01], 0, 'flameYellow'),
      ], { r: [0, a, (i % 2 ? 0.25 : -0.25)] }));
    }
    return out;
  };
  function tattoo(p, axis, h, w, tilt = 0) {
    const flat = axis === 'x' ? [0.16, 1, 1] : [1, 1, 0.16];
    const one = (dx, dz, k, rz) => G([dx, 0, dz], [flame([0, -h * 0.45 * k, 0], h * k, w * k, [0, 0, rz], { d: 1 })]);
    const side = axis === 'x' ? (d) => [0, d] : (d) => [d, 0];
    return G(p, [
      one(...side(0), 1, tilt), one(...side(w * 1.3), 0.7, tilt - 0.35), one(...side(-w * 1.3), 0.72, tilt + 0.35),
    ], { s: flat });
  }
  function mohawk(hc, hs, H, W) {
    const out = [];
    const angles = [0.55, 0.3, 0.05, -0.22, -0.5, -0.8, -1.1, -1.4];
    angles.forEach((a, i) => {
      const h = H * (1 - Math.abs(a + 0.15) * 0.45), p = add(hc, [0, hs[1] * Math.cos(a) * 0.9, hs[2] * Math.sin(a) * 0.9]);
      out.push(G(p, [flame([0, 0, 0], h, W * (1 - i * 0.04), [a - 0.55, 0, 0], { bend: -0.35, d: 1.5 })], { s: [0.55, 1, 1] }));
    });
    // 兩側較短的火焰毛，讓龐克頭有厚度
    [0.15, -0.35, -0.85].forEach((a) => [1, -1].forEach((k) => out.push(flame(add(hc, [k * hs[0] * 0.28, hs[1] * Math.cos(a) * 0.86, hs[2] * Math.sin(a) * 0.86]), H * 0.45, W * 0.7, [a - 0.7, 0, -k * 0.35], { bend: -0.3 }))));
    return out;
  }
  const claws = (c, n, spread, len, r, dir = [PI / 2 + 0.3, 0, 0]) =>
    Array.from({ length: n }, (_, i) => C([c[0] + (i - (n - 1) / 2) * spread, c[1], c[2]], 0, r, len, 'claw', { r: dir, seg: 10 }));

  // ---- 共用：主角骨架的五官切換節點 --------------------------------------------
  function eyeSet(eyeAt, ry, open, lineM, R = 0.042) {
    const arc = (o, a, rz) => T(add(eyeAt, o), R, 0.009, lineM, { arc: PI * a, r: [0, ry, rz] });
    return [
      joint('eyeOpenL', eyeAt, [G(eyeAt, open, { r: [0, ry, 0] })]),
      joint('eyeHappyL', eyeAt, [arc([0, -0.008, 0.006], 0.75, 0)], OFF),
      joint('eyeSadL', eyeAt, [arc([0, -0.012, 0.006], 0.65, -0.35)], OFF),
      joint('eyeShutL', eyeAt, [T(add(eyeAt, [0, 0, 0.006]), R * 0.85, 0.009, lineM, { arc: PI * 0.7, r: [0, ry, PI] })], OFF),
    ];
  }
  const brow = (at, s, r, m) => joint('browL', KID_BROW, [E(at, s, r, m)]);
  function mouths(mAt, smile, grin, lineM, o = 1) {
    return [
      joint('mouthSmile', mAt, smile),
      joint('mouthGrin', mAt, grin, OFF),
      joint('mouthSad', mAt, [T(add(mAt, [0, -0.026 * o, 0.006]), 0.032 * o, 0.007, lineM, { arc: PI * 0.7 })], OFF),
      joint('mouthO', mAt, [E(mAt, [0.026 * o, 0.032 * o, 0.012], 0, 'mouthDark')], OFF),
      joint('mouthLine', mAt, [T(add(mAt, [0, 0.05 * o, 0.006]), 0.058 * o, 0.007, lineM, { arc: 0.55, r: [0, 0, PI] })], OFF),
    ];
  }
  const sockets = (extra = []) => [joint('propL', GRIP_L, []), joint('fxL', add(GRIP_L, MUZZLE), [], OFF), ...extra];
  // 尾巴：關節鏈 tail0…；mats(i) 決定每節顏色
  function tailChain(pts, r0, r1, mats, tip) {
    const n = pts.length - 1;
    let node = null;
    for (let i = n - 1; i >= 0; i--) {
      const ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n), m = mats(i, n);
      const parts = [seg(pts[i], pts[i + 1], ra, rb, m), E(pts[i + 1], [rb, rb, rb], 0, m)];
      if (i === n - 1 && tip) parts.push(tip(pts[n]));
      if (node) parts.push(node);
      node = joint('tail' + i, pts[i], parts);
    }
    return node;
  }
  // 主角骨架組裝：rk = 整隻縮放、hk = 頭部縮放（以脖子為中心）、armDx = 肩膀往外移
  // legK：整條腿（含膝、踝關節）以髖關節為中心等比例縮放，關節轉動照常；身體整體上下移 0.6×(legK−1) 讓腳底貼地。legDx：兩腿往外分開
  function assemble({ head, upper, lower, armL, legL, extraHips = [], hk = 1, rk = 1, armDx = 0, legK = 1, legDx = 0, armK = 1 }) {
    STAGE = 7;
    const g = GRIP_L;
    const ballSocket = joint('ball', [-g[0] - armDx, g[1] + DY_ARM - 0.01, 0.08], [], OFF);
    const hp = SK0.head;
    const headN = shift(joint('head', hp, [G(hp, [G([-hp[0], -hp[1], -hp[2]], head)], { s: [hk, hk, hk] })]), DY_HEAD);
    const arm = shift(armL, DY_ARM, armDx);
    arm.s = [armK, armK, armK];
    const chest = joint('chest', SK0.chest, [upper, arm, mirror(arm), headN]);
    legL.s = [legK, legK, legK]; legL.p = [legL.p[0] + legDx, legL.p[1], legL.p[2]];
    const hips = joint('hips', SK0.hips, [lower, legL, mirror(legL), chest, extraHips]);
    const rootN = joint('root', SK0.root, [hips, ballSocket], [rk, rk, rk]);
    rootN.p = [0, LEG_DROP(legK) * rk, 0];
    return [rootN];
  }
  function heroArm(upperParts, foreParts, handParts, handExtra = []) {
    return joint('upperArmL', SK0.upperArmL, [
      ...upperParts,
      joint('forearmL', SK0.forearmL, [...foreParts, joint('handL', SK0.handL, [...handParts, sockets(handExtra)])]),
    ]);
  }
  function heroLeg(thighParts, shinParts, footParts) {
    return joint('thighL', SK0.thighL, [...thighParts, joint('shinL', SK0.shinL, [...shinParts, joint('footL', SK0.footL, footParts)])]);
  }
  const fistAt = (dy = 0) => [0.367, ay(0.97) - 0.062 + dy, 0.028];
  function fist(m, k = 1, knuckle = m) {
    return grow([
      E([0.367, ay(0.97) - 0.062, 0.028], [0.047, 0.056, 0.052], [0, 0, 0.05], m),
      E([0.38, ay(0.97) - 0.088, 0.03], [0.036, 0.024, 0.048], [0, 0, 0.1], knuckle),
      E([0.338, ay(0.97) - 0.05, 0.062], [0.019, 0.034, 0.02], [0.45, 0, 0.25], knuckle),
    ], [0.367, ay(0.97) - 0.04, 0.03], k);
  }

  // ======================================================================================
  // 貓娘：共用頭部（貓耳、動漫大眼、尖牙笑）＋三階各自的髮型與服裝
  // ======================================================================================
  function catHead(stage) {
    STAGE = 1;
    const ear = G([0.165, 2.265, -0.03], [
      C([0, 0.085, 0], 0, 0.088, 0.2, 'earDark', { s: [1, 1, 0.5], seg: 18 }),
      C([0, 0.07, 0.024], 0, 0.06, 0.14, 'earPink', { s: [1, 1, 0.3], seg: 14 }),
      E([0, 0.03, 0.032], [0.034, 0.055, 0.014], 0, 'hairCream'),
    ], { r: [-0.12, 0, -0.34], s: stage === 3 ? [1.35, 1.35, 1.35] : [1, 1, 1] });
    const bangs = [-0.17, -0.1, -0.03, 0.04, 0.11, 0.18].map((x, i) => E([x, 2.13 - Math.abs(x) * 0.2, 0.218 - Math.abs(x) * 0.25], [0.058, 0.09, 0.032], [-0.3, 0, -x * 1.2 + (i % 2 ? 0.15 : -0.1)], 'hairCream'));
    const base = [
      E([0, 1.99, 0], stage === 3 ? [0.252, 0.265, 0.25] : [0.265, 0.27, 0.255], 0, 'skin'),
      ...(stage === 3
        ? [L([0, 0, 0.03], [[0.001, 1.75], [0.055, 1.757], [0.105, 1.78], [0.148, 1.818], [0.186, 1.866], [0.218, 1.92], [0.24, 1.97], [0.248, 2.02]], 'skin', { s: [1, 1, 0.98] })]   // 臉型由顴骨往下巴平順收窄（瓜子臉，下巴不另外突起）
        : [E([0, 1.865, 0.035], [0.2, 0.16, 0.2], 0, 'skin')]),
      E([0, 2.12, -0.05], [0.3, 0.26, 0.3], 0, 'hairCream'),                                  // 頭髮主體
      E([0.05, 2.28, 0.06], [0.03, 0.05, 0.19], [0.55, 0, -0.15], 'hairBrown'),                 // 深棕挑染（頭頂一條）
      E([0.045, 2.13, 0.232], [0.024, 0.095, 0.022], [-0.3, 0, -0.25], 'hairBrown'),         // 挑染垂到瀏海
      ...(stage === 3 ? strandBangs() : [...bangs, sym(E([0.235, 1.92, 0.06], [0.05, 0.16, 0.06], [0.1, 0, 0.12], 'hairCream'))]),
      sym(ear),
    ];
    if (stage === 1) base.push(
      E([0, 1.93, -0.12], [0.3, 0.27, 0.22], 0, 'hairCream'),                                 // 蓬鬆短髮
      ...[[-0.25, 1.78, -0.05, 0.6], [0.26, 1.8, -0.06, -0.6], [-0.18, 1.72, -0.16, 0.3], [0.17, 1.74, -0.17, -0.3], [0, 1.72, -0.2, 0]].map(([x, y, z, rz]) => E([x, y, z], [0.07, 0.12, 0.07], [0.2, 0, rz], 'hairCream')),
      T([0.02, 2.39, 0.0], 0.06, 0.014, 'hairCream', { arc: PI * 1.1, r: [0, 1.3, 0.4] }),     // 呆毛
    );
    if (stage === 2) base.push(
      E([0, 1.95, -0.11], [0.29, 0.25, 0.21], 0, 'hairCream'),
      ...[[-0.25, 1.76, -0.04, 0.5], [0.25, 1.76, -0.05, -0.5]].map(([x, y, z, rz]) => E([x, y, z], [0.06, 0.15, 0.06], [0.15, 0, rz], 'hairCream')),
      // 高馬尾＋紅色蝴蝶結＋金鈴
      ...[[0, 2.3, -0.22, 0.11], [0, 2.22, -0.38, 0.12], [0, 2.02, -0.48, 0.11], [0, 1.8, -0.5, 0.095], [0, 1.6, -0.46, 0.07]].map(([x, y, z, r], i) => E([x + (i % 2 ? 0.03 : -0.03), y, z], [r * 1.15, r * 1.5, r], [0.5 - i * 0.2, 0, 0], 'hairCream')),
      G([0, 2.32, -0.2], [sym(E([0.06, 0.02, 0], [0.065, 0.045, 0.02], [0, 0, 0.4], 'scarfRed')), E([0, 0, 0.01], [0.03, 0.03, 0.025], 0, 'scarfRed'), E([0, -0.045, 0.03], [0.026, 0.026, 0.026], 0, 'gold')], { r: [-0.6, 0, 0] }),
    );
    if (stage === 3) base.push(
      // 長髮披到腰
      ...[[1.95, -0.14, 0.3, 0.24], [1.72, -0.2, 0.3, 0.2], [1.48, -0.24, 0.28, 0.17], [1.22, -0.26, 0.25, 0.15], [0.98, -0.25, 0.21, 0.12]].map(([y, z, w, d], i) => E([0, y, z], [w, 0.17, d], [0.08, 0, 0], 'hairCream')),
      ...[1.6, 1.3, 1.05].flatMap((y, i) => sym(E([0.24 - i * 0.02, y, -0.12], [0.07, 0.18, 0.08], [0.1, 0, 0.12], 'hairCream'))),
      sym(E([0.24, 1.72, 0.05], [0.05, 0.2, 0.055], [0.12, 0, 0.1], 'hairCream')),
      G([0.12, 2.3, -0.18], [sym(E([0.05, 0.02, 0], [0.055, 0.04, 0.018], [0, 0, 0.4], 'scarfRed')), E([0, 0, 0.01], [0.026, 0.026, 0.022], 0, 'scarfRed'), E([0.02, -0.12, 0], [0.018, 0.1, 0.008], [0, 0, 0.2], 'scarfRed')], { r: [-0.5, 0.4, 0] }),
      // 多一撮深色頭髮：右側從頭頂沿瀏海外緣垂到臉頰旁
      C([-0.12, 2.25, 0.09], 0.042, 0.006, 0.24, 'hairBrown', { r: [1.0, 0, 0.45], s: [1, 1, 0.42], seg: 10 }),
      C([-0.19, 2.03, 0.17], 0.04, 0.005, 0.25, 'hairBrown', { r: [-0.25, 0, 0.3], s: [1, 1, 0.4], seg: 10 }),
      C([-0.25, 1.82, 0.09], 0.04, 0.005, 0.3, 'hairBrown', { r: [0.05, 0, 0.1], s: [1, 1, 0.45], seg: 10 }),
      T([0.03, 2.38, 0.02], 0.06, 0.013, 'hairCream', { arc: PI * 1.15, r: [0, 1.25, 0.5] }),          // 呆毛
    );
    // 五官：琥珀色動漫大眼、小貓嘴（ω）＋尖牙
    STAGE = 5;
    // 臉部表面的 z（眼睛 x 0.093、y 1.975；嘴 y 1.84；腮紅 x 0.145、y 1.89；眉 x 0.098、y 2.07）
    const FZ = stage === 3 ? { eye: 0.246, mouth: 0.208, blush: 0.185, brow: 0.222 } : { eye: 0.238, mouth: 0.2326, blush: 0.19, brow: 0.224 };
    const eyeAt = [0.093, 1.975, FZ.eye - 0.004], ry = 0.33, sy = stage === 3 ? 0.8 : 1;
    const open = [
      E([0, 0, 0], [0.058, 0.072 * sy, 0.02], 0, 'white'),
      E([-0.004, -0.006 * sy, 0.008], [0.046, 0.06 * sy, 0.016], 0, 'irisAmber'),
      E([-0.004, -0.018 * sy, 0.013], [0.032, 0.036 * sy, 0.012], 0, 'irisDeep'),
      E([-0.004, 0, 0.018], [0.011, 0.032 * sy, 0.008], 0, 'pupil'),
      E([0.014, 0.024 * sy, 0.022], [0.014, 0.014, 0.006], 0, 'white'),
      E([-0.017, -0.03 * sy, 0.021], [0.007, 0.007, 0.004], 0, 'white'),
      T([0, 0.012, 0.006], 0.06, 0.009, 'lash', { arc: PI * 0.8, s: [1, sy, 1], r: [0, 0, 0.12] }),
      E([0.058, 0.044 * sy, 0.004], [0.022, 0.007, 0.006], [0, 0, 0.55], 'lash'),
    ];
    const mAt = [0, 1.84, FZ.mouth - 0.001];   // 嘴的基準點貼在臉面上
    const fang = (x) => C(add(mAt, [x, -0.004, 0.002]), 0.006, 0.0006, 0.016, 'white', { seg: 10 });
    const smile = stage === 1
      ? [E(add(mAt, [0, -0.012, 0]), [0.046, 0.024, 0.008], 0, 'mouthDark'), E(add(mAt, [0, 0.004, 0.002]), [0.05, 0.012, 0.008], 0, 'skin'), E(add(mAt, [0, -0.024, 0.002]), [0.026, 0.01, 0.007], 0, 'tongue'), fang(0.018), fang(-0.018)]   // 張口笑：上唇壓成彎月形
      : [T(add(mAt, [0, 0.02, 0.003]), 0.026, 0.0045, 'lash', { arc: PI * 0.42, r: [0, 0, PI] })];   // 一條淺淺的微笑線
    const grin = [E(add(mAt, [0, -0.012, 0]), [0.044, 0.034, 0.008], 0, 'mouthDark'), E(add(mAt, [0, -0.026, 0.002]), [0.028, 0.014, 0.007], 0, 'tongue'), fang(0.017), fang(-0.017)];
    const face = [
      eyeSet(eyeAt, ry, [G([0, 0, 0], open, { s: [1, 1, 0.5] })], 'lash'), eyeSet(eyeAt, ry, [G([0, 0, 0], open, { s: [1, 1, 0.5] })], 'lash').map(mirror),
      sym(brow([0.098, 2.07, FZ.brow + 0.004], [0.04, 0.008, 0.006], [0, ry, stage === 3 ? 0.22 : 0.05], 'hairBrown')),
      E([0, 1.9, stage === 3 ? 0.242 : 0.246], [0.01, 0.007, 0.005], 0, 'nose'),
      sym(E([0.145, 1.89, FZ.blush], [0.04, 0.022, 0.008], [0, 0.6, 0], 'blush')),
      mouths(mAt, smile, grin, 'lash', 0.8),
    ];
    return [...base, ...face];
  }
  // 髮絲分明的瀏海：一撮撮尖端朝下的髮束交錯深淺色，兩側長鬢髮順著臉頰往下收
  function strandBangs() {
    const out = [];
    const locks = [[-0.2, 0.15, 0.3], [-0.14, 0.17, 0.18], [-0.075, 0.19, 0.06], [-0.01, 0.2, -0.05], [0.055, 0.19, -0.12], [0.12, 0.17, -0.22], [0.185, 0.15, -0.32]];
    locks.forEach(([x, h, rz], i) => {
      const z = 0.247 - x * x * 1.6, y = 2.2 - Math.abs(x) * 0.25;
      out.push(C([x, y - h / 2, z], 0.042, 0.004, h, i % 2 ? 'hairShade' : 'hairCream', { r: [-0.32, 0, rz], s: [1, 1, 0.38], seg: 10 }));
    });
    out.push(C([0.05, 2.15, 0.25], 0.011, 0.002, 0.11, 'hairBrown', { r: [-0.32, 0, -0.18], s: [1, 1, 0.4], seg: 8 }));   // 深棕挑染一束（細）
    [1, -1].forEach((k) => {
      out.push(C([k * 0.215, 1.86, 0.11], 0.05, 0.006, 0.36, 'hairCream', { r: [0.06, 0, k * 0.1], s: [1, 1, 0.45], seg: 10 }));
      out.push(C([k * 0.24, 1.84, 0.04], 0.055, 0.008, 0.4, 'hairShade', { r: [0.04, 0, k * 0.16], s: [1, 1, 0.5], seg: 10 }));
      out.push(C([k * 0.17, 2.03, 0.2], 0.04, 0.004, 0.2, 'hairShade', { r: [-0.2, 0, k * 0.5], s: [1, 1, 0.38], seg: 10 }));
    });
    return out;
  }
  function catTail(rk) {
    const pts = [[0, 0.64, -0.14], [0, 0.52, -0.3], [0.05, 0.46, -0.45], [0.12, 0.5, -0.58], [0.18, 0.64, -0.66], [0.2, 0.82, -0.64], [0.17, 0.96, -0.56], [0.1, 1.02, -0.48]];
    return tailChain(pts, 0.04 / rk, 0.075 / rk, (i, n) => (i >= n - 2 ? 'hairBrown' : 'hairCream'), (p) => E(p, [0.08 / rk, 0.09 / rk, 0.08 / rk], 0, 'hairBrown'));
  }
  // 女性軀幹輪廓（下襬 → 脖子）
  const FEM = [[0.205, 0.8], [0.195, 0.9], [0.185, 1.0], [0.205, 1.1], [0.225, 1.19], [0.222, 1.26], [0.18, 1.33], [0.1, 1.38], [0.055, 1.405], [0.001, 1.41]];
  const slice = (prof, y0, y1, dr = 0.006) => prof.filter(([, y]) => y >= y0 - 1e-6 && y <= y1 + 1e-6).map(([r, y]) => [r + dr, y]);

  // ---- 1 階：小貓娘（Q 版大頭、白色短上衣、紅領巾金鈴、白短褲、肉球拳套、棕靴）----
  function buildCatKid() {
    const rk = 0.76, W = 1 / rk;
    STAGE = 2;
    const upper = fat([
      C([0, 1.4, 0], 0.048, 0.055, 0.12, 'skin'),
      L([0, 0, 0], FEM, 'skin', { s: [1, 1, 0.75] }),
      L([0, 0, 0], slice(FEM, 1.0, 1.405, 0.012), 'shirtWhite', { s: [1, 1, 0.75] }),
      T([0, 1.0, 0], 0.198, 0.012, 'shirtWhite', { r: [PI / 2, 0, 0], s: [1, 0.76, 1] }),
      T([0, 1.355, 0.01], 0.098, 0.03, 'scarfRed', { r: [PI / 2 + 0.15, 0, 0] }),
      C([0, 1.27, 0.155], 0.11, 0.01, 0.13, 'scarfRed', { r: [-0.25, 0, 0], s: [1, 1, 0.22] }),
      sym(E([0.045, 1.33, 0.16], [0.04, 0.025, 0.015], [0, 0, 0.35], 'scarfRed')),
      E([0, 1.3, 0.175], [0.03, 0.03, 0.03], 0, 'gold'), B([0, 1.29, 0.2], [0.02, 0.004, 0.006], 'goldDark', { bevel: 0.001 }),
    ], W);
    STAGE = 3;
    const lower = fat([
      L([0, 0, 0], [[0.18, 0.56], [0.21, 0.6], [0.215, 0.7], [0.205, 0.8], [0.2, 0.83]], 'shortsWhite', { s: [1, 1, 0.78] }),
      E([0, 0.6, 0], [0.17, 0.07, 0.13], 0, 'shortsWhite'),
      T([0, 0.8, 0], 0.207, 0.018, 'leather', { r: [PI / 2, 0, 0], s: [1, 0.78, 1] }),
      B([0.0, 0.8, 0.163], [0.04, 0.035, 0.012], 'gold', { bevel: 0.004 }),
      B([0.19, 0.72, 0.06], [0.07, 0.085, 0.055], 'leather', { r: [0, 0.9, 0], bevel: 0.015 }),
      B([-0.17, 0.73, -0.1], [0.06, 0.07, 0.05], 'leather', { r: [0, -0.6, 0], bevel: 0.015 }),
    ], W);
    STAGE = 4;
    const paw = [
      E(fistAt(), [0.072, 0.078, 0.072], 0, 'pawDark'),
      E(fistAt(-0.07), [0.034, 0.016, 0.03], 0, 'pawPink'),
      ...[-0.03, -0.01, 0.01, 0.03].map((dx, i) => E(add(fistAt(-0.055), [dx * 1.1, 0, 0.042 - Math.abs(dx) * 0.4]), [0.014, 0.01, 0.013], 0, 'pawPink')),
    ];
    const armL = heroArm(
      [fat([E([0.29, 1.53, 0], [0.06, 0.06, 0.06], 0, 'skin'), seg([0.3, 1.5, 0], ELB, 0.05, 0.046, 'skin')], W, 0.32, 0)],
      [fat([seg(ELB, WRI, 0.06, 0.068, 'pawDark'), T(add(ELB, [0.003, -0.03, 0]), 0.062, 0.022, 'hairCream', { r: [PI / 2, 0, -0.05] })], W, 0.352, 0.005)],
      [grow(paw, fistAt(), 1.2)],
    );
    const legL = heroLeg(
      [fat([C([LX, 0.57, 0], 0.1, 0.098, 0.1, 'shortsWhite'), seg([LX, 0.58, 0], [LX, 0.32, 0], 0.075, 0.064, 'skin'), E([LX, 0.32, 0], [0.064, 0.064, 0.064], 0, 'skin')], W, LX, 0)],
      [fat([seg([LX, 0.32, 0], [LX, 0.24, 0], 0.062, 0.058, 'skin'), C([LX, 0.17, 0], 0.078, 0.072, 0.17, 'bootBrown'), T([LX, 0.255, 0], 0.075, 0.022, 'hairCream', { r: [PI / 2, 0, 0] })], W, LX, 0)],
      [grow([E([LX, 0.06, 0.04], [0.08, 0.06, 0.13], 0, 'bootBrown'), C([LX, 0.012, 0.04], 0.082, 0.082, 0.024, 'leatherDark', { s: [1, 1, 1.6] })], [LX, 0, 0], 1.18)],
    );
    STAGE = 6;
    return assemble({ head: catHead(1), upper, lower, armL, legL, extraHips: [catTail(rk)], hk: 1.25 / rk, rk });
  }

  // ---- 2 階：靈貓姬（高馬尾、黑短上衣、紅圍巾、皮帶腰包、紅腰布、半指手套、及膝靴、右手彎刀）----
  function buildCatTeen() {
    const rk = 0.84, W = 1.05 / rk;
    STAGE = 2;
    const upper = fat([
      C([0, 1.4, 0], 0.048, 0.055, 0.12, 'skin'),
      L([0, 0, 0], FEM, 'skin', { s: [1, 1, 0.75] }),
      L([0, 0, 0], slice(FEM, 1.1, 1.33, 0.01), 'clothBlack', { s: [1, 1, 0.75] }),
      B([0, 1.27, 0.165], [0.06, 0.06, 0.012], 'skin', { r: [-0.4, 0, PI / 4], bevel: 0.004 }),   // V 領
      T([0, 1.1, 0], 0.212, 0.01, 'goldDark', { r: [PI / 2, 0, 0], s: [1, 0.76, 1] }),
      sym(strap([0.1, 1.33, 0.12], [0.13, 1.42, -0.02], 0.025, 0.012, 'clothBlack')),
      T([0, 1.37, 0.0], 0.11, 0.04, 'scarfRed', { r: [PI / 2 + 0.12, 0, 0] }),
      C([0, 1.27, 0.15], 0.13, 0.012, 0.15, 'scarfRed', { r: [-0.2, 0, 0], s: [1, 1, 0.2] }),
      E([0, 1.33, 0.17], [0.026, 0.026, 0.026], 0, 'gold'),
      strap([-0.08, 1.36, -0.12], [-0.28, 1.05, -0.32], 0.08, 0.012, 'scarfRed'),
      strap([-0.28, 1.05, -0.32], [-0.42, 0.78, -0.4], 0.09, 0.012, 'scarfDark'),
    ], W);
    STAGE = 3;
    const lower = fat([
      L([0, 0, 0], [[0.185, 0.55], [0.22, 0.6], [0.22, 0.7], [0.205, 0.8], [0.2, 0.83]], 'clothBlack', { s: [1, 1, 0.78] }),
      E([0, 0.6, 0], [0.17, 0.06, 0.13], 0, 'clothBlack'),
      T([0, 0.79, 0], 0.215, 0.02, 'leather', { r: [PI / 2, 0.08, 0.06], s: [1, 0.78, 1] }),
      B([0.03, 0.79, 0.17], [0.045, 0.04, 0.012], 'gold', { bevel: 0.004 }),
      B([0.2, 0.72, 0.05], [0.07, 0.08, 0.05], 'leather', { r: [0, 0.9, 0], bevel: 0.015 }),
      B([0.17, 0.68, -0.12], [0.06, 0.07, 0.045], 'leatherDark', { r: [0, 0.5, 0], bevel: 0.015 }),
      strap([-0.12, 0.76, 0.15], [-0.15, 0.42, 0.2], 0.1, 0.01, 'scarfRed'),                    // 紅腰布（前）
      strap([0.05, 0.76, -0.17], [0.08, 0.4, -0.24], 0.13, 0.01, 'scarfRed'),                   // 紅腰布（後）
      strap([-0.2, 0.75, -0.05], [-0.26, 0.45, -0.08], 0.08, 0.01, 'scarfDark'),
    ], W);
    STAGE = 4;
    const armL = heroArm(
      [fat([E([0.29, 1.53, 0], [0.058, 0.058, 0.058], 0, 'skin'), seg([0.3, 1.5, 0], ELB, 0.047, 0.042, 'skin')], W, 0.32, 0)],
      [fat([seg(ELB, WRI, 0.042, 0.04, 'skin'), C(add(WRI, [-0.008, 0.08, -0.003]), 0.05, 0.047, 0.13, 'leather', { r: [0, 0, -0.05] }), T(add(WRI, [-0.006, 0.14, 0]), 0.05, 0.008, 'gold', { r: [PI / 2, 0, -0.05] })], W, 0.352, 0.005)],
      [fist('glove', 1.05, 'skin')],
    );
    const legL = heroLeg(
      [fat([seg([LX, 0.6, 0], [LX, 0.32, 0], 0.075, 0.062, 'skin'), E([LX, 0.32, 0], [0.062, 0.062, 0.062], 0, 'skin'), T([LX, 0.5, 0], 0.074, 0.01, 'leather', { r: [PI / 2, 0, 0] }), B([LX + 0.06, 0.5, 0.03], [0.02, 0.03, 0.03], 'gold', { bevel: 0.004 })], W, LX, 0)],
      [fat([C([LX, 0.22, 0], 0.072, 0.064, 0.24, 'bootDark'), T([LX, 0.34, 0], 0.074, 0.02, 'leather', { r: [PI / 2, 0, 0] }), T([LX, 0.2, 0], 0.068, 0.009, 'goldDark', { r: [PI / 2, 0, 0] })], W, LX, 0)],
      [grow([E([LX, 0.06, 0.04], [0.08, 0.06, 0.13], 0, 'bootDark'), ...[-0.035, 0, 0.035].map((dx) => E([LX + dx, 0.045, 0.15], [0.026, 0.03, 0.03], 0, 'bootDark')), C([LX, 0.012, 0.04], 0.082, 0.082, 0.024, 'leatherDark', { s: [1, 1, 1.6] })], [LX, 0, 0], 1.12)],
    );
    STAGE = 6;
    return assemble({ head: catHead(2), upper, lower, armL, legL, extraHips: [catTail(rk)], hk: 1.08 / rk, rk, legK: 1.22 });
  }

  // ---- 3 階：雙刃貓女（長髮高馬尾、黑色短上衣＋金邊胸帶、紅圍巾、紅黑長腰布、及大腿長靴、長手套金護腕、雙彎刃）----
  function buildCatAdult() {
    const rk = 0.82, W = 1 / rk, LEGK = 2.85, ARMK = 1.6, LW = 1.3 / LEGK, AW = 1.12 / ARMK;
    STAGE = 2;
    const upper = fat([
      C([0, 1.4, 0], 0.046, 0.052, 0.12, 'skin'),
      L([0, 0, 0], FEM.map(([r, y]) => [y < 0.85 ? r * 1.06 : y < 1.06 ? r * 0.74 : r, y]), 'skin', { s: [1, 1, 0.75] }),   // 細腰
      L([0, 0, 0], slice(FEM, 1.1, 1.26, 0.012), 'clothBlack', { s: [1, 1, 0.75] }),
      T([0, 1.1, 0], 0.212, 0.009, 'gold', { r: [PI / 2, 0, 0], s: [1, 0.76, 1] }),
      T([0, 1.26, 0], 0.232, 0.009, 'gold', { r: [PI / 2, 0, 0], s: [1, 0.76, 1] }),
      sym(strap([0.07, 1.26, 0.17], [0.12, 1.4, 0.02], 0.024, 0.01, 'clothBlack')),
      strap([0.1, 1.24, 0.17], [-0.12, 1.05, 0.16], 0.02, 0.01, 'leatherDark'),                 // 胸帶
      T([0, 1.38, -0.01], 0.105, 0.035, 'scarfRed', { r: [PI / 2 + 0.2, 0, 0] }),
      strap([0.06, 1.37, -0.1], [0.2, 1.1, -0.28], 0.09, 0.01, 'scarfRed'),
      strap([0.2, 1.1, -0.28], [0.3, 0.86, -0.36], 0.1, 0.01, 'scarfDark'),
    ], W);
    STAGE = 3;
    const lower = fat([
      L([0, 0, 0], [[0.23, 0.52], [0.28, 0.58], [0.285, 0.66], [0.24, 0.76], [0.19, 0.83]], 'clothBlack', { s: [1, 1, 0.86] }),
      sym(E([0.11, 0.6, -0.1], [0.17, 0.17, 0.16], 0, 'clothBlack')),                               // 臀部（往下包到大腿根）
      sym(E([0.16, 0.55, -0.02], [0.12, 0.09, 0.13], 0, 'skin')),                                  // 大腿根銜接
      E([0, 0.6, 0], [0.17, 0.06, 0.13], 0, 'clothBlack'),
      T([0, 0.77, 0], 0.222, 0.022, 'scarfRed', { r: [PI / 2, 0, 0.05], s: [1, 0.8, 1] }),
      G([0, 0.77, 0.18], [C([0, 0, 0], 0.035, 0.035, 0.012, 'gold', { r: ALONG_Z }), E([0, 0, 0.008], [0.016, 0.016, 0.008], 0, 'gem')]),
      strap([0.08, 0.74, 0.17], [0.1, 0.3, 0.22], 0.13, 0.01, 'scarfRed'),                      // 紅色長腰布
      strap([-0.08, 0.74, 0.17], [-0.11, 0.38, 0.21], 0.1, 0.01, 'clothBlack'),
      B([0.09, 0.32, 0.225], [0.13, 0.03, 0.012], 'gold', { r: [-0.12, 0, 0], bevel: 0.004 }),
      strap([0, 0.74, -0.18], [0, 0.32, -0.26], 0.2, 0.01, 'scarfRed'),
      strap([-0.2, 0.74, -0.06], [-0.28, 0.4, -0.1], 0.08, 0.01, 'scarfDark'),
    ], W);
    STAGE = 4;
    const armL = heroArm(
      [E([0.29, 1.53, 0], [0.056 / ARMK * 1.25, 0.056 / ARMK * 1.25, 0.056 / ARMK * 1.25], 0, 'skin'), fat([seg([0.3, 1.5, 0], ELB, 0.045, 0.04, 'skin'), T([0.325, 1.4, 0], 0.048, 0.008, 'gold', { r: [PI / 2, 0, -0.2] })], W * AW, 0.32, 0)],
      [fat([seg(add(ELB, [0, 0.03, 0]), WRI, 0.045, 0.04, 'glove'), C(add(WRI, [-0.008, 0.09, -0.003]), 0.052, 0.048, 0.12, 'gold', { r: [0, 0, -0.05] }), B(add(WRI, [-0.008, 0.09, 0.05]), [0.03, 0.06, 0.012], 'gem', { bevel: 0.004 })], W * AW, 0.352, 0.005)],
      [fist('glove', 1.05 / ARMK)],
    );
    const legL = heroLeg(
      [fat([seg([LX, 0.62, 0], [LX, 0.32, 0], 0.088, 0.06, 'skin'), E([LX, 0.6, 0], [0.085, 0.05, 0.08], 0, 'skin'), C([LX, 0.42, 0], 0.07, 0.062, 0.22, 'bootDark'), T([LX, 0.53, 0], 0.071, 0.01, 'gold', { r: [PI / 2, 0, 0] }), E([LX, 0.32, 0.03], [0.06, 0.06, 0.055], 0, 'gold')], W * LW * 1.3, LX, 0)],
      [fat([C([LX, 0.21, 0], 0.06, 0.042, 0.24, 'bootDark'), T([LX, 0.12, 0], 0.045, 0.01, 'gold', { r: [PI / 2, 0, 0] })], W * LW, LX, 0)],
      // 皮靴：靴筒從腳踝直落到地面、平底，腳尖往前（只縮 x、z，高度維持從腳踝到地面）
      [fat([C([LX, 0.06, 0.0], 0.045, 0.05, 0.12, 'bootDark'), E([LX, 0.035, 0.07], [0.05, 0.035, 0.12], 0, 'bootDark'),
        C([LX, 0.008, 0.07], 0.053, 0.053, 0.016, 'leatherDark', { s: [1, 1, 2.3] }), T([LX, 0.1, 0], 0.046, 0.006, 'gold', { r: [PI / 2, 0, 0] })], W * LW * 1.2, LX, 0.02)],
    );
    STAGE = 6;
    return assemble({ head: catHead(3), upper, lower, armL, legL, extraHips: [catTail(rk)], hk: 0.7 / rk, rk, legK: LEGK, armK: ARMK, legDx: 0.045 });
  }

  // ======================================================================================
  // 大熊（3 階）：主角骨架、壯碩身軀、斜背皮帶、背上大劍（大絕時拔劍到右手）
  // ======================================================================================
  // 大劍：石灰色寬刃＋熔岩裂紋、橘色晶石；原點 = 握點，+Z = 劍身方向
  const SWORD = [
    C([0, 0, -0.1], 0.038, 0.038, 0.32, 'leatherDark', { r: ALONG_Z }),
    ...[-0.22, -0.14, -0.06, 0.02].map((z) => T([0, 0, z], 0.04, 0.009, 'leather')),
    B([0, 0, -0.3], [0.1, 0.1, 0.1], 'stoneDark', { r: [0, 0, PI / 4], bevel: 0.02 }),
    E([0, 0, -0.3], [0.035, 0.035, 0.06], 0, 'gemFire'),
    B([0, 0, 0.1], [0.42, 0.12, 0.11], 'stoneDark', { bevel: 0.025 }),
    sym(B([0.2, 0, 0.1], [0.1, 0.14, 0.14], 'stoneDark', { r: [0, 0, PI / 4], bevel: 0.02 })),
    E([0, 0.06, 0.1], [0.05, 0.03, 0.05], 0, 'gemFire'), E([0, -0.06, 0.1], [0.05, 0.03, 0.05], 0, 'gemFire'),
    B([0, 0, 0.8], [0.28, 0.08, 1.3], 'stone', { bevel: 0.02 }),
    B([0, 0, 0.8], [0.3, 0.05, 1.28], 'stoneDark', { bevel: 0.01 }),
    ...[1, -1].flatMap((k) => [B([0.02, k * 0.042, 0.55], [0.025, 0.004, 0.5], 'lava', { r: [0, 0, 0], bevel: 0.002 }), B([-0.03, k * 0.042, 0.95], [0.022, 0.004, 0.45], 'lava', { r: [0, 0.15, 0], bevel: 0.002 })]),
    C([0, 0, 1.55], 0, 0.15, 0.22, 'stone', { r: ALONG_Z, s: [1, 1, 0.28], seg: 4 }),
  ];
  function buildBearBig() {
    const rk = 1.3, armDx = 0.12;
    STAGE = 1;
    const HC = [0, 2.0, 0];
    const head = [
      E(HC, [0.28, 0.26, 0.26], 0, 'fur'),
      E([0, 1.88, 0.03], [0.28, 0.17, 0.23], 0, 'fur'),
      E([0, 1.86, 0.19], [0.14, 0.105, 0.12], 0, 'cream'),
      sym(E([0.12, 1.88, 0.17], [0.09, 0.08, 0.08], 0, 'cream')),
      E([0, 1.925, 0.305], [0.048, 0.032, 0.03], 0, 'nose'),
      sym(G([0.22, 2.2, -0.02], [E([0, 0, 0], [0.075, 0.075, 0.04], 0, 'fur'), E([0, -0.005, 0.02], [0.045, 0.045, 0.02], 0, 'cream')], { r: [0, -0.3, -0.25] })),
      ...mohawk(HC, [0.28, 0.26, 0.26], 0.42, 0.095),                                          // 龐克頭
    ];
    STAGE = 5;
    const eyeAt = [0.1, 2.0, 0.232], ry = 0.36;
    const open = [
      E([0, 0, 0], [0.05, 0.045, 0.02], 0, 'white'),
      E([-0.005, -0.004, 0.009], [0.035, 0.038, 0.016], 0, 'irisAmber'),
      E([-0.006, -0.004, 0.016], [0.016, 0.022, 0.01], 0, 'pupil'),
      E([0.008, 0.012, 0.02], [0.009, 0.009, 0.005], 0, 'white'),
      E([0, 0.04, 0.003], [0.06, 0.022, 0.026], [0, 0, 0.3], 'fur'),
    ];
    const mAt = [0, 1.8, 0.27];
    const fang = (x, up = 1) => C(add(mAt, [x, up * 0.016, 0.01]), up > 0 ? 0.01 : 0.001, up > 0 ? 0.001 : 0.01, 0.026, 'white', { seg: 10 });
    head.push(
      eyeSet(eyeAt, ry, open, 'line'), eyeSet(eyeAt, ry, open, 'line').map(mirror),
      sym(brow([0.105, 2.05, 0.245], [0.06, 0.016, 0.016], [0, ry, 0.35], 'furDark')),
      mouths(mAt,
        [E(mAt, [0.07, 0.04, 0.02], 0, 'mouthDark'), E(add(mAt, [0, -0.02, 0.008]), [0.045, 0.016, 0.012], 0, 'tongue'), fang(0.04), fang(-0.04), fang(0.035, -1), fang(-0.035, -1)],
        [E(mAt, [0.085, 0.055, 0.022], 0, 'mouthDark'), E(add(mAt, [0, -0.03, 0.01]), [0.055, 0.02, 0.012], 0, 'tongue'), fang(0.05), fang(-0.05), fang(0.045, -1), fang(-0.045, -1)],
        'line', 1.2),
    );
    STAGE = 2;
    const TORSO = [[0.29, 0.76], [0.35, 0.86], [0.39, 0.98], [0.395, 1.1], [0.37, 1.22], [0.31, 1.31], [0.2, 1.38], [0.08, 1.42], [0.001, 1.43]];
    const upper = [
      L([0, 0, 0], TORSO, 'fur', { s: [1, 1, 0.82] }),
      E([0, 1.0, 0.12], [0.27, 0.33, 0.22], 0, 'cream'),
      E([0, 1.26, 0.17], [0.22, 0.11, 0.13], 0, 'cream'),
      // 脖子一圈火焰鬃毛
      ...Array.from({ length: 9 }, (_, i) => { const a = -PI * 0.75 + (i / 8) * PI * 1.5; return flame([0.24 * Math.sin(a), 1.34, 0.2 * Math.cos(a)], 0.24, 0.07, [0.6 * Math.cos(a), 0, -0.7 * Math.sin(a)], { bend: -0.2 }); }),
      // 斜背皮帶（左肩 → 右腰，前後各一段）＋銀扣
      strap([0.3, 1.31, 0.19], [0.02, 1.1, 0.335], 0.1, 0.03, 'leather'),
      strap([0.02, 1.1, 0.335], [-0.3, 0.86, 0.29], 0.1, 0.03, 'leather'),
      B([0.02, 1.1, 0.35], [0.12, 0.1, 0.03], 'steel', { r: [0, 0, 0.7], bevel: 0.01 }),
      B([0.02, 1.1, 0.362], [0.07, 0.05, 0.02], 'leather', { r: [0, 0, 0.7], bevel: 0.005 }),
      strap([0.3, 1.31, -0.19], [0.02, 1.1, -0.335], 0.1, 0.03, 'leather'),
      strap([0.02, 1.1, -0.335], [-0.3, 0.86, -0.29], 0.1, 0.03, 'leather'),
      // 背上的大劍（握柄在右肩上方，劍身斜往左腰）
      G([-0.2, 1.52, -0.4], [G([0, 0, 0], SWORD, { r: [PI / 2, 0, 0], s: [0.82, 0.82, 0.82] })], { r: [-0.12, 0, 0.5], id: 'swordBack' }),
    ];
    STAGE = 3;
    const lower = [
      E([0, 0.72, 0], [0.36, 0.22, 0.3], 0, 'fur'),
      E([0, 0.76, 0.17], [0.25, 0.17, 0.15], 0, 'cream'),
    ];
    STAGE = 4;
    const handClaws = claws(fistAt(-0.09), 4, 0.032, 0.06, 0.016, [PI - 0.4, 0, 0]);
    const armL = heroArm(
      [E([0.29, 1.52, 0], [0.19, 0.19, 0.19], 0, 'fur'), seg([0.3, 1.5, 0], ELB, 0.175, 0.15, 'fur'), E(ELB, [0.15, 0.15, 0.15], 0, 'fur'), E([0.33, 1.4, 0.04], [0.15, 0.13, 0.14], 0, 'fur')],
      [seg(ELB, WRI, 0.15, 0.13, 'furDark'), E(add(ELB, [0.005, -0.08, 0.02]), [0.14, 0.12, 0.14], 0, 'furDark'), ...zigzag(add(ELB, [0.004, -0.05, 0]), 0.148, 5, 0.17, 0.8, 0.6, 0.05)],
      [grow([E(fistAt(), [0.06, 0.07, 0.065], 0, 'furDark'), ...handClaws], fistAt(), 1.8)],
      [joint('swordHandL', GRIP_L, [G(GRIP_L, [G([0, 0, 0], SWORD, { r: [0, 0, PI / 2] })])], OFF)],   // 劍面立起：劈下時刃口朝地
    );
    const legL = heroLeg(
      [seg([LX, 0.66, 0], [LX, 0.34, 0], 0.25, 0.22, 'fur'), E([LX, 0.34, 0], [0.22, 0.22, 0.22], 0, 'fur')],
      [seg([LX, 0.34, 0], [LX, 0.1, 0], 0.21, 0.19, 'furDark'), ...zigzag([LX, 0.3, 0], 0.218, 6, 0.2, 0.8, 0.6, 0.06)],
      [E([LX, 0.075, 0.07], [0.2, 0.1, 0.27], 0, 'furDark'), ...claws([LX, 0.05, 0.33], 4, 0.08, 0.1, 0.03)],
    );
    STAGE = 6;
    const tail = joint('tailFlame', [0, 0.78, -0.3], [flame([0, 0.74, -0.32], 0.26, 0.1, [-0.6, 0, 0], { bend: -0.3 })]);
    return assemble({ head, upper, lower, armL, legL, extraHips: [tail], hk: 0.92, rk, armDx, legK: 0.74, legDx: 0.075 });
  }

  // ======================================================================================
  // 小熊（1 階）、壯熊（2 階）：四足骨架
  //   root → body（身體中心）→ head（脖子）→ jaw（下顎）；legFL→kneeFL→pawFL（前腳）、legBL→kneeBL→pawBL（後腳）；
  //   tailFlame（屁股上的火焰尾巴）。R 側由鏡射產生。
  // ======================================================================================
  function quadBear(o) {
    const S = o.stage, B0 = o.bodyY, fz = o.frontZ, bz = o.backZ, lx = o.legX;
    STAGE = 2;
    const body = [
      E([0, B0, -0.02], o.bodyS, 0, 'fur'),
      E([0, B0 + 0.06, fz - 0.02], [o.bodyS[0] * 0.95, o.bodyS[1] * 0.98, 0.26], 0, 'fur'),       // 前胸／肩膀
      E([0, B0 - 0.06, fz + 0.06], [o.bodyS[0] * 0.66, o.bodyS[1] * 0.78, 0.17], 0, 'cream'),    // 胸前米色
      E([0, B0 - 0.12, -0.02], [o.bodyS[0] * 0.6, o.bodyS[1] * 0.55, o.bodyS[2] * 0.8], 0, 'cream'), // 肚子
      // 背上火焰：壯熊多一排
      ...Array.from({ length: S === 2 ? 5 : 3 }, (_, i) => flame([0, B0 + o.bodyS[1] * 0.92, fz - 0.05 - i * 0.13], S === 2 ? 0.24 : 0.16, S === 2 ? 0.07 : 0.05, [-0.9, 0, (i % 2 ? 0.25 : -0.25)], { bend: -0.3 })),
      // 脖子火焰鬃毛
      ...Array.from({ length: S === 2 ? 11 : 7 }, (_, i, arr) => { const n = S === 2 ? 11 : 7, a = -PI * 0.8 + (i / (n - 1)) * PI * 1.6; return flame([o.maneR * Math.sin(a), B0 + 0.1 + 0.1 * Math.cos(a), fz + 0.06 + 0.05 * Math.cos(a)], o.maneH, o.maneH * 0.3, [1.15 + 0.25 * Math.cos(a), 0, -0.45 * Math.sin(a)], { bend: -0.25 }); }),
      // 側腹鋸齒火紋
      ...[1, -1].flatMap((k) => [G([k * o.bodyS[0] * 0.93, B0 - 0.05, bz + 0.02], [E([0, 0, 0], [0.014, 0.1, 0.05], 0, 'flameOrange'), E([0, 0.07, -0.01], [0.014, 0.05, 0.03], 0, 'flameRed')], { r: [0.4, 0, k * -0.3] })]),
    ];
    STAGE = 1;
    const hc = o.headC, hs = o.headS;
    const headParts = [
      E(hc, hs, 0, 'fur'),
      E(add(hc, [0, -hs[1] * 0.35, hs[2] * 0.25]), [hs[0] * 0.95, hs[1] * 0.6, hs[2] * 0.8], 0, 'fur'),
      E(add(hc, [0, -hs[1] * 0.3, hs[2] * 0.72]), [hs[0] * 0.45, hs[1] * 0.36, hs[2] * 0.4], 0, 'cream'),        // 嘴套
      sym(E(add(hc, [hs[0] * 0.35, -hs[1] * 0.12, hs[2] * 0.6]), [hs[0] * 0.3, hs[1] * 0.28, hs[2] * 0.3], 0, 'cream')),
      E(add(hc, [0, -hs[1] * 0.12, hs[2] * 1.06]), [hs[0] * 0.13, hs[1] * 0.09, hs[2] * 0.09], 0, 'nose'),
      sym(G(add(hc, [hs[0] * 0.7, hs[1] * 0.75, -hs[2] * 0.15]), [E([0, 0, 0], [hs[0] * 0.26, hs[0] * 0.26, hs[0] * 0.13], 0, 'fur'), E([0, -0.005, hs[0] * 0.06], [hs[0] * 0.15, hs[0] * 0.15, hs[0] * 0.06], 0, 'cream')], { r: [0, -0.3, -0.3] })),
      ...mohawk(hc, hs, hs[1] * (S === 2 ? 1.5 : 1.25), hs[0] * 0.3),                              // 龐克頭
    ];
    // 五官：大眼（小熊圓、壯熊銳利）、眉、張口的尖牙笑（下顎可動）
    STAGE = 5;
    const ex = hs[0] * 0.36, ey = hc[1] + hs[1] * 0.12, ez = hc[2] + hs[2] * 0.86;
    const eye = G([ex, ey, ez], [
      E([0, 0, 0], [hs[0] * 0.19, hs[1] * (S === 1 ? 0.22 : 0.15), 0.02], 0, 'white'),
      E([-0.004, -0.004, 0.01], [hs[0] * 0.14, hs[1] * (S === 1 ? 0.18 : 0.13), 0.016], 0, 'irisAmber'),
      E([-0.005, -0.004, 0.018], [hs[0] * 0.07, hs[1] * 0.1, 0.01], 0, 'pupil'),
      E([0.01, hs[1] * 0.06, 0.024], [hs[0] * 0.04, hs[0] * 0.04, 0.006], 0, 'white'),
      E([0, hs[1] * (S === 1 ? 0.2 : 0.13), 0.004], [hs[0] * 0.21, hs[1] * 0.07, 0.024], [0, 0, 0.25], 'fur'),
      T([0, hs[1] * 0.02, 0.008], hs[0] * 0.19, 0.008, 'line', { arc: PI * 0.75, s: [1, S === 1 ? 1.1 : 0.8, 1], r: [0, 0, 0.2] }),
    ], { r: [0, 0.35, 0] });
    const browN = E([ex + 0.005, ey + hs[1] * (S === 1 ? 0.3 : 0.22), ez + 0.005], [hs[0] * 0.2, 0.018, 0.016], [0, 0.35, S === 1 ? 0.25 : 0.45], 'furDark');
    const mz = hc[2] + hs[2] * 0.95, my = hc[1] - hs[1] * 0.42;
    const fangs = (y, up) => sym(C([hs[0] * 0.13, y, mz + 0.01], up ? 0.014 : 0.002, up ? 0.002 : 0.014, 0.035, 'white', { seg: 10 }));
    const jaw = joint('jaw', [0, my + 0.02, mz - hs[2] * 0.35], [
      E([0, my - 0.03, mz - 0.02], [hs[0] * 0.3, hs[1] * 0.12, hs[2] * 0.2], 0, 'cream'),
      E([0, my - 0.005, mz - 0.01], [hs[0] * 0.2, hs[1] * 0.06, hs[2] * 0.14], 0, 'tongue'),
      fangs(my, false),
    ]);
    const mouth = [E([0, my + 0.005, mz - 0.03], [hs[0] * 0.27, hs[1] * 0.13, hs[2] * 0.12], 0, 'mouthDark'), fangs(my + 0.03, true)];
    const headN = joint('head', o.neck, [...headParts, sym(eye), sym(browN), ...mouth, jaw]);
    // 四肢：上段紅棕、下段深棕＋鋸齒火紋、腳掌大＋橘爪
    STAGE = 4;
    const leg = (id, sh, kn, pw, r1, r2, back) => joint('leg' + id, sh, [
      back ? E(add(sh, [0, -0.05, 0.02]), [r1 * 1.25, r1 * 1.7, r1 * 1.5], 0, 'fur') : E(sh, [r1 * 1.15, r1 * 1.4, r1 * 1.2], 0, 'fur'),
      seg(sh, kn, r1, r2, 'fur'), E(kn, [r2, r2, r2], 0, 'fur'),
      joint('knee' + id, kn, [
        seg(kn, pw, r2 * 0.95, r2 * 0.9, 'furDark'),
        ...zigzag(add(kn, [0, -0.02, 0]), r2 * 0.98, 7, 0.07 * (S === 2 ? 1.3 : 1)),
        joint('paw' + id, pw, [
          E(add(pw, [0, -0.03, 0.03]), [r2 * 1.12, r2 * 0.6, r2 * 1.35], 0, 'furDark'),
          ...claws(add(pw, [0, -0.045, 0.03 + r2 * 1.2]), 3, r2 * 0.55, 0.06 * (S === 2 ? 1.25 : 1), 0.014 * (S === 2 ? 1.3 : 1)),
        ]),
      ]),
    ]);
    const FL = leg('FL', [lx, B0 - 0.02, fz], [lx + 0.01, o.kneeY, fz + 0.02], [lx + 0.01, o.pawY, fz + 0.03], o.legR, o.legR * 0.85, false);
    const BL = leg('BL', [lx + 0.01, B0 + 0.02, bz], [lx + 0.02, o.kneeY, bz + 0.05], [lx + 0.02, o.pawY, bz], o.legR * 1.05, o.legR * 0.85, true);
    STAGE = 6;
    const tail = joint('tailFlame', [0, B0 + 0.08, bz - 0.14], [flame([0, B0 + 0.04, bz - 0.16], o.tailH, o.tailH * 0.35, [-0.9, 0, 0], { bend: -0.3 })]);
    const bodyN = joint('body', [0, B0, 0], [body, headN, FL, mirror(FL), BL, mirror(BL), tail]);
    return [joint('root', [0, 0, 0], [bodyN], [o.scale, o.scale, o.scale])];
  }
  const bearCub = () => quadBear({ stage: 1, scale: 1, bodyY: 0.43, bodyS: [0.31, 0.29, 0.39], frontZ: 0.23, backZ: -0.24, legX: 0.18, legR: 0.105, kneeY: 0.23, pawY: 0.075,
    neck: [0, 0.6, 0.3], headC: [0, 0.8, 0.46], headS: [0.37, 0.34, 0.31], maneR: 0.25, maneH: 0.17, tailH: 0.2 });
  const bearMid = () => quadBear({ stage: 2, scale: 1.45, bodyY: 0.5, bodyS: [0.35, 0.32, 0.46], frontZ: 0.27, backZ: -0.28, legX: 0.21, legR: 0.13, kneeY: 0.26, pawY: 0.08,
    neck: [0, 0.74, 0.36], headC: [0, 0.88, 0.5], headS: [0.26, 0.24, 0.24], maneR: 0.3, maneH: 0.27, tailH: 0.26 });

  // ---- 材質 ----
  const MATERIALS = {
    fur: { c: '#A04A2C', rough: 0.85, fabric: 0.5, sheenColor: '#D07A4E' },
    furDark: { c: '#4A2420', rough: 0.85 },
    cream: { c: '#F2D0A2', rough: 0.7, sss: 0.3 },
    nose: { c: '#2A1A16', rough: 0.3, coat: 0.6 },
    claw: { c: '#F27A28', rough: 0.4, emit: 0.25 },
    flameRed: { c: '#E5452B', rough: 0.5, emit: 0.35 },
    flameOrange: { c: '#F68A2A', rough: 0.45, emit: 0.5 },
    flameYellow: { c: '#FFD35A', rough: 0.4, emit: 0.7 },
    white: { c: '#FBF8F2', rough: 0.35 },
    irisAmber: { c: '#E08A24', rough: 0.2, coat: 1 },
    irisDeep: { c: '#9A4A12', rough: 0.2, coat: 1 },
    pupil: { c: '#1D110B', rough: 0.15, coat: 1 },
    line: { c: '#3A1E14', rough: 0.6 },
    lash: { c: '#3A2018', rough: 0.6 },
    mouthDark: { c: '#6A2220', rough: 0.5 },
    tongue: { c: '#E8747C', rough: 0.35, coat: 0.4 },
    blush: { c: '#F4A0A0', rough: 0.85, opacity: 0.7 },
    skin: { c: '#F9DDC9', rough: 0.55, sss: 0.4 },
    hairCream: { c: '#EADBC2', rough: 0.75, fabric: 0.4, sheenColor: '#FFF3DE' },
    hairBrown: { c: '#5A3524', rough: 0.75 },
    hairShade: { c: '#D6C09E', rough: 0.75, fabric: 0.4 },
    earDark: { c: '#4A2C22', rough: 0.8 },
    earPink: { c: '#F2A8AE', rough: 0.6, sss: 0.3 },
    scarfRed: { c: '#C8282C', fabric: 1 },
    scarfDark: { c: '#8E1C22', fabric: 1 },
    gold: { c: '#D9AE4C', rough: 0.3, metal: 0.9 },
    goldDark: { c: '#A57A28', rough: 0.4, metal: 0.85 },
    gem: { c: '#D8283A', rough: 0.1, coat: 1, emit: 0.2 },
    shirtWhite: { c: '#F6F2EA', fabric: 1 },
    shortsWhite: { c: '#EFE7D8', fabric: 1 },
    leather: { c: '#7A4A2A', fabric: 0.8 },
    leatherDark: { c: '#4C3123', fabric: 0.8 },
    bootBrown: { c: '#6E4128', rough: 0.6 },
    bootDark: { c: '#2E2024', rough: 0.55, coat: 0.2 },
    clothBlack: { c: '#2A2228', fabric: 1 },
    glove: { c: '#2E2428', rough: 0.6 },
    pawDark: { c: '#4E3028', rough: 0.85, fabric: 0.6 },
    pawPink: { c: '#F4A3A8', rough: 0.5, sss: 0.3 },
    steel: { c: '#B9BEC4', rough: 0.3, metal: 0.8 },
    stone: { c: '#7C7A7A', rough: 0.7 },
    stoneDark: { c: '#4E4B4C', rough: 0.6 },
    lava: { c: '#FF8A2A', rough: 0.4, emit: 0.9 },
    gemFire: { c: '#FF7A1E', rough: 0.1, coat: 1, emit: 0.7 },
  };

  // 武器（獨立道具，掛 propR / propL）：原點 = 握點，+Z = 刀身方向
  // 彎刀刀身：分 6 段沿弧線排列並互相重疊（不會岔開），spine = 刀背顏色（嵌在刀身上緣）
  const curved = (len, w, m, bend, spine) => {
    const out = [], n = 6;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, z0 = 0.05 + len * t0, z1 = 0.05 + len * t1, y0 = bend * t0 * t0 * len, y1 = bend * t1 * t1 * len;
      const wd = w * (1 - 0.45 * (t0 + t1) / 2), ang = -Math.atan2(y1 - y0, z1 - z0), cy = (y0 + y1) / 2, cz = (z0 + z1) / 2, L = Math.hypot(z1 - z0, y1 - y0) + 0.02;
      out.push(B([0, cy, cz], [0.012, wd, L], m, { r: [ang, 0, 0], bevel: 0.004 }));
      if (spine) out.push(B([0, cy + (wd / 2 - 0.006) * Math.cos(ang), cz + (wd / 2 - 0.006) * Math.sin(ang)], [0.015, 0.01, L], spine, { r: [ang, 0, 0], bevel: 0.002 }));
    }
    const tz = 0.05 + len, ty = bend * len;
    out.push(C([0, ty + w * 0.12, tz + 0.03], 0, w * 0.32, 0.07, m, { r: [PI / 2 - Math.atan2(2 * bend * len, 1), 0, 0], s: [0.25, 1, 1], seg: 8 }));
    return out;
  };
  const PROPS = {
    catDagger: { name: '彎月短刀', parts: [
      C([0, 0, -0.02], 0.017, 0.017, 0.1, 'leatherDark', { r: ALONG_Z }), T([0, 0, 0.04], 0.026, 0.008, 'gold'), E([0, 0, -0.075], [0.02, 0.02, 0.02], 0, 'gold'),
      ...curved(0.34, 0.05, 'steel', 0.3, 'gem'),
    ], tip: [0, 0.13, 0.4], base: [0, 0.01, 0.08], trail: '#FF5A5A' },
    catBlade: { name: '雙刀', parts: [
      C([0, 0, -0.03], 0.018, 0.018, 0.12, 'leatherDark', { r: ALONG_Z }), B([0, 0, 0.045], [0.07, 0.03, 0.022], 'gold', { bevel: 0.006 }), E([0, 0, 0.045], [0.014, 0.014, 0.014], 0, 'gem'),
      ...curved(0.7, 0.062, 'steel', 0.1, 'gem'),
    ], tip: [0, 0.07, 0.77], base: [0, 0.01, 0.1], trail: '#FF3B4A' },
  };

  const CHARACTERS = {
    bear1: { id: 'bear1', name: '小熊', family: 'bear', stage: 1, rig: 'quad', materials: MATERIALS, parts: bearCub(), height: 1.2 },
    bear2: { id: 'bear2', name: '壯熊', family: 'bear', stage: 2, rig: 'quad', materials: MATERIALS, parts: bearMid(), height: 1.75 },
    bear3: { id: 'bear3', name: '大熊', family: 'bear', stage: 3, rig: 'hero', materials: MATERIALS, parts: buildBearBig(), height: 2.55, legK: 0.74, crouch: [-0.45, 0.85] },
    cat1: { id: 'cat1', name: '小貓娘', family: 'cat', stage: 1, rig: 'hero', materials: MATERIALS, parts: buildCatKid(), height: 1.75 },
    cat2: { id: 'cat2', name: '靈貓姬', family: 'cat', stage: 2, rig: 'hero', materials: MATERIALS, parts: buildCatTeen(), height: 2.05, legK: 1.22, hold: { propR: 'catDagger' } },
    cat3: { id: 'cat3', name: '雙刃貓女', family: 'cat', stage: 3, rig: 'hero', materials: MATERIALS, parts: buildCatAdult(), height: 3.05, legK: 2.85, hold: { propR: 'catBlade', propL: 'catBlade' } },
  };
  // 骨架資訊：各關節樞紐（世界座標，未含 root 縮放）與父節點（四足動作烘焙用）
  function rigOf(tree) {
    const AT = {}, PARENT = {};
    const rot = ([a, b, c], [x, y, z]) => {
      const x1 = x * Math.cos(c) - y * Math.sin(c), y1 = x * Math.sin(c) + y * Math.cos(c);
      const x2 = x1 * Math.cos(b) + z * Math.sin(b), z2 = -x1 * Math.sin(b) + z * Math.cos(b);
      return [x2, y1 * Math.cos(a) - z2 * Math.sin(a), y1 * Math.sin(a) + z2 * Math.cos(a)];
    };
    const walk = (n, toWorld, parent, isRoot) => {
      const s = isRoot ? [1, 1, 1] : n.s || [1, 1, 1];
      const local = (v) => toWorld(add(rot(n.r, v.map((x, i) => x * s[i])), n.p));
      let p = parent;
      if (n.id) { AT[n.id] = local([0, 0, 0]); PARENT[n.id] = parent; p = n.id; }
      (n.c || []).forEach((c) => walk(c, local, p, false));
    };
    tree.forEach((n) => walk(n, (v) => v, null, true));
    return { AT, PARENT };
  }
  const RIGS = Object.fromEntries(Object.entries(CHARACTERS).filter(([, c]) => c.rig === 'quad').map(([k, c]) => [k, rigOf(c.parts)]));
  const api = { CHARACTERS, MATERIALS, PROPS, RIGS, rigOf, TAIL_JOINTS: 7, ORDER: ['bear1', 'bear2', 'bear3', 'cat1', 'cat2', 'cat3'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BEASTS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
