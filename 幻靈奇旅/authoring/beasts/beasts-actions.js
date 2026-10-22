// 火熊與貓娘的動作（輸出格式與 actions.baked.js 相同，可直接交給 buildClips）
//   主角骨架（貓娘三階、大熊）：關鍵姿勢內插，腳掌放平＋貼地；基本動作（站立、走、跑、受擊…）直接沿用主角的烘焙動作。
//   四足骨架（小熊、壯熊）：程序步態（走＝對角步、跑＝跳躍步）與關鍵姿勢，四隻腳掌自動貼地。
//   fx：火球蓄力（small）、噴火（breath）、火焰氣場（aura）；events：出手、爪擊、斬擊、震地等，由預覽頁產生特效。
(function (root) {
  const K = root.__KID_PARTS__, BE = root.BEASTS || require('./beasts-model.js');
  const { AT: HAT, LOCALP, OFF, ON } = K;
  const PI = Math.PI, TAU = 2 * PI;
  const ease = (t) => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;
  function rot([a, b, c], [x, y, z]) {
    const x1 = x * Math.cos(c) - y * Math.sin(c), y1 = x * Math.sin(c) + y * Math.cos(c);
    const x2 = x1 * Math.cos(b) + z * Math.sin(b), z2 = -x1 * Math.sin(b) + z * Math.cos(b);
    return [x2, y1 * Math.cos(a) - z2 * Math.sin(a), y1 * Math.sin(a) + z2 * Math.cos(a)];
  }
  const push = (tracks, node, k, v) => ((tracks[node] ||= {})[k] ||= []).push(v.map((x) => +x.toFixed(4)));
  function sampleKeys(keys, u, names, rest) {
    let i = 0;
    while (i < keys.length - 2 && u > keys[i + 1].u) i++;
    const a = keys[i], b = keys[i + 1], t = ease(Math.min(1, Math.max(0, (u - a.u) / (b.u - a.u))));
    const j = {};
    for (const n of names) { const va = a.j[n] || rest(n), vb = b.j[n] || rest(n); j[n] = va.map((v, k) => lerp(v, vb[k], t)); }
    const num = (k) => lerp(a[k] || 0, b[k] || 0, t);
    return { j, air: num('air'), hz: num('hz'), toe: num('toe'), face: t < 0.5 || !b.face ? a.face || 'normal' : b.face };
  }
  function retimeDef(def) {
    if (!def.retime) return def;
    const [r0, r1] = def.retime, f = (u) => (u <= r0 ? u * (r1 / r0) : r1 + (u - r0) * ((1 - r1) / (1 - r0)));
    return { ...def, keys: def.keys.map((k) => ({ ...k, u: f(k.u) })), events: (def.events || []).map(([u, t]) => [f(u), t]),
      fx: def.fx && { ...def.fx, from: f(def.fx.from), release: def.fx.release !== undefined ? f(def.fx.release) : undefined, to: def.fx.to !== undefined ? f(def.fx.to) : undefined } };
  }

  // ================= 主角骨架 =================
  const HJ = ['root', 'hips', 'chest', 'head', 'upperArmL', 'forearmL', 'handL', 'upperArmR', 'forearmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
  const HREST = { upperArmR: [0, 0, -0.08], upperArmL: [0, 0, 0.08], forearmR: [-0.15, 0, 0], forearmL: [-0.15, 0, 0] };
  const hrest = (j) => HREST[j] || [0, 0, 0];
  const HFOOT = { L: [[0.145, 0, -0.085], [0.145, 0, 0.175]], R: [[-0.145, 0, -0.085], [-0.145, 0, 0.175]] };
  const EXPR = {
    normal: { eye: 'eyeOpen', mouth: 'mouthSmile', brow: [0, 0, 0], by: 0 },
    excited: { eye: 'eyeOpen', mouth: 'mouthGrin', brow: [0, 0, 0], by: 0.008 },
    happy: { eye: 'eyeHappy', mouth: 'mouthGrin', brow: [0, 0, 0], by: 0.016 },
    determined: { eye: 'eyeOpen', mouth: 'mouthLine', brow: [0, 0, 0.32], by: -0.008, eyeY: 0.85 },
    shout: { eye: 'eyeOpen', mouth: 'mouthO', brow: [0, 0, 0.38], by: -0.008, eyeY: 0.9, mouthS: [1.5, 1.35, 1] },
    roar: { eye: 'eyeOpen', mouth: 'mouthGrin', brow: [0, 0, 0.38], by: -0.008, eyeY: 0.85, mouthS: [1.25, 1.3, 1] },
  };
  const EYES = ['eyeOpen', 'eyeHappy', 'eyeSad', 'eyeShut'], MOUTHS = ['mouthSmile', 'mouthGrin', 'mouthSad', 'mouthO', 'mouthLine'];
  function face(name) {
    const e = EXPR[name] || EXPR.normal, o = {};
    for (const sd of ['L', 'R']) for (const k of EYES) o[k + sd] = { s: k === e.eye ? [1, e.eyeY || 1, 1] : OFF };
    for (const k of MOUTHS) o[k] = { s: k === e.mouth ? (e.mouthS || ON) : OFF };
    o.browL = { p: [LOCALP.browL[0], LOCALP.browL[1] + e.by, LOCALP.browL[2]], r: e.brow.slice() };
    o.browR = { p: [LOCALP.browR[0], LOCALP.browR[1] + e.by, LOCALP.browR[2]], r: [e.brow[0], -e.brow[1], -e.brow[2]] };
    return o;
  }
  function footPoint(pose, sd, pt, legK = 1, shinK = 1) {
    let v = pt.slice();
    for (const j of ['foot' + sd, 'shin' + sd, 'thigh' + sd, 'hips']) {
      const at = HAT[j], p = j === 'hips' ? pose.hips.p : at, k = j.startsWith('thigh') ? legK : j.startsWith('shin') ? shinK : 1;   // 大腿在髖關節縮放、小腿再在膝關節縮放
      v = rot(pose[j].r, [(v[0] - at[0]) * k, (v[1] - at[1]) * k, (v[2] - at[2]) * k]);
      v = [v[0] + p[0], v[1] + p[1], v[2] + p[2]];
    }
    return v;
  }
  function bakeHero(def0, legK = 1, crouch = null, shinK = 1) {
    const legEff = (legK * (0.28 + 0.32 * shinK)) / 0.6;   // 整條腿的等效縮放（root 依此整體上移）
    let restMin = null;
    const def = retimeDef(def0), { dur, fps = 24 } = def, frames = Math.round(dur * fps), tracks = {};
    for (let i = 0; i <= frames; i++) {
      const u = (i % frames) / frames, s0 = def.pose ? def.pose(u) : sampleKeys(def.keys, u, HJ, hrest), pose = {};
      const s = { air: 0, hz: 0, face: 'normal', ...s0, j: Object.fromEntries(HJ.map((n) => [n, (s0.j[n] || hrest(n)).slice()])) };
      if (crouch) for (const sd of ['L', 'R']) { s.j['thigh' + sd][0] += crouch[0]; s.j['shin' + sd][0] += crouch[1]; }
      for (const n of HJ) pose[n] = { r: s.j[n] };
      for (const sd of ['L', 'R']) pose['foot' + sd].r = [-(pose.hips.r[0] + pose['thigh' + sd].r[0] + pose['shin' + sd].r[0]) + (s.toe || 0), 0, 0];   // toe > 0：腳尖朝下（飛行）
      pose.hips.p = [0, HAT.hips[1], s.hz];
      let minY = Infinity;
      for (const sd of ['L', 'R']) for (const p of HFOOT[sd]) minY = Math.min(minY, footPoint(pose, sd, p, legK, shinK)[1]);
      if (def.flying) {   // 飛行：身體高度只由 air 決定（以雙腿伸直站立時的落地高度為基準），腿弓起來不會讓身體掉下來
        if (restMin === null) { const rp = {}; for (const n of HJ) rp[n] = { r: hrest(n).slice() }; rp.hips.p = [0, HAT.hips[1], 0]; restMin = Infinity; for (const sd of ['L', 'R']) for (const p of HFOOT[sd]) restMin = Math.min(restMin, footPoint(rp, sd, p, legK, shinK)[1]); }
        minY = restMin;
      }
      pose.hips.p[1] += -minY - 0.6 * (legEff - 1) + s.air;   // root 已整體上下移 0.6×(legEff−1)
      for (const n of HJ) { if (n === 'hips') push(tracks, n, 'p', pose.hips.p); push(tracks, n, 'r', pose[n].r); }
      for (const [n, tr] of Object.entries(face(s.face))) for (const k of ['p', 'r', 's']) if (tr[k]) push(tracks, n, k, tr[k]);
      push(tracks, 'fxR', 's', OFF); push(tracks, 'fxL', 's', OFF); push(tracks, 'ball', 'p', HAT.ball); push(tracks, 'ball', 's', OFF);
      if (def.extra) for (const [n, tr] of Object.entries(def.extra(u))) for (const k of ['p', 'r', 's']) if (tr[k]) push(tracks, n, k, tr[k]);
    }
    return { id: def.id, name: def.name, group: def.group, frames, fps, desc: def.desc, hold: {}, events: def.events || [], tracks, fx: def.fx || null, noTrail: !!def.noTrail };
  }

  // ================= 四足骨架 =================
  const LEGS = ['FL', 'FR', 'BL', 'BR'];
  const QJ = ['root', 'body', 'head', 'jaw', 'tailFlame', ...LEGS.flatMap((l) => ['leg' + l, 'knee' + l, 'paw' + l])];
  function bakeQuad(def0, rigName) {
    const def = retimeDef(def0), rig = BE.RIGS[rigName], { AT, PARENT } = rig;
    const { dur, fps = 30 } = def, frames = Math.round(dur * fps), tracks = {};
    const fk = (pose, j0, pt) => { let v = pt.slice(); for (let j = j0; j && j !== 'root'; j = PARENT[j]) { const at = AT[j], p = (pose[j] && pose[j].p) || at; v = rot((pose[j] && pose[j].r) || [0, 0, 0], [v[0] - at[0], v[1] - at[1], v[2] - at[2]]); v = [v[0] + p[0], v[1] + p[1], v[2] + p[2]]; } return v; };
    for (let i = 0; i <= frames; i++) {
      const u = (i % frames) / frames;
      const s = def.pose ? def.pose(u) : sampleKeys(def.keys, u, QJ, () => [0, 0, 0]);
      const pose = {};
      for (const n of QJ) pose[n] = { r: (s.j[n] || [0, 0, 0]).slice() };
      for (const l of LEGS) pose['paw' + l].r = [-(pose.body.r[0] + pose['leg' + l].r[0] + pose['knee' + l].r[0]), 0, 0];   // 腳掌放平
      pose.body.p = [AT.body[0], AT.body[1], AT.body[2] + (s.hz || 0)];
      let minY = Infinity;
      for (const l of LEGS) minY = Math.min(minY, fk(pose, 'paw' + l, [AT['paw' + l][0], AT['paw' + l][1] - 0.075, AT['paw' + l][2] + 0.03])[1]);
      pose.body.p[1] += -minY + (s.air || 0);
      for (const n of QJ) { if (n === 'body') push(tracks, n, 'p', pose.body.p); push(tracks, n, 'r', pose[n].r); }
    }
    return { id: def.id, name: def.name, group: def.group, frames, fps, desc: def.desc, hold: {}, events: def.events || [], tracks, fx: def.fx || null };
  }
  // 步態：phase 依腳；front 腳的膝蓋往後折、後腳也往後折（抬腳）
  function gait(u, amp, knee, phases, extra = {}) {
    const f = TAU * u, j = {};
    for (const l of LEGS) { const p = f + phases[l]; j['leg' + l] = [-amp * Math.sin(p), 0, 0]; j['knee' + l] = [knee * Math.max(0, Math.cos(p)), 0, 0]; }
    return Object.assign(j, extra);
  }
  const legsAll = (o) => Object.fromEntries(LEGS.flatMap((l) => Object.entries(o).map(([k, v]) => [k + l, v])));
  function quadBasics(stage) {
    const big = stage === 2;
    return [
      { id: 'idle', name: '站立', group: '基本', dur: 3, desc: '呼吸起伏、轉頭張望、尾巴火焰搖曳',
        pose: (u) => { const f = TAU * u; return { j: { body: [0.02 * Math.sin(f), 0, 0], head: [0.06 * Math.sin(2 * f), 0.28 * Math.sin(f), 0.04 * Math.sin(f)], jaw: [0.06 + 0.06 * Math.sin(2 * f), 0, 0], tailFlame: [0.25 * Math.sin(2 * f), 0.2 * Math.sin(f), 0] } }; } },
      { id: 'walk', name: '行走', group: '基本', dur: big ? 1.3 : 1.1, desc: '對角步：左前右後一起、右前左後一起，頭跟著點',
        pose: (u) => { const f = TAU * u; return { j: gait(u, 0.38, 0.6, { FL: 0, BR: 0, FR: PI, BL: PI }, { body: [0.025 * Math.sin(2 * f), 0.05 * Math.sin(f), 0.03 * Math.sin(f)], head: [0.06 * Math.sin(2 * f), -0.06 * Math.sin(f), 0], tailFlame: [0.3 * Math.sin(2 * f), 0.25 * Math.sin(f), 0] }), air: 0.015 * Math.abs(Math.sin(2 * f)) }; } },
      { id: 'run', name: '跑步', group: '基本', dur: big ? 0.7 : 0.6, desc: '跳躍步：前腳一起、後腳一起，身體前後起伏',
        pose: (u) => { const f = TAU * u; return { j: gait(u, 0.72, 0.95, { FL: 0, FR: 0.5, BL: PI, BR: PI + 0.5 }, { body: [0.13 * Math.sin(f), 0, 0], head: [-0.1 * Math.sin(f), 0, 0], tailFlame: [0.4 * Math.sin(f), 0, 0] }), air: 0.08 * Math.max(0, Math.sin(f + PI / 2)) }; } },
      { id: 'react', name: '咆哮', group: '基本', dur: 1.8, desc: '前半身微微抬起、仰頭張大嘴咆哮、甩頭',
        keys: [{ u: 0, j: {} }, { u: 0.3, j: { body: [-0.32, 0, 0], head: [-0.4, 0, 0], jaw: [0.65, 0, 0], ...legsAll({ leg: [0, 0, 0] }), legFL: [-0.3, 0, 0], legFR: [-0.3, 0, 0], legBL: [0.32, 0, 0], legBR: [0.32, 0, 0] } },
          { u: 0.55, j: { body: [-0.3, 0, 0], head: [-0.3, 0.3, 0], jaw: [0.6, 0, 0], legFL: [-0.3, 0, 0], legFR: [-0.3, 0, 0], legBL: [0.3, 0, 0], legBR: [0.3, 0, 0] } },
          { u: 0.75, j: { body: [-0.1, 0, 0], head: [-0.1, -0.3, 0], jaw: [0.4, 0, 0], legBL: [0.1, 0, 0], legBR: [0.1, 0, 0] } }, { u: 1, j: {} }] },
      { id: 'hurt', name: '受擊', group: '受擊', dur: 1.0, desc: '被擊中往後縮、低頭甩頭，再站穩',
        keys: [{ u: 0, j: {} }, { u: 0.15, j: { body: [0.22, 0.1, 0.05], head: [0.45, 0.25, 0.1], jaw: [0.35, 0, 0], kneeFL: [0.4, 0, 0], kneeFR: [0.4, 0, 0] }, hz: -0.18 },
          { u: 0.45, j: { body: [0.08, -0.05, 0], head: [0.1, -0.2, 0], jaw: [0.1, 0, 0] }, hz: -0.1 }, { u: 1, j: {} }] },
    ];
  }

  // ================= 招式 =================
  const SW = (on) => ({ s: on ? ON : OFF });
  const MOVES = {
    // ---- 小熊 ----
    bear1: [
      { id: 'attack', name: '火爪拍（普攻）', group: '招式', dur: 1.3, desc: '後腳撐地立起、右前掌高舉 → 帶火的爪子往前下方拍出三道火爪痕',
        events: [[0.42, 'clawFire']],
        keys: [{ u: 0, j: {} },
          { u: 0.25, j: { body: [-0.55, 0, 0], head: [0.25, 0, 0], jaw: [0.4, 0, 0], legFR: [-1.7, 0, -0.35], kneeFR: [-0.6, 0, 0], legFL: [-0.5, 0, 0], kneeFL: [0.4, 0, 0], legBL: [0.5, 0, 0], legBR: [0.5, 0, 0] } },
          { u: 0.42, j: { body: [-0.15, 0, 0], head: [0.1, 0, 0], jaw: [0.55, 0, 0], legFR: [-0.55, 0.2, 0.3], kneeFR: [0.15, 0, 0], legFL: [-0.2, 0, 0], legBL: [0.15, 0, 0], legBR: [0.15, 0, 0] }, hz: 0.12 },
          { u: 0.62, j: { body: [-0.08, 0, 0], head: [0, 0, 0], jaw: [0.3, 0, 0], legFR: [-0.3, 0, 0.1] }, hz: 0.1 },
          { u: 1, j: {} }] },
      { id: 'ultimate', name: '烈焰咆哮（大絕）', group: '招式', dur: 2.6, desc: '後退蓄力 → 仰頭吸氣 → 張大嘴朝前方噴出火焰，左右掃過 → 收口',
        fx: { kind: 'breath', from: 0.4, to: 0.82 },
        keys: [{ u: 0, j: {} },
          { u: 0.15, j: { body: [0.12, 0, 0], head: [0.25, 0, 0], kneeFL: [0.45, 0, 0], kneeFR: [0.45, 0, 0], legBL: [-0.15, 0, 0], legBR: [-0.15, 0, 0] }, hz: -0.1 },
          { u: 0.3, j: { body: [-0.3, 0, 0], head: [-0.55, 0, 0], jaw: [0.15, 0, 0], legBL: [0.3, 0, 0], legBR: [0.3, 0, 0] }, hz: -0.05 },
          { u: 0.42, j: { body: [0.05, 0, 0], head: [0.08, 0, 0], jaw: [0.8, 0, 0], legFL: [-0.15, 0, 0], legFR: [-0.15, 0, 0] }, hz: 0.1 },
          { u: 0.58, j: { body: [0.05, 0.1, 0], head: [0.08, 0.3, 0], jaw: [0.8, 0, 0], legFL: [-0.15, 0, 0], legFR: [-0.15, 0, 0] }, hz: 0.1 },
          { u: 0.74, j: { body: [0.05, -0.1, 0], head: [0.08, -0.3, 0], jaw: [0.8, 0, 0], legFL: [-0.15, 0, 0], legFR: [-0.15, 0, 0] }, hz: 0.1 },
          { u: 0.86, j: { body: [0, 0, 0], head: [0, 0, 0], jaw: [0.15, 0, 0] }, hz: 0.04 },
          { u: 1, j: {} }] },
    ],
    // ---- 壯熊 ----
    bear2: [
      { id: 'attack', name: '火焰衝撞（普攻）', group: '招式', dur: 1.5, desc: '壓低身體蓄力、全身冒火 → 低頭往前猛衝撞擊 → 退回原位',
        fx: { kind: 'aura', from: 0.15, to: 0.58 }, events: [[0.45, 'impact']],
        keys: [{ u: 0, j: {} },
          { u: 0.22, j: { body: [0.16, 0, 0], head: [0.35, 0, 0], kneeFL: [0.5, 0, 0], kneeFR: [0.5, 0, 0], legBL: [-0.35, 0, 0], legBR: [-0.35, 0, 0], kneeBL: [0.4, 0, 0], kneeBR: [0.4, 0, 0] }, hz: -0.15 },
          { u: 0.42, j: { body: [0.18, 0, 0], head: [0.45, 0, 0], jaw: [0.3, 0, 0], legFL: [-0.75, 0, 0], legFR: [-0.6, 0, 0], legBL: [0.6, 0, 0], legBR: [0.5, 0, 0], kneeBL: [0.2, 0, 0], kneeBR: [0.2, 0, 0] }, hz: 0.9, air: 0.08 },
          { u: 0.58, j: { body: [0.05, 0, 0], head: [0.1, 0, 0], jaw: [0.4, 0, 0], legFL: [-0.3, 0, 0], legFR: [-0.3, 0, 0] }, hz: 0.85 },
          { u: 1, j: {} }] },
      { id: 'ultimate', name: '熔岩震地（大絕）', group: '招式', dur: 3.0, desc: '後腳站起、張開前掌仰天怒吼 → 雙掌重重拍地 → 地面震動、周圍噴出一圈火柱',
        fx: { kind: 'aura', from: 0.15, to: 0.5 }, events: [[0.5, 'quake'], [0.53, 'pillars']],
        keys: [{ u: 0, j: {} },
          { u: 0.12, j: { body: [0.1, 0, 0], head: [0.2, 0, 0], kneeFL: [0.4, 0, 0], kneeFR: [0.4, 0, 0], kneeBL: [0.3, 0, 0], kneeBR: [0.3, 0, 0] } },
          { u: 0.3, j: { body: [-1.15, 0, 0], head: [0.5, 0, 0], jaw: [0.75, 0, 0], legFL: [-0.6, 0, 0.55], legFR: [-0.6, 0, -0.55], kneeFL: [-0.5, 0, 0], kneeFR: [-0.5, 0, 0], legBL: [1.1, 0, 0], legBR: [1.1, 0, 0], kneeBL: [-0.05, 0, 0], kneeBR: [-0.05, 0, 0] } },
          { u: 0.42, j: { body: [-1.2, 0, 0], head: [0.6, 0.2, 0], jaw: [0.8, 0, 0], legFL: [-0.8, 0, 0.6], legFR: [-0.8, 0, -0.6], kneeFL: [-0.6, 0, 0], kneeFR: [-0.6, 0, 0], legBL: [1.15, 0, 0], legBR: [1.15, 0, 0] } },
          { u: 0.5, j: { body: [0.12, 0, 0], head: [0.3, 0, 0], jaw: [0.5, 0, 0], legFL: [-0.45, 0, 0], legFR: [-0.45, 0, 0], kneeFL: [0.1, 0, 0], kneeFR: [0.1, 0, 0], legBL: [-0.2, 0, 0], legBR: [-0.2, 0, 0], kneeBL: [0.5, 0, 0], kneeBR: [0.5, 0, 0] }, hz: 0.2 },
          { u: 0.7, j: { body: [0.08, 0, 0], head: [-0.2, 0, 0], jaw: [0.7, 0, 0], legFL: [-0.4, 0, 0], legFR: [-0.4, 0, 0], legBL: [-0.15, 0, 0], legBR: [-0.15, 0, 0], kneeBL: [0.4, 0, 0], kneeBR: [0.4, 0, 0] }, hz: 0.2 },
          { u: 1, j: {} }] },
    ],
    // ---- 大熊（主角骨架）----
    bear3: [
      { id: 'attack', name: '霸體（普攻）', group: '招式', dur: 2.2, desc: '雙臂交叉於胸前蓄力 → 張開雙臂仰天怒吼，全身微微發光、毛色變亮：攻擊、防禦各提升 30%，持續 2 回合',
        buff: { atk: 0.3, def: 0.3, turns: 2 }, events: [[0.42, 'armor']],
        keys: [{ u: 0, j: {}, face: 'normal' },
          { u: 0.2, j: { chest: [0.25, 0, 0], head: [0.2, 0, 0], upperArmR: [-1.2, 0, 0.35], upperArmL: [-1.2, 0, -0.35], forearmR: [-1.9, 0, 0], forearmL: [-1.9, 0, 0], thighL: [-0.18, 0, 0.1], thighR: [-0.18, 0, -0.1], shinL: [0.3, 0, 0], shinR: [0.3, 0, 0] }, face: 'determined' },
          { u: 0.42, j: { chest: [-0.2, 0, 0], head: [-0.35, 0, 0], upperArmR: [0.25, 0, -0.6], upperArmL: [0.25, 0, 0.6], forearmR: [-1.0, 0, 0], forearmL: [-1.0, 0, 0], handR: [0.3, 0, 0], handL: [0.3, 0, 0], thighL: [-0.12, 0, 0.22], thighR: [-0.12, 0, -0.22], shinL: [0.25, 0, 0], shinR: [0.25, 0, 0] }, face: 'roar' },
          { u: 0.72, j: { chest: [-0.16, 0.04, 0.02], head: [-0.3, 0, 0], upperArmR: [0.22, 0, -0.62], upperArmL: [0.22, 0, 0.62], forearmR: [-1.05, 0, 0], forearmL: [-1.05, 0, 0], handR: [0.3, 0, 0], handL: [0.3, 0, 0], thighL: [-0.12, 0, 0.22], thighR: [-0.12, 0, -0.22], shinL: [0.25, 0, 0], shinR: [0.25, 0, 0] }, face: 'roar' },
          { u: 0.88, j: { chest: [0.05, 0, 0], upperArmR: [0, 0, -0.3], upperArmL: [0, 0, 0.3], forearmR: [-0.6, 0, 0], forearmL: [-0.6, 0, 0] }, face: 'determined' },
          { u: 1, j: {}, face: 'normal' }] },
      { id: 'ultimate', name: '熔岩大劍（大絕）', group: '招式', dur: 3.2, desc: '從背上拔出大劍 → 雙手高舉躍起 → 落地劈下，地面震裂、一排火柱往前噴發 → 收劍回背',
        events: [[0.58, 'quake'], [0.6, 'flameWave']],
        extra: (u) => ({ swordBack: SW(u < 0.18 || u >= 0.88), swordHandR: SW(u >= 0.18 && u < 0.88) }),
        keys: [{ u: 0, j: {}, face: 'normal' },
          { u: 0.14, j: { chest: [0, -0.2, 0], head: [0, 0.2, 0], upperArmR: [-2.9, 0, -0.3], forearmR: [-2.0, 0, 0] }, face: 'determined' },
          { u: 0.32, j: { chest: [-0.15, 0, 0], head: [-0.2, 0, 0], upperArmR: [-3.0, 0, -0.15], upperArmL: [-3.0, 0, 0.15], forearmR: [-0.6, 0, 0], forearmL: [-0.6, 0, 0], handR: [-0.3, 0, 0], thighL: [-0.4, 0, 0.05], thighR: [-0.4, 0, -0.05], shinL: [0.7, 0, 0], shinR: [0.7, 0, 0] }, face: 'roar' },
          { u: 0.46, j: { chest: [-0.25, 0, 0], head: [-0.1, 0, 0], upperArmR: [-3.1, 0, -0.15], upperArmL: [-3.1, 0, 0.15], forearmR: [-0.5, 0, 0], forearmL: [-0.5, 0, 0], handR: [-0.2, 0, 0], thighL: [-0.9, 0, 0], thighR: [-0.9, 0, 0], shinL: [1.2, 0, 0], shinR: [1.2, 0, 0] }, face: 'shout', air: 0.7, hz: 0.1 },
          { u: 0.58, j: { chest: [0.5, 0, 0], head: [-0.35, 0, 0], upperArmR: [-1.0, 0, -0.05], upperArmL: [-1.0, 0, 0.05], forearmR: [-0.1, 0, 0], forearmL: [-0.1, 0, 0], handR: [1.1, 0, 0], thighL: [-0.8, 0, 0], shinL: [1.0, 0, 0], thighR: [0.3, 0, 0], shinR: [0.9, 0, 0] }, face: 'roar', hz: 0.2 },
          { u: 0.74, j: { chest: [0.45, 0, 0], head: [-0.35, 0, 0], upperArmR: [-1.0, 0, -0.05], upperArmL: [-1.0, 0, 0.05], forearmR: [-0.1, 0, 0], forearmL: [-0.1, 0, 0], handR: [1.1, 0, 0], thighL: [-0.8, 0, 0], shinL: [1.0, 0, 0], thighR: [0.3, 0, 0], shinR: [0.9, 0, 0] }, face: 'determined', hz: 0.2 },
          { u: 0.86, j: { chest: [0, -0.2, 0], upperArmR: [-2.9, 0, -0.3], forearmR: [-2.0, 0, 0] }, face: 'normal', hz: 0.05 },
          { u: 1, j: {}, face: 'normal' }] },
    ],
    // ---- 小貓娘 ----
    cat1: [
      { id: 'attack', name: '貓貓拳（普攻）', group: '招式', dur: 1.1, desc: '側身拉拳 → 跨步出拳，肉球印「啪」地打出 → 舉起貓掌賣萌',
        events: [[0.42, 'paw']],
        keys: [{ u: 0, j: {}, face: 'normal' },
          { u: 0.2, j: { chest: [0.05, -0.45, 0], head: [0, 0.35, 0], upperArmR: [-0.5, 0, -0.25], forearmR: [-1.9, 0, 0], upperArmL: [-1.0, 0, 0.25], forearmL: [-1.6, 0, 0], thighL: [-0.3, 0, 0], shinL: [0.4, 0, 0], thighR: [0.15, 0, 0], shinR: [0.3, 0, 0] }, face: 'excited' },
          { u: 0.4, j: { chest: [0.12, 0.45, 0], head: [-0.05, -0.35, 0], upperArmR: [-1.55, 0, -0.05], forearmR: [-0.05, 0, 0], upperArmL: [-0.4, 0, 0.3], forearmL: [-1.7, 0, 0], thighL: [-0.5, 0, 0], shinL: [0.35, 0, 0], thighR: [0.35, 0, 0], shinR: [0.15, 0, 0] }, face: 'shout', hz: 0.12 },
          { u: 0.55, j: { chest: [0.1, 0.4, 0], head: [-0.05, -0.3, 0], upperArmR: [-1.5, 0, -0.05], forearmR: [-0.1, 0, 0], upperArmL: [-0.4, 0, 0.3], forearmL: [-1.7, 0, 0], thighL: [-0.5, 0, 0], shinL: [0.35, 0, 0], thighR: [0.35, 0, 0], shinR: [0.15, 0, 0] }, face: 'excited', hz: 0.12 },
          { u: 0.8, j: { head: [0, 0, 0.18], upperArmR: [-2.5, 0, -0.45], forearmR: [-1.7, 0, 0], upperArmL: [-0.3, 0, 0.2] }, face: 'happy', hz: 0.04 },
          { u: 1, j: {}, face: 'normal' }] },
      { id: 'ultimate', name: '貓爪亂舞（大絕）', group: '招式', dur: 2.6, desc: '左右貓掌連抓四下 → 壓低蓄力 → 撲向前方，雙掌拍地印出大肉球印',
        events: [[0.16, 'claw'], [0.32, 'claw'], [0.48, 'claw'], [0.64, 'claw'], [0.9, 'pounce']],
        keys: (() => {
          const up = (sd) => (sd === 'R' ? { upperArmR: [-2.4, 0, -0.5], forearmR: [-0.8, 0, 0] } : { upperArmL: [-2.4, 0, 0.5], forearmL: [-0.8, 0, 0] });
          const sw = (sd) => (sd === 'R' ? { upperArmR: [-0.9, 0, 0.3], forearmR: [-0.3, 0, 0], chest: [0.1, 0.35, 0] } : { upperArmL: [-0.9, 0, -0.3], forearmL: [-0.3, 0, 0], chest: [0.1, -0.35, 0] });
          const stance = { thighL: [-0.35, 0, 0.08], thighR: [-0.1, 0, -0.08], shinL: [0.5, 0, 0], shinR: [0.4, 0, 0] };
          const ks = [{ u: 0, j: {}, face: 'normal' }, { u: 0.08, j: { ...stance, ...up('R'), ...up('L') }, face: 'determined' }];
          [['R', 0.16], ['L', 0.32], ['R', 0.48], ['L', 0.64]].forEach(([sd, t], i) => {
            const other = sd === 'R' ? 'L' : 'R';
            ks.push({ u: t, j: { ...stance, ...sw(sd), ...up(other) }, face: i % 2 ? 'shout' : 'excited', hz: 0.04 * (i + 1) });
            if (i < 3) ks.push({ u: t + 0.08, j: { ...stance, ...up(sd), ...sw(other), chest: [0.1, 0, 0] }, face: 'excited', hz: 0.04 * (i + 1) });
          });
          ks.push({ u: 0.74, j: { chest: [0.45, 0, 0], upperArmR: [0.6, 0, -0.3], upperArmL: [0.6, 0, 0.3], forearmR: [-0.6, 0, 0], forearmL: [-0.6, 0, 0], thighL: [-0.85, 0, 0.1], thighR: [-0.85, 0, -0.1], shinL: [1.35, 0, 0], shinR: [1.35, 0, 0] }, face: 'determined', hz: 0.16 },
            { u: 0.83, j: { chest: [0.3, 0, 0], upperArmR: [-2.6, 0, -0.3], upperArmL: [-2.6, 0, 0.3], forearmR: [-0.4, 0, 0], forearmL: [-0.4, 0, 0], thighL: [0.3, 0, 0], thighR: [0.3, 0, 0], shinL: [0.6, 0, 0], shinR: [0.6, 0, 0] }, face: 'shout', air: 0.45, hz: 0.5 },
            { u: 0.9, j: { chest: [0.7, 0, 0], head: [-0.4, 0, 0], upperArmR: [-1.1, 0, -0.2], upperArmL: [-1.1, 0, 0.2], forearmR: [-0.2, 0, 0], forearmL: [-0.2, 0, 0], thighL: [-0.9, 0, 0.1], thighR: [-0.9, 0, -0.1], shinL: [1.35, 0, 0], shinR: [1.35, 0, 0] }, face: 'excited', hz: 0.7 },
            { u: 1, j: {}, face: 'normal' });
          return ks;
        })() },
    ],
    // ---- 靈貓姬 ----
    cat2: [
      { id: 'attack', name: '疾風斬（普攻）', group: '招式', dur: 1.2, desc: '側身把彎刀拉到右側 → 跨步由右往左橫斬，留下紅色刀光',
        events: [[0.38, 'slash']], noTrail: true,
        keys: [{ u: 0, j: {}, face: 'normal' },
          { u: 0.22, j: { chest: [0, -0.6, 0], head: [0, 0.5, 0], upperArmR: [-0.6, 0, -1.3], forearmR: [-0.4, 0, 0], handR: [1.2, 0, 0], upperArmL: [-1.2, 0, 0.4], forearmL: [-1.3, 0, 0], thighR: [0.25, 0, 0], thighL: [-0.35, 0, 0], shinL: [0.4, 0, 0] }, face: 'determined' },
          { u: 0.42, j: { chest: [0.15, 0.6, 0], head: [-0.1, -0.5, 0], upperArmR: [-1.4, 0, 0.6], forearmR: [-0.1, 0, 0], handR: [1.3, 0, 0], upperArmL: [0.3, 0, 0.4], forearmL: [-0.6, 0, 0], thighL: [-0.7, 0, 0], shinL: [0.6, 0, 0], thighR: [0.4, 0, 0], shinR: [0.2, 0, 0] }, face: 'shout', hz: 0.25 },
          { u: 0.6, j: { chest: [0.12, 0.55, 0], head: [-0.1, -0.45, 0], upperArmR: [-1.3, 0, 0.55], forearmR: [-0.15, 0, 0], handR: [1.3, 0, 0], upperArmL: [0.3, 0, 0.4], forearmL: [-0.6, 0, 0], thighL: [-0.7, 0, 0], shinL: [0.6, 0, 0], thighR: [0.4, 0, 0], shinR: [0.2, 0, 0] }, face: 'determined', hz: 0.25 },
          { u: 1, j: {}, face: 'normal' }] },
      { id: 'ultimate', name: '月牙三連斬（大絕）', group: '招式', use: 'knifeCombo', desc: '橫斬 → 反手回斬 → 弓步突刺，彎刀拖出一道道紅色刀光' },
    ],
    // ---- 雙刃貓女 ----
    cat3: [
      { id: 'attack', name: '雙刃橫斬（普攻）', group: '招式', dur: 1.3, desc: '轉身把雙刀拉到右側蓄力 → 跨步雙刀一起由右往左水平橫掃，斬出一大道紅色水平刀光',
        events: [[0.42, 'slashBig']], noTrail: true,
        keys: [{ u: 0, j: {}, face: 'normal' },
          { u: 0.24, j: { chest: [0, -0.7, 0], head: [0, 0.55, 0], upperArmR: [-0.7, 0, -1.2], forearmR: [-0.55, 0, 0], handR: [1.1, 0, 0], upperArmL: [-1.35, 0, -0.55], forearmL: [-0.9, 0, 0], handL: [1.1, 0, 0], thighR: [0.2, 0, -0.05], thighL: [-0.3, 0, 0.05], shinL: [0.35, 0, 0] }, face: 'determined' },
          { u: 0.44, j: { chest: [0.12, 0.7, 0], head: [-0.1, -0.55, 0], upperArmR: [-1.4, 0, 0.55], forearmR: [-0.45, 0, 0], handR: [1.2, 0, 0], upperArmL: [-0.75, 0, 1.15], forearmL: [-0.5, 0, 0], handL: [1.2, 0, 0], thighL: [-0.7, 0, 0.05], shinL: [0.6, 0, 0], thighR: [0.4, 0, -0.05], shinR: [0.25, 0, 0] }, face: 'shout', hz: 0.3 },
          { u: 0.64, j: { chest: [0.1, 0.65, 0], head: [-0.1, -0.5, 0], upperArmR: [-1.35, 0, 0.5], forearmR: [-0.5, 0, 0], handR: [1.15, 0, 0], upperArmL: [-0.7, 0, 1.1], forearmL: [-0.55, 0, 0], handL: [1.15, 0, 0], thighL: [-0.7, 0, 0.05], shinL: [0.6, 0, 0], thighR: [0.4, 0, -0.05], shinR: [0.25, 0, 0] }, face: 'determined', hz: 0.3 },
          { u: 1, j: {}, face: 'normal' }] },
      { id: 'ultimate', name: '影刃旋風（大絕）', group: '招式', use: 'bladesCombo', desc: '右刃橫斬 → 左刃橫斬 → 展臂旋轉一圈後交叉斬，雙刃拖出紅色刀光' },
    ],
  };

  const HERO_BASIC = { idle: '站立', walk: '行走', run: '跑步', wave: '打招呼', cheer1: '歡呼', hurt: '受擊' };
  const KA = () => (root.KID_BLUEPRINT && root.KID_BLUEPRINT.ACTIONS) || [];
  const heroBasics = (ids) => ids.map((id) => KA().find((x) => x.id === id)).filter(Boolean).map((x) => ({ ...x, name: HERO_BASIC[x.id] || x.name }));
  // 微蹲：大腿往前、小腿彎、腳掌放平，髖部依靜止姿勢算出的下沉量整體下移
  function crouchClip(src, [ct, cs], legK) {
    const rest = {}; for (const n of HJ) rest[n] = { r: hrest(n).slice() };
    for (const sd of ['L', 'R']) { rest['thigh' + sd].r[0] += ct; rest['shin' + sd].r[0] += cs; rest['foot' + sd].r = [-(ct + cs), 0, 0]; }
    rest.hips.p = HAT.hips.slice();
    let minY = Infinity; for (const sd of ['L', 'R']) for (const p of HFOOT[sd]) minY = Math.min(minY, footPoint(rest, sd, p, legK)[1]);
    const drop = minY - 0.6 * (1 - legK);   // 彎腿後腳底比站直時高出的量＝髖部要下沉的量
    const out = JSON.parse(JSON.stringify(src)), T = out.tracks;
    for (const sd of ['L', 'R']) {
      if (T['thigh' + sd]) T['thigh' + sd].r = T['thigh' + sd].r.map((v) => [v[0] + ct, v[1], v[2]]);
      if (T['shin' + sd]) T['shin' + sd].r = T['shin' + sd].r.map((v) => [v[0] + cs, v[1], v[2]]);
      if (T['foot' + sd]) T['foot' + sd].r = T['foot' + sd].r.map((v) => [v[0] - ct - cs, v[1], v[2]]);
    }
    T.hips.p = T.hips.p.map((v) => [v[0], v[1] - drop, v[2]]);
    return out;
  }
  // 雙刃貓女：模特兒台步（站姿重心在一腳、走路雙腳踩在一直線上、擺臀、手臂小幅擺動）
  const CATWALK = [
    { id: 'idle', name: '站立（模特兒站姿）', group: '基本', dur: 4, desc: '身體端正、雙腳微開與肩同寬，雙刀自然垂在身側，輕輕呼吸、轉頭',
      pose: (u) => { const f = TAU * u; return { face: 'normal', j: {
        hips: [0, 0, 0], chest: [0.02 * Math.sin(f), 0, 0], head: [-0.04, 0.12 * Math.sin(f), 0],
        thighR: [0, 0, -0.035], shinR: [0, 0, 0], thighL: [0, 0, 0.035], shinL: [0, 0, 0],
        upperArmR: [0.1, 0, -0.16], forearmR: [-0.35, 0, 0], handR: [0.5, 0, 0],
        upperArmL: [0.04 + 0.02 * Math.sin(f), 0, 0.12], forearmL: [-0.3, 0, 0], handL: [0.5, 0, 0] } }; } },
    { id: 'walk', name: '行走（台步）', group: '基本', dur: 1.25, desc: '步伐窄而穩、雙腳各走各的不重疊，骨盆左右擺、肩膀反向轉，手臂小幅擺動，頭部保持平穩',
      pose: (u) => { const f = TAU * u, sw = Math.sin(f), kn = (p) => 0.62 * Math.pow(Math.max(0, Math.cos(p)), 1.4); return { face: 'normal', j: {
        hips: [0, -0.12 * sw, 0.045 * sw], chest: [0.02, 0.16 * sw, -0.03 * sw], head: [-0.04, -0.05 * sw, 0.02 * sw],
        thighL: [-0.42 * sw, 0, 0.0], shinL: [kn(f), 0, 0], thighR: [0.42 * sw, 0, 0.0], shinR: [kn(f + PI), 0, 0],
        upperArmL: [0.3 * sw, 0, 0.12], forearmL: [-0.3 - 0.1 * Math.max(0, -sw), 0, 0], upperArmR: [-0.3 * sw, 0, -0.12], forearmR: [-0.3 - 0.1 * Math.max(0, sw), 0, 0] } }; } },
    { id: 'run', name: '跑步', group: '基本', dur: 0.62, desc: '身體前傾、高抬膝大步跑，雙腳分開落地，手臂彎肘前後擺',
      pose: (u) => { const f = TAU * u, sw = Math.sin(f), kn = (p) => 0.25 + 1.05 * Math.max(0, Math.cos(p)); return { face: 'determined', air: 0.05 * Math.max(0, Math.sin(2 * f)), j: {
        hips: [0.08, -0.12 * sw, 0.04 * sw], chest: [0.16, 0.16 * sw, 0], head: [-0.14, -0.08 * sw, 0],
        thighL: [-0.85 * sw - 0.1, 0, 0.03], shinL: [kn(f), 0, 0], thighR: [0.85 * sw - 0.1, 0, -0.03], shinR: [kn(f + PI), 0, 0],
        upperArmL: [0.65 * sw, 0, 0.1], forearmL: [-1.25, 0, 0], upperArmR: [-0.65 * sw, 0, -0.1], forearmR: [-1.25, 0, 0] } }; } },
  ];
  // 持刀角色的打招呼：右臂由肩膀整隻舉到側上方、以肩為軸左右揮，手腕翻轉讓刀尖朝後；左手放鬆
  const BLADE_WAVE = { id: 'wave', name: '打招呼', group: '基本', dur: 1.6, desc: '右臂從前方往上抬起、以肩膀為軸左右揮，手肘往頭的方向彎，刀尖朝後，頭微歪、開心笑',
    pose: (u) => { const f = TAU * u * 2, k = Math.sin(f); return { face: 'happy', j: {
      chest: [0, -0.08, 0.04 * k], head: [0, 0.1, 0.12],
      upperArmR: [-2.55, 0, -0.35 + 0.22 * k], forearmR: [-0.45 - 0.12 * k, 0, 0], handR: [0, 0, 0],
      upperArmL: [0.05, 0, 0.14], forearmL: [-0.3, 0, 0], handL: [0.5, 0, 0] } }; } };
  // 主角的動作是用「標準腿長」烘焙的；腿長縮放的角色（貓女、大熊）要依腿長重新算腳底貼地：
  // 髖部高度 += -(縮放後腳底 − 原腳底) − 0.6×(legK−1)（root 另外整體上移 0.6×(legK−1)）
  function reground(act, legK) {
    if (!legK || legK === 1 || act.legK) return act;
    const out = JSON.parse(JSON.stringify(act)); out.legK = legK;
    const T = out.tracks;
    for (let i = 0; i <= act.frames; i++) {
      const pose = {};
      for (const j of ['hips', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR']) pose[j] = { r: T[j].r[i] };
      pose.hips.p = T.hips.p[i];
      let m1 = Infinity, mk = Infinity;
      for (const sd of ['L', 'R']) for (const p of HFOOT[sd]) { m1 = Math.min(m1, footPoint(pose, sd, p, 1)[1]); mk = Math.min(mk, footPoint(pose, sd, p, legK)[1]); }
      T.hips.p[i][1] += -(mk - m1) - 0.6 * (legK - 1);
    }
    return out;
  }
  const useMove = (m, legK) => reground({ ...JSON.parse(JSON.stringify(KA().find((x) => x.id === m.use))), id: m.use, name: m.name, desc: m.desc, group: m.group }, legK);
  // ================= 水仙子（飛行） =================
  const HOVER = 0.75, TOE = 0.85;   // 飄浮高度（骨架單位）、腳尖朝下角度
  // 翅膀拍動（關節旋轉 = 拍動量）＋環繞的水球整圈旋轉（每個動作整數圈，循環不跳）
  function wingPose(u, amp, cyc, flare = 0) {
    const f = TAU * cyc * u, a1 = amp * Math.sin(f), b1 = amp * 0.8 * Math.sin(f + 1.4);
    return {
      wingUL: { r: [0, a1 - flare, 0.1 * a1] }, wingUR: { r: [0, -(a1 - flare), -0.1 * a1] },
      wingLL: { r: [0, b1 - flare * 0.8, -0.1 * b1] }, wingLR: { r: [0, -(b1 - flare * 0.8), 0.1 * b1] },
    };
  }
  const orbit = (u, dur) => ({ bubbleOrbit: { r: [0, TAU * Math.max(1, Math.round(dur * 0.35)) * u, 0] } });
  const fly = (dur, amp, cyc, flare) => (u) => ({ ...wingPose(u, amp, cyc, typeof flare === 'function' ? flare(u) : flare), ...orbit(u, dur) });
  // 垂下的雙腿（腳尖朝下）：左腳略前、右腳略後，膝蓋微彎
  const DANGLE = { thighL: [-0.2, 0, 0.05], shinL: [0.55, 0, 0], thighR: [0.1, 0, -0.05], shinR: [0.8, 0, 0] };
  const TUCK = { thighL: [-0.95, 0, 0.12], shinL: [1.55, 0, 0], thighR: [-0.7, 0, -0.12], shinR: [1.75, 0, 0] };   // 招式時整條腿弓起來
  const withLegs = (keys, base = DANGLE) => keys.map((k) => ({ toe: TOE, ...k, air: (k.air || 0) + HOVER, j: { ...base, ...k.j } }));
  const OPEN_ARMS = { upperArmL: [0.05, 0, 0.72], forearmL: [-0.3, 0, 0], handL: [0.3, 0, 0], upperArmR: [0.05, 0, -0.72], forearmR: [-0.3, 0, 0], handR: [0.3, 0, 0] };
  const FAIRY_BASIC = [
    { id: 'idle', name: '站立（飄浮）', group: '基本', dur: 4, desc: '輕輕飄在半空、腳尖朝下，雙臂微開、掌心向前，身體隨呼吸上下起伏，翅膀緩緩拍動、水球環繞全身、馬尾輕擺',
      extra: fly(4, 0.22, 3, 0.1),
      pose: (u) => { const f = TAU * u, s = Math.sin(f); return { face: 'normal', toe: TOE, air: HOVER + 0.045 * Math.sin(2 * f), j: {
        ...DANGLE, hips: [0, 0.07 * s, 0.03 * s], chest: [0.02 * Math.sin(2 * f), -0.05 * s, 0], head: [-0.03, 0.14 * s, 0.06 * s],
        thighL: [-0.2 + 0.05 * s, 0, 0.05], thighR: [0.1 - 0.05 * s, 0, -0.05],
        ...OPEN_ARMS, upperArmL: [0.05, 0, 0.72 + 0.05 * s], upperArmR: [0.05, 0, -0.72 - 0.05 * s] } }; } },
    { id: 'walk', name: '行走（飛行前進）', group: '基本', dur: 1.3, desc: '身體微微前傾、貼著半空向前滑行，雙腿輕輕後曳，雙臂微開隨著拍翅擺動，水球繞著身體轉',
      extra: fly(1.3, 0.3, 4, 0.1),
      pose: (u) => { const f = TAU * u, sw = Math.sin(f); return { face: 'normal', toe: TOE, air: HOVER + 0.05 * Math.sin(2 * f), j: {
        hips: [0.1, -0.06 * sw, 0.03 * sw], chest: [0.16, 0.08 * sw, -0.02 * sw], head: [-0.12, -0.04 * sw, 0.02 * sw],
        thighL: [0.18 + 0.14 * sw, 0, 0.04], shinL: [0.6, 0, 0], thighR: [0.18 - 0.14 * sw, 0, -0.04], shinR: [0.65, 0, 0],
        upperArmL: [-0.15 * sw, 0, 0.62], forearmL: [-0.3, 0, 0], handL: [0.3, 0, 0], upperArmR: [0.15 * sw, 0, -0.62], forearmR: [-0.3, 0, 0], handR: [0.3, 0, 0] } }; } },
    { id: 'run', name: '跑步（快速飛行）', group: '基本', dur: 0.66, desc: '身體大幅前傾、像箭一樣向前飛，雙腿往後伸直、雙臂往後張開，翅膀快速拍動',
      extra: fly(0.66, 0.38, 8, 0.3),
      pose: (u) => { const f = TAU * u, sw = Math.sin(f); return { face: 'excited', toe: TOE, air: HOVER + 0.1 + 0.03 * Math.sin(2 * f), j: {
        hips: [0.3, -0.05 * sw, 0.02 * sw], chest: [0.35, 0.06 * sw, 0], head: [-0.35, -0.04 * sw, 0],
        thighL: [0.5 + 0.12 * sw, 0, 0.04], shinL: [0.45, 0, 0], thighR: [0.5 - 0.12 * sw, 0, -0.04], shinR: [0.5, 0, 0],
        upperArmL: [0.75, 0, 0.45], forearmL: [-0.25, 0, 0], upperArmR: [0.75, 0, -0.45], forearmR: [-0.25, 0, 0] } }; } },
    // 打招呼：右臂從前方往上舉、由肩膀帶動左右揮（與貓女修正後的版本相同的做法），掌心朝前
    { id: 'wave', name: '打招呼', group: '基本', dur: 1.6, desc: '飄在半空，右臂從前方往上抬起、以肩膀為軸左右揮，手肘往頭的方向彎，頭微歪、開心笑',
      extra: fly(1.6, 0.25, 3, 0.1),
      pose: (u) => { const f = TAU * u * 2, k = Math.sin(f); return { face: 'happy', toe: TOE, air: HOVER + 0.03 * Math.sin(f), j: {
        ...DANGLE, chest: [0, -0.08, 0.04 * k], head: [0, 0.1, 0.12],
        upperArmR: [-2.55, 0, -0.35 + 0.22 * k], forearmR: [-0.45 - 0.12 * k, 0, 0], handR: [0, 0, 0],
        upperArmL: [0.05, 0, 0.5], forearmL: [-0.3, 0, 0], handL: [0.3, 0, 0] } }; } },
    { id: 'cheer1', name: '歡呼（旋轉）', group: '基本', dur: 1.4, desc: '雙手高舉、在空中轉一圈，翅膀大大展開，開心大笑',
      extra: fly(1.4, 0.4, 5, (u) => 0.5 * Math.sin(Math.PI * u)),
      pose: (u) => { const e = Math.sin(Math.PI * u); return { face: 'happy', toe: TOE, air: HOVER + 0.35 * e, j: {
        ...DANGLE, root: [0, -TAU * u, 0], chest: [-0.1 * e, 0, 0], head: [-0.2 * e, 0, 0],
        upperArmL: [-2.6 * e, 0, 0.5 * e + 0.3], forearmL: [-0.2, 0, 0], upperArmR: [-2.6 * e, 0, -0.5 * e - 0.3], forearmR: [-0.2, 0, 0] } }; } },
    { id: 'hurt', name: '受擊', group: '受擊', dur: 1.2, desc: '被擊中整個人往後仰、雙臂甩開、在空中晃一下，再穩住身形',
      extra: fly(1.2, 0.5, 5, -0.2),
      keys: withLegs([{ u: 0, j: {}, face: 'normal' },
        { u: 0.15, j: { chest: [-0.35, 0, 0.18], head: [-0.4, 0.2, 0.1], upperArmL: [-0.4, 0, 1.1], upperArmR: [-0.4, 0, -1.1], forearmL: [-0.5, 0, 0], forearmR: [-0.5, 0, 0], thighL: [-0.5, 0, 0.1], thighR: [-0.3, 0, -0.1], shinL: [0.3, 0, 0], shinR: [0.3, 0, 0] }, face: 'shout', hz: -0.3, air: 0.1 },
        { u: 0.5, j: { chest: [-0.15, 0, -0.1], head: [-0.15, -0.1, 0], upperArmL: [0, 0, 0.9], upperArmR: [0, 0, -0.9] }, face: 'shout', hz: -0.15, air: 0.04 },
        { u: 1, j: {}, face: 'normal' }]) },
  ];
  const FAIRY_MOVES = [
    { id: 'attack', name: '泡泡彈（普攻）', group: '招式', dur: 1.5, desc: '飄在半空雙手捧出一顆越吹越大的水泡 → 雙掌往前推，水泡彈飛向木頭人、「啵」地炸開成水花',
      extra: (u) => ({ ...wingPose(u, 0.3, 4, u < 0.5 ? 0.15 : 0.45), ...orbit(u, 1.5) }),
      fx: { kind: 'bubble', from: 0.12, release: 0.48, r: 0.3 }, events: [[0.48, 'bubbleShot']],
      keys: withLegs([{ u: 0, j: {}, face: 'normal' },
        { u: 0.22, j: { chest: [0.08, -0.15, 0], head: [0, 0.1, 0], upperArmR: [-0.95, 0, -0.3], forearmR: [-1.25, 0, 0], handR: [0.3, 0, 0], upperArmL: [-0.95, 0, 0.3], forearmL: [-1.25, 0, 0], handL: [0.3, 0, 0] }, face: 'excited' },
        { u: 0.48, j: { chest: [0.25, 0, 0], head: [-0.1, 0, 0], upperArmR: [-1.5, 0, -0.14], forearmR: [-0.08, 0, 0], handR: [0.9, 0, 0], upperArmL: [-1.5, 0, 0.14], forearmL: [-0.08, 0, 0], handL: [0.9, 0, 0], }, face: 'shout', hz: 0.25 },
        { u: 0.7, j: { chest: [0.2, 0, 0], head: [-0.08, 0, 0], upperArmR: [-1.35, 0, -0.18], forearmR: [-0.1, 0, 0], handR: [0.8, 0, 0], upperArmL: [-1.35, 0, 0.18], forearmL: [-0.1, 0, 0], handL: [0.8, 0, 0] }, face: 'happy', hz: 0.22 },
        { u: 1, j: {}, face: 'normal' }], TUCK) },
    { id: 'ultimate', name: '潮汐花綻（大絕）', group: '招式', dur: 3.4, desc: '蜷身雙臂交叉聚水 → 旋身衝上高空、翅膀完全展開 → 張開雙臂，水波如花瓣綻放、一圈水柱沖天、擊飛周圍的木頭人 → 水花像雨一樣灑落，輕輕飄回原位',
      extra: (u) => { const fl = u < 0.1 ? -0.25 : u < 0.4 ? -0.25 + ((u - 0.1) / 0.3) * 0.95 : u < 0.85 ? 0.7 : 0.7 - ((u - 0.85) / 0.15) * 0.95; return { ...wingPose(u, 0.3, 7, fl), ...orbit(u, 3.4) }; },
      fx: { kind: 'rain', from: 0.52, to: 0.9 }, events: [[0.44, 'bloom'], [0.56, 'jets']],
      keys: withLegs([{ u: 0, j: {}, face: 'normal' },
        { u: 0.1, j: { chest: [0.35, 0, 0], head: [0.1, 0, 0], upperArmR: [-0.7, 0, -0.5], forearmR: [-1.6, 0, 0], handR: [0.4, 0, 0], upperArmL: [-0.7, 0, 0.5], forearmL: [-1.6, 0, 0], handL: [0.4, 0, 0], thighL: [-0.9, 0, 0.1], thighR: [-0.9, 0, -0.1], shinL: [1.4, 0, 0], shinR: [1.4, 0, 0] }, face: 'determined', air: -0.25 },
        { u: 0.26, j: { root: [0, -0.7, 0], chest: [-0.1, 0, 0], head: [-0.2, 0, 0], upperArmR: [-2.8, 0, -0.5], forearmR: [-0.2, 0, 0], upperArmL: [-2.8, 0, 0.5], forearmL: [-0.2, 0, 0], }, face: 'excited', air: 0.55 },
        { u: 0.44, j: { root: [0, -TAU, 0], chest: [-0.15, 0, 0], head: [-0.25, 0, 0], upperArmR: [-2.6, 0, -0.95], forearmR: [-0.15, 0, 0], handR: [-0.3, 0, 0], upperArmL: [-2.6, 0, 0.95], forearmL: [-0.15, 0, 0], handL: [-0.3, 0, 0], thighL: [-1.05, 0, 0.12], thighR: [-0.85, 0, -0.12], shinL: [1.7, 0, 0], shinR: [1.85, 0, 0] }, face: 'shout', air: 1.15 },
        { u: 0.56, j: { root: [0, -TAU, 0], chest: [0.2, 0, 0], head: [0.1, 0, 0], upperArmR: [-0.2, 0, -1.35], forearmR: [0, 0, 0], handR: [-0.5, 0, 0], upperArmL: [-0.2, 0, 1.35], forearmL: [0, 0, 0], handL: [-0.5, 0, 0], thighL: [-1.0, 0, 0.12], thighR: [-0.8, 0, -0.12], shinL: [1.65, 0, 0], shinR: [1.8, 0, 0] }, face: 'shout', air: 1.0 },
        { u: 0.74, j: { root: [0, -TAU, 0], chest: [0.1, 0, 0], upperArmR: [-0.3, 0, -1.1], forearmR: [-0.2, 0, 0], upperArmL: [-0.3, 0, 1.1], forearmL: [-0.2, 0, 0] }, face: 'happy', air: 0.5 },
        { u: 0.9, j: { root: [0, -TAU, 0], chest: [0.15, 0, 0], upperArmR: [0, 0, -0.7], forearmR: [-0.3, 0, 0], upperArmL: [0, 0, 0.7], forearmL: [-0.3, 0, 0] }, face: 'happy', air: 0.05 },
        { u: 1, j: { root: [0, -TAU, 0] }, face: 'normal' }], TUCK) },
  ];
  [...FAIRY_BASIC, ...FAIRY_MOVES].forEach((d) => { d.flying = true; });
  const OUT = {};
  for (const id of BE.ORDER) {
    const ch = BE.CHARACTERS[id];
    const moves = MOVES[id].map((m) => (m.use ? useMove(m, ch.legK || 1) : ch.rig === 'quad' ? bakeQuad(m, id) : bakeHero(m, ch.legK || 1, ch.crouch)));
    let basics = null;
    if (ch.rig === 'quad') basics = quadBasics(ch.stage).map((m) => bakeQuad(m, id));
    if (id === 'cat3') basics = [...CATWALK.map((m) => bakeHero(m, ch.legK)), bakeHero(BLADE_WAVE, ch.legK), ...heroBasics(['cheer1', 'hurt']).map((b) => reground(b, ch.legK))];
    if (id === 'cat2') basics = heroBasics(Object.keys(HERO_BASIC)).map((b) => (b.id === 'wave' ? bakeHero(BLADE_WAVE, ch.legK) : reground(b, ch.legK)));
    if (id === 'cat1') basics = heroBasics(Object.keys(HERO_BASIC));
    if (ch.crouch) basics = heroBasics(Object.keys(HERO_BASIC)).map((b) => crouchClip(b, ch.crouch, ch.legK || 1));
    OUT[id] = { moves, basics };
  }
  OUT.fairy = (() => {
    const ch = BE.CHARACTERS.fairy, k = ch.legK, sk = ch.shinK;
    return { moves: FAIRY_MOVES.map((m) => bakeHero(m, k, null, sk)), basics: FAIRY_BASIC.map((m) => bakeHero(m, k, null, sk)) };   // 飛行動作：腿的樣子由動作決定
  })();
  if (typeof module !== 'undefined' && module.exports) module.exports = OUT;
  else root.BEAST_ACTIONS = OUT;
})(typeof globalThis !== 'undefined' ? globalThis : this);
