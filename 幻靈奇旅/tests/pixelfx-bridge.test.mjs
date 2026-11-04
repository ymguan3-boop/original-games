import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require = createRequire(import.meta.url);
const PixelFX = require('../js/fx/pixelfx-bridge.js');
const map = JSON.parse(readFileSync(new URL('../js/fx/pixelfx-map.json', import.meta.url), 'utf8'));
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const stripped = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('species rules win over element rules, so signature moves are not flattened', () => {
  const ids = (ev) => PixelFX.resolve(map, ev).fx.map((f) => f.id);
  assert.ok(ids({mode: 'arena', event: 'impact', speciesId: 'raichu', strong: true, element: '雷'}).includes('melee/double-slash'));
  assert.ok(ids({mode: 'arena', event: 'impact', speciesId: 'kyogre', element: '潮'}).includes('water/ripples'));
  assert.ok(ids({mode: 'arena', event: 'impact', family: 'guanpang', element: '光'}).includes('melee/scythe-reap'));
  assert.ok(ids({mode: 'arena', event: 'impact', family: 'pepper-chick', strong: true, element: '焰'}).includes('fire/fireball'));
  assert.ok(ids({mode: 'arena', event: 'impact', element: '焰', strong: true}).includes('impacts/hit-spark'));
  assert.equal(PixelFX.familyOf('models/spirits/pepper-chick-2.glb'), 'pepper-chick');
});

test('first match wins and disabled rules never resolve', () => {
  assert.equal(PixelFX.resolve(map, {mode: 'commerce', event: 'sale'}), null);
  assert.equal(PixelFX.resolve(map, {mode: 'nope', event: 'x'}), null);
  assert.ok(PixelFX.ruleMatches({status: ['burn']}, {status: 'burn'}));
  assert.ok(!PixelFX.ruleMatches({status: ['burn']}, {status: 'stun'}));
  assert.ok(PixelFX.ruleMatches({skill: '迴旋'}, {skill: '迴旋葉風'}));
});

test('future effects are excluded from preload lists', () => {
  assert.ok(!PixelFX.idsForMode(map, 'commerce').includes('pickups/crystal-shard'));
  assert.ok(PixelFX.idsForMode(map, 'commerce', true).includes('pickups/crystal-shard'));
});

test('the bridge reads and writes no gameplay, weather, sky, fog or exposure', () => {
  const code = stripped(src('js/fx/pixelfx-bridge.js'));
  for (const bad of ['scene.background', 'setClearColor', 'toneMappingExposure', 'scene.fog', '.hp', 'localStorage.setItem', 'state.']) assert.ok(!code.includes(bad), bad);
});

test('phone tier halves instances and memory, and every fx is pooled', () => {
  assert.ok(PixelFX.LIMITS.low.instances <= PixelFX.LIMITS.high.instances / 2);
  assert.ok(PixelFX.LIMITS.low.memory < PixelFX.LIMITS.high.memory);
  const code = src('js/fx/pixelfx-bridge.js');
  assert.match(code, /let m=free\.pop\(\)/); assert.match(code, /free\.push\(a\.mesh\)/);
  assert.ok(!/new T\.CanvasTexture/.test(code) && !/new T\.Geometry/.test(code));
  assert.equal((code.match(/new T\.PlaneGeometry/g) || []).length, 1, 'one shared quad');
});

test('fallback: disabled switch and unknown data report ok:false so legacy fx still plays', () => {
  const fx = PixelFX.create({});
  assert.equal(fx.enabled, false);
  assert.deepEqual(fx.emit({mode: 'arena', event: 'impact'}), {ok: false, legacy: true});
  fx.update(.016); fx.clear(); fx.dispose();
  for (const [file, needle] of [['js/game.js', "if(!arenaFx('impact'"], ['defense/js/view.js', 'if (numbersThisFrame < 4 && !pixel('], ['survivors/js/scene.js', "if(!pixel({event:'impact'"], ['tower/index.html', "!world.pixel({event:'hit'"]]) assert.ok(src(file).includes(needle), file);
});

test('defense weather stays locked: hit, baseHit, ultimate and lightning are all local', () => {
  const view = stripped(src('defense/js/view.js')), fx = stripped(src('defense/js/fx.js'));
  const events = view.slice(view.indexOf('function handleEvents'), view.indexOf('function handleEvents') + 6000);
  for (const code of [events, fx]) for (const bad of ['setClearColor', 'toneMappingExposure', 'scene.background', 'scene.fog']) assert.ok(!code.includes(bad), bad);
  assert.ok(!Object.keys(map.events).some((k) => /^defense\./.test(k) && map.events[k].some((r) => (r.fx || []).some((f) => /^weather\/|^transitions\//.test(f.id)))), 'no battle event may play a weather or full-screen asset');
  assert.match(view, /ev\.type === 'weatherLightning' && state\?\.stage\?\.id === 'waterfall' && !state\.duel/);
});
