import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const url = (p) => new URL('../' + p, import.meta.url);
const json = (p) => JSON.parse(readFileSync(url(p), 'utf8'));
const text = (p) => readFileSync(url(p), 'utf8');
const map = json('js/fx/pixelfx-map.json'), manifest = json('assets/fx/pixelfx/manifest.json'), coverage = json('authoring/pixelfx-coverage.json'), catalog = json('authoring/pixelfx-catalog.json'), rows = json('authoring/pixelfx-spec-rows.json');
const csv = text('authoring/replacement-audit.csv').replace(/^﻿/, '').split('\r\n').slice(1);

test('244/244 pixelfx IDs sit in the ledger, each with a status and a reason or an event', () => {
  assert.equal(catalog.ids.length, 244); assert.equal(new Set(catalog.ids).size, 244);
  assert.equal(coverage.total, 244); assert.deepEqual(coverage.effects.map((e) => e.id), catalog.ids);
  for (const e of coverage.effects) { assert.ok(['已替換使用', '可搭配使用', '保留原效果', '不適用', '未來預留'].includes(e.status), e.id); assert.ok(e.events?.length || e.reason, e.id + ' has no event and no reason'); }
});

test('every row of the spec tables has a decision: blank mappings = 0', () => {
  assert.equal(rows.length, 100); assert.equal(csv.length, 100);
  for (const l of csv) assert.match(l, /"(已替換使用|可搭配使用|保留原效果|不適用|未來預留)"/, l.slice(0, 60));
  for (const l of csv) assert.ok(!l.includes('缺少決定'));
});

test('decided events exist in the map, and map ids are real catalog ids with baked assets', () => {
  const known = new Set(Object.keys(map.events));
  for (const l of csv) { const m = l.match(/"(?:已替換使用|可搭配使用|未來預留)","([^"]*)"/); if (m) for (const ev of m[1].split(' ').filter(Boolean)) assert.ok(known.has(ev), 'unknown event ' + ev); }
  for (const [ev, list] of Object.entries(map.events)) for (const rule of list) for (const f of rule.fx || []) {
    assert.ok(catalog.ids.includes(f.id), ev + ' uses ' + f.id);
    if (!rule.disabled) assert.ok(manifest.effects[f.id], f.id + ' is not baked');
  }
  for (const list of Object.values(map.ambient)) for (const a of list) assert.ok(manifest.effects[a.id], a.id);
  for (const e of Object.values(manifest.effects)) { assert.ok(existsSync(url('assets/fx/pixelfx/' + e.file)), e.file); assert.ok(e.w <= 1100 && e.h <= 1100, e.file + ' too large for phones'); assert.ok(e.frames <= 20); assert.equal(e.cols * e.cell[0], e.w); }
});

test('future commerce effects are disabled and nothing loads them', () => {
  for (const k of ['commerce.hire', 'commerce.sale', 'commerce.restock', 'commerce.customer', 'commerce.expand']) assert.ok(map.events[k].every((r) => r.disabled));
  assert.ok(!Object.keys(manifest.effects).includes('ui/coin-collect'));
});

test('the moves category never replaces a 3D action, and no Patch Pixel font ships', () => {
  assert.ok(!Object.keys(manifest.effects).some((id) => id.startsWith('moves/')));
  assert.ok(existsSync(url('assets/fx/pixelfx/LICENSE')) && existsSync(url('assets/fx/pixelfx/NOTICE.md')));
  assert.ok(!Object.values(manifest.effects).some((e) => /woff|font/i.test(e.file)));
});
