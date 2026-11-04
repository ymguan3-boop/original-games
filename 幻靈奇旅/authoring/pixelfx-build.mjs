#!/usr/bin/env node
// 離線把 pixelfx 特效烘成靜態 Sprite Sheet（玩家端不跑 Node/npm）。
//   PIXELFX_DIR=<good-open-source-collection/像素特效與動畫-pixelfx> node authoring/pixelfx-build.mjs [id...]
// 只輸出 js/fx/pixelfx-map.json 用到的 id；每個效果一張 PNG，尺寸與時間軸集中在 manifest.json。
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), GAME = join(HERE, '..');
const PIXELFX = process.env.PIXELFX_DIR || 'D:/CLAUDE/_ext/good-open-source-collection/像素特效與動畫-pixelfx';
const OUT = join(GAME, 'assets/fx/pixelfx');
const lib = await import(pathToFileURL(join(PIXELFX, 'tools/lib/fxlib.mjs')).href);
const {encodePNG} = await import(pathToFileURL(join(PIXELFX, 'tools/lib/png.mjs')).href);

const MAX_FRAMES = 20, MAX_SHEET = 1024, ALPHA_MIN = 8;
const map = JSON.parse(readFileSync(join(GAME, 'js/fx/pixelfx-map.json'), 'utf8'));
/* 特定效果的裁切：spec 5-2 要求長演出抽效果層、不得帶內建全畫面暗化 */
const CUT = map.bake || {};
const wanted = process.argv.length > 2 ? process.argv.slice(2) : map.assets;

const trimBox = (frames, w, h) => {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (const f of frames) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f[(y * w + x) * 4 + 3] >= ALPHA_MIN) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : {x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1};
};

const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) && process.argv.length > 2 ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {source: 'pixelfx a84159688af3ca37a4be05a0d422b94451b2e24e', effects: {}};
mkdirSync(OUT, {recursive: true});
let bytes = 0;
for (const id of wanted) {
  const fx = await lib.loadEffect(id), cut = CUT[id] || {};
  const r = lib.renderFrames(fx, {bg: 'none', actor: false, options: cut.options});
  let picked = r.frames;
  const from = cut.from ?? 0, to = cut.to ?? fx.meta.duration + 1;
  picked = picked.filter((f) => f.t >= from && f.t <= to);
  const n0 = picked.length, step = Math.max(1, Math.ceil(n0 / (cut.maxFrames || MAX_FRAMES)));
  picked = picked.filter((_, i) => i % step === 0);
  const clear = picked.map((f) => f.clear), box = trimBox(clear, r.w, r.h);
  if (!box) { console.error('EMPTY', id); process.exitCode = 1; continue; }
  const n = clear.length;
  const cols = Math.max(1, Math.min(n, Math.floor(MAX_SHEET / box.w))), rows = Math.ceil(n / cols);
  if (rows * box.h > MAX_SHEET) console.error('LARGE', id, cols * box.w, rows * box.h);
  const W = cols * box.w, H = rows * box.h, data = new Uint8Array(W * H * 4);
  clear.forEach((f, i) => {
    const ox = (i % cols) * box.w, oy = Math.floor(i / cols) * box.h;
    for (let y = 0; y < box.h; y++) {
      const s = ((y + box.y) * r.w + box.x) * 4;
      data.set(f.subarray(s, s + box.w * 4), ((y + oy) * W + ox) * 4);
    }
  });
  const file = id.replace('/', '-') + '.png', png = encodePNG(W, H, data);
  writeFileSync(join(OUT, file), png); bytes += png.length;
  manifest.effects[id] = {file, w: W, h: H, cols, frames: n, cell: [box.w, box.h], pivot: [fx.meta.origin[0] - box.x, fx.meta.origin[1] - box.y], fps: +(r.fps / step).toFixed(2), loop: !!fx.meta.loop, duration: +(n / (r.fps / step)).toFixed(3)};
  console.log(id.padEnd(30), `${box.w}x${box.h}`.padEnd(9), String(n).padStart(3) + 'f', `${W}x${H}`.padEnd(10), (png.length / 1024).toFixed(0) + 'K');
}
if (process.argv.length <= 2) for (const f of readdirSync(OUT)) if (f.endsWith('.png') && !Object.values(manifest.effects).some((e) => e.file === f)) unlinkSync(join(OUT, f));
writeFileSync(manifestPath, JSON.stringify(manifest));
console.log('assets', Object.keys(manifest.effects).length, 'bytes', bytes);
