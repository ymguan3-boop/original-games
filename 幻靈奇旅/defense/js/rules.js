/* 幻靈守護戰 rules: a lane battle along a winding path, with cards dealt into a hand (七大罪 style merging).
   Pure logic (no DOM / Three.js); the view drains state.events.
   Spirits come from the cave roster, attack shapes from the cave profiles (survivors/js/combat-profile.js) and
   evolutions from the cave table (survivors/data/evolution.json). The view's hooks.fire plays the cave attack and
   reports when the hit releases, so damage lands on the animation frame.
   Lane coordinate x runs from state.left (monster nest, path start) to state.right (crystal, path end). */
import {passiveDefinition, effectText, mergeEffects} from '../../survivors/js/passive-rules.js';
import {STAGES, buildPath} from './stages.js?v=20261103-forge-v2';
import {ROLE_SKILLS, roleFor, ultimateFor, basicReach, isPriest, ULTIMATE_SPACING} from './role-skills.js?v=20261103-roles-v2';

export {STAGES};
export const ELEMENTS = ['光', '焰', '森', '潮', '雷', '念'];
export const ELEMENT_COLORS = {光: 0xffe5a1, 焰: 0xff853e, 森: 0x6fe5a0, 潮: 0x58caff, 雷: 0xffdc43, 念: 0xc091ff};
/* Element riders use the cave's status names. */
export const ELEMENT_EFFECTS = {焰: {status: 'burn', label: '燃燒'}, 森: {status: 'poison', label: '中毒'}, 潮: {status: 'slow', label: '緩速'}, 雷: {status: 'paralysis', label: '麻痺'}, 光: {status: 'weaken', label: '虛弱'}, 念: {status: 'weaken', label: '虛弱'}};
export const SHAPES = {
  melee: {label: '近戰單體', rate: 1.0}, ranged: {label: '遠程單體', rate: 1.2}, tracking: {label: '連鎖', rate: 1.3},
  blast: {label: '爆裂範圍', rate: 1.5}, cone: {label: '扇形範圍', rate: 1.4}, area: {label: '範圍', rate: 1.4},
  global: {label: '全場', rate: 1.6}, self: {label: '治癒支援', rate: 1.6},
};
const RARITY_HP = {普通: 4.5, 進階: 4.6, 稀有: 4.8, 珍稀: 5, 傳說: 5.5};
export const HAND_SIZE = 6, MAX_ALLIES = 20, MAX_RANK = 3;
/* Every summoned spirit (and the boss) has its own cave ultimate on a cooldown, by card frame; the first one is
   ready after ULT_FIRST of the cooldown. The cave "技能冷卻" passive shortens it. */
export const ULT_CD = {yellow: 10, purple: 11, red: 12, boss: 13}, ULT_FIRST = 0.5;
/* A deck is 4 base spirits (unevolved yellow / purple cards, plus 三色蛋) and 2 red support cards. */
export const DECK_BASE = 4, DECK_RED = 2, DECK_SIZE = DECK_BASE + DECK_RED;
export const DEAL_EVERY = 3.2;
/* monsters spawn at the same pace relative to the deal as when cards came every 2.4 s */
const SPAWN_PACE = DEAL_EVERY / 2.4;
/* critical hits, as in the cave config (critChance / critMultiplier) */
export const CRIT = {chance: 0.1, mult: 1.75};
/* Road traps: zones slow / weaken / poison anyone inside; points fire on a timer (warning shown TRAP_WARN s before). */
export const TRAPS = {
  mud: {name: '泥沼', zone: true, slow: 0.5}, whirl: {name: '漩渦', zone: true, slow: 0.35},
  rune: {name: '符文陣', zone: true, weaken: true}, poison: {name: '毒蘑菇', zone: true, poison: 0.035},
  spike: {name: '尖刺', every: 3, radius: 1.1, damage: 0.07}, shock: {name: '電擊板', every: 3.5, radius: 1.2, damage: 0.03, stun: 0.8},
  geyser: {name: '間歇泉', every: 4.5, radius: 1.5, damage: 0.12, knock: 2},
};
export const TRAP_WARN = 0.8;
const FLYING = /avian-evolution|moon-owl|green-eye-bat|light-phoenix/;
/* Free trial cards so the mode is playable before the cave collection has enough spirits. */
export const TRIAL_BASE = ['charmander', 'squirtle', 'bulbasaur', 'cyndaquil', 'piplup'];
export const TRIAL_RED = ['mew', 'monferno'];
export const TRIAL_ROSTER = [...TRIAL_BASE.slice(0, DECK_BASE), ...TRIAL_RED];
/* Items: each has its own cooldown (seconds) and starts half charged. */
export const ITEMS = {
  reshuffle: {name: '重新發牌', icon: '🔄', cooldown: 18, text: '收回全部手牌，重新發同樣張數的新牌'},
  quickdeal: {name: '加速發牌', icon: '🃏', cooldown: 25, text: '立刻多發 2 張牌'},
  sort: {name: '整理合成', icon: '✨', cooldown: 30, text: '把相同的卡排在一起，能合成的立刻合成'},
};

/* Spirits without any evolution become support cards: tapping one casts its skill. Values are per ★1/★2/★3. */
export const SUPPORT = {
  monferno: {skill: '天穹星陣', kind: 'freeze', text: '全場魔物冰凍', duration: [6, 8, 10]},
  chimchar: {skill: '六芒追星連射', kind: 'volley', text: '六發追星彈擊中最強的魔物', power: [140, 230, 360]},
  infernape: {skill: '天墜裂地', kind: 'quake', text: '全場重擊並擊退魔物', power: [120, 200, 320]},
  dialga: {skill: '毒光雷彈', kind: 'plague', text: '全場魔物中毒並虛弱', power: [30, 50, 80], duration: [8, 8, 10]},
  pikachu: {skill: '彩虹光束', kind: 'beam', text: '從基地射出光束，貫穿路上的魔物', power: [260, 430, 680]},
  mew: {skill: '紫波連環', kind: 'heal', text: '回復全體幻靈與基地', power: [0.5, 0.75, 1], crystal: [0.05, 0.08, 0.12]},
  wigglytuff: {skill: '小山震地', kind: 'shield', text: '我方幻靈無敵', duration: [4, 6, 8]},
  blissey: {skill: '鳳羽連射', kind: 'haste', text: '我方幻靈攻擊速度加倍', duration: [6, 8, 10]},
};

/* Elements remain an aesthetic identifier for native animation only; no damage counter multipliers. */
export function elementMultiplier() { return 1; }

export function evolutionsOf(evolution, id) { const rule = evolution?.[id]; return Array.isArray(rule?.next) ? rule.next : rule?.next ? [rule.next] : []; }
export const isSupport = (id) => !!SUPPORT[id];

/* Cave roster: owned spirits in the cave account (phantom_journey_v1.firstlight), team members first. */
/* Spirits the player may never deploy: the cave summon pool's excludedIds (寶箱怪 and 書本怪 families). */
export function playable(ids, excluded = []) { const out = new Set(excluded); return ids.filter((id) => !out.has(id)); }

/* Base card: the first form of an evolution chain (nothing evolves into it) — yellow / purple roots and 三色蛋. */
export function isBaseCard(evolution, id) {
  if (!evolutionsOf(evolution, id).length) return false;
  for (const rule of Object.values(evolution || {})) if ((Array.isArray(rule?.next) ? rule.next : [rule?.next]).includes(id)) return false;
  return true;
}
/* Red card: the support legends (every red card except 水蛟龍王, which is evolved into, and 三色蛋, a base card). */
export const isRedCard = (id) => !!SUPPORT[id];

export function caveRoster(progress = {}, legacy = null) {
  const cave = progress.firstlight || legacy || {};
  const owned = Array.isArray(cave.owned) ? cave.owned : [], team = Array.isArray(cave.team) ? cave.team : [];
  return [...team.filter((id) => owned.includes(id)), ...owned.filter((id) => !team.includes(id))];
}

/* V2 basic reach is class-based: warrior 1.7 / archer 5.1 / mage and priest 8.5.
   Ultimate reach, area and target strategy come from its own 61-entry profile.
   Never read an element weakness or auto-apply status based on the element. */
export function profileFor(spec, entry, strong = false) {
  const role = roleFor(spec.id), skill = ultimateFor(spec.id);
  const basic = role.basic === 'melee' ? 'melee' : 'ranged';
  if (!strong || !skill || skill.kind === 'support') {
    return {type: basic, reach: role.basic === 'none' ? 8.5 : role.range, radius: 0, ranged: basic !== 'melee', chain: false};
  }
  const k = skill.kind;
  const type = k === 'heal' || k === 'heal_team' || k === 'shield' || k === 'regen' ? 'self' :
    k === 'global' ? 'global' : k === 'line' || k === 'chain' ? 'tracking' :
    k === 'blast' ? 'blast' : k === 'cone' ? 'cone' : k === 'area' ? 'area' : basic;
  const radius = ['blast', 'cone', 'area'].includes(type) ? (skill.radius || 2.2) : 0;
  const reach = type === 'self' ? role.range : type === 'global' ? 1000 :
    k === 'line' || k === 'chain' ? Math.max(role.range, 7.5) :
    type === 'blast' || type === 'cone' ? Math.max(role.range, role.basic === 'melee' ? 2.4 : 8.5) : role.range;
  return {type, reach, radius, ranged: type !== 'melee' && type !== 'area' && type !== 'self',
    chain: k === 'chain' || k === 'line', targets: skill.targets || (k === 'line' ? 5 : 3), skill};
}

/* Base stats of a spirit on the lane. Enemies scale with the stage; boosts come from merges past the last evolution. */
/* The cave card passives (survivors/js/passive-rules.js), summed per effect. Species without a cave passive
   profile (for example 三色蛋) have none. */
export function passivesOf(spec) {
  try { const def = passiveDefinition(spec); return {ultimateName: def.ultimateName, effects: mergeEffects(def.effects)}; }
  catch { return {ultimateName: spec?.skills?.[1]?.name || '', effects: []}; }
}
export const passiveLines = (spec) => passivesOf(spec).effects.map(effectText);
export const ultCooldown = (spec, boss = false) => {
  const cd = passivesOf(spec).effects.find((e) => e.effect === 'cooldown')?.value || 0;
  return (boss ? Math.max(19, ultimateFor(spec.id)?.cooldown || 20) : (ultimateFor(spec.id)?.cooldown || 18)) * (1 - Math.min(0.4, cd));
};

/* Gacha points per kill, shared with the endless cave (same scale as its drops: 3 / 8 / 15 by tier, 200 for a
   小魔王 and 300 for a 大魔王). Stages 1-3 are tier 1, 4-6 tier 2, 7-10 tier 3; bosses are purple before stage 6. */
export function killPoints(stageIndex, boss = false) {
  if (boss) return stageIndex < 5 ? 200 : 300;
  return stageIndex < 3 ? 3 : stageIndex < 6 ? 8 : 15;
}

export function fighterStats(spec, entry, side, scale = 1, boost = 0) {
  const profile = profileFor(spec, entry, false), ally = side === 'ally', k = 1 + 0.5 * boost;
  return {
    hp: Math.round(spec.hp * (ally ? (RARITY_HP[spec.rarity] || 4.8) * k : 1.8 * scale)),
    attack: spec.attack * (ally ? k : 0.95 * scale) * (roleFor(spec.id).basic === 'melee' ? 1.15 : 1),
    speed: spec.stage >= 3 ? 1.3 : ['run', 'fly', 'hop'].includes(spec.motionType) ? 2.2 : 1.7,
    profile, rate: roleFor(spec.id).basic === 'melee' ? 1.05 : roleFor(spec.id).basic === 'ranged' ? 1.2 : 1.45, knockbacks: ally ? 3 : spec.stage >= 3 ? 2 : 1,
  };
}

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export function createGame({stageIndex = 0, deck, spirits, catalog = {}, evolution = {}, hooks = {}, seed = Date.now(), deferDeal = false}) {
  const stage = STAGES[stageIndex], spiritMap = new Map(spirits.map((s) => [s.id, s])), path = buildPath(stage.path), half = path.length / 2;
  const state = {
    stage, stageIndex, path, spirits: spiritMap, entries: new Map((catalog.entries || []).map((e) => [e.id, e])), evolution, hooks, random: rng(seed),
    deck: deck.filter((id) => spiritMap.has(id)).slice(0, DECK_SIZE), hand: [], dealAt: DEAL_EVERY, nextCard: 1, started: !deferDeal,
    left: -half, right: half, time: 0, itemReady: Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.cooldown / 2])), pendingSkills: [], pendingBoss: [], bossSkillAt: BOSS_SKILL_FIRST, nextUltimateAt: 0, freezeUntil: 0, shieldUntil: 0, hasteUntil: 0,
    crystal: {hp: stage.crystal, maxHp: stage.crystal, x: half}, nest: {hp: stage.nest, maxHp: stage.nest, x: -half},
    traps: (stage.traps || []).map((t, i) => ({...TRAPS[t.kind], kind: t.kind, x: -half + t.at * path.length, half: (t.len || 0) * path.length / 2, next: 3 + i * 0.7})),
    fighters: [], shots: [], events: [], nextId: 1, spawnAt: stage.groups.map((g) => g.start), spawned: stage.groups.map(() => 0), bossOut: false,
    stats: {summons: 0, kills: 0, merges: 0, skills: 0, points: 0}, result: null,
  };
  if (!deferDeal) for (let i = 0; i < 3; i++) deal(state);
  return state;
}

/* The live battle defers every card—including the first 3—until its scene
   has actually rendered to the player. Pure logic tests keep legacy immediate
   dealing unless deferDeal=true is explicitly supplied. Safe to call once. */
export function beginDealing(state) {
  if (!state || state.started || state.result) return false;
  state.started = true;
  state.time = 0;
  state.dealAt = DEAL_EVERY;
  for (let i = 0; i < 3; i++) deal(state);
  return true;
}

function emit(state, type, data = {}) { state.events.push({...data, type}); }
export function alliesOnField(state) { return state.fighters.filter((f) => f.side === 'ally' && f.hp > 0).length; }

/* ---------- hand: deal, merge (七大罪 style), play ---------- */
function deal(state) {
  if (!state.deck.length || state.hand.length >= HAND_SIZE) return null;
  const species = state.deck[Math.floor(state.random() * state.deck.length)];
  const card = {uid: state.nextCard++, species, rank: 1, boost: 0};
  state.hand.push(card);
  emit(state, 'deal', {uid: card.uid});
  mergeHand(state);
  return card;
}

/* What a card turns into when two identical neighbours merge: the cave's next evolution (random branches pick at
   random, like the cave), or the same spirit one star stronger when it has no further form. */
export function mergeResult(state, card) {
  if (card.rank >= MAX_RANK) return null;
  const next = isSupport(card.species) ? [] : evolutionsOf(state.evolution, card.species).filter((id) => state.spirits.has(id));
  if (next.length) {
    const to = state.evolution[card.species]?.branch === 'random' ? next[Math.floor(state.random() * next.length)] : next[0];
    return {species: to, rank: card.rank + 1, boost: card.boost};
  }
  return {species: card.species, rank: card.rank + 1, boost: isSupport(card.species) ? 0 : card.boost + 1};
}

/* Adjacent identical cards (same spirit, same star) merge, and merges cascade. */
function mergeHand(state) {
  for (let again = true; again;) {
    again = false;
    for (let i = 0; i + 1 < state.hand.length; i++) {
      const a = state.hand[i], b = state.hand[i + 1];
      if (a.species !== b.species || a.rank !== b.rank) continue;
      const r = mergeResult(state, a); if (!r) continue;
      const merged = {uid: state.nextCard++, ...r};
      state.hand.splice(i, 2, merged); state.stats.merges++;
      emit(state, 'merge', {uid: merged.uid, a: a.uid, b: b.uid, index: i, from: a.species, to: merged.species, rank: merged.rank, evolved: merged.species !== a.species});
      again = true; break;
    }
  }
}

/* Drag-and-drop: move a card to another place in the hand (index in the hand after removing it), then merge
   any identical neighbours, so placing two identical cards side by side evolves / stars them up. */
export function moveCard(state, from, to) {
  const card = state.hand[from]; if (!card) return false;
  state.hand.splice(from, 1);
  state.hand.splice(Math.max(0, Math.min(state.hand.length, to)), 0, card);
  emit(state, 'move', {uid: card.uid});
  mergeHand(state);
  return true;
}

export function canPlay(state, i) { const c = state.hand[i]; return !!c && (isSupport(c.species) || alliesOnField(state) < MAX_ALLIES); }

export function playCard(state, i) {
  const card = state.hand[i]; if (!card) throw Error('沒有這張卡');
  if (isSupport(card.species)) castSupport(state, card);
  else {
    if (alliesOnField(state) >= MAX_ALLIES) throw Error(`場上最多 ${MAX_ALLIES} 隻幻靈`);
    spawn(state, 'ally', card.species, {boost: card.boost, rank: card.rank});
    state.stats.summons++;
  }
  state.hand.splice(i, 1);
  emit(state, 'play', {uid: card.uid, species: card.species, rank: card.rank});
  mergeHand(state);
  return card;
}

/* A support card first plays its entrance (the spirit jumps out of the card to face the player, then turns to the
   field): skillStart now, the effect lands SKILL_WINDUP seconds later with the skill event. */
export const SKILL_WINDUP = 1.1;
/* While on its barrel the boss casts its own cave ultimate at every summoned spirit now and then (the same
   entrance as a skill card: off the barrel to the front of the screen, turn, cast). */
export const BOSS_OUT_AT = 0.6, BOSS_SKILL_FIRST = 16;
export const bossSkillEvery = (stageIndex) => Math.max(18, 26 - stageIndex);
export const bossSkillDamage = (stageIndex) => 0.1 + stageIndex * 0.006;
/* Shared heavy-animation gate: support, boss and fighter ultimates all reserve one
   1.8s visual slot. Queueing never holds the browser or spawns multiple casters at once. */
function castSupport(state, card) {
  const start = Math.max(state.time, state.nextUltimateAt), at = start + SKILL_WINDUP;
  state.nextUltimateAt = at + ULTIMATE_SPACING;
  const job = {card: {...card}, start, at, started: false};
  state.pendingSkills.push(job);
  if (start <= state.time) startSupport(state, job);
}
function startSupport(state, job) {
  if (job.started) return;
  job.started = true;
  const card = job.card, s = SUPPORT[card.species];
  emit(state, 'skillStart', {species: card.species, kind: s.kind, rank: card.rank, skill: s.skill, element: state.spirits.get(card.species).type});
}
function startBossSkill(state, job) {
  if (job.started || state.bossOut) return;
  job.started = true;
  emit(state, 'bossSkillStart', {species: state.stage.boss, element: state.spirits.get(state.stage.boss).type});
}
function applySupport(state, card) {
  const s = SUPPORT[card.species], r = card.rank - 1, foes = state.fighters.filter((f) => f.side === 'enemy' && f.hp > 0), allies = state.fighters.filter((f) => f.side === 'ally' && f.hp > 0);
  const scale = 1 + state.stageIndex * 0.25, element = state.spirits.get(card.species).type;
  if (s.kind === 'freeze') state.freezeUntil = state.time + Math.min(4.5, s.duration[r]);
  else if (s.kind === 'volley') foes.sort((a, b) => b.hp - a.hp).slice(0, 6).forEach((f) => hurt(state, f, s.power[r] * scale, element, null, true));
  else if (s.kind === 'quake') foes.forEach((f) => { hurt(state, f, s.power[r] * scale, element, null, true); if (f.hp > 0) knock(state, f, 2.4); });
  else if (s.kind === 'plague') foes.forEach((f) => { f.statuses.poison = {until: state.time + s.duration[r], dps: s.power[r] * scale}; f.statuses.weaken = {until: state.time + s.duration[r]}; });
  else if (s.kind === 'beam') foes.filter((f) => state.crystal.x - f.x <= (state.right - state.left) * 0.6).forEach((f) => hurt(state, f, s.power[r] * scale, element, null, true));
  else if (s.kind === 'heal') {
    allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id - b.id)
      .filter((f) => f.hp < f.maxHp).slice(0, Math.min(8, allies.length))
      .forEach((f) => healOne(state, f, f.maxHp * Math.min(0.7, s.power[r]), {id: -1}));
    state.crystal.hp = Math.min(state.crystal.maxHp, state.crystal.hp + state.crystal.maxHp * s.crystal[r]);
  }
  else if (s.kind === 'shield') state.shieldUntil = state.time + Math.min(3.5, s.duration[r]);
  else if (s.kind === 'haste') state.hasteUntil = state.time + Math.min(5, s.duration[r]);
  state.stats.skills++;
  emit(state, 'skill', {species: card.species, kind: s.kind, rank: card.rank, skill: s.skill, element});
}

/* ---------- fighters ---------- */
function spawn(state, side, speciesId, {boss = false, boost = 0, rank = 1} = {}) {
  const spec = state.spirits.get(speciesId), st = fighterStats(spec, state.entries.get(speciesId), side, state.stage.scale, boost), ally = side === 'ally';
  const passiveHp = ally || boss ? passivesOf(spec).effects.find((e) => e.effect === 'hp')?.value || 0 : 0;
  const hp = Math.round(st.hp * (boss ? 5 : 1) * (1 + passiveHp)), knocks = boss ? 4 : st.knockbacks;
  /* allies (and the boss) carry their cave passives: stat bonuses plus on-hit status chances */
  const pv = ally || boss ? passivesOf(spec).effects : [], p = Object.fromEntries(pv.map((e) => [e.effect, e.value]));
  const ultCd = ultCooldown(spec, boss);
  const f = {id: state.nextId++, side, species: speciesId, role: ROLE_SKILLS[speciesId]?.role || 'warrior', type: spec.type, stage: spec.stage, rank, boss, flying: FLYING.test(spec.model + spec.family),
    ultCd, ultAt: state.time + ultCd * ULT_FIRST, critBonus: p.crit || 0, guard: Math.min(0.5, (p.defense || 0) + (p.reduction || 0)), regen: p.regen || 0,
    reachMul: 1 + (p.range || 0), healMul: 1 + (p.heal || 0), procs: pv.filter((e) => e.effect.startsWith('proc-')).map((e) => ({type: e.effect.slice(5), chance: Math.min(0.65, e.value)})),
    x: ally ? state.right - 1.5 : state.left + 1.5, z: (state.random() - 0.5) * 1.6, hp, maxHp: hp, attack: st.attack * (boss ? 1.2 : 1) * (1 + (p.attack || 0)), speed: st.speed * (boss ? 0.6 : 1) * (1 + (p.speed || 0)),
    rate: st.rate, profile: st.profile, knockTotal: knocks, knockLeft: knocks, nextKnock: hp * knocks / (knocks + 1),
    cooldown: 0.4, busyUntil: 0, knockUntil: 0, stunUntil: 0, attacks: 0, kills: 0, statuses: {}, moving: true};
  state.fighters.push(f);
  emit(state, 'spawn', {id: f.id, side, boss, rank});
  return f;
}

export function itemReady(state, id) { return state.time >= state.itemReady[id]; }

export function useItem(state, id) {
  if (!ITEMS[id] || !itemReady(state, id)) return false;
  state.itemReady[id] = state.time + ITEMS[id].cooldown;
  if (id === 'reshuffle') { const n = Math.max(3, state.hand.length); state.hand = []; for (let i = 0; i < n; i++) deal(state); }
  else if (id === 'quickdeal') { deal(state); deal(state); }
  else if (id === 'sort') {
    /* group identical cards (same spirit and star) in the order they first appear, then let them merge */
    const key = (c) => c.species + '#' + c.rank, order = [...new Set(state.hand.map(key))];
    state.hand.sort((a, b) => order.indexOf(key(a)) - order.indexOf(key(b)));
    mergeHand(state);
  }
  emit(state, 'item', {id});
  return true;
}


const ahead = (f, x) => (f.side === 'ally' ? f.x - x : x - f.x);
const baseOf = (state, f) => (f.side === 'ally' ? state.nest : state.crystal);

/* Nearest opponent in front within reach, else the opposing base. */
function findTarget(state, f, reach) {
  let best = null, bd = Infinity;
  for (const o of state.fighters) {
    if (o.side === f.side || o.hp <= 0) continue;
    const d = ahead(f, o.x);
    if (d >= -0.6 && d <= reach + 0.6 && d < bd) { bd = d; best = o; }
  }
  if (best) return best;
  const base = baseOf(state, f);
  return ahead(f, base.x) <= reach + 1.2 ? base : null;
}

function knock(state, f, distance = 1.6) {
  f.knockUntil = state.time + 0.5; f.busyUntil = 0; f.knockVel = (f.side === 'ally' ? 1 : -1) * distance / 0.5;
  emit(state, 'knockback', {id: f.id});
}

function hurt(state, f, amount, element, source, strong = false, crit = false, kind = null) {
  if (f.hp <= 0) return 0;
  if (f.side === 'ally' && state.shieldUntil > state.time) { emit(state, 'hit', {id: f.id, amount: 0, element, blocked: true}); return 0; }
  let dealt = amount * (f.statuses.weaken?.until > state.time ? 1.2 : 1) *
    (1 - Math.min(0.75, (f.guard || 0) + (f.extraGuardUntil > state.time ? (f.extraGuard || 0) : 0)));
  if (f.barrierHp > 0) { const blocked = Math.min(f.barrierHp, dealt); f.barrierHp -= blocked; dealt -= blocked; }
  f.hp = Math.max(0, f.hp - dealt);
  if (amount >= 1) emit(state, 'hit', {id: f.id, amount: dealt, element, strong, crit, kind});
  if (f.hp === 0) {
    if (source) source.kills++;
    if (f.side === 'enemy') { state.stats.kills++; state.dealAt -= 0.2; const pts = killPoints(state.stageIndex, f.boss); state.stats.points += pts; emit(state, 'points', {amount: pts, x: f.x, z: f.z, boss: f.boss}); }
    emit(state, 'death', {id: f.id, side: f.side, x: f.x, z: f.z});
  } else if (f.knockLeft > 0 && f.hp <= f.nextKnock) {
    /* every 1/(n+1) of max HP lost pushes the spirit back */
    f.knockLeft--; f.nextKnock = f.maxHp * f.knockLeft / (f.knockTotal + 1);
    knock(state, f);
  }
  return dealt;
}

function hurtBase(state, base, amount, side) {
  if (base.hp <= 0) return;
  base.hp = Math.max(0, base.hp - amount);
  emit(state, 'baseHit', {side, hp: base.hp, amount});
  /* the boss stays on its barrel (reacting to hits) until the nest is down to BOSS_OUT_AT, then jumps onto the path */
  if (base === state.nest && !state.bossOut && state.stage.boss && base.hp <= base.maxHp * BOSS_OUT_AT) { state.bossOut = true; state.pendingBoss = []; spawn(state, 'enemy', state.stage.boss, {boss: true}); emit(state, 'boss', {species: state.stage.boss}); }
}

function setStatus(state, f, type, amount, duration = 4) {
  if (f.hp <= 0) return;
  const s = f.statuses, d = Math.max(0.4, Math.min(8, duration));
  if (type === 'burn' || type === 'poison') s[type] = {until: state.time + d,
    dps: Math.max(s[type]?.until > state.time ? s[type].dps : 0, amount * 0.15)};
  else if (type === 'slow') s.slow = {until: state.time + d};
  else if (type === 'weaken') s.weaken = {until: state.time + d};
  else if ((type === 'stun' || type === 'paralysis') && !f.boss && !(f.controlImmuneUntil > state.time)) {
    f.stunUntil = state.time + Math.min(d, 1.2);
    f.controlImmuneUntil = f.stunUntil + 0.8; f.busyUntil = 0;
  } else if (type === 'freeze' && !f.boss && !(f.controlImmuneUntil > state.time)) {
    f.stunUntil = state.time + Math.min(d, 1.6);
    f.controlImmuneUntil = f.stunUntil + 0.8; f.busyUntil = 0;
    s.freeze = {until: f.stunUntil};
  } else if (type === 'knockback' && !f.boss) knock(state, f, 1.2);
}

/* A critical hit still works, but element affinity never changes damage.
   One heavy ultimate at a time; other fighters continue their normal attacks. */
function healingTargets(state, f, reach, count = 1) {
  return state.fighters.filter((x) => x.side === f.side && x.hp > 0 && x.hp < x.maxHp &&
      Math.abs(x.x - f.x) <= reach).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp) || a.id - b.id).slice(0, count);
}
function healOne(state, target, amount, source) {
  if (!target || target.hp <= 0) return;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  if (target.hp > before) emit(state, 'heal', {id: target.id, source: source.id, amount: target.hp - before});
}
function basicPriestHeal(state, f, target) {
  healOne(state, target, target.maxHp * 0.055 * (f.healMul || 1), f);
  f.cooldown = 2.1;
  f.busyUntil = state.time + 0.55;
  emit(state, 'priestCast', {id: f.id, target: target.id, species: f.species});
}
function applyOwnSkill(state, shot, src, friends, foes, at, base) {
  const skill = shot.skill;
  if (!skill || !src) return false;
  if (skill.kind === 'heal') {
    const patients = friends().filter((o) => Math.abs(o.x - src.x) <= shot.profile.reach &&
        o.hp < o.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id - b.id)
        .slice(0, skill.targets || 1);
    for (const o of patients) {
      healOne(state, o, o.maxHp * skill.heal * (src.healMul || 1) * (1 + 0.2 * (src.rank - 1)), src);
      if (skill.shield) o.barrierHp = Math.max(o.barrierHp || 0, o.maxHp * skill.shield);
      if (skill.regen) { o.extraRegen = skill.regen; o.extraRegenUntil = state.time + (skill.duration || 5); }
    }
    if (skill.baseHeal) { const b = src.side === 'ally' ? state.crystal : state.nest; b.hp = Math.min(b.maxHp, b.hp + b.maxHp * skill.baseHeal); }
    if (skill.once) src.usedOnce = true;
    emit(state, 'release', {...info(shot), x: src.x, z: src.z, heal: true});
    return true;
  }
  if (skill.shield) src.barrierHp = Math.max(src.barrierHp || 0, src.maxHp * skill.shield);
  if (skill.guard) { src.extraGuard = skill.guard; src.extraGuardUntil = state.time + (skill.duration || 5); }
  return false;
}
function attack(state, f, target) {
  /* A support-card legend encountered as a stage boss still fights at range
     after leaving the barrel; its signature tower skill is preserved. */
  const baseSkill = ultimateFor(f.species);
  const skill = f.boss && baseSkill?.kind === 'support'
    ? {...baseSkill, kind:'blast', power:2.6, radius:2.6} : baseSkill;
  const isHealerReady = f.role !== 'priest' || healingTargets(state, f, roleFor(f.species).range).length > 0;
  const strong = (f.side === 'ally' || f.boss) && !f.usedOnce && isHealerReady &&
    state.time >= f.ultAt && state.time >= state.nextUltimateAt && !!skill && skill.kind !== 'support';
  if (strong) {
    f.ultAt = state.time + f.ultCd;
    state.nextUltimateAt = state.time + ULTIMATE_SPACING;
    if (skill.once) f.usedOnce = true;
  }
  const spec = state.spirits.get(f.species);
  const profile = strong && f.boss && baseSkill?.kind === 'support'
    ? {type:'blast', reach:8.5, radius:2.6, ranged:true, chain:false, skill}
    : strong ? profileFor(spec, state.entries.get(f.species), true) : f.profile;
  const timing = state.hooks.fire?.(f, target, strong, profile) || {release: 0.25, hold: 0.5};
  const travel = profile.ranged && !['global', 'self', 'area'].includes(profile.type) ? Math.abs(target.x - f.x) / 20 : 0;
  const haste = f.side === 'ally' && state.hasteUntil > state.time ? 0.5 : 1;
  f.attacks++; f.busyUntil = state.time + Math.max(timing.hold || 0, 0.3) * haste;
  f.cooldown = f.rate * haste;
  state.shots.push({id: state.nextId++, from: f.id, side: f.side,
    target: target.id ?? (target === state.nest ? 'nest' : 'crystal'), element: spec.type,
    species: f.species, strong, profile, skill: strong ? skill : null,
    crit: state.random() < CRIT.chance + (f.critBonus || 0),
    damage: f.attack * (strong ? (skill.power || 0) * (1 + 0.3 * (f.rank - 1)) : 1),
    x: target.x, z: target.z || 0, ox: f.x, oz: f.z,
    release: (timing.release || 0) * haste, travel: 0,
    eta: (timing.release || 0) * haste + travel});
  emit(state, strong ? 'ultimate' : 'fire', {id: f.id, side: f.side, element: spec.type, species: f.species});
}
function resolve(state, shot) {
  const src = state.fighters.find((f) => f.id === shot.from);
  const {profile, element, skill} = shot, foeSide = shot.side === 'ally' ? 'enemy' : 'ally';
  const base = shot.side === 'ally' ? state.nest : state.crystal, baseSide = shot.side === 'ally' ? 'nest' : 'crystal';
  const target = typeof shot.target === 'number' ? state.fighters.find((f) => f.id === shot.target) : null;
  const crit = shot.crit ? CRIT.mult : 1;
  const foes = () => state.fighters.filter((o) => o.side === foeSide && o.hp > 0);
  const friends = () => state.fighters.filter((o) => o.side === shot.side && o.hp > 0);
  const at = target ? {x: target.x, z: target.z} : {x: shot.x, z: 0};
  if (shot.strong && applyOwnSkill(state, shot, src, friends, foes, at, base)) return;
  const hitOne = (o, amount) => {
    const meleePenalty = o.flying && profile.type === 'melee' ? 0.5 : 1;
    hurt(state, o, amount * meleePenalty * crit, element, src, shot.strong, shot.crit, profile.type);
    /* Statuses come exclusively from the authored ultimate or character passive. */
    if (shot.strong && skill?.status && o.hp > 0) setStatus(state, o, skill.status, amount, skill.duration || 3);
    if (shot.strong && skill?.knock && o.hp > 0) knock(state, o, skill.knock);
    for (const pr of src?.procs || []) if (o.hp > 0 && state.random() < pr.chance) setStatus(state, o, pr.type, amount);
  };
  if (profile.type === 'self') {
    emit(state, 'release', {...info(shot), x: shot.ox, z: shot.oz, heal: false});
    return;
  }
  if (profile.type === 'global') {
    for (const o of foes()) hitOne(o, shot.damage);
    hurtBase(state, base, shot.damage * 0.4, baseSide);
    emit(state, 'release', {...info(shot), x: at.x, z: at.z, global: true}); return;
  }
  const radius = profile.radius || 0;
  if (radius) {
    const targets = foes().filter((o) => Math.abs(o.x - at.x) <= radius).slice(0, 14);
    for (const o of targets) hitOne(o, shot.damage * (o === target ? 1 : skill?.splashMultiplier || 0.7));
    if (Math.abs(base.x - at.x) <= radius + 1.2) hurtBase(state, base, shot.damage * 0.5, baseSide);
  } else if (target && target.hp > 0 && target.side === foeSide) hitOne(target, shot.damage);
  else if (!target && shot.target === baseSide) hurtBase(state, base, shot.damage, baseSide);
  if (profile.chain && target && target.side === foeSide) {
    const hit = [target]; let dmg = shot.damage, cur = target;
    for (let i = 0; i < Math.max(0, (profile.targets || 3) - 1); i++) {
      const next = foes().filter((o) => !hit.includes(o) && Math.abs(o.x - cur.x) <= (skill?.kind === 'line' ? 5.1 : 2.6))
        .sort((a, b) => Math.abs(a.x - cur.x) - Math.abs(b.x - cur.x))[0];
      if (!next) break;
      dmg *= skill?.kind === 'line' ? 0.85 : 0.7;
      hitOne(next, dmg);
      emit(state, 'chain', {...info(shot), from: cur.id, to: next.id});
      hit.push(next); cur = next;
    }
  }
  emit(state, 'release', {...info(shot), x: at.x, z: at.z, radius});
}
function info(shot) { return {from: shot.from, target: shot.target, species: shot.species, element: shot.element, kind: shot.profile.type, strong: shot.strong, crit: shot.crit, side: shot.side, ox: shot.ox, oz: shot.oz}; }

/* Traps hit both sides: zones apply while a spirit stands in them, point traps fire on their timer. */
function runTraps(state, dt) {
  for (const f of state.fighters) f.trapSlow = 1;
  state.traps.forEach((t, i) => {
    const inside = (f, r) => f.hp > 0 && Math.abs(f.x - t.x) <= r;
    if (t.zone) {
      for (const f of state.fighters) {
        if (!inside(f, t.half)) continue;
        if (t.slow) f.trapSlow = Math.min(f.trapSlow, t.slow);
        if (t.weaken) f.statuses.weaken = {until: state.time + 0.5};
        if (t.poison) f.statuses.poison = {until: state.time + 2, dps: Math.max(f.statuses.poison?.until > state.time ? f.statuses.poison.dps : 0, f.maxHp * t.poison)};
      }
      return;
    }
    if (state.time < t.next) return;
    t.next = state.time + t.every;
    for (const f of state.fighters) {
      if (!inside(f, t.radius)) continue;
      hurt(state, f, f.maxHp * t.damage + 6 + state.stageIndex * 2, '光', null);
      if (t.stun && !f.boss) { f.stunUntil = state.time + t.stun; f.busyUntil = 0; }
      if (t.knock && f.hp > 0) knock(state, f, t.knock);
    }
    emit(state, 'trap', {index: i, kind: t.kind, x: t.x});
  });
}

export function step(state, dt) {
  if (!state.started || state.result) return;
  state.time += dt;
  /* the deal clock stops while the player is dragging a card around the hand */
  if (state.dragging) state.dealAt += dt;
  else if (state.time >= state.dealAt) { state.dealAt = state.time + DEAL_EVERY; deal(state); }
  /* enemy spawns from the nest; once a group has sent its quota it trickles in slowly, leaving room to push */
  state.stage.groups.forEach((g, i) => {
    if (state.time < state.spawnAt[i]) return;
    const quota = g.max * 3 + state.stageIndex;
    state.spawnAt[i] = state.time + g.every * SPAWN_PACE * (state.spawned[i] >= quota ? 2.5 : 1);
    if (state.fighters.filter((f) => f.side === 'enemy' && f.hp > 0 && f.species === g.species).length < g.max) { spawn(state, 'enemy', g.species); state.spawned[i]++; }
  });
  for (let i = state.pendingSkills.length - 1; i >= 0; i--) {
    const job = state.pendingSkills[i];
    if (state.time >= job.start && !job.started) startSupport(state, job);
    if (state.time >= job.at) { state.pendingSkills.splice(i, 1); applySupport(state, job.card); }
  }
  if (state.stage.boss && !state.bossOut && state.time >= state.bossSkillAt) {
    state.bossSkillAt = state.time + bossSkillEvery(state.stageIndex);
    const start = Math.max(state.time, state.nextUltimateAt);
    const job = {start, at: start + SKILL_WINDUP, started: false};
    state.nextUltimateAt = job.at + ULTIMATE_SPACING;
    state.pendingBoss.push(job);
    if (start <= state.time) startBossSkill(state, job);
  }
  for (let i = state.pendingBoss.length - 1; i >= 0; i--) {
    const job = state.pendingBoss[i];
    if (state.time >= job.start && !job.started) startBossSkill(state, job);
    if (state.time < job.at) continue;
    state.pendingBoss.splice(i, 1);
    if (state.bossOut) continue; /* no ghost casting after the boss steps off its tower */
    const spec = state.spirits.get(state.stage.boss), k = bossSkillDamage(state.stageIndex);
    for (const f of state.fighters) if (f.side === 'ally' && f.hp > 0) hurt(state, f, f.maxHp * k, spec.type, null, true);
    emit(state, 'bossSkill', {species: state.stage.boss, element: spec.type});
  }
  runTraps(state, dt);
  const frozen = state.freezeUntil > state.time, haste = state.hasteUntil > state.time ? 2 : 1;
  for (const f of state.fighters) {
    if (f.hp <= 0) continue;
    for (const k of ['burn', 'poison']) { const s = f.statuses[k]; if (s?.until > state.time) hurt(state, f, s.dps * dt, k === 'burn' ? '焰' : '森', null); }
    if (f.hp <= 0) continue;
    if (f.regen || f.extraRegenUntil > state.time) f.hp = Math.min(f.maxHp,
      f.hp + f.maxHp * ((f.regen || 0) + (f.extraRegenUntil > state.time ? (f.extraRegen || 0) : 0)) * dt);
    if (f.side === 'enemy' && frozen) { f.moving = false; continue; }
    f.cooldown -= dt * (f.side === 'ally' ? haste : 1);
    if (f.knockUntil > state.time) { f.x = Math.max(state.left + 1, Math.min(state.right - 1, f.x + f.knockVel * dt)); f.moving = false; continue; }
    if (f.stunUntil > state.time || f.busyUntil > state.time) { f.moving = false; continue; }
    /* Priests heal the lowest HP-ratio friendly in range before considering damage. */
    if (f.role === 'priest') {
      const wounded = healingTargets(state, f, roleFor(f.species).range * (f.reachMul || 1))[0];
      if (wounded) {
        f.moving = false;
        if (f.cooldown <= 0) {
          if ((f.side === 'ally' || f.boss) && state.time >= f.ultAt && state.time >= state.nextUltimateAt && !f.usedOnce) attack(state, f, wounded);
          else basicPriestHeal(state, f, wounded);
        }
        continue;
      }
    }
    const target = findTarget(state, f, f.profile.reach * (f.reachMul || 1));
    if (target) { f.moving = false; if (f.cooldown <= 0) attack(state, f, target); continue; }
    const slow = (f.statuses.slow?.until > state.time ? 0.5 : 1) * (f.trapSlow || 1);
    f.x = Math.max(state.left + 0.8, Math.min(state.right - 0.8, f.x + (f.side === 'ally' ? -1 : 1) * f.speed * slow * dt)); f.moving = true;
  }
  for (const shot of state.shots) { shot.travel += dt; if (shot.travel >= shot.eta) { shot.done = true; resolve(state, shot); } }
  state.shots = state.shots.filter((s) => !s.done);
  state.fighters = state.fighters.filter((f) => f.hp > 0 || (f.deadAt ??= state.time) > state.time - 0.9);
  if (state.nest.hp <= 0) finish(state, true);
  else if (state.crystal.hp <= 0) finish(state, false);
}

function finish(state, won) {
  state.result = {won, time: state.time, kills: state.stats.kills, crystal: state.crystal.hp / state.crystal.maxHp};
  emit(state, 'finish', state.result);
}
