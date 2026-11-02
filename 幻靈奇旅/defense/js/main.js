/* 幻靈守護戰: island sea chart, summons, dealt hand (七大罪 style merging), HUD and game loop. Reads the town save
   (wardrobe outfit, original unlocks) read-only; gacha points and bag items go through the shared cave ledger
   (PhantomCaveBridge); its own records (summoned spirits, deck, cleared islands, boat position) live in
   phantom-defense-v1. */
import {STAGES, SHAPES, ELEMENTS, ELEMENT_EFFECTS, SUPPORT, ITEMS, DECK_SIZE, DECK_BASE, DECK_RED, HAND_SIZE, ULT_CD, DEAL_EVERY, passiveLines, ultCooldown, TRAPS, killPoints, isBaseCard, isRedCard, profileFor, isSupport, createGame, step, playCard, moveCard, canPlay, useItem, itemReady, elementMultiplier} from './rules.js';
import {loadEngine} from './actors.js';
import {createView} from './view.js';
import {createIslandMap} from './islands.js';
import {defensePool, starterRewards, drawWithStore, DRAW_COST, STARTER_COUNT} from './gacha.js';
import {buildPath} from './stages.js';
import {createStore, initialState} from '../../survivors/js/save-bridge.js';
import {costumeFor} from '../../survivors/js/costume-effects.js';
import {ITEMS as CAVE_ITEMS} from '../../survivors/js/inventory.js';
import {createCombatAudio} from '../../survivors/js/combat-audio-v17.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'phantom-defense-v1';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let data, record, view, audio, game = null, speed = 1, paused = false, last = 0, acc = 0, lastImpact = 0;
/* merged cards that are playing their evolution in their own frame: uid -> {from, to, start} */
const evolvingCards = new Map(), EVO_TIME = 2.4;

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
function saveRecord() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(record)); } catch {} }
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2200); }
function picture(id) { const a = data.art[id]; return '../' + (a?.image || 'portraits/' + id + '.png'); }
function spirit(id) { return data.spiritMap.get(id); }
function shapeLabel(id, strong) { return SHAPES[profileFor(spirit(id), data.entries.get(id), strong).type].label; }

async function loadData() {
  const get = (p) => fetch(new URL('../' + p, location.href)).then((r) => { if (!r.ok) throw Error('讀取失敗：' + p); return r.json(); });
  const [spirits, art, catalog, evolution, pool] = await Promise.all([get('data/spirits.json'), get('data/card-art.json'), get('data/spirit-catalog.json'), get('survivors/data/evolution.json'), get('survivors/data/gacha-pool.json')]);
  return {spirits, art, catalog, evolution, pool, excluded: pool.excludedIds || [], spiritMap: new Map(spirits.map((s) => [s.id, s])), entries: new Map((catalog.entries || []).map((e) => [e.id, e]))};
}

/* The main game's dex card (css/collection-card.css + assets/cards/frame.png). */
function cardHtml(id, {line} = {}) {
  const s = spirit(id), number = data.entries.get(id)?.number || '—';
  const info = line || `${esc(s.type)} · ${esc(s.rarity || '普通')} · 第 ${s.stage || 1} 階段`;
  return `<article class="collectionCard" data-frame="${s.cardFrame || 'yellow'}"><span class="collectionNumber">No.${number}</span><img class="collectionArt" src="${picture(id)}" alt="${esc(s.name)}" decoding="async"><img class="collectionFrame" src="../assets/cards/frame.png" alt="" decoding="async"><h3 class="collectionName">${esc(s.name)}</h3><div class="collectionInfo"><div class="collectionType">${info}</div><div class="collectionStats"><span>HP ${s.hp}</span><span>攻擊 ${s.attack}</span></div></div></article>`;
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
  const line = sup ? `技能：${esc(sup.skill)}` : `${esc(spirit(id).type)} · ${shapeLabel(id, false)}`;
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
    <div class="isle-title"><small>第 ${i + 1} 島</small><h2>${esc(s.name)}</h2>${record.cleared[s.id] ? `<span class="cleared-tag">已通關 ${'★'.repeat(best)}<em>可重複挑戰</em></span>` : ''}</div>
    <div class="isle-boss"><img src="${picture(s.boss)}" alt=""><div><small>${i < 5 ? '小魔王' : '大魔王'}・坐鎮酒桶</small><b>${esc(boss.name)}</b><span class="el el-${boss.type}">${boss.type}</span></div></div>
    <div class="isle-facts"><span>🛤️ 路線 ${route}</span><span>${uniq.length ? '⚠️ ' + uniq.join('、') : '🌿 無陷阱'}</span><span>🎟️ 擊倒 +${killPoints(i)}・魔王 +${killPoints(i, true)}</span></div>
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
async function sailHome() {
  if (chart.sailing) return;
  await chart.sail(chart.boatAt, -1);
  record.boatAt = -1; saveRecord();
  if (globalThis.PhantomTransition) PhantomTransition.navigate('../?fromDock=1', '搭快艇返回初光鎮'); else location.href = '../';
}

function bindLobby() {
  chart = createIslandMap($('seaChart'), {stages: STAGES, esc, onPick: (i) => pickIsle(i)});
  $('islePanel').onclick = (e) => {
    if (e.target.closest('#start')) beginStage();
    else if (e.target.closest('[data-open="deck"]')) openDeck();
    else if (e.target.closest('[data-open="gacha"]')) openGacha();
  };
  $('gachaBtn').onclick = () => openGacha();
  $('deckBtn').onclick = openDeck;
  $('howto').onclick = showHowTo;
  $('homeBtn').onclick = sailHome;
}

/* deck editor: base spirits and red support cards from the summoned collection */
function openDeck() {
  normalizeDeck();
  const units = availableUnits(), nb = deckBase().length, nr = deckRed().length;
  openModal(`${ribbon('出擊卡組', '🃏')}
    <p class="result-sub">基礎幻靈 ${nb}/${DECK_BASE}・紅卡輔助 ${nr}/${DECK_RED}（點選切換；幻靈由轉蛋取得）</p>
    <div class="panel-scroll"><h3 class="roster-group">基礎幻靈 <small>黃卡、紫卡的未進階幻靈與三色蛋</small></h3><div class="roster">${units.base.map(unitButton).join('') || '<p class="muted">還沒有基礎幻靈，先去轉蛋吧！</p>'}</div>
    <h3 class="roster-group">紅卡輔助 <small>點擊施放技能，合成升星</small></h3><div class="roster">${units.red.map(unitButton).join('') || '<p class="muted">紅卡可由轉蛋取得（需先在原探索收錄）。</p>'}</div></div>
    <div class="modal-actions center"><button class="tool" id="deckGacha">🎰 去轉蛋</button><button class="primary big" data-close>完成</button></div>`, 'howto');
  $('deckGacha').onclick = () => openGacha();
  $('modalBody').querySelectorAll('[data-unit]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.unit, k = record.deck.indexOf(id), red = isRedCard(id);
    if (k >= 0) record.deck.splice(k, 1);
    else if (red && deckRed().length >= DECK_RED) record.deck.splice(record.deck.indexOf(deckRed()[0]), 1, id);
    else if (!red && deckBase().length >= DECK_BASE) record.deck.splice(record.deck.indexOf(deckBase()[0]), 1, id);
    else record.deck.push(id);
    saveRecord(); renderIslePanel(); openDeck();
  }));
}

/* summons: free starter (4 yellow), then single / ten draws paid with the shared cave points */
const ITEM_ICON = {heal: '🧪', revive: '💊', battery: '🔋', ball: '🔮', buff: '✨', 'pet-xp': '💎', vacuum: '🌀'};
function rewardCard(r, k) {
  if (r.kind === 'spirit') return `<div class="g-reward spirit frame-${r.color} ${r.duplicate ? 'dup' : 'new'}" style="--d:${k * 0.09}s"><img src="${picture(r.id)}" alt=""><b>${esc(spirit(r.id).name)}</b><small>${r.duplicate ? `重複・退 ${r.refund} 點` : 'NEW!'}</small></div>`;
  const it = CAVE_ITEMS[r.id] || {name: r.id};
  return `<div class="g-reward item" style="--d:${k * 0.09}s"><i>${ITEM_ICON[it.kind] || '🎁'}</i><b>${esc(it.name)}</b><small>×${r.quantity || 1}・洞穴背包</small></div>`;
}
function openGacha(results = null) {
  const pts = points(), first = !record.starterClaimed, pool = gachaPool();
  openModal(`${ribbon('幻靈轉蛋', '🎰')}
    <div class="gacha-machine ${results ? 'spun' : ''}" aria-hidden="true"><div class="dome"><i></i><i></i><i></i><i></i><i></i></div><div class="body"><span>${first ? 'FREE' : DRAW_COST}</span></div></div>
    <p class="gacha-points">🎟️ 轉蛋點數 <b>${pts.toLocaleString()}</b><small>與無盡洞穴共用・擊倒魔物獲得</small></p>
    ${results ? `<div class="gacha-results">${results.map(rewardCard).join('')}</div>` : ''}
    ${first ? `<button class="primary wide" id="gStarter">🎁 新手轉蛋（免費）・保底 ${STARTER_COUNT} 隻黃卡幻靈</button>`
      : `<div class="sheet-actions"><button class="primary wide" id="g1" ${pts < DRAW_COST ? 'disabled' : ''}>單抽<small>${DRAW_COST} 點</small></button><button class="primary wide" id="g10" ${pts < DRAW_COST * 10 ? 'disabled' : ''}>十連<small>${DRAW_COST * 10} 點</small></button></div>`}
    <p class="muted gacha-note">機率：幻靈 10%（黃卡 6%・紫卡 3%・紅卡 1%）・道具與增幅 90%（放進無盡洞穴背包）。基礎幻靈範圍與無盡洞穴轉蛋相同，紫卡、紅卡需先在原探索收錄；重複的幻靈會退還點數。目前可抽：黃 ${pool.yellow.length}・紫 ${pool.purple.length}・紅 ${pool.red.length}</p>
    <div class="modal-actions center"><button data-close>關閉</button></div>`, 'howto');
  if ($('gStarter')) $('gStarter').onclick = () => {
    const r = starterRewards(gachaPool());
    record.owned = [...new Set([...(record.owned || []), ...r.map((x) => x.id)])]; record.starterClaimed = true; saveRecord();
    renderLobby(); openGacha(r);
  };
  const draw = (n) => {
    try {
      const rewards = drawWithStore(caveStore(), gachaPool(), record.owned || [], n).value;
      record.owned ||= [];
      for (const r of rewards) if (r.kind === 'spirit' && !record.owned.includes(r.id)) record.owned.push(r.id);
      saveRecord(); renderLobby(); openGacha(rewards);
    } catch (e) { toast(e.message); }
  };
  if ($('g1')) $('g1').onclick = () => draw(1);
  if ($('g10')) $('g10').onclick = () => draw(10);
}

function showHowTo() {
  const rows = ELEMENTS.map((el) => `<tr><td><span class="el el-${el}">${el}</span></td><td>${ELEMENT_EFFECTS[el].label}</td><td>剋 <span class="el el-${ELEMENTS[(ELEMENTS.indexOf(el) + 1) % 6]}">${ELEMENTS[(ELEMENTS.indexOf(el) + 1) % 6]}</span></td></tr>`).join('');
  const sup = Object.entries(SUPPORT).map(([id, s]) => `<li><b>${esc(spirit(id).name)}・${esc(s.skill)}</b>：${esc(s.text)}${s.duration ? `（${s.duration.join('／')} 秒）` : ''}</li>`).join('');
  const tip = (icon, title, body) => `<section class="tip"><div class="tip-icon">${icon}</div><div><h3>${title}</h3>${body}</div></section>`;
  openModal(`${ribbon('玩法說明', '📖')}
    <div class="panel-scroll">
    ${tip('🪣', '守住基地，攻破巢穴', `<p>主角坐在右邊基地的酒桶上。從這裡派出幻靈，沿著小路打爆另一端<b>魔王坐鎮的巢穴</b>就過關；巢穴第一次被打到時，魔王會親自下場！</p>`)}
    ${tip('🏝️', '群島航線', `<p>每座小島是一關，島與島之間有航道。點島嶼，快艇會沿航道開過去；過關後按「下一關」，會回到海圖從這座島開往下一座島。通關的島可以重複挑戰。</p>`)}
    ${tip('🎰', '轉蛋與點數', `<p>擊倒魔物可得轉蛋點數（和無盡洞穴共用）。第一次轉蛋免費，保底 4 隻黃卡幻靈；之後每抽 ${DRAW_COST} 點，幻靈機率 10%，其餘是放進洞穴背包的道具。主角的服裝跟初光鎮衣櫃同步。</p>`)}
    ${tip('🃏', '發牌與派出', `<p>每 ${DEAL_EVERY} 秒發一張牌（手牌最多 ${HAND_SIZE} 張），擊倒魔物發得更快。點卡片派出幻靈，卡片可以自由拖曳排列（拖曳時發牌會暫停）。</p>`)}
    ${tip('✨', '相鄰合成升星', `<p>兩張一樣的卡相鄰就會合成：1 階＋1 階→2 階、2 階＋2 階→3 階，進化動畫在卡片裡播放、不會中斷戰鬥。合成會連鎖！</p>`)}
    ${tip('🔮', '輔助技能卡', `<p>紅卡傳說幻靈點了直接施放技能，升星後更強：</p><ul class="mini">${sup}</ul>`)}
    ${tip('⚔️', '大絕與暴擊', `<p>每位幻靈都有自己的洞穴原版<b>大絕</b>，冷卻約 ${ULT_CD.yellow}～${ULT_CD.red} 秒（頭上的金色細條集滿就會施放）；也都帶著洞穴的<b>被動能力</b>。任何攻擊都有機會<b>暴擊</b>（金色數字）。<b>長按卡片</b>可以看攻擊、大絕、被動與效果說明。</p>`)}
    ${tip('⚠️', '路上陷阱', `<p>泥沼、漩渦會讓腳步變慢，符文陣讓防禦變弱，毒蘑菇會中毒；尖刺、電擊板、間歇泉亮起紅圈後就會發動——敵我都會中招！</p>`)}
    ${tip('🎒', '道具', `<p>${Object.values(ITEMS).map((it) => `<span class="chip">${it.icon} ${it.name}<small>${it.cooldown} 秒</small></span>`).join('')}</p>`)}
    <section class="tip"><div class="tip-icon">🔥</div><div><h3>屬性相剋</h3><table class="counter-table">${rows}</table><p class="muted">光＞焰＞森＞潮＞雷＞念＞光，剋制時傷害 ×1.5（橘色數字），被剋 ×0.75。</p></div></section>
    </div>
    <div class="modal-actions center"><button class="primary big" data-close>知道了！</button></div>`, 'howto');
}

function openModal(html, kind = 'info') {
  $('modalBody').innerHTML = html; const m = $('modal'); m.className = 'panel panel-' + kind;
  if (!m.open) m.showModal(); m.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => m.close()));
}
const ribbon = (text, icon = '') => `<div class="ribbon"><span>${icon ? `<i>${icon}</i>` : ''}${text}</span></div>`;

/* ---------- battle ---------- */
async function startGame() {
  $('loading').hidden = false; $('loadingText').textContent = '正在準備戰場…'; $('loadingBar').style.width = '15%';
  try {
    await loadEngine();
    if (!view) view = createView($('world'), {spirits: data.spirits, catalog: data.catalog});
    if (!audio) audio = createCombatAudio();
    view.costume = costumeFor(journey()).id;
    game = createGame({stageIndex: record.stage, deck: record.deck, spirits: data.spirits, catalog: data.catalog, evolution: data.evolution, hooks: {fire: (f, target, strong) => view.fire(f, target, strong)}});
    game.runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    view.setGame(game);
    $('loadingBar').style.width = '40%'; $('loadingText').textContent = '幻靈們正在集合…';
    await Promise.race([view.preload([...record.deck, ...game.stage.groups.map((g) => g.species)]), new Promise((r) => setTimeout(r, 9000))]);
    $('loadingBar').style.width = '100%';
  } catch (e) { console.error(e); toast(e.message); $('loading').hidden = true; return; }
  $('loading').hidden = true; $('lobby').hidden = true; $('hud').hidden = false;
  speed = 1; paused = false; handSig = '';
  $('stageName').textContent = `${record.stage + 1}. ${game.stage.name}`;
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
    const line = sup ? `技能：${esc(sup.skill)}` : `${esc(spirit(c.species).type)} · ${shapeLabel(c.species, false)}`;
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
  const s = spirit(card.species), sup = SUPPORT[card.species], el = s.type, i = ELEMENTS.indexOf(el);
  const beats = ELEMENTS[(i + 1) % 6], weak = ELEMENTS[(i + 5) % 6], rider = ELEMENT_EFFECTS[el];
  const row = (tag, title, body) => `<div class="ci-row"><span class="ci-tag ${tag}">${title}</span><div>${body}</div></div>`;
  const passives = passiveLines(s);
  const rows = sup
    ? row('t-skill', '技能', `<b>${esc(sup.skill)}</b>　${esc(sup.text)}${sup.duration ? `<br><small>持續 ${sup.duration.join('／')} 秒（★1／★2／★3），目前 ★${card.rank}</small>` : `<br><small>星數越高越強，目前 ★${card.rank}</small>`}`)
    : row('t-atk', '攻擊', `<b>${esc(s.skills?.[0]?.name || '普通攻擊')}</b>　${shapeLabel(card.species, false)}・${el}屬性　攻擊 ${s.attack}${rider ? `<br><small>命中附加「${rider.label}」</small>` : ''}`)
      + row('t-ult', '大絕', `<b>${esc(s.skills?.[1]?.name || '大絕')}</b>　${shapeLabel(card.species, true)}・傷害 ×3<br><small>冷卻 ${+ultCooldown(s).toFixed(1)} 秒，金色細條集滿時自動施放</small>`)
      + row('t-pas', '被動', passives.length ? passives.map(esc).join('<br>') : '無被動能力');
  return `<div class="ci-head" data-frame="${s.cardFrame || 'yellow'}"><img src="${picture(card.species)}" alt=""><div><b>${esc(s.name)}</b><span class="stars-${s.cardFrame || 'yellow'}">${'<i>★</i>'.repeat(card.rank)}</span><small>${esc(s.rarity || '普通')}・第 ${s.stage || 1} 階段${card.rank > 1 && !sup ? `・能力 +${(card.rank - 1) * 50}%` : ''}</small></div></div>`
    + rows + row('t-eff', '效果', `<span class="el el-${el}">${el}</span> 剋 <span class="el el-${beats}">${beats}</span>（傷害 ×1.5）・被 <span class="el el-${weak}">${weak}</span> 剋（×0.75）`);
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
  const running = game && !game.result && !paused && !$('modal').open;
  if (running) {
    acc += dt * speed;
    let n = 0;
    while (acc >= 1 / 30 && n < 8) { step(game, 1 / 30); acc -= 1 / 30; n++; }
  }
  if (game && game.events.length) { handleEvents(); hud(); }
  else if (running && now - (loop.hudAt || 0) > 100) { hud(); loop.hudAt = now; }
  view?.update(running ? dt * speed : 0);
  if (game) game.events.length = 0;
}

async function init() {
  record = readJson(SAVE_KEY, {}) || {};
  if (!Number.isInteger(record.stage)) record.stage = 0;
  record.cleared = record.cleared || {}; record.owned = record.owned || []; record.best = record.best || {};
  const fromTown = new URLSearchParams(location.search).has('fromTown');
  if (fromTown || !Number.isInteger(record.boatAt)) record.boatAt = -1;
  $('loadingBar').style.width = '30%';
  try { data = await loadData(); } catch (e) { toast(e.message); $('loading').hidden = true; return; }
  $('loadingBar').style.width = '100%';
  bindLobby(); bindHud(); bindHand(); renderLobby();
  /* the boat loader stays a moment so the voyage reads, then the speedboat sails from the town pier to the island */
  setTimeout(async () => {
    $('loading').hidden = true;
    if (record.boatAt !== record.stage) await sailTo(record.stage);
    if (!record.starterClaimed) openGacha();
  }, fromTown ? 1300 : 300);
  globalThis.PhantomBgm?.setScene?.('general');
  requestAnimationFrame(loop);
  globalThis.PhantomDefense = {get game() { return game; }, get view() { return view; }, startGame, leaveGame, elementMultiplier, isSupport};
}
init();
