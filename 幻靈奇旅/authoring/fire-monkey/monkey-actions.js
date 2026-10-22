// 火猴兩階的招式動作（與主角共用骨架，所以輸出格式與 actions.baked.js 相同，可直接交給 buildClips）
//   C囝仔：普攻「小火球」（單手過肩丟出）、大絕「大火球」（雙手舉過頭頂蓄成大火球後奮力擲出）
//   C老猴：普攻「伸棍打」（過肩劈下、金箍棒往前伸長再縮回）、大絕「三連棍」（旋身橫掃 → 躍起劈地 → 伸棍突刺＋轉棍收勢）
// 關鍵姿勢直接寫關節的實際尤拉角（XYZ）：上臂 rx 負 = 往前抬、rz 正 = 往 +X 側抬（左手往外、右手往內）；
//   前臂 rx 負 = 彎肘；大腿 rx 負 = 往前抬；小腿 rx 正 = 彎膝；胸／頭 rx 正 = 前傾；root ry = 整個人轉身。
// 每格自動：腳掌放平、最低腳底點貼地（再加 air 跳躍高度）。
// 額外輸出 fx（火球蓄力／出手時間）與 ext（每格金箍棒伸長量，公尺），由預覽頁產生特效。
(function (root) {
  const K = root.__KID_PARTS__;
  const { AT, LOCALP, OFF, ON } = K;
  const PI = Math.PI, TAU = 2 * PI;
  const JOINTS = ['root', 'hips', 'chest', 'head', 'upperArmL', 'forearmL', 'handL', 'upperArmR', 'forearmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
  const REST = { upperArmR: [0, 0, -0.08], upperArmL: [0, 0, 0.08], forearmR: [-0.15, 0, 0], forearmL: [-0.15, 0, 0] };
  const rest = (j) => REST[j] || [0, 0, 0];
  const FOOT = { L: [[0.145, 0, -0.085], [0.145, 0, 0.175]], R: [[-0.145, 0, -0.085], [-0.145, 0, 0.175]] };

  // 表情（與主角同一組節點）：眼睛、嘴巴、眉毛角度與高度
  const EXPR = {
    normal: { eye: 'eyeOpen', mouth: 'mouthSmile', brow: [0, 0, 0], by: 0 },
    excited: { eye: 'eyeOpen', mouth: 'mouthGrin', brow: [0, 0, 0], by: 0.008 },
    happy: { eye: 'eyeHappy', mouth: 'mouthGrin', brow: [0, 0, 0], by: 0.016 },
    determined: { eye: 'eyeOpen', mouth: 'mouthLine', brow: [0, 0, 0.32], by: -0.008, eyeY: 0.8 },
    shout: { eye: 'eyeOpen', mouth: 'mouthO', brow: [0, 0, 0.38], by: -0.008, eyeY: 0.85, mouthS: [1.5, 1.35, 1] },
  };
  const EYES = ['eyeOpen', 'eyeHappy', 'eyeSad', 'eyeShut'], MOUTHS = ['mouthSmile', 'mouthGrin', 'mouthSad', 'mouthO', 'mouthLine'];
  function face(name) {
    const e = EXPR[name] || EXPR.normal, o = {};
    for (const sd of ['L', 'R']) for (const k of EYES) o[k + sd] = { s: k === e.eye ? [1, e.eyeY || 1, 1] : OFF };
    for (const k of MOUTHS) o[k] = { s: k === e.mouth ? (e.mouthS || ON) : OFF };
    const b = e.brow;
    o.browL = { p: [LOCALP.browL[0], LOCALP.browL[1] + e.by, LOCALP.browL[2]], r: b.slice() };
    o.browR = { p: [LOCALP.browR[0], LOCALP.browR[1] + e.by, LOCALP.browR[2]], r: [b[0], -b[1], -b[2]] };
    return o;
  }

  // ---- 數學 ----
  function rotXYZ([a, b, c], [x, y, z]) {
    const x1 = x * Math.cos(c) - y * Math.sin(c), y1 = x * Math.sin(c) + y * Math.cos(c);
    const x2 = x1 * Math.cos(b) + z * Math.sin(b), z2 = -x1 * Math.sin(b) + z * Math.cos(b);
    return [x2, y1 * Math.cos(a) - z2 * Math.sin(a), y1 * Math.sin(a) + z2 * Math.cos(a)];
  }
  function footPoint(pose, sd, pt) {     // 腳底點（靜止世界座標）→ 目前姿勢（只算到髖部，求貼地高度）
    let v = pt.slice();
    for (const j of ['foot' + sd, 'shin' + sd, 'thigh' + sd, 'hips']) {
      const at = AT[j], r = pose[j].r, p = j === 'hips' ? pose.hips.p : at;
      v = rotXYZ(r, [v[0] - at[0], v[1] - at[1], v[2] - at[2]]);
      v = [v[0] + p[0], v[1] + p[1], v[2] + p[2]];
    }
    return v;
  }
  const ease = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  // 關鍵姿勢內插：keys = [{ u, j: {關節: [rx, ry, rz]}, air, hz, face, ext }, ...]
  function sample(keys, u) {
    let i = 0;
    while (i < keys.length - 2 && u > keys[i + 1].u) i++;
    const a = keys[i], b = keys[i + 1], t = ease(Math.min(1, Math.max(0, (u - a.u) / (b.u - a.u))));
    const j = {};
    for (const n of JOINTS) {
      if (n === 'hips' && !(a.j.hips || b.j.hips)) { j.hips = [0, 0, 0]; continue; }
      const va = a.j[n] || rest(n), vb = b.j[n] || rest(n);
      j[n] = va.map((v, k) => lerp(v, vb[k], t));
    }
    const num = (k) => lerp(a[k] || 0, b[k] || 0, t);
    return { j, air: num('air'), hz: num('hz'), ext: num('ext'), face: t < 0.5 || !b.face ? a.face || 'normal' : b.face };
  }

  function bake({ id, name, group, dur, fps = 24, desc, keys, hold = {}, events = [], fx = null, retime = null }) {
    if (retime) {   // retime = [原本出手時間, 新的出手時間]
      const [r0, r1] = retime, f = (u) => (u <= r0 ? u * (r1 / r0) : r1 + (u - r0) * ((1 - r1) / (1 - r0)));
      keys = keys.map((k) => ({ ...k, u: f(k.u) }));
      events = events.map(([u, t]) => [f(u), t]);
      if (fx) fx = { ...fx, from: f(fx.from), release: f(fx.release), ...(fx.full !== undefined ? { full: f(fx.full) } : {}) };
    }
    const frames = Math.round(dur * fps), tracks = {}, ext = [];
    const push = (node, k, v) => ((tracks[node] ||= {})[k] ||= []).push(v.map((x) => +x.toFixed(4)));
    for (let i = 0; i <= frames; i++) {
      const s = sample(keys, (i % frames) / frames), pose = {};
      for (const n of JOINTS) pose[n] = { r: s.j[n] };
      // 腳掌放平
      for (const sd of ['L', 'R']) pose['foot' + sd].r = [-(pose.hips.r[0] + pose['thigh' + sd].r[0] + pose['shin' + sd].r[0]), 0, 0];
      // 貼地
      pose.hips.p = [0, AT.hips[1], s.hz];
      let minY = Infinity;
      for (const sd of ['L', 'R']) for (const p of FOOT[sd]) minY = Math.min(minY, footPoint(pose, sd, p)[1]);
      pose.hips.p[1] += -minY + s.air;
      for (const n of JOINTS) { if (n === 'hips') push(n, 'p', pose.hips.p); push(n, 'r', pose[n].r); }
      for (const [n, tr] of Object.entries(face(s.face))) for (const k of ['p', 'r', 's']) if (tr[k]) push(n, k, tr[k]);
      push('fxR', 's', OFF); push('fxL', 's', OFF);
      push('ball', 'p', AT.ball); push('ball', 's', OFF);
      ext.push(+s.ext.toFixed(3));
    }
    return { id, name, group, frames, fps, desc, hold, events, tracks, fx, ext };
  }

  // ============ C囝仔：小火球（普攻） ============
  const fireSmall = bake({
    id: 'fireball', name: '小火球（普攻）', group: 'C囝仔 招式', dur: 1.4,
    desc: '壞笑蓄力 → 右手托著小火球往後拉 → 跨步過肩丟出 → 得意收勢',
    fx: { kind: 'small', from: 0.12, release: 0.44 }, events: [[0.44, 'fireSmall']], retime: [0.44, 0.48],
    keys: [
      { u: 0, j: {}, face: 'normal' },
      { u: 0.12, j: { chest: [0.05, -0.15, 0], head: [0, 0.1, 0], upperArmR: [-0.9, 0, -0.3], forearmR: [-1.3, 0, 0] }, face: 'excited' },
      { u: 0.32, j: { chest: [-0.12, -0.55, 0], head: [0.05, 0.45, 0], upperArmR: [-2.7, 0, -0.35], forearmR: [-1.4, 0, 0], handR: [0.3, 0, 0], upperArmL: [-1.0, 0, 0.35], forearmL: [-0.5, 0, 0], thighL: [-0.35, 0, 0.05], shinL: [0.35, 0, 0], thighR: [0.2, 0, -0.05], shinR: [0.25, 0, 0] }, face: 'normal' },
      { u: 0.46, j: { chest: [0.28, 0.45, 0], head: [-0.15, -0.35, 0], upperArmR: [-1.55, 0, -0.1], forearmR: [-0.05, 0, 0], upperArmL: [0.35, 0, 0.35], forearmL: [-0.6, 0, 0], thighL: [-0.5, 0, 0], shinL: [0.3, 0, 0], thighR: [0.35, 0, 0], shinR: [0.2, 0, 0] }, face: 'shout', hz: 0.08 },
      { u: 0.62, j: { chest: [0.35, 0.5, 0], head: [-0.2, -0.4, 0], upperArmR: [-0.8, 0, 0.25], forearmR: [-0.3, 0, 0], upperArmL: [0.3, 0, 0.3], forearmL: [-0.6, 0, 0], thighL: [-0.5, 0, 0], shinL: [0.3, 0, 0], thighR: [0.35, 0, 0], shinR: [0.2, 0, 0] }, face: 'happy', hz: 0.1 },
      { u: 0.85, j: { chest: [0.05, 0.1, 0], head: [0, -0.1, 0.1] }, face: 'happy', hz: 0.03 },
      { u: 1, j: {}, face: 'normal' },
    ],
  });

  // ============ C囝仔：大火球（大絕） ============
  const up = (k = 1) => ({ upperArmR: [-2.8, 0, -0.8 * k], upperArmL: [-2.8, 0, 0.8 * k], forearmR: [-0.25, 0, 0], forearmL: [-0.25, 0, 0], handR: [-0.3, 0, 0], handL: [-0.3, 0, 0] });   // 雙手往上撐開托住頭頂的火球
  const fireBig = bake({
    id: 'fireballBig', name: '大火球（大絕）', group: 'C囝仔 招式', dur: 2.4,
    desc: '蹲下集氣 → 雙手高舉、頭頂火球越滾越大 → 後仰蓄力 → 雙手奮力擲出大火球 → 開心跳一下',
    fx: { kind: 'big', from: 0.2, full: 0.52, release: 0.64 }, events: [[0.64, 'fireBig']], retime: [0.64, 0.48],
    keys: [
      { u: 0, j: {}, face: 'normal' },
      { u: 0.1, j: { chest: [0.3, 0, 0], head: [-0.15, 0, 0], upperArmR: [-0.6, 0, -0.3], upperArmL: [-0.6, 0, 0.3], forearmR: [-1.4, 0, 0], forearmL: [-1.4, 0, 0], thighL: [-0.55, 0, 0.05], thighR: [-0.55, 0, -0.05], shinL: [0.9, 0, 0], shinR: [0.9, 0, 0] }, face: 'determined' },
      { u: 0.22, j: { chest: [-0.12, 0, 0], head: [-0.3, 0, 0], ...up() }, face: 'excited' },
      { u: 0.36, j: { chest: [-0.1, 0.06, 0], head: [-0.32, 0, 0.04], ...up(1.25), thighL: [-0.12, 0, 0.08], thighR: [-0.12, 0, -0.08], shinL: [0.2, 0, 0], shinR: [0.2, 0, 0] }, face: 'determined' },
      { u: 0.5, j: { chest: [-0.12, -0.06, 0], head: [-0.32, 0, -0.04], ...up(1.25), thighL: [-0.12, 0, 0.08], thighR: [-0.12, 0, -0.08], shinL: [0.2, 0, 0], shinR: [0.2, 0, 0] }, face: 'determined' },
      { u: 0.58, j: { chest: [-0.38, 0, 0], head: [-0.2, 0, 0], upperArmR: [-3.3, 0, -0.3], upperArmL: [-3.3, 0, 0.3], forearmR: [-1.0, 0, 0], forearmL: [-1.0, 0, 0], thighL: [-0.25, 0, 0], thighR: [0.25, 0, 0], shinR: [0.15, 0, 0] }, face: 'shout' },
      { u: 0.66, j: { chest: [0.42, 0, 0], head: [-0.15, 0, 0], upperArmR: [-1.35, 0, -0.15], upperArmL: [-1.35, 0, 0.15], forearmR: [-0.1, 0, 0], forearmL: [-0.1, 0, 0], thighL: [-0.65, 0, 0], shinL: [0.45, 0, 0], thighR: [0.4, 0, 0], shinR: [0.3, 0, 0] }, face: 'shout', hz: 0.12 },
      { u: 0.78, j: { chest: [0.3, 0, 0], head: [-0.1, 0, 0], upperArmR: [-1.0, 0, -0.2], upperArmL: [-1.0, 0, 0.2], forearmR: [-0.3, 0, 0], forearmL: [-0.3, 0, 0], thighL: [-0.6, 0, 0], shinL: [0.45, 0, 0], thighR: [0.4, 0, 0], shinR: [0.3, 0, 0] }, face: 'happy', hz: 0.12 },
      { u: 0.88, j: { upperArmR: [-2.6, 0, -0.5], upperArmL: [-2.6, 0, 0.5], forearmR: [-0.4, 0, 0], forearmL: [-0.4, 0, 0], thighL: [-0.3, 0, 0], shinL: [0.6, 0, 0], thighR: [-0.3, 0, 0], shinR: [0.6, 0, 0] }, face: 'happy', air: 0.18, hz: 0.06 },
      { u: 1, j: {}, face: 'normal' },
    ],
  });

  // ============ C老猴：伸棍打（普攻） ============
  // 金箍棒在 propR，沿手掌 +Z：手臂下垂時棍子朝前；上臂往上舉 → 棍子往後上方（扛在肩後）
  const staffStrike = bake({
    id: 'staffStrike', name: '伸棍打（普攻）', group: 'C老猴 招式', dur: 1.5, fps: 48,
    desc: '扛棍後拉 → 跨步過肩劈下 → 金箍棒往前伸長打中對手 → 縮回收勢',
    hold: { propR: 'staff' }, events: [[0.42, 'staffHit']],
    keys: [
      { u: 0, j: {}, face: 'normal' },
      { u: 0.16, j: { chest: [-0.1, -0.5, 0], head: [0, 0.45, 0], upperArmR: [-2.9, 0, -0.3], forearmR: [-0.5, 0, 0], upperArmL: [-1.2, 0, 0.4], forearmL: [-1.0, 0, 0], thighR: [0.3, 0, 0], thighL: [-0.3, 0, 0], shinL: [0.3, 0, 0] }, face: 'determined' },
      { u: 0.32, j: { chest: [0.3, 0.35, 0], head: [-0.25, -0.3, 0], upperArmR: [-1.45, 0, -0.05], forearmR: [-0.05, 0, 0], handR: [1.35, 0, 0], upperArmL: [0.3, 0, 0.3], forearmL: [-0.6, 0, 0], thighL: [-0.6, 0, 0], shinL: [0.5, 0, 0], thighR: [0.45, 0, 0], shinR: [0.2, 0, 0] }, face: 'shout', hz: 0.15 },
      { u: 0.42, j: { chest: [0.3, 0.35, 0], head: [-0.25, -0.3, 0], upperArmR: [-1.45, 0, -0.05], forearmR: [-0.05, 0, 0], handR: [1.4, 0, 0], upperArmL: [0.3, 0, 0.3], forearmL: [-0.6, 0, 0], thighL: [-0.6, 0, 0], shinL: [0.5, 0, 0], thighR: [0.45, 0, 0], shinR: [0.2, 0, 0] }, face: 'shout', hz: 0.15, ext: 1.8 },
      { u: 0.6, j: { chest: [0.28, 0.33, 0], head: [-0.25, -0.3, 0], upperArmR: [-1.45, 0, -0.05], forearmR: [-0.05, 0, 0], handR: [1.4, 0, 0], upperArmL: [0.3, 0, 0.3], forearmL: [-0.6, 0, 0], thighL: [-0.6, 0, 0], shinL: [0.5, 0, 0], thighR: [0.45, 0, 0], shinR: [0.2, 0, 0] }, face: 'determined', hz: 0.15, ext: 1.8 },
      { u: 0.76, j: { chest: [0.1, 0.1, 0], head: [-0.05, -0.1, 0], upperArmR: [-0.8, 0, -0.1], forearmR: [-0.5, 0, 0], handR: [0.6, 0, 0], thighL: [-0.2, 0, 0], shinL: [0.2, 0, 0] }, face: 'normal', hz: 0.05, ext: 0 },
      { u: 1, j: {}, face: 'normal' },
    ],
  });

  // ============ C老猴：三連棍（大絕） ============
  const S = -TAU;   // 轉身一圈後 root 停在 -2π（與 0 同方向，循環接縫不跳）
  const combo = bake({
    id: 'staffCombo', name: '三連棍（大絕）', group: 'C老猴 招式', dur: 3.0, fps: 48,
    desc: '旋身一圈伸棍橫掃 → 躍起高舉、落地劈地（地面震動）→ 拉棍蓄力、伸長突刺 → 手腕轉棍兩圈收勢',
    hold: { propR: 'staff' }, events: [[0.22, 'staffHit'], [0.58, 'quake'], [0.8, 'staffHit']],
    keys: [
      { u: 0, j: {}, face: 'normal' },
      // 第一擊：旋身橫掃
      { u: 0.07, j: { root: [0, 0, 0], chest: [0.15, 0.7, 0], head: [0, -0.5, 0], upperArmR: [-0.4, 0, -1.2], forearmR: [-0.3, 0, 0], upperArmL: [-1.0, 0, 0.5], forearmL: [-1.2, 0, 0], thighL: [-0.45, 0, 0.1], thighR: [-0.45, 0, -0.1], shinL: [0.8, 0, 0], shinR: [0.8, 0, 0] }, face: 'determined' },
      { u: 0.16, j: { root: [0, S * 0.45, 0], chest: [0.1, -0.2, 0], upperArmR: [0, 0, -1.45], forearmR: [0, 0, 0], upperArmL: [0, 0, 1.2], forearmL: [-0.2, 0, 0], thighL: [-0.3, 0, 0.1], thighR: [-0.3, 0, -0.1], shinL: [0.6, 0, 0], shinR: [0.6, 0, 0] }, face: 'shout', air: 0.15, ext: 1.0 },
      { u: 0.28, j: { root: [0, S, 0], chest: [0.1, -0.3, 0], upperArmR: [0, 0, -1.45], forearmR: [0, 0, 0], upperArmL: [0, 0, 1.2], forearmL: [-0.2, 0, 0], thighL: [-0.3, 0, 0.1], thighR: [0.1, 0, -0.1], shinL: [0.5, 0, 0], shinR: [0.4, 0, 0] }, face: 'shout', air: 0, ext: 1.0 },
      // 第二擊：躍起劈地
      { u: 0.37, j: { root: [0, S, 0], chest: [0.25, 0, 0], head: [-0.25, 0, 0], upperArmR: [-3.0, 0, -0.2], forearmR: [-0.4, 0, 0], handR: [-0.3, 0, 0], upperArmL: [-2.6, 0, 0.5], forearmL: [-0.4, 0, 0], thighL: [-0.6, 0, 0.05], thighR: [-0.6, 0, -0.05], shinL: [1.0, 0, 0], shinR: [1.0, 0, 0] }, face: 'determined', ext: 0 },
      { u: 0.48, j: { root: [0, S, 0], chest: [-0.3, 0, 0], head: [-0.1, 0, 0], upperArmR: [-3.3, 0, -0.2], forearmR: [-0.3, 0, 0], handR: [-0.2, 0, 0], upperArmL: [-2.9, 0, 0.6], forearmL: [-0.3, 0, 0], thighL: [-1.0, 0, 0.05], thighR: [-1.0, 0, -0.05], shinL: [1.4, 0, 0], shinR: [1.4, 0, 0] }, face: 'shout', air: 0.6, ext: 0.5 },
      { u: 0.58, j: { root: [0, S, 0], chest: [0.55, 0, 0], head: [-0.4, 0, 0], upperArmR: [-1.2, 0, -0.05], forearmR: [0, 0, 0], handR: [1.0, 0, 0], upperArmL: [0.2, 0, 0.6], forearmL: [-0.4, 0, 0], thighL: [-0.9, 0, 0.05], shinL: [1.1, 0, 0], thighR: [0.2, 0, -0.05], shinR: [1.0, 0, 0] }, face: 'shout', ext: 1.4 },
      { u: 0.65, j: { root: [0, S, 0], chest: [0.5, 0, 0], head: [-0.4, 0, 0], upperArmR: [-1.2, 0, -0.05], forearmR: [0, 0, 0], handR: [1.0, 0, 0], upperArmL: [0.2, 0, 0.6], forearmL: [-0.4, 0, 0], thighL: [-0.9, 0, 0.05], shinL: [1.1, 0, 0], thighR: [0.2, 0, -0.05], shinR: [1.0, 0, 0] }, face: 'determined', ext: 1.4 },
      // 第三擊：伸棍突刺
      { u: 0.72, j: { root: [0, S, 0], chest: [0, -0.6, 0], head: [0, 0.5, 0], upperArmR: [-1.0, 0, -0.3], forearmR: [-1.6, 0, 0], handR: [1.4, 0, 0], upperArmL: [-1.4, 0, 0.2], forearmL: [-0.2, 0, 0], thighR: [0.3, 0, 0], thighL: [-0.3, 0, 0], shinL: [0.4, 0, 0] }, face: 'determined', ext: 0 },
      { u: 0.8, j: { root: [0, S, 0], chest: [0.25, 0.6, 0], head: [-0.2, -0.5, 0], upperArmR: [-1.55, 0, 0], forearmR: [0, 0, 0], handR: [1.5, 0, 0], upperArmL: [0.4, 0, 0.4], forearmL: [-0.5, 0, 0], thighL: [-0.8, 0, 0], shinL: [0.7, 0, 0], thighR: [0.5, 0, 0], shinR: [0.2, 0, 0] }, face: 'shout', hz: 0.25, ext: 2.4 },
      { u: 0.87, j: { root: [0, S, 0], chest: [0.25, 0.6, 0], head: [-0.2, -0.5, 0], upperArmR: [-1.55, 0, 0], forearmR: [0, 0, 0], handR: [1.5, 0, 0], upperArmL: [0.4, 0, 0.4], forearmL: [-0.5, 0, 0], thighL: [-0.8, 0, 0], shinL: [0.7, 0, 0], thighR: [0.5, 0, 0], shinR: [0.2, 0, 0] }, face: 'shout', hz: 0.25, ext: 2.4 },
      // 收勢：棍子縮回、手腕轉棍兩圈
      { u: 0.93, j: { root: [0, S, 0], chest: [0.05, 0.1, 0], upperArmR: [-1.2, 0, -0.2], forearmR: [-0.6, 0, 0], handR: [1.0, -TAU, 0] }, face: 'excited', hz: 0.1, ext: 0 },
      { u: 1, j: { root: [0, S, 0], handR: [0, -2 * TAU, 0] }, face: 'normal' },
    ],
  });

  const api = { kid: [fireSmall, fireBig], elder: [staffStrike, combo] };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MONKEY_ACTIONS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
