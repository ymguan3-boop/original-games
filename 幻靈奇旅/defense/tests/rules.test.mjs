import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {placeTrap, TRAP_CARDS, MAX_TRAPS, TRAP_LIFE, BAG_ITEMS, useBagItem, STAGES, CRIT, TRAPS, playable, isBaseCard, isRedCard, useItem, itemReady, ITEMS, DECK_BASE, DECK_RED, createGame, step, playCard, moveCard, canPlay, mergeResult, profileFor, caveRoster, elementMultiplier, isSupport, SUPPORT, TRIAL_ROSTER, DECK_SIZE, HAND_SIZE, MAX_ALLIES, beginDealing, DEAL_EVERY} from '../js/rules.js';
import {buildPath, pointAt} from '../js/stages.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const spirits = read('../../data/spirits.json'), catalog = read('../../data/spirit-catalog.json'), evolution = read('../../survivors/data/evolution.json');
const entries = new Map(catalog.entries.map((e) => [e.id, e])), ids = new Set(spirits.map((s) => s.id));
const pool = read('../../survivors/data/gacha-pool.json');
const game = (o = {}) => createGame({deck: TRIAL_ROSTER, spirits, catalog, evolution, seed: 7, ...o});

test('every stage uses real species and a path inside the field', () => {
  for (const s of STAGES) {
    for (const g of s.groups) assert.ok(ids.has(g.species), `${s.id} ${g.species}`);
    if (s.boss) assert.ok(ids.has(s.boss), `${s.id} boss`);
    const p = buildPath(s.path);
    for (const [x, z] of p.points) assert.ok(Math.abs(x) <= 16 && Math.abs(z) <= 9, `${s.id} leaves the field`);
    const end = pointAt(p, p.length);
    assert.deepEqual([end.x, end.z], s.path.at(-1));
  }
});

test('routes are long and never run alongside themselves', () => {
  for (const s of STAGES) {
    const p = buildPath(s.path, 8);
    assert.ok(p.length >= 50, `${s.id} is too short (${p.length.toFixed(0)})`);
    for (let i = 0; i < p.points.length; i++) for (let j = i + 1; j < p.points.length; j++) {
      if (p.lengths[j] - p.lengths[i] < 8) continue;
      assert.ok(Math.hypot(p.points[i][0] - p.points[j][0], p.points[i][1] - p.points[j][1]) >= 3.4, `${s.id} road overlaps itself`);
    }
  }
});

test('chest and book families are not playable, same as the cave summon pool', () => {
  const banned = ['caterpie', 'metapod', 'butterfree', 'weedle', 'kakuna', 'beedrill'];
  assert.deepEqual([...pool.excludedIds].sort(), [...banned].sort());
  assert.deepEqual(playable(['weedle', 'charmander', 'butterfree', 'mew'], pool.excludedIds), ['charmander', 'mew']);
  for (const id of TRIAL_ROSTER) assert.ok(!banned.includes(id), id);
});

test('V2 has no elemental counters or element-based damage multipliers', () => {
  for (const a of ['光','焰','森','潮','雷','念']) for (const b of ['光','焰','森','潮','雷','念']) assert.equal(elementMultiplier(a,b),1);
});

test('a deck is 4 base spirits and 2 red support cards', () => {
  const bases = spirits.filter((s) => isBaseCard(evolution, s.id) && !pool.excludedIds.includes(s.id)).map((s) => s.id);
  assert.ok(bases.includes('jigglypuff'), '三色蛋 counts as a base card');
  for (const id of bases) { const s = spirits.find((x) => x.id === id); assert.ok(s.cardFrame !== 'red' || id === 'jigglypuff', `${id} is a red base`); }
  for (const id of ['charmeleon', 'charizard', 'mewtwo', 'groudon']) assert.equal(isBaseCard(evolution, id), false, id);
  const reds = spirits.filter((s) => s.cardFrame === 'red' && !['mewtwo', 'jigglypuff'].includes(s.id)).map((s) => s.id).sort();
  assert.deepEqual(reds, spirits.filter((s) => isRedCard(s.id)).map((s) => s.id).sort());
  assert.equal(DECK_BASE + DECK_RED, DECK_SIZE);
  assert.equal(TRIAL_ROSTER.filter((id) => isBaseCard(evolution, id)).length, DECK_BASE);
  assert.equal(TRIAL_ROSTER.filter(isRedCard).length, DECK_RED);
});

test('items: reshuffle, quick deal, sort-and-merge (no cannon)', () => {
  const s = game(), c = (uid, species, rank = 1) => ({uid, species, rank, boost: 0});
  assert.deepEqual(Object.keys(ITEMS).sort(), ['quickdeal', 'reshuffle', 'sort']);
  assert.equal(useItem(s, 'reshuffle'), false, 'items start half charged');
  s.time = 60;
  s.hand = [c(1, 'charmander'), c(2, 'squirtle'), c(3, 'mew')];
  assert.ok(useItem(s, 'reshuffle')); assert.equal(s.hand.length + s.stats.merges >= 3, true); assert.ok(!s.hand.some((x) => x.uid <= 3), 'all cards were replaced');
  assert.equal(itemReady(s, 'reshuffle'), false);
  s.hand = s.hand.slice(0, 2); assert.ok(useItem(s, 'quickdeal')); assert.ok(s.hand.length >= 3 || s.stats.merges > 0);
  s.hand = [c(11, 'bulbasaur'), c(12, 'squirtle'), c(13, 'bulbasaur'), c(14, 'mew', 2), c(15, 'squirtle')];
  assert.ok(useItem(s, 'sort'));
  assert.deepEqual(s.hand.map((x) => x.species).sort(), ['ivysaur', 'mew', 'wartortle'].sort());
});

test('deck reads the cave account, team first', () => {
  assert.deepEqual(caveRoster({firstlight: {owned: ['squirtle', 'charmander', 'mewtwo'], team: ['mewtwo']}}), ['mewtwo', 'squirtle', 'charmander']);
  assert.equal(game({deck: spirits.map((x) => x.id)}).deck.length, DECK_SIZE);
});

test('support cards are exactly the spirits without any evolution', () => {
  const into = new Set(Object.values(evolution).flatMap((r) => r.next || []));
  const isolated = spirits.filter((s) => !(evolution[s.id]?.next || []).length && !into.has(s.id)).map((s) => s.id).sort();
  assert.deepEqual(Object.keys(SUPPORT).sort(), isolated);
});

test('V2 basic attack reaches depend on job not element: warrior 1, archer 3, mage 5', () => {
  const spec = (id) => spirits.find((s) => s.id === id);
  const warrior = profileFor(spec('bulbasaur'), entries.get('bulbasaur'), false);
  const archer = profileFor(spec('charmander'), entries.get('charmander'), false);
  const mage = profileFor(spec('cyndaquil'), entries.get('cyndaquil'), false);
  assert.equal(warrior.type,'melee');
  assert.equal(archer.type,'ranged');
  assert.equal(mage.type,'ranged');
  assert.equal(archer.reach,warrior.reach*3);
  assert.equal(mage.reach,warrior.reach*5);
  assert.equal(profileFor(spec('charizard'), entries.get('charizard'), true).type, 'blast');
});

test('live scene deals only after the battlefield has become visible', () => {
  const s = game({deferDeal:true});
  assert.equal(s.started,false);
  assert.equal(s.hand.length,0,'even the three opening cards must not appear behind loading');
  assert.equal(s.events.length,0,'no card events or animations during loading');
  for(let i=0;i<10*60;i++) step(s,1/60);
  assert.equal(s.time,0,'combat simulation clock stays frozen during loading');
  assert.equal(s.hand.length,0,'still no cards before the visible scene');
  assert.equal(beginDealing(s),true);
  assert.equal(s.started,true);
  assert.equal(s.hand.length + s.stats.merges,3,'opening cards are dealt as the scene starts');
  assert.equal(beginDealing(s),false,'activation is idempotent');
  const count = s.hand.length;
  for(let i=0;i<Math.floor((DEAL_EVERY-.12)*60);i++) step(s,1/60);
  assert.equal(s.hand.length,count,'next card does not arrive early');
  for(let i=0;i<Math.ceil(.2*60);i++) step(s,1/60);
  assert.ok(s.hand.length>=count || s.stats.merges>0,'new cards arrive on the post-entry clock');
});

test('cards are dealt over time up to the hand size', () => {
  const s = game();
  assert.equal(s.hand.length + s.stats.merges, 3);
  for (let i = 0; i < 30 * 60; i++) { step(s, 1 / 30); s.events.length = 0; }
  assert.ok(s.hand.length <= HAND_SIZE && s.hand.length >= HAND_SIZE - 2);
});

test('two identical neighbours merge into the next evolution, and merges cascade', () => {
  const s = game({deck: ['charmander']});
  s.hand = [{uid: 90, species: 'charmander', rank: 1, boost: 0}];
  for (let i = 0; i < 30 * 4 && s.hand.length < 2 && s.hand[0].rank === 1; i++) step(s, 1 / 30);
  assert.equal(s.hand[0].species, 'charmeleon'); assert.equal(s.hand[0].rank, 2);
  s.hand = [{uid: 91, species: 'charmeleon', rank: 2, boost: 0}, {uid: 92, species: 'charmander', rank: 1, boost: 0}];
  s.dealAt = 0; step(s, 1 / 30);
  assert.deepEqual(s.hand.map((c) => [c.species, c.rank]), [['charizard', 3]], 'charmander+charmander -> charmeleon, then charmeleon+charmeleon -> charizard');
});

test('dragging a card next to an identical one merges them', () => {
  const s = game();
  const c = (uid, species, rank = 1) => ({uid, species, rank, boost: 0});
  s.hand = [c(1, 'bulbasaur'), c(2, 'squirtle'), c(3, 'mew'), c(4, 'charmander'), c(5, 'bulbasaur'), c(6, 'charmander'), c(7, 'squirtle')];
  moveCard(s, 4, 1);
  assert.equal(s.hand[0].species, 'ivysaur', '青螺靈 + 青螺靈 -> 紫羽螺');
  assert.ok(s.hand.some((x) => x.species === 'charmeleon'), 'moving made the two 剝皮辣椒雞 adjacent, so they merged too');
  s.hand = [c(10, 'mew', 2), c(11, 'squirtle'), c(12, 'mew', 2)];
  moveCard(s, 2, 1);
  assert.deepEqual(s.hand.map((x) => [x.species, x.rank]), [['mew', 3], ['squirtle', 1]], 'support cards star up instead of evolving');
});

test('merging follows the cave evolution table, random branches included', () => {
  const s = game();
  assert.ok(['groudon', 'rayquaza'].includes(mergeResult(s, {species: 'kyogre', rank: 1, boost: 0}).species));
  assert.deepEqual(mergeResult(s, {species: 'charizard', rank: 1, boost: 0}), {species: 'charizard', rank: 2, boost: 1}, 'final forms get stronger');
  assert.deepEqual(mergeResult(s, {species: 'monferno', rank: 2, boost: 0}), {species: 'monferno', rank: 3, boost: 0});
  assert.equal(mergeResult(s, {species: 'monferno', rank: 3, boost: 0}), null);
});

test('playing a spirit card summons it; a support card casts its skill', () => {
  const s = game();
  s.hand = [{uid: 1, species: 'charmander', rank: 1, boost: 0}, {uid: 2, species: 'monferno', rank: 3, boost: 0}];
  playCard(s, 0);
  assert.equal(s.fighters.filter((f) => f.side === 'ally').length, 1);
  assert.ok(isSupport('monferno'));
  playCard(s, 0);
  assert.equal(s.freezeUntil, 0, 'the skill waits for the entrance');
  while (!s.freezeUntil) step(s, 1 / 60);
  assert.ok(Math.abs(s.freezeUntil - s.time - Math.min(4.5, SUPPORT.monferno.duration[2])) < 0.02, '藍金星輝法師 ★3 freezes for 4.5 s (control capped by V2 rules)');
  assert.equal(s.hand.length, 0);
});

test('the lane holds at most MAX_ALLIES spirits', () => {
  const s = game();
  for (let i = 0; i < MAX_ALLIES; i++) { s.hand.unshift({uid: 500 + i, species: 'squirtle', rank: 3, boost: 2}); playCard(s, 0); }
  s.hand.unshift({uid: 999, species: 'squirtle', rank: 3, boost: 2});
  assert.equal(canPlay(s, 0), false);
  assert.throws(() => playCard(s, 0));
});

test('damage lands at the animation release time reported by the view', () => {
  const s = game({hooks: {fire: () => ({release: 0.6, hold: 0.9})}});
  s.hand = [{uid: 1, species: 'charmander', rank: 1, boost: 0}]; playCard(s, 0);
  let fired = null, hit = null;
  for (let i = 0; i < 3000 && hit === null; i++) {
    step(s, 1 / 30);
    for (const ev of s.events) { if (ev.type === 'fire' && ev.side === 'ally' && fired === null) fired = s.time; if (ev.type === 'release' && ev.side === 'ally' && hit === null) hit = s.time; }
    s.events.length = 0;
  }
  assert.ok(hit - fired >= 0.55, `released after ${hit - fired}`);
});

test('hits report damage for the view', () => {
  const s = game(); s.hand = [{uid: 1, species: 'charmander', rank: 1, boost: 0}]; playCard(s, 0);
  let hits = 0;
  for (let i = 0; i < 30 * 40 && !hits; i++) { step(s, 1 / 30); hits += s.events.filter((e) => e.type === 'hit' && e.amount > 0).length; s.events.length = 0; }
  assert.ok(hits > 0);
});

test('enemies follow the cave encounter rules: yellow monsters, purple then red bosses', () => {
  const frame = (id) => spirits.find((s) => s.id === id).cardFrame || 'yellow';
  const banned = new Set(['jigglypuff', ...pool.excludedIds]);
  STAGES.forEach((s, i) => {
    for (const g of s.groups) { assert.equal(frame(g.species), 'yellow', `${s.name} ${g.species}`); assert.ok(!banned.has(g.species)); }
    assert.ok(s.boss, `${s.name} has a boss on the nest`);
    assert.equal(frame(s.boss), i < 5 ? 'purple' : 'red', `${s.name} boss ${s.boss}`);
    assert.deepEqual(s.traps, [], `${s.name} starts with a clear road`);
  });
  assert.ok(new Set(STAGES.map((s) => s.scene)).size === STAGES.length, 'every stage has its own scenery');
});

test('the road is clear until the player lays a trap card; placed traps slow, hurt, count and expire', () => {
  const s = game({stageIndex: 1});
  assert.equal(s.traps.length, 0, 'no obstacle before a trap card is used');
  assert.equal(placeTrap(s, 'spike', s.left - 5), null, 'cannot place off the road');
  assert.equal(placeTrap(s, 'nope', 0), null);
  const trap = placeTrap(s, 'spike', 0); assert.ok(trap && s.traps.length === 1);
  s.hand = [{uid: 1, species: 'squirtle', rank: 3, boost: 2}]; playCard(s, 0);
  const f = s.fighters[0]; f.x = trap.x; const hp = f.hp;
  s.time = trap.next - 0.01; step(s, 1 / 30);
  assert.ok(f.hp < hp, 'the spike trap hurt our spirit');
  const m = game({stageIndex: 1}), mud = placeTrap(m, 'mud', 0);
  m.hand = [{uid: 1, species: 'squirtle', rank: 1, boost: 0}]; playCard(m, 0);
  const g = m.fighters[0]; g.x = mud.x + 0.2; m.spawnAt = m.spawnAt.map(() => 1e9);
  const before = g.x; step(m, 0.5);
  assert.ok(Math.abs(before - g.x) <= g.speed * 0.5 * TRAPS.mud.slow + 1e-6, 'mud halves walking speed');
  const c = game({stageIndex: 0});
  for (let i = 0; i < MAX_TRAPS; i++) assert.ok(placeTrap(c, 'mud', -8 + i * 3), 'trap ' + i);
  assert.equal(placeTrap(c, 'mud', 8), null, 'at most ' + MAX_TRAPS + ' active traps');
  c.time += TRAP_LIFE + 1; step(c, 1 / 30);
  assert.ok(c.traps.every((x) => x.expired), 'traps vanish after ' + TRAP_LIFE + ' seconds');
  assert.ok(placeTrap(c, 'mud', 8), 'expired traps free their slot');
  assert.equal(Object.keys(TRAP_CARDS).length, Object.keys(TRAPS).length);
});

test('gacha supplies work in the fight: potion, battery and the two buffs', () => {
  const s = game({stageIndex: 0});
  s.hand = [{uid: 1, species: 'squirtle', rank: 1, boost: 0}]; playCard(s, 0);
  const a = s.fighters[0]; a.hp = a.maxHp * 0.2; s.crystal.hp = s.crystal.maxHp * 0.5;
  assert.ok(useBagItem(s, 'potion')); assert.ok(a.hp > a.maxHp * 0.55 && s.crystal.hp > s.crystal.maxHp * 0.5);
  a.ultAt = s.time + 99; assert.ok(useBagItem(s, 'battery')); assert.ok(a.ultAt <= s.time);
  for (let i = 0; i < 12; i++) useBagItem(s, 'buff-attack'); assert.equal(s.buffs.attack, 1, 'attack buff is capped at +100%');
  for (let i = 0; i < 12; i++) useBagItem(s, 'buff-defense'); assert.equal(s.buffs.guard, 0.5, 'defense buff is capped at 50%');
  assert.equal(useBagItem(s, 'ball-basic'), false, 'balls have no use in the island fight');
  assert.deepEqual(Object.keys(BAG_ITEMS), ['potion', 'revive', 'battery', 'buff-attack', 'buff-defense']);
});

test('critical hits happen about one in ten and deal extra damage', () => {
  const s = game(); s.hand = [{uid: 1, species: 'charmander', rank: 3, boost: 2}]; playCard(s, 0);
  let crits = 0, hits = 0;
  for (let i = 0; i < 30 * 200; i++) { step(s, 1 / 30); for (const e of s.events) if (e.type === 'hit' && e.amount > 0) { hits++; if (e.crit) crits++; } s.events.length = 0; if (s.result) break; }
  assert.ok(hits > 20 && crits > 0 && crits / hits < 0.3, `${crits}/${hits}`);
  assert.equal(CRIT.mult, 1.75);
});

/* A bot that plays like a careful player: keeps pairs in hand to merge, plays strong cards and unpaired cards,
   casts support skills when the lane is crowded. */
export function play(stageIndex, deck = TRIAL_ROSTER, bot = true, seconds = 600) {
  const s = game({stageIndex, deck}); let stock = 16; /* the bot owns six trap cards and lays one whenever a slot of the road is free */
  for (let i = 0; i < 30 * seconds && !s.result; i++) {
    if (bot && stock > 0 && i % 30 === 0) for (const [kind, at] of [['whirl', 0.3], ['geyser', 0.55], ['whirl', 0.8]]) {
      const x = s.left + at * s.path.length;
      if (stock > 0 && !s.traps.some((t) => !t.expired && Math.abs(t.x - x) < 3) && placeTrap(s, kind, x)) stock--;
    }
    if (bot && i % 6 === 0) {
      const foes = s.fighters.filter((f) => f.side === 'enemy' && f.hp > 0), h = s.hand;
      const support = h.findIndex((c) => isSupport(c.species) && (c.rank >= 2 || foes.length >= 4 || foes.some((f) => s.crystal.x - f.x < 8)));
      if (support >= 0) playCard(s, support);
      else if (h.length >= 4 || foes.some((f) => s.crystal.x - f.x < 10)) {
        const paired = (k) => (h[k - 1]?.species === h[k].species && h[k - 1]?.rank === h[k].rank) || (h[k + 1]?.species === h[k].species && h[k + 1]?.rank === h[k].rank);
        const order = h.map((_, k) => k).filter((k) => !isSupport(h[k].species)).sort((a, b) => (paired(a) - paired(b)) || (h[b].rank - h[a].rank));
        if (order.length && canPlay(s, order[0])) playCard(s, order[0]);
      }
    }
    step(s, 1 / 30);
    s.events.length = 0;
  }
  return s;
}

const SUPPORT_DECK = ['charmander', 'squirtle', 'bulbasaur', 'torchic', 'infernape', 'pikachu'];

test('trial deck clears the early stages; doing nothing loses', () => {
  for (let i = 0; i < 5; i++) assert.ok(play(i).result?.won, `${STAGES[i].name} lost`);
  assert.equal(play(0, TRIAL_ROSTER, false).result?.won, false);
});

test('a deck with support cards can clear the final stage', () => {
  assert.ok(play(STAGES.length - 1, SUPPORT_DECK, true, 900).result?.won, "with its trap cards the support deck clears the last stage");
  assert.notEqual(play(STAGES.length - 1).result?.won, true, 'the trial deck alone should not clear 水蛟深淵');
});

test('dealing is slower and stops while a card is being dragged', () => {
  const g = game(), count = () => g.hand.length;
  const before = count();
  g.dragging = true;
  for (let i = 0; i < 600; i++) step(g, 1 / 60);
  assert.equal(count(), before, 'no cards dealt during 10 s of dragging');
  g.dragging = false;
  for (let i = 0; i < 60 * 3.5; i++) step(g, 1 / 60);
  assert.equal(count(), before + 1, 'one card every 3.2 s once the drag ends');
});

test('a non-waterfall boss stays on its barrel until 60% HP and casts its ultimate at spirits', async () => {
  const {BOSS_OUT_AT, BOSS_SKILL_FIRST, SKILL_WINDUP, bossSkillDamage} = await import('../js/rules.js');
  const s = game({stageIndex: 1});
  s.hand = [{uid: 1, species: 'charmander', rank: 1, boost: 0}]; playCard(s, 0);
  const ally = s.fighters.find((f) => f.side === 'ally'); ally.x = s.right - 1; ally.speed = 0;
  while (s.time < BOSS_SKILL_FIRST - 0.05) step(s, 1 / 60);
  const before = ally.hp;
  while (s.time < BOSS_SKILL_FIRST + SKILL_WINDUP + 0.05) step(s, 1 / 60);
  assert.ok(before - ally.hp >= ally.maxHp * bossSkillDamage(1) * 0.5, 'the boss ultimate hit the spirit');
  s.nest.hp = s.nest.maxHp * (BOSS_OUT_AT + 0.02); s.events.length = 0;
  ally.x = s.left + 2; ally.speed = 0; ally.cooldown = 0;
  for (let i = 0; i < 60 * 20 && !s.bossOut; i++) { ally.hp = ally.maxHp; s.fighters = s.fighters.filter((f) => f.side === 'ally'); step(s, 1 / 60); }
  assert.ok(s.bossOut, 'the boss jumps down once the nest is below 60%');
});

test('third-island thunder is occasional, road-anchored, damages all field spirits, and never changes bases or sky', async () => {
  const {WATERFALL_THUNDER}=await import('../js/rules.js');
  const s=game({stageIndex:2,deferDeal:true});
  assert.equal(s.stage.id,'waterfall');
  assert.ok(s.nextWeatherLightningAt>=12 && s.nextWeatherLightningAt<22);
  s.started=true;
  const fighter=(id,side,x)=>({
    id,side,x,z:0,hp:100,maxHp:100,attack:0,speed:0,
    statuses:{},guard:0,barrierHp:0,regen:0,knockLeft:0,
    cooldown:999,profile:{reach:1},stationary:true,moving:false,
    stunUntil:0,busyUntil:0,knockUntil:0,role:'warrior'
  });
  const left=fighter(90001,'ally',s.right-1);
  const right=fighter(90002,'enemy',s.left+1);
  s.fighters.push(left,right);
  const bases=[s.crystal.hp,s.nest.hp];
  s.nextWeatherLightningAt=0.01;
  step(s,0.02);
  const strikes=s.events.filter(ev=>ev.type==='weatherLightning');
  assert.equal(strikes.length,1);
  assert.ok(strikes[0].x>=s.left && strikes[0].x<=s.right,'strike stays on the road');
  assert.equal(strikes[0].damageRatio,WATERFALL_THUNDER.damageRatio);
  assert.ok(left.hp<100 && right.hp<100,'both living sides are damaged');
  assert.deepEqual([s.crystal.hp,s.nest.hp],bases,'bases do not take weather damage');
  assert.ok(s.nextWeatherLightningAt-s.time>=18 && s.nextWeatherLightningAt-s.time<=30);
  step(s,0.2);
  assert.equal(s.events.filter(ev=>ev.type==='weatherLightning').length,1,'no rapid-fire strikes');
});

test('fourth through tenth stages and random PK arenas never schedule independent thunderstorms', async () => {
  const {PK_STAGE,pkArenaFor}=await import('../js/rules.js');
  assert.equal(PK_STAGE.crystal,1800,'host barrel HP is halved');
  assert.equal(PK_STAGE.nest,1800,'rival barrel HP is halved');
  for(let i=3;i<STAGES.length;i++) {
    const s=game({stageIndex:i,deferDeal:true});
    assert.equal(s.nextWeatherLightningAt,Infinity,STAGES[i].name+' must not switch weather');
  }
  for(let i=0;i<10;i++) {
    const s=game({stage:pkArenaFor(i),foeDeck:TRIAL_ROSTER,deferDeal:true});
    assert.equal(s.crystal.maxHp,1800,'PK host health');
    assert.equal(s.nest.maxHp,1800,'PK guest health');
    assert.equal(s.nextWeatherLightningAt,Infinity,'PK disables weather AOE even on waterfall scenery');
  }
});
