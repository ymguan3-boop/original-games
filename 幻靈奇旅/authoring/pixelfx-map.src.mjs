#!/usr/bin/env node
// 特效對照表的原始碼：輸出 js/fx/pixelfx-map.json。
//   node authoring/pixelfx-map.src.mjs
// 一條規則 = 遊戲事件（mode.event＋match）→ 要播的 pixelfx 層。第一條符合的規則生效，順序就是優先權。
// keep:true 代表明確保留舊特效；disabled:true 代表未來預留，不載入也不播放。
import {writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const f = (id, o = {}) => ({id, ...o});
const hit = (id, scale = 1, o = {}) => f(id, {scale, ...o});
const ground = (id, scale = 1, o = {}) => f(id, {scale, ground: true, y: .06, plane: 'ground', ...o});
const trail = (id, scale = 1, o = {}) => f(id, {scale, travel: .4, loop: true, orient: true, ...o});
const rule = (fx, match, extra = {}) => ({...(match ? {match} : {}), fx, ...extra});

/* 六屬性共用配方：擂台、洞穴、守護戰的「未設計專屬動畫」都走這裡，角色專屬規則排在前面。 */
const CHARGE = [
  rule([ground('arcane/rune-circle', .9, {tint: 0xff8040}), hit('arcane/spell-charge', 1, {tint: 0xff9040})], {element: '焰'}),
  rule([ground('arcane/rune-circle', .9, {tint: 0x57dfff}), hit('arcane/spell-charge', 1, {tint: 0x57dfff})], {element: '潮'}),
  rule([ground('arcane/magic-circle-cast', .9, {tint: 0x75ef92})], {element: '森'}),
  rule([hit('lightning/charge-up', 1)], {element: '雷'}),
  rule([ground('arcane/magic-circle-cast', .9), hit('arcane/spell-charge', 1)], {element: '念'}),
  rule([ground('arcane/rune-circle', .9, {tint: 0xffe7a0}), hit('arcane/spell-charge', 1, {tint: 0xffe7a0})]),
];
const ELEMENT_SHOT = [
  rule([trail('fire/fireball', .8)], {element: '焰'}),
  rule([trail('water/water-orb', .9)], {element: '潮'}),
  rule([trail('projectiles/magic-missile', .9, {tint: 0x75ef92})], {element: '森'}),
  rule([trail('lightning/ball-lightning', .8)], {element: '雷'}),
  rule([trail('arcane/arcane-orb', .85)], {element: '念'}),
  rule([trail('arcane/arcane-orb', .85, {tint: 'element'})]),
];
const ELEMENT_HIT = [
  rule([hit('fire/fireball', .9, {optional: true}), hit('impacts/hit-spark', 1.1)], {element: '焰', strong: true}),
  rule([hit('water/geyser', .8, {ground: true}), hit('water/splash', 1)], {element: '潮', strong: true}),
  rule([hit('nature/vine-whip', 1), hit('impacts/hit-spark', 1)], {element: '森', strong: true}),
  rule([hit('lightning/zap-hit', 1.2)], {element: '雷', strong: true}),
  rule([hit('arcane/arcane-beam', .8, {optional: true}), hit('arcane/mana-burst', 1)], {element: '念', strong: true}),
  rule([hit('holy/smite', .9, {ground: true}), hit('impacts/crit-hit', .9)], {element: '光', strong: true}),
  rule([hit('impacts/hit-spark', 1, {tint: 0xff934f})], {element: '焰'}),
  rule([hit('water/splash', .8)], {element: '潮'}),
  rule([hit('impacts/hit-spark', 1, {tint: 0x8ff7ba})], {element: '森'}),
  rule([hit('lightning/zap-hit', .9)], {element: '雷'}),
  rule([hit('impacts/blunt-hit', 1, {tint: 0xc89bff})], {element: '念'}),
  rule([hit('impacts/hit-spark', 1)]),
];
const STATUS = [
  rule([f('status/burning', {loop: true, key: 'burn', track: true})], {status: ['burn']}),
  rule([f('status/frozen', {loop: true, key: 'freeze', track: true})], {status: ['freeze', 'frozen']}),
  rule([f('status/poisoned', {loop: true, key: 'poison', track: true})], {status: ['poison']}),
  rule([f('status/stunned', {loop: true, key: 'stun', track: true})], {status: ['stun', 'paralysis']}),
  rule([f('status/rage', {loop: true, key: 'rage', track: true})], {status: ['attackUp']}),
  rule([f('status/slowed', {loop: true, key: 'slow', track: true})], {status: ['slow', 'defDown']}),
  rule([f('scifi/force-field', {loop: true, key: 'armor', track: true, opacity: .75})], {status: ['armor', 'barrier', 'guard']}),
  rule([hit('holy/heal', 1)], {status: ['heal', 'regen']}),
];

const events = {
  /* ---------- A. 一般場景 ---------- */
  'world.heal': [rule([hit('holy/heal-aoe', 1)], {area: true}), rule([hit('holy/heal', 1)])],
  'world.status': STATUS,
  'world.captureThrow': [rule([hit('impacts/hit-spark', .7), hit('projectiles/energy-disc', .55, {optional: true})])],
  'world.captureHit': [rule([hit('impacts/hit-spark', 1)])],
  'world.captureSuccess': [rule([hit('spawn/summon-rise', 1, {ground: true}), hit('pickups/collect-burst', 1)])],
  'world.pickup': [
    rule([hit('pickups/loot-beam', .8, {ground: true}), hit('pickups/gem-spin', .8)], {pickup: ['evolutionStone', 'great_core']}),
    rule([hit('pickups/collect-burst', .9)]),
  ],
  'world.spawn': [
    rule([hit('spawn/spawn-portal', .9, {ground: true})], {special: true}),
    rule([hit('spawn/poof', 1, {ground: true, y: .4})]),
  ],
  'world.arrive': [rule([hit('scifi/warp-in', .8, {ground: true})])],
  'world.dash': [rule([hit('spawn/poof', .55, {ground: true, y: .2, opacity: .8})])],
  'world.fishing': [rule([hit('water/splash', 1, {ground: true, y: .1}), ground('water/ripples', 1, {delay: .1})])],
  'world.egg': [
    rule([f('holy/divine-shield', {scale: 1.1})], {kind: 'shield'}),
    rule([hit('holy/holy-pillar', 1, {ground: true})], {kind: 'heal'}),
    rule([f('scifi/force-field', {scale: 1})]),
  ],

  /* ---------- B. 幻靈競技擂台（含河畔釣魚、書櫃變體） ---------- */
  'arena.charge': CHARGE,
  'arena.shot': ELEMENT_SHOT,
  'arena.release': [
    rule([ground('water/ripples', .9), hit('water/water-jet', .8, {anchor: 'from', optional: true})], {speciesId: 'kyogre'}),
    rule([hit('water/water-orb', .9, {anchor: 'from'})], {speciesId: ['groudon', 'rayquaza']}),
    rule([hit('water/water-jet', 1, {anchor: 'from', dir: true})], {speciesId: 'mewtwo', strong: true}),
    rule([hit('water/water-orb', .8, {anchor: 'from'})], {speciesId: 'entei', strong: false}),
    rule([hit('projectiles/magic-missile', .8, {anchor: 'from'})], {speciesId: 'entei', strong: true}),
    rule([hit('projectiles/muzzle-pistol', .9, {anchor: 'from'})], {family: 'ahong-cowboy'}),
    rule([hit('arcane/arcane-missiles', .9, {anchor: 'from'})], {family: 'starlight-mage'}),
    rule([hit('shadow/soul-drain', .7, {anchor: 'from', optional: true})], {family: 'guanpang', strong: true}),
    rule([hit('fire/fire-breath', .9, {anchor: 'from'})], {family: ['fire-bear', 'cat-girl'], strong: true}),
    rule([hit('water/water-orb', .8, {anchor: 'from'})], {family: 'water-dog', strong: true}),
    rule([hit('water/bubbles', .8, {anchor: 'from'})], {family: 'water-fairy'}),
    rule([hit('water/bubbles', .9, {anchor: 'from'})], {speciesId: 'articuno', strong: true}),
    rule([ground('arcane/magic-circle-cast', .8)], {strong: true}),
    rule([], null, {keep: true}),
  ],
  'arena.impact': [
    rule([hit('impacts/blunt-hit', 1.1), hit('water/splash', .7, {optional: true})], {speciesId: 'articuno', strong: false}),
    rule([hit('water/bubbles', 1), hit('water/splash', 1)], {speciesId: 'articuno', strong: true}),
    rule([hit('melee/uppercut', .9), hit('impacts/hit-spark', 1)], {speciesId: 'moltres', strong: false}),
    rule([hit('impacts/ricochet', 1), hit('impacts/hit-spark', 1.1)], {speciesId: 'moltres', strong: true}),
    rule([hit('water/water-orb', .8), hit('water/splash', .8)], {speciesId: 'entei', strong: false}),
    rule([hit('nature/root-snare', .9, {ground: true}), hit('impacts/hit-spark', .8)], {speciesId: 'entei', strong: true}),
    rule([hit('water/splash', .9), ground('water/ripples', .9)], {speciesId: 'kyogre'}),
    rule([hit('water/wave-crash', .8, {ground: true}), hit('water/splash', .9)], {speciesId: ['groudon', 'rayquaza']}),
    rule([hit('melee/claw-swipe', 1.1), hit('impacts/crit-hit', .8)], {speciesId: 'mewtwo', strong: false}),
    rule([hit('water/geyser', 1, {ground: true}), hit('water/splash', 1)], {speciesId: 'mewtwo', strong: true}),
    rule([hit('melee/thrust', .9), hit('impacts/hit-spark', 1)], {family: 'pepper-chick', strong: false}),
    rule([hit('fire/fireball', .8, {optional: true}), hit('impacts/hit-spark', 1.1)], {family: 'pepper-chick', strong: true}),
    rule([hit('melee/claw-swipe', 1), hit('impacts/hit-spark', .9)], {family: 'water-dog', strong: false}),
    rule([hit('water/wave-crash', 1, {ground: true}), hit('water/splash', 1)], {family: 'water-dog', strong: true}),
    rule([hit('water/geyser', .9, {ground: true}), hit('water/rain-splash', .9, {ground: true})], {family: 'water-fairy'}),
    rule([hit('melee/claw-swipe', 1), hit('impacts/hit-spark', 1)], {family: ['fire-bear', 'cat-girl'], strong: false}),
    rule([hit('fire/flame-pillar', .9, {ground: true}), ground('nature/quake', .8, {optional: true})], {family: ['fire-bear', 'cat-girl'], strong: true}),
    rule([hit('melee/double-slash', 1), hit('lightning/zap-hit', 1)], {speciesId: 'raichu', strong: true}),
    rule([hit('impacts/bullet-impact', 1)], {family: 'ahong-cowboy'}),
    rule([hit('arcane/mana-burst', 1), hit('arcane/star-fall', .8, {ground: true, optional: true})], {family: 'starlight-mage'}),
    rule([hit('melee/scythe-reap', 1), hit('impacts/crit-hit', 1)], {family: 'guanpang'}),
    rule([hit('impacts/blunt-hit', 1)], {melee: true, strong: false}),
    ...ELEMENT_HIT,
  ],
  'arena.secondHit': [rule([hit('melee/double-slash', 1.1), hit('impacts/hit-spark', 1.1)])],
  'arena.boomerangTrail': [rule([hit('nature/leaf-storm', .24, {opacity: .8, rate: 3})])],
  'arena.boomerangHit': [rule([hit('impacts/ricochet', 1), hit('impacts/hit-spark', 1.1)])],
  'arena.boomerangCatch': [rule([hit('impacts/hit-spark', .45)])],
  'arena.benchIn': [rule([hit('spawn/poof', .9, {ground: true, y: .4})])],
  'arena.status': STATUS,
  'arena.defeat': [rule([hit('spawn/shatter-death', 1, {ground: true, y: 1})], {element: ['森', '潮', '念', '光']}), rule([hit('spawn/dissolve-burn', 1, {ground: true, y: 1})])],
  'arena.switch': [rule([hit('spawn/poof', 1, {ground: true, y: .4})])],
  'arena.start': [rule([ground('water/ripples', 1)], {kind: 'fishing'}), rule([ground('arcane/magic-circle-cast', .8)], {kind: 'book'}), rule([], null, {keep: true})],

  /* ---------- C. 初光無盡洞穴 ---------- */
  'cave.heroNormal': [
    rule([hit('melee/sword-slash', 1), hit('impacts/hit-spark', .7, {anchor: 'to', optional: true})], {weapon: 'sword'}),
    rule([hit('melee/dagger-flurry', 1)], {weapon: 'blades'}),
    rule([hit('melee/spin-slash', .9)], {weapon: 'knife'}),
    rule([hit('projectiles/muzzle-smg', .9)], {weapon: 'guns'}),
    rule([], null, {keep: true}),
  ],
  'cave.heroUltimate': [
    rule([hit('melee/heavy-cleave', 1.3), hit('impacts/ground-slam', 1, {ground: true})], {weapon: 'sword'}),
    rule([hit('melee/spin-slash', 1.3)], {weapon: 'blades'}),
    rule([hit('melee/spin-slash', 1.2)], {weapon: 'knife'}),
    rule([hit('scifi/emp-blast', 1), hit('projectiles/plasma-shot', .9, {optional: true})], {weapon: 'guns'}),
    rule([], null, {keep: true}),
  ],
  'cave.reaper': [rule([hit('melee/scythe-reap', 1.2), hit('shadow/soul-drain', .8, {optional: true})])],
  'cave.dash': [rule([hit('spawn/poof', .7, {ground: true, y: .2}), hit('status/haste', .7, {optional: true})])],
  'cave.spell': CHARGE.map((r) => ({...r, fx: r.fx.filter((x) => x.plane)})).filter((r) => r.fx.length),
  'cave.impact': [
    rule([hit('impacts/crit-hit', 1.1)], {critical: true}),
    rule([hit('impacts/ricochet', .9), hit('impacts/hit-spark', .9)], {speciesId: 'moltres'}),
    rule([hit('water/splash', .9)], {speciesId: 'mewtwo'}),
    ...ELEMENT_HIT.filter((r) => !r.match?.strong),
  ],
  'cave.bullet': [rule([hit('impacts/bullet-impact', .9)])],
  'cave.status': [
    ...STATUS,
  ],
  'cave.spawn': [rule([hit('spawn/summon-rise', .9, {ground: true})], {boss: true}), rule([hit('spawn/poof', .8, {ground: true, y: .3})])],
  'cave.death': [rule([hit('spawn/shatter-death', 1, {ground: true, y: .9})], {boss: true}), rule([hit('spawn/poof', .8, {ground: true, y: .4})])],
  'cave.heal': [rule([hit('holy/heal', 1)])],
  'cave.loot': [
    rule([hit('pickups/loot-beam', .9, {ground: true})], {kind: ['weapon', 'augmentation']}),
    rule([hit('pickups/gem-spin', .6), hit('pickups/collect-burst', .7)]),
  ],
  'cave.boss': [rule([hit('arcane/portal', 1, {ground: true, y: 1}), hit('explosions/plasma-explosion', .9, {optional: true})])],

  /* ---------- D. 幻靈守護戰（含 PK） ---------- */
  'defense.charge': [rule([hit('lightning/charge-up', .9)], {element: '雷'}), ...CHARGE.filter((r) => r.match?.element !== '雷')],
  'defense.ultimate': [
    rule([hit('impacts/ricochet', 1.1), hit('nature/leaf-storm', 1)], {speciesId: 'moltres'}),
    rule([hit('fire/flame-pillar', 1, {ground: true})], {element: '焰'}),
    rule([hit('water/geyser', 1, {ground: true})], {element: '潮'}),
    rule([hit('nature/leaf-storm', 1.2)], {element: '森'}),
    rule([hit('lightning/zap-hit', 1.3)], {element: '雷'}),
    rule([hit('arcane/mana-burst', 1.2)], {element: '念'}),
    rule([hit('holy/smite', 1.1, {ground: true})]),
  ],
  'defense.hit': [
    rule([hit('impacts/crit-hit', 1)], {crit: true}),
    rule([hit('melee/sword-slash', .8), hit('impacts/hit-spark', .8)], {kind: 'melee'}),
    ...ELEMENT_HIT.filter((r) => !r.match?.strong),
  ],
  'defense.boss': [rule([hit('spawn/summon-rise', 1.2, {ground: true}), hit('impacts/ground-slam', 1.1, {ground: true})])],
  'defense.baseHit': [rule([hit('impacts/blunt-hit', 1.2)], {crit: true}), rule([hit('impacts/shield-block', 1)])],
  'defense.trap': [
    rule([hit('nature/toxic-puddle', .9, {ground: true})], {kind: 'mud'}),
    rule([hit('nature/earth-spike', .9, {ground: true}), hit('nature/thorns', .7, {ground: true, optional: true})], {kind: 'spike'}),
    rule([hit('nature/tornado', .9, {ground: true})], {kind: 'whirl'}),
    rule([hit('nature/poison-cloud', .8, {ground: true})], {kind: 'poison'}),
    rule([hit('water/geyser', .9, {ground: true}), hit('water/splash', .8, {optional: true})], {kind: 'geyser'}),
    rule([ground('arcane/rune-circle', .9)], {kind: 'rune'}),
    rule([hit('lightning/zap-hit', 1), hit('status/stunned', .8, {optional: true})], {kind: 'shock'}),
    rule([hit('impacts/hit-spark', 1)]),
  ],
  'defense.skill': [rule([ground('arcane/magic-circle-cast', 1.2), hit('spawn/summon-rise', .9, {ground: true, optional: true})])],
  'defense.mergeUi': [rule([f('ui/level-up', {x: .5, y: .62}), f('pickups/collect-burst', {x: .5, y: .66})])],
  'defense.boomerangTrail': [rule([hit('nature/leaf-storm', .24, {opacity: .8, rate: 3})])],
  'defense.buff': [
    rule([hit('holy/heal-aoe', 1)], {kind: 'heal'}),
    rule([f('scifi/force-field', {scale: 1})], {kind: 'shield'}),
  ],
  'defense.status': STATUS,
  'defense.lightning': [rule([hit('lightning/lightning-strike', 1, {ground: true, depthTest: false}), hit('lightning/zap-hit', 1, {ground: true, y: .5})])],
  'defense.death': [rule([hit('spawn/poof', .9, {ground: true, y: .4})], {side: 'ally'}), rule([hit('spawn/dissolve-burn', .9, {ground: true, y: .8})])],

  /* ---------- E. 初光商會（現有外部互動） ---------- */
  'commerce.level': [rule([hit('ui/level-up', 1.2, {ground: true, y: 3})])],
  'commerce.door': [rule([hit('pickups/collect-burst', .8)])],
  'commerce.notice': [rule([f('ui/exclamation', {x: .5, y: .22})])],
  /* 未來預留：店內尚未開放，以下規則不載入也不播放 */
  'commerce.hire': [rule([hit('spawn/summon-rise'), hit('ui/achievement'), hit('ui/level-up')], null, {disabled: true, future: true})],
  'commerce.sale': [rule([hit('ui/coin-collect'), hit('pickups/coin-spin'), hit('pickups/collect-burst')], null, {disabled: true, future: true})],
  'commerce.restock': [rule([hit('pickups/loot-beam'), hit('ui/quest-complete'), hit('pickups/crystal-shard')], null, {disabled: true, future: true})],
  'commerce.customer': [rule([hit('status/charmed'), hit('ui/heart-lost'), hit('ui/exclamation')], null, {disabled: true, future: true})],
  'commerce.expand': [rule([hit('ui/level-up'), hit('ui/confetti'), hit('transitions/star-iris')], null, {disabled: true, future: true})],

  /* ---------- F. 星穹挑戰塔、初光挑戰、模型室、全局 UI ---------- */
  'tower.normal': [
    rule([hit('projectiles/bullet-tracer', .9)], {weapon: 'guns'}),
    rule([hit('melee/dagger-flurry', .9)], {weapon: 'blades'}),
    rule([hit('melee/thrust', .9)], {weapon: 'knife'}),
    rule([hit('melee/sword-slash', 1)]),
  ],
  'tower.hit': [rule([hit('impacts/hit-spark', 1.1)])],
  'tower.ultimate': [
    rule([hit('melee/heavy-cleave', 1.2)], {weapon: 0}),
    rule([hit('melee/spin-slash', 1.1)], {weapon: 1}),
    rule([hit('scifi/laser-grid', .9, {ground: true})], {weapon: 2}),
    rule([hit('arcane/mana-burst', 1.1)]),
  ],
  'tower.bossCue': [rule([hit('impacts/ground-slam', 1, {ground: true})])],
  'tower.loot': [rule([hit('pickups/chest-open', 1, {ground: true, y: .6}), hit('pickups/loot-beam', 1, {ground: true})])],
  'challenge.slam': [rule([hit('impacts/ground-slam', 1, {ground: true}), ground('nature/quake', .9, {optional: true})])],
  'challenge.wave': [rule([hit('arcane/mana-burst', 1)])],
  'challenge.beam': [rule([hit('status/stunned', .9)])],
  'challenge.feather': [rule([hit('holy/feather-burst', 1)])],
  'room.impact': [
    rule([hit('water/splash', 1)], {element: '潮'}),
    rule([hit('fire/fireball', .8)], {element: '焰'}),
    rule([hit('impacts/hit-spark', 1.1)]),
  ],
  'room.boomerangTrail': [rule([hit('nature/leaf-storm', .24, {opacity: .8, rate: 3})])],
  'ui.victory': [rule([f('ui/confetti', {x: .5, y: .1}), f('ui/achievement', {x: .5, y: .2})])],
  'ui.firstCapture': [rule([f('ui/achievement', {x: .5, y: .2})])],
  'ui.quest': [rule([f('ui/quest-complete', {x: .5, y: .2})])],
};

/* 環境層：疊在原本的天氣之上，數量低、不改天空亮度。守護戰每關固定一組，絕不隨戰鬥事件改變。 */
const c = (id, every, o = {}) => ({id, every, ...o});
const ambient = {
  'defense.meadow': [c('weather/falling-leaves', 5, {radius: 16, y: 3.5}), c('weather/god-rays', 11, {radius: 14, y: 5, opacity: .45})],
  'defense.pond': [c('water/rain-splash', 1.3, {radius: 15, ground: true, y: .1}), c('weather/fog', 9, {radius: 16, y: 1.2, opacity: .4})],
  'defense.waterfall': [c('water/rain-splash', 1, {radius: 15, ground: true, y: .1}), c('weather/fog', 7, {radius: 16, y: 1.3, opacity: .4})],
  'defense.orchard': [c('weather/falling-leaves', 4, {radius: 16, y: 3.5}), c('weather/god-rays', 12, {radius: 14, y: 5, opacity: .4})],
  'defense.forge': [c('weather/clouds', 14, {radius: 16, y: 8, opacity: .4}), c('fire/torch', 8, {radius: 15, ground: true, y: .6, hold: 3, opacity: .7})],
  'defense.desert': [c('weather/god-rays', 12, {radius: 14, y: 5, opacity: .35})],
  'defense.observatory': [c('weather/shooting-stars', 8, {radius: 14, y: 8, opacity: .8})],
  'defense.night': [c('weather/fireflies', 5, {radius: 15, y: 1.2, opacity: .8}), c('critters/wisp', 12, {radius: 14, y: 1.4, hold: 4, opacity: .6})],
  'defense.tower': [c('ice/snowflake-burst', 7, {radius: 14, y: 2.6, opacity: .55})],
  'defense.abyss': [c('water/rain-splash', .8, {radius: 15, ground: true, y: .1}), c('water/wave-crash', 11, {radius: 16, ground: true, y: .4, opacity: .55})],
  'world.field': [c('weather/falling-leaves', 7, {radius: 22, y: 4, opacity: .65}), c('critters/butterfly', 13, {radius: 16, y: 1.5, hold: 5, opacity: .85})],
  'world.water': [c('water/ripples', 6, {radius: 9, ground: true, y: .1, plane: 'ground', opacity: .7})],
  'world.night': [c('weather/fireflies', 6, {radius: 18, y: 1.4, opacity: .85}), c('critters/wisp', 14, {radius: 16, y: 1.5, hold: 4, opacity: .6})],
  'cave.deep': [c('critters/wisp', 11, {radius: 16, y: 1.6, hold: 4, opacity: .6}), c('critters/bat', 13, {radius: 16, y: 3, opacity: .7})],
  'commerce.forecourt': [c('critters/butterfly', 12, {radius: 7, y: 1.5, hold: 4, opacity: .8}), c('pickups/coin-spin', 15, {radius: 6, y: 2.4, opacity: .7})],
};
for (const k of Object.keys(ambient)) events['ambient.' + k] = [rule(ambient[k].map((a) => ({id: a.id})), null, {ambientOnly: true})];

/* 長演出裁切：只取有效果的段落，並限制影格數；lightning-strike 不含背景暗化（bare 圖層無 backdrop）。 */
const bake = {
  'lightning/lightning-strike': {maxFrames: 16},
  'weather/fog': {maxFrames: 12},
  'weather/god-rays': {maxFrames: 12},
  'weather/clouds': {maxFrames: 10},
  'weather/falling-leaves': {maxFrames: 14},
  'weather/fireflies': {maxFrames: 12},
  'weather/shooting-stars': {maxFrames: 14},
  'nature/leaf-storm': {maxFrames: 14},
  'scifi/laser-grid': {maxFrames: 12},
  'water/wave-crash': {maxFrames: 14},
  'arcane/star-fall': {maxFrames: 14},
};

const assets = [...new Set(Object.values(events).flat().filter((r) => !r.disabled).flatMap((r) => (r.fx || []).map((x) => x.id)))].sort();
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../js/fx/pixelfx-map.json');
writeFileSync(OUT, JSON.stringify({version: 1, source: 'a84159688af3ca37a4be05a0d422b94451b2e24e', events, ambient, bake, assets}));
console.log('events', Object.keys(events).length, 'assets', assets.length);
