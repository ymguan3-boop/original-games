// 小男孩的 19 個動作：姿勢函式 → 24fps 逐格烘焙。Three.js 與 Blender 讀同一份數值。
// 旋轉角為父層座標的尤拉角 XYZ：
//   上臂 rx 負 = 往前抬；rz 正（右手）= 往外側抬；前臂 rx 負 = 彎肘
//   大腿 rx 負 = 往前抬；小腿 rx 正 = 彎膝；胸／頭 rx 正 = 前傾／低頭；ry = 轉身
// 左側用「右側寫法」填寫後自動鏡射（[rx, -ry, -rz]）。
(function (root) {
  const { SK, AT, LOCALP, OFF, ON, PI, CONTACT } = root.__KID_PARTS__;
  const HY = SK.hips[1];                          // 站立時髖部高度
  const BALL_AT = AT.ball;                        // 球掛點的靜止位置（右手握點前方）
  // 著地點（模型提供，隨身形比例更新）：鞋底；翻滾時再加上頭、背、屁股、膝蓋
  const FOOT = CONTACT.foot;
  const BODY_PTS = CONTACT.body;
  const FPS = 24;
  const TAU = 2 * PI;

  // ---- 數學 ----------------------------------------------------------------
  const PARENT = {
    root: null, hips: 'root', chest: 'hips', head: 'chest', ball: 'root',
    upperArmR: 'chest', forearmR: 'upperArmR', handR: 'forearmR',
    upperArmL: 'chest', forearmL: 'upperArmL', handL: 'forearmL',
    thighR: 'hips', shinR: 'thighR', footR: 'shinR', thighL: 'hips', shinL: 'thighL', footL: 'shinL',
  };
  function rotXYZ([a, b, c], [x, y, z]) {
    let x1 = x * Math.cos(c) - y * Math.sin(c), y1 = x * Math.sin(c) + y * Math.cos(c);
    let x2 = x1 * Math.cos(b) + z * Math.sin(b), z2 = -x1 * Math.sin(b) + z * Math.cos(b);
    return [x2, y1 * Math.cos(a) - z2 * Math.sin(a), y1 * Math.sin(a) + z2 * Math.cos(a)];
  }
  // 正向運動學：把關節 node 底下的世界座標點 pt（靜止姿勢）轉成目前姿勢的世界座標
  function fk(pose, node, pt) {
    let v = pt.slice();
    for (let j = node; j; j = PARENT[j]) {
      const tr = pose[j] || {};
      const at = AT[j], p = tr.p || at, r = tr.r || [0, 0, 0], s = tr.s || [1, 1, 1];
      v = rotXYZ(r, [(v[0] - at[0]) * s[0], (v[1] - at[1]) * s[1], (v[2] - at[2]) * s[2]]);
      v = [v[0] + p[0], v[1] + p[1], v[2] + p[2]];
    }
    return v;
  }
  const mir = (r) => [r[0], -r[1], -r[2]];
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const pulse = (u, t0, w) => (u >= t0 && u < t0 + w ? 1 - (u - t0) / w : 0);
  const hit = (u, t0, w = 0.07) => u >= t0 && u < t0 + w;

  // ---- 姿勢 ----------------------------------------------------------------
  // S({...}) 用簡寫建立姿勢。撰寫慣例：「右側寫法」= 把該肢體當成在 +X 那一側來填
  // （上臂 rz 正 = 往外抬）。角色的右側實際在 -X，所以展開時 R 系列與軀幹鏡射、L 系列照填。
  const KEYMAP = {
    hp: ['hips', 'p', 'pos'], hr: ['hips', 'r', 1], rt: ['root', 'r', 1], ch: ['chest', 'r', 1], hd: ['head', 'r', 1],
    uaR: ['upperArmR', 'r', 1], faR: ['forearmR', 'r', 1], hR: ['handR', 'r', 1],
    uaL: ['upperArmL', 'r'], faL: ['forearmL', 'r'], hL: ['handL', 'r'],
    thR: ['thighR', 'r', 1], shR: ['shinR', 'r', 1], ftR: ['footR', 'r', 1],
    thL: ['thighL', 'r'], shL: ['shinL', 'r'], ftL: ['footL', 'r'],
  };
  const REST = {
    hp: [0, HY, 0], hr: [0, 0, 0], rt: [0, 0, 0], ch: [0, 0, 0], hd: [0, 0, 0],
    uaR: [0, 0, 0.07], faR: [-0.15, 0, 0], hR: [0, 0, 0], uaL: [0, 0, 0.07], faL: [-0.15, 0, 0], hL: [0, 0, 0],
    thR: [0, 0, 0], shR: [0, 0, 0], ftR: [0, 0, 0], thL: [0, 0, 0], shL: [0, 0, 0], ftL: [0, 0, 0],
  };
  const S = (o = {}) => Object.assign({}, REST, o); // 簡寫姿勢
  function expand(sp) {
    const pose = {};
    for (const [k, [node, key, m]] of Object.entries(KEYMAP)) {
      const v = sp[k];
      (pose[node] ||= {})[key] = m === 'pos' ? [-v[0], v[1], v[2]] : m ? mir(v) : v.slice();
    }
    return pose;
  }
  // 關鍵姿勢內插：keys = [[u, 簡寫姿勢], ...]，段內 smoothstep
  function K(u, keys) {
    if (u <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [u0, a] = keys[i], [u1, b] = keys[i + 1];
      if (u <= u1) {
        const t = ease((u - u0) / (u1 - u0));
        const o = {};
        for (const k of Object.keys(REST)) o[k] = (a[k] || REST[k]).map((v, j) => lerp(v, (b[k] || REST[k])[j], t));
        return o;
      }
    }
    return keys[keys.length - 1][1];
  }
  const add = (sp, k, d) => { sp[k] = sp[k].map((v, i) => v + d[i]); return sp; };

  // ---- 表情與道具 ----------------------------------------------------------
  const EXPR = {
    normal: { eye: 'eyeOpen', mouth: 'mouthSmile', brow: [0, 0, 0], by: 0 },
    excited: { eye: 'eyeOpen', mouth: 'mouthGrin', brow: [0, 0, 0], by: 0.008 },
    happy: { eye: 'eyeHappy', mouth: 'mouthGrin', brow: [0, 0, 0], by: 0.016 },
    sad: { eye: 'eyeSad', mouth: 'mouthSad', brow: [0, 0, -0.35], by: -0.004 },
    cry: { eye: 'eyeShut', mouth: 'mouthSad', brow: [0, 0, -0.42], by: -0.004 },
    determined: { eye: 'eyeOpen', mouth: 'mouthLine', brow: [0, 0, 0.32], by: -0.008, eyeY: 0.8 },
    shout: { eye: 'eyeOpen', mouth: 'mouthO', brow: [0, 0, 0.38], by: -0.008, eyeY: 0.85, mouthS: [1.5, 1.35, 1] },
    hurt: { eye: 'eyeShut', mouth: 'mouthO', brow: [0, 0, -0.3], by: 0 },
  };
  const EYES = ['eyeOpen', 'eyeHappy', 'eyeSad', 'eyeShut'];
  const MOUTHS = ['mouthSmile', 'mouthGrin', 'mouthSad', 'mouthO', 'mouthLine'];
  function face(name, blink = 1) {
    const e = EXPR[name], o = {};
    EYES.forEach((k) => {
      const s = k === e.eye ? (k === 'eyeOpen' ? [1, (e.eyeY || 1) * blink, 1] : ON) : OFF;
      o[k + 'R'] = { s }; o[k + 'L'] = { s };
    });
    MOUTHS.forEach((k) => { o[k] = { s: k === e.mouth ? (e.mouthS || ON) : OFF }; });
    for (const id of ['browL', 'browR']) {
      const b = AT[id];
      o[id] = { p: [b[0], b[1] + e.by, b[2]], r: b[0] > 0 ? e.brow : mir(e.brow) };
    }
    return o;
  }
  // 特效掛點的開關（槍口火光）；手持物品不需要軌道，由動作的 hold 決定掛什麼
  function props(_unused, flash = {}) {
    const k = (v) => (v ? [v, v, v] : OFF);
    return { fxR: { s: k(flash.R) }, fxL: { s: k(flash.L) } };
  }
  const blinkAt = (u, ...ts) => (ts.some((t) => Math.abs(u - t) < 0.02) ? 0.1 : 1);

  // ---- 共用站姿 ------------------------------------------------------------
  const STANCE = { thR: [-0.3, 0, 0.12], shR: [0.45, 0, 0], thL: [0.25, 0, 0.14], shL: [0.35, 0, 0] };
  const breathe = (sp, u, amp = 0.012) => add(sp, 'hp', [0, amp * Math.sin(u * TAU), 0]);

  // 雙手握大劍：右手指向角度 c（水平掃）時，算出左手要轉多少才會碰到握點
  function twoHandL(rx, cR) {
    const reach = 0.55, sx = 0.3;
    const gx = sx + reach * Math.sin(cR);
    const sL = Math.max(-1, Math.min(1, (sx - gx) / reach)); // 左肩在 -sx，右側寫法下 x 取反
    return [rx, 0, -Math.asin(sL)];
  }

  // ---- 動作定義 ------------------------------------------------------------
  // 每個 fn(u) 回傳 { sp: 簡寫姿勢, face, props, air?, noGround?, flat? }
  const A = {};

  A.idle = (u) => {
    const a = u * TAU;
    const sp = S({
      ch: [0.02 * Math.sin(a), 0.04 * Math.sin(a), 0], hd: [0.03 * Math.sin(a + 1), 0.18 * Math.sin(a), 0.04 * Math.sin(2 * a)],
      uaR: [0.05 * Math.sin(a), 0, 0.08], uaL: [-0.05 * Math.sin(a), 0, 0.08],
    });
    return { sp: breathe(sp, u, 0.006), face: face('normal', blinkAt(u, 0.3, 0.75)) };
  };

  A.walk = (u) => {
    const a = u * TAU, s = Math.sin(a), c = Math.cos(a);
    const thR = -0.5 * s, thL = 0.5 * s;
    const shR = 0.12 + 0.8 * Math.max(0, c), shL = 0.12 + 0.8 * Math.max(0, -c);
    return {
      sp: S({
        hr: [0, 0.12 * s, 0.03 * s], ch: [0.05, -0.16 * s, -0.02 * s], hd: [0, 0.1 * s, 0.02 * s],
        uaR: [0.5 * s, 0, 0.08], faR: [-0.3 - 0.2 * Math.max(0, -s), 0, 0], uaL: [-0.5 * s, 0, 0.08], faL: [-0.3 - 0.2 * Math.max(0, s), 0, 0],
        thR: [thR, 0, 0], shR: [shR, 0, 0], thL: [thL, 0, 0], shL: [shL, 0, 0],
      }),
      face: face('normal', blinkAt(u, 0.6)),
    };
  };

  A.run = (u) => {
    const a = u * TAU, s = Math.sin(a), c = Math.cos(a);
    return {
      sp: S({
        hr: [0.05, 0.18 * s, 0], ch: [0.25, -0.22 * s, 0], hd: [-0.18, 0.12 * s, 0],
        uaR: [0.95 * s, 0, 0.14], faR: [-1.5, 0, 0], uaL: [-0.95 * s, 0, 0.14], faL: [-1.5, 0, 0],
        thR: [-0.95 * s, 0, 0], shR: [0.35 + 1.4 * Math.max(0, c), 0, 0], thL: [0.95 * s, 0, 0], shL: [0.35 + 1.4 * Math.max(0, -c), 0, 0],
      }),
      air: 0.07 * Math.abs(c), flat: false,
      face: face('excited'),
    };
  };

  A.wave = (u) => {
    const a = u * TAU;
    return {
      sp: breathe(S({
        ch: [0, -0.06, -0.06], hd: [0, 0.06, 0.13 + 0.03 * Math.sin(2 * a)],
        uaR: [-0.25, 0, 2.55], faR: [-0.25, 0, 0.5 * Math.sin(2 * a)], hR: [0, 0, 0.25 * Math.sin(2 * a)],
        uaL: [0.03 * Math.sin(a), 0, 0.08],
      }), u, 0.01),
      face: face('excited', blinkAt(u, 0.85)),
    };
  };

  // 右手丟球：蓄力（球在手上）→ 0.48 出手 → 球飛出 → 0.92 新球回到手上
  const THROW = { frames: 40, release: 0.48 };
  A.throw = (u) => {
    const sp = K(u, [
      [0, S({ uaR: [0, 0, 0.1], faR: [-0.5, 0, 0] })],
      [0.3, S({ hr: [0, 0.35, 0], ch: [-0.1, 0.55, 0], hd: [0, -0.4, 0], uaR: [0.4, 0, 2.0], faR: [-1.9, 0, 0], uaL: [-1.3, 0, -0.2], faL: [-0.4, 0, 0],
        thR: [0.2, 0, 0.05], shR: [0.2, 0, 0], thL: [-0.35, 0, 0.05], shL: [0.25, 0, 0] })],
      [0.48, S({ hr: [0, -0.3, 0], ch: [0.25, -0.45, 0], hd: [-0.1, 0.3, 0], uaR: [-2.0, 0, 0.5], faR: [-0.3, 0, 0], hR: [0.4, 0, 0], uaL: [-0.2, 0, 0.3], faL: [-0.8, 0, 0],
        thR: [0.3, 0, 0.05], shR: [0.25, 0, 0], thL: [-0.45, 0, 0.05], shL: [0.35, 0, 0] })],
      [0.62, S({ hr: [0, -0.4, 0], ch: [0.4, -0.6, 0], hd: [0, 0.4, 0], uaR: [-0.6, 0, -0.3], faR: [-0.5, 0, 0], uaL: [0.2, 0, 0.3], faL: [-0.6, 0, 0],
        thR: [0.35, 0, 0.05], shR: [0.4, 0, 0], thL: [-0.45, 0, 0.05], shL: [0.35, 0, 0] })],
      [0.85, S({ uaR: [0, 0, 0.1], faR: [-0.5, 0, 0] })],
      [1, S({ uaR: [0, 0, 0.1], faR: [-0.5, 0, 0] })],
    ]);
    return { sp, face: face(u < 0.45 ? 'determined' : u < 0.85 ? 'excited' : 'normal'), ballThrow: true };
  };

  // 往前翻滾：蹲 → 縮成一團向前滾一圈（髖部轉 2π）→ 起身
  // 往前翻滾：雙手前伸 → 身體前傾 → 半蹲 → 往前跳 → 手撐地低頭 → 滾一圈 → 蹲起 → 站好
  A.roll = (u) => {
    const reach = { ch: [0.35, 0, 0], hd: [0.05, 0, 0], uaR: [-1.55, 0, 0.05], faR: [-0.1, 0, 0], uaL: [-1.55, 0, 0.05], faL: [-0.1, 0, 0] };
    const squat = { hr: [0.25, 0, 0], ch: [0.55, 0, 0], hd: [0.1, 0, 0], uaR: [-1.3, 0, 0.05], faR: [-0.1, 0, 0], uaL: [-1.3, 0, 0.05], faL: [-0.1, 0, 0],
      thR: [-1.15, 0, 0.08], shR: [1.6, 0, 0], thL: [-1.15, 0, 0.08], shL: [1.6, 0, 0] };
    const dive = { hr: [0.75, 0, 0], ch: [0.3, 0, 0], hd: [0.2, 0, 0], uaR: [-1.2, 0, 0.05], faR: [-0.05, 0, 0], uaL: [-1.2, 0, 0.05], faL: [-0.05, 0, 0],
      thR: [0.15, 0, 0.05], shR: [0.2, 0, 0], thL: [0.15, 0, 0.05], shL: [0.2, 0, 0] };
    const plant = { hr: [1.35, 0, 0], ch: [0.7, 0, 0], hd: [1.0, 0, 0], uaR: [-1.0, 0, 0.1], faR: [-1.0, 0, 0], uaL: [-1.0, 0, 0.1], faL: [-1.0, 0, 0],
      thR: [-0.9, 0, 0.08], shR: [1.2, 0, 0], thL: [-0.9, 0, 0.08], shL: [1.2, 0, 0] };
    const tuck = { ch: [0.85, 0, 0], hd: [0.9, 0, 0], uaR: [-1.2, 0, -0.15], faR: [-1.7, 0, 0], uaL: [-1.2, 0, -0.15], faL: [-1.7, 0, 0],
      thR: [-2.1, 0, 0.1], shR: [2.4, 0, 0], ftR: [0.5, 0, 0], thL: [-2.1, 0, 0.1], shL: [2.4, 0, 0], ftL: [0.5, 0, 0] };
    const crouch = { ch: [0.55, 0, 0], hd: [0.3, 0, 0], uaR: [-1.3, 0, 0.15], faR: [-0.3, 0, 0], uaL: [-1.3, 0, 0.15], faL: [-0.3, 0, 0],
      thR: [-1.4, 0, 0.08], shR: [2.1, 0, 0], thL: [-1.4, 0, 0.08], shL: [2.1, 0, 0] };
    const at = (o, z, rx) => S(Object.assign({}, o, { hp: [0, HY, z], hr: [rx, 0, 0] }));
    const sp = K(u, [
      [0, at({}, -0.6, 0)],
      [0.12, at(reach, -0.6, 0)],
      [0.24, at(squat, -0.6, 0.25)],
      [0.32, at(dive, -0.35, 0.75)],
      [0.4, at(plant, -0.05, 1.35)],
      [0.52, at(tuck, 0.2, PI)],
      [0.64, at(tuck, 0.45, 2 * PI - 0.7)],
      [0.76, at(crouch, 0.6, 2 * PI)],
      [0.9, S({ hp: [0, HY, 0.62], hr: [2 * PI, 0, 0], uaR: [-0.3, 0, 1.2], uaL: [-0.3, 0, 1.2] })],
      [1, S({ hp: [0, HY, 0.62], hr: [2 * PI, 0, 0] })],
    ]);
    // 半蹲後往前跳（騰空），其餘時間以身體最低點（腳／頭／背／屁股）著地
    const air = u > 0.25 && u < 0.4 ? 0.22 * Math.sin(((u - 0.25) / 0.15) * PI) : 0;
    return { sp, air, flat: u < 0.26 || u > 0.74, groundPts: BODY_PTS, face: face(u < 0.76 ? 'determined' : 'happy') };
  };

  // 歡呼 1：蹲下 → 雙手高舉跳起 → 落地
  A.cheer1 = (u) => {
    const up = { uaR: [-0.3, 0, 2.75], faR: [-0.1, 0, 0], hR: [0, PI, 0], uaL: [-0.3, 0, 2.75], faL: [-0.1, 0, 0], hL: [0, PI, 0] };   // 手腕轉半圈：掌心朝內（側舉時手掌會被帶成朝外）
    const sp = K(u, [
      [0, S(Object.assign({}, up, { thR: [-0.2, 0, 0], shR: [0.35, 0, 0], thL: [-0.2, 0, 0], shL: [0.35, 0, 0] }))],
      [0.22, S({ ch: [0.3, 0, 0], hd: [0.1, 0, 0], uaR: [0.7, 0, 0.25], faR: [-0.4, 0, 0], uaL: [0.7, 0, 0.25], faL: [-0.4, 0, 0], thR: [-0.9, 0, 0.05], shR: [1.5, 0, 0], thL: [-0.9, 0, 0.05], shL: [1.5, 0, 0] })],
      [0.45, S(Object.assign({}, up, { ch: [-0.15, 0, 0], hd: [-0.2, 0, 0], thR: [-0.15, 0, 0.05], shR: [0.6, 0, 0], thL: [-0.15, 0, 0.05], shL: [0.6, 0, 0] }))],
      [0.68, S(Object.assign({}, up, { ch: [0.15, 0, 0], thR: [-0.7, 0, 0.05], shR: [1.2, 0, 0], thL: [-0.7, 0, 0.05], shL: [1.2, 0, 0] }))],
      [1, S(Object.assign({}, up, { thR: [-0.2, 0, 0], shR: [0.35, 0, 0], thL: [-0.2, 0, 0], shL: [0.35, 0, 0] }))],
    ]);
    const air = u > 0.25 && u < 0.66 ? 0.42 * Math.sin(((u - 0.25) / 0.41) * PI) : 0;
    // 手臂由 IK 決定（胸口座標）：舉高時雙拳在頭的兩側上方（手臂短、頭大，搆不到頭頂正上方），手肘朝外、前臂往內彎向頭；掌心朝內、拳頭朝上。
    // 蹲下蓄力時雙手往後下方擺。w = 舉高的程度
    const w = K(u, [[0, { hp: [1, 0, 0] }], [0.22, { hp: [0, 0, 0] }], [0.45, { hp: [1, 0, 0] }], [1, { hp: [1, 0, 0] }]]).hp[0];
    const mix = (a, b) => a.map((v, i) => v + (b[i] - v) * w);
    const arms = ['L', 'R'].map((sd) => {
      const x = sd === 'L' ? 1 : -1;
      return [sd, mix([x * 0.33, 0.95, -0.16], [x * 0.4, 1.8, 0.06]), m3.mul(m3.axis([0, 0, 1], x * 0.4 * w), m3.axis([1, 0, 0], PI * w))];   // 拳頭朝上並往頭的方向傾
    });
    return { sp, air, face: face('happy'), armIK: arms };
  };

  // 歡呼 2：右手握拳往上連續揮動、左拳在胸前、膝蓋彈跳點頭
  A.cheer2 = (u) => {
    const a = u * TAU, p = Math.sin(2 * a);
    const sp = S({
      ch: [-0.1, 0.12, 0], hd: [-0.12 + 0.1 * p, 0.1, 0.05],
      uaR: [-2.3 + 0.35 * p, 0, 0.35], faR: [-1.2 + 0.5 * p, 0, 0], hR: [0, 0, 0],
      uaL: [-0.5, 0, -0.15], faL: [-2.0, 0, 0],
      thR: [-0.25 - 0.12 * p, 0, 0.08], shR: [0.45 + 0.2 * p, 0, 0], thL: [-0.25 - 0.12 * p, 0, 0.08], shL: [0.45 + 0.2 * p, 0, 0],
    });
    return { sp, face: face('happy') };
  };

  // 失落 1：垂頭垮肩、手無力下垂、慢慢嘆氣，邊垂著頭邊無奈地搖頭（左右搖兩趟），右腳輕踢地
  A.sad1 = (u) => {
    const a = u * TAU, s = Math.sin(a);
    const shake = 0.38 * Math.sin(2 * a) * (0.6 + 0.4 * Math.cos(a));   // 搖頭（頭繞自己的脖子軸左右轉）
    const sp = S({
      hr: [0.05, 0, 0], ch: [0.38 + 0.04 * s, 0.06 * Math.sin(2 * a), 0], hd: [0.5 + 0.05 * Math.abs(Math.sin(2 * a)), shake, 0.06 * Math.sin(2 * a)],
      uaR: [0.15, 0, -0.02], faR: [-0.05, 0, 0], uaL: [0.15, 0, -0.02], faL: [-0.05, 0, 0],
      thR: [-0.2 * Math.max(0, Math.sin(2 * a)), 0, 0], shR: [0.25 * Math.max(0, Math.sin(2 * a)), 0, 0],
    });
    return { sp: breathe(sp, u, 0.012), face: face('sad', blinkAt(u, 0.5)) };
  };

  // 失落 2：坐在地上抱膝、頭埋在膝蓋上輕輕搖晃
  A.sad2 = (u) => {
    const a = u * TAU, s = Math.sin(a);
    const sp = S({
      // 坐在地上、膝蓋拱起靠近胸口（大腿往上約 45°、小腿往前下方踩地），上身前傾把臉埋向膝蓋
      hr: [-0.35 + 0.03 * s, 0, 0], ch: [0.6 + 0.04 * s, 0, 0], hd: [0.5 + 0.05 * Math.sin(a + 1), 0.08 * s, 0],
      uaR: [-0.95, 0, -0.3], faR: [-1.0, 0, 0], uaL: [-0.95, 0, -0.3], faL: [-1.0, 0, 0],
      thR: [-2.0, 0, 0.1], shR: [2.0, 0, 0], thL: [-2.0, 0, 0.1], shL: [2.0, 0, 0],
    });
    return { sp, face: face('cry'), groundPts: [CONTACT.butt], hug: true }; // 屁股貼地；hug = 雙手環抱小腿
  };

  // ---- 武器：單刀 --------------------------------------------------------
  const KNIFE_READY = { hr: [0, -0.2, 0], ch: [0.1, -0.35, 0], uaR: [-0.9, 0, 0.25], faR: [-0.9, 0, 0], hR: [1.0, 0, 0], uaL: [-1.1, 0, -0.25], faL: [-1.2, 0, 0], ...STANCE };
  A.knifeReady = (u) => ({ sp: breathe(S(KNIFE_READY), u, 0.015), face: face('determined', blinkAt(u, 0.7)), props: props(['knifeR']) });
  A.knifeCombo = (u) => {
    const R = S(KNIFE_READY);
    const sp = K(u, [
      [0, R],
      [0.08, S({ ...KNIFE_READY, ch: [0.1, 0.3, 0], uaR: [-1.5, 0, 1.3], faR: [-0.1, 0, 0], hR: [1.5, 0, 0] })],
      [0.2, S({ ...KNIFE_READY, ch: [0.15, -0.55, 0], uaR: [-1.5, 0, -0.75], faR: [-0.1, 0, 0], hR: [1.5, 0, 0] })],
      [0.3, S({ ...KNIFE_READY, ch: [0.15, -0.5, 0], uaR: [-1.45, 0, -0.6], faR: [-0.2, 0, 0], hR: [1.5, 0, 0] })],
      [0.42, S({ ...KNIFE_READY, ch: [0.1, 0.4, 0], uaR: [-1.45, 0, 1.4], faR: [-0.1, 0, 0], hR: [1.5, 0, 0] })],
      [0.52, S({ ...KNIFE_READY, hp: [0, HY, -0.05], ch: [0.0, 0.4, 0], uaR: [-0.6, 0, 0.4], faR: [-1.8, 0, 0], hR: [0.9, 0, 0] })],
      [0.62, S({ ...KNIFE_READY, hp: [0, HY, 0.2], ch: [0.25, -0.5, 0], uaR: [-1.55, 0, 0.05], faR: [-0.05, 0, 0], hR: [1.6, 0, 0],
        thR: [-0.75, 0, 0.12], shR: [0.65, 0, 0], thL: [0.45, 0, 0.14], shL: [0.2, 0, 0] })],
      [0.8, S({ ...KNIFE_READY, hp: [0, HY, 0.2], ch: [0.25, -0.5, 0], uaR: [-1.55, 0, 0.05], faR: [-0.05, 0, 0], hR: [1.6, 0, 0],
        thR: [-0.75, 0, 0.12], shR: [0.65, 0, 0], thL: [0.45, 0, 0.14], shL: [0.2, 0, 0] })],
      [1, R],
    ]);
    const shouting = hit(u, 0.1, 0.12) || hit(u, 0.33, 0.1) || hit(u, 0.55, 0.12);
    return { sp, face: face(shouting ? 'shout' : 'determined'), props: props(['knifeR']) };
  };

  // ---- 武器：大劍（雙手） ------------------------------------------------
  const SWORD_READY = { hr: [0, -0.15, 0], ch: [0.08, -0.15, 0], uaR: [-0.9, 0, -0.45], faR: [-0.7, 0, 0], hR: [0.6, 0, 0], uaL: [-0.9, 0, -0.45], faL: [-0.7, 0, 0], ...STANCE };
  A.swordReady = (u) => ({ sp: breathe(S(SWORD_READY), u, 0.015), face: face('determined', blinkAt(u, 0.4)), props: props(['swordR']), twoHand: true });
  // 大劍三連擊：直接指定「劍」的位置與朝向（雙手中心 H、劍尖方向 d、刃口方向 e），再由雙臂 IK 算手臂角度。
  // 座標用「胸口座標系」：原點在胸口、+Z = 胸口正前方、+X = 胸口左邊（站直時就等於世界座標）。
  // 身體扭轉時劍跟著胸口轉，雙手永遠在胸前搆得到的範圍；橫掃的世界轉動 = 身體扭轉 + 劍在胸前轉動。
  // 比例限制（手臂可及約 0.55、肩高 1.3、頭頂 2.05）決定了姿勢：
  //   ‧ 高舉：身體太矮，雙手不可能在頭頂正上方，所以劍舉在右肩上方、劍身往右後斜出，從頭的外側經過
  //   ‧ 劈下：雙手在腰前、劍尖指向前下方但不碰地
  //   ‧ 橫掃：雙手在胸前，劍水平地從胸口左前方掃到右前方
  //   ‧ 上撈：劍從低位往左前上方撈起
  const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const SW = (H, d, e) => ({ H, d: unit(d), e: unit(e) });
  const sweepKey = (phi, hx) => SW([hx, 1.16, 0.46], [Math.cos(phi), 0, Math.sin(phi)], [-Math.sin(phi), 0, Math.cos(phi)]);   // 劍水平，朝向角 phi（從 +X 往 +Z 轉）
  const SWORD_KEYS = [
    [0.00, SW([0.04, 1.05, 0.42], [0.13, 0.79, 0.6], [1, 0, 0])],
    [0.10, SW([-0.12, 1.28, 0.32], [-0.55, 0.75, -0.37], [1, -0.25, 0.25])],          // 高舉（雙手在右肩前方，劍往右後斜出，從頭的右側外面經過；護手水平，不戳向臉）
    [0.20, SW([0.0, 1.25, 0.46], [0.02, -0.06, 1.0], [0, -1, -0.06])],              // 劈下（胸口前傾，所以胸口座標裡劍幾乎水平，世界裡劍尖指向前下方、不碰地）
    [0.32, SW([0.0, 1.22, 0.48], [0.04, -0.08, 1.0], [0, -1, -0.08])],
    [0.42, sweepKey(2.37, -0.1)], [0.465, sweepKey(1.6, -0.05)], [0.51, sweepKey(1.1, 0.03)], [0.55, sweepKey(0.67, 0.1)],       // 橫掃（正手：胸口座標裡由前右掃到前左）
    [0.62, SW([0.0, 0.95, 0.5], [0.15, -0.12, 0.98], [0, 1, -0.1])],                // 低位蓄力
    [0.71, SW([0.0, 1.36, 0.46], [0.0, 1.0, 0.08], [0, 0.08, -1])],                 // 雙手把劍直直舉過頭（雙手在臉前、劍身在臉前方往上，劍尖高過頭頂）
    [0.79, SW([0.0, 1.4, 0.45], [0.0, 0.97, -0.22], [0, -0.22, -0.97])],             // 跳到最高點，劍微微往後蓄力（劍身從頭頂上方經過，不碰頭）
    [0.875, SW([0.0, 1.15, 0.5], [0.0, 0.06, 1.0], [0, 1.0, -0.06])],           // 落地劈下：劍尖砸到身前地面（地震）
    [0.94, SW([0.0, 1.14, 0.5], [0.0, 0.05, 1.0], [0, 1.0, -0.05])],
    [1.00, SW([0.04, 1.05, 0.42], [0.13, 0.79, 0.6], [1, 0, 0])],
  ];
  const swordAt = (u) => {
    let i = 0;
    while (i < SWORD_KEYS.length - 2 && u > SWORD_KEYS[i + 1][0]) i++;
    const [u0, p] = SWORD_KEYS[i], [u1, q] = SWORD_KEYS[i + 1];
    const t = ease(Math.min(1, Math.max(0, (u - u0) / (u1 - u0))));
    const mix = (x, y) => x.map((v, j) => v + (y[j] - v) * t);
    return { H: mix(p.H, q.H), d: unit(mix(p.d, q.d)), e: unit(mix(p.e, q.e)) };
  };
  A.swordCombo = (u) => {
    const low = { thR: [-0.55, 0, 0.14], shR: [0.9, 0, 0], thL: [0.05, 0, 0.16], shL: [0.75, 0, 0] };
    const B_ = (o) => S({ ...STANCE, hr: [0, -0.15, 0], ch: [0.08, -0.15, 0], ...o });   // 身體關鍵姿勢（手臂由 IK 決定，這裡不填）。注意：ry 為正 = 身體向右轉
    const sp = K(u, [
      [0, B_({})],
      [0.1, B_({ ch: [-0.15, 0.5, 0], hr: [0, 0.3, 0] })],      // 高舉：身體向右轉（寫正值 = 實際向右）
      [0.22, B_({ ...low, ch: [0.35, -0.1, 0] })],
      [0.32, B_({ ...low, ch: [0.35, -0.1, 0] })],
      [0.42, B_({ hr: [0, 0.5, 0], ch: [0.1, 0.6, 0] })],
      [0.55, B_({ hr: [0, -0.5, 0], ch: [0.1, -0.7, 0] })],
      [0.62, B_({ ...low, ch: [0.3, 0, 0] })],                                                                     // 蹲低蓄力
      [0.71, B_({ ch: [-0.05, 0, 0], hd: [-0.15, 0, 0], thR: [-0.3, 0, 0.1], shR: [0.5, 0, 0], thL: [-0.3, 0, 0.1], shL: [0.5, 0, 0] })],   // 起跳、舉劍
      [0.79, B_({ ch: [-0.08, 0, 0], hd: [-0.2, 0, 0], thR: [-0.7, 0, 0.1], shR: [1.1, 0, 0], thL: [-0.7, 0, 0.1], shL: [1.1, 0, 0] })],   // 最高點收腿
      [0.875, B_({ ch: [0.5, 0, 0], hd: [0.1, 0, 0], thR: [-1.0, 0, 0.14], shR: [1.6, 0, 0], thL: [-0.35, 0, 0.16], shL: [1.3, 0, 0] })], // 落地深蹲劈下
      [0.94, B_({ ch: [0.5, 0, 0], hd: [0.1, 0, 0], thR: [-1.0, 0, 0.14], shR: [1.6, 0, 0], thL: [-0.35, 0, 0.16], shL: [1.3, 0, 0] })],
      [1, B_({})],
    ]);
    const air = u > 0.665 && u < 0.87 ? 0.6 * Math.sin(((u - 0.665) / 0.205) * PI) : 0;   // 大跳躍
    const shouting = hit(u, 0.14, 0.1) || hit(u, 0.45, 0.1) || hit(u, 0.7, 0.2);
    return { sp, air, face: face(shouting ? 'shout' : 'determined'), props: props(['swordR']), twoHand: true, sword: swordAt(u), swordFrame: 'chest' };
  };

  // ---- 武器：雙刀 --------------------------------------------------------
  const BLADES_READY = { ch: [0.15, 0, 0], uaR: [-1.2, 0, -0.35], faR: [-1.0, 0, 0], hR: [1.0, 0, 0.5], uaL: [-1.2, 0, -0.35], faL: [-1.0, 0, 0], hL: [1.0, 0, 0.5],
    thR: [-0.45, 0, 0.15], shR: [0.75, 0, 0], thL: [-0.2, 0, 0.15], shL: [0.65, 0, 0] };
  A.bladesReady = (u) => ({ sp: breathe(S(BLADES_READY), u, 0.02), face: face('determined', blinkAt(u, 0.6)), props: props(['bladeR', 'bladeL']) });
  A.bladesCombo = (u) => {
    const R = S(BLADES_READY);
    const out = { uaR: [-0.2, 0, 1.5], faR: [-0.1, 0, 0], hR: [1.5, 0, 0], uaL: [-0.2, 0, 1.5], faL: [-0.1, 0, 0], hL: [1.5, 0, 0] };
    const sp = K(u, [
      [0, R],
      [0.08, S({ ...BLADES_READY, ch: [0.15, 0.35, 0], uaR: [-1.5, 0, 1.2], faR: [-0.1, 0, 0], hR: [1.6, 0, 0] })],
      [0.18, S({ ...BLADES_READY, ch: [0.15, -0.45, 0], uaR: [-1.5, 0, -0.8], faR: [-0.1, 0, 0], hR: [1.6, 0, 0] })],
      [0.28, S({ ...BLADES_READY, ch: [0.15, -0.4, 0], uaR: [-1.2, 0, -0.35], uaL: [-1.5, 0, 1.2], faL: [-0.1, 0, 0], hL: [1.6, 0, 0] })],
      [0.38, S({ ...BLADES_READY, ch: [0.15, 0.45, 0], uaL: [-1.5, 0, -0.8], faL: [-0.1, 0, 0], hL: [1.6, 0, 0] })],
      [0.5, S({ ...BLADES_READY, ...out, hr: [0, 0, 0] })],
      [0.75, S({ ...BLADES_READY, ...out, hr: [0, 2 * PI, 0] })],
      [0.84, S({ ...BLADES_READY, hr: [0, 2 * PI, 0], ch: [0.3, 0, 0], uaR: [-1.6, 0, -0.55], faR: [-0.05, 0, 0], hR: [1.6, 0, 0], uaL: [-1.6, 0, -0.55], faL: [-0.05, 0, 0], hL: [1.6, 0, 0] })],
      [0.92, S({ ...BLADES_READY, hr: [0, 2 * PI, 0] })],
      [1, S({ ...BLADES_READY, hr: [0, 2 * PI, 0] })],
    ]);
    const shouting = hit(u, 0.1, 0.08) || hit(u, 0.3, 0.08) || hit(u, 0.76, 0.1);
    return { sp, face: face(shouting ? 'shout' : 'determined'), props: props(['bladeR', 'bladeL']) };
  };

  // ---- 武器：雙槍 --------------------------------------------------------
  const GUNS_READY = { ch: [0.05, 0, 0], hd: [-0.05, 0, 0], uaR: [-1.5, 0, -0.12], faR: [-0.05, 0, 0], hR: [0, 0, 0], uaL: [-1.5, 0, -0.12], faL: [-0.05, 0, 0], hL: [0, 0, 0], ...STANCE };
  A.gunsReady = (u) => {
    const a = u * TAU;
    const sp = S({ ...GUNS_READY, uaR: [-1.5 + 0.03 * Math.sin(a), 0.0, -0.12 + 0.03 * Math.sin(2 * a)], uaL: [-1.5 + 0.03 * Math.sin(a + 1), 0, -0.12 + 0.03 * Math.sin(2 * a + 1)] });
    return { sp: breathe(sp, u, 0.012), face: face('determined', blinkAt(u, 0.45)), props: props(['gunR', 'gunL']) };
  };
  A.gunsCombo = (u) => {
    const sp = S({ ...GUNS_READY });
    const kR = pulse(u, 0.1, 0.12) + pulse(u, 0.6, 0.14), kL = pulse(u, 0.35, 0.12) + pulse(u, 0.6, 0.14);
    sp.uaR = [-1.5 - 0.35 * kR, 0, -0.12]; sp.hR = [-0.35 * kR, 0, 0];
    sp.uaL = [-1.5 - 0.35 * kL, 0, -0.12]; sp.hL = [-0.35 * kL, 0, 0];
    sp.ch = [0.05 - 0.12 * Math.max(kR, kL), 0.15 * (kL - kR), 0];
    const hop = u > 0.6 && u < 0.8 ? Math.sin(((u - 0.6) / 0.2) * PI) : 0;
    sp.hp = [0, 0.98, -0.18 * Math.min(1, Math.max(0, (u - 0.6) / 0.15)) * (u < 0.85 ? 1 : 1 - (u - 0.85) / 0.15)];
    const fR = hit(u, 0.1, 0.04) || hit(u, 0.6, 0.04) ? 1 : 0, fL = hit(u, 0.35, 0.04) || hit(u, 0.6, 0.04) ? 1 : 0;
    return { sp, air: 0.12 * hop, face: face(fR || fL ? 'shout' : 'determined'), props: props(['gunR', 'gunL'], { R: fR, L: fL }) };
  };

  // ---- 被攻擊 ------------------------------------------------------------
  A.hurt = (u) => {
    const sp = K(u, [
      [0, S()],
      [0.1, S({ hp: [0, HY, -0.18], hr: [-0.15, 0, 0.05], ch: [-0.45, 0.1, 0.15], hd: [-0.45, 0, 0.12], uaR: [0.3, 0, 0.9], faR: [-0.6, 0, 0], uaL: [0.3, 0, 0.9], faL: [-0.6, 0, 0],
        thR: [-0.35, 0, 0.05], shR: [0.55, 0, 0], thL: [-0.1, 0, 0.05], shL: [0.4, 0, 0] })],
      [0.35, S({ hp: [0, HY, -0.28], hr: [0.15, 0, 0], ch: [0.35, 0, -0.05], hd: [0.3, 0, 0], uaR: [-0.3, 0, 0.3], faR: [-0.9, 0, 0], uaL: [-0.3, 0, 0.3], faL: [-0.9, 0, 0],
        thR: [-0.5, 0, 0.08], shR: [0.85, 0, 0], thL: [-0.3, 0, 0.08], shL: [0.75, 0, 0] })],
      [0.7, S({ hp: [0, HY, -0.15] })],
      [1, S()],
    ]);
    return { sp, face: face(u < 0.6 ? 'hurt' : 'sad') };
  };

  // ---- 動作清單 ------------------------------------------------------------
  const LIST = [
    ['idle', '站立', '基本', 72, '原地呼吸、轉頭張望、眨眼'],
    ['walk', '行走', '基本', 28, '左右腳交替、手腳反向擺、身體扭轉'],
    ['run', '跑步', '基本', 16, '身體前傾、彎肘大擺臂、膝蓋高抬'],
    ['wave', '打招呼', '基本', 36, '右手舉高左右揮、頭微歪、開心笑'],
    ['throw', '右手丟球', '基本', THROW.frames, '轉身蓄力 → 跨步出手 → 球飛出 → 收勢'],
    ['roll', '往前翻滾', '基本', 52, '雙手前伸、身體前傾 → 半蹲 → 往前跳 → 手撐地低頭滾一圈 → 蹲起張手'],
    ['cheer1', '歡呼（跳躍）', '情緒', 30, '蹲下蓄力、雙手高舉跳起，瞇眼大笑'],
    ['cheer2', '歡呼（握拳）', '情緒', 36, '右拳往上連續揮、膝蓋彈跳點頭，瞇眼大笑'],
    ['sad1', '失落（垂頭）', '情緒', 60, '垂頭垮肩、手無力下垂、腳尖輕踢地，皺眉嘴角下垂'],
    ['sad2', '失落（抱膝）', '情緒', 72, '坐在地上抱膝、頭埋膝上輕晃，閉眼難過'],
    ['knifeReady', '單刀 預備', '單刀', 36, '側身弓步、刀尖朝前上、左手護在前'],
    ['knifeCombo', '單刀 三連擊', '單刀', 80, '橫斬 → 反手回斬 → 弓步突刺', 48],
    ['swordReady', '大劍 預備', '大劍', 36, '雙手握劍斜舉於身前'],
    ['swordCombo', '大劍 三連擊', '大劍', 96, '高舉劈下 → 轉身橫掃 → 雙手舉劍過頭大跳躍、落地劈下（地面震動）', 48],
    ['bladesReady', '雙刀 預備', '雙刀', 36, '低姿勢、雙刀交叉於胸前'],
    ['bladesCombo', '雙刀 三連擊', '雙刀', 80, '右刀橫斬 → 左刀橫斬 → 展臂旋轉一圈後交叉斬', 48],
    ['gunsReady', '雙槍 預備', '雙槍', 36, '雙臂前伸持槍瞄準、微微晃動'],
    ['gunsCombo', '雙槍 三連擊', '雙槍', 72, '右槍射擊 → 左槍射擊 → 雙槍齊射並後跳', 48],
    ['hurt', '被攻擊', '受擊', 30, '被擊中後仰退步、雙手甩開，痛苦表情後回穩'],
  ];

  // 動作事件：頁面在播到這個時間點時觸發特效／音效（quake = 大劍砸地的地震）
  const EVENTS = { swordCombo: [[0.875, 'quake']] };

  // 每個動作手上拿什麼：掛點 → props.js 的物品（可在頁面或程式裡換成自己的模型）
  const HOLD = {
    throw: { ball: 'ball' },
    knifeReady: { propR: 'knife' }, knifeCombo: { propR: 'knife' },
    swordReady: { propR: 'sword' }, swordCombo: { propR: 'sword' },
    bladesReady: { propR: 'blade', propL: 'blade' }, bladesCombo: { propR: 'blade', propL: 'blade' },
    gunsReady: { propR: 'gun', propL: 'gun' }, gunsCombo: { propR: 'gun', propL: 'gun', fxR: 'flash', fxL: 'flash' },
  };

  // ---- 雙手持劍：左臂兩骨 IK ------------------------------------------------
  // 目標 = 右手握著的劍柄上、往劍尾 0.16 的點。解出左上臂旋轉＋手肘彎曲，
  // 再把左手轉成與右手同向，兩手就一前一後握在同一支劍柄上。
  const v3 = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: (a) => Math.hypot(a[0], a[1], a[2]),
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  };
  const m3 = {
    // 以欄向量表示：M = [c0, c1, c2]，M·v = c0*x + c1*y + c2*z
    fromEuler: (r) => [rotXYZ(r, [1, 0, 0]), rotXYZ(r, [0, 1, 0]), rotXYZ(r, [0, 0, 1])],
    apply: (M, v) => [0, 1, 2].map((i) => M[0][i] * v[0] + M[1][i] * v[1] + M[2][i] * v[2]),
    mul: (A, B) => B.map((c) => m3.apply(A, c)),
    T: (M) => [0, 1, 2].map((i) => [M[0][i], M[1][i], M[2][i]]),
    axis: (k, a) => { // 繞單位軸 k 轉 a（Rodrigues）
      const c = Math.cos(a), s = Math.sin(a), t = 1 - c, [x, y, z] = k;
      return [[t * x * x + c, t * x * y + s * z, t * x * z - s * y], [t * x * y - s * z, t * y * y + c, t * y * z + s * x], [t * x * z + s * y, t * y * z - s * x, t * z * z + c]];
    },
    toEuler: (M) => { // 對應 R = Rx·Ry·Rz（Three.js Euler 'XYZ'）
      const m = (r, c) => M[c][r];
      const y = Math.asin(Math.max(-1, Math.min(1, m(0, 2))));
      if (Math.abs(m(0, 2)) < 0.9999) return [Math.atan2(-m(1, 2), m(2, 2)), y, Math.atan2(-m(0, 1), m(0, 0))];
      return [Math.atan2(m(2, 1), m(1, 1)), y, 0];
    },
  };
  // 節點在世界中的旋轉（由 FK 取基底向量）
  function worldRot(pose, node) {
    const o = fk(pose, node, AT[node]);
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => v3.norm(v3.sub(fk(pose, node, v3.add(AT[node], e)), o)));
  }
  function alignRot(a, b) { // 把方向 a 轉到方向 b 的最小旋轉
    const an = v3.norm(a), bn = v3.norm(b), ax = v3.cross(an, bn), sn = v3.len(ax), c = v3.dot(an, bn);
    if (sn < 1e-8) return c > 0 ? [[1, 0, 0], [0, 1, 0], [0, 0, 1]] : m3.axis([0, 0, 1], PI);
    return m3.axis(v3.norm(ax), Math.atan2(sn, c));
  }
  // 手肘朝向的連續性：IK.prev = 前一格各手臂的上臂旋轉，IK.out = 這次解出的結果
  const IK = { prev: null, out: {} };
  const rotAngle = (A, B) => { // 兩個旋轉矩陣（欄向量）之間的夾角
    const M = m3.mul(m3.T(A), B);
    return Math.acos(Math.max(-1, Math.min(1, (M[0][0] + M[1][1] + M[2][2] - 1) / 2)));
  };
  // 單臂 IK：讓 side 手的握點到 target，手掌世界朝向 = Rhand
  function solveArm(pose, side, target, Rhand) {
    const ua = 'upperArm' + side, fa = 'forearm' + side, hd = 'hand' + side;
    const grip = side === 'R' ? CONTACT.gripR : CONTACT.gripL;
    const out = side === 'R' ? -1 : 1; // 胸部座標中「往外」的 x 方向
    const S = fk(pose, ua, AT[ua]);
    const Rc = worldRot(pose, 'chest');
    const w = m3.apply(m3.T(Rc), v3.sub(target, S));
    const d = v3.len(w);
    const a0 = v3.sub(AT[fa], AT[ua]);
    let handLocal = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], R = null, e = 0;
    for (let iter = 0; iter < 3; iter++) {
      const f0 = v3.add(v3.sub(AT[hd], AT[fa]), m3.apply(handLocal, v3.sub(grip, AT[hd])));
      const reach = (ang) => v3.len(v3.add(a0, rotXYZ([ang, 0, 0], f0)));
      let lo = -2.7, hi = 0;
      if (reach(hi) <= d) e = 0;
      else if (reach(lo) >= d) e = lo;
      else { for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (reach(mid) > d) hi = mid; else lo = mid; } e = (lo + hi) / 2; }
      const R0 = alignRot(v3.add(a0, rotXYZ([e, 0, 0], f0)), w);
      let best = Infinity;
      const prevR = IK.prev && IK.prev[side];
      for (let k = 0; k < 72; k++) { // 手肘朝下、略朝外最自然；有前一格時偏好與前一格接近（避免手臂突然翻轉）
        const Rk = m3.mul(m3.axis(v3.norm(w), (k / 72) * 2 * PI), R0);
        const el = m3.apply(Rk, a0);
        const score = el[1] - 0.6 * out * el[0] + 0.2 * Math.abs(el[2]) + (prevR ? 1.2 * rotAngle(Rk, prevR) : 0);
        if (score < best) { best = score; R = Rk; }
      }
      handLocal = m3.mul(m3.T(m3.mul(Rc, m3.mul(R, m3.fromEuler([e, 0, 0])))), Rhand);
    }
    IK.out[side] = R;
    pose[ua].r = m3.toEuler(R);
    pose[fa].r = [e, 0, 0];
    pose[hd].r = m3.toEuler(handLocal);
  }
  // 雙手持大劍：保留動作裡劍的朝向，劍柄中心若太遠就往兩肩之間拉近，兩手各握一段
  const HALF = 0.08;   // 兩手握點各離劍柄中心 0.08（右手靠護手、左手靠劍尾）
  // 劍在手裡的滑動量（沿劍身方向，公尺）：大於 0 = 劍相對手往前，兩手更靠近劍柄尾端。
  // 劍柄尾端若超出後手太多，劍水平或低持時會頂進肚子；握在尾端才合理，也是雙手大劍的自然握法。
  const SLIDE0 = 0.08, SLIDE_MAX = 0.12;
  // 由劍的朝向 d 與刃口方向 e 建立旋轉矩陣（欄向量 [x, y, z]；z = 劍身方向，y = 刃口方向）
  const swordRot = (d, e) => {
    const z = v3.norm(d);
    const y = v3.norm(v3.sub(e, z.map((v) => v * v3.dot(e, z))));
    return [v3.cross(y, z), y, z];
  };
  function solveTwoHand(pose, off, sw) {
    let Rh0, Hc;
    if (sw) { Rh0 = swordRot(sw.d, sw.e); Hc = sw.H; }       // 動作直接指定劍的位置與朝向
    else {
      Rh0 = worldRot(pose, 'handR');
      const z0 = m3.apply(Rh0, [0, 0, 1]);
      const gR = fk(pose, 'handR', CONTACT.gripR);
      Hc = v3.add(gR, z0.map((v) => -v * HALF));            // 劍柄中心（由右手臂目前姿勢推得）
    }
    let Rh = Rh0;
    if (off) { const a = v3.len(off.rot); if (a > 1e-9) Rh = m3.mul(m3.axis(v3.norm(off.rot), a), Rh0); } // 避讓：繞劍柄中心微轉
    const zW = m3.apply(Rh, [0, 0, 1]); // 劍身方向
    const H0 = off ? v3.add(Hc, off.d) : Hc;
    const SL = fk(pose, 'upperArmL', AT.upperArmL), SR = fk(pose, 'upperArmR', AT.upperArmR);
    // 搆不到時：只沿「肩 → 握點」方向縮短剛好需要的距離（不再往兩肩中間拉，免得把劍拉進身體）
    const RMAX = 0.52;   // 手臂最長可及的初估（上臂 0.244 + 前臂到握點 0.321 = 0.565；手腕彎曲時更短），下面再用實測誤差修正
    let H = H0;
    for (let it = 0; it < 30; it++) {
      const tR = v3.add(H, zW.map((v) => v * HALF)), tL = v3.add(H, zW.map((v) => -v * HALF));
      const dR = v3.len(v3.sub(tR, SR)), dL = v3.len(v3.sub(tL, SL));
      if (dR <= RMAX && dL <= RMAX) break;
      if (dR > RMAX) H = v3.sub(H, v3.sub(tR, SR).map((v) => (v / dR) * (dR - RMAX)));
      if (dL > RMAX) H = v3.sub(H, v3.sub(tL, SL).map((v) => (v / dL) * (dL - RMAX)));
    }
    for (let it = 0; it < 4; it++) {
      const tR = v3.add(H, zW.map((v) => v * HALF)), tL = v3.add(H, zW.map((v) => -v * HALF));
      solveArm(pose, 'R', tR, Rh);
      solveArm(pose, 'L', tL, Rh);
      const eR = v3.len(v3.sub(fk(pose, 'handR', CONTACT.gripR), tR)), eL = v3.len(v3.sub(fk(pose, 'handL', CONTACT.gripL), tL));
      if (eR < 0.003 && eL < 0.003) break;            // 兩手都握到了
      if (it === 3) break;
      if (eR >= 0.003) H = v3.sub(H, v3.sub(tR, SR).map((v) => (v / (v3.len(v3.sub(tR, SR)) || 1)) * (eR + 0.002)));   // 搆不到：沿肩→握點方向縮短
      if (eL >= 0.003) H = v3.sub(H, v3.sub(tL, SL).map((v) => (v / (v3.len(v3.sub(tL, SL)) || 1)) * (eL + 0.002)));
    }
  }

  // ---- 武器穿透檢查與避讓 ----------------------------------------------------
  // 武器（props.js 的 hit 膠囊取樣成點）逐點與角色碰撞體（kid-model.js 的 COLLIDERS）、地面比對。
  // 有穿進去的格子，用小幅度調整持武器手臂（雙手大劍則調整劍的位置與朝向）把武器推出去，
  // 並讓相鄰格平順銜接，最後保證每一格都不穿頭、頸、軀幹、腿、手臂與地面。
  const PROPS_LIB = (typeof module !== 'undefined' && module.exports) ? require('./props.js').PROPS : root.KID_BLUEPRINT.PROPS;
  const COLLIDERS = CONTACT.colliders;
  const IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const ORDER = ['root', 'hips', 'chest', 'head', 'upperArmL', 'forearmL', 'handL', 'upperArmR', 'forearmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
  const ARMS = ['upperArmR', 'forearmR', 'handR', 'upperArmL', 'forearmL', 'handL'];
  const MARGIN = 0.012;   // 避讓時多留的間隙（公尺）
  function jointFrames(pose) {  // 各節點的世界變換：世界座標 = A·(靜止座標) + b
    const F = {};
    for (const j of ORDER) {
      const tr = pose[j] || {}, at = AT[j], p = tr.p || at, r = tr.r || [0, 0, 0];
      const Rj = m3.fromEuler(r), par = PARENT[j] ? F[PARENT[j]] : null;
      const Ap = par ? par.A : IDENT, bp = par ? par.b : [0, 0, 0];
      const A = m3.mul(Ap, Rj);
      F[j] = { A, At: m3.T(A), b: v3.add(m3.apply(Ap, v3.sub(p, m3.apply(Rj, at))), bp) };
    }
    return F;
  }
  function sdf(c, q) {   // 到碰撞體表面的距離（負 = 在裡面），q 為該節點靜止座標
    switch (c.kind) {
      case 'sph': return Math.hypot(q[0] - c.c[0], q[1] - c.c[1], q[2] - c.c[2]) - c.r;
      case 'cap': {
        const ba = v3.sub(c.b, c.a), pa = v3.sub(q, c.a);
        const h = Math.max(0, Math.min(1, v3.dot(pa, ba) / v3.dot(ba, ba)));
        return Math.hypot(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - c.r;
      }
      case 'ell': {
        const p = [q[0] - c.c[0], q[1] - c.c[1], q[2] - c.c[2]];
        const k0 = Math.hypot(p[0] / c.rad[0], p[1] / c.rad[1], p[2] / c.rad[2]);
        const k1 = Math.hypot(p[0] / (c.rad[0] * c.rad[0]), p[1] / (c.rad[1] * c.rad[1]), p[2] / (c.rad[2] * c.rad[2]));
        return k1 < 1e-9 ? -Math.min(...c.rad) : (k0 * (k0 - 1)) / k1;
      }
      case 'ecyl': {
        const x = q[0] - c.c[0], z = q[2] - c.c[2];
        const k0 = Math.hypot(x / c.rx, z / c.rz), k1 = Math.hypot(x / (c.rx * c.rx), z / (c.rz * c.rz));
        if (c.gap && Math.abs(Math.atan2(x, z)) < c.gap) return 1;   // 披風正前方的開口
        const dxz = k1 < 1e-9 ? -Math.min(c.rx, c.rz) : (k0 * (k0 - 1)) / k1, dy = Math.abs(q[1] - c.c[1]) - c.hh;
        return Math.min(Math.max(dxz, dy), 0) + Math.hypot(Math.max(dxz, 0), Math.max(dy, 0));
      }
    }
    return 1;
  }
  const sampleCache = {};
  function samplesOf(prop) {   // 把膠囊沿長度每 5 公分取一點
    if (sampleCache[prop]) return sampleCache[prop];
    const out = [];
    for (const c of PROPS_LIB[prop].hit) {
      const n = Math.max(1, Math.ceil(v3.len(v3.sub(c.b, c.a)) / 0.05));
      for (let i = 0; i <= n; i++) out.push({ q: [0, 1, 2].map((k) => c.a[k] + ((c.b[k] - c.a[k]) * i) / n), r: c.r, grip: c.grip });
    }
    return (sampleCache[prop] = out);
  }
  // 這個動作拿著什麼、由哪幾隻手握（大劍雙手握）
  function holdsOf(id) {
    const hold = HOLD[id] || {}, holds = [];
    if (hold.propR) holds.push({ prop: hold.propR, side: 'R' });
    if (hold.propL) holds.push({ prop: hold.propL, side: 'L' });
    return { holds, holders: A[id](0).twoHand ? ['R', 'L'] : holds.map((h) => h.side) };
  }
  // 檢查一個姿勢：回傳 cost（避讓用，含安全間隙）、worst（最大穿透深度，> 0 = 穿進去）、who（穿到哪裡）
  function weaponHits(pose, hs, F) {
    F = F || jointFrames(pose);
    let cost = 0, worst = -Infinity, who = '';
    for (const h of hs.holds) {
      const Fh = F['hand' + h.side], grip = h.side === 'R' ? CONTACT.gripR : CONTACT.gripL;
      const sl = pose['prop' + h.side], so = sl && sl.p ? v3.sub(sl.p, AT['prop' + h.side]) : [0, 0, 0]; // 劍在手裡的滑動
      for (const sm of samplesOf(h.prop)) {
        const w = v3.add(m3.apply(Fh.A, [grip[0] + sm.q[0] + so[0], grip[1] + sm.q[1] + so[1], grip[2] + sm.q[2] + so[2]]), Fh.b);
        const gp = sm.r * 0.5 - w[1];                               // 地面
        if (gp + MARGIN > 0) cost += (gp + MARGIN) * (gp + MARGIN);
        if (gp > worst) { worst = gp; who = '地面'; }
        for (const c of COLLIDERS) {
          const side = c.node.slice(-1);
          if (c.node.startsWith('hand') && hs.holders.includes(side)) continue;                  // 握著的手
          if (c.node.startsWith('forearm') && hs.holders.includes(side) && sm.grip) continue;    // 握柄靠近自己前臂
          const Fn = F[c.node], pen = sm.r - sdf(c, m3.apply(Fn.At, v3.sub(w, Fn.b)));
          if (pen + MARGIN > 0) cost += (pen + MARGIN) * (pen + MARGIN);
          if (pen > worst) { worst = pen; who = c.name; }
        }
      }
    }
    return { cost, worst, who };
  }
  function search(costFn, u0, steps) {   // 座標式搜尋：逐變數試 ±step，有改善就接受，步長逐級縮小
    let u = u0.slice(), c = costFn(u);
    for (const st of steps) {
      let improved = true, guard = 0;
      while (improved && guard++ < 40) {
        improved = false;
        for (let k = 0; k < u.length && !improved; k++) for (const sg of [1, -1]) {
          const w = u.slice(); w[k] += sg * st;
          const cw = costFn(w);
          if (cw < c - 1e-12) { u = w; c = cw; improved = true; break; }
        }
      }
    }
    return { u, c };
  }
  const eulerQ = ([x, y, z]) => {   // 尤拉角 XYZ（R = Rx·Ry·Rz）→ 四元數 [x, y, z, w]
    const q = (a, ax) => { const sn = Math.sin(a / 2), c = Math.cos(a / 2); return ax === 0 ? [sn, 0, 0, c] : ax === 1 ? [0, sn, 0, c] : [0, 0, sn, c]; };
    const mul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
    return mul(mul(q(x, 0), q(y, 1)), q(z, 2));
  };
  const quatEuler = ([x, y, z, w]) => {
    const m00 = 1 - 2 * (y * y + z * z), m01 = 2 * (x * y - z * w), m02 = 2 * (x * z + y * w), m12 = 2 * (y * z - x * w), m22 = 1 - 2 * (x * x + y * y);
    const ey = Math.asin(Math.max(-1, Math.min(1, m02)));
    return Math.abs(m02) < 0.9999999 ? [Math.atan2(-m12, m22), ey, Math.atan2(-m01, m00)] : [Math.atan2(2 * (y * z + x * w), 1 - 2 * (x * x + z * z)), ey, 0];
  };
  const qslerp = (a, b, t) => {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map((v) => -v); d = -d; }
    if (d > 0.9995) { const r = a.map((v, i) => v + (b[i] - v) * t), l = Math.hypot(...r); return r.map((v) => v / l); }
    const th = Math.acos(d), sn = Math.sin(th), wa = Math.sin((1 - t) * th) / sn, wb = Math.sin(t * th) / sn;
    return a.map((v, i) => v * wa + b[i] * wb);
  };
  function lerpPose(pa, pb, t) {
    const out = {};
    for (const n of Object.keys(pa)) {
      out[n] = {};
      if (pa[n].p) out[n].p = pa[n].p.map((v, j) => v + (pb[n].p[j] - v) * t);
      if (pa[n].s) out[n].s = pa[n].s.map((v, j) => v + (pb[n].s[j] - v) * t);
      if (pa[n].r) out[n].r = quatEuler(qslerp(eulerQ(pa[n].r), eulerQ(pb[n].r), t));
    }
    return out;
  }
  const MID_T = [0.25, 0.5, 0.75];
  function avoidAction(id, poses, n, RS) {
    const hs = holdsOf(id);
    if (!hs.holds.length) return null;
    const two = !!A[id](0).twoHand;
    const sides = hs.holds.map((h) => h.side);
    const nv = two ? 7 : 7 * sides.length;
    const STEP = 0.5;   // 一個單位 = 0.5 弧度（大劍的位移則 0.15 公尺）
    const base = poses.map((p) => Object.fromEntries(ARMS.map((j) => [j, p[j].r.slice()])));
    const applyU = (pose, i, u) => {
      for (const j of ARMS) pose[j].r = base[i][j].slice();
      if (two) {
        IK.prev = RS[(i - 1 + n) % n];
        solveTwoHand(pose, { d: [u[0] * 0.15, u[1] * 0.15, u[2] * 0.15], rot: [u[3] * STEP, u[4] * STEP, u[5] * STEP] }, pose.__sword);
        pose.propR = { p: v3.add(AT.propR, [0, 0, Math.max(0, Math.min(SLIDE_MAX, SLIDE0 + 0.05 * u[6]))]) };
        return;
      }
      sides.forEach((sd, k) => {
        const o = k * 7, ua = 'upperArm' + sd, fa = 'forearm' + sd, hd = 'hand' + sd;
        pose[ua].r = base[i][ua].map((x, m) => x + STEP * u[o + m]);
        pose[fa].r = [base[i][fa][0] + STEP * u[o + 3], base[i][fa][1], base[i][fa][2]];
        pose[hd].r = base[i][hd].map((x, m) => x + STEP * u[o + 4 + m]);
      });
    };
    const zero = () => new Array(nv).fill(0);
    const U = Array.from({ length: n }, zero);
    const steps = [0.6, 0.3, 0.15, 0.08, 0.04];
    const hitsOf = (i, u) => { applyU(poses[i], i, u); return weaponHits(poses[i], hs); };
    const solveFrame = (i, mu, lam, withMid) => {
      const pi = (i - 1 + n) % n, ni = (i + 1) % n, prev = U[pi], next = U[ni];
      const qPrev = ARMS.map((j) => eulerQ(poses[pi][j].r)), qNext = ARMS.map((j) => eulerQ(poses[ni][j].r));
      const qAng = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])));
      const costFn = (u) => {
        const h = hitsOf(i, u);
        let reg = 0, sm = 0, mid = 0, js = 0;
        // 手臂關節與前後格的旋轉夾角：避免避讓時手臂在一格之內翻轉
        ARMS.forEach((j, m) => { const q = eulerQ(poses[i][j].r); js += qAng(q, qPrev[m]) ** 2 + qAng(q, qNext[m]) ** 2; });
        for (let k = 0; k < nv; k++) { reg += u[k] * u[k]; sm += (u[k] - prev[k]) ** 2 + (u[k] - next[k]) ** 2; }
        if (withMid) {   // 這一格與前後兩格之間的內插路徑也不能穿透
          for (const t of MID_T) {
            mid += weaponHits(lerpPose(poses[(i - 1 + n) % n], poses[i], t), hs).cost;
            mid += weaponHits(lerpPose(poses[i], poses[(i + 1) % n], t), hs).cost;
          }
        }
        return 1e6 * (h.cost + mid) + lam * reg + mu * sm + 15 * js;
      };
      const allZero = (v) => v.every((x) => Math.abs(x) < 1e-9);
      if (allZero(U[i]) && allZero(prev) && allZero(next) && costFn(U[i]) === 0) return;
      // 起點：自己目前的解、前一格、下一格、全零，取代價最低的。從鄰格的解開始找，才會沿用同一種「繞法」
      let start = null, c0 = Infinity;
      for (const cand of [U[i], prev, next, zero()]) { const c = costFn(cand); if (c < c0) { c0 = c; start = cand; } }
      U[i] = search(costFn, start.slice(), steps).u;
      if (two) { applyU(poses[i], i, U[i]); RS[i] = { ...IK.out }; }   // 記下這格最後的手肘朝向，給下一格參考
    };
    const t0 = Date.now();
    // 平順限制 mu 逐輪加大：先找到可行解，再讓偏移量隨時間愈來愈平順；正反方向交替掃過
    [0.5, 0.5, 2, 2, 6, 6, 12, 12, 12].forEach((mu, sw) => {
      const idx = Array.from({ length: n }, (_, i) => i);
      if (sw % 2) idx.reverse();
      for (const i of idx) solveFrame(i, mu, 0.3);
    });
    // 仍穿透的格子：平順限制稍微放鬆再試（不放到 0，避免格與格之間翻轉）
    for (let round = 0; round < 4; round++) {
      let bad = 0;
      for (let i = 0; i < n; i++) if (hitsOf(i, U[i]).worst > 0) { solveFrame(i, 0.8, 0.1); bad++; }
      if (!bad) break;
    }
    // 格與格之間（四元數內插）若仍穿透：把該區間兩端的格連中間時刻一起重解
    const midBad = () => {
      const bad = [];
      for (let i = 0; i < n; i++) {
        for (const t of MID_T) { if (weaponHits(lerpPose(poses[i], poses[(i + 1) % n], t), hs).worst > 0) { bad.push(i); break; } }
      }
      return bad;
    };
    for (let round = 0; round < 6; round++) {
      const bad = midBad();
      if (!bad.length) break;
      const todo = new Set();
      for (const i of bad) { todo.add(i); todo.add((i + 1) % n); }
      for (const i of todo) solveFrame(i, 2, 0.3, true);
    }
    const rep = { moved: 0, worstBefore: -Infinity, worstAfter: -Infinity, whoAfter: '', ms: 0 };
    for (let i = 0; i < n; i++) {
      applyU(poses[i], i, zero()); const b = weaponHits(poses[i], hs);   // 修正前
      if (b.worst > rep.worstBefore) rep.worstBefore = b.worst;
      const a = hitsOf(i, U[i]);                                        // 修正後（姿勢留在 poses[i]）
      if (a.worst > rep.worstAfter) { rep.worstAfter = a.worst; rep.whoAfter = a.who; }
      if (U[i].some((x) => Math.abs(x) > 1e-6)) rep.moved++;
    }
    for (const j of ARMS) poses[n][j].r = poses[0][j].r.slice();       // 循環最後一格 = 第一格
    if (poses[0].propR) poses[n].propR = poses[0].propR;
    rep.ms = Date.now() - t0;
    return rep;
  }

  // ---- 烘焙 ----------------------------------------------------------------
  function bakeFrame(id, u, frames) {
    const res = A[id](u);
    const pose = expand(res.sp);
    // 腳掌放平：腳的世界角度 = 髖 + 大腿 + 小腿 + 腳
    if (res.flat !== false) {
      for (const sd of ['R', 'L']) {
        const t = pose['thigh' + sd].r[0] + pose['shin' + sd].r[0] + pose.hips.r[0];
        pose['foot' + sd].r = [-t, 0, 0];
      }
    }
    // 著地：把最低的鞋底點貼到 y = 0（再加上跳躍高度 air）
    if (!res.noGround) {
      let minY = Infinity;
      for (const sd of ['R', 'L'])
        for (const p of FOOT[sd]) minY = Math.min(minY, fk(pose, 'foot' + sd, p)[1]);
      for (const [node, p] of res.groundPts || []) minY = Math.min(minY, fk(pose, node, p)[1]);
      pose.hips.p = [pose.hips.p[0], pose.hips.p[1] - minY + (res.air || 0), pose.hips.p[2]];
    }
    if (res.armIK) {
      const Fc = jointFrames(pose).chest;
      for (const [sd, p, R] of res.armIK) solveArm(pose, sd, v3.add(m3.apply(Fc.A, p), Fc.b), m3.mul(Fc.A, R));
    }
    if (res.hug) {   // 抱膝：雙手繞過膝蓋外側，在兩小腿前方交握（右手在上、左手在下）
      const knee = (sd, pt) => fk(pose, 'shin' + sd, pt);
      const x = SK.shinL[0], yk = SK.shinL[1];
      const mid = v3.add(knee('L', [x, yk - 0.06, 0]), knee('R', [-x, yk - 0.06, 0])).map((v) => v * 0.5);
      const fwd = v3.norm(v3.sub(knee('L', [x, yk - 0.06, 1]), knee('L', [x, yk - 0.06, 0])));   // 小腿前方
      const up = v3.norm(v3.sub(knee('L', [x, yk, 0]), knee('L', [x, yk - 1, 0])));             // 小腿往膝蓋方向
      // 手臂交叉環抱：右手越過去握住左小腿前方、左手握住右小腿前方，前臂橫跨在小腿前面
      for (const [sd, dx, dy] of [['R', 0.07, -0.05], ['L', -0.07, -0.1]]) {
        const t = v3.add(v3.add(mid, fwd.map((v) => v * 0.11)), v3.add([dx, 0, 0], up.map((v) => v * dy)));
        const across = v3.norm(v3.add([Math.sign(dx), 0, 0], fwd.map((v) => v * -0.5)));   // 手指朝對側、包住小腿
        solveArm(pose, sd, t, alignRot([0, -1, 0], across));
      }
    }
    if (res.twoHand) {
      let sw = res.sword;
      if (sw && res.swordFrame === 'chest') {   // 胸口座標系 → 世界座標
        const Fc = jointFrames(pose).chest;
        sw = { H: v3.add(m3.apply(Fc.A, sw.H), Fc.b), d: m3.apply(Fc.A, sw.d), e: m3.apply(Fc.A, sw.e) };
      }
      solveTwoHand(pose, null, sw);
      pose.propR = { p: v3.add(AT.propR, [0, 0, SLIDE0]) };
      Object.defineProperty(pose, '__sword', { value: sw, enumerable: false });
    }
    Object.assign(pose, res.face || face('normal'), res.props || props());
    // 球：出手前跟著右手，出手後拋物線飛出，最後回到手上
    let ballP = BALL_AT, ballS = OFF;
    if (res.ballThrow) {
      const rel = THROW.release, dur = frames / FPS;
      if (u < rel || u >= 0.92) { ballP = fk(pose, 'handR', BALL_AT); ballS = ON; }
      else {
        const relPose = expand(A.throw(rel).sp);
        const p0 = fk(relPose, 'handR', BALL_AT);
        const t = (u - rel) * dur;
        ballP = [p0[0], p0[1] + 2.4 * t - 4.9 * t * t, p0[2] + 6 * t];
        ballS = ballP[2] < 4 ? ON : OFF;
      }
    }
    pose.ball = { p: ballP, s: ballS };
    return pose;
  }
  const AVOID_REPORT = {};
  function bake([id, name, group, frames, desc, fps = FPS]) {   // 揮動快的武器連擊用 48 格／秒，內插偏差較小
    const poses = [], RS = [];
    IK.prev = null; IK.out = {};
    if (A[id](0).twoHand) {          // 暖機一輪，讓第 0 格的手肘朝向接續最後一格（循環不會在接縫處翻轉）
      for (let i = 0; i < frames; i++) { bakeFrame(id, i / frames, frames); IK.prev = { ...IK.out }; }
    }
    for (let i = 0; i <= frames; i++) { poses.push(bakeFrame(id, (i % frames) / frames, frames)); RS.push({ ...IK.out }); IK.prev = { ...IK.out }; }
    if (!globalThis.KID_NO_AVOID) { const r = avoidAction(id, poses, frames, RS); if (r) AVOID_REPORT[id] = r; }
    IK.prev = null;
    const tracks = {};
    for (const pose of poses)
      for (const [node, tr] of Object.entries(pose))
        for (const k of ['p', 'r', 's'])
          if (tr[k]) ((tracks[node] ||= {})[k] ||= []).push(tr[k].map((v, j) => +(k === 'p' && LOCALP[node] ? v - AT[node][j] + LOCALP[node][j] : v).toFixed(4)));
    return { id, name, group, frames, fps, desc, hold: HOLD[id] || {}, events: EVENTS[id] || [], tracks };
  }
  // 由烘焙好的軌道取出第 i 格的姿勢（檢查／驗證用）
  function poseAt(action, i) {
    const pose = {};
    for (const [n, tr] of Object.entries(action.tracks)) {
      pose[n] = {};
      for (const k of ['p', 'r', 's']) if (tr[k]) pose[n][k] = k === 'p' && LOCALP[n] ? tr[k][i].map((v, j) => v - LOCALP[n][j] + AT[n][j]) : tr[k][i];
    }
    return pose;
  }
  function checkAction(action) { // 回傳每格最大穿透深度（> 0 = 穿透）與穿到哪裡
    const hs = holdsOf(action.id);
    if (!hs.holds.length) return null;
    const out = [];
    for (let i = 0; i <= action.frames; i++) { const h = weaponHits(poseAt(action, i), hs); out.push({ i, worst: h.worst, who: h.who }); }
    return out;
  }
  const ACTIONS = LIST.map(bake);

  const api = { ACTIONS, FPS, fk, expand, checkAction, poseAt, weaponHits, holdsOf, AVOID_REPORT, sdf, samplesOf, jointFrames, COLLIDERS, m3, v3 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root.KID_BLUEPRINT, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
