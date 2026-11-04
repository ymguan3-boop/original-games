/* 幻靈守護戰: island sea chart, summons, dealt hand (七大罪 style merging), HUD and game loop. Reads the town save
   (wardrobe outfit, original unlocks) read-only; gacha points and bag items go through the shared cave ledger
   (PhantomCaveBridge); its own records (summoned spirits, deck, cleared islands, boat position) live in
   phantom-defense-v1. */
import {STAGES, SHAPES, ELEMENTS, ELEMENT_EFFECTS, SUPPORT, ITEMS, DECK_SIZE, DECK_BASE, DECK_RED, HAND_SIZE, ULT_CD, DEAL_EVERY, passiveLines, ultCooldown, TRAPS, killPoints, isBaseCard, isRedCard, profileFor, isSupport, createGame, beginDealing, step, playCard, moveCard, canPlay, useItem, itemReady, elementMultiplier, evolutionsOf, MAX_RANK, TRAP_CARDS, BAG_ITEMS, TRAP_LIFE, MAX_TRAPS, placeTrap, useBagItem, isThreeColorEgg, validEggPosition, PK_ITEMS, PK_ONLY_ITEMS, PK_STAGE, pkArenaFor, PK_TIME, PK_RAGE_AT} from './rules.js?v=20261106-v19';
import {createPkIsland} from './pk-island.js?v=20261106-v19';
import {createPkLobby} from './pk-lobby.js?v=20261106-v19';
import {snapshot, createMirror, applySnapshot, advanceMirror} from './pk-sync.js?v=20261106-v19';
import {loadEngine, loadThree, loadGltf, cloneModel} from './actors.js?v=20261106-v19';
import {createToonKit} from './style.js?v=20261106-v19';
import {createChartModels} from './chart-models.js?v=20261106-v19';
import {createView} from './view.js?v=20261106-v19';
import {createSeaChart} from './sea3d.js?v=20261106-v19';
import {defensePool, starterRewards, drawWithStore, DRAW_COST, STARTER_COUNT, isTrapCard, isDefenseItem} from './gacha.js?v=20261106-v19';
import {buildPath} from './stages.js?v=20261106-v19';
import {createStore, initialState} from '../../survivors/js/save-bridge.js?v=20261106-v19';
import {costumeFor} from '../../survivors/js/costume-effects.js?v=20261106-v19';
import {ITEMS as CAVE_ITEMS} from '../../survivors/js/inventory.js?v=20261030-reaper-v2';
import {summonMarkup, startSummon} from '../../survivors/js/summon-view.js?v=20261106-v19';
import {groupRewards} from '../../survivors/js/reward-groups.js?v=20261106-v19';
import {itemPicture} from '../../survivors/js/item-pictures.js?v=20261029-reaper-v1';
import {ROLE_META, ROLE_SKILLS, roleFor, ultimateFor, ultimateDescription, roleLabel, ULTIMATE_SPACING} from './role-skills.js?v=20261106-v19';
import {stageWeather, STAGE_WEATHER} from './seascape.js?v=20261106-v19';
import {openingFor, OPENING_SECONDS} from './boss-openings.js?v=20261106-v19';
import {icon} from '../../survivors/js/ui-art.js?v=20261106-v19';
import {initFullscreen} from './fullscreen.js?v=20261106-v19';
import {initIcons, ico} from './ui-icons.js?v=20261106-v19';
import {createCombatAudio} from '../../survivors/js/combat-audio-v17.js?v=20261106-v19';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'phantom-defense-v1';
/* the game's theme song (assets/audio/theme.mp3, 初光之境) plays in the chart and in battle */
const THEME_SCENE = 'theme';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let data, record, view, audio, game = null, speed = 1, paused = false, last = 0, acc = 0, lastImpact = 0;
let pendingDealingScene = null, visibleSceneFrames = 0, startSerial = 0, bossIntroTimer = null;
/* Evolution-card overlays are permanently disabled in solo and PK matches.
   Merge / star promotion mechanics and the short merge-glow effect remain unchanged. */
/* PK: the live match's session (role 'host' runs the battle, 'guest' shows a mirror of it), and the lobby */
let pk = null, pkLobby = null;
const LOW_POWER = typeof matchMedia === 'function' && (matchMedia('(pointer:coarse)').matches || matchMedia('(max-width:820px)').matches);

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
function saveRecord() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(record)); } catch {} }
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2200); }
function picture(id) { const a = data.art[id]; return '../' + (a?.image || 'portraits/' + id + '.png'); }
/* ---------- boss opening: one short line, a 3D bust, the voice file and the country-style frame ---------- */
let bossVoice = null, portraitJob = null;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function stopBossVoice() {
  try { bossVoice?.pause(); } catch {}
  bossVoice = null;
  try { globalThis.speechSynthesis?.cancel(); } catch {}
}
/* the generated mp3 (defense/audio/boss/*.mp3); if it is missing the browser's own zh-TW voice reads the same line */
function playBossVoice(speech) {
  stopBossVoice();
  if (globalThis.PhantomBgm?.sfxMuted) return;
  const v = speech.voice; if (!v) return;
  const volume = clamp((globalThis.PhantomBgm?.sfxVolume ?? 55) / 100 + 0.35, 0.3, 1);
  const fallback = () => {
    try {
      const u = new SpeechSynthesisUtterance(v.ttsText || speech.line); u.lang = 'zh-TW'; u.volume = volume;
      u.pitch = clamp(1 + parseInt(v.pitch, 10) / 120, 0.5, 1.8); u.rate = clamp(1 + parseInt(v.rate, 10) / 100, 0.5, 1.5);
      const voices = speechSynthesis.getVoices().filter((x) => /zh[-_]TW|cmn-TW/i.test(x.lang)); if (voices[0]) u.voice = voices[0];
      speechSynthesis.speak(u);
    } catch {}
  };
  const a = new Audio(new URL('../' + v.audioFile, import.meta.url).href); a.volume = volume; bossVoice = a;
  a.onerror = fallback;
  a.play().then(() => globalThis.PhantomBgm?.duckFor?.(0.3, Math.min(4200, (a.duration || 3) * 1000 + 400))).catch((e) => { if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') fallback(); });
}
function prepareBossPortrait(stage) {
  const speech = openingFor(stage);
  portraitJob = speech && view?.portrait ? view.portrait(stage.boss, speech.pose).catch(() => null) : Promise.resolve(null);
}
function hideBossIntro() {
  clearTimeout(bossIntroTimer);
  bossIntroTimer = null;
  stopBossVoice();
  $('bossIntro').hidden = true;
}
async function showBossIntro(stage) {
  const speech = openingFor(stage);
  if (!speech) return;
  hideBossIntro();
  const serial = startSerial, shot = await Promise.race([portraitJob, new Promise((r) => setTimeout(() => r(null), 700))]);
  if (serial !== startSerial || !game) return;
  const box = $('bossIntro'), t = speech.theme;
  for (const [k, v] of Object.entries({wood: t.wood, paper: t.paper, accent: t.accent, ink: t.ink, glow: t.glow})) box.style.setProperty('--bi-' + k, v);
  box.dataset.boss = stage.id;
  $('bossIntroPortrait').src = shot || picture(stage.boss);
  box.classList.toggle('is-card', !shot);
  $('bossIntroPortrait').alt = speech.name;
  $('bossIntroStage').textContent = '第 ' + (STAGES.indexOf(stage) + 1) + ' 關｜' + stage.name + '｜' + speech.name;
  $('bossIntroName').textContent = speech.name;
  $('bossIntroLine').textContent = '「' + speech.line + '」';
  box.hidden = false;
  playBossVoice(speech);
  const [lo, hi] = OPENING_SECONDS;
  bossIntroTimer = setTimeout(hideBossIntro, clamp(lo + (speech.line.length - 8) * 0.1, lo, hi) * 1000);
}
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
/* ---------- items: supplies and trap cards from this mode's gacha, kept in the island record (limited in number) ---------- */
const STARTER_ITEMS = {'trap-mud': 2, 'trap-spike': 2, 'trap-whirl': 1, 'trap-rune': 1, 'trap-shock': 1, potion: 2, revive: 1, battery: 1, 'buff-attack': 1, 'buff-defense': 1};
const TACTICAL_BAG = PK_ITEMS;
const tacticalInventory = () => Object.fromEntries(TACTICAL_BAG.map((id) => [id, Math.max(0, Math.min(99, bagCount(id)))]));
const pendingPkItems = new Set();
function trapStock() { record.bag ||= {}; return record.bag; }
function addTrapCards(id, n = 1) { const t = trapStock(); t[id] = (t[id] || 0) + n; saveRecord(); }
function bagCount(id) { return trapStock()[id] || 0; }
function takeBagItem(id) { const t = trapStock(); if (!(t[id] > 0)) return false; t[id]--; if (!t[id]) delete t[id]; saveRecord(); return true; }
function caveStore() { return createStore(globalThis.PhantomCaveBridge.caveStorage(initialState)); }
function points() { try { return caveStore().state.points; } catch { return 0; } }
function gachaPool() { return defensePool(data.pool, journey(), new Set(data.spiritMap.keys())); }
function unlockedStage() { let i = 0; while (i < STAGES.length - 1 && record.cleared[STAGES[i].id]) i++; return i; }
const deckBase = () => record.deck.filter((id) => isBaseCard(data.evolution, id));
const deckRed = () => record.deck.filter(isRedCard);

function unitButton({id, trial = false}) {
  const n = record.deck.indexOf(id), sup = SUPPORT[id];
  const line = id === 'jigglypuff' ? '🥚 選擇道路位置固定放置'
    : id === 'kyogre' ? '🐟 孵出國王＋皇后可合體'
    : sup ? `✨ 技能：${esc(sup.skill)}` : `${esc(roleLabel(id))} · ${shapeLabel(id, false)}`;
  const hint = id === 'jigglypuff'
    ? '點卡牌再點道路，或拖曳到道路放置。三色蛋不移動；無效位置不消耗卡牌'
    : id === 'kyogre'
      ? '小金魚同星相鄰合成，隨機進化金魚國王或皇后；一張國王＋一張皇后相鄰才會合體水蛟龍王'
      : sup ? sup.text : '大絕：' + shapeLabel(id, true);
  return `<button class="collectionThumb ${n >= 0 ? 'on sortie-picked' : ''}" data-unit="${id}" aria-label="${n >= 0 ? '已選出擊：' : '可選卡牌：'}${esc(spirit(id).name)}" title="${esc(hint)}">${trial ? '<span class="trial">體驗</span>' : ''}${n >= 0 ? '<span class="sortie-badge">出擊</span>' : ''}${sup ? '<span class="skilltag">輔助</span>' : ''}${cardHtml(id, {line})}</button>`;
}

let chart = null;
/* Preserve fixed card positions, including deliberately emptied slots.
   Slots 1–4 are base spirits and slots 5–6 are red skill cards. The compact
   record.deck remains the existing battle/PK API; only the lobby stores holes.
   Migrate once from earlier saves before these fixed positions existed. */
function normalizeDeck() {
  const units = availableUnits();
  const baseIds = new Set(units.base.map((u) => u.id));
  const redIds = new Set(units.red.map((u) => u.id));
  if (!Array.isArray(record.deckSlots) || record.deckSlots.length !== DECK_SIZE) {
    const old = Array.isArray(record.deck) ? record.deck : [];
    const chosenBase = [...new Set(old.filter((id) => baseIds.has(id)))].slice(0, DECK_BASE);
    const chosenRed = [...new Set(old.filter((id) => redIds.has(id)))].slice(0, DECK_RED);
    /* Only the initial migration gets automatic starter cards. Never refill
       a hole once the player explicitly removes a card from a slot. */
    for (const u of units.base) if (chosenBase.length < DECK_BASE && !chosenBase.includes(u.id)) chosenBase.push(u.id);
    for (const u of units.red) if (chosenRed.length < DECK_RED && !chosenRed.includes(u.id)) chosenRed.push(u.id);
    record.deckSlots = [...Array.from({length:DECK_BASE},(_,i)=>chosenBase[i] || null),
      ...Array.from({length:DECK_RED},(_,i)=>chosenRed[i] || null)];
  }
  const used = new Set();
  record.deckSlots = record.deckSlots.map((id, i) => {
    const valid = i < DECK_BASE ? baseIds : redIds;
    if (!id || !valid.has(id) || used.has(id)) return null;
    used.add(id);
    return id;
  });
  record.deck = record.deckSlots.filter(Boolean);
}
/* Choose a specific persistent sortie slot; unlike a compact array splice, removing
   a card leaves its position empty for the next player-selected card. */
function updateDeckSelection(id) {
  normalizeDeck();
  const slot = record.deckSlots.indexOf(id), red = isRedCard(id);
  if (slot >= 0) record.deckSlots[slot] = null;
  else {
    const first = red ? DECK_BASE : 0, limit = red ? DECK_SIZE : DECK_BASE;
    let target = record.deckSlots.findIndex((value, i) => i >= first && i < limit && !value);
    if (target < 0) target = first; // Existing full-deck replacement behavior.
    record.deckSlots[target] = id;
  }
  normalizeDeck();
  saveRecord();
  return slot < 0;
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
  const deck = record.deckSlots.map((id) => id ? `<img src="${picture(id)}" alt="${esc(spirit(id).name)}" title="${esc(spirit(id).name)}" data-frame="${spirit(id).cardFrame || 'yellow'}">` : '<i title="卡組空位"></i>').join('');
  $('islePanel').innerHTML = `<div class="isle-card">
    <div class="isle-title"><small>第 ${i + 1} 島</small><h2>${esc(s.name)}</h2><span class="weather-pill">${stageWeather(s.scene).icon} ${stageWeather(s.scene).name}</span>${record.cleared[s.id] ? `<span class="cleared-tag">已通關 ${'★'.repeat(best)}<em>可重複挑戰</em></span>` : ''}</div>
    <div class="isle-boss"><img src="${picture(s.boss)}" alt=""><div><small>${i < 5 ? '小魔王' : '大魔王'}・坐鎮酒桶</small><b>${esc(boss.name)}</b><span class="boss-class">${esc(roleLabel(boss.id))}</span></div></div>
    <div class="isle-facts"><span>${stageWeather(s.scene).icon} ${stageWeather(s.scene).name}</span><span>🛤️ 路線 ${route}</span><span>🪤 路上沒有障礙・用陷阱卡自己布置</span><span>🎟️ 擊倒 +${killPoints(i)}・魔王 +${killPoints(i, true)}</span></div>
    <div class="isle-deck"><div class="deck-strip">${deck}</div><button class="tool small" data-open="deck">🃏 編組 ${nb + nr}/${DECK_SIZE}</button></div>
    ${nb < DECK_BASE ? `<p class="sortie-base-warning" role="status">⚠️ 必須編滿四位基礎幻靈才可以出擊（目前 ${nb}/${DECK_BASE} 位），請先進入「卡組」補滿。</p>` : ''}
    <button id="start" class="primary wide" ${nb < DECK_BASE ? 'aria-disabled="true" title="必須編滿四位基礎幻靈才可以出擊"' : ''}>⚔️ 出擊！</button>
  </div>`;
}
async function sailTo(i, speed = 13) {
  if (chart.boatAt === i) return;
  await chart.sail(chart.boatAt, i, {speed});
  record.boatAt = i; saveRecord();
}
async function pickIsle(i) {
  if (i > unlockedStage() || chart.sailing) return;
  record.stage = i; saveRecord(); renderLobby();
  await sailTo(i);
}
function requireCompleteSortie() {
  normalizeDeck();
  const count = deckBase().length;
  if (count >= DECK_BASE) return true;
  toast(`必須編滿四位基礎幻靈才可以出擊！目前只有 ${count}/${DECK_BASE} 位，請先開啟「卡組」補滿。`);
  return false;
}
async function beginStage() {
  if (chart.sailing) return;
  if (!requireCompleteSortie()) return;
  /* no voyage between pressing sortie and the battle: the boat is simply at the island when the chart comes back */
  if (chart.boatAt !== record.stage) { chart.snap(record.stage); record.boatAt = record.stage; saveRecord(); }
  startGame();
}
/* after a cleared stage: back on the chart, the boat sails the lane to the next island and the battle begins */
async function voyage(i, autoStart) {
  record.stage = i; saveRecord(); renderLobby();
  await sailTo(i, autoStart ? 34 : 13);
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
    <p class="bm-line">要去哪裡？</p>
    <div class="bm-actions"><button class="primary" id="bmGacha">🎰 群島轉蛋</button><button id="bmRules">📖 玩法</button><button id="bmHome">🚤 回初光鎮</button></div>`, 'pause');
  $('bmGacha').onclick = () => { $('modal').close(); openGacha(); };
  $('bmRules').onclick = showHowTo;
  $('bmHome').onclick = sailHome;
}

function bindLobby() {
  chart = createSeaChart($('seaChart'), {THREE: globalThis.THREE, stages: STAGES, esc, onPick: (i) => pickIsle(i), onHome: openBoatman, onPk: () => pkLobby.open()});
  pkLobby = createPkLobby({openModal, closeModal: () => $('modal').close(), ribbon, esc, picture, spirit, deck: () => (normalizeDeck(), record.deck.slice()), inventory: tacticalInventory, costume: () => costumeFor(journey()).id,
    name: () => record.pkName || (record.pkName = '旅人' + String(Math.floor(Math.random() * 90) + 10)), setName: (n) => { record.pkName = n; saveRecord(); }, toast, onStart: startPkGame});
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
let deckHelpExpanded = false;
function openDeck(picked = null, keepScroll = 0) {
  normalizeDeck();
  const units = availableUnits(), nb = deckBase().length, nr = deckRed().length;
  const unitIndex = new Map([...units.base, ...units.red].map((u) => [u.id, u]));
  const chosenSlots = record.deckSlots.map((id, i) => {
    const unit = id && unitIndex.get(id);
    if (unit) return unitButton(unit);
    const isBase = i < DECK_BASE, number = isBase ? i + 1 : i - DECK_BASE + 1;
    return `<button type="button" class="sortie-empty-slot" data-empty-slot="${i}" aria-label="出擊卡組${isBase ? '基礎幻靈' : '技能卡'}第${number}格空位，點擊下方卡牌補入"><span class="slot-plus" aria-hidden="true">＋</span><b>${isBase ? '基礎幻靈' : '技能卡'} ${number}</b><small>空位・點選卡牌補入</small></button>`;
  });
  const unchosenBase = units.base.filter((u) => !record.deck.includes(u.id));
  const unchosenRed = units.red.filter((u) => !record.deck.includes(u.id));
  openModal(`${ribbon('出擊卡組', '🃏')}
    <p class="result-sub">基礎幻靈 ${nb}/${DECK_BASE}・技能卡 ${nr}/${DECK_RED}（職業決定攻擊方式，四名出戰角色搭配兩張技能卡）</p>
    <div class="role-legend">${Object.values(ROLE_META).map((r) => `<span>${r.icon} ${r.label}</span>`).join('')}</div>
    <div class="panel-scroll deck-card-list">
      <h3 class="roster-group sortie-heading">⚔️ 已選出擊卡組 <small>${record.deck.length}/${DECK_SIZE}・綠框「出擊」為目前上陣卡牌，空位可自行補入</small></h3>
      <div class="roster sortie-current" aria-label="六個固定出擊欄位，移除卡牌後原位置保留空格">${chosenSlots.join('')}</div>
      <details class="deck-special-details" ${deckHelpExpanded ? 'open' : ''}>
        <summary>📖 特殊合體與放置規則（點擊展開）</summary>
      <div class="deck-special-rules" aria-label="特殊合體與出場規則">
        <div class="deck-special-rule">
          <span class="deck-special-icon" aria-hidden="true">🐟</span>
          <div><b>水蛟龍王特殊合體</b><p>小金魚合成後，隨機成為<strong>金魚國王</strong>或<strong>金魚皇后</strong>。在手牌中將<strong>國王 ×1 ＋ 皇后 ×1</strong>排成相鄰，才能合體成<strong>水蛟龍王 ★★★</strong>；同種金魚只升星。</p></div>
        </div>
        <div class="deck-special-rule">
          <span class="deck-special-icon" aria-hidden="true">🥚</span>
          <div><b>三色蛋指定路徑出場</b><p>點選<strong>三色蛋卡牌</strong>，再點選路徑上想放的位置；也能拖曳卡牌到道路放開。放置後不移動，選錯位置不會消耗卡牌。</p></div>
        </div>
      </div>
      </details>
      <h3 class="roster-group">其他基礎幻靈 <small>點卡牌可加入出擊卡組（黃卡、紫卡與三色蛋）</small></h3><div class="roster">${unchosenBase.map(unitButton).join('') || '<p class="muted">沒有其他可選的基礎幻靈。</p>'}</div>
      <h3 class="roster-group">其他紅卡輔助 <small>點卡牌可加入出擊卡組</small></h3><div class="roster">${unchosenRed.map(unitButton).join('') || '<p class="muted">沒有其他可選的紅卡輔助，仍可透過轉蛋取得。</p>'}</div></div>
    <div id="flipLayer" class="flip-layer" hidden></div>
    <div class="modal-actions center"><button class="tool" id="deckGacha">🎰 去轉蛋</button><button class="primary big" data-close>完成</button></div>`, 'howto deck');
  $('deckGacha').onclick = () => { $('modal').close(); openGacha(); };
  /* tapping a card turns it over: the back lists its attack, ultimate and passives, with a button to add it to / remove it from the deck */
  const scroller = $('modalBody').querySelector('.panel-scroll'), layer = $('flipLayer');
  const help = scroller?.querySelector('.deck-special-details');
  help?.addEventListener('toggle', () => { deckHelpExpanded = help.open; });
  if (scroller) scroller.scrollTop = keepScroll;
  const toggle = (id) => {
    const added = updateDeckSelection(id);
    renderIslePanel();
    /* New cards appear in their chosen empty slot; removals keep the gap. */
    openDeck(null, added ? 0 : scroller?.scrollTop || 0);
  };
  const show = (id) => {
    const inDeck = record.deck.includes(id), s = spirit(id), sup = SUPPORT[id];
    const line = id === 'jigglypuff' ? '🥚 點選位置放置'
      : id === 'kyogre' ? '🐟 國王＋皇后合體'
      : sup ? '技能：' + esc(sup.skill) : esc(roleLabel(id)) + ' · ' + shapeLabel(id, false);
    layer.innerHTML = '<div class="flip-scene"><div class="flip-card" data-frame="' + (s.cardFrame || 'yellow') + '">'
      + '<div class="flip-face front"><div class="collectionThumb flip-thumb">' + cardHtml(id, {line}) + '</div></div>'
      + '<div class="flip-face back"><div class="flip-info">' + cardBackHtml(id) + '</div>'
      + '<div class="flip-actions"><button class="' + (inDeck ? '' : 'primary') + '" id="deckToggle">' + (inDeck ? '移出出戰卡組' : '加入出戰卡組') + '</button><button id="flipClose">返回</button></div></div></div></div>';
    layer.hidden = false;
    const card = layer.querySelector('.flip-card');
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('flipped')));
    card.querySelector('.front').onclick = () => card.classList.add('flipped');
    $('deckToggle').onclick = () => toggle(id);
    $('flipClose').onclick = () => { card.classList.remove('flipped'); setTimeout(() => { layer.hidden = true; layer.innerHTML = ''; }, 520); };
    layer.onclick = (e) => { if (e.target === layer) $('flipClose').click(); };
  };
  $('modalBody').querySelectorAll('[data-unit]').forEach((b) => (b.onclick = () => show(b.dataset.unit)));
  /* Empty placeholders jump to the right candidate category within the same
     scroll area; they never add, consume, or auto-pick a card themselves. */
  $('modalBody').querySelectorAll('[data-empty-slot]').forEach((b) => {
    b.onclick = () => {
      const n = Number(b.dataset.emptySlot), groups = [...scroller.querySelectorAll('.roster-group')];
      const heading = groups.find((h) => h.textContent.includes(n < DECK_BASE ? '其他基礎幻靈' : '其他紅卡輔助'));
      if (heading) scroller.scrollTo({top:heading.offsetTop - scroller.offsetTop, behavior:'smooth'});
    };
  });
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
const itemName = (id) => TRAP_CARDS[id]?.name || BAG_ITEMS[id]?.name || CAVE_ITEMS[id]?.name || id;
const rewardArt = (id) => (isDefenseItem(id) ? '<span class="trap-art">' + (TRAP_CARDS[id] || BAG_ITEMS[id]).icon + '</span>' : caveArt(itemPicture(id)));
/* the summon film names items from the cave table (the same module the film reads): add this mode's trap cards to it in memory only, so the film shows the right name */
for (const [id, t] of Object.entries({...TRAP_CARDS, ...BAG_ITEMS})) CAVE_ITEMS[id] ||= {
  name: t.name, kind: TRAP_CARDS[id] ? 'trap' : 'supply', price: 0,
  rarity: '一般', stackLimit: 999999, duration: 0
};
const filmRewards = (rewards) => rewards;
function openGacha() {
  const first = !record.starterClaimed, pts = points(), pool = gachaPool();
  openPanel('群島轉蛋機', `<div class="dg-wallet"><span>🎟️ 持有點數（與無盡洞穴共用）</span><strong>${pts.toLocaleString()}<small>點</small></strong></div>
    <div class="dg-intro"><button class="dg-machine" aria-label="轉動轉蛋機"><img src="../survivors/assets/gacha-machine-v03.png" alt=""></button>
      <div class="dg-copy"><strong>尋找下一位夥伴</strong><p>基礎幻靈・戰術道具・陷阱卡</p><p class="dg-note">${first ? '第一次召喚免費，保底 4 隻黃卡' : '可抽幻靈：黃 ' + pool.yellow.length + '・紫 ' + pool.purple.length + '・紅 ' + pool.red.length}</p></div></div>
    <div class="draw-actions" id="drawActions"></div>
    <details class="pool-details"><summary>獎池與機率</summary><p>幻靈 10%（黃 6%・紫 3%・紅 1%）<br>道具 90%：陷阱卡約四成（泥沼、漩渦、符文陣、毒蘑菇、尖刺、電擊板、間歇泉），補給約六成（治療藥水、緊急復甦藥、大絕電池、攻擊增幅、防禦增幅、速整卡牌、疾速發牌、發牌干擾、清除陷阱卡、PK 專用重新換牌卡）。新戰術道具較稀有；發牌干擾在 PK 中降低對手發牌速度，單人關卡則延緩敵方出兵。<br>道具存在守護戰道具包，戰鬥中點「道具」使用。重複黃／紫／紅卡返還 50／100／500 點。</p></details>`, 'gacha');
  const actions = $('drawActions'), add = (text, fn, cls, disabled) => { const b = document.createElement('button'); b.textContent = text; b.className = cls; b.disabled = disabled; b.onclick = fn; actions.append(b); return b; };
  if (first) add('新手召喚 · 免費（保底 4 隻黃卡）', claimStarter, 'primary', false);
  else for (const n of [1, 10]) add((n === 1 ? '召喚一次' : '召喚十次') + ' · ' + (n * DRAW_COST).toLocaleString() + ' 點', () => drawBatch(n), n === 10 ? 'primary' : '', pts < n * DRAW_COST);
  $('panelBody').querySelector('.dg-machine').onclick = () => { const b = actions.querySelector('button'); if (b.disabled) toast('點數不足，擊倒魔物可獲得點數'); else b.click(); };
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
    for (const r of rewards) {
      if (r.kind === 'spirit' && !record.owned.includes(r.id)) record.owned.push(r.id);
      else if (r.kind === 'item') addTrapCards(r.id, r.quantity || 1);
    }
    saveRecord(); showRewards(rewards, '命運共鳴', n);
  } catch (e) { toast(e.message); }
}
/* the cave summon film, skippable; it reveals the rewards when it ends */
function showRewards(rewards, title, repeat) {
  const token = String(Date.now());
  openPanel(title, summonMarkup(filmRewards(rewards), picture) + '<button id="skipSummon" class="primary">跳過動畫，揭曉獎勵</button>', 'summon');
  const panel = $('panel'); panel.dataset.summon = token;
  const reveal = () => { if (panel.dataset.view !== 'summon' || panel.dataset.summon !== token) return; summonController?.dispose(); summonController = null; revealRewards(rewards, title, repeat); };
  $('skipSummon').onclick = reveal;
  $('panelBody').querySelector('.summon-v07').addEventListener('summoncomplete', reveal, {once: true});
  summonController = startSummon(panel, filmRewards(rewards), picture);
}
function revealRewards(rewards, title, repeat) {
  const groups = groupRewards(rewards), total = rewards.reduce((n, r) => n + (r.quantity || 1), 0);
  openPanel(title === '新手召喚' ? '新手召喚' : '本次獲得', '<div class="reward-summary"><span>獲得 <b>' + total + '</b> 份獎勵 · ' + groups.length + ' 種</span><span>剩餘 <b>' + points().toLocaleString() + '</b> 點</span></div><div class="reward-list">' + groups.map((r) => {
    const sp = r.kind === 'spirit', color = sp ? r.color || 'yellow' : 'supply';
    return '<article class="reward-entry ' + color + '" data-reward="' + r.id + '"><div class="reward-portrait">' + (sp ? '<img src="' + picture(r.id) + '" alt="' + esc(spirit(r.id).name) + '">' : rewardArt(r.id)) + '</div><div class="reward-copy"><small>' + (sp ? {yellow: '黃卡', purple: '紫卡', red: '紅卡'}[color] : '道具') + '</small><strong>' + esc(sp ? spirit(r.id).name : itemName(r.id)) + '</strong><p>' + (sp ? (r.duplicate ? '重複 → 返還 ' + (r.refund || 0) * r.quantity + ' 點' : '新增幻靈・可編入卡組') : isTrapCard(r.id) ? '陷阱卡・戰鬥中點「道具」後選擇放置位置' : '已放進守護戰道具包・戰鬥中點「道具」使用') + '</p></div><b class="reward-qty">×' + r.quantity + '</b></article>';
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
    ${tip('🌤️','固定關卡天氣', `<p>所有關卡與 PK 戰的天氣、天空、日光都固定，不因受到攻擊或施放大絕改變；第三關「水仙瀑布」另有偶發、只落在道路上的閃電，會傷害場上雙方幻靈，不影響天空與基地：</p><div class="weather-grid">${weathers}</div>`)}
    ${tip('🏝️','群島航線', '<p>從初光鎮碼頭出發，依序經過十個主題島；通關後可挑戰下一島，已通關島可重複挑戰。</p>')}
    ${tip('🃏','卡組與升星', `<p>四張基礎幻靈加兩張技能卡，手牌最多 ${HAND_SIZE} 張；一般相同卡須相鄰才能合成升星。<b>特殊例外：</b>金魚國王 ×1 ＋ 金魚皇后 ×1 相鄰可合體為水蛟龍王 ★★★，兩張同種金魚只升星；<b>三色蛋</b>點卡後可選道路任意有效位置放置，或拖曳到道路，放下後固定不移動。場上出戰上限 ${20} 隻。</p>`)}
    ${tip('🔮','支援技能卡', `<ul class="mini">${supports}</ul>`)}
    ${tip('🎒','道具', `<p>${Object.values(ITEMS).map((it) => `<span class="chip">${it.icon} ${it.name}</span>`).join('')}</p>`)}
    </div>
    <div class="modal-actions center"><button class="primary big" data-close>開始守護戰</button></div>`,'howto');
}

let loadingStartedAt = 0;
function loadingPhase(message, percent) {
  if (percent <= 8 || !loadingStartedAt) loadingStartedAt = performance.now();
  $('loadingText').textContent = message;
  $('loadingBar').style.width = Math.max(0,Math.min(100,percent)) + '%';
  $('loadingBar').parentElement?.setAttribute('aria-valuenow', String(Math.round(percent)));
  if ($('loadingElapsed')) $('loadingElapsed').textContent =
    '已讀取 ' + Math.floor((performance.now() - loadingStartedAt) / 1000) + ' 秒';
}
function nextPaint() {
  return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
}
function openModal(html, kind = 'info') {
  $('modalBody').innerHTML = html; const m = $('modal'); m.className = 'panel panel-' + kind;
  if (!m.open) m.showModal(); m.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => m.close()));
}
const ribbon = (text, icon = '') => `<div class="ribbon"><span>${icon ? `<i>${icon}</i>` : ''}${text}</span></div>`;

/* ---------- battle ---------- */
async function startGame() {
  /* Also check restarts and auto-voyage, not only the chart sortie button. */
  if (!requireCompleteSortie()) return;
  /* Loading is not gameplay. Stop any previous battle and reset the simulation
     clock even when this is a restart or an automatic next-island voyage. */
  const serial = ++startSerial;
  hideBossIntro();
  pendingDealingScene = null; visibleSceneFrames = 0;
  game = null;
  acc = 0; last = 0; paused = true;
  $('hud').hidden = true;
  $('loading').hidden = false; loadingPhase('正在啟動戰鬥引擎…', 8);
  await nextPaint(); // make the boat/loader visible before any expensive 3D map build
  if (serial !== startSerial) return;
  try {
    await loadEngine();
    if (serial !== startSerial) return;
    loadingPhase('正在搭建島嶼與道路…', 26);
    await nextPaint();
    if (!view) view = createView($('world'), {spirits: data.spirits, catalog: data.catalog});
    if (!audio) audio = createCombatAudio();
    view.costume = costumeFor(journey()).id;
    game = createGame({stageIndex: record.stage, deck: record.deck, spirits: data.spirits, catalog: data.catalog, evolution: data.evolution, deferDeal: true, hooks: {fire: (f, target, strong) => view.fire(f, target, strong)}});
    game.runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    view.setGame(game); prepareBossPortrait(game.stage);
    loadingPhase('場景完成，正在準備幻靈素材…', 55);
    const ids = [...record.deck, ...game.stage.groups.map((g) => g.species), game.stage.boss];
    const models = view.preload(ids, (done, total) => {
      if (serial === startSerial && !$('loading').hidden)
        loadingPhase('正在讀取幻靈素材 ' + done + '/' + total + '…', 55 + done / Math.max(1,total) * 39);
    });
    /* Slow networks must not block the first visible battle; missing models
       continue streaming, using the existing actor placeholders until ready. */
    await Promise.race([models, new Promise((resolve) => setTimeout(resolve, 4300))]);
    if (serial !== startSerial) return;
    loadingPhase('戰場準備完成，開始出擊！', 100);
    await nextPaint();
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
  pendingDealingScene = game; visibleSceneFrames = 0;
  setBattleStageHeading(`${record.stage + 1}. ${game.stage.name}`,
    `${stageWeather(game.stage.scene).icon} ${stageWeather(game.stage.scene).name}`);
  renderHand(); hud();
  /* Opening boss speech includes the stage title, avoiding overlap with the stage banner. */
  setTimeout(() => game && toast('拖曳卡片排列，相同的卡相鄰會合成；點一下卡片派出'), 2400);
  globalThis.PhantomBgm?.setScene?.(THEME_SCENE);
}

/* ---------- PK battle: the host runs rules.js in duel mode and streams snapshots; the guest shows the mirror ---------- */
async function startPkGame(session) {
  const serial = ++startSerial;
  hideBossIntro(); pendingDealingScene = null; visibleSceneFrames = 0; game = null; acc = 0; last = 0; loop.renderBank = 0; loop.lastRenderAt = 0; paused = false; speed = 1;
  pk = session; pk.arena = pkArenaFor(pk.seed); pk.outbox = []; pk.sentAt = 0; pk.foeLoaded = false; pk.loadedSent = false; pk.waitFrom = 0;
  pk.itemStock = {...(pk.foe?.stock || {})}; pendingPkItems.clear(); bagCache.at = 0;
  document.body.classList.add('pk-mode');
  $('hud').hidden = true; $('loading').hidden = false; loadingPhase('正在前往 ' + pk.arena.arenaName + ' 對戰場景…', 8);
  await nextPaint();
  if (serial !== startSerial) return;
  try {
    await loadEngine();
    if (serial !== startSerial) return;
    loadingPhase('正在搭建隨機 PK 島嶼…', 28);
    await nextPaint();
    if (!view) view = createView($('world'), {spirits: data.spirits, catalog: data.catalog});
    if (!audio) audio = createCombatAudio();
    view.costume = costumeFor(journey()).id;
    /* The remote barrel uses that player's own equipped hero outfit.
       The wardrobe adapter validates unknown/legacy costume IDs. */
    view.rivalCostume = costumeFor(pk.foe?.costume || 'trainer').id;
    if (pk.role === 'host') {
      game = createGame({stage: pk.arena, deck: pk.me.deck, foeDeck: pk.foe.deck, spirits: data.spirits, catalog: data.catalog, evolution: data.evolution, seed: pk.seed, deferDeal: true, hooks: {fire: (f, target, strong) => view.fire(f, target, strong)}});
      pk.on('act', (m) => {
        if (!game || game.result || !game.started) return;
        if (m.a === 'item') {
          const id = String(m.id || '');
          if (!TACTICAL_BAG.includes(id) || !(pk.itemStock[id] > 0) ||
              !useBagItem(game, id, 'enemy')) {
            pk.send({t:'itemDenied',id,text:id === 'foe-redeal' ? '對手目前沒有手牌' : '目前無法使用這項道具（可能已用完或效果尚在持續）'});
            return;
          }
          pk.itemStock[id]--;
          pk.send({t:'itemUsed',id});
          return;
        }
        const i = game.foe.hand.findIndex((c) => c.uid === m.uid); if (i < 0) return;
        try { if (m.a === 'play') playCard(game, i, 'enemy', m.x); else if (m.a === 'move') moveCard(game, i, m.to, 'enemy'); } catch (e) { pk.send({t: 'toast', text: e.message}); }
      });
      pk.on('loaded', () => { pk.foeLoaded = true; });
      pk.on('quit', () => { if (game && !game.result) { game.nest.hp = 0; pk.foeQuit = true; } });
    } else {
      game = createMirror(pk.arena);
      pk.on('snap', (m) => {
        if (!game?.mirror) return;
        applySnapshot(game, m.d, (f, target, strong) => view.fire(f, target, strong));
        /* no frames run in the background to drain these: keep only the latest */
        if (game.events.length > 200) game.events.splice(0, game.events.length - 200);
      });
      pk.on('toast', (m) => toast(m.text));
      pk.on('itemUsed', (m) => {
        if (!TACTICAL_BAG.includes(m.id) || !pendingPkItems.has(m.id)) return;
        pendingPkItems.delete(m.id);
        if (takeBagItem(m.id)) toast(BAG_ITEMS[m.id].name + ' 已施放！');
        bagCache.at = 0; handSig = ''; hud(); renderItems(true);
      });
      pk.on('itemDenied', (m) => {
        pendingPkItems.delete(m.id);
        toast(m.text || '這項道具暫時無法使用');
      });
    }
    game.runId = 'pk-' + Date.now().toString(36);
    pk.onGone = () => { if (game && !game.result) { toast('對手離線了'); showPkResult({won: true, gone: true, time: game.time}); } };
    view.setGame(game);
    loadingPhase('雙方幻靈進場中…', 55);
    const ids = [...pk.me.deck, ...pk.foe.deck];
    const models = view.preload(ids, (done,total) => {
      if (serial === startSerial && !$('loading').hidden)
        loadingPhase('已準備 ' + done + '/' + total + ' 位幻靈…', 55 + done / Math.max(1,total) * 39);
    });
    await Promise.race([models,new Promise((resolve)=>setTimeout(resolve, 4300))]);
    if (serial !== startSerial) return;
    loadingPhase('PK 戰場已完成！',100);
    await nextPaint();
  } catch (e) {
    console.error(e); toast(e.message); $('loading').hidden = true; endPk(); return;
  }
  $('loading').hidden = true; $('lobby').hidden = true; $('hud').hidden = false;
  handSig = ''; pendingDealingScene = game; visibleSceneFrames = 0;
  renderHand(); hud();
  setTimeout(() => game && pk && toast('PK 開始！派出幻靈，打倒對方的基地'), 1800);
  globalThis.PhantomBgm?.setScene?.(THEME_SCENE);
}
function pkClock() { const left = Math.max(0, PK_TIME - (game?.time || 0)); return Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0'); }
function endPk() {
  document.body.classList.remove('pk-mode');
  pendingPkItems.clear(); bagCache.at = 0;
  pk = null;
}
function showPkResult(r) {
  if (!pk || pk.shown) return; pk.shown = true;
  const won = r.won === true, draw = r.won === null, mine = Math.round((game?.crystal.hp || 0) / (game?.crystal.maxHp || 1) * 100), theirs = Math.round((game?.nest.hp || 0) / (game?.nest.maxHp || 1) * 100);
  const kills = pk.role === 'host' ? game?.stats.kills : game?.stats.kills, lost = pk.role === 'host' ? game?.foe?.kills || 0 : game?.foeKills || 0;
  const why = r.gone ? '對手離線，判定獲勝' : pk.quit ? '你投降了' : pk.foeQuit || r.foeQuit ? '對手投降了' : r.timeUp ? (mine !== theirs ? '時間到，比基地剩餘血量' : '時間到，基地血量相同，比擊倒數') : won ? '攻破了對方的基地！' : '基地被攻破了…';
  const stat = (icon, value, label, tone) => `<div class="stat"><i class="tone-${tone}">${icon}</i><b>${value}</b><small>${label}</small></div>`;
  const mins = Math.floor((r.time || 0) / 60), secs = Math.round((r.time || 0) % 60);
  openModal(`<header class="sheet-head"><div class="sunburst"></div><h2 class="sheet-title">${draw ? '平手' : won ? '勝利！' : '落敗'}</h2></header>
    <p class="result-title">PK 競技場・vs ${esc(pk.foe?.name || '對手')}</p>
    <p class="result-sub">${why}</p>
    <div class="stats">${stat('⏱', `${mins}:${String(secs).padStart(2, '0')}`, '用時', 'blue')}${stat('💥', kills || 0, '擊倒', 'red')}${stat('❤', mine + '%', '我方基地', 'green')}${stat('🏰', theirs + '%', '對方基地', 'violet')}</div>
    <div class="sheet-actions">
      <button class="round" id="pkToChart" title="離開房間回海圖"><span>🗺️</span><small>海圖</small></button>
      ${r.gone ? '' : '<button class="primary wide" id="pkAgain">再戰一場 ↻<small>回到對戰準備</small></button>'}
    </div>`, won ? 'win' : 'lose');
  const close = () => { const s = pk; leaveGame(); return s; };
  $('pkToChart').onclick = () => { close(); pkLobby.leave(); };
  if ($('pkAgain')) $('pkAgain').onclick = () => { close(); pkLobby.rematch(); };
}
function openPkPause() {
  openModal(`${ribbon('PK 對戰中', '⚔️')}<p class="result-sub">對戰不會暫停。投降會直接判對手獲勝。</p>
    <div class="modal-actions center"><button class="tool" id="pkGiveUp">投降</button><button class="primary big" data-close>繼續對戰</button></div>`, 'howto pk');
  $('pkGiveUp').onclick = () => {
    $('modal').close(); if (!pk || !game || game.result) return; pk.quit = true;
    if (pk.role === 'host') game.crystal.hp = 0; else pk.send({t: 'quit'});
  };
}

/* credit this battle's kill points to the shared cave wallet once (idempotent per run id) */
function creditPoints() {
  if (!game || game.credited) return 0; game.credited = true;
  const pts = game.stats.points; if (!pts) return 0;
  try { globalThis.PhantomCaveBridge.reward('defense:' + game.runId, pts); return pts; } catch (e) { console.warn(e); toast('點數寫入失敗：' + e.message); return 0; }
}
function leaveGame() {
  /* Prevent an in-flight load or first-frame callback from dealing into
     a battle after the user returns to the island chart. */
  ++startSerial; pendingDealingScene = null; visibleSceneFrames = 0; hideBossIntro();
  creditPoints();
  endPlacing(); game = null; $('hud').hidden = true; $('lobby').hidden = false; $('modal').close();
  if (pk) { if (pk.handlers) for (const k of ['snap', 'act', 'quit', 'loaded', 'toast']) delete pk.handlers[k]; pk.onGone = null; endPk(); }
  view?.setGame(null); audio?.stop?.();
  globalThis.PhantomBgm?.setScene?.(THEME_SCENE);
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
    const line = isThreeColorEgg(c.species) ? '🥚 點選後放在路徑上'
      : ['groudon','rayquaza'].includes(c.species) ? '🐟 國王＋皇后合體水蛟龍王'
      : sup ? `✨ 技能：${esc(sup.skill)}` : `${esc(roleLabel(c.species))} · ${shapeLabel(c.species, false)}`;
    return `<button class="hand-card ${sup ? 'support' : ''} ${isThreeColorEgg(c.species) ? 'egg-lane-card' : ''} ${placing?.type === 'egg' && placing.uid === c.uid ? 'egg-selected' : ''} ${canPlay(game, i) ? '' : 'disabled'} ${anim}" data-uid="${c.uid}" title="${esc(sup ? sup.text : spirit(c.species).name + '・大絕' + shapeLabel(c.species, true))}"><span class="stars stars-${spirit(c.species).cardFrame || 'yellow'}">${'<i>★</i>'.repeat(c.rank)}</span>${sup ? '<span class="badge">技能</span>' : ''}${cardHtml(c.species, {line})}</button>`;
  }).join('');
  fresh.clear();
}
const indexOfUid = (uid) => game.hand.findIndex((c) => c.uid === uid);
function play(uid) {
  if (!game || game.result) return;
  const i = indexOfUid(uid); if (i < 0) return;
  if (isThreeColorEgg(game.hand[i].species)) {
    if (placing?.type === 'egg' && placing.uid === uid) endPlacing();
    else beginEggPlacement(uid);
    return;
  }
  /* a support spirit jumps out of this card, so the view needs where the card is on screen */
  const el = $('hand').querySelector(`[data-uid="${uid}"]`); if (el && isSupport(game.hand[i].species)) { const r = el.getBoundingClientRect(); view.cardOrigin = {x: r.left + r.width / 2, y: r.top + r.height * 0.4}; }
  if (pk?.role === 'guest') { pk.send({t: 'act', a: 'play', uid}); return; }
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
  const special = isThreeColorEgg(card.species)
    ? row('t-atk','放置','<b>固定防衛單位</b>：點擊卡牌，再點選路徑任意位置；或直接拖曳到路徑放開。放置後不移動。')
    : ['groudon','rayquaza'].includes(card.species)
      ? row('t-ult','合體','<b>金魚國王＋金魚皇后</b>：兩張不同種類的金魚卡相鄰才會合體成水蛟龍王。同種只升星。')
      : '';
  const rows = sup
    ? row('t-skill','輔助',`<b>${esc(sup.skill)}</b>　${esc(sup.text)}<br><small>大絕排隊施放，避免視覺效果重疊。★${card.rank}</small>`)
    : row('t-atk','職業',`<b>${esc(roleLabel(s.id))}</b>　${atk}・距離 ${r.range.toFixed(1)}<br><small>普攻不再判斷屬性相克，特效仍沿用原動畫。</small>`)
      + row('t-ult','大絕',`<b>${esc(u?.name || s.skills?.[1]?.name || '大絕')}</b>　${esc(u?.description || '專屬技能')}<br><small>冷卻 ${+ultCooldown(s).toFixed(1)} 秒，至少間隔 ${ULTIMATE_SPACING} 秒錯峰施放。★${card.rank}</small>`)
      + row('t-pas','被動',passives.length ? passives.map(esc).join('<br>') : '無被動能力');
  return `<div class="ci-head" data-frame="${s.cardFrame || 'yellow'}"><img src="${picture(card.species)}" alt=""><div><b>${esc(s.name)}</b><span class="stars-${s.cardFrame || 'yellow'}">${'<i>★</i>'.repeat(card.rank)}</span><small>${esc(roleLabel(s.id))}・第 ${s.stage || 1} 階段</small></div></div>`
    + rows + special;
}

/* The back of a deck card: one section per star (★ / ★★ / ★★★, tap to open). Each lists that star's job, basic attack,
   ultimate and passives in the same layout, with the real numbers of the rules (merging two identical cards of a star gives the next star:
   a spirit with a further form evolves into it, one without grows ×1.5 / ×2 in HP and attack; ultimates hit 100% / 130% / 160%). */
const spiritName = (id) => spirit(id)?.name || id;
function supportText(sup, r) {
  const pct = (v) => Math.round(v * 100) + '%', cap = (v, m) => +Math.min(v, m).toFixed(1), k = sup.kind;
  return k === 'freeze' ? '全場魔物冰凍 ' + cap(sup.duration[r], 4.5) + ' 秒'
    : k === 'volley' ? '六發追星彈擊中最強的魔物，每發傷害 ' + sup.power[r] + '（隨關卡提高）'
    : k === 'quake' ? '全場重擊 ' + sup.power[r] + ' 並擊退魔物'
    : k === 'plague' ? '全場魔物中毒並虛弱 ' + sup.duration[r] + ' 秒，每秒毒傷 ' + sup.power[r]
    : k === 'beam' ? '從基地射出光束，貫穿路上的魔物，傷害 ' + sup.power[r]
    : k === 'heal' ? '回復我方幻靈 ' + pct(Math.min(0.7, sup.power[r])) + ' 生命，基地回復 ' + pct(sup.crystal[r])
    : k === 'shield' ? '我方幻靈無敵 ' + cap(sup.duration[r], 3.5) + ' 秒'
    : k === 'haste' ? '我方幻靈攻擊速度加倍 ' + cap(sup.duration[r], 5) + ' 秒' : sup.text;
}
function formRows(id, rank, mul) {
  const s = spirit(id), sup = SUPPORT[id], r = roleFor(id), u = ultimateFor(id), k = rank - 1;
  const row = (tag, title, body) => `<div class="ci-row"><span class="ci-tag ${tag}">${title}</span><div>${body}</div></div>`;
  if (sup) return row('t-job', '職業', '<b>輔助</b>　點擊卡片立即施放技能') + row('t-skill', '技能', `<b>${esc(sup.skill)}</b>　${esc(supportText(sup, k))}`);
  const heal = u && /heal|regen|shield/.test(u.kind || ''), passives = passiveLines(s);
  const special = id === 'jigglypuff'
    ? row('t-job','出場方式','<b>指定道路位置・固定防守</b>。點選三色蛋卡牌再點道路，或拖曳卡牌到道路放開；三色蛋本體不移動，取消或點錯位置不扣卡牌。進化成其他幻靈後依一般召喚規則。')
    : id === 'kyogre'
      ? row('t-ult','進化分支','<b>同星小金魚 ×2</b>，隨機進化成金魚國王或金魚皇后。兩種金魚皆可出現在後續手牌。')
      : ['groudon','rayquaza'].includes(id)
        ? row('t-ult','專屬合體','<b>金魚國王 ×1 ＋ 金魚皇后 ×1</b> 相鄰可直接合體為水蛟龍王 ★★★；同種兩張只升星，無法單獨進化成水蛟龍王。')
        : id === 'mewtwo'
          ? row('t-ult','合體來源','<b>只能由金魚國王＋金魚皇后</b>在守護戰手牌中相鄰合體取得；兩張國王或兩張皇后都不會產生水蛟龍王。')
          : '';
  return row('t-job', '職業', `<b>${esc(roleLabel(id))}</b>`)
    + special
    + row('t-atk', '普攻', `${shapeLabel(id, false)}・距離 ${r.range.toFixed(1)}<br><small>生命 ${Math.round(s.hp * mul)}・攻擊 ${Math.round(s.attack * mul)}${mul > 1 ? '（×' + mul.toFixed(1) + '）' : ''}</small>`)
    + row('t-ult', '大絕', `<b>${esc(u?.name || s.skills?.[1]?.name || '大絕')}</b>　${esc(u?.description || '專屬技能')}<br><small>威力 ${Math.round((1 + 0.3 * k) * 100)}%${heal ? '・治療量 ' + Math.round((1 + 0.2 * k) * 100) + '%' : ''}・冷卻 ${+ultCooldown(s).toFixed(1)} 秒${s.stage ? '・第 ' + s.stage + ' 階段' : ''}</small>`)
    + row('t-pas', '被動', passives.length ? passives.map(esc).join('<br>') : '無被動能力');
}
function cardBackHtml(id) {
  const s = spirit(id), sup = SUPPORT[id];
  /* The shared cave table lists the dragon as an ordinary King/Queen successor,
     but Guard Battle requires one of EACH, so never show the old false
     "two Kings -> Dragon" recipe on the deck card's ★★★ evolution page. */
  const tiers = [[id]];
  for (let r = 1; r < MAX_RANK; r++) {
    const next = sup ? [] : [...new Set(tiers[r - 1].flatMap((f) =>
      ['groudon','rayquaza'].includes(f) ? [f] :
      evolutionsOf(data.evolution, f).filter((e) => spirit(e))))];
    tiers.push(next.length ? next : tiers[r - 1]);
  }
  if (id === 'kyogre') tiers[2] = ['groudon','rayquaza','mewtwo'];
  const sections = tiers.map((forms, r) => {
    const evolved = r > 0 && forms !== tiers[r - 1];
    const growth = id === 'kyogre' && r === 1
      ? '同星小金魚 ×2 → 隨機國王／皇后'
      : id === 'kyogre' && r === 2
        ? '國王＋皇后 → 水蛟龍王；同種 ×2 僅升星'
        : r === 0 ? '出場時' : '兩張 ' + '★'.repeat(r) + ' 相鄰合成' + (sup ? '' : evolved ? '・進化' : '・生命攻擊 ×' + (1 + 0.5 * r).toFixed(1));
    const body = forms.map((f) => (forms.length > 1 ? `<p class="form-name">${esc(spiritName(f))}</p>` : '') + formRows(f, r + 1, evolved ? 1 : sup ? 1 : 1 + 0.5 * r)).join('');
    return `<details class="star-sec"${r === 0 ? ' open' : ''}><summary><span class="ci-tag t-star">${'★'.repeat(r + 1)}</span><b>${esc(forms.map(spiritName).join(' 或 '))}</b><small>${growth}</small></summary>${body}</details>`;
  }).join('');
  const special = id === 'jigglypuff'
    ? '<div class="deck-special-note">🥚 <b>指定出場位置：</b>點三色蛋卡牌再點道路，或拖曳卡牌到道路；蛋放好後不移動，無效位置不消耗。</div>'
    : id === 'kyogre'
      ? '<div class="deck-special-note">🐟 <b>水蛟龍王合體條件：</b>國王 ×1 ＋ 皇后 ×1 相鄰 → 水蛟龍王 ★★★；兩張同種金魚只升星。</div>'
      : '';
  return `<div class="ci-head" data-frame="${s.cardFrame || 'yellow'}"><img src="${picture(id)}" alt=""><div><b>${esc(s.name)}</b><small>${esc(sup ? '紅卡輔助' : roleLabel(id))}・點選星級查看該階段能力</small></div></div>` + special + sections;
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
    const card = game?.hand[indexOfUid(drag.uid)];
    const egg = card && isThreeColorEgg(card.species);
    const fieldTarget = e.clientY < hand.getBoundingClientRect().top - 8;
    if (egg && fieldTarget) {
      hand.querySelectorAll('.hand-card').forEach((b) => b.classList.remove('drop-before','drop-after'));
      const hit = view?.pickRoad(e.clientX, e.clientY);
      view?.placement('egg', hit?.x ?? null);
    } else {
      if (egg) view?.placement(null);
      markDrop(e.clientX, drag.el);
    }
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; if (game) game.dragging = false; clearTimeout(d.hold);
    if (d.info) { hideCardInfo(); return; }
    if (!d.moving) { play(d.uid); return; }
    const from = indexOfUid(d.uid), card = game?.hand[from];
    if (card && isThreeColorEgg(card.species) &&
        e.clientY < hand.getBoundingClientRect().top - 8) {
      const hit = view?.pickRoad(e.clientX, e.clientY);
      view?.placement(null);
      if (hit) placeEggAt(d.uid, hit.x);
      else beginEggPlacement(d.uid);
      handSig = ''; hud();
      return;
    }
    const to = dropIndex(e.clientX, d.el);
    if (from >= 0 && pk?.role === 'guest') { pk.send({t: 'act', a: 'move', uid: d.uid, to}); const c = game.hand.splice(from, 1)[0]; game.hand.splice(to, 0, c); }
    else if (from >= 0) { moveCard(game, from, to); handleEvents(); if (pk) pk.outbox.push(...game.events); game.events.length = 0; }
    handSig = ''; hud();
  };
  /* listen on the window: the pointer may be released outside the hand */
  addEventListener('pointerup', end);
  hand.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) { clearTimeout(drag.hold); hideCardInfo(); drag = null; if (game) game.dragging = false; handSig = ''; hud(); } });
}

/* Stage name and fixed weather are separate no-break text units. On small
   phones they stack inside one wooden label; never orphan the last character
   of a Chinese place name or split the weather into single-character rows. */
function setBattleStageHeading(stageText, weatherText = '') {
  const heading = $('stageName'), label = $('hudStageLabel'), weather = $('hudWeatherLabel');
  label.textContent = stageText;
  weather.textContent = weatherText;
  weather.hidden = !weatherText;
  heading.setAttribute('aria-label', stageText + (weatherText ? '，' + weatherText : ''));
  heading.title = stageText + (weatherText ? '・' + weatherText : '');
}

function hud() {
  if (!game) return;
  $('runPoints').textContent = game.stats.points.toLocaleString();
  if (pk) setBattleStageHeading('⚔️ vs ' + (pk.foe?.name || '對手'),
    (pk.arena?.arenaName || '競技場') + '・' + pkClock() + (game.time > PK_RAGE_AT ? '・狂暴！' : ''));
  const owned = usableItems().reduce((n, u) => n + u.count, 0);
  $('items').classList.toggle('ready', owned > 0);
  $('itemsCount').textContent = owned ? owned + ' 個' : '無道具';
  if (!$('itemMenu').hidden) renderItems();
  const interval = DEAL_EVERY / (game.dealRate || 1);
  $('dealFill').style.width = (game.hand.length >= HAND_SIZE ? 100 : Math.max(0, Math.min(100, (1 - (game.dealAt - game.time) / interval) * 100))) + '%';
  const fill = $('dealFill').parentElement;
  fill.title = game.dealRate > 1 ? '疾速發牌中（速度加倍）' : game.dealRate < 1 ? '發牌受到干擾（速度減半）' : '正常發牌速度';
  $('speed').textContent = '×' + speed; $('pause').textContent = paused ? '▶' : '❚❚';
  renderHand();
}

/* Item menu: the gacha supplies and trap cards the player owns, each with its count. Nothing here is unlimited. */
let bagCache = {at: 0, list: []}, placing = null;
function usableItems() {
  if (performance.now() - bagCache.at < 800 && bagCache.list.length) return bagCache.list;
  /* The bag lists what can be used in this fight and is owned: PK shows only the PK items,
     an island fight everything except the PK-only cards. */
  const list = [
    ...Object.entries(BAG_ITEMS)
      .map(([id, it]) => ({id, ...it, count: bagCount(id), kind: 'bag'})),
    ...Object.entries(TRAP_CARDS)
      .map(([id, it]) => ({id, ...it, count: bagCount(id), kind: 'trap'})),
  ].filter((u) => u.count > 0 && (pk ? TACTICAL_BAG.includes(u.id) : !PK_ONLY_ITEMS.includes(u.id))); // Never display zero-stock entries.
  bagCache = {at: performance.now(), list};
  return list;
}
function renderItems(force = false) {
  const menu = $('itemMenu'); if (force) bagCache.at = 0;
  const list = usableItems(), sig = list.map((u) => u.id + ':' + u.count).join('|') + (pk ? ':pk' : ':islands');
  if (menu.dataset.sig === sig && menu.children.length) return;
  menu.dataset.sig = sig;
  const row = (u) => {
    return `<button class="item" data-${u.kind === 'trap' ? 'trap' : 'bag'}="${u.id}"><span class="item-icon">${u.icon}</span><span class="item-text"><b>${esc(u.name)}</b><small>${esc(u.text)}</small></span><span class="item-cd">×${u.count}</span></button>`;
  };
  if (!list.length) {
    menu.innerHTML = '<p class="item-empty">' + (pk ? '目前沒有 PK 可用的道具。' : '目前沒有持有道具。') + '請前往群島轉蛋機抽取補給與戰術道具。</p>';
    return;
  }
  const bag = list.filter((u) => u.kind === 'bag'), traps = list.filter((u) => u.kind === 'trap');
  menu.innerHTML = (bag.length ? '<p class="item-head">' + (pk ? 'PK 戰術道具' : '補給與戰術道具') + '</p>' + bag.map(row).join('') : '') +
    (traps.length ? '<p class="item-head">陷阱卡（點選後放到路上）</p>' + traps.map(row).join('') : '');
}
function useBag(id) {
  if (!game || game.result || !game.started || !BAG_ITEMS[id]) return;
  if (bagCount(id) < 1) return toast('道具已用完，可到群島轉蛋機抽取');
  if (pk) {
    if (!TACTICAL_BAG.includes(id)) return toast('PK 僅開放卡牌戰術道具');
    if (pk.role === 'guest') {
      if (pendingPkItems.has(id)) return;
      if (id === 'card-organize' && !game.hand.length) return toast('手牌空了，無法整理');
      pendingPkItems.add(id);
      pk.send({t:'act', a:'item', id});
      $('itemMenu').hidden = true;
      toast('已向房主送出道具使用請求');
      return;
    }
  }
  if (!useBagItem(game, id, 'ally')) {
    return toast(id === 'card-organize' ? '手牌空了，無法整理' :
      id === 'trap-clear' ? '路上沒有陷阱可以清除' :
      id === 'foe-redeal' ? '對手目前沒有手牌' :
      id === 'deal-boost' ? '疾速發牌仍在持續，請稍後再用' :
      id === 'deal-jam' ? '發牌干擾仍在持續，請稍後再用' : '目前無法使用此道具');
  }
  takeBagItem(id);
  bagCache.at = 0;
  $('itemMenu').hidden = true;
  toast(BAG_ITEMS[id].name + '：' + BAG_ITEMS[id].text);
  handSig = ''; hud(); renderItems(true);
}

/* Three-color egg is a stationary defender and can be placed at a chosen
   road point. Tap the card then the road, or drag the card onto the road. */
function beginEggPlacement(uid) {
  if (!game || game.result || indexOfUid(uid) < 0) return;
  if (placing) endPlacing();
  placing = {type:'egg', uid, kind:'egg'};
  $('itemMenu').hidden = true;
  document.body.classList.add('placing-egg');
  view?.placement('egg');
  handSig = ''; hud();
  banner('🥚 點選路徑任意位置放三色蛋，再按原卡或 Esc 取消');
}
function placeEggAt(uid, x) {
  if (!game || game.result || !validEggPosition(game, x)) {
    toast('請選擇路徑上有效的位置'); return false;
  }
  const index = indexOfUid(uid);
  if (index < 0 || !isThreeColorEgg(game.hand[index].species)) {
    endPlacing(); return false;
  }
  if (!canPlay(game, index)) { toast('場上幻靈已達上限'); return false; }
  if (pk?.role === 'guest') {
    pk.send({t:'act',a:'play',uid,x:-x}); // guest's coordinates are mirrored by the authoritative host
    endPlacing(); toast('🥚 已將放置位置送交房主'); return true;
  }
  try {
    playCard(game, index, 'ally', x);
    endPlacing(); handSig = ''; hud(); toast('🥚 三色蛋已放置在指定位置');
    return true;
  } catch(err) { toast(err.message); return false; }
}
/* choose a trap card, then tap a spot on the road: the road is dotted and a preview follows the finger */
function beginPlacing(id) {
  if (!game || game.result) return;
  if ((trapStock()[id] || 0) < 1) return toast('這張陷阱卡用完了，去群島轉蛋機抽抽看');
  if (game.traps.filter((t) => !t.expired).length >= MAX_TRAPS) return toast('路上最多同時放 ' + MAX_TRAPS + ' 個陷阱，等舊的消失再放');
  if (placing) endPlacing();
  placing = {type:'trap', id, kind: TRAP_CARDS[id].kind}; $('itemMenu').hidden = true; document.body.classList.add('placing-trap');
  view?.placement(placing.kind); banner('點選路上要放「' + TRAP_CARDS[id].name.replace('陷阱卡', '') + '」的位置（再點「道具」或空白處取消）');
}
function endPlacing() { if (!placing) return; placing = null; document.body.classList.remove('placing-trap','placing-egg'); view?.placement(null); $('banner').hidden = true; if (game && !drag) { handSig = ''; hud(); } }
function bindPlacement() {
  const canvas = $('world'); let down = null;
  canvas.addEventListener('pointerdown', (e) => { if (placing) down = {x: e.clientX, y: e.clientY, t: performance.now()}; });
  canvas.addEventListener('pointermove', (e) => { if (placing && (e.buttons === 0 || placing.type === 'egg')) { const hit = view?.pickRoad(e.clientX, e.clientY); view?.placement(placing.kind, hit ? hit.x : null); } });
  canvas.addEventListener('pointerup', (e) => {
    if (!placing || !down) return;
    const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 700; down = null;
    if (!tap) return;
    const hit = view?.pickRoad(e.clientX, e.clientY);
    if (placing.type === 'egg') {
      if (!hit) { toast('請點在道路上，或點原卡取消'); return; }
      placeEggAt(placing.uid, hit.x); return;
    }
    if (!hit) { endPlacing(); return; }
    const t = placeTrap(game, placing.kind, hit.x);
    if (!t) { toast('這裡不能放（太靠近起點或終點，或路上陷阱已滿）'); return; }
    const t0 = trapStock(); t0[placing.id] = Math.max(0, (t0[placing.id] || 0) - 1); saveRecord(); bagCache.at = 0;
    toast(TRAP_CARDS[placing.id].name.replace('陷阱卡', '') + ' 已放置，持續 ' + TRAP_LIFE + ' 秒');
    const again = (t0[placing.id] || 0) > 0 && game.traps.filter((x) => !x.expired).length < MAX_TRAPS;
    if (!again) endPlacing(); handSig = ''; hud();
  });
}

/* ---------- merge: short card fusion glow only, no evolution overlay ---------- */
const FRAME_GLOW = {yellow: 'gold', purple: 'violet', red: 'rose'};
/* Merging keeps the subtle flash and circular ripple; remove the large gold star
   and flying star-shaped sparks (rank badges on the card itself remain intact). */
const burstHtml = () => '<i class="fb-glow"></i><i class="fb-ring"></i>';
function fuse(ev) {
  PixelFX?.ui('defense', 'mergeUi');
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
    if (pk && ev.type === 'bagItem' && ev.id === 'foe-redeal' && ev.side === 'enemy') { banner('對手使用重新換牌卡，你的手牌全部換新！'); fresh.clear(); handSig = ''; }
    if (pk && ev.side === 'enemy' && (ev.type === 'deal' || ev.type === 'merge' || ev.type === 'play' || ev.type === 'move')) continue;
    if (pk && ev.type === 'finish') { setTimeout(() => showPkResult({...ev, foeQuit: pk?.foeQuit}), 900); continue; }
    if (pk && ev.type === 'skillStart' && ev.side === 'enemy') { banner('對手施放 ' + spirit(ev.species).name + '・' + ev.skill + '！'); continue; }
    if (ev.type === 'fire' || ev.type === 'ultimate') audio?.play({speciesId: ev.species, element: ev.element, pet: true, phase: 'start', strong: ev.type === 'ultimate'});
    else if (ev.type === 'release') { audio?.play({speciesId: ev.species, element: ev.element, pet: true, phase: 'release', strong: ev.strong, final: ev.strong}); if (ev.side === 'ally' || Math.random() < 0.4) audio?.play({kind: weaponSound(ev.kind), element: ev.element, pet: false, phase: 'release', strong: ev.strong}); }
    else if (ev.type === 'hit' && ev.amount > 0 && (ev.crit || performance.now() - lastImpact > 90)) { lastImpact = performance.now(); audio?.play({kind: weaponSound(ev.kind), element: ev.element, pet: false, phase: 'impact', strong: ev.strong || ev.crit, critical: ev.crit, final: ev.crit && ev.strong}); }
    else if (ev.type === 'trap') audio?.play({kind: ev.kind === 'shock' ? 'guns' : 'blades', element: ev.kind === 'shock' ? '雷' : ev.kind === 'geyser' ? '潮' : '光', pet: false, phase: 'impact', strong: true});
    else if (ev.type === 'deal') fresh.set(ev.uid, 'dealt');
    else if (ev.type === 'merge') { fuse(ev); audio?.play({phase: 'impact', strong: true, final: ev.rank >= 3}); toast(ev.goldfishFusion ? '🐟 金魚國王＋金魚皇后合體進化成水蛟龍王！' : ev.evolved ? `${spirit(ev.from).name} 合成進化成 ${spirit(ev.to).name}！` : isSupport(ev.to) ? `${spirit(ev.to).name} 升到 ${'★'.repeat(ev.rank)}，技能加強！` : `${spirit(ev.to).name} 升到 ${'★'.repeat(ev.rank)}，能力提升！`); }
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
  openModal(`<div class="stage-result-content"><header class="sheet-head">
      <div class="sunburst"></div>
      ${r.won ? `<div class="result-stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : 'off'}" style="--i:${i}">★</span>`).join('')}</div>` : `<img class="boss-face" src="${picture(stage.boss)}" alt="">`}
      <h2 class="sheet-title">${r.won ? '過關！' : '挑戰失敗'}</h2>
    </header>
    <p class="result-title">${idx + 1}. ${esc(stage.name)}</p>
    <p class="result-sub">${r.won ? `擊敗魔王 ${esc(spirit(stage.boss)?.name || '')}，巢穴攻破！` : `魔王 ${esc(spirit(stage.boss)?.name || '')} 守住了巢穴…`}</p>
    <div class="stats">${stat('⏱', `${mins}:${String(secs).padStart(2, '0')}`, '用時', 'blue')}${stat('💥', r.kills, '擊倒', 'red')}${stat('✨', game.stats.merges, '合成', 'violet')}${stat('❤', Math.round(r.crystal * 100) + '%', '基地', 'green')}</div>
    <p class="result-points">🎟️ 轉蛋點數 <b>+${(r.earned || 0).toLocaleString()}</b><small>共 ${points().toLocaleString()} 點・與無盡洞穴共用</small></p>
    <p class="result-note">${r.won ? (first && next ? `🔓 解鎖新關卡：<b>${esc(next.name)}</b>` : next ? '已通過這一關！' : '🎉 全部關卡都通過了！') : '💡 把相同的卡排在一起合成高星幻靈，或帶上輔助技能卡。'}</p>
    </div>
    <div class="sheet-actions stage-result-actions" role="group" aria-label="結算後操作">
      <button class="round" id="toLobby" title="回海圖"><span>🗺️</span><small>海圖</small></button>
      <button class="round" id="again" title="${r.won ? '再玩一次' : '再挑戰'}"><span>↻</span><small>${r.won ? '再玩' : '重來'}</small></button>
      ${next ? `<button class="primary wide" id="nextStage">下一關 ▶<small>${esc(next.name)}</small></button>` : `<button class="primary wide" id="again2">${r.won ? '再玩一次' : '再挑戰 ↻'}</button>`}
    </div>`, r.won ? 'win' : 'lose');
  /* Result sheet has a separately scrollable body and always-visible controls. */
  $('modal').classList.add('stage-result');
  $('toLobby').onclick = leaveGame;
  $('again').onclick = () => { $('modal').close(); startGame(); };
  if ($('again2')) $('again2').onclick = $('again').onclick;
  if ($('nextStage')) $('nextStage').onclick = () => nextVoyage(idx + 1);
}
/* jump straight into another stage from the result or pause sheet */


function bindHud() {
  $('dismissBossIntro').onclick = hideBossIntro;
  initFullscreen();
  $('items').onclick = () => { if (placing) { endPlacing(); return; } const menu = $('itemMenu'); menu.hidden = !menu.hidden; if (!menu.hidden) renderItems(true); };
  bindPlacement();
  $('itemMenu').onclick = (e) => {
    const b = e.target.closest('[data-bag],[data-trap]'); if (!b || !game) return;
    if (b.dataset.trap) beginPlacing(b.dataset.trap); else useBag(b.dataset.bag);
  };
  $('speed').onclick = () => { speed = speed === 1 ? 2 : 1; hud(); };
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && placing?.type === 'egg') endPlacing();
  });
  $('pause').onclick = () => { if (pk) { openPkPause(); return; } paused = true; openPause(); hud(); };
  addEventListener('pointerdown', () => audio?.unlock?.(), {capture: true});
  addEventListener('keydown', (e) => {
    if (!game || $('modal').open) return;
    const n = '1234567'.indexOf(e.key);
    if (n >= 0 && game.hand[n]) play(game.hand[n].uid);
    else if (e.key === ' ') { e.preventDefault(); $('items').click(); }
  });
}

/* Pause sheet: background music and attack sounds, each with a volume slider and an on / off button (shared with the town's settings) */
function toggleAudioPanel(kind) {
  const panel = $('audioPanel'), B = globalThis.PhantomBgm;
  if (!panel || !B) return;
  if (!panel.hidden && panel.dataset.kind === kind) { panel.hidden = true; $('pBgm').classList.remove('on'); $('pSfx').classList.remove('on'); return; }
  panel.dataset.kind = kind; panel.hidden = false;
  $('pBgm').classList.toggle('on', kind === 'bgm'); $('pSfx').classList.toggle('on', kind === 'sfx');
  const bgm = kind === 'bgm', vol = () => (bgm ? B.volume : B.sfxVolume), muted = () => (bgm ? B.muted : B.sfxMuted);
  panel.innerHTML = `<div class="audio-row"><b>${ico(bgm ? 'music' : 'speaker')} ${bgm ? '背景音樂' : '攻擊音效'}</b>
    <input type="range" id="audioVol" min="0" max="100" step="1" value="${vol()}" aria-label="${bgm ? '背景音樂' : '攻擊音效'}音量"><output id="audioVal">${vol()}%</output>
    <button id="audioMute" class="audio-mute">${muted() ? ico('mute') + '已關閉' : ico(bgm ? 'music' : 'speaker') + '開啟中'}</button></div>`;
  const paint = () => { $('audioVal').textContent = vol() + '%'; $('audioMute').innerHTML = muted() ? ico('mute') + '已關閉' : ico(bgm ? 'music' : 'speaker') + '開啟中'; $('audioMute').classList.toggle('off', muted()); };
  $('audioVol').oninput = (e) => { if (bgm) { B.setVolume(+e.target.value); if (B.muted && +e.target.value > 0) B.setMuted(false); } else { B.setSfxVolume(+e.target.value); if (B.sfxMuted && +e.target.value > 0) B.setSfxMuted(false); } paint(); };
  $('audioMute').onclick = () => { if (bgm) B.toggle(); else B.toggleSfx(); paint(); };
  paint();
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
    <button class="wide savehome" id="saveHome">💾 存檔回初光鎮</button>
    <div class="sheet-actions">
      <button class="round" id="quit" title="放棄並回海圖"><span>🗺️</span><small>海圖</small></button>
      <button class="round" id="restart" title="重新開始這一關"><span>↻</span><small>重來</small></button>
      <button class="round" id="howto2" title="玩法說明"><span>?</span><small>說明</small></button>
      ${next ? `<button class="round" id="nextStage" title="直接玩下一關：${esc(next.name)}"><span>⏭</span><small>下一關</small></button>` : ''}
      <button class="round" id="pBgm" title="背景音樂音量"><span>${ico('music')}</span><small>音樂</small></button>
      <button class="round" id="pSfx" title="攻擊音效音量"><span>${ico('speaker')}</span><small>音效</small></button>
    </div>
    <div class="audio-panel" id="audioPanel" hidden></div>`, 'pause');
  $('resume').onclick = () => { $('modal').close(); };
  $('quit').onclick = leaveGame;
  $('saveHome').onclick = () => { saveRecord(); toast('已存檔，搭快艇回初光鎮'); sailHome(); };
  $('restart').onclick = () => { $('modal').close(); startGame(); };
  $('howto2').onclick = showHowTo;
  if ($('nextStage')) $('nextStage').onclick = () => nextVoyage(idx + 1);
  $('pBgm').onclick = () => toggleAudioPanel('bgm');
  $('pSfx').onclick = () => toggleAudioPanel('sfx');
  $('modal').onclose = () => { paused = false; if (game) hud(); };
}

/* A hidden page gets no animation frames. The room's host runs the battle for both players, so while hidden it steps
   on a timer (browsers allow about one tick a second) and keeps sending snapshots; the opponent's game never freezes. */
let hiddenAt = 0;
setInterval(() => {
  if (!document.hidden || pk?.role !== 'host' || !game?.started || game.result) { hiddenAt = 0; return; }
  const now = performance.now(), dt = hiddenAt ? Math.min(2, (now - hiddenAt) / 1000) : 0; hiddenAt = now;
  for (let i = Math.round(dt * 30); i > 0 && !game.result; i--) step(game, 1 / 30);
  pk.outbox.push(...game.events); game.events.length = 0;
  pk.send({t: 'snap', d: snapshot(game, pk.outbox)}); pk.outbox = [];
}, 500);

function loop(now) {
  requestAnimationFrame(loop);
  if (!$('loading').hidden && now - (loop.loadingUiAt || 0) > 500) {
    loop.loadingUiAt = now;
    if ($('loadingElapsed') && loadingStartedAt)
      $('loadingElapsed').textContent = '已讀取 ' +
        Math.max(0,Math.floor((performance.now() - loadingStartedAt) / 1000)) + ' 秒 · 請勿關閉頁面';
  }
  const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
  const visibleBattle = game && game.started && $('loading').hidden && $('lobby').hidden && !$('hud').hidden;
  const running = visibleBattle && !game.result && (pk ? true : !paused && !$('modal').open);
  if (running && pk?.role === 'guest') advanceMirror(game, dt);
  else if (running) {
    acc += dt * speed;
    let n = 0;
    while (acc >= 1 / 30 && n < 8) { step(game, 1 / 30); acc -= 1 / 30; n++; }
  }
  if (game && game.events.length) { handleEvents(); hud(); }
  else if (running && now - (loop.hudAt || 0) > 100) { hud(); loop.hudAt = now; }
  if (game && view) {
    /* On touch phones every battle renders near 30 FPS to save battery and heat; the rules clock
       still runs at 30 Hz, so attacks keep their real damage and timings. */
    if (LOW_POWER && !pendingDealingScene) {
      loop.renderBank = Math.min(0.1, (loop.renderBank || 0) + (running ? dt * speed : 0));
      if (now - (loop.lastRenderAt || 0) >= 32 || !running) {
        view.update(loop.renderBank); loop.renderBank = 0; loop.lastRenderAt = now;
      }
    } else {
      loop.renderBank = 0; loop.lastRenderAt = now;
      view.update(running ? dt * speed : 0);
    }
  }
  if (pendingDealingScene && pendingDealingScene === game &&
      $('loading').hidden && $('lobby').hidden && !$('hud').hidden && !$('modal').open) {
    /* First render paints the world and empty hand; the next rendered frame
       starts the first three cards. Never deal during loading or over the chart. */
    if (pk?.role === 'guest' && !pk.loadedSent && visibleSceneFrames >= 1) { pk.loadedSent = true; pk.send({t: 'loaded'}); }
    if (pk?.role === 'host' && !pk.foeLoaded) { pk.waitFrom ||= now; if (now - pk.waitFrom < 15000) { visibleSceneFrames = 0; $('banner').hidden = false; $('banner').textContent = '等待對手載入戰場…'; } }
    if (++visibleSceneFrames >= 2) {
      const launched = beginDealing(game);
      pendingDealingScene = null;
      acc = 0; last = now;
      if (launched) { handleEvents(); handSig = ''; hud(); if (!pk) showBossIntro(game.stage); else $('banner').hidden = true; }
    }
  }
  if (pk?.role === 'host' && game) {
    /* Only keep recent visual events: hand state, fighters and bases are
       authoritative in every snapshot. Cap the queue when effects spike. */
    if (game.events.length) pk.outbox.push(...game.events);
    if (pk.outbox.length > 160) pk.outbox.splice(0, pk.outbox.length - 160);
    const every = pk.ch.kind === 'firebase-relay' ? 450 : 190;
    if (now - pk.sentAt >= every) {
      pk.sentAt = now;
      pk.send({t: 'snap', d: snapshot(game, pk.outbox)});
      pk.outbox.length = 0;
    }
  }
  if (game) game.events.length = 0;
}

/* While the player looks at the chart: load the battle scripts, build the battle view and fetch the models of the deck and of the
   selected island, so pressing sortie goes straight into the fight. */
async function warmBattle() {
  try {
    await loadEngine();
    if (!view) view = createView($('world'), {spirits: data.spirits, catalog: data.catalog});
    if (!audio) audio = createCombatAudio();
    await view.preload([...record.deck, ...STAGES[record.stage].groups.map((g) => g.species)]);
  } catch (e) { console.warn(e); }
}

/* The sea chart is a live Three.js scene (sea3d.js) whose islands, pier and speedboat are GLB files (chart-models.js). They are
   loaded in parallel and pop in as they arrive; the heavy hero model (boatman and rider) is fetched last. */
async function renderChartArt() {
  const T = globalThis.THREE, H = globalThis.PhantomHarbor, kit = createToonKit(T), models = createChartModels(T, kit, {loadGltf, cloneModel});
  chart.addAnimations(models.animated);
  try { const isle = createPkIsland(T, kit); chart.setPk(isle.group); chart.addAnimations([isle.animate]); } catch (e) { console.warn(e); }
  const card = (id) => { const s = spirit(id); return {art: picture(id), frameImage: 'assets/card-frame.webp', frame: s.cardFrame || 'yellow', name: s.name, number: data.entries.get(id)?.number || '—', info: s.type + " · " + (s.rarity || "普通") + " · 第 " + (s.stage || 1) + " 階段", hp: s.hp, attack: s.attack}; };
  const tasks = [];
  STAGES.forEach((s, i) => tasks.push(models.island(s.scene, card(s.boss)).then((g) => chart.setIsland(i, g)).catch((e) => console.warn(e))));
  tasks.push(models.dock().then((g) => chart.setHome(g)).catch((e) => console.warn(e)));
  const boat = models.boat().then((g) => { chart.setBoat(g); return g; }).catch((e) => { console.warn(e); return null; });
  await Promise.all([...tasks, boat]);
  /* last: the hero model, as the boatman on the pier and as the rider at the wheel (outfit from the town wardrobe) */
  try {
    const gh = await loadGltf('models/hero.glb'), home = chart.homeGroup, boatGroup = await boat;
    const fit = (hero) => { const box = new T.Box3().setFromObject(hero), s = 2.55 / (box.max.y - box.min.y); hero.scale.setScalar(s); hero.position.y = -box.min.y * s; };
    if (home && H?.dressBoatman) {
      const hero = cloneModel(gh.scene); fit(hero); const man = new T.Group(); man.add(hero); H.dressBoatman(T, hero); kit.toonify(hero, {outline: 0.05});
      man.position.set(36.6, 0.12, 7.4); man.rotation.y = Math.PI * 0.9; home.add(man);
    }
    if (boatGroup) {
      const SEAT = {x: -0.38, y: 0.62}, hero = cloneModel(gh.scene); fit(hero);
      const seat = new T.Group(); seat.add(hero); seat.position.set(SEAT.x, SEAT.y - H.HERO_HIP, 0); seat.rotation.y = Math.PI / 2; boatGroup.add(seat);
      try { globalThis.HeroCostumes?.create(T).apply(hero, costumeFor(journey()).id); } catch (e) { console.warn(e); }
      const idle = gh.animations.find((c) => /idle/i.test(c.name)); if (idle) { const mixer = new T.AnimationMixer(hero); mixer.clipAction(idle).play(); mixer.update(0.4); }
      kit.toonify(hero, {outline: 0.025});
    }
  } catch (e) { console.warn(e); }
}

async function init() {
  initIcons();
  record = readJson(SAVE_KEY, {}) || {};
  /* Retire old persisted preference: old save games must never turn
     the removed animation back on. */
  if ('evoAnim' in record) { delete record.evoAnim; saveRecord(); }
  if (!Number.isInteger(record.stage)) record.stage = 0;
  record.cleared = record.cleared || {}; record.owned = record.owned || []; record.best = record.best || {};
  /* earlier versions kept trap cards in record.traps and supplies in the cave bag: fold them into the one island bag */
  record.bag ||= {}; if (record.traps) { for (const [k, v] of Object.entries(record.traps)) record.bag[k] = (record.bag[k] || 0) + v; delete record.traps; }
  if (!record.itemKit) { for (const [k, v] of Object.entries(STARTER_ITEMS)) if (!record.trapKit || !k.startsWith('trap-')) record.bag[k] = (record.bag[k] || 0) + v; record.itemKit = true; }
  const fromTown = new URLSearchParams(location.search).has('fromTown');
  /* the town's speedboat handoff card gives way to this page's own speedboat loader */
  globalThis.PhantomTransition?.finish?.();
  if (fromTown || !Number.isInteger(record.boatAt)) record.boatAt = -1;
  $('loadingBar').style.width = '30%';
  try { await loadThree(); data = await loadData(); } catch (e) { toast(e.message); $('loading').hidden = true; return; }
  $('loadingBar').style.width = '100%';
  bindLobby(); bindHud(); bindHand(); renderLobby();
  /* the battle assets wait for the chart's models, and are skipped on a data-saving connection */
  renderChartArt().catch((e) => console.warn(e)).finally(() => { if (!navigator.connection?.saveData) warmBattle(); });
  /* the battle scripts load quietly in the background while the player looks at the chart */
  /* the boat loader stays a moment so the voyage reads, then the speedboat sails from the town pier to the island */
  setTimeout(async () => {
    $('loading').hidden = true;
    if (record.boatAt !== record.stage) await sailTo(record.stage);
    if (!record.starterClaimed || new URLSearchParams(location.search).get('open') === 'gacha') openGacha();
  }, fromTown ? 1300 : 300);
  globalThis.PhantomBgm?.setScene?.(THEME_SCENE);
  requestAnimationFrame(loop);
  globalThis.PhantomDefense = {get game() { return game; }, get view() { return view; }, startGame, leaveGame, showBossIntro, prepareBossPortrait, elementMultiplier, isSupport};
}
init();
