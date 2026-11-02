/* Stage list: each stage is one winding path from the monster nest (start) to the hero's bucket base (end), shown
   whole on screen. Enemies follow the cave's encounter rules: normal monsters are yellow cards, the boss sitting on the
   nest is a purple card (small boss) in early stages and a red card (big boss) later; it steps out the first time the
   nest is hit. `scene` picks the scenery in js/env.js, `traps` sit on the road (at = fraction of the path, len = zone
   length as a fraction). `path` holds control points (x, z) on a 34 x 20 field, smoothed by buildPath(). */
export const STAGES = [
  {id: 'meadow', name: '初光草原', scene: 'meadow', element: '森', nest: 900, crystal: 1500, scale: 1.4, boss: 'giratina',
    path: [[-15, -5], [-6, -6], [2, -4], [3, 1], [-4, 3], [-2, 7], [7, 6], [15, 4]],
    groups: [{species: 'charmander', every: 6, start: 2, max: 4}, {species: 'bulbasaur', every: 8, start: 8, max: 3}, {species: 'squirtle', every: 10, start: 14, max: 2}],
    traps: []},
  {id: 'pond', name: '青蛙池塘', scene: 'pond', element: '潮', nest: 1300, crystal: 1600, scale: 1.61, boss: 'articuno',
    path: [[-15, -7], [9, -7], [13, -4], [10, -1], [-9, 0], [-13, 3], [-9, 6.5], [15, 7]],
    groups: [{species: 'totodile', every: 6, start: 2, max: 4}, {species: 'kyogre', every: 9, start: 8, max: 3}, {species: 'chikorita', every: 12, start: 16, max: 2}],
    traps: [{kind: 'mud', at: 0.3, len: 0.06}, {kind: 'mud', at: 0.68, len: 0.06}]},
  {id: 'waterfall', name: '水仙瀑布', scene: 'waterfall', element: '潮', nest: 1800, crystal: 1700, scale: 1.82, boss: 'suicune',
    path: [[-15, 7], [-15, -6], [-6, -8], [6, -8], [14, -5], [14, 3], [7, 7], [-6, 7], [-10, 1], [-5, -4], [4, -4], [7, 1], [1, 3]],
    groups: [{species: 'torchic', every: 6, start: 2, max: 4}, {species: 'wartortle', every: 9, start: 8, max: 3}, {species: 'groudon', every: 14, start: 18, max: 2}],
    traps: [{kind: 'whirl', at: 0.35, len: 0.05}, {kind: 'whirl', at: 0.7, len: 0.05}]},
  {id: 'orchard', name: '猴王果園', scene: 'orchard', element: '焰', nest: 2200, crystal: 1800, scale: 2.03, boss: 'zapdos',
    path: [[-15, 7], [-11, 6], [-12, -1], [-12, -6], [-5, -7], [-3, -1], [-6, 4], [1, 7], [6, 2], [3, -4], [9, -7], [13, -3], [11, 3], [15, 6]],
    groups: [{species: 'mudkip', every: 6, start: 2, max: 4}, {species: 'charmander', every: 7, start: 6, max: 3}, {species: 'marshtomp', every: 13, start: 16, max: 2}],
    traps: [{kind: 'spike', at: 0.28}, {kind: 'spike', at: 0.55}, {kind: 'spike', at: 0.8}]},
  {id: 'forge', name: '雷鳴工坊', scene: 'forge', element: '雷', nest: 2900, crystal: 1900, scale: 1.9, boss: 'raichu',
    path: [[-15, 7], [-13, -7], [-8, -7], [-8, 6], [-3, 7], [-3, -6], [2, -7], [2, 6], [7, 7], [7, -6], [12, -7], [12, 4], [15, 6]],
    groups: [{species: 'cyndaquil', every: 6.5, start: 2, max: 4}, {species: 'quilava', every: 14, start: 12, max: 2}, {species: 'marshtomp', every: 13, start: 8, max: 2}],
    traps: [{kind: 'shock', at: 0.3}, {kind: 'shock', at: 0.62}, {kind: 'spike', at: 0.85}]},
  {id: 'desert', name: '牛仔荒野', scene: 'desert', element: '焰', nest: 3400, crystal: 2000, scale: 2.45, boss: 'chimchar',
    path: [[-15, -7], [-3, -8], [9, -7], [14, -2], [10, 4], [-1, 6], [-11, 6], [-14, 1], [-10, -3], [-2, -2.5], [6, 1]],
    groups: [{species: 'charmeleon', every: 6, start: 2, max: 4}, {species: 'marshtomp', every: 9, start: 8, max: 3}, {species: 'combusken', every: 12, start: 15, max: 2}],
    traps: [{kind: 'mud', at: 0.25, len: 0.08}, {kind: 'spike', at: 0.5}, {kind: 'mud', at: 0.75, len: 0.08}]},
  {id: 'observatory', name: '星輝觀星台', scene: 'observatory', element: '念', nest: 4300, crystal: 2100, scale: 1.85, boss: 'monferno',
    path: [[-15, -7], [12, -7], [14, -4.6], [12, -2.3], [-12, -2.3], [-14, 0], [-12, 2.3], [12, 2.3], [14, 4.6], [12, 7], [-15, 7]],
    groups: [{species: 'piplup', every: 5, start: 2, max: 4}, {species: 'prinplup', every: 9, start: 8, max: 3}, {species: 'bayleef', every: 11, start: 12, max: 2}, {species: 'grotle', every: 13, start: 18, max: 2}],
    traps: [{kind: 'rune', at: 0.22, len: 0.05}, {kind: 'rune', at: 0.5, len: 0.05}, {kind: 'rune', at: 0.78, len: 0.05}]},
  {id: 'night', name: '月影森林', scene: 'night', element: '念', nest: 5000, crystal: 2200, scale: 1.75, boss: 'dialga',
    path: [[-15, -3], [-12, 7], [-3, 8], [0, 1], [-5, -3], [-11, -6], [-4, -8], [6, -8], [12, -5], [8, 1], [4, 6], [9, 8], [15, 4]],
    groups: [{species: 'prinplup', every: 7, start: 2, max: 3}, {species: 'ivysaur', every: 8, start: 6, max: 3}, {species: 'grotle', every: 11, start: 12, max: 2}, {species: 'bayleef', every: 13, start: 18, max: 2}],
    traps: [{kind: 'poison', at: 0.3, len: 0.06}, {kind: 'poison', at: 0.65, len: 0.06}]},
  {id: 'tower', name: '星穹塔下', scene: 'tower', element: '雷', nest: 6200, crystal: 2300, scale: 1.85, boss: 'pikachu',
    path: [[-15, 7], [-14, -7], [-7, -8], [-8, 1], [-10.5, 4], [-6, 8], [1, 6], [0, -2], [-2, -7], [6, -8], [11, -5], [6, 0], [9, 6], [15, 7]],
    groups: [{species: 'typhlosion', every: 12, start: 4, max: 2}, {species: 'torterra', every: 14, start: 10, max: 2}, {species: 'empoleon', every: 12, start: 16, max: 2}, {species: 'quilava', every: 8, start: 2, max: 3}],
    traps: [{kind: 'shock', at: 0.25}, {kind: 'spike', at: 0.5}, {kind: 'shock', at: 0.75}]},
  {id: 'abyss', name: '水蛟深淵', scene: 'abyss', element: '潮', nest: 7800, crystal: 2500, scale: 1.95, boss: 'mewtwo',
    path: [[-15, 0], [-13, -7], [-3, -8], [8, -8], [14, -4], [14, 4], [8, 8], [-4, 8], [-12, 6], [-10, -1], [-5, -4], [4, -4], [8, 0], [4, 4], [-4, 4], [-6, 0], [0, 0]],
    groups: [{species: 'feraligatr', every: 12, start: 4, max: 2}, {species: 'blaziken', every: 10, start: 6, max: 2}, {species: 'rayquaza', every: 14, start: 12, max: 2}, {species: 'blastoise', every: 16, start: 20, max: 2}],
    traps: [{kind: 'whirl', at: 0.3, len: 0.04}, {kind: 'geyser', at: 0.55}, {kind: 'whirl', at: 0.8, len: 0.04}]},
];

/* Catmull-Rom smoothing of the control points into a dense polyline with cumulative lengths. */
export function buildPath(controls, perSegment = 16) {
  const pts = [], c = controls, at = (i) => c[Math.max(0, Math.min(c.length - 1, i))];
  for (let i = 0; i < c.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment, t2 = t * t, t3 = t2 * t;
      const f = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(c[c.length - 1]);
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return {points: pts, lengths, length: lengths[lengths.length - 1]};
}

/* Point and heading at distance d along a built path. */
export function pointAt(path, d) {
  const {points, lengths} = path, dd = Math.max(0, Math.min(path.length, d));
  let lo = 0, hi = lengths.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lengths[mid] <= dd) lo = mid; else hi = mid; }
  const seg = lengths[hi] - lengths[lo] || 1, t = (dd - lengths[lo]) / seg, a = points[lo], b = points[hi];
  return {x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dir: Math.atan2(b[0] - a[0], b[1] - a[1])};
}
