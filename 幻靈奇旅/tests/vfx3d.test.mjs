import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require = createRequire(import.meta.url);
const Vfx3D = require('../js/fx/vfx3d.js');
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const code = src('js/fx/vfx3d.js').replace(/\/\*[\s\S]*?\*\//g, '');

test('turned off, every call reports false so the caller plays the original effect', () => {
  const fx = Vfx3D.create({});
  assert.equal(fx.enabled, false);
  assert.equal(fx.hit({x: 0, y: 0, z: 0}, '焰', true), false);
  assert.equal(fx.burst({x: 0, y: 0, z: 0}), false);
  assert.equal(fx.ring({x: 0, y: 0, z: 0}), false);
  fx.update(.016); fx.clear(); fx.dispose();
});

test('all six elements have 3D particle colours', () => {
  for (const e of ['焰', '潮', '森', '雷', '念', '光']) assert.equal(Vfx3D.COLORS[e].length, 3);
});

test('the phone tier uses fewer particles than desktop', () => {
  const {low, high} = Vfx3D.LIMITS;
  assert.ok(low.shard < high.shard / 2 && low.ring <= high.ring / 2 && low.density < high.density);
});

test('it is real 3D geometry with no sprites, images or per-particle objects', () => {
  assert.match(code, /OctahedronGeometry/);
  for (const bad of ['Sprite', 'Texture', 'Image(', 'transparent:true', 'new T.Mesh(g,material)new']) assert.ok(!code.includes(bad), bad);
  assert.equal((code.match(/new T\.Mesh\(/g) || []).length, 2, 'one mesh per pool, plus its optional outline pass');
});

test('it touches no sky, fog, exposure, HP or save data', () => {
  for (const bad of ['scene.background', 'scene.fog', 'setClearColor', 'toneMappingExposure', '.hp', 'localStorage.setItem']) assert.ok(!code.includes(bad), bad);
});

test('the file stays light enough for the first screen', () => {
  assert.ok(src('js/fx/vfx3d.js').length < 12000);
});
