// 剝皮辣椒雞三階（幼雛／背包客／辣椒將軍）：模型＋8 個動作。
// 動作名稱對應遊戲：Idle / Walk / Run / Wave（打招呼）/ Celebrate（歡呼）/ Hurt / Attack（啄擊）/ Ultimate（丟辣椒）
// 每個動作都是「時間 → 姿勢」的純函式，export.html 以 30fps 取樣烘焙成 GLB。
import * as THREE from 'three';
import { v, kf, win, cyc, mk, onSphere, dirAE, node, sphere, material, FUR, pepperGeo, stemGeo, petalGeo, leafGeo, podGeo } from './common.js';

export const CHICK_TIERS = [
  { lv: 1, base: 0xfad45a, name: '剝皮辣椒雞', ult: '辣椒投擲', ultDesc: '單翼從背後抽辣椒，連丟 3 根' },
  { lv: 2, base: 0xf8c13a, name: '雙椒辣椒雞', ult: '雙翼連投', ultDesc: '左右翅膀交替，快速連丟 6 根' },
  { lv: 3, base: 0xf4ac22, name: '豐椒辣椒雞王', ult: '烈焰辣椒雨', ultDesc: '騰空扇形掃射 12 根火辣椒，再砸出巨型紅辣椒' },
];

function mats(T, base) {
  const body = material('chickBody' + T, T === 1
    ? { color: base, roughness: .5, clearcoat: .35, clearcoatRoughness: .45, sheen: .3, sheenColor: 0xfff0a0 }
    : { color: base, roughness: T === 2 ? .65 : .82, sheen: T === 2 ? .6 : 1, sheenRoughness: .45, sheenColor: 0xffeaa0, bumpMap: FUR, bumpScale: T === 2 ? .5 : 1.3 });
  return {
    body,
    orange: material('chickOrange', { color: 0xf28a24, roughness: .4, clearcoat: .5 }),
    beak: material('chickBeak', { color: 0xf27418, roughness: .3, clearcoat: .7 }),
    eye: material('chickEye', { color: 0x120a06, roughness: .06, clearcoat: 1 }),
    white: Object.assign(new THREE.MeshBasicMaterial({ color: 0xffffff }), { name: 'chickWhite' }),
    blush: Object.assign(new THREE.MeshBasicMaterial({ color: 0xff8a86, transparent: true, opacity: .5, depthWrite: false }), { name: 'chickBlush' }),
    pepper: material('pepper', { vertexColors: true, roughness: .28, clearcoat: .9, clearcoatRoughness: .2 }),
    calyx: material('pepperCalyx', { color: 0x4c6e1e, roughness: .5, clearcoat: .4 }),
    leaf: material('leaf', { color: 0x3f6b28, roughness: .5, clearcoat: .5, side: THREE.DoubleSide }),
    strap: material('strap', { color: 0x7a4e2a, roughness: .75 }),
    gold: Object.assign(new THREE.MeshStandardMaterial({ color: 0xc39a48, metalness: .3, roughness: .32 }), { name: 'gold' }),
    vc: material('featherVC', { vertexColors: true, roughness: .6, sheen: .5, sheenColor: 0xfff0b0 }),
    flame: material('flameVC', { vertexColors: true, roughness: .45, clearcoat: .5, emissive: 0xff5200, emissiveIntensity: .12 }),
  };
}
function makePepper(M, { L = 1.1, R = .25, bend = .08, red = false }) {
  const g = new THREE.Group();
  mk(pepperGeo(L, R, bend, red), M.pepper, g);
  mk(sphere(), M.calyx, g, v(0, .01, 0), v(R * .82, R * .3, R * .82));
  mk(stemGeo(R / .25), M.calyx, g);
  return g;
}

export function createChick(T) {
  const cfg = CHICK_TIERS[T - 1], M = mats(T, cfg.base);
  const root = new THREE.Group(); root.name = 'pepperChick' + T;
  const rig = node('rig', root); rig.rotation.order = 'YXZ';
  const B = node('body', rig);
  const BC = v(0, 1.3, 0), BR = 1.0, HI = sphere(true), SPH = sphere();
  mk(HI, M.body, B, BC, BR);
  mk(HI, M.body, B, v(0, 1.05, .08), .93);

  const HR = T === 1 ? .88 : .85, HC = v(0, .5, .06);
  const head = node('head', B, v(0, 1.65, 0));
  mk(HI, M.body, head, HC, HR);
  const eyes = [];
  for (const s of [-1, 1]) {
    const eg = onSphere(node(s < 0 ? 'eyeL' : 'eyeR'), head, HC, HR, v(s * .37, .06, .93), .035);
    mk(SPH, M.eye, eg, null, v(.125, .14, .07));
    mk(SPH, M.white, eg, v(-.035, .05, .06), .034);
    mk(SPH, M.white, eg, v(.03, -.04, .065), .014);
    eyes.push(eg);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(.15, 24), M.blush);
    onSphere(bl, head, HC, HR, v(s * .63, -.2, .75), -.012); bl.scale.set(1.3, .9, 1);
  }
  const beak = onSphere(node('beak'), head, HC, HR, v(0, -.1, 1), .04);
  const upGeo = new THREE.ConeGeometry(.13, .28, 18); upGeo.translate(0, .14, 0); upGeo.rotateX(Math.PI / 2);
  const loGeo = new THREE.ConeGeometry(.1, .2, 18); loGeo.translate(0, .1, 0); loGeo.rotateX(Math.PI / 2);
  const upBeak = node('beakUpper', beak, v(0, .015, 0)); mk(upGeo, M.beak, upBeak, null, v(1.15, .6, 1));
  const lowBeak = node('beakLower', beak, v(0, -.02, 0)); mk(loGeo, M.beak, lowBeak, null, v(1, .45, 1));

  const tuft = node('crest', head); tuft.position.copy(HC).add(v(0, HR - .08, 0));
  if (T === 1) {
    mk(new THREE.CapsuleGeometry(.11, .2, 5, 12), M.body, tuft, v(-.06, .17, 0)).rotation.z = .3;
    mk(new THREE.CapsuleGeometry(.085, .1, 5, 12), M.body, tuft, v(.12, .1, 0)).rotation.z = -.5;
  } else if (T === 2) {
    [[-.55, .32, .13, -.1], [-.15, .42, .14, .02], [.28, .36, .13, .0], [.7, .26, .11, -.05]].forEach(([rz, L, R, z]) => {
      mk(petalGeo(L, R, .05, cfg.base, 0xf3b63a), M.vc, tuft, v(-rz * .12, -.02, z)).rotation.z = rz;
    });
  } else {
    [[0, .82, .18, .45, .1, 0], [-.45, .58, .15, -.25, .14, .03], [.5, .55, .15, .25, -.14, .03], [-.95, .42, .12, -.2, .2, .0],
     [1.0, .42, .12, .2, -.2, 0], [-.2, .5, .14, .3, .05, -.16], [.25, .48, .14, -.3, -.05, -.16]].forEach(([rz, L, R, bend, x, z]) => {
      mk(petalGeo(L, R, bend, 0xffcf3a, 0xf0841c), M.flame, tuft, v(x, -.03, z)).rotation.set(z * -2, 0, rz);
    });
  }
  if (T >= 2) {
    const rows = T === 2 ? 2 : 4;
    for (let r = 0; r < rows; r++) {
      const el = .42 - r * .19, n = (T === 2 ? 4 : 5) - (r % 2), spread = .62 - r * .04;
      for (let k = 0; k < n; k++) {
        const az = n === 1 ? 0 : -spread + 2 * spread * k / (n - 1);
        const f = onSphere(mk(SPH, M.body, null), B, BC, BR, dirAE(az, el), .015);
        f.scale.set(.19, .14, .06).multiplyScalar(T === 3 ? 1.05 : 1); f.rotateX(-.35);
      }
    }
    if (T === 3) for (let k = 0; k < 9; k++) {
      const f = onSphere(mk(SPH, M.body, null), B, BC, BR, dirAE(-1.3 + k * 2.6 / 8, .6), .02);
      f.scale.set(.22, .17, .07); f.rotateX(-.45);
    }
  }
  // 翅膀：樞紐在肩膀（打招呼、丟辣椒都由肩膀帶動）
  const wings = [];
  for (const s of [-1, 1]) {
    const w = node(s < 0 ? 'wingL' : 'wingR', B, v(s * .86, 1.62, .2));
    const k = T === 1 ? 1 : 1.14;
    mk(SPH, M.body, w, v(s * .06, -.32, .06), v(.22, .42, .34).multiplyScalar(k));
    if (T >= 2) {
      const tip = T === 2 ? 0xf0ad35 : 0xee7d1d, rows = T === 2 ? 1 : 2;
      for (let r = 0; r < rows; r++) for (let i = 0; i < 4; i++) {
        const L = (T === 2 ? .38 : .46) - r * .08 + (i === 1 || i === 2 ? .05 : 0);
        const f = mk(petalGeo(L, .1, 0, cfg.base, r === 0 ? tip : 0xf5a930), M.vc, w, v(s * (.17 + r * .03), -.42 + r * .14, -.14 + i * .11));
        f.scale.set(.45, 1, 1); f.rotation.set(-.25 + i * .12, 0, Math.PI - s * .12);
      }
    }
    const held = node(s < 0 ? 'heldPepperL' : 'heldPepperR', w, v(s * .1, -.78, .2));
    const hp = makePepper(M, { L: 1.1, R: .25, bend: .1, red: T === 3 }); hp.scale.setScalar(.55); hp.rotation.set(.4, 0, s * .4); held.add(hp);
    wings.push({ g: w, s, held, restX: T === 1 ? -.25 : -.1 });
  }
  // 腳：髖部樞紐，走路交替擺動
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = node(s < 0 ? 'legL' : 'legR', B, v(s * .36, .46, .04));
    mk(new THREE.CylinderGeometry(.07, .08, .44, 10), M.orange, leg, v(0, -.22, 0));
    const foot = node(s < 0 ? 'footL' : 'footR', leg, v(0, -.405, .04));
    for (const a of [-.55, 0, .55]) {
      const tg = new THREE.Group(); tg.rotation.y = a + s * .12; foot.add(tg);
      mk(new THREE.CapsuleGeometry(.065, .2, 5, 8), M.orange, tg, v(0, 0, .14)).rotation.x = Math.PI / 2;
    }
    mk(new THREE.CapsuleGeometry(.05, .08, 5, 8), M.orange, foot, v(0, 0, -.1)).rotation.x = Math.PI / 2;
    legs.push(leg);
  }
  if (T === 1) mk(new THREE.ConeGeometry(.2, .38, 14), M.body, B, v(0, .85, -.92)).rotation.x = -Math.PI / 2 + .5;
  else for (const [rz, L] of [[-.4, .45], [0, .55], [.4, .45]])
    mk(petalGeo(L, .13, 0, cfg.base, T === 3 ? 0xee7d1d : 0xf0ad35), T === 3 ? M.flame : M.vc, B, v(rz * .15, .8, -.9)).rotation.set(-2.1, 0, rz);

  // 背上的剝皮辣椒（1／2／5 根）
  const peppers = [];
  const addPep = (opts, pos, rx, rz, s = 1) => {
    const h = node('backPepper' + peppers.length, B, pos); h.rotation.set(rx, s < 0 ? Math.PI : 0, rz);
    h.add(makePepper(M, opts)); peppers.push({ h, rx, ry: h.rotation.y, rz, ph: peppers.length * 1.7 }); return h;
  };
  const ring = (parent, pos, r, rot, tube = .045) => { const t = mk(new THREE.TorusGeometry(r, tube, 6, 32), M.strap, parent, pos); t.rotation.set(...rot); return t; };
  const leafAt = (parent, pos, normal, spin, s = 1) => { const m = mk(leafGeo(), M.leaf, parent, pos, s); m.quaternion.setFromUnitVectors(v(0, 0, 1), normal.clone().normalize()); m.rotateZ(spin); };
  let giant = null;
  if (T === 1) addPep({ L: 1.15, R: .26, bend: .1 }, v(.55, 2.1, -.92), .1, .14);
  else if (T === 2) {
    for (const s of [-1, 1]) {
      const h = addPep({ L: 1.32, R: .3, bend: .06 }, v(s * .5, 2.32, -1.05), .1, .08, s);
      ring(h, v(0, -.6, 0), .3, [Math.PI / 2, 0, 0], .035);
      leafAt(h, v(.22, -.45, .05), v(1, 0, .3), -.5, .9);
      ring(B, v(s * .68, 1.55, -.08), .62, [0, Math.PI / 2, 0]);
      mk(SPH, M.strap, B, v(s * .74, 1.9, .42), .07);
      leafAt(B, v(s * .78, 1.95, .38), v(s * .6, .3, 1), s * 2.4, .7);
    }
  } else {
    for (const s of [-1, 1]) {
      addPep({ L: 1.45, R: .3, bend: .05 }, v(s * .52, 2.75, -1.02), .1, .05, s);
      const side = addPep({ L: 1.55, R: .27, bend: .18, red: true }, v(s * 1.0, 2.2, -.45), .25, .3, s);
      leafAt(side, v(.1, -.25, .2), v(.5, 0, 1), -.3, 1);
      ring(B, v(s * .68, 1.55, -.08), .63, [0, Math.PI / 2, 0], .05);
      ring(B, v(s * .4, 1.6, -.85), .42, [.2, 0, s * .6], .04);
      for (const [y, z] of [[2.0, .42], [1.3, .55]]) mk(podGeo(), M.gold, B, v(s * .72, y, z)).rotation.set(.3, 0, s * -.3);
      mk(podGeo(), M.gold, B, v(s * 1.02, 1.45, -.15), 1.2).rotation.z = s * .4;
      leafAt(B, v(s * .8, 2.0, .3), v(s * .7, .4, 1), s * 2.2, .9);
      leafAt(B, v(s * .95, 1.35, .25), v(s, 0, .6), s * 2.8, 1);
      leafAt(B, v(s * .95, 1.85, -.55), v(s, .2, -.4), s * -.8, 1.1);
      leafAt(B, v(s * .5, 1.45, -1.05), v(s * .3, 0, -1), s * 2.6, 1);
      leafAt(B, v(s * .85, .95, -.5), v(s, -.2, -.3), s * 3.0, .9);
    }
    addPep({ L: 1.2, R: .28, bend: -.04, red: true }, v(0, 2.05, -1.18), .15, 0);
    giant = node('giantPepper', B, v(0, 4.05, -.1));
    const gp = makePepper(M, { L: 1.7, R: .42, bend: .1, red: true }); gp.rotation.z = Math.PI / 2; gp.position.x = -.85; giant.add(gp);
  }
  root.traverse(o => { if (o.isMesh && o.material === M.blush) { o.castShadow = false; o.receiveShadow = false; } });

  /* ---------- 姿勢 ---------- */
  const blank = () => ({ lean: 0, yaw: 0, roll: 0, hop: 0, fwd: 0, squash: 0, nod: 0, tilt: 0, beak: 0, eye: 1, giant: 0, crest: 0,
    wing: [{ x: 0, z: 0, hold: 0 }, { x: 0, z: 0, hold: 0 }], leg: [0, 0], pulse: peppers.map(() => 0), sway: 0 });
  // 待機底層：呼吸、點頭、翅膀輕擺、冠羽與背椒晃動；loop=true 時保證首尾相接
  function idle(P, t, dur, k = 1) {
    const n = Math.max(1, Math.round(dur / 2.8));
    P.squash += cyc(t, dur, n) * .012 * k;
    P.nod += cyc(t, dur, Math.max(1, Math.round(n / 2)), .7) * .03 * k;
    for (const w of P.wing) w.z += .03 * cyc(t, dur, n) * k;
    P.crest += cyc(t, dur, n, 1.3) * .06;
    P.sway += 1;
  }
  const blink = (P, t, at) => { if (win(t, at, at + .16)) P.eye = 1 - Math.sin((t - at) / .16 * Math.PI) * .9; };
  // 丟擲：rel=0 放手；翅膀先往後抽辣椒（肩膀往後上方轉）、再甩到前方
  function throwPose(t, P, throws, a, b, hopAmt) {
    for (const th of throws) {
      const rel = t - th.t; if (rel <= -a || rel >= b) continue;
      const i = th.side, s = i ? 1 : -1;
      P.wing[i].x += kf(rel, [[-a, 0], [-a * .35, 2.6], [0, -1.4], [b, 0]]);
      P.wing[i].z += .3 * kf(rel, [[-a, 0], [-a * .35, 1], [0, 0]]);
      if (rel < 0) P.wing[i].hold = 1;
      P.yaw += s * .28 * kf(rel, [[-a, 0], [-a * .35, 1], [0, -1], [b, 0]]);
      P.lean += .12 * kf(rel, [[-a, 0], [-a * .35, -1], [0, 1], [b, 0]]);
      P.hop += hopAmt * kf(rel, [[-a * .35, 0], [.02, 1], [b, 0]]);
      const k = th.pep ?? 0; if (P.pulse[k] != null) P.pulse[k] = Math.max(P.pulse[k], kf(rel, [[-a, 0], [-a * .5, 1], [b, 0]]));
    }
  }
  const ULT = {
    1: () => { const throws = [.62, 1.17, 1.72].map(t => ({ t, side: 1, pep: 0 }));
      return { dur: 2.3, releases: throws.map(th => th.t), pose: (t, P) => {
        P.yaw += .55 * kf(t, [[0, 0], [.18, 1], [.3, 1], [.42, 0]]);
        P.nod += .12 * kf(t, [[0, 0], [.18, 1], [.42, 0]]);
        P.squash += .08 * kf(t, [[0, 0], [.2, 1], [.4, 0]]);
        throwPose(t, P, throws, .32, .2, .18);
      } }; },
    2: () => { const throws = Array.from({ length: 6 }, (_, k) => ({ t: .5 + k * .3, side: k % 2, pep: k % 2 }));
      return { dur: 2.5, releases: throws.map(th => th.t), pose: (t, P) => {
        P.squash += kf(t, [[0, 0], [.15, .12], [.32, -.1], [.45, 0]]);
        P.hop += .3 * kf(t, [[.12, 0], [.28, 1], [.42, 0]]);
        throwPose(t, P, throws, .28, .15, .22);
      } }; },
    3: () => { const sweep = t => kf(t, [[.45, 0], [.7, -.5], [2.25, .5], [2.5, 0]]);
      const throws = Array.from({ length: 12 }, (_, k) => ({ t: .75 + k * .13, side: k % 2, pep: k % 5 }));
      const hover = t => kf(t, [[.3, 0], [.6, 1], [2.9, 1], [3.3, 0]]);
      return { dur: 4.0, releases: [...throws.map(th => th.t), 3.06], pose: (t, P) => {
        const hv = hover(t);
        P.hop += 1.4 * kf(t, [[.3, 0], [.62, 1], [2.35, 1], [2.8, 1.25], [3.08, 1.25], [3.42, 0]]) + hv * Math.sin(t * 9) * .07;
        P.squash += .2 * kf(t, [[0, 0], [.3, 1], [.45, -.6], [.65, 0]]) + .22 * kf(t, [[3.38, 0], [3.48, 1], [3.85, 0]]);
        P.yaw += sweep(t);
        for (const w of P.wing) w.z += hv * .35 * (.5 + .5 * Math.sin(t * 30));
        P.leg[0] += hv * .35; P.leg[1] += hv * .35;
        throwPose(t, P, throws, .17, .07, 0);
        const lift = kf(t, [[2.3, 0], [2.65, 3.0], [2.95, 3.2], [3.08, -1.3], [3.4, 0]]);
        for (const w of P.wing) { w.x += lift; w.z += .25 * Math.max(0, lift) / 3; }
        P.lean += kf(t, [[2.3, 0], [2.9, -.3], [3.08, .45], [3.4, 0]]);
        P.giant = t < 3.06 ? kf(t, [[2.3, 0], [2.6, 1]]) : 0;
        P.crest += .2 * hv * Math.sin(t * 14);
      } }; },
  };
  const ult = ULT[T]();
  const actions = {
    Idle: { dur: 5.6, loop: true, label: '待機', pose: (t, P) => { idle(P, t, 5.6); blink(P, t, 2.2); blink(P, t, 4.7); } },
    Walk: { dur: .9, loop: true, label: '移動', pose: (t, P) => {
      const d = .9; idle(P, t, d, .5);
      P.leg[0] += .55 * cyc(t, d, 1); P.leg[1] -= .55 * cyc(t, d, 1);
      P.roll += .1 * cyc(t, d, 1); P.yaw += .08 * cyc(t, d, 1, Math.PI / 2);
      P.hop += .07 * Math.abs(cyc(t, d, 1)); P.lean += .08;
      for (const [i, w] of P.wing.entries()) { w.z += .12 + .06 * cyc(t, d, 2, i); w.x += .1 * cyc(t, d, 1, i * Math.PI); }
      P.nod += .06 * cyc(t, d, 2);
    } },
    Run: { dur: .5, loop: true, label: '跑步', pose: (t, P) => {
      const d = .5; idle(P, t, d, .3);
      P.leg[0] += .95 * cyc(t, d, 1); P.leg[1] -= .95 * cyc(t, d, 1);
      P.lean += .28; P.hop += .16 * Math.abs(cyc(t, d, 1)); P.roll += .07 * cyc(t, d, 1);
      for (const [i, w] of P.wing.entries()) { w.z += .55 + .35 * cyc(t, d, 2, i * .5); w.x += .3; }
      P.nod -= .15; P.beak += .3;
    } },
    // 打招呼：右翅由肩膀舉起，在頭側左右揮動；頭微歪、張嘴笑
    Wave: { dur: 1.8, loop: false, label: '打招呼', pose: (t, P) => {
      idle(P, t, 1.8, .5);
      const up = kf(t, [[0, 0], [.3, 1], [1.45, 1], [1.8, 0]]);
      P.wing[1].z += 1.9 * up; P.wing[1].x += -.35 * up + .45 * up * Math.sin((t - .3) * 14);
      P.wing[0].z += .1 * up;
      P.tilt += .2 * up; P.yaw += .12 * up; P.beak += .55 * up;
      P.roll -= .05 * up; P.hop += .05 * up * Math.max(0, Math.sin(t * 7));
    } },
    // 歡呼：雙翅高舉連跳兩下、張嘴
    Celebrate: { dur: 1.6, loop: false, label: '歡呼', pose: (t, P) => {
      idle(P, t, 1.6, .3);
      const j = (a) => kf(t, [[a, 0], [a + .12, -1], [a + .3, 1], [a + .5, 0]]);
      const hop = Math.max(0, j(.1)) + Math.max(0, j(.75));
      const crouch = Math.max(0, -j(.1)) + Math.max(0, -j(.75));
      P.hop += .55 * hop; P.squash += .14 * crouch - .06 * hop;
      const up = kf(t, [[0, 0], [.2, 1], [1.35, 1], [1.6, 0]]);
      for (const [i, w] of P.wing.entries()) { w.z += 2.1 * up + .25 * up * Math.sin(t * 22 + i); w.x -= .3 * up; }
      P.leg[0] += .3 * hop; P.leg[1] += .3 * hop;
      P.beak += .8 * up; P.nod -= .15 * up; P.eye = 1 - .45 * up;
      P.yaw += .5 * kf(t, [[.7, 0], [1.2, 1], [1.6, 0]]) * Math.sin(t * 9);
    } },
    Hurt: { dur: .7, loop: false, label: '受擊', pose: (t, P) => {
      const h = kf(t, [[0, 0], [.08, 1], [.4, .6], [.7, 0]]);
      P.lean -= .38 * h; P.fwd -= .25 * h; P.squash += .12 * h;
      P.nod -= .25 * h; P.tilt += .25 * h * Math.sin(t * 40); P.eye = 1 - .8 * h; P.beak += .5 * h;
      for (const w of P.wing) { w.z += .7 * h; w.x += .3 * h; }
    } },
    Attack: { dur: .85, loop: false, label: '普攻 · 啄擊', hit: .3, pose: (t, P) => {
      idle(P, t, .85, .3);
      const k = kf(t, [[0, 0], [.18, -1], [.3, 1], [.48, 1], [.85, 0]]);
      P.lean += k > 0 ? k * .62 : k * .25; P.nod += k > 0 ? k * .35 : k * .2;
      P.fwd += Math.max(0, k) * .55; P.hop += .2 * kf(t, [[.18, 0], [.25, 1], [.32, 0]]);
      P.beak += kf(t, [[0, 0], [.16, 1], [.28, 1], [.31, 0]]);
      P.squash += k < 0 ? -k * .08 : -k * .04;
      for (const w of P.wing) { w.x += k > 0 ? k * .9 : k * .4; w.z += Math.max(0, k) * .5; }
    } },
    Ultimate: { dur: ult.dur, loop: false, label: '絕招 · ' + cfg.ult, releases: ult.releases, pose: (t, P) => { idle(P, t, ult.dur, .5); ult.pose(t, P); } },
  };

  function apply(P) {
    rig.position.set(0, P.hop, P.fwd);
    rig.rotation.set(P.lean, P.yaw, P.roll);
    B.scale.set(1 + P.squash * .6, 1 - P.squash, 1 + P.squash * .6);
    head.rotation.set(P.nod, 0, P.tilt);
    lowBeak.rotation.x = P.beak * .55; upBeak.rotation.x = -P.beak * .12;
    wings.forEach((w, i) => {
      w.g.rotation.set(w.restX + P.wing[i].x, 0, w.s * (.12 + P.wing[i].z));
      w.held.scale.setScalar(P.wing[i].hold ? 1 : 1e-4);
    });
    legs.forEach((l, i) => l.rotation.x = P.leg[i]);
    if (giant) giant.scale.setScalar(Math.max(1e-4, P.giant));
    tuft.rotation.z = P.crest;
    for (const e of eyes) e.scale.y = Math.max(.08, P.eye);
    peppers.forEach((p, i) => { p.h.scale.setScalar(1 + .22 * P.pulse[i]); });
  }
  function pose(name, t) {
    const a = actions[name], P = blank();
    a.pose(Math.min(t, a.dur), P);
    // 背椒持續輕晃（以動作長度取整圈，循環動作首尾相接）
    const n = Math.max(1, Math.round(a.dur / 2));
    peppers.forEach((p, i) => { p.h.rotation.z = p.rz + cyc(t, a.dur, n, p.ph) * .03; });
    apply(P);
  }
  pose('Idle', 0);
  return { root, tier: T, cfg, actions, pose, height: 3.2, family: 'pepper-chick' };
}
