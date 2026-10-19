// 手持物品與特效庫：每一件都是獨立模型，和角色分開設定，之後可整件替換成自己的模型。
//
// 座標約定（替換模型時請照這個擺）：
//   原點 = 握點（手掌握住的位置）
//   +Z  = 刀刃／劍身方向（手臂自然下垂時朝前；手臂前伸時朝上）
//   -Y  = 槍管方向（手臂前伸時朝前）；槍身在握把上方 +Z 側
//   球：原點 = 球心
//   特效（槍口火光）：原點 = 槍口，-Y = 噴發方向
//
// 每件物品：{ name, socket: 建議掛點, parts: 零件（與角色同格式）, muzzle?: 槍口相對握點位置 }
(function (root) {
  const PI = Math.PI;
  const E = (p, s, r, m) => ({ t: 'ell', p, s, r: r || [0, 0, 0], m });
  const T = (p, R, tube, m, o = {}) => ({ t: 'torus', p, R, tube, arc: o.arc || PI * 2, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const C = (p, rt, rb, h, m, o = {}) => ({ t: 'cyl', p, rt, rb, h, seg: o.seg || 32, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const B = (p, size, m, o = {}) => ({ t: 'box', p, size, bevel: o.bevel ?? 0.006, r: o.r || [0, 0, 0], s: [1, 1, 1], m });
  const ST = (p, points, ro, ri, depth, m, o = {}) => ({ t: 'star', p, points, ro, ri, depth, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m });
  const ALONG_Z = [PI / 2, 0, 0]; // 圓柱軸由 Y 轉到 Z

  const PROPS = {
    knife: {
      // 長刀：纏繩長柄、圓形刀鍔、略帶弧度的長刀身（約 0.85）
      name: '長刀', socket: 'propR',
      parts: [
        C([0, 0, -0.06], 0.019, 0.019, 0.22, 'leatherDark', { r: ALONG_Z }),
        [-0.15, -0.11, -0.07, -0.03, 0.01].map((z) => T([0, 0, z], 0.02, 0.005, 'wrap')),
        C([0, 0, -0.175], 0.022, 0.022, 0.02, 'gold', { r: ALONG_Z }),
        C([0, 0, 0.06], 0.05, 0.05, 0.01, 'gold', { r: ALONG_Z, s: [1, 1, 0.75] }),
        C([0, 0, 0.075], 0.022, 0.022, 0.02, 'gold', { r: ALONG_Z }),
        // 刀身分四段，逐段往刀背方向（+Y）彎，做出弧度
        B([0, 0.004, 0.25], [0.009, 0.034, 0.34], 'steel', { bevel: 0.003 }),
        B([0, 0.014, 0.49], [0.009, 0.032, 0.16], 'steel', { r: [-0.06, 0, 0], bevel: 0.003 }),
        B([0, 0.026, 0.64], [0.009, 0.03, 0.16], 'steel', { r: [-0.1, 0, 0], bevel: 0.003 }),
        B([0, 0.043, 0.78], [0.009, 0.027, 0.14], 'steel', { r: [-0.15, 0, 0], bevel: 0.003 }),
        C([0, 0.054, 0.88], 0, 0.016, 0.07, 'steel', { r: [PI / 2 - 0.18, 0, 0], s: [0.5, 1, 1] }),
        // 血槽：跟著每一段刀身的位置與角度，貼在刀背側（兩面都看得到，不會穿出刀身）
        [[0.25, 0.004, 0, 0.3], [0.49, 0.014, -0.06, 0.15], [0.64, 0.026, -0.1, 0.15], [0.775, 0.043, -0.15, 0.12]].map(([z, y, rx, len]) =>
          B([0, y + 0.007 * Math.cos(rx), z - 0.007 * Math.sin(rx)], [0.0096, 0.004, len], 'steelDark', { r: [rx, 0, 0], bevel: 0.001 })),
      ],
    },
    sword: {
      // 大劍：雙手長柄（0.36，可容兩隻手）、寬護手、厚重寬刃（長 1.3、寬 0.22）
      name: '大劍', socket: 'propR（左手握 -Z 方向的柄尾）', grip2: [0, 0, -0.16],
      parts: [
        C([0, 0, -0.1], 0.03, 0.03, 0.36, 'leather', { r: ALONG_Z }),
        [-0.24, -0.16, -0.08, 0.0].map((z) => T([0, 0, z], 0.031, 0.007, 'wrap')),
        E([0, 0, -0.31], [0.055, 0.055, 0.055], 0, 'gold'),
        B([0, 0, 0.1], [0.07, 0.42, 0.06], 'gold', { bevel: 0.015 }),
        E([0, 0, 0.1], [0.04, 0.04, 0.04], 0, 'gem'),
        B([0, 0, 0.78], [0.045, 0.22, 1.3], 'steel', { bevel: 0.01 }),
        B([0, 0, 0.7], [0.048, 0.035, 1.05], 'steelDark', { bevel: 0.004 }),
        C([0, 0, 1.5], 0, 0.11, 0.16, 'steel', { r: ALONG_Z, s: [0.4, 1, 1] }),
      ],
    },
    blade: {
      name: '短刀（雙刀用）', socket: 'propR / propL',
      parts: [
        C([0, 0, -0.01], 0.018, 0.018, 0.09, 'leatherDark', { r: ALONG_Z }),
        T([0, 0, 0.04], 0.027, 0.009, 'gold'),
        B([0, 0.007, 0.22], [0.009, 0.04, 0.33], 'steelBlue', { bevel: 0.004 }),
        C([0, 0.007, 0.405], 0, 0.02, 0.055, 'steelBlue', { r: ALONG_Z, s: [0.4, 1, 1] }),
      ],
    },
    gun: {
      name: '手槍（雙槍用）', socket: 'propR / propL', muzzle: [0, -0.21, 0.065],
      parts: [
        B([0, 0.01, -0.02], [0.03, 0.045, 0.1], 'gunGrip', { bevel: 0.007 }),
        B([0, -0.055, 0.058], [0.035, 0.19, 0.046], 'gunMetal', { bevel: 0.007 }),
        C([0, -0.165, 0.062], 0.011, 0.011, 0.045, 'steelDark'),
        T([0, -0.032, 0.018], 0.02, 0.005, 'gunMetal', { r: [0, PI / 2, 0] }),
      ],
    },
    ball: {
      name: '球', socket: 'ball',
      parts: [
        E([0, 0, 0], [0.065, 0.065, 0.065], 0, 'ball'),
        T([0, 0, 0], 0.065, 0.007, 'white', { r: [0, PI / 2, 0.4] }),
      ],
    },
    flash: {
      name: '槍口火光', socket: 'fxR / fxL',
      parts: [
        C([0, -0.06, 0], 0, 0.04, 0.11, 'flash'),
        ST([0, -0.005, 0], 6, 0.055, 0.022, 0.008, 'flash', { r: [PI / 2, 0, 0] }),
      ],
    },
  };
  const PROP_MATERIALS = {
    leather: { c: '#6A452F', rough: 0.7 },
    leatherDark: { c: '#4C3123', rough: 0.7 },
    gold: { c: '#D9AE4C', rough: 0.3, metal: 0.95 },
    steel: { c: '#D3D8DE', rough: 0.18, metal: 1 },
    steelDark: { c: '#7D848C', rough: 0.3, metal: 1 },
    steelBlue: { c: '#B9D2EA', rough: 0.15, metal: 1 },
    gunMetal: { c: '#3A3F46', rough: 0.35, metal: 0.8 },
    gunGrip: { c: '#5A3A28', rough: 0.6 },
    flash: { c: '#FFC24A', rough: 1, emit: 3 },
    ball: { c: '#E8573C', rough: 0.5, coat: 0.3 },
    white: { c: '#FAFAF7', rough: 0.4 },
    wrap: { c: '#2B2B33', rough: 0.9 },
    gem: { c: '#C3172C', rough: 0.05, coat: 1 },
  };

  for (const p of Object.values(PROPS)) p.parts = p.parts.flat(Infinity); // 允許零件清單巢狀
  // 碰撞形狀（武器穿透檢查用，座標同上）
  const cap = (a, b, r, grip) => ({ a, b, r, grip: !!grip });
  PROPS.knife.hit = [
    cap([0, 0, -0.175], [0, 0, 0.07], 0.03, 1), cap([0, -0.05, 0.06], [0, 0.05, 0.06], 0.02, 1),
    cap([0, 0.004, 0.09], [0, 0.026, 0.64], 0.02), cap([0, 0.026, 0.64], [0, 0.054, 0.9], 0.02),
  ];
  PROPS.sword.hit = [
    cap([0, 0, -0.31], [0, 0, 0.08], 0.035, 1), cap([0, -0.21, 0.1], [0, 0.21, 0.1], 0.04, 1),
    cap([0, 0, 0.14], [0, 0, 1.42], 0.03), cap([0, -0.1, 0.14], [0, -0.1, 1.38], 0.015), cap([0, 0.1, 0.14], [0, 0.1, 1.38], 0.015),
    cap([0, 0, 1.42], [0, 0, 1.56], 0.03),
  ];
  PROPS.blade.hit = [
    cap([0, 0, -0.1], [0, 0, 0.04], 0.028, 1), cap([0, -0.03, 0.04], [0, 0.03, 0.04], 0.015, 1),
    cap([0, 0.007, 0.07], [0, 0.007, 0.43], 0.02),
  ];
  PROPS.gun.hit = [
    cap([0, 0.012, -0.07], [0, 0.012, 0.03], 0.035, 1), cap([0, -0.14, 0.06], [0, 0.03, 0.06], 0.035, 1), // 槍身疊在手腕上方，不算穿到自己前臂
  ];
  const api = { PROPS, PROP_MATERIALS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root.KID_BLUEPRINT || (root.KID_BLUEPRINT = {}), api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
