#!/usr/bin/env node
// pixelfx 盤點：把 244 個特效 ID 與規格書每一列都落成機器可讀的決定。
//   node authoring/pixelfx-audit.mjs
// 輸入：pixelfx-map.json、pixelfx-spec-rows.json、pixelfx-catalog.json（244 ID，由固定版本 a841596 產生）
// 輸出：authoring/pixelfx-coverage.json、authoring/replacement-audit.csv
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(HERE, f), 'utf8'));
const map = JSON.parse(readFileSync(join(HERE, '../js/fx/pixelfx-map.json'), 'utf8'));
const rows = read('pixelfx-spec-rows.json'), catalog = read('pixelfx-catalog.json');

const R = (...events) => ({status: '已替換使用', events});
const A = (...events) => ({status: '可搭配使用', events});
const K = (reason) => ({status: '保留原效果', reason});
const N = (reason) => ({status: '不適用', reason});
const F = (...events) => ({status: '未來預留', events});

/* 順序與規格書表格一致；少一列或多一列測試就會失敗。 */
export const DECISIONS = {
  A: [
    A('ambient.world.field'), A('ambient.world.water', 'world.fishing'),
    K('晴天由現有場景光影呈現；god-rays 疊在主場景會蓋住導航與捕捉提示，且規格要求不覆寫全局光照'),
    N('主場景沒有夜間循環或霧區設定，無事件可觸發，不憑空加入'),
    N('主場景沒有雨雪配置；規格明訂不得憑空全場改天氣'),
    R('world.dash'),
    N('一般場景主角沒有普通攻擊事件（戰鬥走擂台與挑戰）'),
    R('world.captureThrow', 'world.captureHit'), R('world.captureSuccess', 'ui.firstCapture'), R('world.pickup'), R('world.heal', 'world.status'),
    K('NPC 提示是 HTML 標籤，保留文字、位置與點擊優先權'),
    R('world.arrive'), R('world.spawn'), R('world.egg'),
    A('ui.victory'),
  ],
  B: [
    R('arena.impact'), R('arena.charge'), R('arena.impact'), R('arena.impact', 'arena.boomerangTrail', 'arena.boomerangHit', 'arena.boomerangCatch'),
    R('arena.release', 'arena.impact'), R('arena.release', 'arena.impact'), R('arena.release', 'arena.impact'), R('arena.release', 'arena.impact'),
    R('arena.impact'), R('arena.release', 'arena.impact'), R('arena.release', 'arena.impact'), R('arena.release', 'arena.impact'),
    R('arena.impact', 'arena.secondHit'), R('arena.release', 'arena.impact'), R('arena.release', 'arena.impact'), R('arena.release', 'arena.impact'),
    R('arena.shot', 'arena.impact'), R('arena.shot', 'arena.impact'), R('arena.shot', 'arena.impact'), R('arena.status'), R('arena.defeat', 'arena.switch'), R('arena.start'),
  ],
  C: [
    R('cave.heroNormal', 'cave.impact'), R('cave.heroNormal'), R('cave.heroNormal', 'cave.bullet'), R('cave.reaper'), R('cave.dash'), R('cave.heroUltimate'), R('cave.heroUltimate'),
    R('cave.spell', 'cave.impact'),
    R('cave.impact'),
    R('cave.impact'), R('cave.spawn', 'cave.death'),
    K('洞穴地面異常由現有預警圈與狀態圖示呈現；碰撞與秒數在 world.js，沒有獨立的陷阱事件可接'),
    R('cave.status'), R('cave.heal'), R('cave.loot'), A('cave.boss', 'cave.spawn'), A('ambient.cave.deep'),
    K('結算與升級是 HTML 面板；pixel-dissolve 為全畫面轉場，會造成黑場閃爍，保留原面板'),
  ],
  D: [
    R('defense.hit'), R('defense.ultimate', 'defense.charge'), R('defense.boss'), R('defense.baseHit'), R('defense.trap'), R('defense.trap'), R('defense.trap'),
    R('defense.skill'), R('defense.mergeUi'), R('defense.buff', 'defense.status'), R('defense.lightning'), R('defense.charge', 'defense.ultimate'),
    R('defense.hit', 'defense.ultimate'), R('defense.death'), R('defense.hit', 'defense.baseHit'),
  ],
  'D-1': Array.from({length: 10}, (_, i) => A('ambient.defense.' + ['meadow', 'pond', 'waterfall', 'orchard', 'forge', 'desert', 'observatory', 'night', 'tower', 'abyss'][i])),
  E: [
    A('commerce.door', 'ambient.commerce.forecourt'), R('commerce.level'),
    K('招牌文字與建築不可被遮擋，維持現有發光招牌'),
    R('commerce.door'), R('commerce.notice'),
    F('commerce.hire'), F('commerce.sale'), F('commerce.restock'), F('commerce.customer'), F('commerce.expand'),
  ],
  F: [
    R('tower.normal', 'tower.hit'), R('tower.ultimate'), R('tower.loot'), R('challenge.slam'), R('challenge.wave'), R('challenge.beam'), R('challenge.feather'),
    R('room.impact', 'room.boomerangTrail'), R('ui.victory'),
  ],
};

/* 分類層級的不適用／保留原因。任何實際進入對照表的 ID 都會蓋過這裡。 */
const REASON = {
  moves: '完整招式含假人與 3–7 秒演出，規格禁止取代原生 3D 動作；只取其效果層時改用對應的 melee／impacts',
  transitions: '全畫面轉場會造成黑白閃屏且現有 scene-loading 已負責過場',
  critters: '裝飾生物：規格禁止新增可捕捉目標，僅用於有環境層的場景',
  explosions: '遊戲內沒有對應的實際爆破事件，不憑空加入',
  shadow: '目前角色屬性沒有暗系，沒有 gameplay 事件可觸發',
  ice: '目前僅少數冰凍事件，由 status/frozen 與 snowflake-burst 涵蓋',
  scifi: '場景風格不符或無對應事件',
  weather: '守護戰以現有 seascape 固定天氣為主控，此款不加入，避免改變既定天氣',
  fire: '無對應事件；火系招式已由 fireball／flame-pillar／fire-breath 涵蓋',
  water: '無對應事件；水系招式已由 geyser／splash／water-orb 等涵蓋',
  lightning: '無對應事件；雷系一律使用局部 zap-hit／charge-up，避免全場閃爍',
  ui: '會顯示固定文字或數字，與遊戲實際數值不符；保留現有 HTML 傷害數字與提示',
  pickups: '無對應的道具事件',
  status: '遊戲沒有此異常狀態',
  holy: '無對應事件',
  nature: '無對應事件',
  arcane: '無對應事件',
  melee: '沒有對應武器',
  impacts: '無對應事件',
  projectiles: '遊戲沒有此武器或投射物',
  spawn: '無對應事件',
};

const usage = new Map(), future = new Map();
for (const [event, list] of Object.entries(map.events)) for (const rule of list) for (const fx of rule.fx || []) (rule.disabled ? future : usage).set(fx.id, [...(rule.disabled ? future : usage).get(fx.id) || [], event]);
for (const [key, list] of Object.entries(map.ambient)) for (const a of list) usage.set(a.id, [...usage.get(a.id) || [], 'ambient.' + key]);

const coverage = catalog.ids.map((id) => {
  const cat = id.split('/')[0];
  if (usage.has(id)) { const events = [...new Set(usage.get(id))], modes = [...new Set(events.map((e) => e.replace(/^ambient\./, '').split('.')[0]))]; return {id, category: cat, status: events.every((e) => e.startsWith('ambient.')) ? '可搭配使用' : '已替換使用', modes, events, baked: true}; }
  if (future.has(id)) return {id, category: cat, status: '未來預留', events: [...new Set(future.get(id))], baked: false, reason: '初光商會店內尚未開放，規則預設停用'};
  return {id, category: cat, status: '不適用', baked: false, reason: REASON[cat]};
});

const section = {}, audit = rows.map((row) => { const i = section[row.section] = (section[row.section] ?? -1) + 1, d = DECISIONS[row.section]?.[i]; return {...row, ...(d || {status: '', reason: '缺少決定'})}; });
const q = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
writeFileSync(join(HERE, 'replacement-audit.csv'), '﻿' + ['區段,項目,現況觸發點,規格建議 ID,決定,接入事件,原因'].concat(audit.map((r) => [r.section, r.item, r.trigger, r.ids.join(' '), r.status, (r.events || []).join(' '), r.reason].map(q).join(','))).join('\r\n'));
const summary = {};for (const c of coverage) summary[c.status] = (summary[c.status] || 0) + 1;
writeFileSync(join(HERE, 'pixelfx-coverage.json'), JSON.stringify({source: map.source, total: coverage.length, summary, effects: coverage}, null, 1));
console.log('244 清冊', coverage.length, summary);
const rowSummary = {};for (const r of audit) rowSummary[r.status] = (rowSummary[r.status] || 0) + 1;
console.log('規格列', audit.length, rowSummary);
