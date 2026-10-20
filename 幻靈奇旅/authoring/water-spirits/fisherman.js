// 釣魚郎（幻靈奇旅河道橋邊的 NPC）：Three.js 參數藍圖＋程序動作，與水系幻靈共用 builder.js
// 戴斗笠、白藍條紋上衣＋咖啡色背心、捲起的卡其短褲、雨靴；右手拿釣竿、腰間掛竹簍。高約 2.2。
(function (root) {
  const PI = Math.PI;
  const MATERIALS = {
    skin: { c: '#F6D3B5', rough: 0.55, sss: 0.4 },
    hair: { c: '#2A1E17', rough: 0.8 },
    straw: { c: '#D9B56A', rough: 0.85 },
    strawDark: { c: '#B08A43', rough: 0.85 },
    shirt: { c: '#F4F6F8', rough: 0.8 },
    stripe: { c: '#3D74B8', rough: 0.8 },
    vest: { c: '#7A5233', rough: 0.85 },
    shorts: { c: '#C9B48A', rough: 0.85 },
    boot: { c: '#2F5D4A', rough: 0.5, coat: 0.3 },
    rod: { c: '#6B4528', rough: 0.6 },
    line: { c: '#F2F2EE', rough: 0.4 },
    bobRed: { c: '#E2483E', rough: 0.4 },
    white: { c: '#FFFFFF', rough: 0.3 },
    eye: { c: '#1E1612', rough: 0.2, coat: 1 },
    mouth: { c: '#8E3A35', rough: 0.5 },
    blush: { c: '#F2A69C', rough: 0.8, opacity: 0.7 },
    basket: { c: '#C29A55', rough: 0.9 },
    shine: { c: '#FFFFFF', rough: 0.1, emit: 0.8 },
  };
  const E = (p, s, r, m) => ({ t: 'ell', p, s, r: r || [0, 0, 0], m });
  const T = (p, R, tube, m, o = {}) => ({ t: 'torus', p, R, tube, arc: o.arc || PI * 2, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const C = (p, rt, rb, h, m, o = {}) => ({ t: 'cyl', p, rt, rb, h, seg: o.seg || 20, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const G = (p, c, o = {}) => ({ t: 'g', p, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], c: [c].flat(Infinity), id: o.id });
  const joint = (id, at, parts) => G(at, [G([-at[0], -at[1], -at[2]], parts)], { id });
  const mirrorX = (node) => { const q = JSON.parse(JSON.stringify(node)); (function f(n) { n.p = [-n.p[0], n.p[1], n.p[2]]; n.r = [n.r[0], -n.r[1], -n.r[2]]; if (n.id) n.id = n.id.endsWith('L') ? n.id.slice(0, -1) + 'R' : n.id; (n.c || []).forEach(f); })(q); return q; };
  const sym = (n) => [n, mirrorX(n)];
  function seg(A, B, ra, rb, m) {
    const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], len = Math.hypot(...d), u = d.map((v) => v / len);
    return C([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], rb, ra, len, m, { r: [Math.atan2(u[2], u[1]), 0, -Math.asin(u[0])] });
  }
  const HY = 0.86;
  const head = joint('head', [0, 1.52, 0], [
    E([0, 1.78, 0.02], [0.27, 0.28, 0.26], 0, 'skin'),
    E([0, 1.86, -0.04], [0.27, 0.22, 0.25], 0, 'hair'),                                  // 短髮（斗笠下）
    sym(E([0.26, 1.75, 0.0], [0.04, 0.06, 0.035], 0, 'skin')),                          // 耳朵
    sym(G([0.09, 1.77, 0.262], [E([0, 0, 0], [0.035, 0.045, 0.02], 0, 'eye'), E([0.012, 0.016, 0.014], [0.012, 0.013, 0.006], 0, 'shine')])),
    sym(E([0.09, 1.845, 0.258], [0.05, 0.012, 0.012], [0, 0.3, 0.1], 'hair')),               // 眉毛
    E([0, 1.71, 0.265], [0.025, 0.02, 0.02], 0, 'skin'),                                  // 鼻
    G([0, 1.645, 0.248], [E([0, 0, 0], [0.06, 0.03, 0.015], 0, 'mouth'), E([0, 0.018, 0.006], [0.065, 0.016, 0.016], 0, 'skin')], { r: [-0.2, 0, 0] }),   // 笑口
    sym(E([0.16, 1.68, 0.212], [0.05, 0.03, 0.015], [0, 0.6, 0], 'blush')),
    // 斗笠：寬圓錐＋編織紋路＋頂端小圓頭；下巴繫繩
    C([0, 2.03, 0], 0.02, 0.5, 0.22, 'straw', { seg: 28 }),
    ...[0.18, 0.32, 0.45].map((r, i) => T([0, 2.11 - i * 0.065, 0], r, 0.008, 'strawDark', { r: [PI / 2, 0, 0] })),
    E([0, 2.15, 0], [0.04, 0.03, 0.04], 0, 'strawDark'),
    sym(seg([0.24, 1.92, 0.05], [0.12, 1.58, 0.12], 0.008, 0.008, 'strawDark')),
  ]);
  const arm = joint('upperArmL', [0.24, 1.4, 0], [
    E([0.24, 1.4, 0], [0.09, 0.09, 0.09], 0, 'shirt'),
    seg([0.24, 1.4, 0], [0.3, 1.18, 0.02], 0.075, 0.07, 'shirt'),
    T([0.3, 1.18, 0.02], 0.07, 0.012, 'stripe', { r: [PI / 2, 0, 0.2] }),
    joint('forearmL', [0.31, 1.15, 0.02], [
      seg([0.31, 1.15, 0.02], [0.33, 0.92, 0.07], 0.05, 0.045, 'skin'),
      E([0.335, 0.87, 0.08], [0.055, 0.06, 0.05], 0, 'skin'),
    ]),
  ]);
  const leg = joint('thighL', [0.1, HY, 0], [
    seg([0.1, HY, 0], [0.11, 0.55, 0], 0.11, 0.1, 'shorts'),
    T([0.11, 0.56, 0], 0.1, 0.018, 'shorts', { r: [PI / 2, 0, 0] }),                      // 捲起的褲管
    seg([0.11, 0.58, 0], [0.11, 0.42, 0], 0.06, 0.055, 'skin'),
    joint('shinL', [0.11, 0.42, 0], [
      seg([0.11, 0.42, 0], [0.11, 0.1, 0], 0.075, 0.08, 'boot'),
      E([0.11, 0.06, 0.05], [0.085, 0.06, 0.13], 0, 'boot'),
    ]),
  ]);
  // 釣竿（右手握著，竿尖往前上方），竿尖垂下釣線與紅白浮標
  const rod = G([0, 0, 0], [
    seg([-0.335, 0.87, 0.1], [-0.6, 2.3, 0.85], 0.028, 0.012, 'rod'),
    E([-0.335, 0.8, 0.08], [0.03, 0.08, 0.03], 0, 'rod'),
    T([-0.38, 1.0, 0.18], 0.05, 0.012, 'strawDark', { r: [0, 0.6, 0] }),                  // 捲線器
    seg([-0.6, 2.3, 0.85], [-0.62, 1.25, 0.95], 0.004, 0.004, 'line'),
    G([-0.62, 1.2, 0.95], [E([0, 0.025, 0], [0.04, 0.035, 0.04], 0, 'bobRed'), E([0, -0.02, 0], [0.04, 0.03, 0.04], 0, 'white')]),
  ]);
  // 右手臂：鏡射左手後，把釣竿掛在右前臂上（手動作時竿子跟著動）
  const armR = mirrorX(arm);
  (function put(n) { if (n.id === 'forearmR') n.c[0].c.push(rod); (n.c || []).forEach(put); })(armR);
  const chest = joint('chest', [0, 0.95, 0], [
    C([0, 1.17, 0], 0.22, 0.25, 0.48, 'shirt', { s: [1, 1, 0.82] }),
    ...[1.02, 1.12, 1.22, 1.32].map((y) => T([0, y, 0], 0.235, 0.012, 'stripe', { r: [PI / 2, 0, 0], s: [1, 0.82, 1] })),
    // 背心（前開）：兩片前襟＋後片
    ...[1, -1].map((k) => G([k * 0.13, 1.17, 0.13], [C([0, 0, 0], 0.11, 0.12, 0.46, 'vest', { s: [1, 1, 0.35] })], { r: [0, k * 0.5, 0] })),
    C([0, 1.17, -0.12], 0.22, 0.24, 0.46, 'vest', { s: [1, 1, 0.4] }),
    E([0, 1.42, 0], [0.13, 0.05, 0.12], 0, 'skin'),
    arm, armR,
    head,
  ]);
  const hips = joint('hips', [0, HY, 0], [
    E([0, 0.9, 0], [0.24, 0.16, 0.19], 0, 'shorts'),
    // 腰間竹簍
    G([0.27, 0.92, -0.05], [C([0, 0, 0], 0.11, 0.09, 0.2, 'basket', { seg: 12 }), T([0, 0.1, 0], 0.11, 0.012, 'strawDark', { r: [PI / 2, 0, 0] })]),
    sym(leg),
    chest,
  ]);
  const parts = [joint('root', [0, 0, 0], [hips])];

  const s = Math.sin, TAU = 2 * PI;
  const ACTIONS = {
    idle: { dur: 3, pose(n, t) { const a = (t / 3) * TAU;
      n.root.p = [0, 0.01 * s(a * 2), 0]; n.chest.r = [0.03 * s(a), 0.05 * s(a), 0]; n.head.r = [0.04 * s(a), 0.15 * s(a * 0.5), 0];
      n.upperArmR.r = [-0.55, 0, 0.1]; n.forearmR.r = [-0.5 + 0.05 * s(a * 2), 0, 0]; n.upperArmL.r = [0.05 * s(a), 0, 0.05]; } },
    move: { dur: 1.1, pose(n, t) { const a = (t / 1.1) * TAU;
      n.root.p = [0, 0.03 * Math.abs(s(a)), 0]; n.thighL.r = [0.45 * s(a), 0, 0]; n.thighR.r = [-0.45 * s(a), 0, 0]; n.shinL.r = [0.4 * Math.max(0, -s(a)), 0, 0]; n.shinR.r = [0.4 * Math.max(0, s(a)), 0, 0];
      n.upperArmL.r = [-0.35 * s(a), 0, 0.05]; n.upperArmR.r = [-0.55, 0, 0.1]; n.forearmR.r = [-0.5, 0, 0]; n.chest.r = [0.05, 0.08 * s(a), 0]; } },
    wave: { dur: 1.5, pose(n, t) { const a = (t / 1.5) * TAU;
      n.upperArmL.r = [0, 0, 2.4]; n.forearmL.r = [0, 0, 0.3 + 0.35 * s(a * 2)]; n.upperArmR.r = [-0.55, 0, 0.1]; n.forearmR.r = [-0.5, 0, 0]; n.head.r = [0, 0, 0.1 * s(a)]; } },
  };
  root.FISHERMAN = { id: 'fisher_lang', name: '釣魚郎', MATERIALS, parts, ACTIONS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
