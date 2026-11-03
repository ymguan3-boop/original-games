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
  assert.match(css, /orientation: landscape\) and \(max-height: 520px\) \{\s*#lobby \.sea-wrap \{ right: min\(300px, 40vw\); \}/, 'landscape: the sortie panel has its own column');
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
  assert.ok(game.includes("function sailToDefense(open=''){if(battle||throwing||enterBusy||!harbor||harbor.sailing)return;if(riding()||S.state.mountActive){S.state.mountActive=null;overworldMount?.setMount(null);"));
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
  assert.ok(main.includes('useBagItem(game, id)') && main.includes('beginPlacing') && main.includes('view?.pickRoad'));
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
  assert.ok(main.includes('await loadThree()') && !main.includes('try { await loadEngine(); data'), 'the chart no longer waits for the battle scripts');
});
