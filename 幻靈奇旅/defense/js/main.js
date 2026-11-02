/* 幻靈守護戰: island sea chart, summons, dealt hand (七大罪 style merging), HUD and game loop. Reads the town save
   (wardrobe outfit, original unlocks) read-only; gacha points and bag items go through the shared cave ledger
   (PhantomCaveBridge); its own records (summoned spirits, deck, cleared islands, boat position) live in
   phantom-defense-v1. */
import {STAGES, SHAPES, ELEMENTS, ELEMENT_EFFECTS, SUPPORT, ITEMS, DECK_SIZE, DECK_BASE, DECK_RED, HAND_SIZE, ULT_CD, DEAL_EVERY, passiveLines, ultCooldown, TRAPS, killPoints, isBaseCard, isRedCard, profileFor, isSupport, createGame, beginDealing, step, playCard, moveCard, canPlay, useItem, itemReady, elementMultiplier} from './rules.js?v=20261103-roles-v2';
import {loadEngine, loadGltf, cloneModel} from './actors.js';
import {createToonKit} from './style.js';
import {createIslandRenderer} from './islands3d.js';
import {createView} from './view.js?v=20261103-roles-v2';
import {createIslandMap} from './islands.js?v=20261102-chart-v4';
import {defensePool, starterRewards, drawWithStore, DRAW_COST, STARTER_COUNT} from './gacha.js';
import {buildPath} from './stages.js?v=20261103-forge-v2';
import {createStore, initialState} from '../../survivors/js/save-bridge.js';
import {costumeFor} from '../../survivors/js/costume-effects.js';
import {ITEMS as CAVE_ITEMS} from '../../survivors/js/inventory.js';
import {summonMarkup, startSummon} from '../../survivors/js/summon-view.js';
import {groupRewards} from '../../survivors/js/reward-groups.js';
import {itemPicture} from '../../survivors/js/item-pictures.js';
import {ROLE_META, ROLE_SKILLS, roleFor, ultimateFor, ultimateDescription, roleLabel, ULTIMATE_SPACING} from './role-skills.js?v=20261103-roles-v2';
import {stageWeather, STAGE_WEATHER} from './seascape.js?v=20261103-weather-v1';
import {icon} from '../../survivors/js/ui-art.js';
import {createCombatAudio} from '../../survivors/js/combat-audio-v17.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'phantom-defense-v1';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let data, record, view, audio, game = null, speed = 1, paused = false, last = 0, acc = 0, lastImpact = 0;
let pendingDealingScene = null, startSerial = 0;
/* merged cards that are playing their evolution in their own frame: uid -> {from, to, start} */
const evolvingCards = new Map(), EVO_TIME = 2.4;

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
function saveRecord() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(record)); } catch {} }
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2200); }
function picture(id) { const a = data.art[id]; return '../' + (a?.image || 'portraits/' + id + '.png'); }
function spirit(id) { return data.spiritMap.get(id); }
function shapeLabel(id, strong) {
  const p = profileFor(spirit(id), data.entries.get(id), strong);
  if (!strong) return roleFor(id).basic === 'magic' ? '法術攻擊' : roleFor(id).basic === 'heal_or_magic' ? '治療／法術' :
    roleFor(id).basic === 'ranged' ? '遠距普攻' : '近距普攻';
  return ultimateFor(id)?.description || SHAPES[p.type].label;
}

async function loadData() {
  const get = (p) => fetch(new URL('../' + p, location.href)).then((r) => { if (!r.ok) throw Error('讀取失敗：' + p); return r.json(); });
  const [spirits, art, catalog, evolution, pool] = await Promise.all([get('data/spirits.json'), get('data/card-art.json'), get('data/spirit-catalog.json'), get('survivors/data/evolution.json'), get('survivors/data/gacha-pool.json')]);
  return {spirits, art, catalog, evolution, pool, excluded: pool.excludedIds || [], spiritMap: new Map(spirits.map((s) => [s.id, s])), entries: new Map((catalog.entries || []).map((e) => [e.id, e]))};
}

/* The main game's dex card (css/collection-card.css + assets/cards/frame.png). */
function cardHtml(id, {line} = {}) {
  const s = spirit(id), number = data.entries.get(id)?.number || '—';
  const info = line || `${esc(roleLabel(id))} · ${esc(s.rarity || '普通')} · 第 ${s.stage || 1} 階段`;
  return `<article class="collectionCard" data-frame="${s.cardFrame || 'yellow'}"><span class="collectionNumber">No.${number}</span><span class="class-medal role-${roleFor(id).basic}" title="${esc(roleLabel(id))}">${roleFor(id).icon}</span><img class="collectionArt" src="${picture(id)}" alt="${esc(s.name)}" decoding="async"><img class="collectionFrame" src="../assets/cards/frame.png" alt="" decoding="async"><h3 class="collectionName">${esc(s.name)}</h3><div class="collectionInfo"><div class="collectionType">${info}</div><div class="collectionStats"><span>HP ${s.hp}</span><span>攻擊 ${s.attack}</span></div></div></article>`;
}

/* ---------- lobby ---------- */
/* The deck is built from spirits summoned on the islands (record.owned): base spirits (unevolved yellow / purple
   cards and 三色蛋) and red support legends. Evolved forms appear in battle by merging. */
function availableUnits() {
  const owned = (record.owned || []).filter((id) => data.spiritMap.has(id));
  return {base: owned.filter((id) => isBaseCard(data.evolution, id) && !isRedCard(id)).map((id) => ({id})), red: owned.filter(isRedCard).map((id) => ({id}))};
}
/* shared wallet and progress */
const journey = () => readJson('phantom_journey_v1', {});
function caveStore() { return createStore(globalThis.PhantomCaveBridge.caveStorage(initialState)); }
function points() { try { return caveStore().state.points; } catch { return 0; } }
function gachaPool() { return defensePool(data.pool, journey(), new Set(data.spiritMap.keys())); }
function unlockedStage() { let i = 0; while (i < STAGES.length - 1 && record.cleared[STAGES[i].id]) i++; return i; }
const deckBase = () => record.deck.filter((id) => isBaseCard(data.evolution, id));
const deckRed = () => record.deck.filter(isRedCard);

function unitButton({id, trial = false}) {
  const n = record.deck.indexOf(id), sup = SUPPORT[id];
  const line = sup ? `✨ 技能：${esc(sup.skill)}` : `${esc(roleLabel(id))} · ${shapeLabel(id, false)}`;
  return `<button class="collectionThumb ${n >= 0 ? 'on' : ''}" data-unit="${id}" title="${esc(sup ? sup.text : '大絕：' + shapeLabel(id, true))}">${trial ? '<span class="trial">體驗</span>' : ''}${n >= 0 ? '<span class="order">✓</span>' : ''}${sup ? '<span class="skilltag">輔助</span>' : ''}${cardHtml(id, {line})}</button>`;
}

let chart = null;
function normalizeDeck() {
  const units = availableUnits(), valid = new Set([...units.base, ...units.red].map((u) => u.id));
  record.deck = (record.deck || []).filter((id) => valid.has(id));
  record.deck = [...deckBase().slice(0, DECK_BASE), ...deckRed().slice(0, DECK_RED)];
  for (const u of units.base) if (deckBase().length < DECK_BASE && !record.deck.includes(u.id)) record.deck.unshift(u.id);
  for (const u of units.red) if (deckRed().length < DECK_RED && !record.deck.includes(u.id)) record.deck.push(u.id);
}
function renderLobby() {
  normalizeDeck();
  const open = unlockedStage();
  if (record.stage > open) record.stage = open;
  chart.update({open, cleared: record.cleared, selected: record.stage, boatAt: record.boatAt, bosses: STAGES.map((s) => picture(s.boss))});
  $('pointsNow').textContent = points().toLocaleString();
  renderIslePanel();
}
function renderIslePanel() {
  const i = record.stage, s = STAGES[i], boss = spirit(s.boss), nb = deckBase().length, nr = deckRed().length, best = record.best?.[s.id] || 0;
  const len = buildPath(s.path).length, route = len < 70 ? '短' : len < 105 ? '中' : '長';
  const traps = (s.traps || []).map((t) => TRAPS[t.kind].name), uniq = [...new Set(traps)].map((n) => `${n}×${traps.filter((x) => x === n).length}`);
  const deck = record.deck.map((id) => `<img src="${picture(id)}" alt="${esc(spirit(id).name)}" title="${esc(spirit(id).name)}" data-frame="${spirit(id).cardFrame || 'yellow'}">`).join('') + '<i></i>'.repeat(Math.max(0, DECK_SIZE - record.deck.length));
  $('islePanel').innerHTML = `<div class="isle-card">
    <div class="isle-title"><small>第 ${i + 1} 島</small><h2>${esc(s.name)}</h2><span class="weather-pill">${stageWeather(s.scene).icon} ${stageWeather(s.scene).name}</span>${record.cleared[s.id] ? `<span class="cleared-tag">已通關 ${'★'.repeat(best)}<em>可重複挑戰</em></span>` : ''}</div>
    <div class="isle-boss"><img src="${picture(s.boss)}" alt=""><div><small>${i < 5 ? '小魔王' : '大魔王'}・坐鎮酒桶</small><b>${esc(boss.name)}</b><span class="boss-class">${esc(roleLabel(boss.id))}</span></div></div>
    <div class="isle-facts"><span>${stageWeather(s.scene).icon} ${stageWeather(s.scene).name}</span><span>🛤️ 路線 ${route}</span><span>${uniq.length ? '⚠️ ' + uniq.join('、') : '🌿 無陷阱'}</span><span>🎟️ 擊倒 +${killPoints(i)}・魔王 +${killPoints(i, true)}</span></div>
    <div class="isle-deck"><div class="deck-strip">${deck}</div><button class="tool small" data-open="deck">🃏 編組 ${nb + nr}/${DECK_SIZE}</button></div>
    ${nb ? '<button id="start" class="primary wide">⚔️ 出擊！</button>' : '<button class="primary wide" data-open="gacha">🎁 先轉蛋取得幻靈</button>'}
  </div>`;
}
async function sailTo(i) {
  if (chart.boatAt === i) return;
  await chart.sail(chart.boatAt, i);
  record.boatAt = i; saveRecord();
}
async function pickIsle(i) {
  if (i > unlockedStage() || chart.sailing) return;
  record.stage = i; saveRecord(); renderLobby();
  await sailTo(i);
}
async function beginStage() {
  if (chart.sailing) return;
  if (!deckBase().length) { openGacha(); return; }
  await sailTo(record.stage);
  startGame();
}
/* after a cleared stage: back on the chart, the boat sails the lane to the next island and the battle begins */
async function voyage(i, autoStart) {
  record.stage = i; saveRecord(); renderLobby();
  await sailTo(i);
  if (autoStart) { await new Promise((r) => setTimeout(r, 400)); startGame(); }
}
function nextVoyage(i) { $('modal').close(); leaveGame(); voyage(i, true); }
/* back to the town pier: straight there, without retracing the lanes (the page switches at once) */
function sailHome() {
  if (chart.sailing) return;
  $('modal').open && $('modal').close();
  record.boatAt = -1; saveRecord();
  if (globalThis.PhantomTransition) PhantomTransition.navigate('../?fromDock=1', '搭快艇返回初光鎮'); else location.href = '../';
}
/* the boatman on the chart's dock: rules, summons, or a ride home */
function openBoatman() {
  openModal(`${ribbon('老船夫', '⚓')}
    <div class="boatman-card"><img src="../portraits/boatman-normal.svg" alt="老船夫"><p>歡迎回到碼頭！想聽聽「幻靈守護戰」怎麼玩、去轉蛋機抽幻靈，還是直接回初光鎮？</p></div>
    <div class="pause-menu"><button class="primary big" id="bmGacha">🎰 群島轉蛋</button><button id="bmRules">📖 守護戰怎麼玩</button><button id="bmHome">🚤 回初光鎮（直接回碼頭）</button><button data-close>先不用</button></div>`, 'pause');
  $('bmGacha').onclick = () => { $('modal').close(); openGacha(); };
  $('bmRules').onclick = showHowTo;
  $('bmHome').onclick = sailHome;
}

function bindLobby() {
  chart = createIslandMap($('seaChart'), {stages: STAGES, esc, onPick: (i) => pickIsle(i), onHome: openBoatman});
  $('islePanel').onclick = (e) => {
    if (e.target.closest('#start')) beginStage();
    else if (e.target.closest('[data-open="deck"]')) openDeck();
    else if (e.target.closest('[data-open="gacha"]')) openGacha();
  };
  $('gachaBtn').onclick = () => openGacha();
  $('closePanel').onclick = closePanel;
  $('panel').addEventListener('close', () => { summonController?.dispose(); summonController = null; renderLobby(); });
  $('deckBtn').onclick = openDeck;
  $('howto').onclick = showHowTo;
  $('homeBtn').onclick = sailHome;
}

/* deck editor: base spirits and red support cards from the summoned collection */
function openDeck() {
  normalizeDeck();
  const units = availableUnits(), nb = deckBase().length, nr = deckRed().length;
  openModal(`${ribbon('出擊卡組', '🃏')}
    <p class="result-sub">基礎幻靈 ${nb}/${DECK_BASE}・技能卡 ${nr}/${DECK_RED}（職業決定攻擊方式，四名出戰角色搭配兩張技能卡）</p>
    <div class="role-legend">${Object.values(ROLE_META).map((r) => `<span>${r.icon} ${r.label}</span>`).join('')}</div>
    <div class="panel-scroll"><h3 class="roster-group">基礎幻靈 <small>黃卡、紫卡的未進階幻靈與三色蛋</small></h3><div class="roster">${units.base.map(unitButton).join('') || '<p class="muted">還沒有基礎幻靈，先去轉蛋吧！</p>'}</div>
    <h3 class="roster-group">紅卡輔助 <small>點擊施放技能，合成升星</small></h3><div class="roster">${units.red.map(unitButton).join('') || '<p class="muted">紅卡可由轉蛋取得（需先在原探索收錄）。</p>'}</div></div>
    <div class="modal-actions center"><button class="tool" id="deckGacha">🎰 去轉蛋</button><button class="primary big" data-close>完成</button></div>`, 'howto');
  $('deckGacha').onclick = () => { $('modal').close(); openGacha(); };
  $('modalBody').querySelectorAll('[data-unit]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.unit, k = record.deck.indexOf(id), red = isRedCard(id);
    if (k >= 0) record.deck.splice(k, 1);
    else if (red && deckRed().length >= DECK_RED) record.deck.splice(record.deck.indexOf(deckRed()[0]), 1, id);
    else if (!red && deckBase().length >= DECK_BASE) record.deck.splice(record.deck.indexOf(deckBase()[0]), 1, id);
    else record.deck.push(id);
    saveRecord(); renderIslePanel(); openDeck();
  }));
}

/* Summons in the endless cave's own gacha dialog (same markup, art and summon film: survivors/js/summon-view.js,
   item-pictures.js, reward-groups.js; styles from the cave stylesheets plus css/cave-gacha.css). The first summon is
   free with four yellow base spirits; after that single and ten draws spend the shared cave points. */
const caveArt = (html) => String(html).replace(/src="assets\//g, 'src="../survivors/assets/');
let summonController = null;
function openPanel(title, html, view) {
  summonController?.dispose(); summonController = null;
  const p = $('panel'); p.dataset.view = view; $('panelTitle').textContent = title; $('panelBody').innerHTML = html;
  if (!p.open) p.showModal();
}
function closePanel() { summonController?.dispose(); summonController = null; $('panel').close(); renderLobby(); }
function panelButton(text, fn, className = '') { const b = document.createElement('button'); b.textContent = text; b.className = className; b.onclick = fn; $('panelBody').append(b); return b; }
const wallet = () => '<div class="wallet-strip"><span>' + caveArt(icon('points')) + '持有點數・與無盡洞穴共用</span><strong>' + points().toLocaleString() + '<small>點</small></strong></div>';
const itemName = (id) => CAVE_ITEMS[id]?.name || id;
function openGacha() {
  const first = !record.starterClaimed, pts = points(), pool = gachaPool();
  openPanel('群島轉蛋機', wallet() + '<div class="gacha-intro"><button class="gacha-machine compact-summoner" aria-label="轉動轉蛋機">' + caveArt(itemPicture('summon-machine')) + '</button><div><strong>尋找下一位夥伴</strong><p>幻靈・補給・增幅<br>' + (first ? '第一次召喚免費，保底 4 隻黃卡' : '道具放進無盡洞穴背包') + '</p></div></div><div class="draw-actions" id="drawActions"></div>'
    + '<p class="pity-line">目前可抽 <b>黃 ' + pool.yellow.length + '・紫 ' + pool.purple.length + '・紅 ' + pool.red.length + '</b> · 紫卡紅卡需先在原探索收錄</p>'
    + '<details class="pool-details"><summary>獎池與機率</summary><p>幻靈10%（黃6%・紫3%・紅1%）<br>補給45%・技能22.5%・能力22.5%（放進無盡洞穴背包）<br>基礎幻靈範圍與無盡洞穴轉蛋相同，寶箱怪、書本怪與水蛟龍王不在池內。重複黃／紫／紅卡返還50／100／500點。</p></details>', 'gacha');
  const actions = $('drawActions'), add = (text, fn, cls, disabled) => { const b = document.createElement('button'); b.textContent = text; b.className = cls; b.disabled = disabled; b.onclick = fn; actions.append(b); return b; };
  if (first) add('新手召喚 · 免費（保底 4 隻黃卡）', claimStarter, 'primary', false);
  else for (const n of [1, 10]) add((n === 1 ? '召喚一次' : '召喚十次') + ' · ' + (n * DRAW_COST).toLocaleString() + ' 點', () => drawBatch(n), n === 10 ? 'primary' : '', pts < n * DRAW_COST);
  $('panelBody').querySelector('.gacha-machine').onclick = () => { const b = actions.querySelector('button'); if (b.disabled) toast('點數不足，擊倒魔物可獲得點數'); else b.click(); };
}
function claimStarter() {
  const r = starterRewards(gachaPool());
  record.owned = [...new Set([...(record.owned || []), ...r.map((x) => x.id)])]; record.starterClaimed = true; saveRecord();
  showRewards(r, '新手召喚', 0);
}
function drawBatch(n) {
  try {
    const rewards = drawWithStore(caveStore(), gachaPool(), record.owned || [], n).value;
    record.owned ||= [];
    for (const r of rewards) if (r.kind === 'spirit' && !record.owned.includes(r.id)) record.owned.push(r.id);
    saveRecord(); showRewards(rewards, '命運共鳴', n);
  } catch (e) { toast(e.message); }
}
/* the cave summon film, skippable; it reveals the rewards when it ends */
function showRewards(rewards, title, repeat) {
  const token = String(Date.now());
  openPanel(title, summonMarkup(rewards, picture) + '<button id="skipSummon" class="primary">跳過動畫，揭曉獎勵</button>', 'summon');
  const panel = $('panel'); panel.dataset.summon = token;
  const reveal = () => { if (panel.dataset.view !== 'summon' || panel.dataset.summon !== token) return; summonController?.dispose(); summonController = null; revealRewards(rewards, title, repeat); };
  $('skipSummon').onclick = reveal;
  $('panelBody').querySelector('.summon-v07').addEventListener('summoncomplete', reveal, {once: true});
  summonController = startSummon(panel, rewards, picture);
}
function revealRewards(rewards, title, repeat) {
  const groups = groupRewards(rewards), total = rewards.reduce((n, r) => n + (r.quantity || 1), 0);
  openPanel(title === '新手召喚' ? '新手召喚' : '本次獲得', '<div class="reward-summary"><span>獲得 <b>' + total + '</b> 份獎勵 · ' + groups.length + ' 種</span><span>剩餘 <b>' + points().toLocaleString() + '</b> 點</span></div><div class="reward-list">' + groups.map((r) => {
    const sp = r.kind === 'spirit', color = sp ? r.color || 'yellow' : 'supply';
    return '<article class="reward-entry ' + color + '" data-reward="' + r.id + '"><div class="reward-portrait">' + (sp ? '<img src="' + picture(r.id) + '" alt="' + esc(spirit(r.id).name) + '">' : caveArt(itemPicture(r.id))) + '</div><div class="reward-copy"><small>' + (sp ? {yellow: '黃卡', purple: '紫卡', red: '紅卡'}[color] : '道具') + '</small><strong>' + esc(sp ? spirit(r.id).name : itemName(r.id)) + '</strong><p>' + (sp ? (r.duplicate ? '重複 → 返還 ' + (r.refund || 0) * r.quantity + ' 點' : '新增幻靈・可編入卡組') : '已存入無盡洞穴背包') + '</p></div><b class="reward-qty">×' + r.quantity + '</b></article>';
  }).join('') + '</div>', 'rewards');
  if (repeat) { const again = panelButton((repeat === 10 ? '再召喚十次' : '再召喚一次') + ' · ' + (repeat * DRAW_COST).toLocaleString() + ' 點', () => drawBatch(repeat), 'primary reward-confirm'); again.disabled = points() < repeat * DRAW_COST; if (again.disabled) again.textContent += '（點數不足）'; panelButton('返回轉蛋機', openGacha); }
  panelButton('收下全部獎勵', closePanel, repeat ? 'reward-confirm' : 'primary reward-confirm');
}

function showHowTo() {
  const tip = (icon, title, body) => `<section class="tip"><div class="tip-icon">${icon}</div><div><h3>${title}</h3>${body}</div></section>`;
  const roles = Object.values(ROLE_META).map((r) =>
    `<tr><td>${r.icon} ${r.label}</td><td>${r.basic === 'none' ? '只施放技能' : r.basic === 'heal_or_magic' ? '治療／法術' : r.basic === 'magic' ? '法術' : r.basic === 'ranged' ? '遠程普攻' : '近戰普攻'}</td><td>${r.range ? r.range.toFixed(1) : '—'}</td></tr>`).join('');
  const weathers = STAGES.map((s, i) => `<span class="weather-chip">${i + 1}. ${esc(s.name)}・${stageWeather(s.scene).icon} ${stageWeather(s.scene).name}</span>`).join('');
  const supports = Object.entries(SUPPORT).map(([id, skill]) =>
    `<li><b>${esc(spirit(id).name)}・${esc(skill.skill)}</b>：${esc(skill.text)}</li>`).join('');
  openModal(`${ribbon('守護戰 V2.0｜職業與技能', '📖')}
    <div class="panel-scroll">
    ${tip('⚔️','職業與基本攻擊', `<p>取消屬性相克。普通攻擊只分近距離、遠距離和法術；牧師優先治療最低血量比例隊友，必要時才施放弱法術。</p><table class="counter-table"><tr><th>職業</th><th>攻擊類型</th><th>距離</th></tr>${roles}</table>`)}
    ${tip('✨','61 隻專屬大絕', '<p>每位幻靈都有自己的大絕招、傷害倍率、範圍或補血效果；依原有角色模型動畫施放。卡牌長按可查看詳細效果。</p>')}
    ${tip('⏳','大絕錯峰施放', `<p>全場同一時間只允許一個重型大絕啟動；每次間隔至少 ${ULTIMATE_SPACING} 秒。其他幻靈繼續普攻，支援技能與塔上魔王同樣排隊，避免特效同時爆發造成卡頓。</p>`)}
    ${tip('🌤️','固定關卡天氣', `<p>每關開始即固定自己的天空和天氣，戰鬥、受傷、技能和暴擊都不改變天色：</p><div class="weather-grid">${weathers}</div>`)}
    ${tip('🏝️','群島航線', '<p>從初光鎮碼頭出發，依序經過十個主題島；通關後可挑戰下一島，已通關島可重複挑戰。</p>')}
    ${tip('🃏','卡組與升星', `<p>四張基礎幻靈加兩張技能卡，手牌最多 ${HAND_SIZE} 張；相鄰相同卡合成升星，提升專屬技能效果。場上出戰上限 ${20} 隻。</p>`)}
    ${tip('🔮','支援技能卡', `<ul class="mini">${supports}</ul>`)}
    ${tip('🎒','道具', `<p>${Object.values(ITEMS).map((it) => `<span class="chip">${it.icon} ${it.name}</span>`).join('')}</p>`)}
    </div>
    <div class="modal-actions center"><button class="primary big" data-close>開始守護戰</button></div>`,'howto');
}

/* ---------- battle ---------- */
async function startGame() {
  /* Loading is not gameplay. Stop any previous battle and reset the simulation
     clock even when this is a restart or an automatic next-island voyage. */
  const serial = ++startSerial;
  pendingDealingScene = null;
  game = null;
  acc = 0; last = 0; paused = true;
  $('hud').hidden = true;
  $('loading').hidden = false; $('loadingText').textContent = '正在準備戰場…'; $('loadingBar').style.width = '15%';
  try {
    await loadEngine();
    if (!view) view = createView($('world'), {spirits: data.spirits, catalog: data.catalog});
    if (!audio) audio = createCombatAudio();
    view.costume = costumeFor(journey()).id;
    game = createGame({stageIndex: record.stage, deck: record.deck, spirits: data.spirits, catalog: data.catalog, evolution: data.evolution, deferDeal: true, hooks: {fire: (f, target, strong) => view.fire(f, target, strong)}});
    game.runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    view.setGame(game);
    $('loadingBar').style.width = '40%'; $('loadingText').textContent = '幻靈們正在集合…';
    await Promise.race([view.preload([...record.deck, ...game.stage.groups.map((g) => g.species)]), new Promise((r) => setTimeout(r, 9000))]);
    $('loadingBar').style.width = '100%';
    if (serial !== startSerial) return;
  } catch (e) {
    if (serial !== startSerial) return;
    console.error(e); toast(e.message); $('loading').hidden = true;
    game = null; $('hud').hidden = true; $('lobby').hidden = false;
    return;
  }
  $('loading').hidden = true; $('lobby').hidden = true; $('hud').hidden = false;
  speed = 1; paused = false; handSig = ''; acc = 0; last = 0;
  /* Wait until the first visible 3D battle frame finishes rendering. The
     loop below then deals the opening three cards and starts the 3.2 s clock. */
  pendingDealingScene = game;
  $('stageName').textContent = `${record.stage + 1}. ${game.stage.name}・${stageWeather(game.stage.scene).icon} ${stageWeather(game.stage.scene).name}`;
  renderHand(); hud();
  banner(game.stage.name);
  setTimeout(() => game && toast('拖曳卡片排列，相同的卡相鄰會合成；點一下卡片派出'), 2400);
  globalThis.PhantomBgm?.setScene?.('arena');
}

/* credit this battle's kill points to the shared cave wallet once (idempotent per run id) */
function creditPoints() {
  if (!game || game.credited) return 0; game.credited = true;
  const pts = game.stats.points; if (!pts) return 0;
  try { globalThis.PhantomCaveBridge.reward('defense:' + game.runId, pts); return pts; } catch (e) { console.warn(e); toast('點數寫入失敗：' + e.message); return 0; }
}
function leaveGame() {
  creditPoints();
  game = null; $('hud').hidden = true; $('lobby').hidden = false; $('modal').close();
  view?.setGame(null); audio?.stop?.();
  globalThis.PhantomBgm?.setScene?.('general');
  renderLobby();
}

/* ---------- hand ---------- */
let handSig = '', fresh = new Map(), drag = null;
function renderHand() {
  if (drag) return; /* keep the held card in place (dragging or showing its info); re-render after release */
  const sig = game.hand.map((c) => c.uid).join(',') + '|' + game.fighters.filter((f) => f.side === 'ally' && f.hp > 0).length;
  if (sig === handSig) return;
  handSig = sig;
  $('hand').innerHTML = game.hand.map((c, i) => {
    const sup = SUPPORT[c.species], anim = fresh.get(c.uid) || '';
    const line = sup ? `✨ 技能：${esc(sup.skill)}` : `${esc(roleLabel(c.species))} · ${shapeLabel(c.species, false)}`;
    return `<button class="hand-card ${sup ? 'support' : ''} ${canPlay(game, i) ? '' : 'disabled'} ${anim}" data-uid="${c.uid}" title="${esc(sup ? sup.text : spirit(c.species).name + '・大絕' + shapeLabel(c.species, true))}"><span class="stars stars-${spirit(c.species).cardFrame || 'yellow'}">${'<i>★</i>'.repeat(c.rank)}</span>${sup ? '<span class="badge">技能</span>' : ''}${cardHtml(c.species, {line})}${evoOverlay(c.uid)}</button>`;
  }).join('');
  fresh.clear();
}
/* The original evolution beat (old and new form flashing as white silhouettes, then a burst) played over the
   card art. A negative animation delay keeps it running smoothly when the hand re-renders mid-animation. */
function evoOverlay(uid) {
  const e = evolvingCards.get(uid); if (!e) return '';
  const t = (performance.now() - e.start) / 1000; if (t >= EVO_TIME) { evolvingCards.delete(uid); return ''; }
  return `<span class="evo-anim" style="--t:-${t.toFixed(2)}s"><img class="evo-old" src="${picture(e.from)}" alt=""><img class="evo-new" src="${picture(e.to)}" alt=""><i class="evo-flash"></i><i class="evo-rays"></i><b class="evo-label">進化！</b></span>`;
}
const indexOfUid = (uid) => game.hand.findIndex((c) => c.uid === uid);
function play(uid) {
  if (!game || game.result) return;
  const i = indexOfUid(uid); if (i < 0) return;
  /* a support spirit jumps out of this card, so the view needs where the card is on screen */
  const el = $('hand').querySelector(`[data-uid="${uid}"]`); if (el && isSupport(game.hand[i].species)) { const r = el.getBoundingClientRect(); view.cardOrigin = {x: r.left + r.width / 2, y: r.top + r.height * 0.4}; }
  try { playCard(game, i); hud(); } catch (e) { toast(e.message); }
}

/* Drag-and-drop in the hand: a tap plays the card; dragging it moves it, and dropping it beside an identical card
   merges them (spirits evolve, support cards gain a star). Cards are tracked by uid because deals can reshuffle. */
function dropIndex(x, dragged) {
  const others = [...$('hand').querySelectorAll('.hand-card')].filter((el) => el !== dragged);
  return others.filter((el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2 < x; }).length;
}
function markDrop(x, dragged) {
  const others = [...$('hand').querySelectorAll('.hand-card')].filter((el) => el !== dragged), at = dropIndex(x, dragged);
  others.forEach((el, k) => { el.classList.toggle('drop-before', k === at); el.classList.toggle('drop-after', k === at - 1 && at === others.length); });
}
/* Long-press a hand card: attack, ultimate, passive and effect notes for that spirit (support cards: the skill). */
function cardInfoHtml(card) {
  const s = spirit(card.species), sup = SUPPORT[card.species], r = roleFor(card.species),
    u = ultimateFor(card.species), atk = shapeLabel(card.species, false);
  const row = (tag, title, body) => `<div class="ci-row"><span class="ci-tag ${tag}">${title}</span><div>${body}</div></div>`;
  const passives = passiveLines(s);
  const rows = sup
    ? row('t-skill','輔助',`<b>${esc(sup.skill)}</b>　${esc(sup.text)}<br><small>大絕排隊施放，避免視覺效果重疊。★${card.rank}</small>`)
    : row('t-atk','職業',`<b>${esc(roleLabel(s.id))}</b>　${atk}・距離 ${r.range.toFixed(1)}<br><small>普攻不再判斷屬性相克，特效仍沿用原動畫。</small>`)
      + row('t-ult','大絕',`<b>${esc(u?.name || s.skills?.[1]?.name || '大絕')}</b>　${esc(u?.description || '專屬技能')}<br><small>冷卻 ${+ultCooldown(s).toFixed(1)} 秒，至少間隔 ${ULTIMATE_SPACING} 秒錯峰施放。★${card.rank}</small>`)
      + row('t-pas','被動',passives.length ? passives.map(esc).join('<br>') : '無被動能力');
  return `<div class="ci-head" data-frame="${s.cardFrame || 'yellow'}"><img src="${picture(card.species)}" alt=""><div><b>${esc(s.name)}</b><span class="stars-${s.cardFrame || 'yellow'}">${'<i>★</i>'.repeat(card.rank)}</span><small>${esc(roleLabel(s.id))}・第 ${s.stage || 1} 階段</small></div></div>`
    + rows + row('t-eff','提醒','<small>職業取代屬性剋制；燃燒、減速與控制只來自角色專屬技能或被動。</small>');
}

function showCardInfo(el, card) {
  const box = $('cardInfo'); box.innerHTML = cardInfoHtml(card); box.hidden = false;
  const r = el.getBoundingClientRect(), w = box.offsetWidth;
  box.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  box.style.top = Math.max(8, r.top - box.offsetHeight - 14) + 'px';
  el.classList.add('inspecting');
}
function hideCardInfo() { $('cardInfo').hidden = true; $('hand').querySelectorAll('.inspecting').forEach((x) => x.classList.remove('inspecting')); }

function bindHand() {
  const hand = $('hand');
  hand.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.hand-card'); if (!el || !game || game.result) return;
    drag = {el, uid: Number(el.dataset.uid), x: e.clientX, y: e.clientY, moving: false, id: e.pointerId};
    const d = drag; d.hold = setTimeout(() => { const card = game?.hand[indexOfUid(d.uid)]; if (drag === d && !d.moving && card) { d.info = true; showCardInfo(el, card); } }, 420);
    el.setPointerCapture?.(e.pointerId);
  });
  hand.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.info || (!drag.moving && Math.hypot(dx, dy) < 10)) return;
    clearTimeout(drag.hold);
    drag.moving = true; drag.el.classList.add('dragging'); if (game) game.dragging = true;
    drag.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.08) rotate(${Math.max(-8, Math.min(8, dx / 30))}deg)`;
    markDrop(e.clientX, drag.el);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; if (game) game.dragging = false; clearTimeout(d.hold);
    if (d.info) { hideCardInfo(); return; }
    if (!d.moving) { play(d.uid); return; }
    const from = indexOfUid(d.uid), to = dropIndex(e.clientX, d.el);
    if (from >= 0) { moveCard(game, from, to); handleEvents(); game.events.length = 0; }
    handSig = ''; hud();
  };
  /* listen on the window: the pointer may be released outside the hand */
  addEventListener('pointerup', end);
  hand.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) { clearTimeout(drag.hold); hideCardInfo(); drag = null; if (game) game.dragging = false; handSig = ''; hud(); } });
}

function hud() {
  if (!game) return;
  $('runPoints').textContent = game.stats.points.toLocaleString();
  const ready = Object.keys(ITEMS).filter((id) => itemReady(game, id)).length;
  $('items').classList.toggle('ready', ready > 0); $('itemsCount').textContent = ready ? ready + ' 個可用' : '冷卻中';
  if (!$('itemMenu').hidden) renderItems();
  $('dealFill').style.width = (game.hand.length >= HAND_SIZE ? 100 : Math.max(0, Math.min(100, (1 - (game.dealAt - game.time) / DEAL_EVERY) * 100))) + '%';
  $('speed').textContent = '×' + speed; $('pause').textContent = paused ? '▶' : '❚❚';
  $('evoToggle').textContent = record.evoAnim === false ? '進化動畫：關' : '進化動畫：開'; $('evoToggle').classList.toggle('on', record.evoAnim !== false);
  renderHand();
}

/* Item menu: each item shows its icon, effect and remaining cooldown. */
/* Built once, then only the cooldowns are updated in place (re-creating the buttons would swallow taps). */
function renderItems() {
  const menu = $('itemMenu');
  if (!menu.children.length) menu.innerHTML = Object.entries(ITEMS).map(([id, it]) => `<button class="item" data-item="${id}"><span class="item-icon">${it.icon}</span><span class="item-text"><b>${it.name}</b><small>${it.text}</small></span><span class="item-cd"></span><i></i></button>`).join('');
  for (const b of menu.children) {
    const id = b.dataset.item, left = Math.max(0, game.itemReady[id] - game.time);
    b.classList.toggle('cooling', left > 0);
    b.querySelector('.item-cd').textContent = left ? Math.ceil(left) + ' 秒' : '可使用';
    b.querySelector('i').style.width = (left / ITEMS[id].cooldown * 100) + '%';
  }
}

/* ---------- merge: fusion effect, card flip glowing in its frame colour, optional evolution overlay ---------- */
const FRAME_GLOW = {yellow: 'gold', purple: 'violet', red: 'rose'};
const burstHtml = () => '<i class="fb-glow"></i><i class="fb-ring"></i>' + Array.from({length: 10}, (_, k) => `<s style="--a:${k * 36 + (k % 2) * 14}deg;--d:${k % 2 ? 58 : 84}px;--z:${k % 3 ? 0.7 : 1}"></s>`).join('') + '<b class="fb-star"><em></em></b>';
function fuse(ev) {
  const glow = FRAME_GLOW[spirit(ev.to).cardFrame || 'yellow'] || 'gold';
  fresh.set(ev.uid, 'merged flip glow-' + glow);
  const hand = $('hand').getBoundingClientRect(), rects = [ev.a, ev.b].map((uid) => $('hand').querySelector(`[data-uid="${uid}"]`)).filter(Boolean).map((el) => ({el, r: el.getBoundingClientRect()}));
  if (rects.length) {
    const cx = rects.reduce((n, o) => n + o.r.left + o.r.width / 2, 0) / rects.length, cy = rects[0].r.top + rects[0].r.height / 2;
    for (const {el, r} of rects) {
      const ghost = el.cloneNode(true); ghost.className = 'fusion-ghost glow-' + glow;
      Object.assign(ghost.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', '--dx': (cx - r.left - r.width / 2) + 'px'});
      document.body.append(ghost); setTimeout(() => ghost.remove(), 650);
    }
    const burst = document.createElement('div'); burst.className = 'fusion-burst glow-' + glow;
    Object.assign(burst.style, {left: cx + 'px', top: cy + 'px'});
    burst.innerHTML = burstHtml(rects.length);
    document.body.append(burst); setTimeout(() => burst.remove(), 1100);
  } else if (hand.width) {
    const burst = document.createElement('div'); burst.className = 'fusion-burst small glow-' + glow; burst.innerHTML = burstHtml();
    Object.assign(burst.style, {left: hand.left + hand.width / 2 + 'px', top: hand.top + hand.height / 2 + 'px'}); document.body.append(burst); setTimeout(() => burst.remove(), 1100);
  }
  if (ev.evolved && record.evoAnim !== false) {
    evolvingCards.set(ev.uid, {from: ev.from, to: ev.to, start: performance.now()});
    setTimeout(() => { if (evolvingCards.delete(ev.uid)) $('hand').querySelector(`[data-uid="${ev.uid}"] .evo-anim`)?.remove(); }, EVO_TIME * 1000);
  }
}

function banner(text, boss = false) {
  const b = $('banner'); b.hidden = false; b.className = 'banner' + (boss ? ' boss' : ''); b.textContent = text;
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  clearTimeout(banner.t); banner.t = setTimeout(() => (b.hidden = true), 2300);
}
function skillBanner(ev) {
  const el = document.createElement('div'); el.className = 'skill-banner';
  el.innerHTML = `<img src="${picture(ev.species)}" alt="">${esc(spirit(ev.species).name)}・${esc(ev.skill)}${'★'.repeat(ev.rank)}`;
  document.body.append(el); setTimeout(() => el.remove(), 1800);
}

/* Attack shape -> the cave's weapon sample set, layered over the element synth: melee slashes, ranged shots,
   blasts and areas boom, tracking and chain attacks whip. */
const WEAPON_SOUND = {melee: 'sword', ranged: 'guns', blast: 'blades', area: 'blades', tracking: 'knife', chain: 'knife', support: 'knife'};
const weaponSound = (kind) => WEAPON_SOUND[kind] || 'knife';
/* Events -> sounds (the shared combat audio the cave uses) and hand animations. */
function handleEvents() {
  for (const ev of game.events) {
    if (ev.type === 'fire' || ev.type === 'ultimate') audio?.play({speciesId: ev.species, element: ev.element, pet: true, phase: 'start', strong: ev.type === 'ultimate'});
    else if (ev.type === 'release') { audio?.play({speciesId: ev.species, element: ev.element, pet: true, phase: 'release', strong: ev.strong, final: ev.strong}); if (ev.side === 'ally' || Math.random() < 0.4) audio?.play({kind: weaponSound(ev.kind), element: ev.element, pet: false, phase: 'release', strong: ev.strong}); }
    else if (ev.type === 'hit' && ev.amount > 0 && (ev.crit || performance.now() - lastImpact > 90)) { lastImpact = performance.now(); audio?.play({kind: weaponSound(ev.kind), element: ev.element, pet: false, phase: 'impact', strong: ev.strong || ev.crit, critical: ev.crit, final: ev.crit && ev.strong}); }
    else if (ev.type === 'trap') audio?.play({kind: ev.kind === 'shock' ? 'guns' : 'blades', element: ev.kind === 'shock' ? '雷' : ev.kind === 'geyser' ? '潮' : '光', pet: false, phase: 'impact', strong: true});
    else if (ev.type === 'deal') fresh.set(ev.uid, 'dealt');
    else if (ev.type === 'merge') { fuse(ev); audio?.play({phase: 'impact', strong: true, final: ev.rank >= 3}); toast(ev.evolved ? `${spirit(ev.from).name} 合成進化成 ${spirit(ev.to).name}！` : isSupport(ev.to) ? `${spirit(ev.to).name} 升到 ${'★'.repeat(ev.rank)}，技能加強！` : `${spirit(ev.to).name} 升到 ${'★'.repeat(ev.rank)}，能力提升！`); }
    else if (ev.type === 'skillStart') { skillBanner(ev); audio?.play({speciesId: ev.species, element: ev.element, pet: true, phase: 'start', strong: true}); }
    else if (ev.type === 'bossSkillStart') { banner(`魔王 ${spirit(ev.species).name}・${spirit(ev.species).skills?.[1]?.name || '大絕'}！`, true); audio?.play({speciesId: ev.species, element: ev.element, pet: true, phase: 'start', strong: true}); }
    else if (ev.type === 'bossSkill') audio?.play({speciesId: ev.species, element: ev.element, pet: true, phase: 'release', strong: true, final: true});
    else if (ev.type === 'skill') audio?.play({speciesId: ev.species, element: ev.element, pet: true, phase: 'release', strong: true, final: true});
    else if (ev.type === 'item') { toast(`${ITEMS[ev.id].icon} ${ITEMS[ev.id].name}！`); audio?.play({phase: 'impact', strong: true}); }
    else if (ev.type === 'boss') banner(`魔王 ${spirit(ev.species).name} 現身！`, true);
    else if (ev.type === 'baseHit' && ev.side === 'crystal' && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(40);
    else if (ev.type === 'finish') { ev.earned = creditPoints(); setTimeout(() => showResult(ev), 1000); }
  }
}

function showResult(r) {
  const stage = game.stage, idx = STAGES.indexOf(stage), first = r.won && !record.cleared[stage.id];
  if (r.won) { record.cleared[stage.id] = true; saveRecord(); }
  const mins = Math.floor(r.time / 60), secs = Math.round(r.time % 60);
  const stars = r.won ? 1 + (r.crystal > 0.5) + (r.crystal > 0.85) : 0, next = r.won && STAGES[idx + 1];
  if (r.won) { record.best = record.best || {}; record.best[stage.id] = Math.max(record.best[stage.id] || 0, stars); saveRecord(); }
  const stat = (icon, value, label, tone) => `<div class="stat"><i class="tone-${tone}">${icon}</i><b>${value}</b><small>${label}</small></div>`;
  openModal(`<header class="sheet-head">
      <div class="sunburst"></div>
      ${r.won ? `<div class="result-stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : 'off'}" style="--i:${i}">★</span>`).join('')}</div>` : `<img class="boss-face" src="${picture(stage.boss)}" alt="">`}
      <h2 class="sheet-title">${r.won ? '過關！' : '挑戰失敗'}</h2>
    </header>
    <p class="result-title">${idx + 1}. ${esc(stage.name)}</p>
    <p class="result-sub">${r.won ? `擊敗魔王 ${esc(spirit(stage.boss)?.name || '')}，巢穴攻破！` : `魔王 ${esc(spirit(stage.boss)?.name || '')} 守住了巢穴…`}</p>
    <div class="stats">${stat('⏱', `${mins}:${String(secs).padStart(2, '0')}`, '用時', 'blue')}${stat('💥', r.kills, '擊倒', 'red')}${stat('✨', game.stats.merges, '合成', 'violet')}${stat('❤', Math.round(r.crystal * 100) + '%', '基地', 'green')}</div>
    <p class="result-points">🎟️ 轉蛋點數 <b>+${(r.earned || 0).toLocaleString()}</b><small>共 ${points().toLocaleString()} 點・與無盡洞穴共用</small></p>
    <p class="result-note">${r.won ? (first && next ? `🔓 解鎖新關卡：<b>${esc(next.name)}</b>` : next ? '已通過這一關！' : '🎉 全部關卡都通過了！') : '💡 把相同的卡排在一起合成高星幻靈，或帶上輔助技能卡。'}</p>
    <div class="sheet-actions">
      <button class="round" id="toLobby" title="回海圖"><span>🗺️</span><small>海圖</small></button>
      <button class="round" id="again" title="${r.won ? '再玩一次' : '再挑戰'}"><span>↻</span><small>${r.won ? '再玩' : '重來'}</small></button>
      ${next ? `<button class="primary wide" id="nextStage">下一關 ▶<small>${esc(next.name)}</small></button>` : `<button class="primary wide" id="again2">${r.won ? '再玩一次' : '再挑戰 ↻'}</button>`}
    </div>`, r.won ? 'win' : 'lose');
  $('toLobby').onclick = leaveGame;
  $('again').onclick = () => { $('modal').close(); startGame(); };
  if ($('again2')) $('again2').onclick = $('again').onclick;
  if ($('nextStage')) $('nextStage').onclick = () => nextVoyage(idx + 1);
}
/* jump straight into another stage from the result or pause sheet */


function bindHud() {
  $('items').onclick = () => { const menu = $('itemMenu'); menu.hidden = !menu.hidden; if (!menu.hidden) renderItems(); };
  $('itemMenu').onclick = (e) => {
    const b = e.target.closest('[data-item]'); if (!b || !game) return;
    if (useItem(game, b.dataset.item)) { $('itemMenu').hidden = true; handSig = ''; hud(); }
    else toast('道具冷卻中');
  };
  $('speed').onclick = () => { speed = speed === 1 ? 2 : 1; hud(); };
  $('camReset').onclick = () => view?.resetCamera();
  $('evoToggle').onclick = () => { record.evoAnim = record.evoAnim === false; saveRecord(); hud(); toast(record.evoAnim ? '合成進化時，卡片裡會播放進化動畫' : '已關閉進化動畫，合成時只播放卡片特效'); };
  $('pause').onclick = () => { paused = true; openPause(); hud(); };
  addEventListener('pointerdown', () => audio?.unlock?.(), {capture: true});
  addEventListener('keydown', (e) => {
    if (!game || $('modal').open) return;
    const n = '1234567'.indexOf(e.key);
    if (n >= 0 && game.hand[n]) play(game.hand[n].uid);
    else if (e.key === ' ') { e.preventDefault(); $('items').click(); }
  });
}

function openPause() {
  const stage = game.stage, idx = STAGES.indexOf(stage), next = record.cleared[stage.id] && STAGES[idx + 1];
  openModal(`<header class="sheet-head">
      <div class="sunburst"></div>
      <img class="boss-face" src="${picture(stage.boss)}" alt="">
      <h2 class="sheet-title">暫停中</h2>
    </header>
    <p class="result-title">${idx + 1}. ${esc(stage.name)}</p>
    <p class="result-sub">魔王 ${esc(spirit(stage.boss)?.name || '')} 正站在巢穴的酒桶上等你</p>
    <button class="primary wide resume" id="resume">▶ 繼續戰鬥</button>
    <div class="sheet-actions">
      <button class="round" id="quit" title="放棄並回海圖"><span>🗺️</span><small>海圖</small></button>
      <button class="round" id="restart" title="重新開始這一關"><span>↻</span><small>重來</small></button>
      <button class="round" id="howto2" title="玩法說明"><span>?</span><small>說明</small></button>
      ${next ? `<button class="round" id="nextStage" title="直接玩下一關：${esc(next.name)}"><span>⏭</span><small>下一關</small></button>` : ''}
    </div>`, 'pause');
  $('resume').onclick = () => { $('modal').close(); };
  $('quit').onclick = leaveGame;
  $('restart').onclick = () => { $('modal').close(); startGame(); };
  $('howto2').onclick = showHowTo;
  if ($('nextStage')) $('nextStage').onclick = () => nextVoyage(idx + 1);
  $('modal').onclose = () => { paused = false; if (game) hud(); };
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
  const visibleBattle = game && game.started && $('loading').hidden && $('lobby').hidden && !$('hud').hidden;
  const running = visibleBattle && !game.result && !paused && !$('modal').open;
  if (running) {
    acc += dt * speed;
    let n = 0;
    while (acc >= 1 / 30 && n < 8) { step(game, 1 / 30); acc -= 1 / 30; n++; }
  }
  if (game && game.events.length) { handleEvents(); hud(); }
  else if (running && now - (loop.hudAt || 0) > 100) { hud(); loop.hudAt = now; }
  view?.update(running ? dt * speed : 0);
  if (pendingDealingScene && pendingDealingScene === game &&
      $('loading').hidden && $('lobby').hidden && !$('hud').hidden && !$('modal').open) {
    /* This is after the first player-visible scene render, never behind loading. */
    const launched = beginDealing(game);
    pendingDealingScene = null;
    acc = 0; last = now;
    if (launched) { handSig = ''; hud(); }
  }
  if (game) game.events.length = 0;
}

/* The chart art is rendered with Three.js once per visit: a small 3D diorama for every island (islands3d.js) and the
   real speedboat (shared js/harbor.js) with the hero seated at the wheel in the outfit from the town wardrobe. */
async function renderChartArt() {
  await loadEngine();
  const T = globalThis.THREE, H = globalThis.PhantomHarbor, kit = createToonKit(T), art = createIslandRenderer(T, kit);
  /* each island carries its boss's dex card */
  const card = (id) => { const s = spirit(id); return {art: picture(id), frameImage: '../assets/cards/frame.png', frame: s.cardFrame || 'yellow', name: s.name, number: data.entries.get(id)?.number || '—', info: s.type + " · " + (s.rarity || "普通") + " · 第 " + (s.stage || 1) + " 階段", hp: s.hp, attack: s.attack}; };
  const pics = []; for (const s of STAGES) pics.push(await art.island(s.scene, card(s.boss)));
  chart.setIslandArt(pics);
  try { const gh = await loadGltf('models/hero.glb'); chart.setHomeArt(art.dock(cloneModel(gh.scene))); } catch (e) { console.warn(e); try { chart.setHomeArt(art.dock(null)); } catch {} }
  if (H?.makeSpeedboat) {
    const {boat, SEAT} = H.makeSpeedboat(T, {mobile: true}); H.toonOutline(T, boat, {thickness: 0.03});
    try {
      const g = await loadGltf('models/hero.glb'), hero = cloneModel(g.scene), box = new T.Box3().setFromObject(hero), s = 2.55 / (box.max.y - box.min.y);
      hero.scale.setScalar(s); hero.position.y = -box.min.y * s;
      const seat = new T.Group(); seat.add(hero); seat.position.set(SEAT.x, SEAT.y - H.HERO_HIP, 0); seat.rotation.y = Math.PI / 2; boat.add(seat);
      try { globalThis.HeroCostumes?.create(T).apply(hero, costumeFor(journey()).id); } catch (e) { console.warn(e); }
      const idle = g.animations.find((c) => /idle/i.test(c.name)); if (idle) { const mixer = new T.AnimationMixer(hero); mixer.clipAction(idle).play(); mixer.update(0.4); }
      kit.toonify(hero, {outline: 0.025});
    } catch (e) { console.warn(e); }
    chart.setBoatImage(art.boat(boat));
  }
  art.dispose();
}

async function init() {
  record = readJson(SAVE_KEY, {}) || {};
  if (!Number.isInteger(record.stage)) record.stage = 0;
  record.cleared = record.cleared || {}; record.owned = record.owned || []; record.best = record.best || {};
  const fromTown = new URLSearchParams(location.search).has('fromTown');
  /* the town's speedboat handoff card gives way to this page's own speedboat loader */
  globalThis.PhantomTransition?.finish?.();
  if (fromTown || !Number.isInteger(record.boatAt)) record.boatAt = -1;
  $('loadingBar').style.width = '30%';
  try { data = await loadData(); } catch (e) { toast(e.message); $('loading').hidden = true; return; }
  $('loadingBar').style.width = '100%';
  bindLobby(); bindHud(); bindHand(); renderLobby();
  renderChartArt().catch((e) => console.warn(e));
  /* the boat loader stays a moment so the voyage reads, then the speedboat sails from the town pier to the island */
  setTimeout(async () => {
    $('loading').hidden = true;
    if (record.boatAt !== record.stage) await sailTo(record.stage);
    if (!record.starterClaimed || new URLSearchParams(location.search).get('open') === 'gacha') openGacha();
  }, fromTown ? 1300 : 300);
  globalThis.PhantomBgm?.setScene?.('general');
  requestAnimationFrame(loop);
  globalThis.PhantomDefense = {get game() { return game; }, get view() { return view; }, startGame, leaveGame, elementMultiplier, isSupport};
}
init();
