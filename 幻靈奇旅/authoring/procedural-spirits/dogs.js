// 汪汪犬三階（汪汪犬／浪鳴犬／三瀾犬，潮屬性）：模型＋8 個動作。
// 動作名稱對應遊戲：Idle / Walk / Run / Wave（打招呼：右前腳由肩膀抬起揮動）/ Celebrate / Hurt / Attack（撲咬）/ Ultimate
import * as THREE from 'three';
import { v, kf, win, cyc, mk, node, sphere, cone, spike, material, FUR, dropGeo } from './common.js';

export const DOG_TIERS = [
  { lv: 1, name: '汪汪犬', blue: 0x4f9ff0, dark: 0x2f72d6, light: 0x8fcaf7, iris: 0x2f86ea, bodyLen: 1.15, bodyR: .42, w: .44, hipH: .5, drops: 3,
    atk: '撲咬', ult: '汪汪水彈', ultDesc: '仰頭吠三聲，連吐 3 顆水彈' },
  { lv: 2, name: '浪鳴犬', blue: 0x3479d8, dark: 0x1e4596, light: 0x6fb6f2, iris: 0x2a6fd6, bodyLen: 1.5, bodyR: .46, w: .5, hipH: .8, drops: 5,
    atk: '雙頭連咬', ult: '雙頭激流', ultDesc: '雙頭噴水柱交叉掃射，再甩尾劈出水刃' },
  { lv: 3, name: '三瀾犬', blue: 0x2a66c6, dark: 0x152d6c, light: 0x5cb2ff, iris: 0x2264d0, bodyLen: 1.75, bodyR: .55, w: .62, hipH: .95, drops: 8,
    atk: '三頭連咬', ult: '三瀾海嘯', ultDesc: '蹲低蓄力、人立長嚎喚來海嘯，三頭再各喚一道水柱' },
];

export function createDog(T) {
  const cfg = DOG_TIERS[T - 1];
  const { bodyLen: BL, bodyR: BR, w: W, hipH: H } = cfg;
  const M = {
    fur: material('dogFur', { color: 0xf2f6fb, roughness: .72, sheen: .6, sheenRoughness: .5, sheenColor: 0xdcecff, bumpMap: FUR, bumpScale: .5 }),
    blue: material('dogBlue' + T, { color: cfg.blue, roughness: .6, sheen: .5, sheenColor: 0xbfe0ff }),
    dark: material('dogDark' + T, { color: cfg.dark, roughness: .62, sheen: .5, sheenColor: 0x9cc8ff }),
    light: material('dogLight' + T, { color: cfg.light, roughness: .5, sheen: .4, sheenColor: 0xe0f2ff }),
    glow: material('dogGlow' + T, { color: cfg.light, roughness: .3, clearcoat: .6, emissive: 0x2a8cff, emissiveIntensity: .35 }),
    iris: material('dogIris' + T, { color: cfg.iris, roughness: .1, clearcoat: 1 }),
    nose: material('dogNose', { color: 0x18203a, roughness: .2, clearcoat: 1 }),
    mouth: material('dogMouth', { color: 0xc8566a, roughness: .5 }),
    tongue: material('dogTongue', { color: 0xec8f98, roughness: .45, clearcoat: .4 }),
    fang: material('dogFang', { color: 0xffffff, roughness: .25, clearcoat: .8 }),
    pupil: material('dogPupil', { color: 0x0c1838, roughness: .05, clearcoat: 1 }),
    white: Object.assign(new THREE.MeshBasicMaterial({ color: 0xffffff }), { name: 'dogWhite' }),
    water: material('dogWater', { color: 0x5ab4ff, transparent: true, opacity: .8, roughness: .06, clearcoat: 1, emissive: 0x1a6fd0, emissiveIntensity: .3 }),
  };
  const SPH = sphere(), HI = sphere(true);
  const root = new THREE.Group(); root.name = 'waterDog' + T;
  const move = node('move', root);
  const pivY = H + .1, pivZ = -BL * .33;
  const pivot = node('hip', move, v(0, pivY, pivZ));
  const B = node('body', pivot, v(0, -pivY, -pivZ));
  const TY = H + BR * .45;

  const torso = mk(HI, M.fur, B, v(0, TY, 0), v(W, BR, BL * .5));
  mk(HI, M.fur, B, v(0, TY + BR * .15, BL * .3), v(W * 1.05, BR * 1.08, BR));
  mk(HI, M.fur, B, v(0, TY + .02, -BL * .3), v(W * .98, BR * .98, BR * .95));
  [[.7, .35, -.45], [-.75, .25, -.35], [.85, -.1, .05], [-.5, .55, -.6], [.3, .75, -.5], [-.9, -.2, -.1]].slice(0, 3 + T).forEach(([a, b, c], i) => {
    const d = v(a, b, c).normalize(), s = mk(SPH, i % 2 && T > 1 ? M.dark : M.light, torso, d.clone().multiplyScalar(.98), v(.24, .18, .06));
    s.quaternion.setFromUnitVectors(v(0, 0, 1), d);
  });

  // 腿：樞紐在肩／髖
  const legs = [];
  for (const [fz, front] of [[BL * .33, true], [-BL * .33, false]]) for (const s of [-1, 1]) {
    const g = node('leg' + (front ? 'F' : 'B') + (s < 0 ? 'L' : 'R'), B, v(s * W * .55, pivY, fz));
    const L = pivY, th = BR * (front ? .33 : .4) * (T === 1 ? 1 : 1.1), pawH = th * .5;
    mk(SPH, M.fur, g, v(0, -L * .25, 0), v(th, L * .38, th * 1.1));
    mk(SPH, T === 1 ? M.fur : M.dark, g, v(0, -L * .64, 0), v(th * .62, L * .32, th * .68));
    if (T > 1 && !front) mk(SPH, M.dark, g, v(s * th * .35, -L * .18, -.03), v(th * .8, L * .24, th * .9));
    if (T > 1) mk(SPH, M.light, g, v(0, -L * .7, th * .45), v(th * .3, L * .14, th * .25));
    mk(SPH, T === 1 ? M.blue : M.dark, g, v(0, -L + pawH, .06), v(th * .9, pawH, th * 1.15));
    for (const k of [-1, 0, 1]) mk(SPH, M.light, g, v(k * th * .45, -L + pawH * .8, .06 + th * .95), v(th * .26, pawH * .6, th * .3));
    if (T > 1) for (const k of [-1, 0, 1]) spike(g, M.fang, v(k * th * .45, -L + pawH * .5, .06 + th * 1.15), v(0, -.3, 1), th * .35, th * .08);
    legs.push({ g, front, s, pivY });
  }
  // 鬃毛
  if (T === 1) {
    for (let k = 0; k < 9; k++) { const a = -1.5 + k * 3 / 8;
      spike(B, M.blue, v(Math.sin(a) * W * .8, TY + BR * .55, BL * .36 + Math.cos(a) * BR * .55), v(Math.sin(a) * .8, -1, Math.cos(a) * .7), .32, .14, .35); }
  } else {
    mk(HI, M.dark, B, v(0, TY + BR * .25, BL * .2), v(W * 1.1, BR * .95, BL * .36));
    for (const s of [-1, 1]) for (let i = 0; i < (T === 2 ? 3 : 4); i++)
      spike(B, M.dark, v(s * W, TY - BR * .05, BL * (.32 - i * .12)), v(s * .5, -1, -.4), BR * (.7 - i * .08), BR * .2, .4);
    for (let i = 0; i < (T === 2 ? 3 : 5); i++) spike(B, M.dark, v(0, TY + BR * 1.1, BL * (.3 - i * .12)), v(0, .5, -1), BR * (.8 - i * .1), BR * .22, .35);
    for (const k of [-1, 0, 1]) spike(B, M.fur, v(k * W * .3, TY - BR * .05, BL * .3 + BR * .9), v(k * .2, -1, .35), BR * .75, BR * .25, .45);
    if (T === 3) {
      for (const k of [-1, -.5, 0, .5, 1]) spike(B, M.glow, v(k * W * .35, TY + BR * .35, BL * .3 + BR), v(k * .3, -1, .3), BR * (1 - Math.abs(k) * .3), BR * .2, .3);
      for (const s of [-1, 1]) spike(B, M.glow, v(s * W * 1.05, TY + BR * .3, BL * .1), v(s * .6, -.8, -.2), BR * .7, BR * .12, .3);
    }
  }

  // 頸與頭
  const NB = v(0, TY + BR * .55, BL * .36);
  const headCfg = T === 1 ? [{ x: 0, yaw: 0, hr: .62, neck: .22, open: .55, pup: true }]
    : T === 2 ? [{ x: -.32, yaw: -.22, hr: .43, neck: .5, open: 0 }, { x: .32, yaw: .18, hr: .45, neck: .56, open: .55 }]
    : [{ x: -.55, yaw: -.42, hr: .42, neck: .45, open: .12 }, { x: 0, yaw: 0, hr: .5, neck: .7, open: .7 }, { x: .55, yaw: .42, hr: .42, neck: .45, open: 0 }];
  const ears = [];
  const heads = headCfg.map((hc, i) => {
    const neck = node('neck' + i, B, NB.clone().add(v(hc.x, 0, 0))); neck.rotation.order = 'YXZ';
    mk(SPH, M.fur, neck, v(0, hc.neck * .5, 0), v(hc.hr * .6, hc.neck * .6 + hc.hr * .35, hc.hr * .62));
    if (T > 1) mk(SPH, M.dark, neck, v(0, hc.neck * .55, -hc.hr * .2), v(hc.hr * .55, hc.neck * .5 + hc.hr * .3, hc.hr * .5));
    const head = node('head' + i, neck, v(0, hc.neck, .05));
    return { hc, neck, head, ...buildHead(head, hc, i), base: T === 1 ? .15 : .35 };
  });
  function buildHead(g, hc, i) {
    const r = hc.hr, pup = !!hc.pup, sk = pup ? [1, .95, .95] : [.88, .82, 1];
    mk(HI, M.fur, g, null, v(sk[0] * r, sk[1] * r, sk[2] * r));
    const surf = (d, inset = 0) => { d = d.clone().normalize();
      const rr = 1 / Math.sqrt((d.x / (sk[0] * r)) ** 2 + (d.y / (sk[1] * r)) ** 2 + (d.z / (sk[2] * r)) ** 2); return { p: d.clone().multiplyScalar(rr - inset), d }; };
    const jaw = node('jaw' + i, g);
    const tip = node('mouth' + i, g);
    if (pup) {
      mk(SPH, M.fur, g, v(0, -.2 * r, .72 * r), v(.42 * r, .28 * r, .36 * r));
      mk(SPH, M.nose, g, v(0, -.1 * r, 1.06 * r), v(.1 * r, .075 * r, .07 * r));
      mk(SPH, M.mouth, g, v(0, -.4 * r, .66 * r), v(.3 * r, .13 * r, .3 * r));
      jaw.position.set(0, -.36 * r, .45 * r);
      mk(SPH, M.fur, jaw, v(0, -.07 * r, .2 * r), v(.3 * r, .11 * r, .3 * r));
      mk(SPH, M.tongue, jaw, v(0, -.01 * r, .24 * r), v(.2 * r, .06 * r, .22 * r));
      for (const s of [-1, 1]) spike(g, M.fang, v(s * .16 * r, -.36 * r, .88 * r), v(0, -1, .1), .12 * r, .045 * r);
      tip.position.set(0, -.38 * r, 1.0 * r);
    } else {
      mk(SPH, M.fur, g, v(0, -.2 * r, .82 * r), v(.4 * r, .3 * r, .72 * r));
      mk(SPH, M.nose, g, v(0, -.08 * r, 1.5 * r), v(.13 * r, .095 * r, .09 * r));
      mk(SPH, M.mouth, g, v(0, -.42 * r, .88 * r), v(.3 * r, .1 * r, .56 * r));
      for (const s of [-1, 1]) spike(g, M.fang, v(s * .2 * r, -.42 * r, 1.22 * r), v(0, -1, .05), .17 * r, .05 * r);
      jaw.position.set(0, -.42 * r, .35 * r);
      mk(SPH, M.fur, jaw, v(0, -.05 * r, .52 * r), v(.33 * r, .12 * r, .62 * r));
      mk(SPH, M.tongue, jaw, v(0, .03 * r, .55 * r), v(.22 * r, .05 * r, .45 * r));
      for (const s of [-1, 1]) spike(jaw, M.fang, v(s * .18 * r, .03 * r, .98 * r), v(0, 1, 0), .13 * r, .045 * r);
      tip.position.set(0, -.38 * r, 1.5 * r);
      const f = surf(v(0, .7, .55)), fm = mk(SPH, M.blue, g, f.p, v(.16 * r, .1 * r, .42 * r));
      fm.quaternion.setFromUnitVectors(v(0, 0, 1), f.d); fm.rotateX(-.5);
    }
    const eyes = [];
    for (const s of [-1, 1]) {
      const { p, d } = surf(pup ? v(s * .36, .1, .93) : v(s * .45, .16, .87), .01 * r);
      const eg = node('eye' + i + (s < 0 ? 'L' : 'R'), g, p); eg.quaternion.setFromUnitVectors(v(0, 0, 1), d);
      const ir = pup ? v(.2 * r, .25 * r, .07 * r) : v(.13 * r, .1 * r, .05 * r);
      mk(SPH, M.white, eg, v(0, 0, -.005), ir.clone().multiplyScalar(1.12));
      mk(SPH, M.iris, eg, null, ir);
      mk(SPH, M.pupil, eg, v(0, 0, ir.z * .6), ir.clone().multiply(v(.5, .55, .6)));
      mk(SPH, M.white, eg, v(-ir.x * .35, ir.y * .4, ir.z), .05 * r);
      if (!pup) mk(SPH, M.dark, eg, v(0, ir.y * 1.45, .02 * r), v(ir.x * 1.25, .03 * r, .04 * r)).rotation.z = s * .38;
      eyes.push(eg);
    }
    if (pup) {
      for (const s of [-1, 1]) {
        const ear = node('ear' + (s < 0 ? 'L' : 'R'), g, v(s * .72 * r, .35 * r, -.05 * r)); ear.rotation.z = s * 1.15;
        mk(SPH, M.blue, ear, v(0, -.5 * r, 0), v(.24 * r, .6 * r, .1 * r));
        mk(SPH, M.dark, ear, v(0, -.95 * r, 0), v(.18 * r, .16 * r, .09 * r));
        ears.push({ ear, s });
      }
      [[v(0, 1, .15), .62], [v(-.35, 1, -.25), .45], [v(.35, 1, -.25), .45], [v(0, .7, -.7), .4]].forEach(([d, L]) => spike(g, M.blue, v(0, .82 * r, 0), d, L * r, .15 * r, .55));
    } else {
      for (const s of [-1, 1]) {
        spike(g, M.blue, v(s * .45 * r, .45 * r, -.1 * r), v(s * .45, 1, -.4), (T === 2 ? .8 : 1.0) * r, .24 * r, .45);
        spike(g, M.light, v(s * .45 * r, .5 * r, -.05 * r), v(s * .45, 1, -.35), (T === 2 ? .5 : .65) * r, .13 * r, .3);
        for (const k of [0, 1]) spike(g, M.fur, v(s * .72 * r, -.18 * r - k * .15 * r, .05 * r), v(s, -.1 - k * .3, -.6), (.4 - k * .08) * r, .14 * r, .45);
      }
      const n = T === 2 ? 3 : 5;
      for (let k = 0; k < n; k++) {
        const xo = (k - (n - 1) / 2) * .12 * r;
        spike(g, k % 2 ? M.blue : M.dark, v(xo, .6 * r, .15 * r - k * .1 * r), v(xo * 2, .55, -1), (T === 2 ? .8 : 1.15) * r * (1 - Math.abs(k - (n - 1) / 2) * .12), .2 * r, .4);
      }
    }
    return { jaw, tip, eyes };
  }
  // 水尾巴：每節一個節點，烘焙成位置／縮放軌
  const tail = node('tail', B, v(0, TY + BR * .35, -BL * .52));
  const branches = [{ len: .55 + T * .12, r: .2 + T * .03, x: 0, ph: 0 }];
  if (T >= 2) branches.push({ len: .4 + T * .08, r: .13, x: .22, ph: 1.3 });
  if (T >= 3) branches.push({ len: .45, r: .13, x: -.24, ph: 2.4 });
  const NSEG = 16;
  branches.forEach((b, bi) => { b.segs = Array.from({ length: NSEG }, (_, i) => { const n = node('tail' + bi + '_' + i, tail); mk(SPH, M.water, n); return n; }); });
  const drops = Array.from({ length: cfg.drops }, (_, i) => {
    const n = node('drop' + i, root); const m = mk(dropGeo(), M.water, n); m.castShadow = false;
    return { n, a: i / cfg.drops * Math.PI * 2, r: W + .7 + ((i * 37) % 10) / 25, y: TY + ((i * 53) % 14) / 10 - .2, s: .14 + ((i * 29) % 10) / 100, k: 1 + (i % 2) };
  });

  /* ---------- 姿勢 ---------- */
  const blank = () => ({ fwd: 0, hop: 0, yaw: 0, pitch: 0, roll: 0, crouch: 0, leg: [0, 0, 0, 0], legZ: [0, 0, 0, 0], tailWag: 0, tailSwing: 0, tailPh: 0,
    dropPh: 0, dropPull: 0, dropLift: 0, eye: 1, ear: 0,
    h: heads.map((h, i) => ({ pitch: 0, yaw: 0, jaw: h.hc.open, thrust: 0, tilt: 0 })) });
  // 待機底層（循環整圈）
  function idle(P, t, dur, k = 1) {
    const n = Math.max(1, Math.round(dur / 2.8));
    P.crouch += cyc(t, dur, n) * .012 * k;
    P.h.forEach((h, i) => { h.pitch += cyc(t, dur, Math.max(1, Math.round(n / 2)), i * 1.7) * .04 * k; h.yaw += cyc(t, dur, 1, i * 2.1) * .05 * k; });
    P.tailWag += .3 * cyc(t, dur, Math.max(1, Math.round(dur / .8)));
    P.tailPh += 2 * Math.PI * Math.max(1, Math.round(dur / 2.5)) * t / dur;
    P.dropPh += 2 * Math.PI * t / dur;
    P.ear += .05 * cyc(t, dur, n);
  }
  const blink = (P, t, at) => { if (win(t, at, at + .16)) P.eye = 1 - Math.sin((t - at) / .16 * Math.PI) * .9; };
  const order = heads.length === 3 ? [1, 0, 2] : heads.length === 2 ? [1, 0] : [0];
  const ULT = {
    1: { dur: 2.1, releases: [.5, .92, 1.34], pose: (t, P) => {
      const sit = kf(t, [[0, 0], [.3, 1], [1.7, 1], [2.1, 0]]);
      P.pitch -= .15 * sit; P.leg[2] += .25 * sit; P.leg[3] += .25 * sit; P.crouch += .06 * sit;
      for (const b of [.5, .92, 1.34]) { const rel = t - b, h = P.h[0];
        if (win(rel, -.22, .22)) { h.pitch += kf(rel, [[-.22, 0], [-.07, -.5], [0, .18], [.22, 0]]); h.jaw = kf(rel, [[-.22, h.jaw], [-.05, 1.5], [.1, 1.1], [.22, h.jaw]]);
          P.hop += .12 * kf(rel, [[-.05, 0], [.03, 1], [.15, 0]]); P.leg[0] += .2 * kf(rel, [[-.05, 0], [.03, -1], [.15, 0]]); P.leg[1] += .2 * kf(rel, [[-.05, 0], [.03, -1], [.15, 0]]); } }
    } },
    2: { dur: 3.25, releases: [.55, 2.55], pose: (t, P) => {
      const brace = kf(t, [[0, 0], [.35, 1], [2.15, 1], [2.4, 0]]), on = kf(t, [[.4, 0], [.55, 1], [2.0, 1], [2.15, 0]]);
      P.crouch += .1 * brace; P.leg[0] -= .25 * brace; P.leg[1] -= .25 * brace; P.leg[2] += .15 * brace; P.leg[3] += .15 * brace;
      heads.forEach((hd, i) => { const h = P.h[i], s = i ? 1 : -1;
        h.pitch += kf(t, [[0, 0], [.3, -.35], [.55, .12], [2.1, .12], [2.3, 0]]) + Math.sin(t * 60 + i) * .02 * on;
        h.jaw = Math.max(h.jaw, 1.5 * kf(t, [[.3, 0], [.5, 1], [2.05, 1], [2.25, 0]]));
        h.yaw += on * (-hd.hc.yaw + s * kf(t, [[.55, .3], [1.3, -.3], [2.05, .3]])); });
      P.yaw += kf(t, [[2.2, 0], [2.38, .55], [2.6, -.7], [2.95, 0]]);
      P.tailSwing += kf(t, [[2.2, 0], [2.4, -1], [2.6, 1.2], [2.95, 0]]);
      P.tailPh += t > 2.2 ? (t - 2.2) * 12 : 0;
    } },
    3: { dur: 5.05, releases: [1.83, 2.9, 3.22, 3.54], pose: (t, P) => {
      // 蹲低蓄力（0～0.55 秒）→ 人立長嚎 → 前爪落地掀浪 → 三頭各喚水柱
      const D = .55, c = kf(t, [[0, 0], [D * .75, 1], [D + .3, 0]]);
      P.crouch += .3 * c; P.pitch += .12 * c; P.leg[0] += .3 * c; P.leg[1] += .3 * c; P.leg[2] -= .2 * c; P.leg[3] -= .2 * c;
      P.h.forEach(h => { h.pitch += .4 * c; h.jaw *= 1 - c; });
      P.dropPull += .4 * c;
      if (t <= D) return;
      const u = t - D, gt = [2.35, 2.67, 2.99], ord = [0, 2, 1];
      P.pitch += kf(u, [[0, 0], [.6, -.62], [1.05, -.68], [1.28, .12], [1.55, 0]]);
      const fl = kf(u, [[.3, 0], [.7, -.7], [.9, -.4], [1.05, -.7], [1.25, .25], [1.5, 0]]); P.leg[0] += fl; P.leg[1] += fl;
      P.leg[2] -= P.pitch; P.leg[3] -= P.pitch;
      P.crouch += .16 * kf(u, [[1.2, 0], [1.3, 1], [1.65, 0]]);
      const glow = kf(u, [[0, 0], [.6, 1], [3.6, 1], [4.2, 0]]); P.dropPull += glow; P.dropLift += .8 * glow; P.dropPh += glow * u * 4;
      heads.forEach((hd, i) => { const h = P.h[i];
        h.pitch += kf(u, [[.2, 0], [.7, -.75], [1.08, -.8], [1.3, .25], [1.6, 0]]);
        h.jaw = Math.max(h.jaw, 1.5 * kf(u, [[.3, 0], [.6, 1], [1.1, 1], [1.3, 0]]));
        h.yaw += -hd.hc.yaw * .4 * kf(u, [[.3, 0], [.7, 1], [1.2, 0]]); });
      gt.forEach((g, k) => { const rel = u - g, h = P.h[ord[k]];
        if (win(rel, -.25, .25)) { h.pitch += kf(rel, [[-.25, 0], [-.1, -.45], [0, .35], [.25, 0]]); h.jaw = Math.max(h.jaw, kf(rel, [[-.25, 0], [-.08, 1.5], [0, .2], [.25, 0]])); } });
      P.tailPh += u * 6;
    } },
  };
  const ult = ULT[T];
  const bites = order.map((hi, k) => ({ hi, t: .36 + k * .14 })), atkDur = .36 + heads.length * .14 + .5;
  const actions = {
    Idle: { dur: 5.6, loop: true, label: '待機', pose: (t, P) => { idle(P, t, 5.6); blink(P, t, 1.8); blink(P, t, 4.4); } },
    Walk: { dur: 1.0, loop: true, label: '移動', pose: (t, P) => {
      const d = 1.0; idle(P, t, d, .4);
      // 對角步：左前＋右後同相
      const s = cyc(t, d, 1); P.leg[0] += .45 * s; P.leg[3] += .45 * s; P.leg[1] -= .45 * s; P.leg[2] -= .45 * s;
      P.hop += .04 * Math.abs(cyc(t, d, 2)); P.roll += .03 * s;
      P.h.forEach(h => h.pitch += .05 * cyc(t, d, 2));
    } },
    Run: { dur: .6, loop: true, label: '跑步', pose: (t, P) => {
      const d = .6; idle(P, t, d, .3);
      // 奔馳：前腳一組、後腳一組，身體前後起伏
      const s = cyc(t, d, 1), c2 = cyc(t, d, 1, Math.PI / 2);
      P.leg[0] += .8 * s; P.leg[1] += .8 * cyc(t, d, 1, .4); P.leg[2] -= .8 * s; P.leg[3] -= .8 * cyc(t, d, 1, .4);
      P.pitch += .1 * c2; P.hop += .14 * Math.max(0, c2) + .04;
      P.h.forEach(h => { h.pitch += .12 - .08 * c2; h.jaw = Math.max(h.jaw, .4); });
      P.ear -= .4;
    } },
    // 打招呼：右前腳由肩膀抬起左右揮動，頭歪一邊、尾巴快搖
    Wave: { dur: 2.0, loop: false, label: '打招呼', pose: (t, P) => {
      idle(P, t, 2.0, .5);
      const up = kf(t, [[0, 0], [.3, 1], [1.65, 1], [2.0, 0]]);
      P.leg[1] -= 1.25 * up; P.legZ[1] += (.35 + .3 * Math.sin((t - .3) * 12)) * up;
      P.pitch -= .1 * up; P.roll -= .05 * up;
      P.h.forEach((h, i) => { h.tilt += .25 * up; h.yaw += (.1 - i * .05) * up; h.jaw = Math.max(h.jaw, .7 * up); });
      P.tailWag += .5 * up * Math.sin(t * 22); P.ear += .2 * up;
    } },
    // 歡呼：前腳離地連跳兩下、尾巴猛搖、張嘴
    Celebrate: { dur: 1.7, loop: false, label: '歡呼', pose: (t, P) => {
      idle(P, t, 1.7, .3);
      const j = a => kf(t, [[a, 0], [a + .12, -1], [a + .3, 1], [a + .5, 0]]);
      const hop = Math.max(0, j(.1)) + Math.max(0, j(.8)), crouch = Math.max(0, -j(.1)) + Math.max(0, -j(.8));
      P.hop += .55 * hop; P.crouch += .12 * crouch; P.pitch -= .35 * hop;
      P.leg[0] -= .6 * hop; P.leg[1] -= .6 * hop; P.leg[2] += .4 * hop; P.leg[3] += .4 * hop;
      const up = kf(t, [[0, 0], [.2, 1], [1.4, 1], [1.7, 0]]);
      P.h.forEach((h, i) => { h.pitch -= .35 * up; h.jaw = Math.max(h.jaw, 1.1 * up); h.yaw += .15 * up * Math.sin(t * 10 + i); });
      P.tailWag += .6 * up * Math.sin(t * 26); P.eye = 1 - .4 * up; P.ear += .3 * up;
    } },
    Hurt: { dur: .7, loop: false, label: '受擊', pose: (t, P) => {
      const h = kf(t, [[0, 0], [.08, 1], [.4, .6], [.7, 0]]);
      P.fwd -= .3 * h; P.pitch -= .15 * h; P.crouch += .1 * h; P.roll += .08 * h * Math.sin(t * 40);
      P.h.forEach(x => { x.pitch -= .4 * h; x.tilt += .2 * h * Math.sin(t * 36); x.jaw = Math.max(x.jaw, .6 * h); });
      P.eye = 1 - .8 * h; P.ear -= .3 * h;
    } },
    Attack: { dur: atkDur, loop: false, label: '普攻 · ' + cfg.atk, hits: bites.map(b => b.t), pose: (t, P) => {
      idle(P, t, atkDur, .3);
      P.crouch += .14 * kf(t, [[0, 0], [.2, 1], [.3, 0]]);
      P.fwd += .7 * kf(t, [[.18, 0], [.34, 1], [atkDur - .35, 1], [atkDur, 0]]);
      P.hop += .3 * kf(t, [[.18, 0], [.27, 1], [.36, 0]]);
      const lf = kf(t, [[.18, 0], [.27, -.8], [.38, 0]]), lb = kf(t, [[.18, 0], [.27, .6], [.38, 0]]);
      P.leg[0] += lf; P.leg[1] += lf; P.leg[2] += lb; P.leg[3] += lb;
      P.pitch += kf(t, [[0, 0], [.2, .12], [.27, -.18], [.36, .1], [atkDur - .2, 0]]);
      for (const b of bites) { const h = P.h[b.hi], rel = t - b.t;
        if (win(rel, -.16, .18)) { h.jaw = kf(rel, [[-.16, h.jaw], [-.05, 1.4], [0, 0], [.18, h.jaw]]);
          h.pitch += kf(rel, [[-.16, 0], [-.05, -.3], [0, .3], [.18, 0]]); h.thrust += .25 * kf(rel, [[-.12, 0], [0, 1], [.18, 0]]); } }
    } },
    Ultimate: { dur: ult.dur, loop: false, label: '絕招 · ' + cfg.ult, releases: ult.releases, pose: (t, P) => { idle(P, t, ult.dur, .5); P.tailWag *= 2; ult.pose(t, P); } },
  };

  function apply(P) {
    move.position.set(0, P.hop, P.fwd); move.rotation.set(0, P.yaw, P.roll);
    pivot.rotation.x = P.pitch;
    B.position.y = -pivY - P.crouch;
    legs.forEach((l, i) => { l.g.position.y = l.pivY + P.crouch; l.g.rotation.set(P.leg[i], 0, l.s * P.legZ[i]); });
    heads.forEach((h, i) => { const p = P.h[i];
      h.neck.rotation.set(h.base + p.pitch * .5, h.hc.yaw + p.yaw, 0);
      h.head.rotation.set(-h.base + p.pitch * .5, 0, p.tilt); h.head.position.z = .05 + p.thrust;
      h.jaw.rotation.x = p.jaw * .45;
      for (const e of h.eyes) e.scale.y = Math.max(.08, P.eye); });
    for (const e of ears) e.ear.rotation.z = e.s * (1.15 + P.ear);
    tail.rotation.y = P.tailWag + P.tailSwing;
    for (const b of branches) b.segs.forEach((m, i) => {
      const t = i / (NSEG - 1), ang = t * Math.PI * 1.2 * (1 + .1 * Math.sin(P.tailPh + b.ph)), R = b.len * (1 - .3 * t);
      m.position.set(b.x * t + Math.sin(P.tailPh * 2 + t * 4 + b.ph) * .12 * t, R * (1 - Math.cos(ang)), -R * Math.sin(ang));
      m.scale.setScalar(b.r * (1 - t * .7) * (1 + Math.sin(P.tailPh * 3 - t * 6) * .06));
    });
    for (const d of drops) { const a = d.a + P.dropPh * d.k, rr = d.r * (1 - .25 * Math.min(1, P.dropPull));
      d.n.position.set(Math.cos(a) * rr, d.y + Math.sin(P.dropPh * 2 + d.a * 3) * .15 + P.dropLift, Math.sin(a) * rr * .8); d.n.scale.setScalar(d.s); }
  }
  function pose(name, t) { const a = actions[name], P = blank(); a.pose(Math.min(t, a.dur), P); apply(P); }
  pose('Idle', 0);
  return { root, tier: T, cfg, actions, pose, height: 2.6, family: 'water-dog', heads };
}
