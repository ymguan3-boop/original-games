import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame, PK_STAGE, TRIAL_ROSTER} from '../js/rules.js';
import {createMirror} from '../js/pk-sync.js';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const source = read('../js/view.js');
const lobby = read('../js/pk-lobby.js');
const main = read('../js/main.js');
const css = read('../css/defense.css');
const spirits = JSON.parse(read('../../data/spirits.json'));
const catalog = JSON.parse(read('../../data/spirit-catalog.json'));
const evolution = JSON.parse(read('../../survivors/data/evolution.json'));

test('both PK room perspectives are recognized as duels without a stage monster boss', () => {
  const host = createGame({stage: PK_STAGE, deck: TRIAL_ROSTER, foeDeck: TRIAL_ROSTER, spirits, catalog, evolution, deferDeal:true});
  const guest = createMirror(PK_STAGE);
  assert.equal(PK_STAGE.boss, null);
  assert.equal(host.duel, true);
  assert.equal(guest.duel, true);
  assert.match(source, /if \(game\.duel\) seatRivalHero\(game\); else seatBoss\(game\);/);
  assert.match(source, /portal\.visible = !game\.duel/);
});

test('the rival uses the SAME hero GLB on the far barrel with a seated pose and idle animation', () => {
  assert.match(source, /async function seatRivalHero\(game\)/);
  const body = source.slice(source.indexOf('async function seatRivalHero('),source.indexOf('function rivalPlay('));
  assert.match(body, /loadGltf\('models\/hero\.glb'\)/);
  assert.match(body, /nest\.add\(root\)/);
  assert.match(body, /faceTo\(nest\.position, crystal\.position\)/);
  assert.match(body, /getObjectByName\('hips'\)/);
  assert.match(body, /rivalCostumes\?\.apply\(object, rivalCostumeId\)/);
  assert.match(body, /rivalPlay\('Idle'\)/);
  assert.match(source, /function tickRivalHero\(dt\)/);
  assert.match(source, /for \(const thigh of \[thighL,thighR\]\)/);
  assert.match(source, /for \(const shin of \[shinL,shinR\]\)/);
  assert.match(source, /tickHero\(dt\); tickRivalHero\(dt\)/);
});

test('room handshake shares a validated opponent appearance ID; the renderer receives that ID', () => {
  assert.match(lobby, /costume = \(\) => 'trainer'/);
  assert.match(lobby, /costume: costume\(\)/);
  assert.match(lobby, /stock: session\.me\.stock, costume: session\.me\.costume/);
  assert.match(lobby, /session\.foe\.costume = m\.costume/);
  assert.match(main, /costume: \(\) => costumeFor\(journey\(\)\)\.id/);
  assert.match(main, /view\.rivalCostume = costumeFor\(pk\.foe\?\.costume \|\| 'trainer'\)\.id/);
  assert.match(source, /set rivalCostume\(id\)/);
});

test('the own item button is fixed and visible in PK mobile portrait and landscape', () => {
  assert.match(css, /body\.pk-mode #hud \.item-wrap \{[\s\S]*?position: fixed !important/);
  assert.match(css, /body\.pk-mode #hud #items \{\s*display: grid !important/);
  assert.match(css, /body\.pk-mode #hud \.item-wrap \.item-menu\[hidden\]/);
  assert.match(css, /body\.pk-mode #hud \.item-wrap \{[\s\S]*?pointer-events: auto/);
  assert.match(main, /\$\('items'\)\.onclick =/);
});

test('the bag lists only what this fight can use: PK hides everything that is not a PK item', () => {
  assert.match(main, /\.filter\(\(u\) => u\.count > 0 && \(pk \? TACTICAL_BAG\.includes\(u\.id\) : !PK_ONLY_ITEMS\.includes\(u\.id\)\)\)/);
  assert.ok(!main.includes('pk-item-locked'), 'nothing unusable is drawn disabled any more');
  assert.match(main, /pk\.send\(\{t:'act', a:'item', id\}\)/);
});
