// 武器穿透檢查：node check-weapons.js [--baseline]
//   --baseline：不做避讓，量測原始動作的穿透情形
//   預設：做避讓後，逐格＋格與格之間 4 個中間時刻（四元數內插，與 Three.js 播放一致）全部檢查，
//         並檢查手臂角度有沒有突然跳動。
if (process.argv.includes('--baseline')) globalThis.KID_NO_AVOID = true;
require('./kid-model.js'); require('./props.js');
const k = require('./kid-actions.js');
const IDS = ['knifeReady', 'knifeCombo', 'swordReady', 'swordCombo', 'bladesReady', 'bladesCombo', 'gunsReady', 'gunsCombo'];

// 尤拉角 XYZ（R = Rx·Ry·Rz）⇄ 四元數
const eq = ([x, y, z]) => {
  const q = (a, ax) => { const s = Math.sin(a / 2), c = Math.cos(a / 2); return ax === 0 ? [s, 0, 0, c] : ax === 1 ? [0, s, 0, c] : [0, 0, s, c]; };
  const mul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  return mul(mul(q(x, 0), q(y, 1)), q(z, 2));
};
const qe = ([x, y, z, w]) => { // 四元數 → 旋轉矩陣 → 尤拉角 XYZ
  const m00 = 1 - 2 * (y * y + z * z), m01 = 2 * (x * y - z * w), m02 = 2 * (x * z + y * w), m12 = 2 * (y * z - x * w), m22 = 1 - 2 * (x * x + y * y);
  const ey = Math.asin(Math.max(-1, Math.min(1, m02)));
  return Math.abs(m02) < 0.9999999 ? [Math.atan2(-m12, m22), ey, Math.atan2(-m01, m00)] : [Math.atan2(2 * (y * z + x * w), 1 - 2 * (x * x + z * z)), ey, 0];
};
const slerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map((v) => -v); d = -d; }
  if (d > 0.9995) { const r = a.map((v, i) => v + (b[i] - v) * t); const l = Math.hypot(...r); return r.map((v) => v / l); }
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((v, i) => v * wa + b[i] * wb);
};
function poseBetween(a, i, t) {
  const p0 = k.poseAt(a, i), p1 = k.poseAt(a, i + 1), out = {};
  for (const n of Object.keys(p0)) {
    out[n] = {};
    if (p0[n].p) out[n].p = p0[n].p.map((v, j) => v + (p1[n].p[j] - v) * t);
    if (p0[n].s) out[n].s = p0[n].s.map((v, j) => v + (p1[n].s[j] - v) * t);
    if (p0[n].r) out[n].r = qe(slerp(eq(p0[n].r), eq(p1[n].r), t));
  }
  return out;
}

let bad = 0;
for (const id of IDS) {
  const a = k.ACTIONS.find((x) => x.id === id), hs = k.holdsOf(id);
  const key = [], mid = [];
  for (let i = 0; i <= a.frames; i++) key.push({ i, ...k.weaponHits(k.poseAt(a, i), hs) });
  for (let i = 0; i < a.frames; i++) for (const t of [0.25, 0.5, 0.75]) mid.push({ i: i + t, ...k.weaponHits(poseBetween(a, i, t), hs) });
  const all = key.concat(mid), hit = all.filter((r) => r.worst > 0);
  const worst = all.reduce((m, r) => (r.worst > m.worst ? r : m), all[0]);
  // 手臂跳動：相鄰兩格任一手臂關節的旋轉夾角超過 1.3 弧度（約 75°，一格 1/24 秒）算異常
  let jump = 0, jumpMax = 0;
  for (let i = 0; i < a.frames; i++) for (const j of ['upperArmR', 'forearmR', 'handR', 'upperArmL', 'forearmL', 'handL']) {
    const q0 = eq(a.tracks[j].r[i]), q1 = eq(a.tracks[j].r[i + 1]);
    const d = 2 * Math.acos(Math.min(1, Math.abs(q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3])));   // 旋轉夾角
    if (d > jumpMax) jumpMax = d; if (d > 1.3) jump++;
  }
  bad += hit.length;
  console.log(id.padEnd(12), `穿透 ${String(hit.length).padStart(3)}/${all.length} 點`, `最小間隙 ${(-worst.worst * 100).toFixed(1)}cm @${worst.who}`.padEnd(26), `手臂最大單格轉動 ${jumpMax.toFixed(2)}rad${jump ? '（跳動 ' + jump + ' 處）' : ''}`,
    hit.length ? '位置 ' + hit.slice(0, 8).map((r) => r.i.toFixed(2)).join(',') : '');
}
console.log(bad ? `共 ${bad} 個檢查點穿透` : '全部通過：每一格與格間內插（共 ' + IDS.length + ' 個武器動作）都沒有穿透');
