import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createGame, step, playCard, placeTrap, useBagItem, PK_STAGE, PK_ITEMS, TRIAL_ROSTER, BAG_ITEMS, beginDealing} from '../js/rules.js';
import {pickSupply, SUPPLY_WEIGHTS, SUPPLY_IDS} from '../js/gacha.js';
import {outlineThickness, HIDDEN_SCALE} from '../js/style.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const text = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const spirits = read('../../data/spirits.json'), catalog = read('../../data/spirit-catalog.json'), evolution = read('../../survivors/data/evolution.json');
const solo = () => { const g = createGame({deck: TRIAL_ROSTER, spirits, catalog, evolution, seed: 3, deferDeal: true}); beginDealing(g); return g; };
const duel = () => { const g = createGame({stage: PK_STAGE, deck: TRIAL_ROSTER, foeDeck: TRIAL_ROSTER, spirits, catalog, evolution, seed: 3, deferDeal: true}); beginDealing(g); return g; };

test('清除陷阱卡 removes every road trap and is refused on an empty road', () => {
  const g = solo();
  assert.equal(useBagItem(g, 'trap-clear'), false, 'nothing to clear: the card is not spent');
  placeTrap(g, 'mud', 2); placeTrap(g, 'spike', -3);
  assert.equal(useBagItem(g, 'trap-clear'), true);
  assert.ok(g.traps.every((t) => t.expired));
  assert.equal(g.events.filter((e) => e.type === 'trapGone').length, 2);
  assert.equal(useBagItem(g, 'trap-clear'), false);
});

test('重新換牌卡 returns the opponent hand and deals the same number again, in PK only', () => {
  assert.equal(useBagItem(solo(), 'foe-redeal'), false, 'not an island item');
  const g = duel(); for (let i = 0; i < 300; i++) step(g, 1 / 30);
  const before = g.foe.hand.map((c) => c.uid), mine = g.hand.map((c) => c.uid); g.events.length = 0;
  assert.ok(before.length > 0);
  assert.equal(useBagItem(g, 'foe-redeal', 'ally'), true);
  assert.equal(g.events.filter((e) => e.type === 'deal' && e.side === 'enemy').length, before.length, 'dealt as many as were returned');
  assert.ok(g.foe.hand.every((c) => !before.includes(c.uid)), 'none of the old cards remain');
  assert.deepEqual(g.hand.map((c) => c.uid), mine, 'my own hand is untouched');
  const h = duel(); for (let i = 0; i < 300; i++) step(h, 1 / 30);
  const hostHand = h.hand.map((c) => c.uid); assert.equal(useBagItem(h, 'foe-redeal', 'enemy'), true, 'the guest can use it on the host');
  assert.ok(h.hand.every((c) => !hostHand.includes(c.uid)));
  const empty = duel(); empty.foe.hand.length = 0; assert.equal(useBagItem(empty, 'foe-redeal', 'ally'), false, 'an empty hand spends nothing');
});

test('PK accepts only the PK items, and the new cards can be drawn from the gacha', () => {
  const g = duel();
  for (const id of Object.keys(BAG_ITEMS)) if (!PK_ITEMS.includes(id)) assert.equal(useBagItem(g, id, 'ally'), false, id);
  for (const id of ['trap-clear', 'foe-redeal']) { assert.ok(SUPPLY_IDS.includes(id)); assert.ok(SUPPLY_WEIGHTS[id] > 0); }
  const seen = new Set(); for (let i = 0; i < 400; i++) seen.add(pickSupply(() => i / 400)); assert.ok(seen.has('foe-redeal') && seen.has('trap-clear'));
});

test('a part hidden at 0.0001 scale keeps a normal outline: no screen-covering hull when animation shows it', () => {
  const node = (s, parent = null) => ({scale: {x: s, y: s, z: s}, parent});
  const face = node(0.0001, node(0.82, node(0.8)));
  const hull = outlineThickness(face, 0.04);
  assert.ok(hull < 0.1, 'the hull stays thin (' + hull + ')');
  assert.ok(HIDDEN_SCALE > 0.0001);
  assert.ok(Math.abs(outlineThickness(node(2), 0.04) - 0.02) < 1e-9, 'real scales still count');
});

test('one version per module, so nothing is downloaded twice', () => {
  const tags = new Map();
  for (const f of readdirSync(new URL('../js/', import.meta.url))) for (const m of text('../js/' + f).matchAll(/from '(\.\/[\w-]+\.js)(\?v=[^']*)?'/g)) { (tags.get(m[1]) || tags.set(m[1], new Set()).get(m[1])).add(m[2] || ''); }
  for (const [file, set] of tags) assert.equal(set.size, 1, file + ' is imported under ' + [...set].join(' and '));
});

test('battle and chart scenery are batched, and phones render at 30 FPS', () => {
  assert.match(text('../js/view.js'), /batchStatic\(THREE, scenery, mapGroup/);
  assert.match(text('../js/chart-models.js'), /batchStatic\(T, \[\.\.\.root\.children\], root\)/);
  assert.match(text('../js/main.js'), /LOW_POWER && !pendingDealingScene/);
  assert.match(text('../js/sea3d.js'), /lowPower && now - last < 30/);
});

test('a hidden PK host keeps the match running; a hidden guest does not pile up events', () => {
  const main = text('../js/main.js');
  assert.match(main, /document\.hidden \|\| pk\?\.role !== 'host'/);
  assert.match(main, /game\.events\.length > 200/);
});

test('the pier deck carries the hero and the mount; the commerce hall follows the dungeon list', () => {
  const harbor = text('../../js/harbor.js'), game = text('../../js/game.js'), hall = text('../../js/commerce-hall.js'), html = text('../../index.html');
  assert.match(harbor, /const deckY=/); assert.match(game, /harbor\.deckY\(S\.player\.x,S\.player\.z\)/);
  assert.match(game, /function tickMount\(dt\)\{\s*tickGroundHeight\(\);/);
  assert.ok(html.indexOf('js/commerce-hall.js') < html.indexOf('js/game.js'));
  assert.match(hall, /const QUEUE=\[0,2,3,5,6,8\]/);
  assert.match(game, /commerce\?\.inLot\(x,z\)/);
});
