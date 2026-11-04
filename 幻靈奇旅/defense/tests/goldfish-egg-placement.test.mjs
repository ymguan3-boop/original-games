import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame, moveCard, playCard, step, mergeResult, useBagItem,
  isThreeColorEgg, validEggPosition, goldfishPair, TRIAL_ROSTER, PK_STAGE,
  WATER_DRAGON, GOLDFISH_KING, GOLDFISH_QUEEN, THREE_COLOR_EGG} from '../js/rules.js';
import {snapshot, createMirror, applySnapshot} from '../js/pk-sync.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const spirits = read('../../data/spirits.json');
const catalog = read('../../data/spirit-catalog.json');
const evolution = read('../../survivors/data/evolution.json');
const game = (extra = {}) => createGame({
  deck: TRIAL_ROSTER, spirits, catalog, evolution, seed:47, ...extra
});
const card = (id, species, rank = 2) => ({uid:id,species,rank,boost:0});

test('water dragon needs exactly one King and one Queen: both directions work', () => {
  assert.ok(goldfishPair(GOLDFISH_KING,GOLDFISH_QUEEN));
  assert.ok(goldfishPair(GOLDFISH_QUEEN,GOLDFISH_KING));
  assert.ok(!goldfishPair(GOLDFISH_KING,GOLDFISH_KING));
  for (const pair of [[GOLDFISH_KING,GOLDFISH_QUEEN],
                      [GOLDFISH_QUEEN,GOLDFISH_KING]]) {
    const s=game();s.hand=[card(100,pair[0]),card(101,pair[1])];
    moveCard(s,0,0);
    assert.equal(s.hand.length,1);
    assert.equal(s.hand[0].species,WATER_DRAGON);
    assert.equal(s.hand[0].rank,3);
    assert.equal(s.stats.merges,1);
    assert.equal(s.events.find(e=>e.type==='merge')?.goldfishFusion,true);
  }
});

test('two Kings or two Queens cannot evolve into Water Dragon King', () => {
  for(const species of [GOLDFISH_KING,GOLDFISH_QUEEN]) {
    const s=game();s.hand=[card(1,species),card(2,species)];
    moveCard(s,1,1);
    assert.equal(s.hand[0].species,species);
    assert.equal(s.hand[0].rank,3);
    assert.equal(mergeResult(s,card(3,species)).species,species);
  }
});

test('organizer brings a separated king/queen together and merges them', () => {
  const s=game();
  s.hand=[card(1,GOLDFISH_KING),card(2,'charmander',1),card(3,GOLDFISH_QUEEN)];
  assert.equal(useBagItem(s,'card-organize'),true);
  assert.deepEqual(s.hand.map(c=>c.species),[WATER_DRAGON,'charmander']);
});

test('three-color egg must be positioned: invalid inputs never consume a card', () => {
  const s=game({stage:{...game().stage,groups:[],boss:null}});
  s.hand=[card(91,THREE_COLOR_EGG,1)];
  assert.ok(isThreeColorEgg(THREE_COLOR_EGG));
  assert.throws(()=>playCard(s,0),/路徑/);
  for(const x of [NaN, Infinity, s.left-1, s.right+1, null]) {
    assert.throws(()=>playCard(s,0,'ally',x),/路徑/);
    assert.equal(s.hand.length,1);
    assert.equal(s.fighters.length,0);
  }
  assert.equal(validEggPosition(s,s.left+0.8),true);
  assert.equal(validEggPosition(s,s.right-0.8),true);
  assert.equal(validEggPosition(s,s.left),false);
  assert.equal(validEggPosition(s,s.right),false);
});

test('egg can deploy near any part of the road, does not march from own base', () => {
  for(const pct of [0.03,0.25,0.5,0.75,0.97]) {
    const s=game({stage:{...game().stage,groups:[],boss:null}});
    const x=s.left+(s.right-s.left)*pct;
    s.hand=[card(91,THREE_COLOR_EGG,1)];
    const c=playCard(s,0,'ally',x);
    assert.equal(c.species,THREE_COLOR_EGG);
    assert.ok(!s.hand.some(p=>p.uid===91),'played card removed only after valid placement');
    const f=s.fighters.find(f=>f.species===THREE_COLOR_EGG);
    assert.ok(f);
    assert.equal(f.x,x);assert.equal(f.z,0);
    assert.equal(f.stationary,true);assert.equal(f.knockLeft,0);
    for(let i=0;i<80;i++) step(s,1/30);
    assert.equal(f.x,x,'egg must stay at the selected location');
    assert.equal(f.moving,false);
  }
});

test('PK guest placement uses opposite host lane and the mirror restores its chosen position', () => {
  const s=game({stage:PK_STAGE,foeDeck:TRIAL_ROSTER});
  s.foe.hand=[card(77,THREE_COLOR_EGG,1)];
  const guestChoice=7.2,hostPosition=-guestChoice;
  playCard(s,0,'enemy',hostPosition);
  const remote=s.fighters.find(f=>f.species===THREE_COLOR_EGG);
  assert.equal(remote.x,hostPosition);
  const mirror=createMirror(PK_STAGE);
  applySnapshot(mirror,snapshot(s,[]));
  assert.equal(mirror.fighters.find(f=>f.species===THREE_COLOR_EGG)?.x,guestChoice);
});

test('touch/click selected-egg placement, touch drag, and cancelled non-deduction are wired', () => {
  const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
  const view=readFileSync(new URL('../js/view.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../css/defense.css',import.meta.url),'utf8');
  assert.match(main,/function beginEggPlacement\(uid\)/);
  assert.match(main,/function placeEggAt\(uid, x\)/);
  assert.match(main,/isThreeColorEgg\(game\.hand\[i\]\.species\)/);
  assert.match(main,/pk\.send\(\{t:'act',a:'play',uid,x:-x\}\)/);
  assert.match(main,/playCard\(game, i, 'enemy', m\.x\)/);
  assert.match(main,/view\?\.pickRoad\(e\.clientX, e\.clientY\)/);
  assert.match(main,/if \(placing\.type === 'egg'\)/);
  assert.match(view,/kind === 'egg' \? 0xffdc70/);
  assert.match(css,/body\.placing-egg #world/);
  assert.match(css,/#hud \.hand-card\.egg-selected/);
});


test('sortie deck editor, flipped card descriptions, and how-to explain actual fusion/placement rules', () => {
  const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../css/defense.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(main,/ribbon\('出擊卡組'/);
  assert.match(main,/class="deck-special-rules"/);
  assert.match(main,/國王 ×1 ＋ 皇后 ×1/);
  assert.match(main,/同種金魚只升星/);
  assert.match(main,/三色蛋指定路徑出場/);
  assert.match(main,/進化成其他幻靈後依一般召喚規則/);
  assert.match(main,/\['groudon','rayquaza'\]\.includes\(f\) \? \[f\]/,
    'star-tier preview must not claim two identical kings/queens evolve into a dragon');
  assert.match(main,/id === 'kyogre'\) tiers\[2\] = \['groudon','rayquaza','mewtwo'\]/);
  assert.match(main,/國王＋皇后 → 水蛟龍王；同種 ×2 僅升星/);
  assert.match(main,/id === 'jigglypuff'\s*\? '<div class="deck-special-note">/);
  assert.match(main,/卡組與升星/,'how-to also updated');
  assert.match(css,/\.deck-special-rules/);
  assert.match(css,/\.deck-special-note/);
  assert.match(html,/20261104-v28/);
});
