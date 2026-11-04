/* PK sync. The room's host runs the one real battle (rules.js, duel mode): its spirits are side 'ally', the guest's are
   side 'enemy'. About ten times a second the host sends a snapshot (fighters, shots, bases, the guest's hand and every
   event since the last one). The guest keeps a mirror object shaped like a rules state and seen from its own side:
   sides swapped, lane x mirrored (x -> -x, so its spirits also start at the crystal end and walk toward the nest),
   bases swapped. The battle view and the hand UI read the mirror exactly as they read a normal battle. */
import {buildPath} from './stages.js?v=20261104-v23';

const r2 = (v) => Math.round(v * 100) / 100;
const STATUS = ['poison', 'burn', 'slow', 'weaken', 'freeze'];
/* events about a hand only matter to that hand's owner */
const HAND_EVENTS = new Set(['deal', 'merge', 'play', 'move']);

export function snapshot(state, events) {
  const f = state.fighters.map((o) => {
    const st = {}; for (const k of STATUS) if (o.statuses[k]?.until > state.time) st[k] = r2(o.statuses[k].until);
    return {i: o.id, s: o.side === 'ally' ? 0 : 1, p: o.species, r: o.rank, b: o.boss ? 1 : 0, fl: o.flying ? 1 : 0, x: r2(o.x), z: r2(o.z), h: Math.round(o.hp), m: o.maxHp,
      mv: o.moving ? 1 : 0, ku: r2(o.knockUntil || 0), su: r2(o.stunUntil || 0), ua: r2(o.ultAt), uc: o.ultCd, st, lt: o.lastTarget ?? null, ro: o.role, ty: o.type, sg: o.stage, d: o.deadAt ?? null};
  });
  const shots = state.shots.filter((s) => s.profile.ranged && !['global', 'self', 'area'].includes(s.profile.type))
    .map((s) => ({i: s.id, f: s.from, t: s.target, p: s.species, g: s.strong ? 1 : 0, tr: r2(s.travel), re: r2(s.release), et: r2(s.eta), ty: s.profile.type, e: s.element, s: s.side === 'ally' ? 0 : 1}));
  return {t: r2(state.time), f, shots, c: [Math.round(state.crystal.hp), state.crystal.maxHp], n: [Math.round(state.nest.hp), state.nest.maxHp],
    fz: [r2(state.freezeUntil), r2(state.freezeAllyUntil)], sh: [r2(state.shieldUntil), r2(state.shieldEnemyUntil)], ha: [r2(state.hasteUntil), r2(state.hasteEnemyUntil)],
    hand: state.foe.hand.map((c) => [c.uid, c.species, c.rank]), da: r2(state.foe.dealAt), dr: state.foe.dealRate || 1, db: r2(state.foe.dealBoostUntil || 0), ds: r2(state.foe.dealSlowUntil || 0), k: [state.stats.kills, state.foe.kills || 0],
    ev: events.filter((e) => !HAND_EVENTS.has(e.type) || e.side === 'enemy'), res: state.result};
}

/* the guest's view of the battle */
export function createMirror(stage) {
  const path = buildPath(stage.path), half = path.length / 2;
  return {stage, stageIndex: 0, path, left: -half, right: half, time: 0, started: true, duel: true, mirror: true, result: null,
    fighters: [], shots: [], events: [], traps: [], hand: [], dealAt: 0, dealRate: 1, dealBoostUntil: 0, dealSlowUntil: 0, dragging: false, itemReady: {}, buffs: {attack: 0, guard: 0},
    crystal: {hp: stage.crystal, maxHp: stage.crystal, x: half}, nest: {hp: stage.nest, maxHp: stage.nest, x: -half},
    freezeUntil: 0, shieldUntil: 0, hasteUntil: 0, stats: {summons: 0, kills: 0, merges: 0, skills: 0, points: 0}, foeKills: 0, byId: new Map()};
}

const flipSide = (s) => (s === 'ally' ? 'enemy' : s === 'enemy' ? 'ally' : s);
const flipBase = (b) => (b === 'nest' ? 'crystal' : b === 'crystal' ? 'nest' : b);
/* an event from the host, as the guest sees it */
export function flipEvent(e) {
  const o = {...e};
  if ('side' in o) o.side = o.type === 'baseHit' ? flipBase(o.side) : flipSide(o.side);
  if (typeof o.target === 'string') o.target = flipBase(o.target);
  for (const k of ['x', 'ox']) if (typeof o[k] === 'number') o[k] = -o[k];
  if (o.type === 'finish') { o.won = o.won === null ? null : !o.won; [o.crystal, o.nest] = [o.nest, o.crystal]; [o.kills, o.foeKills] = [o.foeKills, o.kills]; }
  return o;
}

/* apply one snapshot to the mirror; onFire(fighter, target, strong) replays attack animations */
export function applySnapshot(m, snap, onFire) {
  m.time = snap.t;
  const live = new Set();
  for (const s of snap.f) {
    let o = m.byId.get(s.i);
    if (!o) { o = {id: s.i, statuses: {}, profile: {}, attacks: 0, kills: 0}; m.byId.set(s.i, o); }
    Object.assign(o, {side: s.s === 0 ? 'enemy' : 'ally', species: s.p, rank: s.r, boss: !!s.b, flying: !!s.fl, x: -s.x, z: s.z, hp: s.h, maxHp: s.m, moving: !!s.mv,
      knockUntil: s.ku, stunUntil: s.su, ultAt: s.ua, ultCd: s.uc, lastTarget: s.lt, role: s.ro, type: s.ty, stage: s.sg, deadAt: s.d ?? undefined});
    o.statuses = {}; for (const [k, until] of Object.entries(s.st)) o.statuses[k] = {until};
    live.add(s.i);
  }
  for (const id of [...m.byId.keys()]) if (!live.has(id)) m.byId.delete(id);
  m.fighters = snap.f.map((s) => m.byId.get(s.i));
  m.shots = snap.shots.map((s) => ({id: s.i, from: s.f, target: typeof s.t === 'string' ? flipBase(s.t) : s.t, species: s.p, strong: !!s.g, travel: s.tr, release: s.re, eta: s.et, element: s.e,
    side: s.s === 0 ? 'enemy' : 'ally', profile: {ranged: true, type: s.ty}}));
  m.crystal.hp = snap.n[0]; m.crystal.maxHp = snap.n[1]; m.nest.hp = snap.c[0]; m.nest.maxHp = snap.c[1];
  m.freezeUntil = snap.fz[1]; m.shieldUntil = snap.sh[1]; m.hasteUntil = snap.ha[1];
  m.hand = snap.hand.map(([uid, species, rank]) => ({uid, species, rank, boost: 0}));
  m.dealAt = snap.da; m.dealRate = snap.dr || 1; m.dealBoostUntil = snap.db || 0; m.dealSlowUntil = snap.ds || 0; m.stats.kills = snap.k[1]; m.foeKills = snap.k[0];
  for (const e of snap.ev) {
    const v = flipEvent(e);
    m.events.push(v);
    if ((v.type === 'fire' || v.type === 'ultimate') && onFire) {
      const f = m.byId.get(v.id), t = typeof v.target === 'number' ? m.byId.get(v.target) : v.target === 'nest' ? m.nest : v.target === 'crystal' ? m.crystal : null;
      if (f && t) onFire(f, t, v.type === 'ultimate');
    }
  }
  if (snap.res && !m.result) m.result = flipEvent({type: 'finish', ...snap.res});
}

/* between snapshots the guest keeps projectiles flying and the clock running */
export function advanceMirror(m, dt) {
  m.time += dt;
  for (const s of m.shots) s.travel = Math.min(s.eta, s.travel + dt);
}
