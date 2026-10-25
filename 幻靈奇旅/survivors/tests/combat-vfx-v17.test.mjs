import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createCombatVfx, jumpUltimateHeight } from '../js/combat-vfx-v17.js';
import { createProjectileView } from '../js/projectile-view.js';

const context = vm.createContext({ console });
vm.runInContext(readFileSync(new URL('../../vendor/three.min.js', import.meta.url), 'utf8'), context);
const T = context.THREE;
function fixture() {
  const scene = new T.Scene(), metrics = {}, shakes = [];
  const fx = createCombatVfx(T, scene, { metrics, onShake: (...args) => shakes.push(args) });
  return { scene, metrics, shakes, fx };
}
function meshes(scene) { const list = []; scene.traverse(o => { if (o.isMesh) list.push(o); }); return list; }

test('four weapons use smooth metallic meshes and image-free effects', () => {
  const { scene, metrics, fx } = fixture();
  for (const weapon of ['sword', 'knife', 'blades', 'guns']) {
    fx.heroNormal({ weapon, x: 2, z: 4, range: 5, heading: .7 });
    fx.heroStart({ weapon, x: 2, z: 4 });
    fx.heroStrike({ weapon, x: 2, z: 4, range: 12, final: true });
  }
  fx.update(.12);
  const list = meshes(scene), metallic = list.filter(m => m.material.isMeshStandardMaterial);
  assert.ok(metallic.length >= 20);
  for (const m of metallic) {
    assert.equal(m.material.flatShading, false);
    assert.ok(m.material.metalness >= .8);
    assert.ok(m.material.roughness <= .22);
    assert.ok(m.material.emissiveIntensity >= .5);
  }
  assert.ok(list.every(m => !m.isSprite && !m.isPoints && !m.material.map));
  assert.equal(metrics.combatVfx.images, 0);
  assert.equal(metrics.combatVfx.renderer, 'three-metal');
  fx.dispose();
});

test('water dragon and full-field final strikes have distinct effects and quake callback', () => {
  const { scene, metrics, shakes, fx } = fixture();
  fx.spellRelease({ speciesId: 'mewtwo', element: '潮', strong: true, range: 8, x: 3, z: 6 });
  fx.update(.15);
  assert.equal(metrics.lastPetMetalFx.speciesId, 'mewtwo');
  assert.ok(meshes(scene).length >= 8);
  fx.heroStrike({ weapon: 'sword', global: true, final: false, x: 0, z: 0 });
  assert.equal(shakes.length, 0);
  fx.heroStrike({ weapon: 'sword', global: true, final: true, x: 0, z: 0 });
  fx.spellRelease({ speciesId: 'infernape', global: true, strong: true, final: true, x: 0, z: 0 });
  assert.equal(shakes.length, 2);
  assert.ok(shakes.every(([n]) => n >= .8));
  fx.dispose();
});

test('effect meshes are pooled, bounded and remain finite through sustained combat', () => {
  const { scene, metrics, fx } = fixture();
  for (let frame = 0; frame < 420; frame++) {
    const weapon = frame % 4, ev = { weapon, x: 2, z: 3, heading: .7, range: weapon === 3 ? 15 : 4, final: frame % 5 === 0, global: weapon === 0 };
    fx.heroNormal(ev);
    if (frame % 4 === 0) { fx.heroStart(ev); fx.heroStrike(ev); }
    fx.spellRelease({ ...ev, speciesId: ['mewtwo', 'infernape', 'chimchar', 'monferno'][weapon], element: ['潮', '光', '焰', '雷'][weapon], strong: true, from: { x: 2, y: 0, z: 3 }, to: { x: 8, y: 1, z: 10 } });
    fx.impact({ ...ev, ultimate: true });
    fx.update(1 / 60); scene.updateMatrixWorld();
    for (const m of meshes(scene)) assert.ok(Array.from(m.matrixWorld.elements).every(Number.isFinite));
    assert.ok(metrics.combatVfx.effects <= 64);
    assert.ok(metrics.combatVfx.allocated <= 640);
  }
  assert.ok(metrics.combatVfxEvents > 1000);
  const allocated = metrics.combatVfx.allocated;
  fx.update(2); assert.equal(metrics.combatVfx.effects, 0);
  fx.heroNormal({ weapon: 'sword' }); fx.update(.1);
  assert.equal(metrics.combatVfx.allocated, allocated, 'reuses released meshes');
  fx.clear(); assert.equal(scene.children[0].children.length, 0);
  fx.dispose(); assert.equal(scene.children.length, 0);
});

test('dispose releases shared GPU resources once, and accepts missing optional event fields', () => {
  const { scene, fx } = fixture();
  fx.heroNormal(); fx.heroStart(); fx.heroStrike(); fx.spellRelease(); fx.impact(); fx.update(.1);
  const geos = new Set(), mats = new Set();
  for (const m of meshes(scene)) { geos.add(m.geometry); mats.add(m.material); }
  let disposedGeos = 0, disposedMats = 0;
  geos.forEach(g => g.addEventListener('dispose', () => disposedGeos++));
  mats.forEach(m => m.addEventListener('dispose', () => disposedMats++));
  fx.dispose(); fx.dispose();
  assert.equal(disposedGeos, geos.size); assert.equal(disposedMats, mats.size);
  assert.equal(scene.children.length, 0);
});

test('piercing metal beams remain visible after the original target disappears and hit multiple bodies', () => {
  const scene = new T.Scene(), metrics = {};
  const targets = new Map([['first', { x: 3, y: 1.2, z: 0 }], ['second', { x: 5, y: 1.5, z: 0 }]]);
  const view = createProjectileView(T, scene, { metrics, actorPoint: () => ({ x: 0, y: .9, z: 0 }), targetPoint: (id, fallback) => targets.get(id) || fallback });
  const p = { id: 'pierce', piercing: true, vx: 1, vz: 0, range: 15, travelled: 4, origin: { x: 0, y: .9, z: 0 }, x: 4, z: 0, target: 'vanished', fx: 'beam', context: { source: 'hero', strong: true } };
  view.update([p], .016);
  assert.equal(metrics.projectileViews, 1); assert.ok(metrics.projectileMeshes >= 2);
  assert.equal(metrics.lastProjectileVisual.goal, null); assert.equal(metrics.lastProjectileVisual.point.y, .9);
  assert.equal(metrics.lastProjectileVisual.fx, 'piercing');
  view.impact(p, { id: 'first', x: 3, z: 0 });
  assert.equal(metrics.lastProjectileEndpoint.point.y, 1.2);
  view.impact(p, { id: 'second', x: 5, z: 0 });
  assert.equal(metrics.lastProjectileEndpoint.point.y, 1.5);
  assert.equal(metrics.projectileFlashes, 2);
  targets.clear(); p.x = 7; p.travelled = 7; view.update([p], .016);
  assert.equal(metrics.projectileViews, 1); assert.ok(metrics.projectileMeshes >= 6);
  assert.ok(Math.abs(metrics.lastProjectileVisual.from.x - 2.5) < .001);
  view.update([], 1); view.update([], .016); assert.equal(metrics.projectileViews, 0); assert.equal(metrics.projectileMeshes, 0);
  const list = meshes(scene); assert.equal(list.length, 5);
  for (const m of list) assert.equal(m.instanceColor.array.length, 512 * 3, 'allocate instance colors before setting visible count to zero');
  for (const m of list.slice(0, 4)) { assert.equal(m.material.isMeshStandardMaterial, true); assert.equal(m.material.flatShading, false); assert.ok(m.material.metalness >= .8); }
  view.dispose(); assert.equal(scene.children.length, 0);
});

test('tracking orbs retain target body-height interpolation and endpoint flashes', () => {
  const scene = new T.Scene(), metrics = {}, to = { x: 10, y: 2, z: 0 };
  const view = createProjectileView(T, scene, { metrics, actorPoint: () => ({ x: 0, y: 1, z: 0 }), targetPoint: () => to });
  const p = { id: 'orb', x: 0, z: 0, sourceActor: 'pet:0', target: 'enemy', element: '潮', fx: 'orb' };
  view.update([p], .016); p.x = 5; view.update([p], .016);
  assert.equal(metrics.lastProjectileVisual.point.y, 1.5);
  view.impact(p, to); assert.equal(metrics.lastProjectileEndpoint.point.y, 2);
  view.update([], .016); assert.ok(metrics.projectileMeshes > 0); assert.equal(metrics.projectileViews, 0);
  view.dispose(); view.dispose();
});


test('小山 jumps five units above its position and lands exactly before the global shockwave', () => {
  const actor = { hp: 10, jumpUltimate: { start: 3, land: 4.2, end: 4.35 } };
  assert.equal(jumpUltimateHeight(actor, 2.9), 0);
  assert.equal(jumpUltimateHeight(actor, 3), 0);
  assert.equal(jumpUltimateHeight(actor, 3.6), 5);
  assert.equal(jumpUltimateHeight(actor, 4.2), 0);
  assert.equal(jumpUltimateHeight({ ...actor, hp: 0 }, 3.6), 0);
  const { fx, metrics, shakes } = fixture();
  fx.spellRelease({ speciesId: 'wigglytuff', x: 4, z: 8, strong: true, global: true, final: true });
  fx.update(.2);
  assert.equal(metrics.lastPetMetalFx.global, true);
  assert.ok(shakes.some(([amount]) => amount > 1));
  fx.dispose();
});

test('remote blasts center on the enemy, while 大熊 uses a molten sword and a following armor shield', () => {
  const { fx, scene, metrics } = fixture();
  fx.spellRelease({ speciesId: 'charizard', kind: 'blast', strong: true, from: { x: 1, z: 2 }, to: { x: 12, z: 14 }, range: 8 });
  assert.equal(metrics.lastPetMetalFx.area, true);
  assert.equal(metrics.lastPetMetalFx.x, 12); assert.equal(metrics.lastPetMetalFx.z, 14);
  fx.spellRelease({ speciesId: 'swampert', kind: 'area', strong: false, range: 5, x: 2, z: 3 });
  assert.equal(metrics.lastPetMetalFx.moltenSword, true);
  fx.update(.1);
  assert.equal(meshes(scene).filter(m => m.geometry.type === 'ExtrudeGeometry').length, 2);
  const actor = { speciesId: 'swampert', hp: 100, x: 3, z: 4, armorUntil: 12 };
  fx.syncActors([actor], 2); fx.update(.1); assert.equal(metrics.armorViews, 1);
  actor.x = 9; actor.z = 6; fx.syncActors([actor], 8); fx.update(.1);
  const shield = scene.children[0].children.find(g => g.children.some(m => m.userData.combatPoolKey?.startsWith('sphere:')) && g.position.x === 9);
  assert.ok(shield); assert.equal(shield.position.z, 6);
  fx.syncActors([actor], 12); assert.equal(metrics.armorViews, 0);
  fx.syncActors([{ ...actor, hp: 0, armorUntil: 20 }], 13); assert.equal(metrics.armorViews, 0);
  fx.dispose(); assert.equal(scene.children.length, 0);
});
