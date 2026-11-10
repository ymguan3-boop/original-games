import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('the sea chart is one live 3D scene: the old 2D SVG chart is gone', () => {
  assert.ok(!existsSync(new URL('../js/islands.js', import.meta.url)), 'js/islands.js (2D chart) is deleted');
  const main = read('../js/main.js'), sea = read('../js/sea3d.js'), css = read('../css/defense.css');
  assert.ok(main.includes('createSeaChart') && !main.includes('createIslandMap') && !main.includes('setIslandArt'));
  assert.ok(sea.includes('ShaderMaterial') && sea.includes('uTime'), 'animated Three.js ocean');
  assert.ok(sea.includes("'wheel'") && sea.includes('pinch') && sea.includes("data-z=\"in\""), 'wheel, pinch and +/- buttons zoom the chart');
  assert.ok(sea.includes("mode: e.button === 2 || e.shiftKey ? 'orbit' : 'pan'"), 'drag pans, right-drag turns');
  assert.match(css, /orientation: landscape\) and \(max-height: 560px\) \{\s*#lobby \.sea-wrap \{ right: min\(300px, 40vw\); \}/, 'landscape: the sortie panel has its own column');
});

test('island cards are larger and turn toward the viewer; the dock has no white square', () => {
  const b = read('../js/islands3d.js'), c = read('../js/island-cards.js');
  assert.ok(c.includes('w = 1.38, h = 1.93') && c.includes('billboard = true'));
  assert.ok(!b.includes('PlaneGeometry(36, 30)'), 'the pale rectangular shallow-water plane under the pier is removed');
});

test('the theme song is the defense BGM and the pause sheet can save and go home', () => {
  const main = read('../js/main.js'), bgm = read('../../js/shared-bgm.js');
  assert.match(main, /const THEME_SCENE = 'theme'/);
  assert.ok(bgm.includes("theme:'theme.mp3'") && existsSync(new URL('../../assets/audio/theme.mp3', import.meta.url)));
  assert.ok(main.includes('id="saveHome"') && main.includes("$('saveHome').onclick = () => { saveRecord(); toast('已存檔，搭快艇回初光鎮'); sailHome(); }"));
});

test('boarding the speedboat first gets off the bicycle or deer', () => {
  const game = read('../../js/game.js');
  assert.ok(game.includes("function sailToDefense(open=''){if(battle||throwing||enterBusy||!harbor||harbor.sailing)return;S.state.boatmanRushDone=true;if(riding()||S.state.mountActive){S.state.mountActive=null;overworldMount?.setMount(null);"));
});

test('hero and boss health bars only show for a moment after a hit; weather is painted once and never drifts', () => {
  const view = read('../js/view.js'), sky = read('../js/seascape.js');
  assert.ok(view.includes('HIT_BAR_SECONDS') && view.includes('b.userData.bar.visible = clock < (b.userData.barUntil || 0)'));
  assert.ok(view.includes('rec.bar.visible = f.boss ? clock < (rec.barUntil || 0)'));
  assert.ok(!sky.includes('Math.random()') || !sky.slice(sky.indexOf('function paintSky'), sky.indexOf('export function createSeascape')).includes('Math.random()'), 'the sky is seeded');
  assert.ok(!/skyTex\.offset\.x\s*=/.test(sky.slice(sky.indexOf('function update'))), 'the sky no longer drifts');
});

test('items are gacha supplies and trap cards with counts; the road has no built-in obstacles', () => {
  const main = read('../js/main.js'), css = read('../css/defense.css');
  assert.ok(main.includes("useBagItem(game, id, 'ally')") && main.includes('beginPlacing') && main.includes('view?.pickRoad'));
  assert.ok(!main.includes('useItem(game, b.dataset.item)'), 'the old unlimited cooldown items are not offered');
  assert.match(css, /#hud \.hud-top \.stat\.deal[\s\S]*?height: 40px/, 'the deal meter has the same height as the other top buttons');
});

test('islands, pier and speedboat are loaded from GLB files, not built with code at run time', () => {
  const main = read('../js/main.js'), models = read('../js/chart-models.js');
  for (const id of ['meadow', 'pond', 'waterfall', 'orchard', 'forge', 'desert', 'observatory', 'night', 'tower', 'abyss']) {
    const file = new URL('../models/island-' + id + '.glb', import.meta.url);
    assert.ok(existsSync(file), id + ' island GLB'); assert.equal(readFileSync(file).subarray(0, 4).toString(), 'glTF');
  }
  for (const f of ['dock.glb', 'speedboat.glb']) assert.equal(readFileSync(new URL('../models/' + f, import.meta.url)).subarray(0, 4).toString(), 'glTF');
  assert.ok(models.includes("'defense/models/' + file") && main.includes('createChartModels') && !main.includes('createIslandBuilder') && !main.includes('makeDock'));
  assert.ok(existsSync(new URL('../assets/card-frame.webp', import.meta.url)) && main.includes("frameImage: 'assets/card-frame.webp'"), 'a small card frame replaces the 1.7 MB png');
  assert.ok(main.includes('Promise.all([loadThree(), loadData()])') && !main.includes('try { await loadEngine(); data'), 'the chart no longer waits for the battle scripts');
});

test('gacha gives this mode own items; the panel, boatman and landscape sortie panel are slim; sortie does not wait for a voyage', () => {
  const main = read('../js/main.js'), gacha = read('../js/gacha.js'), css = read('../css/defense.css');
  assert.ok(!gacha.includes('REWARD_ITEMS') && !gacha.includes('addInventory'), 'no cave skills, weapons or cave-bag items');
  assert.ok(main.includes('class="dg-machine"'), 'own gacha layout with the machine picture');
  assert.ok(main.includes('const filmRewards'), 'the summon film still plays for this mode');
  assert.ok(main.includes('chart.snap(record.stage)') && !main.includes('await sailTo(record.stage);' + String.fromCharCode(10) + '  startGame'), 'sortie starts at once');
  assert.ok(main.includes('async function warmBattle') && main.includes('if (game && view && !document.hidden) {'), 'battle scripts and models are warmed; the battle view is idle in the lobby');
  assert.ok(main.includes('class="bm-line">要去哪裡？'), 'short boatman dialog');
  assert.ok(css.includes('#lobby .isle-panel { width: min(200px, 29vw)'));
});

test('the deck sheet shows a card\'s attack, ultimate and passives; boarding the boat puts the weapon away', () => {
  const main = read('../js/main.js'), game = read('../../js/game.js'), css = read('../css/defense.css');
  assert.ok(main.includes('id="flipLayer"') && main.includes('cardBackHtml(id)') && main.includes('加入出戰卡組'));
  assert.ok(!main.includes("$('modalBody').querySelectorAll('[data-unit]').forEach((b) => (b.onclick = () => {\n    const id = b.dataset.unit, k"), 'a tap no longer toggles the deck directly');
  assert.ok(css.includes('.flip-card.flipped'));
  assert.ok(game.includes('&&!riding()&&!harbor?.sailing'), 'the scythe is disabled while the hero boards and sails');
});

test('one icon style: every emoji in the interface becomes a warm line icon, and buttons are cream wooden text buttons', () => {
  const main = read('../js/main.js'), icons = read('../js/ui-icons.js'), css = read('../css/defense.css');
  assert.ok(main.includes('initIcons();'));
  assert.ok(icons.includes('MutationObserver') && icons.includes('stroke: currentColor') === false);
  for (const e of ['🎟️', '🎰', '🃏', '📖', '⛵', '🚤', '🎥', '🎒', '⛶', '⚔️', '🛡️', '🌦️', '⛈️', '🟤', '🧪', '🔒', '🚩', '❚❚']) assert.ok(icons.includes("'" + e + "'"), e + ' has an icon');
  assert.ok(css.includes('.ico svg { width: 100%; height: 100%; fill: none; stroke: currentColor'));
  assert.ok(css.includes('Country-style buttons') && css.includes('border: 3px solid #7a4a24'));
  assert.ok(main.includes('class="flip-card"') && main.includes("card.classList.add('flipped')"), 'the tapped deck card flips to its back');
});

test('card back lists the star 1/2/3 effects; icons use a neutral tag so no span rule can distort them', () => {
  const main = read('../js/main.js'), icons = read('../js/ui-icons.js');
  assert.ok(main.includes('function cardBackHtml(id)') && main.includes('class="star-sec"') && !main.includes("'提醒'"));
  assert.ok(icons.includes('<x-ico class="ico"') && !icons.includes('<span class="ico"'), 'the icon is not a span');
  assert.ok(read('../tools/audit-centering.js').includes('auditCentering'), 'the centring audit is kept for later screens');
});

test('landscape phones: the islands keep the left side, buttons and the sortie panel share a slim right column', () => {
  const css = read('../css/defense.css');
  const i = css.lastIndexOf('Phones held sideways'), block = css.slice(i);
  assert.ok(i > 0 && block.includes('(orientation: landscape) and (max-height: 560px)'));
  assert.ok(block.includes('#lobby .sea-wrap { position: absolute; inset: 0 calc(var(--side)'), 'the sea stops before the right column');
  assert.ok(block.includes('#lobby .isle-panel { position: absolute; top: auto; left: auto; right:'), 'the panel no longer stretches across from the left');
  assert.ok(block.includes('#lobby .chart-tools { position: absolute;'), 'the buttons sit above the panel, not over the islands');
});

test('landscape sortie panel shows the deck spirits in its own row of the right column', () => {
  const css = read('../css/defense.css'), i = css.lastIndexOf('the sortie panel also shows the deck'), block = css.slice(i);
  assert.ok(i > 0 && block.includes('"strip strip"') && block.includes('#lobby .isle-deck { display: contents; }'));
  assert.ok(block.includes('grid-template-columns: repeat(6, minmax(0, 1fr))'), 'six deck slots in one row');
});

test('HUD labels (stage, deal meter, points), island names and toasts use the same country style as the buttons', () => {
  const css = read('../css/defense.css'), i = css.lastIndexOf('Country style for every HUD and chart label'), block = css.slice(i);
  assert.ok(i > 0 && block.includes('#hud .hud-top .stat, .isle-tag, .toast {') && block.includes('border: 3px solid #7a4a24'));
  assert.ok(block.includes('#hud .hud-top .stat.deal i { display: block; width: 64px; height: 12px;'), 'the deal meter is a bar, not a dial');
  assert.ok(css.includes('#lobby .chart-tools button.tool { white-space: nowrap;'), 'portrait chart buttons keep their words on one line');
});

test('the pause sheet has music and attack-sound shortcuts in the same round buttons, with a volume slider and on/off', () => {
  const main = read('../js/main.js'), css = read('../css/defense.css');
  assert.ok(main.includes('id="pBgm"') && main.includes('id="pSfx"') && main.includes('function toggleAudioPanel(kind)'));
  assert.ok(main.includes('B.setVolume(') && main.includes('B.setSfxVolume(') && main.includes('B.toggleSfx()'), 'uses the shared town audio settings');
  assert.ok(css.includes('.audio-panel {') && css.includes('#modal button.round.on'));
});

test('town: the old boatman rushes over near the pier and talks the hero onto the speedboat, only until the first voyage', () => {
  const game = read('../../js/game.js');
  assert.ok(game.includes('function tickBoatmanRush(dt)') && game.includes('tickLabEvent(dt);tickBoatmanRush(dt);'));
  assert.ok(game.includes("if((S.state?.boatmanRushDone&&!rushForced)||!harbor||!hero)return;") && game.includes("localStorage.getItem('phantom-defense-v1')"), 'never again after the islands were visited');
  assert.ok(game.includes("if(action==='rush_go'){S.state.boatmanRushDone=true;save();closeDialog();boatmanRush=null;return sailToDefense();}"), 'the last line boards the boat');
  assert.ok(game.includes('S.state.boatmanRushDone=true;') && /BOATMAN_RUSH_LINES=\[[\s\S]{200,}\]/.test(game), 'a short funny script');
});

test('resetting the game also clears the islands save, so the boatman invites the hero again', () => {
  const game = read('../../js/game.js');
  assert.ok(game.includes("function resetGame(){localStorage.removeItem('phantom-starspire-tower-v1');localStorage.removeItem('phantom-defense-v1');"));
});
